from typing import Optional, List
from fastapi import APIRouter, Depends, HTTPException, Query, status
from fastapi.responses import StreamingResponse
from sqlalchemy.ext.asyncio import AsyncSession
from app.core.database import get_db
from app.core.security import get_current_user, require_role
from app.models.user import User
from app.repositories.diagnostic import (
    DiagnosticRepository,
    LiveDataRepository,
    AlertRepository,
    ReportRepository,
)
from app.services.reports import ReportService
from app.schemas import (
    LiveDataResponse,
    AlertResponse,
    ReportCreate,
    ReportResponse,
    PaginatedResponse,
)
import io

router = APIRouter(tags=["Dashboard & Reportes"])


# ── Dashboard / Live Data ─────────────────────────────────────────────────

@router.get("/dashboard/live/{diagnostic_id}", response_model=List[LiveDataResponse])
async def get_live_data(
    diagnostic_id: int,
    limit: int = Query(100, ge=1, le=1000),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    repo = LiveDataRepository(db)
    data = await repo.get_by_diagnostic(diagnostic_id, limit)
    return [LiveDataResponse.model_validate(d) for d in data]


@router.get("/dashboard/latest/{diagnostic_id}", response_model=LiveDataResponse)
async def get_latest_reading(
    diagnostic_id: int,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    repo = LiveDataRepository(db)
    reading = await repo.get_latest(diagnostic_id)
    if not reading:
        raise HTTPException(status_code=404, detail="No readings found")
    return LiveDataResponse.model_validate(reading)


@router.get("/dashboard/summary")
async def get_dashboard_summary(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    from app.repositories.client_vehicle import ClientRepository, VehicleRepository

    diag_repo = DiagnosticRepository(db)
    client_repo = ClientRepository(db)
    vehicle_repo = VehicleRepository(db)
    alert_repo = AlertRepository(db)

    total_clients = await client_repo.count_all()
    total_vehicles = await vehicle_repo.count_all()
    total_diagnostics = await diag_repo.count_all()
    pending_alerts = len(await alert_repo.get_unread(limit=100))

    return {
        "total_clients": total_clients,
        "total_vehicles": total_vehicles,
        "total_diagnostics": total_diagnostics,
        "pending_alerts": pending_alerts,
    }


# ── Alerts ─────────────────────────────────────────────────────────────────

@router.get("/alerts", response_model=PaginatedResponse)
async def list_alerts(
    skip: int = Query(0, ge=0),
    limit: int = Query(50, ge=1, le=200),
    vehicle_id: Optional[int] = Query(None),
    unread_only: bool = Query(True),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    repo = AlertRepository(db)
    if vehicle_id:
        items = await repo.get_by_vehicle(vehicle_id)
        if unread_only:
            items = [a for a in items if a.is_read == 0]
        total = len(items)
        items = items[skip : skip + limit]
    elif unread_only:
        items = await repo.get_unread(skip, limit)
        total = len(items)
    else:
        items = await repo.get_all(skip, limit)
        total = await repo.count_all()

    total_pages = (total + limit - 1) // limit if limit > 0 else 1
    return PaginatedResponse(
        items=[AlertResponse.model_validate(a) for a in items],
        total=total,
        page=(skip // limit) + 1,
        page_size=limit,
        total_pages=total_pages,
    )


@router.post("/alerts/{alert_id}/read", response_model=AlertResponse)
async def mark_alert_read(
    alert_id: int,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    repo = AlertRepository(db)
    alert = await repo.mark_as_read(alert_id)
    if not alert:
        raise HTTPException(status_code=404, detail="Alert not found")
    return AlertResponse.model_validate(alert)


# ── Reports ────────────────────────────────────────────────────────────────

@router.post("/reports/generate", response_model=ReportResponse, status_code=status.HTTP_201_CREATED)
async def generate_report(
    data: ReportCreate,
    current_user: User = Depends(require_role("Administrador", "Técnico", "Supervisor")),
    db: AsyncSession = Depends(get_db),
):
    repo = ReportRepository(db)
    existing = await repo.get_by_diagnostic(data.diagnostic_id)
    if existing:
        return ReportResponse.model_validate(existing)

    service = ReportService(db)
    pdf_bytes = await service.generate_report(
        diagnostic_id=data.diagnostic_id,
        technician_id=current_user.id,
        shop_name=data.shop_name or "SpiderDiag Taller",
        shop_address=data.shop_address or "",
        shop_phone=data.shop_phone or "",
        recommendations=data.recommendations or "",
    )

    if pdf_bytes is None:
        raise HTTPException(status_code=500, detail="Failed to generate PDF")

    diag = await DiagnosticRepository(db).get_by_id(data.diagnostic_id)
    if not diag:
        raise HTTPException(status_code=404, detail="Diagnostic not found")

    report = await repo.create({
        "diagnostic_id": data.diagnostic_id,
        "technician_id": current_user.id,
        "vehicle_id": diag.vehicle_id,
        "client_id": diag.client_id,
        "report_type": data.report_type,
        "pdf_path": f"reports/report_{data.diagnostic_id}_{current_user.id}.pdf",
        "shop_name": data.shop_name,
        "shop_address": data.shop_address,
        "shop_phone": data.shop_phone,
        "recommendations": data.recommendations,
    })

    return ReportResponse.model_validate(report)


@router.get("/reports/{report_id}/download")
async def download_report(
    report_id: int,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    repo = ReportRepository(db)
    report = await repo.get_by_id(report_id)
    if not report:
        raise HTTPException(status_code=404, detail="Report not found")

    service = ReportService(db)
    pdf_bytes = await service.generate_report(
        diagnostic_id=report.diagnostic_id,
        technician_id=report.technician_id,
        shop_name=report.shop_name or "SpiderDiag Taller",
        shop_address=report.shop_address or "",
        shop_phone=report.shop_phone or "",
        recommendations=report.recommendations or "",
    )

    if pdf_bytes is None:
        raise HTTPException(status_code=500, detail="Failed to generate PDF")

    return StreamingResponse(
        io.BytesIO(pdf_bytes),
        media_type="application/pdf",
        headers={
            "Content-Disposition": f"attachment; filename=spiderdiag_report_{report.id}.pdf"
        },
    )


@router.get("/reports", response_model=PaginatedResponse)
async def list_reports(
    skip: int = Query(0, ge=0),
    limit: int = Query(100, ge=1, le=500),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    repo = ReportRepository(db)
    items = await repo.get_by_technician(current_user.id, skip, limit)
    items_all = await repo.get_all(skip, limit)
    total = await repo.count_all()
    total_pages = (total + limit - 1) // limit if limit > 0 else 1
    return PaginatedResponse(
        items=[ReportResponse.model_validate(r) for r in items_all],
        total=total,
        page=(skip // limit) + 1,
        page_size=limit,
        total_pages=total_pages,
    )
