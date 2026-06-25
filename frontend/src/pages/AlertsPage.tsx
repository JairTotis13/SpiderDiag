import { useState, useEffect, useCallback } from 'react';
import {
  AlertTriangle,
  Thermometer,
  BatteryCharging,
  Gauge,
  Car,
  Activity,
  Bell,
  CheckCircle,
  Filter,
} from 'lucide-react';
import { sileo } from 'sileo';
import { alertService, vehicleService } from '@/services/dataService';
import type { Alert, Vehicle, PaginatedResponse } from '@/types';

const PAGE_SIZE = 20;

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const alertIconMap: Record<string, any> = {
  engine_temp: Thermometer,
  voltage: BatteryCharging,
  rpm: Gauge,
  speed: Car,
  fuel: Activity,
  engine_load: Activity,
  o2_sensor: Activity,
  maf_sensor: Activity,
  knock: AlertTriangle,
  misfire: AlertTriangle,
  battery: BatteryCharging,
  generic: Bell,
};

const getAlertIcon = (alertType: string) => {
  const Icon = alertIconMap[alertType] || Bell;
  return <Icon size={20} />;
};

const severityConfig: Record<
  string,
  { badge: string; border: string }
> = {
  warning: {
    badge: 'bg-yellow-500/10 text-yellow-400 ring-1 ring-inset ring-yellow-500/20',
    border: 'border-yellow-500/40',
  },
  critical: {
    badge: 'bg-red-500/10 text-red-400 ring-1 ring-inset ring-red-500/20',
    border: 'border-red-500/40',
  },
  info: {
    badge: 'bg-blue-500/10 text-blue-400 ring-1 ring-inset ring-blue-500/20',
    border: 'border-blue-500/40',
  },
};

const severityLabel: Record<string, string> = {
  warning: 'Advertencia',
  critical: 'Crítico',
  info: 'Informativo',
};

const getVehicleLabel = (vehicleId: number, vehicles: Vehicle[]) => {
  const v = vehicles.find((x) => x.id === vehicleId);
  if (v) return `${v.brand} ${v.model} (${v.year})`;
  return `#${vehicleId}`;
};

const formatAlertTime = (val: string) => {
  return new Date(val).toLocaleString();
};

