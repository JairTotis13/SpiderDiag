from typing import Generic, TypeVar, Type, Optional, List
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func, update, delete
from sqlalchemy.orm import joinedload

T = TypeVar("T")


class BaseRepository(Generic[T]):
    def __init__(self, model: Type[T], session: AsyncSession):
        self.model = model
        self.session = session

    async def get_by_id(self, id: int) -> Optional[T]:
        result = await self.session.execute(
            select(self.model).where(self.model.id == id)
        )
        return result.scalar_one_or_none()

    async def get_all(
        self,
        skip: int = 0,
        limit: int = 100,
        order_by: str = "id",
        order_desc: bool = False,
    ) -> List[T]:
        col = getattr(self.model, order_by, self.model.id)
        if order_desc:
            col = col.desc()
        result = await self.session.execute(
            select(self.model).order_by(col).offset(skip).limit(limit)
        )
        return list(result.scalars().all())

    async def count_all(self) -> int:
        result = await self.session.execute(
            select(func.count()).select_from(self.model)
        )
        return result.scalar() or 0

    async def create(self, obj_in: dict) -> T:
        db_obj = self.model(**obj_in)
        self.session.add(db_obj)
        await self.session.flush()
        return db_obj

    async def update(self, id: int, obj_in: dict) -> Optional[T]:
        await self.session.execute(
            update(self.model).where(self.model.id == id).values(**obj_in)
        )
        return await self.get_by_id(id)

    async def delete(self, id: int) -> bool:
        result = await self.session.execute(
            delete(self.model).where(self.model.id == id)
        )
        return result.rowcount > 0
