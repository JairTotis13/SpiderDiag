import logging
from typing import List, Dict, Any
from sqlalchemy.ext.asyncio import AsyncSession
from app.repositories.diagnostic import AlertRepository
from app.schemas import AlertResponse

logger = logging.getLogger(__name__)

# Thresholds for intelligent alerts
THRESHOLDS = {
    "engine_temp": {"min": 85, "max": 105, "unit": "°C", "label": "Temperatura del motor"},
    "voltage": {"min": 12.6, "max": 14.8, "unit": "V", "label": "Voltaje de batería"},
    "rpm": {"min": 600, "max": 4000, "unit": "RPM", "label": "RPM"},
    "engine_load": {"min": 0, "max": 95, "unit": "%", "label": "Carga del motor"},
    "tps_position": {"min": 0, "max": 100, "unit": "%", "label": "Posición TPS"},
    "map_pressure": {"min": 20, "max": 105, "unit": "kPa", "label": "Presión MAP"},
    "speed": {"min": 0, "max": 180, "unit": "km/h", "label": "Velocidad"},
}


class AlertService:
    def __init__(self, db: AsyncSession):
        self.repo = AlertRepository(db)

    def analyze_reading(self, data: Dict[str, Any]) -> List[Dict[str, Any]]:
        """Analyze OBD reading and generate alerts for out-of-range values."""
        alerts = []

        for key, thresholds in THRESHOLDS.items():
            value = data.get(key)
            if value is None:
                continue

            if value < thresholds["min"]:
                alerts.append({
                    "alert_type": key,
                    "severity": "warning",
                    "message": (
                        f"{thresholds['label']} bajo: {value}{thresholds['unit']} "
                        f"(mín: {thresholds['min']}{thresholds['unit']})"
                    ),
                    "current_value": value,
                    "threshold_min": thresholds["min"],
                    "threshold_max": thresholds["max"],
                })
            elif value > thresholds["max"]:
                severity = "critical" if key in ("engine_temp", "voltage") else "warning"
                alerts.append({
                    "alert_type": key,
                    "severity": severity,
                    "message": (
                        f"{thresholds['label']} alto: {value}{thresholds['unit']} "
                        f"(máx: {thresholds['max']}{thresholds['unit']})"
                    ),
                    "current_value": value,
                    "threshold_min": thresholds["min"],
                    "threshold_max": thresholds["max"],
                })

        return alerts

    async def create_alerts(
        self,
        vehicle_id: int,
        diagnostic_id: int,
        data: Dict[str, Any],
    ) -> List[AlertResponse]:
        alerts_data = self.analyze_reading(data)
        created = []

        for alert_data in alerts_data:
            alert = await self.repo.create({
                "vehicle_id": vehicle_id,
                "diagnostic_id": diagnostic_id,
                "alert_type": alert_data["alert_type"],
                "severity": alert_data["severity"],
                "message": alert_data["message"],
                "current_value": alert_data["current_value"],
                "threshold_min": alert_data["threshold_min"],
                "threshold_max": alert_data["threshold_max"],
                "is_read": 0,
            })
            created.append(AlertResponse.model_validate(alert))

        return created

    async def get_unread(self, skip: int = 0, limit: int = 50) -> List[AlertResponse]:
        alerts = await self.repo.get_unread(skip, limit)
        return [AlertResponse.model_validate(a) for a in alerts]

    async def get_by_vehicle(self, vehicle_id: int) -> List[AlertResponse]:
        alerts = await self.repo.get_by_vehicle(vehicle_id)
        return [AlertResponse.model_validate(a) for a in alerts]

    async def mark_as_read(self, alert_id: int) -> Optional[AlertResponse]:
        alert = await self.repo.mark_as_read(alert_id)
        if alert:
            return AlertResponse.model_validate(alert)
        return None
