from datetime import datetime
from typing import Optional, List, Any
from pydantic import BaseModel, EmailStr, Field, model_validator


def _empty_str_to_none(data: Any) -> Any:
    """Convert empty strings to None recursively in dict."""
    if isinstance(data, dict):
        return {k: _empty_str_to_none(v) for k, v in data.items()}
    if isinstance(data, str) and data.strip() == "":
        return None
    return data


# ─── Auth ────────────────────────────────────────────────────────────────────

class Token(BaseModel):
    access_token: str
    refresh_token: str
    token_type: str = "bearer"


class TokenPayload(BaseModel):
    sub: int
    exp: int


class LoginRequest(BaseModel):
    email: EmailStr
    password: str


class RegisterRequest(BaseModel):
    full_name: str = Field(..., min_length=2, max_length=150)
    email: EmailStr
    password: str = Field(..., min_length=8)
    phone: Optional[str] = None
    role_id: int = Field(default=2)


class PasswordRecoveryRequest(BaseModel):
    email: EmailStr


class PasswordResetRequest(BaseModel):
    token: str
    new_password: str = Field(..., min_length=8)


class UserResponse(BaseModel):
    id: int
    full_name: str
    email: str
    phone: Optional[str]
    is_active: bool
    role: "RoleResponse"
    created_at: datetime

    class Config:
        from_attributes = True


class RoleResponse(BaseModel):
    id: int
    name: str
    description: Optional[str]

    class Config:
        from_attributes = True


# ─── Client ──────────────────────────────────────────────────────────────────

class ClientCreate(BaseModel):
    full_name: str = Field(..., min_length=2, max_length=150)
    phone: Optional[str] = None
    email: Optional[EmailStr] = None
    address: Optional[str] = None
    notes: Optional[str] = None

    @model_validator(mode="before")
    @classmethod
    def empty_str_to_none(cls, data: Any) -> Any:
        return _empty_str_to_none(data)


class ClientUpdate(BaseModel):
    full_name: Optional[str] = Field(None, min_length=2, max_length=150)
    phone: Optional[str] = None
    email: Optional[EmailStr] = None
    address: Optional[str] = None
    notes: Optional[str] = None
    is_active: Optional[bool] = None

    @model_validator(mode="before")
    @classmethod
    def empty_str_to_none(cls, data: Any) -> Any:
        return _empty_str_to_none(data)


class ClientResponse(BaseModel):
    id: int
    full_name: str
    phone: Optional[str]
    email: Optional[str]
    address: Optional[str]
    notes: Optional[str]
    is_active: bool
    created_at: datetime

    class Config:
        from_attributes = True


# ─── Vehicle ─────────────────────────────────────────────────────────────────

class VehicleCreate(BaseModel):
    client_id: int
    brand: str = Field(..., max_length=100)
    model: str = Field(..., max_length=100)
    year: int = Field(..., ge=1900, le=2100)
    vin: Optional[str] = None
    license_plate: Optional[str] = None
    mileage: Optional[float] = None
    fuel_type: Optional[str] = None
    observations: Optional[str] = None

    @model_validator(mode="before")
    @classmethod
    def empty_str_to_none(cls, data: Any) -> Any:
        return _empty_str_to_none(data)


class VehicleUpdate(BaseModel):
    client_id: Optional[int] = None
    brand: Optional[str] = Field(None, max_length=100)
    model: Optional[str] = Field(None, max_length=100)
    year: Optional[int] = Field(None, ge=1900, le=2100)
    vin: Optional[str] = None
    license_plate: Optional[str] = None
    mileage: Optional[float] = None
    fuel_type: Optional[str] = None
    observations: Optional[str] = None

    @model_validator(mode="before")
    @classmethod
    def empty_str_to_none(cls, data: Any) -> Any:
        return _empty_str_to_none(data)


class VehicleResponse(BaseModel):
    id: int
    client_id: int
    brand: str
    model: str
    year: int
    vin: Optional[str]
    license_plate: Optional[str]
    mileage: Optional[float]
    fuel_type: Optional[str]
    observations: Optional[str]
    created_at: datetime

    class Config:
        from_attributes = True


# ─── Diagnostic ──────────────────────────────────────────────────────────────

class DiagnosticCreate(BaseModel):
    vehicle_id: int
    client_id: int
    notes: Optional[str] = None


class DiagnosticUpdate(BaseModel):
    status: Optional[str] = None
    notes: Optional[str] = None
    readings_snapshot: Optional[Any] = None
    codes_found: Optional[Any] = None


