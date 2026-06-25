import { useState, useEffect } from 'react';
import { Zap, Search, Plus, Filter, CheckCircle, XCircle } from 'lucide-react';
import { sileo } from 'sileo';
import { dtcService, vehicleService } from '@/services/dataService';
import type { DTCCode, Vehicle, PaginatedResponse } from '@/types';

const PAGE_SIZE = 15;

const statusBadge = (isCleared: boolean) => {
  if (isCleared) {
    return (
      <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/10 text-emerald-400 ring-1 ring-inset ring-emerald-500/20 px-2.5 py-0.5 text-xs font-medium">
        <CheckCircle size={12} />
        Corregido
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1 rounded-full bg-red-500/10 text-red-400 ring-1 ring-inset ring-red-500/20 px-2.5 py-0.5 text-xs font-medium">
      <XCircle size={12} />
      Activo
    </span>
  );
};

const getVehicleLabel = (vehicleId: number, vehicles: Vehicle[]) => {
  const v = vehicles.find((x) => x.id === vehicleId);
  if (v) return `${v.brand} ${v.model} (${v.year})`;
  return `#${vehicleId}`;
};

export default function DTCPage() {
  const [data, setData] = useState<PaginatedResponse<DTCCode> | null>(null);
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [page, setPage] = useState(0);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [vehicleFilter, setVehicleFilter] = useState<number | ''>('');
  const [diagnosticFilter, setDiagnosticFilter] = useState<string>('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [modalOpen, setModalOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({ code: '', description: '', vehicle_id: 0 });
  const [editingId, setEditingId] = useState<number | null>(null);
  const [updateForm, setUpdateForm] = useState({ is_cleared: false, severity: '' });

  const fetchDTC = () => {
    setLoading(true);
    dtcService
      .list({
        skip: page * PAGE_SIZE,
        limit: PAGE_SIZE,
        vehicle_id: vehicleFilter || undefined,
        diagnostic_id: diagnosticFilter ? Number(diagnosticFilter) : undefined,
      })
      .then(setData)
      .catch(() => sileo.error({ title: 'Error al cargar códigos DTC' }))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    fetchDTC();
  }, [page, vehicleFilter, diagnosticFilter]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    vehicleService.list({ limit: 200 }).then((r) => setVehicles(r.items)).catch(() => {});
  }, []);

  const filteredItems = data?.items.filter((d) => {
    if (search && !d.code.toLowerCase().includes(search.toLowerCase()) && !(d.description?.toLowerCase().includes(search.toLowerCase()))) {
      return false;
    }
    if (statusFilter === 'active' && d.is_cleared) return false;
    if (statusFilter === 'cleared' && !d.is_cleared) return false;
    return true;
  }) ?? [];

  const handleCreate = async () => {
    if (!form.code.trim()) {
      sileo.error({ title: 'El código DTC es obligatorio' });
      return;
    }
    if (!form.vehicle_id) {
      sileo.error({ title: 'Selecciona un vehículo' });
      return;
    }
    setSaving(true);
    try {
      await dtcService.create({
        vehicle_id: form.vehicle_id,
        code: form.code.trim(),
        description: form.description.trim() || undefined,
      });
      sileo.success({ title: 'Código DTC registrado' });
      setModalOpen(false);
      setForm({ code: '', description: '', vehicle_id: 0 });
      fetchDTC();
    } catch {
      sileo.error({ title: 'Error al registrar código DTC' });
    } finally {
      setSaving(false);
    }
  };

  const handleUpdate = async (id: number) => {
    const payload: Partial<DTCCode> = {};
    if (updateForm.is_cleared) payload.is_cleared = true;
    if (updateForm.severity) payload.severity = updateForm.severity;
    try {
      await dtcService.update(id, payload);
      sileo.success({ title: 'Código DTC actualizado' });
      setEditingId(null);
      setUpdateForm({ is_cleared: false, severity: '' });
      fetchDTC();
    } catch {
      sileo.error({ title: 'Error al actualizar código DTC' });
    }
  };

  const totalPages = data?.total_pages ?? 1;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Códigos DTC</h1>
          <p className="text-sm text-gray-600">Códigos de diagnóstico de fallas</p>
        </div>
        <button
          onClick={() => setModalOpen(true)}
          className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-indigo-600 to-violet-600 px-4 py-3 text-sm font-semibold text-white shadow-lg shadow-indigo-500/25 hover:from-indigo-500 hover:to-violet-500"
        >
          <Plus size={18} />
          Registrar DTC
        </button>
      </div>

      {/* Filters */}
      <div className="flex flex-col gap-3 sm:flex-row">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" size={18} />
          <input
            type="text"
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(0);
            }}
            placeholder="Buscar por código o descripción..."
            className="w-full rounded-xl border border-white/[0.06] bg-white/[0.02] py-2.5 pl-10 pr-4 text-sm text-white placeholder-gray-600 focus:border-indigo-500/50 focus:outline-none focus:ring-4 focus:ring-indigo-500/10"
          />
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
        <div className="sm:w-40">
          <select
            value={statusFilter}
            onChange={(e) => {
              setStatusFilter(e.target.value);
              setPage(0);
            }}
            className="w-full rounded-xl border border-white/[0.06] bg-white/[0.02] px-3 py-2.5 text-sm text-white focus:border-indigo-500/50 focus:outline-none focus:ring-4 focus:ring-indigo-500/10"
          >
            <option value="all">Todos</option>
            <option value="active">Activos</option>
            <option value="cleared">Corregidos</option>
          </select>
        </div>
        <div className="sm:w-36">
          <input
            type="text"
            value={diagnosticFilter}
            onChange={(e) => {
              setDiagnosticFilter(e.target.value);
              setPage(0);
            }}
            placeholder="Diag. ID"
            className="w-full rounded-xl border border-white/[0.06] bg-white/[0.02] py-2.5 px-3 text-sm text-white placeholder-gray-600 focus:border-indigo-500/50 focus:outline-none focus:ring-4 focus:ring-indigo-500/10"
          />
        </div>
      </div>

      {/* Table */}
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
              <th className="px-4 py-3 text-right">Acciones</th>
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
                  No se encontraron códigos DTC
                </td>
              </tr>
            ) : (
              filteredItems.map((d) => (
                <tr key={d.id} className="border-b border-white/[0.02] hover:bg-white/[0.01]">
                  <td className="px-4 py-3 font-mono text-orange-400 font-semibold">{d.code}</td>
                  <td className="px-4 py-3 text-gray-300 max-w-xs truncate">
                    {d.description || '—'}
                  </td>
                  <td className="px-4 py-3">{statusBadge(d.is_cleared)}</td>
                  <td className="px-4 py-3">
                    {d.severity ? (
                      <span className="text-xs text-gray-400 capitalize">{d.severity}</span>
                    ) : (
                      <span className="text-xs text-gray-600">—</span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-gray-400 text-xs">
                    {getVehicleLabel(d.vehicle_id, vehicles)}
                  </td>
                  <td className="px-4 py-3 text-gray-500 text-xs">
                    {new Date(d.created_at).toLocaleString()}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <button
                      onClick={() =>
                        setEditingId(editingId === d.id ? null : d.id)
                      }
                      className="rounded p-1.5 text-gray-400 transition-colors hover:bg-white/[0.04] hover:text-white"
                    >
                      <Filter size={16} />
                    </button>
                  </td>
                </tr>
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
              <h2 className="text-lg font-semibold">Registrar Código DTC</h2>
              <button
                onClick={() => setModalOpen(false)}
                className="rounded p-1 text-gray-400 hover:text-white"
              >
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
              </button>
            </div>
            <div className="space-y-4">
              <div>
                <label className="mb-1 block text-sm text-gray-400">Código *</label>
                <input
                  type="text"
                  value={form.code}
                  onChange={(e) => setForm({ ...form, code: e.target.value.toUpperCase() })}
                  placeholder="Ej: P0301"
                  className="w-full rounded-xl border border-white/[0.06] bg-white/[0.02] px-4 py-3 text-sm text-white font-mono placeholder-gray-700 focus:border-indigo-500/50 focus:outline-none focus:ring-4 focus:ring-indigo-500/10"
                />
              </div>
              <div>
                <label className="mb-1 block text-sm text-gray-400">Descripción</label>
                <textarea
                  value={form.description}
                  onChange={(e) => setForm({ ...form, description: e.target.value })}
                  rows={2}
                  placeholder="Descripción del código..."
                  className="w-full rounded-xl border border-white/[0.06] bg-white/[0.02] px-4 py-3 text-sm text-white placeholder-gray-700 focus:border-indigo-500/50 focus:outline-none focus:ring-4 focus:ring-indigo-500/10 resize-none"
                />
              </div>
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
                {saving ? 'Registrando...' : 'Registrar'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Update inline modal */}
      {editingId !== null && (() => {
        const d = data?.items.find((x) => x.id === editingId);
        if (!d) return null;
        return (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
            <div className="w-full max-w-sm rounded-2xl border border-white/[0.08] bg-[#0e0e1a] p-6 shadow-2xl">
              <div className="mb-4 flex items-center justify-between">
                <h2 className="text-lg font-semibold">Actualizar {d.code}</h2>
                <button
                  onClick={() => {
                    setEditingId(null);
                    setUpdateForm({ is_cleared: false, severity: '' });
                  }}
                  className="rounded p-1 text-gray-400 hover:text-white"
                >
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
                </button>
              </div>
              <div className="space-y-4">
                <label className="flex items-center gap-3 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={updateForm.is_cleared}
                    onChange={(e) => setUpdateForm({ ...updateForm, is_cleared: e.target.checked })}
                    className="h-4 w-4 rounded border-white/[0.06] bg-white/[0.02] text-indigo-600 focus:ring-indigo-500"
                  />
                  <span className="text-sm text-gray-300">Marcar como corregido</span>
                </label>
                <div>
                  <label className="mb-1 block text-sm text-gray-400">Severidad</label>
                  <select
                    value={updateForm.severity}
                    onChange={(e) => setUpdateForm({ ...updateForm, severity: e.target.value })}
                    className="w-full rounded-xl border border-white/[0.06] bg-white/[0.02] px-3 py-2.5 text-sm text-white focus:border-indigo-500/50 focus:outline-none focus:ring-4 focus:ring-indigo-500/10"
                  >
                    <option value="">Sin cambios</option>
                    <option value="low">Baja</option>
                    <option value="medium">Media</option>
                    <option value="high">Alta</option>
                    <option value="critical">Crítica</option>
                  </select>
                </div>
              </div>
              <div className="mt-6 flex justify-end gap-3">
                <button
                  onClick={() => {
                    setEditingId(null);
                    setUpdateForm({ is_cleared: false, severity: '' });
                  }}
                  className="rounded-xl border border-white/[0.06] bg-white/[0.02] px-4 py-3 text-sm text-gray-300 hover:bg-white/[0.04]"
                >
                  Cancelar
                </button>
                <button
                  onClick={() => handleUpdate(d.id)}
                  className="rounded-xl bg-gradient-to-r from-indigo-600 to-violet-600 px-4 py-3 text-sm font-semibold text-white shadow-lg shadow-indigo-500/25 hover:from-indigo-500 hover:to-violet-500"
                >
                  Actualizar
                </button>
              </div>
            </div>
          </div>
        );
      })()}
    </div>
  );
}