export default function AlertsPage() {
  const [data, setData] = useState<PaginatedResponse<Alert> | null>(null);
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [page, setPage] = useState(0);
  const [loading, setLoading] = useState(true);
  const [unreadOnly, setUnreadOnly] = useState(false);
  const [vehicleFilter, setVehicleFilter] = useState<number | ''>('');
  const [unreadCount, setUnreadCount] = useState(0);

  const fetchAlerts = useCallback(() => {
    setLoading(true);
    alertService
      .list({
        skip: page * PAGE_SIZE,
        limit: PAGE_SIZE,
        vehicle_id: vehicleFilter || undefined,
        unread_only: unreadOnly || undefined,
      })
      .then((res) => {
        setData(res);
        // Fetch total unread count
        alertService.list({ limit: 1, unread_only: true }).then((r) => {
          setUnreadCount(r.total);
        }).catch(() => {});
      })
      .catch(() => sileo.error({ title: 'Error al cargar alertas' }))
      .finally(() => setLoading(false));
  }, [page, unreadOnly, vehicleFilter]);

  useEffect(() => {
    fetchAlerts();
  }, [fetchAlerts]);

  useEffect(() => {
    vehicleService.list({ limit: 200 }).then((r) => setVehicles(r.items)).catch(() => {});
  }, []);

  // Auto-refresh every 10 seconds (only fetch unread count to be light)
  useEffect(() => {
    const interval = setInterval(() => {
      alertService.list({ limit: 1, unread_only: true }).then((r) => {
        setUnreadCount(r.total);
      }).catch(() => {});
    }, 10000);
    return () => clearInterval(interval);
  }, []);

  const handleMarkAsRead = async (alertId: number) => {
    try {
      await alertService.markAsRead(alertId);
      sileo.success({ title: 'Alerta marcada como leída' });
      fetchAlerts();
    } catch {
      sileo.error({ title: 'Error al marcar alerta' });
    }
  };

  const totalPages = data?.total_pages ?? 1;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div>
            <h1 className="text-2xl font-bold text-white">Alertas</h1>
            <p className="text-sm text-gray-600">Notificaciones del sistema de diagnóstico</p>
          </div>
          {unreadCount > 0 && (
            <span className="inline-flex items-center gap-1 rounded-full bg-red-500/10 text-red-400 ring-1 ring-inset ring-red-500/20 px-3 py-1 text-xs font-semibold">
              <Bell size={14} />
              {unreadCount} sin leer
            </span>
          )}
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <div className="flex gap-2">
          <button
            onClick={() => {
              setUnreadOnly(false);
              setPage(0);
            }}
            className={`rounded-xl border px-4 py-2 text-sm font-medium transition-colors ${
              !unreadOnly
                ? 'border-indigo-500/50 bg-indigo-500/10 text-indigo-400'
                : 'border-white/[0.06] bg-white/[0.02] text-gray-400 hover:bg-white/[0.04]'
            }`}
          >
            Todas
          </button>
          <button
            onClick={() => {
              setUnreadOnly(true);
              setPage(0);
            }}
            className={`rounded-xl border px-4 py-2 text-sm font-medium transition-colors ${
              unreadOnly
                ? 'border-indigo-500/50 bg-indigo-500/10 text-indigo-400'
                : 'border-white/[0.06] bg-white/[0.02] text-gray-400 hover:bg-white/[0.04]'
            }`}
          >
            No leídas
          </button>
        </div>
        <div className="sm:w-56">
          <select
            value={vehicleFilter}
            onChange={(e) => {
              setVehicleFilter(e.target.value ? Number(e.target.value) : '');
              setPage(0);
            }}
            className="w-full rounded-xl border border-white/[0.06] bg-white/[0.02] px-3 py-2.5 text-sm text-white focus:border-indigo-500/50 focus:outline-none focus:ring-4 focus:ring-indigo-500/10"
          >
            <option value="">Todos los vehículos</option>
            {vehicles.map((v) => (
              <option key={v.id} value={v.id}>
                {v.brand} {v.model} ({v.year})
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Alert Cards */}
      <div className="space-y-3">
        {loading ? (
          <div className="rounded-2xl border border-white/[0.06] bg-[#0e0e1a] p-8 text-center text-gray-500">
            Cargando...
          </div>
        ) : data && data.items.length === 0 ? (
          <div className="rounded-2xl border border-white/[0.06] bg-[#0e0e1a] p-8 text-center text-gray-500">
            No se encontraron alertas
          </div>
        ) : (
          data?.items.map((alert) => {
            const cfg = severityConfig[alert.severity] || severityConfig.info;
            const iconColor =
              alert.severity === 'critical'
                ? 'text-red-400'
                : alert.severity === 'warning'
                ? 'text-yellow-400'
                : 'text-blue-400';

            return (
              <div
                key={alert.id}
                className={`rounded-2xl border bg-[#0e0e1a] p-5 transition-colors hover:bg-white/[0.01] ${
                  alert.is_read ? 'border-white/[0.06]' : cfg.border
                }`}
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="flex items-start gap-4 min-w-0">
                    <div
                      className={`mt-0.5 flex-shrink-0 rounded-xl p-2 ${
                        alert.severity === 'critical'
                          ? 'bg-red-500/10'
                          : alert.severity === 'warning'
                          ? 'bg-yellow-500/10'
                          : 'bg-blue-500/10'
                      } ${iconColor}`}
                    >
                      {getAlertIcon(alert.alert_type)}
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <span className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${cfg.badge}`}>
                          {severityLabel[alert.severity] || alert.severity}
                        </span>
                        <span className="text-xs text-gray-500">
                          {getVehicleLabel(alert.vehicle_id, vehicles)}
                        </span>
                        {!alert.is_read && (
                          <span className="h-2 w-2 rounded-full bg-indigo-400 animate-pulse" />
                        )}
                      </div>
                      <p className="text-sm text-white font-medium">{alert.message}</p>
                      {alert.current_value !== null && (
                        <div className="mt-2 flex flex-wrap items-center gap-3 text-xs text-gray-400">
                          <span className="inline-flex items-center gap-1 rounded bg-white/[0.02] px-2 py-0.5 font-mono">
                            Valor: {alert.current_value}
                          </span>
                          {alert.threshold_min !== null && (
                            <span className="inline-flex items-center gap-1 rounded bg-white/[0.02] px-2 py-0.5 font-mono">
                              Min: {alert.threshold_min}
                            </span>
                          )}
                          {alert.threshold_max !== null && (
                            <span className="inline-flex items-center gap-1 rounded bg-white/[0.02] px-2 py-0.5 font-mono">
                              Max: {alert.threshold_max}
                            </span>
                          )}
                        </div>
                      )}
                      <p className="mt-1.5 text-xs text-gray-600">
                        {formatAlertTime(alert.created_at)}
                      </p>
                    </div>
                  </div>
                  <div className="flex-shrink-0">
                    {!alert.is_read ? (
                      <button
                        onClick={() => handleMarkAsRead(alert.id)}
                        className="inline-flex items-center gap-1.5 rounded-xl border border-white/[0.06] bg-white/[0.02] px-3 py-1.5 text-xs text-gray-400 hover:bg-white/[0.04] hover:text-white"
                      >
                        <CheckCircle size={14} />
                        Marcar leída
                      </button>
                    ) : (
                      <span className="inline-flex items-center gap-1 text-xs text-gray-600">
                        <CheckCircle size={14} />
                        Leída
                      </span>
                    )}
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Pagination */}
      {!loading && data && data.total > 0 && (
        <div className="flex items-center justify-between text-sm text-gray-500">
          <span>
            Mostrando {page * PAGE_SIZE + 1}–{Math.min((page + 1) * PAGE_SIZE, data.total)} de{' '}
            {data.total}
          </span>
          <div className="flex gap-2">
            <button
              onClick={() => setPage((p) => Math.max(0, p - 1))}
              disabled={page === 0}
              className="rounded-xl border border-white/[0.06] bg-[#0e0e1a] px-3 py-1.5 text-sm text-gray-400 hover:bg-white/[0.04] disabled:opacity-30"
            >
              Anterior
            </button>
            <button
              onClick={() => setPage((p) => p + 1)}
              disabled={page >= totalPages - 1}
              className="rounded-xl border border-white/[0.06] bg-[#0e0e1a] px-3 py-1.5 text-sm text-gray-400 hover:bg-white/[0.04] disabled:opacity-30"
            >
              Siguiente
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
