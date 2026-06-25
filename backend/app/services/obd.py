import asyncio
import logging
from typing import Optional, Dict, Any
from datetime import datetime, timezone

from app.core.config import get_settings

logger = logging.getLogger(__name__)
settings = get_settings()


class OBDService:
    """
    Manages OBD-II connections using python-OBD.
    Runs in a separate thread because python-OBD is synchronous.
    """

    def __init__(self):
        self._connection = None
        self._connected = False
        self._vehicle_id: Optional[int] = None
        self._diagnostic_id: Optional[int] = None
        self._reading = False
        self._read_task: Optional[asyncio.Task] = None
        self._latest_data: Dict[str, Any] = {}
        self._callbacks: list = []

    @property
    def is_connected(self) -> bool:
        return self._connected

    @property
    def vehicle_id(self) -> Optional[int]:
        return self._vehicle_id

    @property
    def latest_data(self) -> Dict[str, Any]:
        return self._latest_data

    def get_status(self) -> dict:
        status = {
            "connected": self._connected,
            "vehicle_id": self._vehicle_id,
            "port": None,
            "protocol": None,
            "supported_commands": [],
        }
        if self._connection:
            status["port"] = self._connection.port_name()
            status["protocol"] = str(self._connection.supported_commands)
        return status

    async def connect(
        self,
        vehicle_id: int,
        diagnostic_id: int,
        port: Optional[str] = None,
        callback=None,
    ) -> bool:
        if self._connected:
            await self.disconnect()

        self._vehicle_id = vehicle_id
        self._diagnostic_id = diagnostic_id
        if callback:
            self._callbacks.append(callback)

        port = port or settings.OBD_PORT
        logger.info(f"Connecting to OBD-II adapter on {port}...")

        try:
            import obd
        except ImportError:
            logger.error("python-OBD library not installed")
            return False

        loop = asyncio.get_event_loop()
        result = await loop.run_in_executor(
            None,
            lambda: obd.OBD(
                portstr=port,
                baudrate=settings.OBD_BAUDRATE,
                fast=False,
                timeout=settings.OBD_TIMEOUT,
            ),
        )
        self._connection = result

        if self._connection.is_connected():
            self._connected = True
            logger.info(f"Connected to OBD-II on {port} (protocol: {self._connection.protocol_name()})")
            return True
        else:
            logger.error(f"Failed to connect to OBD-II on {port}")
            self._connection = None
            return False

    async def disconnect(self):
        self._reading = False
        if self._read_task:
            self._read_task.cancel()
            self._read_task = None
        if self._connection:
            try:
                loop = asyncio.get_event_loop()
                await loop.run_in_executor(None, self._connection.close)
            except Exception:
                pass
            self._connection = None
        self._connected = False
        self._vehicle_id = None
        self._diagnostic_id = None
        self._latest_data = {}
        self._callbacks.clear()
        logger.info("Disconnected from OBD-II")

    async def start_reading(self, interval: float = 0.5):
        if not self._connected or not self._connection:
            raise RuntimeError("Not connected to OBD-II")
        self._reading = True
        self._read_task = asyncio.create_task(self._read_loop(interval))

    async def stop_reading(self):
        self._reading = False
        if self._read_task:
            self._read_task.cancel()
            self._read_task = None

    async def _read_loop(self, interval: float):
        import obd

        commands = {
            "rpm": obd.commands.RPM,
            "speed": obd.commands.SPEED,
            "engine_temp": obd.commands.COOLANT_TEMP,
            "engine_load": obd.commands.ENGINE_LOAD,
            "tps_position": obd.commands.THROTTLE_POS,
            "map_pressure": obd.commands.INTAKE_PRESSURE,
            "fuel_consumption": obd.commands.FUEL_RATE if hasattr(obd.commands, 'FUEL_RATE') else None,
        }

        while self._reading and self._connected:
            data = {"timestamp": datetime.now(timezone.utc).timestamp()}

            for key, cmd in commands.items():
                if cmd is None:
                    continue
                try:
                    response = await asyncio.get_event_loop().run_in_executor(
                        None, lambda c=cmd: self._connection.query(c)
                    )
                    if response and not response.is_null():
                        data[key] = response.value.magnitude
                except Exception as e:
                    logger.debug(f"Error reading {key}: {e}")
                    data[key] = None

            # Voltage via ELM327 command
            try:
                volt_cmd = obd.commands.ELM_VOLTAGE if hasattr(obd.commands, 'ELM_VOLTAGE') else None
                if volt_cmd:
                    response = await asyncio.get_event_loop().run_in_executor(
                        None, lambda: self._connection.query(volt_cmd)
                    )
                    if response and not response.is_null():
                        data["voltage"] = response.value.magnitude
            except Exception:
                data["voltage"] = None

            self._latest_data = data

            for cb in self._callbacks:
                try:
                    await cb(data)
                except Exception:
                    pass

            await asyncio.sleep(interval)

    async def get_dtc_codes(self) -> list:
        if not self._connected or not self._connection:
            raise RuntimeError("Not connected to OBD-II")
        import obd

        try:
            response = await asyncio.get_event_loop().run_in_executor(
                None, lambda: self._connection.query(obd.commands.GET_DTC)
            )
            if response and not response.is_null():
                return [
                    {"code": str(code[0]), "description": str(code[1])}
                    for code in response.value
                ]
        except Exception as e:
            logger.error(f"Error reading DTC codes: {e}")
        return []

    async def clear_dtc_codes(self) -> bool:
        if not self._connected or not self._connection:
            raise RuntimeError("Not connected to OBD-II")
        import obd

        try:
            response = await asyncio.get_event_loop().run_in_executor(
                None, lambda: self._connection.query(obd.commands.CLEAR_DTC)
            )
            return response and not response.is_null()
        except Exception as e:
            logger.error(f"Error clearing DTC codes: {e}")
            return False


obd_service = OBDService()