class DiagnosticResponse(BaseModel):
    id: int
    vehicle_id: int
    technician_id: int
    client_id: int
    start_time: Optional[datetime]
    end_time: Optional[datetime]
    readings_snapshot: Optional[Any]
    codes_found: Optional[Any]
    notes: Optional[str]
    status: str
    created_at: datetime

    class Config:
        from_attributes = True


# ─── DTC ─────────────────────────────────────────────────────────────────────

class DTCCreate(BaseModel):
    vehicle_id: int
    code: str = Field(..., max_length=10)
    description: Optional[str] = None
    status: str = "active"
    severity: Optional[str] = None


class DTCUpdate(BaseModel):
    is_cleared: Optional[bool] = None
    description: Optional[str] = None
    severity: Optional[str] = None


class DTCResponse(BaseModel):
    id: int
    diagnostic_id: Optional[int]
    vehicle_id: int
    code: str
    description: Optional[str]
    status: str
    severity: Optional[str]
    is_cleared: bool
    cleared_at: Optional[datetime]
    created_at: datetime

    class Config:
        from_attributes = True


# ─── Live Data ───────────────────────────────────────────────────────────────

class LiveDataCreate(BaseModel):
    diagnostic_id: int
    vehicle_id: int
    rpm: Optional[float] = None
    speed: Optional[float] = None
    engine_temp: Optional[float] = None
    voltage: Optional[float] = None
    fuel_consumption: Optional[float] = None
    engine_load: Optional[float] = None
    map_pressure: Optional[float] = None
    tps_position: Optional[float] = None


class LiveDataResponse(BaseModel):
    id: int
    diagnostic_id: int
    vehicle_id: int
    rpm: Optional[float]
    speed: Optional[float]
    engine_temp: Optional[float]
    voltage: Optional[float]
    fuel_consumption: Optional[float]
    engine_load: Optional[float]
    map_pressure: Optional[float]
    tps_position: Optional[float]
    timestamp: datetime

    class Config:
        from_attributes = True


# ─── Alert ───────────────────────────────────────────────────────────────────

class AlertResponse(BaseModel):
    id: int
    vehicle_id: int
    diagnostic_id: Optional[int]
    alert_type: str
    severity: str
    message: str
    current_value: Optional[float]
    threshold_min: Optional[float]
    threshold_max: Optional[float]
    is_read: int
    resolved_at: Optional[datetime]
    created_at: datetime

    class Config:
        from_attributes = True


# ─── Report ──────────────────────────────────────────────────────────────────

class ReportCreate(BaseModel):
    diagnostic_id: int
    report_type: str = "full"
    shop_name: Optional[str] = None
    shop_address: Optional[str] = None
    shop_phone: Optional[str] = None
    recommendations: Optional[str] = None


class ReportResponse(BaseModel):
    id: int
    diagnostic_id: int
    technician_id: int
    vehicle_id: int
    client_id: int
    report_type: str
    pdf_path: Optional[str]
    recommendations: Optional[str]
    generated_at: Optional[datetime]
    created_at: datetime

    class Config:
        from_attributes = True


# ─── OBD Connection ──────────────────────────────────────────────────────────

class OBDConnectionRequest(BaseModel):
    vehicle_id: int
    client_id: int
    port: Optional[str] = None


class OBDStatusResponse(BaseModel):
    connected: bool
    vehicle_id: Optional[int] = None
    port: Optional[str] = None
    protocol: Optional[str] = None
    supported_commands: List[str] = []


class OBDReadingResponse(BaseModel):
    timestamp: float
    rpm: Optional[float] = None
    speed: Optional[float] = None
    engine_temp: Optional[float] = None
    voltage: Optional[float] = None
    fuel_consumption: Optional[float] = None
    engine_load: Optional[float] = None
    map_pressure: Optional[float] = None
    tps_position: Optional[float] = None


# ─── Pagination ──────────────────────────────────────────────────────────────

class PaginatedResponse(BaseModel):
    items: List[Any]
    total: int
    page: int
    page_size: int
    total_pages: int


# ─── Audit ───────────────────────────────────────────────────────────────────

class AuditLogResponse(BaseModel):
    id: int
    user_id: int
    action: str
    entity_type: str
    entity_id: Optional[int]
    details: Optional[str]
    ip_address: Optional[str]
    created_at: datetime

    class Config:
        from_attributes = True
