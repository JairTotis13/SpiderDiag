import { useState, useEffect } from 'react';
import { ClipboardList, Activity, Zap, Download, Calendar, Clock } from 'lucide-react';
import { sileo } from 'sileo';
import { diagnosticService, dtcService, vehicleService } from '@/services/dataService';
import type { Diagnostic, DTCCode, Vehicle, PaginatedResponse } from '@/types';

const PAGE_SIZE = 15;

type Tab = 'diagnostics' | 'dtc' | 'activity';

const tabs: { key: Tab; label: string; icon: any }[] = [
  { key: 'diagnostics', label: 'Diagnósticos', icon: Activity },
  { key: 'dtc', label: 'Códigos DTC', icon: Zap },
  { key: 'activity', label: 'Actividad', icon: ClipboardList },
];

const statusBadge = (status: string) => {
  const map: Record<string, string> = {
    in_progress: 'bg-yellow-500/10 text-yellow-400 ring-1 ring-inset ring-yellow-500/20',
    completed: 'bg-emerald-500/10 text-emerald-400 ring-1 ring-inset ring-emerald-500/20',
    failed: 'bg-red-500/10 text-red-400 ring-1 ring-inset ring-red-500/20',
  };
  const label: Record<string, string> = {
    in_progress: 'En progreso',
    completed: 'Completado',
    failed: 'Fallido',
  };
  return (
    <span className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium ${map[status] || 'bg-gray-500/10 text-gray-400 ring-1 ring-inset ring-gray-500/20'}`}>
      {label[status] || status}
    </span>
  );
};

const getVehicleLabel = (vehicleId: number, vehicles: Vehicle[]) => {
  const v = vehicles.find((x) => x.id === vehicleId);
  if (v) return `${v.brand} ${v.model} (${v.year})`;
  return `#${vehicleId}`;
};

export default function HistoryPage() {
  const [activeTab, setActiveTab] = useState<Tab>('diagnostics');
  const [page, setPage] = useState(0);

  const [diagData, setDiagData] = useState<PaginatedResponse<Diagnostic> | null>(null);
  const [dtcData, setDtcData] = useState<PaginatedResponse<DTCCode> | null>(null);
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [loading, setLoading] = useState(true);

  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [vehicleFilter, setVehicleFilter] = useState<number | ''>('');

  const fetchDiagnostics = () => {
    setLoading(true);
    diagnosticService
      .list({
        skip: page * PAGE_SIZE,
        limit: PAGE_SIZE,
        vehicle_id: vehicleFilter || undefined,
      })
      .then(setDiagData)
      .catch(() => sileo.error({ title: 'Error al cargar diagnósticos' }))
      .finally(() => setLoading(false));
  };

  const fetchDTC = () => {
    setLoading(true);
    dtcService
      .list({
        skip: page * PAGE_SIZE,
        limit: PAGE_SIZE,
        vehicle_id: vehicleFilter || undefined,
      })
      .then(setDtcData)
      .catch(() => sileo.error({ title: 'Error al cargar códigos DTC' }))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    vehicleService.list({ limit: 200 }).then((r) => setVehicles(r.items)).catch(() => {});
  }, []);

  useEffect(() => {
    setPage(0);
    if (activeTab === 'diagnostics') fetchDiagnostics();
    else if (activeTab === 'dtc') fetchDTC();
    else setLoading(false);
  }, [activeTab, vehicleFilter]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (activeTab === 'diagnostics') fetchDiagnostics();
    else if (activeTab === 'dtc') fetchDTC();
  }, [page]); // eslint-disable-line react-hooks/exhaustive-deps

  const handleExport = () => {
    sileo.success({ title: 'Exportando...' });
  };

  const totalPages =
    activeTab === 'diagnostics'
      ? diagData?.total_pages ?? 1
      : dtcData?.total_pages ?? 1;

  const total =
    activeTab === 'diagnostics'
      ? diagData?.total ?? 0
      : dtcData?.total ?? 0;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Historial</h1>
          <p className="text-sm text-gray-600">Historial combinado del sistema</p>
        </div>
        <button
          onClick={handleExport}
          className="inline-flex items-center gap-2 rounded-xl border border-white/[0.06] bg-white/[0.02] px-4 py-3 text-sm text-gray-300 hover:bg-white/[0.04]"
        >
          <Download size={18} />
          Exportar
        </button>
      </div>

      {/* Filters */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
        <div className="sm:w-48">
          <label className="mb-1 block text-xs text-gray-500">Fecha inicio</label>
          <div className="relative">
            <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" size={16} />
            <input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="w-full rounded-xl border border-white/[0.06] bg-white/[0.02] py-2.5 pl-10 pr-3 text-sm text-white focus:border-indigo-500/50 focus:outline-none focus:ring-4 focus:ring-indigo-500/10"
            />
          </div>
        </div>
        <div className="sm:w-48">
          <label className="mb-1 block text-xs text-gray-500">Fecha fin</label>
          <div className="relative">
            <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" size={16} />
            <input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="w-full rounded-xl border border-white/[0.06] bg-white/[0.02] py-2.5 pl-10 pr-3 text-sm text-white focus:border-indigo-500/50 focus:outline-none focus:ring-4 focus:ring-indigo-500/10"
            />
          </div>
        </div>
        <div className="sm:w-56">
          <label className="mb-1 block text-xs text-gray-500">Vehículo</label>
          <select
            value={vehicleFilter}
            onChange={(e) => setVehicleFilter(e.target.value ? Number(e.target.value) : '')}
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

      {/* Tabs */}
      <div className="flex gap-1 rounded-2xl border border-white/[0.06] bg-[#0e0e1a] p-1">
        {tabs.map((t) => (
          <button
            key={t.key}
            onClick={() => setActiveTab(t.key)}
            className={`inline-flex flex-1 items-center justify-center gap-2 rounded-xl px-4 py-2.5 text-sm font-semibold transition-colors ${
              activeTab === t.key
                ? 'bg-gradient-to-r from-indigo-600 to-violet-600 text-white shadow-lg shadow-indigo-500/25'
                : 'text-gray-400 hover:text-gray-200'
            }`}
          >
            <t.icon size={18} />
            {t.label}
          </button>
        ))}
      </div>

      {/* Tab Content: Diagnostics */}
      {activeTab === 'diagnostics' && (
        <div className="overflow-x-auto rounded-2xl border border-white/[0.06] bg-[#0e0e1a]">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-white/[0.04] text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                <th className="px-4 py-3">Vehículo</th>
                <th className="px-4 py-3">Técnico</th>
                <th className="px-4 py-3">Estado</th>
                <th className="px-4 py-3">Fecha</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={4} className="px-4 py-8 text-center text-gray-500">
                    Cargando...
                  </td>
                </tr>
              ) : diagData && diagData.items.length === 0 ? (
                <tr>
                  <td colSpan={4} className="px-4 py-8 text-center text-gray-500">
                    No se encontraron diagnósticos
                  </td>
                </tr>
              ) : (
                diagData?.items.map((d) => (
                  <tr key={d.id} className="border-b border-white/[0.02] hover:bg-white/[0.01]">
                    <td className="px-4 py-3 font-medium">
                      {getVehicleLabel(d.vehicle_id, vehicles)}
                    </td>
                    <td className="px-4 py-3 text-gray-400">Técnico #{d.technician_id}</td>
                    <td className="px-4 py-3">{statusBadge(d.status)}</td>
                    <td className="px-4 py-3 text-gray-400 text-xs">
                      {new Date(d.created_at).toLocaleString()}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      )}

      {/* Tab Content: DTC */}
      {activeTab === 'dtc' && (
        <div className="overflow-x-auto rounded-2xl border border-white/[0.06] bg-[#0e0e1a]">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-white/[0.04] text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                <th className="px-4 py-3">Código</th>
                <th className="px-4 py-3">Descripción</th>
                <th className="px-4 py-3">Estado</th>
                <th className="px-4 py-3">Severidad</th>
                <th className="px-4 py-3">Vehículo</th>
                <th className="px-4 py-3">Creado</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={6} className="px-4 py-8 text-center text-gray-500">
                    Cargando...
                  </td>
                </tr>
              ) : dtcData && dtcData.items.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-4 py-8 text-center text-gray-500">
                    No se encontraron códigos DTC
                  </td>
                </tr>
              ) : (
                dtcData?.items.map((d) => (
                  <tr key={d.id} className="border-b border-white/[0.02] hover:bg-white/[0.01]">
                    <td className="px-4 py-3 font-mono text-orange-400 font-semibold">{d.code}</td>
                    <td className="px-4 py-3 text-gray-300 max-w-xs truncate">
                      {d.description || '—'}
                    </td>
                    <td className="px-4 py-3">
                      {d.is_cleared ? (
                        <span className="inline-flex rounded-full bg-emerald-500/10 text-emerald-400 ring-1 ring-inset ring-emerald-500/20 px-2.5 py-0.5 text-xs font-medium">
                          Corregido
                        </span>
                      ) : (
                        <span className="inline-flex rounded-full bg-red-500/10 text-red-400 ring-1 ring-inset ring-red-500/20 px-2.5 py-0.5 text-xs font-medium">
                          Activo
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-gray-400 text-xs capitalize">
                      {d.severity || '—'}
                    </td>
                    <td className="px-4 py-3 text-gray-400 text-xs">
                      {getVehicleLabel(d.vehicle_id, vehicles)}
                    </td>
                    <td className="px-4 py-3 text-gray-500 text-xs">
                      {new Date(d.created_at).toLocaleString()}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      )}

      {/* Tab Content: Activity */}
      {activeTab === 'activity' && (
        <div className="rounded-2xl border border-white/[0.06] bg-[#0e0e1a] p-12 text-center">
          <div className="mb-4 inline-flex rounded-full bg-white/[0.02] p-4">
            <Clock size={32} className="text-gray-500" />
          </div>
          <h3 className="text-lg font-medium text-gray-300">Auditoría</h3>
          <p className="mt-2 text-sm text-gray-500">Disponible próximamente</p>
        </div>
      )}

      {/* Pagination */}
      {!loading && total > 0 && activeTab !== 'activity' && (
        <div className="flex items-center justify-between text-sm text-gray-500">
          <span>
            Mostrando {page * PAGE_SIZE + 1}–{Math.min((page + 1) * PAGE_SIZE, total)} de{' '}
            {total}
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
