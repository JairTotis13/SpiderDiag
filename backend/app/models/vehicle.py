from sqlalchemy import Column, String, Integer, Float, Text, ForeignKey
from sqlalchemy.orm import relationship
from app.models.base import Base, TimestampMixin


class Vehicle(Base, TimestampMixin):
    __tablename__ = "vehicles"

    client_id = Column(Integer, ForeignKey("clients.id"), nullable=False, index=True)
    brand = Column(String(100), nullable=False, index=True)
    model = Column(String(100), nullable=False)
    year = Column(Integer, nullable=False)
    vin = Column(String(17), unique=True, nullable=True, index=True)
    license_plate = Column(String(20), nullable=True, index=True)
    mileage = Column(Float, nullable=True)
    fuel_type = Column(String(30), nullable=True)
    observations = Column(Text, nullable=True)

    client = relationship("Client", back_populates="vehicles")
    diagnostics = relationship("Diagnostic", back_populates="vehicle")
