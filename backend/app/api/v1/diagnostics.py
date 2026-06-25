from datetime import datetime, timezone
from typing import Optional
from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.ext.asyncio import AsyncSession
from app.core.database import get_db
from app.core.security import get_current_user, require_role
from app.repositories.diagnostic import DiagnosticRepository, DTCRepository
from app.models.user import User
from app.schemas import (
    DiagnosticCreate,
    DiagnosticUpdate,
    DiagnosticResponse,
    DTCCreate,
    DTCUpdate,
    DTCResponse,
    PaginatedResponse,
)

router = APIRouter(tags=["Diagnósticos"])


# ── Diagnostics ────────────────────────────────────────────────────────────

@router.get("/diagnostics", response_model=PaginatedResponse)
async def list_diagnostics(
    skip: int = Query(0, ge=0),
    limit: int = Query(100, ge=1, le=500),
    vehicle_id: Optional[int] = Query(None),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    repo = DiagnosticRepository(db)
    if vehicle_id:
        items = await repo.get_by_vehicle(vehicle_id, skip, limit)
    else:
        items = await repo.get_all(skip, limit)
    total = await repo.count_all()
    total_pages = (total + limit - 1) // limit if limit > 0 else 1
    return PaginatedResponse(
        items=[DiagnosticResponse.model_validate(d) for d in items],
        total=total,
        page=(skip // limit) + 1,
        page_size=limit,
        total_pages=total_pages,
    )


@router.get("/diagnostics/{diagnostic_id}", response_model=DiagnosticResponse)
async def get_diagnostic(
    diagnostic_id: int,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    repo = DiagnosticRepository(db)
    diag = await repo.get_with_relations(diagnostic_id)
    if not diag:
        raise HTTPException(status_code=404, detail="Diagnostic not found")
    return DiagnosticResponse.model_validate(diag)


@router.post("/diagnostics", response_model=DiagnosticResponse, status_code=status.HTTP_201_CREATED)
async def create_diagnostic(
    data: DiagnosticCreate,
    current_user: User = Depends(require_role("Administrador", "Técnico")),
    db: AsyncSession = Depends(get_db),
):
    repo = DiagnosticRepository(db)
    diag = await repo.create({
        **data.model_dump(),
        "technician_id": current_user.id,
        "start_time": datetime.now(timezone.utc),
    })
    return DiagnosticResponse.model_validate(diag)


@router.put("/diagnostics/{diagnostic_id}", response_model=DiagnosticResponse)
async def update_diagnostic(
    diagnostic_id: int,
    data: DiagnosticUpdate,
    current_user: User = Depends(require_role("Administrador", "Técnico")),
    db: AsyncSession = Depends(get_db),
):
    repo = DiagnosticRepository(db)
    diag = await repo.get_by_id(diagnostic_id)
    if not diag:
        raise HTTPException(status_code=404, detail="Diagnostic not found")
    update_data = {k: v for k, v in data.model_dump().items() if v is not None}
    if data.status == "completed":
        update_data["end_time"] = datetime.now(timezone.utc)
    updated = await repo.update(diagnostic_id, update_data)
    return DiagnosticResponse.model_validate(updated)


# ── DTC Codes ──────────────────────────────────────────────────────────────

dtc_router = APIRouter(prefix="/dtc", tags=["Códigos DTC"])


@dtc_router.get("", response_model=PaginatedResponse)
async def list_dtc_codes(
    skip: int = Query(0, ge=0),
    limit: int = Query(100, ge=1, le=500),
    vehicle_id: Optional[int] = Query(None),
    diagnostic_id: Optional[int] = Query(None),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    repo = DTCRepository(db)
    if diagnostic_id:
        items = await repo.get_by_diagnostic(diagnostic_id)
    elif vehicle_id:
        items = await repo.get_by_vehicle(vehicle_id, skip, limit)
    else:
        items = await repo.get_all(skip, limit)
    total = len(items)
    total_pages = (total + limit - 1) // limit if limit > 0 else 1
    return PaginatedResponse(
        items=[DTCResponse.model_validate(d) for d in items],
        total=total,
        page=(skip // limit) + 1,
        page_size=limit,
        total_pages=total_pages,
    )


@dtc_router.post("", response_model=DTCResponse, status_code=status.HTTP_201_CREATED)
async def create_dtc(
    data: DTCCreate,
    current_user: User = Depends(require_role("Administrador", "Técnico")),
    db: AsyncSession = Depends(get_db),
):
    repo = DTCRepository(db)
    dtc = await repo.create(data.model_dump())
    return DTCResponse.model_validate(dtc)


@dtc_router.put("/{dtc_id}", response_model=DTCResponse)
async def update_dtc(
    dtc_id: int,
    data: DTCUpdate,
    current_user: User = Depends(require_role("Administrador", "Técnico")),
    db: AsyncSession = Depends(get_db),
):
    repo = DTCRepository(db)
    dtc = await repo.get_by_id(dtc_id)
    if not dtc:
        raise HTTPException(status_code=404, detail="DTC not found")
    update_data = {k: v for k, v in data.model_dump().items() if v is not None}
    if data.is_cleared:
        update_data["cleared_at"] = datetime.now(timezone.utc)
    updated = await repo.update(dtc_id, update_data)
    return DTCResponse.model_validate(updated)
