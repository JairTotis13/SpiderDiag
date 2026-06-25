from sqlalchemy import Column, String, Integer, Text, DateTime, ForeignKey, Boolean
from sqlalchemy.orm import relationship
from app.models.base import Base, TimestampMixin


class DTCCode(Base, TimestampMixin):
    __tablename__ = "dtc_codes"

    diagnostic_id = Column(Integer, ForeignKey("diagnostics.id"), nullable=False, index=True)
    vehicle_id = Column(Integer, ForeignKey("vehicles.id"), nullable=False, index=True)
    code = Column(String(10), nullable=False, index=True)
    description = Column(Text, nullable=True)
    status = Column(String(30), default="active", nullable=False)
    severity = Column(String(20), nullable=True)
    is_cleared = Column(Boolean, default=False, nullable=False)
    cleared_at = Column(DateTime, nullable=True)

    diagnostic = relationship("Diagnostic", back_populates="dtc_codes")
    vehicle = relationship("Vehicle")
