from sqlalchemy import Column, String, Float, Integer, ForeignKey, DateTime
from sqlalchemy.orm import relationship
from app.models.base import Base, TimestampMixin


class LiveData(Base, TimestampMixin):
    __tablename__ = "live_data"

    diagnostic_id = Column(Integer, ForeignKey("diagnostics.id"), nullable=False, index=True)
    vehicle_id = Column(Integer, ForeignKey("vehicles.id"), nullable=False, index=True)
    rpm = Column(Float, nullable=True)
    speed = Column(Float, nullable=True)
    engine_temp = Column(Float, nullable=True)
    voltage = Column(Float, nullable=True)
    fuel_consumption = Column(Float, nullable=True)
    engine_load = Column(Float, nullable=True)
    map_pressure = Column(Float, nullable=True)
    tps_position = Column(Float, nullable=True)
    timestamp = Column(DateTime, nullable=False)

    diagnostic = relationship("Diagnostic")
    vehicle = relationship("Vehicle")
