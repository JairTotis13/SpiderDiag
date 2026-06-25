from sqlalchemy import Column, String, Integer, Text, ForeignKey, DateTime
from sqlalchemy.orm import relationship
from app.models.base import Base, TimestampMixin


class Report(Base, TimestampMixin):
    __tablename__ = "reports"

    diagnostic_id = Column(Integer, ForeignKey("diagnostics.id"), nullable=False, index=True)
    technician_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    vehicle_id = Column(Integer, ForeignKey("vehicles.id"), nullable=False)
    client_id = Column(Integer, ForeignKey("clients.id"), nullable=False)
    report_type = Column(String(50), nullable=False, default="full")
    pdf_path = Column(String(500), nullable=True)
    shop_name = Column(String(200), nullable=True)
    shop_address = Column(String(300), nullable=True)
    shop_phone = Column(String(30), nullable=True)
    recommendations = Column(Text, nullable=True)
    generated_at = Column(DateTime, nullable=True)

    diagnostic = relationship("Diagnostic")
    technician = relationship("User")
    vehicle = relationship("Vehicle")
    client = relationship("Client")
