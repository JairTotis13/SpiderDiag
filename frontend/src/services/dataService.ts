import api from './api';
import type {
  Client,
  ClientForm,
  Vehicle,
  VehicleForm,
  Diagnostic,
  DTCCode,
  LiveReading,
  Alert,
  Report,
  OBDStatus,
  DashboardSummary,
  PaginatedResponse,
} from '@/types';

// ── Clients ───────────────────────────────────────────────────
export const clientService = {
  list: (params?: { skip?: number; limit?: number; search?: string }) =>
    api.get<PaginatedResponse<Client>>('/clients', { params }).then((r) => r.data),

  getById: (id: number) => api.get<Client>(`/clients/${id}`).then((r) => r.data),

  create: (data: ClientForm) =>
    api.post<Client>('/clients', data).then((r) => r.data),

  update: (id: number, data: Partial<ClientForm>) =>
    api.put<Client>(`/clients/${id}`, data).then((r) => r.data),

  delete: (id: number) => api.delete(`/clients/${id}`),
};

// ── Vehicles ──────────────────────────────────────────────────
export const vehicleService = {
  list: (params?: {
    skip?: number;
    limit?: number;
    search?: string;
    client_id?: number;
  }) =>
    api.get<PaginatedResponse<Vehicle>>('/vehicles', { params }).then((r) => r.data),

  getById: (id: number) => api.get<Vehicle>(`/vehicles/${id}`).then((r) => r.data),

  create: (data: VehicleForm) =>
    api.post<Vehicle>('/vehicles', data).then((r) => r.data),

  update: (id: number, data: Partial<VehicleForm>) =>
    api.put<Vehicle>(`/vehicles/${id}`, data).then((r) => r.data),

  delete: (id: number) => api.delete(`/vehicles/${id}`),
};

// ── Diagnostics ───────────────────────────────────────────────
export const diagnosticService = {
  list: (params?: { skip?: number; limit?: number; vehicle_id?: number }) =>
    api.get<PaginatedResponse<Diagnostic>>('/diagnostics', { params }).then((r) => r.data),

  getById: (id: number) => api.get<Diagnostic>(`/diagnostics/${id}`).then((r) => r.data),

  create: (data: { vehicle_id: number; client_id: number; notes?: string }) =>
    api.post<Diagnostic>('/diagnostics', data).then((r) => r.data),

  update: (id: number, data: Partial<Diagnostic>) =>
    api.put<Diagnostic>(`/diagnostics/${id}`, data).then((r) => r.data),
};

// ── DTC ───────────────────────────────────────────────────────
export const dtcService = {
  list: (params?: {
    skip?: number;
    limit?: number;
    vehicle_id?: number;
    diagnostic_id?: number;
  }) =>
    api.get<PaginatedResponse<DTCCode>>('/dtc', { params }).then((r) => r.data),

  create: (data: { vehicle_id: number; code: string; description?: string }) =>
    api.post<DTCCode>('/dtc', data).then((r) => r.data),

  update: (id: number, data: Partial<DTCCode>) =>
    api.put<DTCCode>(`/dtc/${id}`, data).then((r) => r.data),
};

// ── OBD ───────────────────────────────────────────────────────
export const obdService = {
  getStatus: () => api.get<OBDStatus>('/obd/status').then((r) => r.data),

  connect: (data: { vehicle_id: number; client_id: number; port?: string }) =>
    api.post('/obd/connect', data).then((r) => r.data),

  disconnect: () => api.post('/obd/disconnect').then((r) => r.data),

  readDTC: () => api.post('/obd/read-dtc').then((r) => r.data),

  clearDTC: () => api.post('/obd/clear-dtc').then((r) => r.data),

  getLatestReading: () =>
    api.get<LiveReading>('/obd/latest-reading').then((r) => r.data),
};

// ── Dashboard ─────────────────────────────────────────────────
export const dashboardService = {
  getLiveData: (diagnosticId: number, limit = 100) =>
    api.get<LiveReading[]>(`/dashboard/live/${diagnosticId}`, {
      params: { limit },
    }).then((r) => r.data),

  getLatest: (diagnosticId: number) =>
    api.get<LiveReading>(`/dashboard/latest/${diagnosticId}`).then((r) => r.data),

  getSummary: () =>
    api.get<DashboardSummary>('/dashboard/summary').then((r) => r.data),
};

// ── Alerts ────────────────────────────────────────────────────
export const alertService = {
  list: (params?: {
    skip?: number;
    limit?: number;
    vehicle_id?: number;
    unread_only?: boolean;
  }) =>
    api.get<PaginatedResponse<Alert>>('/alerts', { params }).then((r) => r.data),

  markAsRead: (alertId: number) =>
    api.post<Alert>(`/alerts/${alertId}/read`).then((r) => r.data),
};

// ── Reports ───────────────────────────────────────────────────
export const reportService = {
  list: (params?: { skip?: number; limit?: number }) =>
    api.get<PaginatedResponse<Report>>('/reports', { params }).then((r) => r.data),

  generate: (data: {
    diagnostic_id: number;
    report_type?: string;
    recommendations?: string;
  }) => api.post<Report>('/reports/generate', data).then((r) => r.data),

  downloadUrl: (reportId: number) =>
    `${api.defaults.baseURL}/reports/${reportId}/download`,
};
