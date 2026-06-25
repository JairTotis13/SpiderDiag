import { useState, useEffect } from 'react';
import { Activity, Plus, Filter, ChevronDown, ChevronUp, Clock } from 'lucide-react';
import { sileo } from 'sileo';
import { diagnosticService, vehicleService, clientService } from '@/services/dataService';
import type { Diagnostic, Vehicle, Client, PaginatedResponse } from '@/types';

const PAGE_SIZE = 15;

const statusOptions = [
  { value: '', label: 'Todos los estados' },
  { value: 'in_progress', label: 'En progreso' },
  { value: 'completed', label: 'Completado' },
  { value: 'failed', label: 'Fallido' },
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

const formatDateTime = (val: string | null) => {
  if (!val) return '—';
  return new Date(val).toLocaleString();
};

export default function DiagnosticsPage() {
  const [data, setData] = useState<PaginatedResponse<Diagnostic> | null>(null);
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [clients, setClients] = useState<Client[]>([]);
  const [page, setPage] = useState(0);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState('');
  const [vehicleFilter, setVehicleFilter] = useState<number | ''>('');
  const [expandedId, setExpandedId] = useState<number | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({ vehicle_id: 0, client_id: 0, notes: '' });

  const fetchDiagnostics = () => {
    setLoading(true);
    diagnosticService
      .list({
        skip: page * PAGE_SIZE,
        limit: PAGE_SIZE,
        vehicle_id: vehicleFilter || undefined,
      })
      .then(setData)
      .catch(() => sileo.error({ title: 'Error al cargar diagnósticos' }))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    fetchDiagnostics();
  }, [page, vehicleFilter]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    vehicleService.list({ limit: 200 }).then((r) => setVehicles(r.items)).catch(() => {});
    clientService.list({ limit: 200 }).then((r) => setClients(r.items)).catch(() => {});
  }, []);

  const filteredItems = data?.items.filter((d) => {
    if (statusFilter && d.status !== statusFilter) return false;
    return true;
  }) ?? [];

  const handleCreate = async () => {
    if (!form.vehicle_id || !form.client_id) {
      sileo.error({ title: 'Selecciona vehículo y cliente' });
      return;
    }
    setSaving(true);
    try {
      await diagnosticService.create({
        vehicle_id: form.vehicle_id,
        client_id: form.client_id,
        notes: form.notes || undefined,
      });
      sileo.success({ title: 'Diagnóstico creado' });
      setModalOpen(false);
      setForm({ vehicle_id: 0, client_id: 0, notes: '' });
      fetchDiagnostics();
    } catch {
      sileo.error({ title: 'Error al crear diagnóstico' });
    } finally {
      setSaving(false);
    }
  };

  const getVehicleLabel = (d: Diagnostic) => {
    if (d.vehicle) {
      return `${d.vehicle.brand} ${d.vehicle.model} (${d.vehicle.year})`;
    }
    const v = vehicles.find((x) => x.id === d.vehicle_id);
    if (v) return `${v.brand} ${v.model} (${v.year})`;
    return `Vehículo #${d.vehicle_id}`;
  };

  const totalPages = data?.total_pages ?? 1;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Diagnósticos</h1>
          <p className="text-sm text-gray-600">Sesiones de diagnóstico automotriz</p>
        </div>
        <button
          onClick={() => setModalOpen(true)}
          className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-indigo-600 to-violet-600 px-4 py-3 text-sm font-semibold text-white shadow-lg shadow-indigo-500/25 hover:from-indigo-500 hover:to-violet-500"
        >
          <Plus size={18} />
          Nuevo Diagnóstico
        </button>
      </div>

      {/* Filters */}
      <div className="flex flex-col gap-3 sm:flex-row">
        <div className="sm:w-52">
          <select
            value={statusFilter}
            onChange={(e) => {
              setStatusFilter(e.target.value);
              setPage(0);
            }}
            className="w-full rounded-xl border border-white/[0.06] bg-white/[0.02] px-3 py-2.5 text-sm text-white focus:border-indigo-500/50 focus:outline-none focus:ring-4 focus:ring-indigo-500/10"
          >
            {statusOptions.map((o) => (
              <option key={o.value} value={o.value}>{o.label}</option>
            ))}
          </select>
        </div>
        <div className="sm:w-64">
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

      {/* Table */}
      <div className="overflow-x-auto rounded-2xl border border-white/[0.06] bg-[#0e0e1a]">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-white/[0.04] text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              <th className="px-4 py-3 w-8" />
              <th className="px-4 py-3">Vehículo</th>
              <th className="px-4 py-3">Técnico</th>
              <th className="px-4 py-3">Estado</th>
              <th className="px-4 py-3">Inicio</th>
              <th className="px-4 py-3">Fin</th>
              <th className="px-4 py-3">Creado</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={7} className="px-4 py-8 text-center text-gray-500">
                  Cargando...
                </td>
              </tr>
            ) : filteredItems.length === 0 ? (
              <tr>
                <td colSpan={7} className="px-4 py-8 text-center text-gray-500">
                  No se encontraron diagnósticos
                </td>
              </tr>
            ) : (
              filteredItems.map((d) => (
                <>
                  <tr
                    key={d.id}
                    onClick={() => setExpandedId(expandedId === d.id ? null : d.id)}
                    className="border-b border-white/[0.02] hover:bg-white/[0.01] cursor-pointer"
                  >
                    <td className="px-4 py-3 text-gray-400">
                      {expandedId === d.id ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                    </td>
                    <td className="px-4 py-3 font-medium">{getVehicleLabel(d)}</td>
                    <td className="px-4 py-3 text-gray-400">Técnico #{d.technician_id}</td>
                    <td className="px-4 py-3">{statusBadge(d.status)}</td>
                    <td className="px-4 py-3 text-gray-400 text-xs">
                      <span className="inline-flex items-center gap-1">
                        <Clock size={12} />
                        {formatDateTime(d.start_time)}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-gray-400 text-xs">
                      {formatDateTime(d.end_time)}
                    </td>
                    <td className="px-4 py-3 text-gray-500 text-xs">
                      {formatDateTime(d.created_at)}
                    </td>
                  </tr>
                  {expandedId === d.id && (
                    <tr key={`exp-${d.id}`} className="border-b border-white/[0.02] bg-[#0a0a16]/50">
                      <td colSpan={7} className="px-6 py-4">
                        <div className="grid gap-4 md:grid-cols-2">
                          <div>
                            <h4 className="mb-1 text-xs font-medium text-gray-500 uppercase tracking-wide">
                              Notas
                            </h4>
                            <p className="text-sm text-gray-300">
                              {d.notes || 'Sin notas registradas'}
                            </p>
                          </div>
                          <div>
                            <h4 className="mb-1 text-xs font-medium text-gray-500 uppercase tracking-wide">
                              Lecturas (Snapshot)
                            </h4>
                            {d.readings_snapshot ? (
                              <pre className="max-h-40 overflow-auto rounded-xl border border-white/[0.06] bg-white/[0.02] p-3 text-xs text-gray-400 font-mono">
                                {JSON.stringify(d.readings_snapshot, null, 2)}
                              </pre>
                            ) : (
                              <p className="text-sm text-gray-500">Sin lecturas registradas</p>
                            )}
                          </div>
                        </div>
                      </td>
                    </tr>
                  )}
                </>
              ))
            )}
          </tbody>
        </table>
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

      {/* Create Modal */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
          <div className="w-full max-w-md rounded-2xl border border-white/[0.08] bg-[#0e0e1a] p-6 shadow-2xl">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-lg font-semibold">Nuevo Diagnóstico</h2>
              <button
                onClick={() => setModalOpen(false)}
                className="rounded p-1 text-gray-400 hover:text-white"
              >
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
              </button>
            </div>
            <div className="space-y-4">
              <div>
                <label className="mb-1 block text-sm text-gray-400">Vehículo *</label>
                <select
                  value={form.vehicle_id || ''}
                  onChange={(e) => setForm({ ...form, vehicle_id: Number(e.target.value) })}
                  className="w-full rounded-xl border border-white/[0.06] bg-white/[0.02] px-3 py-2.5 text-sm text-white focus:border-indigo-500/50 focus:outline-none focus:ring-4 focus:ring-indigo-500/10"
                >
                  <option value="">Seleccionar vehículo...</option>
                  {vehicles.map((v) => (
                    <option key={v.id} value={v.id}>
                      {v.brand} {v.model} ({v.year})
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="mb-1 block text-sm text-gray-400">Cliente *</label>
                <select
                  value={form.client_id || ''}
                  onChange={(e) => setForm({ ...form, client_id: Number(e.target.value) })}
                  className="w-full rounded-xl border border-white/[0.06] bg-white/[0.02] px-3 py-2.5 text-sm text-white focus:border-indigo-500/50 focus:outline-none focus:ring-4 focus:ring-indigo-500/10"
                >
                  <option value="">Seleccionar cliente...</option>
                  {clients.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.full_name}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="mb-1 block text-sm text-gray-400">Notas</label>
                <textarea
                  value={form.notes}
                  onChange={(e) => setForm({ ...form, notes: e.target.value })}
                  rows={3}
                  placeholder="Notas iniciales del diagnóstico..."
                  className="w-full rounded-xl border border-white/[0.06] bg-white/[0.02] px-4 py-3 text-sm text-white placeholder-gray-700 focus:border-indigo-500/50 focus:outline-none focus:ring-4 focus:ring-indigo-500/10 resize-none"
                />
              </div>
            </div>
            <div className="mt-6 flex justify-end gap-3">
              <button
                onClick={() => setModalOpen(false)}
                className="rounded-xl border border-white/[0.06] bg-white/[0.02] px-4 py-3 text-sm text-gray-300 hover:bg-white/[0.04]"
              >
                Cancelar
              </button>
              <button
                onClick={handleCreate}
                disabled={saving}
                className="rounded-xl bg-gradient-to-r from-indigo-600 to-violet-600 px-4 py-3 text-sm font-semibold text-white shadow-lg shadow-indigo-500/25 hover:from-indigo-500 hover:to-violet-500 disabled:opacity-50"
              >
                {saving ? 'Creando...' : 'Crear'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
