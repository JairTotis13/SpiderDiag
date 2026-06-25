import asyncio
import logging
from datetime import datetime, timezone
from fastapi import APIRouter, Depends, HTTPException, WebSocket, WebSocketDisconnect, Query, status
from sqlalchemy.ext.asyncio import AsyncSession
from app.core.database import get_db
from app.core.security import get_current_user, require_role
from app.models.user import User
from app.services.obd import obd_service
from app.services.alerts import AlertService
from app.websocket.manager import ws_manager
from app.repositories.diagnostic import DiagnosticRepository, LiveDataRepository, AlertRepository, DTCRepository
from app.schemas import (
    OBDConnectionRequest,
    OBDStatusResponse,
    OBDReadingResponse,
    DiagnosticCreate,
    DiagnosticResponse,
    LiveDataCreate,
)

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/obd", tags=["OBD-II"])

diagnostic_repo = None
live_data_repo = None
alert_repo = None
dtc_repo = None


def _get_diag_repo(db: AsyncSession) -> DiagnosticRepository:
    global diagnostic_repo
    if diagnostic_repo is None:
        diagnostic_repo = DiagnosticRepository(db)
    return diagnostic_repo


def _get_live_repo(db: AsyncSession) -> LiveDataRepository:
    global live_data_repo
    if live_data_repo is None:
        live_data_repo = LiveDataRepository(db)
    return live_data_repo


def _get_alert_repo(db: AsyncSession) -> AlertRepository:
    global alert_repo
    if alert_repo is None:
        alert_repo = AlertRepository(db)
    return alert_repo


def _get_dtc_repo(db: AsyncSession) -> DTCRepository:
    global dtc_repo
    if dtc_repo is None:
        dtc_repo = DTCRepository(db)
    return dtc_repo


@router.get("/status", response_model=OBDStatusResponse)
async def get_obd_status(
    current_user: User = Depends(get_current_user),
):
    status = obd_service.get_status()
    return OBDStatusResponse(**status)


@router.post("/connect")
async def connect_obd(
    data: OBDConnectionRequest,
    current_user: User = Depends(require_role("Administrador", "Técnico")),
    db: AsyncSession = Depends(get_db),
):
    if obd_service.is_connected:
        raise HTTPException(status_code=400, detail="Already connected. Disconnect first.")

    # Create diagnostic session
    diag_repo = DiagnosticRepository(db)
    diagnostic = await diag_repo.create({
        "vehicle_id": data.vehicle_id,
        "client_id": data.client_id,
        "technician_id": current_user.id,
        "start_time": datetime.now(timezone.utc),
        "status": "in_progress",
    })

    async def on_data(data: dict):
        ldr = LiveDataRepository(db)
        alert_svc = AlertService(db)
        try:
            await ldr.create({
                "diagnostic_id": diagnostic.id,
                "vehicle_id": data.vehicle_id,
                **{k: v for k, v in data.items() if k != "timestamp"},
                "timestamp": datetime.now(timezone.utc),
            })
            alerts = await alert_svc.create_alerts(
                data.vehicle_id, diagnostic.id, data
            )
            for alert in alerts:
                await ws_manager.broadcast_alert(alert.model_dump())
        except Exception as e:
            logger.error(f"Error storing live data: {e}")

        await ws_manager.broadcast_data(diagnostic.id, data)

    success = await obd_service.connect(
        vehicle_id=data.vehicle_id,
        diagnostic_id=diagnostic.id,
        port=data.port,
        callback=on_data,
    )

    if not success:
        await diag_repo.update(diagnostic.id, {
            "status": "failed",
            "end_time": datetime.now(timezone.utc),
        })
        raise HTTPException(status_code=500, detail="Failed to connect to OBD-II adapter")

    await obd_service.start_reading()

    return {
        "message": "Connected to OBD-II",
        "diagnostic_id": diagnostic.id,
        "status": "connected",
    }


@router.post("/disconnect")
async def disconnect_obd(
    current_user: User = Depends(require_role("Administrador", "Técnico")),
    db: AsyncSession = Depends(get_db),
):
    if not obd_service.is_connected:
        raise HTTPException(status_code=400, detail="Not connected")

    diagnostic_id = obd_service._diagnostic_id
    await obd_service.disconnect()

    if diagnostic_id:
        diag_repo = DiagnosticRepository(db)
        await diag_repo.update(diagnostic_id, {
            "status": "completed",
            "end_time": datetime.now(timezone.utc),
        })

    return {"message": "Disconnected from OBD-II"}


@router.post("/read-dtc")
async def read_dtc_codes(
    current_user: User = Depends(require_role("Administrador", "Técnico")),
    db: AsyncSession = Depends(get_db),
):
    if not obd_service.is_connected:
        raise HTTPException(status_code=400, detail="Not connected to OBD-II")

    codes = await obd_service.get_dtc_codes()
    diagnostic_id = obd_service._diagnostic_id
    vehicle_id = obd_service.vehicle_id
    saved_codes = []

    if codes and diagnostic_id and vehicle_id:
        dtc_repo = DTCRepository(db)
        for c in codes:
            dtc = await dtc_repo.create({
                "diagnostic_id": diagnostic_id,
                "vehicle_id": vehicle_id,
                "code": c["code"],
                "description": c["description"],
                "status": "active",
            })
            saved_codes.append({
                "id": dtc.id,
                "code": dtc.code,
                "description": dtc.description,
            })

    await ws_manager.send_dtc_codes(diagnostic_id, saved_codes)
    return {"codes": codes, "saved": saved_codes}


@router.post("/clear-dtc")
async def clear_dtc_codes(
    current_user: User = Depends(require_role("Administrador", "Técnico")),
    db: AsyncSession = Depends(get_db),
):
    if not obd_service.is_connected:
        raise HTTPException(status_code=400, detail="Not connected to OBD-II")

    success = await obd_service.clear_dtc_codes()
    if success and obd_service.vehicle_id:
        dtc_repo = DTCRepository(db)
        active = await dtc_repo.get_active_by_vehicle(obd_service.vehicle_id)
        for dtc in active:
            await dtc_repo.update(dtc.id, {
                "is_cleared": True,
                "cleared_at": datetime.now(timezone.utc),
                "status": "cleared",
            })

    return {"success": success, "message": "DTC codes cleared" if success else "Failed to clear DTC codes"}


@router.get("/latest-reading", response_model=OBDReadingResponse)
async def get_latest_reading(
    current_user: User = Depends(get_current_user),
):
    if not obd_service.is_connected:
        return OBDReadingResponse(timestamp=0)
    data = obd_service.latest_data
    return OBDReadingResponse(**data) if data else OBDReadingResponse(timestamp=0)


@router.websocket("/ws/{diagnostic_id}")
async def obd_websocket(
    websocket: WebSocket,
    diagnostic_id: int,
):
    await ws_manager.connect(diagnostic_id, websocket)
    try:
        while True:
            data = await websocket.receive_text()
            # Keep connection alive; client can send ping
            if data == "ping":
                await websocket.send_text("pong")
    except WebSocketDisconnect:
        await ws_manager.disconnect(diagnostic_id, websocket)
    except Exception:
        await ws_manager.disconnect(diagnostic_id, websocket)
