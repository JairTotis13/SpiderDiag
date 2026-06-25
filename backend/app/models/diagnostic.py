from sqlalchemy import Column, String, Float, Integer, Text, DateTime, ForeignKey
from sqlalchemy.orm import relationship
from sqlalchemy.dialects.postgresql import JSON
from app.models.base import Base, TimestampMixin


class Diagnostic(Base, TimestampMixin):
    __tablename__ = "diagnostics"

    vehicle_id = Column(Integer, ForeignKey("vehicles.id"), nullable=False, index=True)
    technician_id = Column(Integer, ForeignKey("users.id"), nullable=False, index=True)
    client_id = Column(Integer, ForeignKey("clients.id"), nullable=False, index=True)
    start_time = Column(DateTime, nullable=True)
    end_time = Column(DateTime, nullable=True)
    readings_snapshot = Column(JSON, nullable=True)
    codes_found = Column(JSON, nullable=True)
    notes = Column(Text, nullable=True)
    status = Column(String(30), default="in_progress", nullable=False)

    vehicle = relationship("Vehicle", back_populates="diagnostics")
    technician = relationship("User", back_populates="diagnostics")
    dtc_codes = relationship("DTCCode", back_populates="diagnostic")
