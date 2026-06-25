from typing import Optional, List
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from app.models.client import Client
from app.models.vehicle import Vehicle
from app.repositories.base import BaseRepository


class ClientRepository(BaseRepository[Client]):
    def __init__(self, session: AsyncSession):
        super().__init__(Client, session)

    async def search(self, query: str, skip: int = 0, limit: int = 100) -> List[Client]:
        result = await self.session.execute(
            select(Client)
            .where(
                (Client.full_name.ilike(f"%{query}%"))
                | (Client.email.ilike(f"%{query}%"))
                | (Client.phone.ilike(f"%{query}%"))
            )
            .offset(skip)
            .limit(limit)
        )
        return list(result.scalars().all())


class VehicleRepository(BaseRepository[Vehicle]):
    def __init__(self, session: AsyncSession):
        super().__init__(Vehicle, session)

    async def get_by_client(self, client_id: int) -> List[Vehicle]:
        result = await self.session.execute(
            select(Vehicle).where(Vehicle.client_id == client_id)
        )
        return list(result.scalars().all())

    async def get_by_vin(self, vin: str) -> Optional[Vehicle]:
        result = await self.session.execute(
            select(Vehicle).where(Vehicle.vin == vin)
        )
        return result.scalar_one_or_none()

    async def get_by_plate(self, license_plate: str) -> Optional[Vehicle]:
        result = await self.session.execute(
            select(Vehicle).where(Vehicle.license_plate == license_plate)
        )
        return result.scalar_one_or_none()

    async def search(self, query: str, skip: int = 0, limit: int = 100) -> List[Vehicle]:
        result = await self.session.execute(
            select(Vehicle)
            .where(
                (Vehicle.brand.ilike(f"%{query}%"))
                | (Vehicle.model.ilike(f"%{query}%"))
                | (Vehicle.vin.ilike(f"%{query}%"))
                | (Vehicle.license_plate.ilike(f"%{query}%"))
            )
            .offset(skip)
            .limit(limit)
        )
        return list(result.scalars().all())
