from typing import Optional
from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.ext.asyncio import AsyncSession
from app.core.database import get_db
from app.core.security import get_current_user, require_role
from app.repositories.client_vehicle import VehicleRepository
from app.models.user import User
from app.schemas import VehicleCreate, VehicleUpdate, VehicleResponse, PaginatedResponse

router = APIRouter(prefix="/vehicles", tags=["Vehículos"])


@router.get("", response_model=PaginatedResponse)
async def list_vehicles(
    skip: int = Query(0, ge=0),
    limit: int = Query(100, ge=1, le=500),
    search: Optional[str] = Query(None),
    client_id: Optional[int] = Query(None),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    repo = VehicleRepository(db)
    if client_id:
        items = await repo.get_by_client(client_id)
        total = len(items)
        items = items[skip : skip + limit]
    elif search:
        items = await repo.search(search, skip, limit)
        total = len(items)
    else:
        items = await repo.get_all(skip, limit)
        total = await repo.count_all()

    total_pages = (total + limit - 1) // limit if limit > 0 else 1
    return PaginatedResponse(
        items=[VehicleResponse.model_validate(v) for v in items],
        total=total,
        page=(skip // limit) + 1,
        page_size=limit,
        total_pages=total_pages,
    )


@router.get("/{vehicle_id}", response_model=VehicleResponse)
async def get_vehicle(
    vehicle_id: int,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    repo = VehicleRepository(db)
    vehicle = await repo.get_by_id(vehicle_id)
    if not vehicle:
        raise HTTPException(status_code=404, detail="Vehicle not found")
    return VehicleResponse.model_validate(vehicle)


@router.post("", response_model=VehicleResponse, status_code=status.HTTP_201_CREATED)
async def create_vehicle(
    data: VehicleCreate,
    current_user: User = Depends(require_role("Administrador", "Técnico", "Supervisor")),
    db: AsyncSession = Depends(get_db),
):
    repo = VehicleRepository(db)
    vehicle = await repo.create(data.model_dump())
    return VehicleResponse.model_validate(vehicle)


@router.put("/{vehicle_id}", response_model=VehicleResponse)
async def update_vehicle(
    vehicle_id: int,
    data: VehicleUpdate,
    current_user: User = Depends(require_role("Administrador", "Técnico", "Supervisor")),
    db: AsyncSession = Depends(get_db),
):
    repo = VehicleRepository(db)
    vehicle = await repo.get_by_id(vehicle_id)
    if not vehicle:
        raise HTTPException(status_code=404, detail="Vehicle not found")
    update_data = {k: v for k, v in data.model_dump().items() if v is not None}
    updated = await repo.update(vehicle_id, update_data)
    return VehicleResponse.model_validate(updated)


@router.delete("/{vehicle_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_vehicle(
    vehicle_id: int,
    current_user: User = Depends(require_role("Administrador")),
    db: AsyncSession = Depends(get_db),
):
    repo = VehicleRepository(db)
    try:
        deleted = await repo.delete(vehicle_id)
        if not deleted:
            raise HTTPException(status_code=404, detail="Vehicle not found")
    except Exception:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="No se puede eliminar: el vehículo tiene diagnósticos asociados"
        )
