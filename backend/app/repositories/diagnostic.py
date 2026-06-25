from typing import Optional, List
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from sqlalchemy.orm import joinedload
from app.models.diagnostic import Diagnostic
from app.models.dtc import DTCCode
from app.models.live_data import LiveData
from app.models.alert import Alert
from app.models.report import Report
from app.models.audit_log import AuditLog
from app.repositories.base import BaseRepository


class DiagnosticRepository(BaseRepository[Diagnostic]):
    def __init__(self, session: AsyncSession):
        super().__init__(Diagnostic, session)

    async def get_by_vehicle(self, vehicle_id: int, skip: int = 0, limit: int = 100) -> List[Diagnostic]:
        result = await self.session.execute(
            select(Diagnostic)
            .options(joinedload(Diagnostic.vehicle))
            .where(Diagnostic.vehicle_id == vehicle_id)
            .order_by(Diagnostic.created_at.desc())
            .offset(skip)
            .limit(limit)
        )
        return list(result.unique().scalars().all())

    async def get_by_technician(self, technician_id: int, skip: int = 0, limit: int = 100) -> List[Diagnostic]:
        result = await self.session.execute(
            select(Diagnostic)
            .options(joinedload(Diagnostic.vehicle))
            .where(Diagnostic.technician_id == technician_id)
            .order_by(Diagnostic.created_at.desc())
            .offset(skip)
            .limit(limit)
        )
        return list(result.unique().scalars().all())

    async def get_with_relations(self, id: int) -> Optional[Diagnostic]:
        result = await self.session.execute(
            select(Diagnostic)
            .options(
                joinedload(Diagnostic.vehicle),
                joinedload(Diagnostic.technician),
            )
            .where(Diagnostic.id == id)
        )
        return result.unique().scalar_one_or_none()


class DTCRepository(BaseRepository[DTCCode]):
    def __init__(self, session: AsyncSession):
        super().__init__(DTCCode, session)

    async def get_by_vehicle(self, vehicle_id: int, skip: int = 0, limit: int = 100) -> List[DTCCode]:
        result = await self.session.execute(
            select(DTCCode)
            .where(DTCCode.vehicle_id == vehicle_id)
            .order_by(DTCCode.created_at.desc())
            .offset(skip)
            .limit(limit)
        )
        return list(result.scalars().all())

    async def get_active_by_vehicle(self, vehicle_id: int) -> List[DTCCode]:
        result = await self.session.execute(
            select(DTCCode)
            .where(DTCCode.vehicle_id == vehicle_id, DTCCode.is_cleared == False)
        )
        return list(result.scalars().all())

    async def get_by_diagnostic(self, diagnostic_id: int) -> List[DTCCode]:
        result = await self.session.execute(
            select(DTCCode).where(DTCCode.diagnostic_id == diagnostic_id)
        )
        return list(result.scalars().all())


class LiveDataRepository(BaseRepository[LiveData]):
    def __init__(self, session: AsyncSession):
        super().__init__(LiveData, session)

    async def get_by_diagnostic(self, diagnostic_id: int, limit: int = 500) -> List[LiveData]:
        result = await self.session.execute(
            select(LiveData)
            .where(LiveData.diagnostic_id == diagnostic_id)
            .order_by(LiveData.timestamp.desc())
            .limit(limit)
        )
        return list(result.scalars().all())

    async def get_latest(self, diagnostic_id: int) -> Optional[LiveData]:
        result = await self.session.execute(
            select(LiveData)
            .where(LiveData.diagnostic_id == diagnostic_id)
            .order_by(LiveData.timestamp.desc())
            .limit(1)
        )
        return result.scalar_one_or_none()


class AlertRepository(BaseRepository[Alert]):
    def __init__(self, session: AsyncSession):
        super().__init__(Alert, session)

    async def get_unread(self, skip: int = 0, limit: int = 50) -> List[Alert]:
        result = await self.session.execute(
            select(Alert)
            .where(Alert.is_read == 0)
            .order_by(Alert.created_at.desc())
            .offset(skip)
            .limit(limit)
        )
        return list(result.scalars().all())

    async def get_by_vehicle(self, vehicle_id: int) -> List[Alert]:
        result = await self.session.execute(
            select(Alert)
            .where(Alert.vehicle_id == vehicle_id)
            .order_by(Alert.created_at.desc())
            .limit(100)
        )
        return list(result.scalars().all())

    async def mark_as_read(self, alert_id: int) -> Optional[Alert]:
        alert = await self.get_by_id(alert_id)
        if alert:
            alert.is_read = 1
            await self.session.flush()
        return alert


class ReportRepository(BaseRepository[Report]):
    def __init__(self, session: AsyncSession):
        super().__init__(Report, session)

    async def get_by_diagnostic(self, diagnostic_id: int) -> Optional[Report]:
        result = await self.session.execute(
            select(Report).where(Report.diagnostic_id == diagnostic_id)
        )
        return result.scalar_one_or_none()

    async def get_by_technician(self, technician_id: int, skip: int = 0, limit: int = 100) -> List[Report]:
        result = await self.session.execute(
            select(Report)
            .where(Report.technician_id == technician_id)
            .order_by(Report.created_at.desc())
            .offset(skip)
            .limit(limit)
        )
        return list(result.scalars().all())


class AuditLogRepository(BaseRepository[AuditLog]):
    def __init__(self, session: AsyncSession):
        super().__init__(AuditLog, session)

    async def get_by_user(self, user_id: int, skip: int = 0, limit: int = 100) -> List[AuditLog]:
        result = await self.session.execute(
            select(AuditLog)
            .where(AuditLog.user_id == user_id)
            .order_by(AuditLog.created_at.desc())
            .offset(skip)
            .limit(limit)
        )
        return list(result.scalars().all())

    async def log_action(
        self,
        user_id: int,
        action: str,
        entity_type: str,
        entity_id: Optional[int] = None,
        details: Optional[str] = None,
        ip_address: Optional[str] = None,
    ) -> AuditLog:
        log = AuditLog(
            user_id=user_id,
            action=action,
            entity_type=entity_type,
            entity_id=entity_id,
            details=details,
            ip_address=ip_address,
        )
        self.session.add(log)
        await self.session.flush()
        return log
