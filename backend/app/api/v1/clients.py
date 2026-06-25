from typing import Optional
from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.ext.asyncio import AsyncSession
from app.core.database import get_db
from app.core.security import get_current_user, require_role
from app.repositories.client_vehicle import ClientRepository
from app.models.user import User
from app.schemas import ClientCreate, ClientUpdate, ClientResponse, PaginatedResponse

router = APIRouter(prefix="/clients", tags=["Clientes"])


@router.get("", response_model=PaginatedResponse)
async def list_clients(
    skip: int = Query(0, ge=0),
    limit: int = Query(100, ge=1, le=500),
    search: Optional[str] = Query(None),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    repo = ClientRepository(db)
    if search:
        items = await repo.search(search, skip, limit)
        total = len(items)
    else:
        items = await repo.get_all(skip, limit)
        total = await repo.count_all()

    total_pages = (total + limit - 1) // limit if limit > 0 else 1
    return PaginatedResponse(
        items=[ClientResponse.model_validate(c) for c in items],
        total=total,
        page=(skip // limit) + 1,
        page_size=limit,
        total_pages=total_pages,
    )


@router.get("/{client_id}", response_model=ClientResponse)
async def get_client(
    client_id: int,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    repo = ClientRepository(db)
    client = await repo.get_by_id(client_id)
    if not client:
        raise HTTPException(status_code=404, detail="Client not found")
    return ClientResponse.model_validate(client)


@router.post("", response_model=ClientResponse, status_code=status.HTTP_201_CREATED)
async def create_client(
    data: ClientCreate,
    current_user: User = Depends(require_role("Administrador", "Técnico", "Supervisor")),
    db: AsyncSession = Depends(get_db),
):
    repo = ClientRepository(db)
    client = await repo.create(data.model_dump())
    return ClientResponse.model_validate(client)


@router.put("/{client_id}", response_model=ClientResponse)
async def update_client(
    client_id: int,
    data: ClientUpdate,
    current_user: User = Depends(require_role("Administrador", "Técnico", "Supervisor")),
    db: AsyncSession = Depends(get_db),
):
    repo = ClientRepository(db)
    client = await repo.get_by_id(client_id)
    if not client:
        raise HTTPException(status_code=404, detail="Client not found")
    update_data = {k: v for k, v in data.model_dump().items() if v is not None}
    updated = await repo.update(client_id, update_data)
    return ClientResponse.model_validate(updated)


@router.delete("/{client_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_client(
    client_id: int,
    current_user: User = Depends(require_role("Administrador")),
    db: AsyncSession = Depends(get_db),
):
    repo = ClientRepository(db)
    try:
        deleted = await repo.delete(client_id)
        if not deleted:
            raise HTTPException(status_code=404, detail="Client not found")
    except Exception:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="No se puede eliminar: el cliente tiene vehículos o diagnósticos asociados"
        )
