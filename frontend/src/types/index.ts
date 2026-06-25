// ─── Auth ─────────────────────────────────────────────────────
export interface User {
  id: number;
  full_name: string;
  email: string;
  phone: string | null;
  is_active: boolean;
  role: Role;
  created_at: string;
}

export interface Role {
  id: number;
  name: string;
  description: string | null;
}

export interface LoginRequest {
  email: string;
  password: string;
}

export interface RegisterRequest {
  full_name: string;
  email: string;
  password: string;
  phone?: string;
  role_id: number;
}

export interface Token {
  access_token: string;
  refresh_token: string;
  token_type: string;
}

// ─── Client ───────────────────────────────────────────────────
export interface Client {
  id: number;
  full_name: string;
  phone: string | null;
  email: string | null;
  address: string | null;
  notes: string | null;
  is_active: boolean;
  created_at: string;
  vehicles?: Vehicle[];
}

export interface ClientForm {
  full_name: string;
  phone: string;
  email: string;
  address: string;
  notes: string;
}

// ─── Vehicle ──────────────────────────────────────────────────
export interface Vehicle {
  id: number;
  client_id: number;
  brand: string;
  model: string;
  year: number;
  vin: string | null;
  license_plate: string | null;
  mileage: number | null;
  fuel_type: string | null;
  observations: string | null;
  created_at: string;
}

export interface VehicleForm {
  client_id: number;
  brand: string;
  model: string;
  year: number;
  vin: string;
  license_plate: string;
  mileage: number;
  fuel_type: string;
  observations: string;
}

// ─── Diagnostic ───────────────────────────────────────────────
export interface Diagnostic {
  id: number;
  vehicle_id: number;
  technician_id: number;
  client_id: number;
  start_time: string | null;
  end_time: string | null;
  readings_snapshot: unknown;
  codes_found: unknown;
  notes: string | null;
  status: 'in_progress' | 'completed' | 'failed';
  created_at: string;
  vehicle?: Vehicle;
}

// ─── DTC ──────────────────────────────────────────────────────
export interface DTCCode {
  id: number;
  diagnostic_id: number | null;
  vehicle_id: number;
  code: string;
  description: string | null;
  status: string;
  severity: string | null;
  is_cleared: boolean;
  cleared_at: string | null;
  created_at: string;
}

// ─── Live Data ────────────────────────────────────────────────
export interface LiveReading {
  id?: number;
  diagnostic_id: number;
  vehicle_id: number;
  rpm: number | null;
  speed: number | null;
  engine_temp: number | null;
  voltage: number | null;
  fuel_consumption: number | null;
  engine_load: number | null;
  map_pressure: number | null;
  tps_position: number | null;
  timestamp: number | string;
}

// ─── Alert ────────────────────────────────────────────────────
export interface Alert {
  id: number;
  vehicle_id: number;
  diagnostic_id: number | null;
  alert_type: string;
  severity: 'warning' | 'critical' | 'info';
  message: string;
  current_value: number | null;
  threshold_min: number | null;
  threshold_max: number | null;
  is_read: number;
  resolved_at: string | null;
  created_at: string;
}

// ─── Report ───────────────────────────────────────────────────
export interface Report {
  id: number;
  diagnostic_id: number;
  technician_id: number;
  vehicle_id: number;
  client_id: number;
  report_type: string;
  pdf_path: string | null;
  recommendations: string | null;
  generated_at: string | null;
  created_at: string;
}

// ─── OBD ──────────────────────────────────────────────────────
export interface OBDStatus {
  connected: boolean;
  vehicle_id: number | null;
  port: string | null;
  protocol: string | null;
  supported_commands: string[];
}

// ─── Pagination ───────────────────────────────────────────────
export interface PaginatedResponse<T> {
  items: T[];
  total: number;
  page: number;
  page_size: number;
  total_pages: number;
}

// ─── Dashboard ────────────────────────────────────────────────
export interface DashboardSummary {
  total_clients: number;
  total_vehicles: number;
  total_diagnostics: number;
  pending_alerts: number;
}
