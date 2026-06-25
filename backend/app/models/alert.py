from sqlalchemy import Column, String, Float, Integer, ForeignKey, DateTime
from sqlalchemy.orm import relationship
from app.models.base import Base, TimestampMixin


class Alert(Base, TimestampMixin):
    __tablename__ = "alerts"

    vehicle_id = Column(Integer, ForeignKey("vehicles.id"), nullable=False, index=True)
    diagnostic_id = Column(Integer, ForeignKey("diagnostics.id"), nullable=True)
    alert_type = Column(String(50), nullable=False, index=True)
    severity = Column(String(20), nullable=False, default="warning")
    message = Column(String(500), nullable=False)
    current_value = Column(Float, nullable=True)
    threshold_min = Column(Float, nullable=True)
    threshold_max = Column(Float, nullable=True)
    is_read = Column(Integer, default=0, nullable=False)
    resolved_at = Column(DateTime, nullable=True)

    vehicle = relationship("Vehicle")
    diagnostic = relationship("Diagnostic")
