import { useState, useEffect } from 'react';
import { Search, Plus, Edit, Trash2, X, Car } from 'lucide-react';
import { sileo } from 'sileo';
import { vehicleService, clientService } from '@/services/dataService';
import type { Vehicle, VehicleForm, Client, PaginatedResponse } from '@/types';

const PAGE_SIZE = 15;

const emptyForm: VehicleForm = {
  client_id: 0,
  brand: '',
  model: '',
  year: new Date().getFullYear(),
  vin: '',
  license_plate: '',
  mileage: 0,
  fuel_type: '',
  observations: '',
};

export default function VehiclesPage() {
  const [data, setData] = useState<PaginatedResponse<Vehicle> | null>(null);
  const [clients, setClients] = useState<Client[]>([]);
  const [search, setSearch] = useState('');
  const [clientFilter, setClientFilter] = useState<number | ''>('');
  const [page, setPage] = useState(0);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [form, setForm] = useState<VehicleForm>(emptyForm);
  const [saving, setSaving] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState<number | null>(null);

  const fetchVehicles = () => {
    setLoading(true);
    vehicleService
      .list({
        skip: page * PAGE_SIZE,
        limit: PAGE_SIZE,
        search: search || undefined,
        client_id: clientFilter || undefined,
      })
      .then(setData)
      .catch(() => sileo.error({ title: 'Error al cargar vehículos' }))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    fetchVehicles();
  }, [page, search, clientFilter]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    clientService.list({ limit: 200 }).then((r) => setClients(r.items)).catch(() => {});
  }, []);

  const openCreate = () => {
    setEditingId(null);
    setForm(emptyForm);
    setModalOpen(true);
  };

  const openEdit = (vehicle: Vehicle) => {
    setEditingId(vehicle.id);
    setForm({
      client_id: vehicle.client_id,
      brand: vehicle.brand,
      model: vehicle.model,
      year: vehicle.year,
      vin: vehicle.vin ?? '',
      license_plate: vehicle.license_plate ?? '',
      mileage: vehicle.mileage ?? 0,
      fuel_type: vehicle.fuel_type ?? '',
      observations: vehicle.observations ?? '',
    });
    setModalOpen(true);
  };

  const handleSave = async () => {
    if (!form.client_id) {
      sileo.error({ title: 'Selecciona un cliente' });
      return;
    }
    if (!form.brand.trim() || !form.model.trim()) {
      sileo.error({ title: 'Marca y modelo son obligatorios' });
      return;
    }
    setSaving(true);
    try {
      if (editingId) {
        await vehicleService.update(editingId, form);
        sileo.success({ title: 'Vehículo actualizado' });
      } else {
        await vehicleService.create(form);
        sileo.success({ title: 'Vehículo creado' });
      }
      setModalOpen(false);
      fetchVehicles();
    } catch {
      sileo.error({ title: 'Error al guardar vehículo' });
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: number) => {
    try {
      await vehicleService.delete(id);
      sileo.success({ title: 'Vehículo eliminado' });
      setDeleteConfirm(null);
      fetchVehicles();
    } catch (e: any) {
      sileo.error({ title: e.response?.data?.detail || 'Error al eliminar vehículo' });
    }
  };

  const totalPages = data?.total_pages ?? 1;

  const getClientName = (clientId: number) => {
    return clients.find((c) => c.id === clientId)?.full_name ?? '—';
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Vehículos</h1>
          <p className="text-sm text-gray-600">Gestión de vehículos registrados</p>
        </div>
        <button
          onClick={openCreate}
          className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-indigo-600 to-violet-600 px-4 py-3 text-sm font-semibold text-white shadow-lg shadow-indigo-500/25 hover:from-indigo-500 hover:to-violet-500"
        >
          <Plus size={18} />
          Nuevo Vehículo
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
            placeholder="Buscar por marca, modelo, placa o VIN..."
            className="w-full rounded-xl border border-white/[0.06] bg-white/[0.02] py-2.5 pl-10 pr-4 text-sm text-white placeholder-gray-600 focus:border-indigo-500/50 focus:outline-none focus:ring-4 focus:ring-indigo-500/10"
          />
        </div>
        <div className="sm:w-64">
          <select
            value={clientFilter}
            onChange={(e) => {
              setClientFilter(e.target.value ? Number(e.target.value) : '');
              setPage(0);
            }}
            className="w-full rounded-xl border border-white/[0.06] bg-white/[0.02] px-3 py-2.5 text-sm text-white focus:border-indigo-500/50 focus:outline-none focus:ring-4 focus:ring-indigo-500/10"
          >
            <option value="">Todos los clientes</option>
            {clients.map((c) => (
              <option key={c.id} value={c.id}>
                {c.full_name}
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
              <th className="px-4 py-3">Marca</th>
              <th className="px-4 py-3">Modelo</th>
              <th className="px-4 py-3">Año</th>
              <th className="px-4 py-3">Placa</th>
              <th className="px-4 py-3">VIN</th>
              <th className="px-4 py-3 text-right">Acciones</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={6} className="px-4 py-8 text-center text-gray-500">
                  Cargando...
                </td>
              </tr>
            ) : data && data.items.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-4 py-8 text-center text-gray-500">
                  No se encontraron vehículos
                </td>
              </tr>
            ) : (
              data?.items.map((vehicle) => (
                <tr key={vehicle.id} className="border-b border-white/[0.02] hover:bg-white/[0.01]">
                  <td className="px-4 py-3 font-medium">{vehicle.brand}</td>
                  <td className="px-4 py-3">{vehicle.model}</td>
                  <td className="px-4 py-3 text-gray-400">{vehicle.year}</td>
                  <td className="px-4 py-3 font-mono text-gray-400">
                    {vehicle.license_plate || '—'}
                  </td>
                  <td className="px-4 py-3 font-mono text-xs text-gray-500">
                    {vehicle.vin || '—'}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <div className="inline-flex gap-1">
                      <button
                        onClick={() => openEdit(vehicle)}
                        className="rounded p-1.5 text-gray-400 transition-colors hover:bg-white/[0.04] hover:text-white"
                      >
                        <Edit size={16} />
                      </button>
                      <button
                        onClick={() => setDeleteConfirm(vehicle.id)}
                        className="rounded p-1.5 text-gray-400 transition-colors hover:bg-white/[0.04] hover:text-red-400"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
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

      {/* Modal */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
          <div className="w-full max-w-lg rounded-2xl border border-white/[0.08] bg-[#0e0e1a] p-6 shadow-2xl">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-lg font-semibold">
                {editingId ? 'Editar Vehículo' : 'Nuevo Vehículo'}
              </h2>
              <button
                onClick={() => setModalOpen(false)}
                className="rounded p-1 text-gray-400 hover:text-white"
              >
                <X size={20} />
              </button>
            </div>

            <div className="space-y-4">
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
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="mb-1 block text-sm text-gray-400">Marca *</label>
                  <input
                    type="text"
                    value={form.brand}
                    onChange={(e) => setForm({ ...form, brand: e.target.value })}
                    className="w-full rounded-xl border border-white/[0.06] bg-white/[0.02] px-4 py-3 text-sm text-white placeholder-gray-700 focus:border-indigo-500/50 focus:outline-none focus:ring-4 focus:ring-indigo-500/10"
                    placeholder="Ej: Toyota"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-sm text-gray-400">Modelo *</label>
                  <input
                    type="text"
                    value={form.model}
                    onChange={(e) => setForm({ ...form, model: e.target.value })}
                    className="w-full rounded-xl border border-white/[0.06] bg-white/[0.02] px-4 py-3 text-sm text-white placeholder-gray-700 focus:border-indigo-500/50 focus:outline-none focus:ring-4 focus:ring-indigo-500/10"
                    placeholder="Ej: Corolla"
                  />
                </div>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="mb-1 block text-sm text-gray-400">Año</label>
                  <input
                    type="number"
                    value={form.year}
                    onChange={(e) => setForm({ ...form, year: Number(e.target.value) })}
                    className="w-full rounded-xl border border-white/[0.06] bg-white/[0.02] px-4 py-3 text-sm text-white placeholder-gray-700 focus:border-indigo-500/50 focus:outline-none focus:ring-4 focus:ring-indigo-500/10"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-sm text-gray-400">
                    Combustible
                  </label>
                  <select
                    value={form.fuel_type}
                    onChange={(e) => setForm({ ...form, fuel_type: e.target.value })}
                    className="w-full rounded-xl border border-white/[0.06] bg-white/[0.02] px-3 py-2.5 text-sm text-white focus:border-indigo-500/50 focus:outline-none focus:ring-4 focus:ring-indigo-500/10"
                  >
                    <option value="">Seleccionar...</option>
                    <option value="gasoline">Gasolina</option>
                    <option value="diesel">Diésel</option>
                    <option value="electric">Eléctrico</option>
                    <option value="hybrid">Híbrido</option>
                    <option value="flex">Flex</option>
                    <option value="other">Otro</option>
                  </select>
                </div>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="mb-1 block text-sm text-gray-400">Placa</label>
                  <input
                    type="text"
                    value={form.license_plate}
                    onChange={(e) => setForm({ ...form, license_plate: e.target.value })}
                    className="w-full rounded-xl border border-white/[0.06] bg-white/[0.02] px-4 py-3 text-sm text-white placeholder-gray-700 focus:border-indigo-500/50 focus:outline-none focus:ring-4 focus:ring-indigo-500/10"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-sm text-gray-400">Kilometraje</label>
                  <input
                    type="number"
                    value={form.mileage}
                    onChange={(e) => setForm({ ...form, mileage: Number(e.target.value) })}
                    className="w-full rounded-xl border border-white/[0.06] bg-white/[0.02] px-4 py-3 text-sm text-white placeholder-gray-700 focus:border-indigo-500/50 focus:outline-none focus:ring-4 focus:ring-indigo-500/10"
                  />
                </div>
              </div>
              <div>
                <label className="mb-1 block text-sm text-gray-400">VIN</label>
                <input
                  type="text"
                  value={form.vin}
                  onChange={(e) => setForm({ ...form, vin: e.target.value })}
                  className="w-full rounded-xl border border-white/[0.06] bg-white/[0.02] px-4 py-3 text-sm text-white font-mono placeholder-gray-700 focus:border-indigo-500/50 focus:outline-none focus:ring-4 focus:ring-indigo-500/10"
                  placeholder="Ej: 1HGBH41JXMN109186"
                />
              </div>
              <div>
                <label className="mb-1 block text-sm text-gray-400">Observaciones</label>
                <textarea
                  value={form.observations}
                  onChange={(e) => setForm({ ...form, observations: e.target.value })}
                  rows={3}
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
                onClick={handleSave}
                disabled={saving}
                className="rounded-xl bg-gradient-to-r from-indigo-600 to-violet-600 px-4 py-3 text-sm font-semibold text-white shadow-lg shadow-indigo-500/25 hover:from-indigo-500 hover:to-violet-500 disabled:opacity-50"
              >
                {saving ? 'Guardando...' : 'Guardar'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete confirmation */}
      {deleteConfirm !== null && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
          <div className="w-full max-w-sm rounded-2xl border border-white/[0.08] bg-[#0e0e1a] p-6 shadow-2xl">
            <h2 className="text-lg font-semibold">Eliminar Vehículo</h2>
            <p className="mt-2 text-sm text-gray-400">
              ¿Estás seguro de eliminar este vehículo? Esta acción no se puede deshacer.
            </p>
            <div className="mt-6 flex justify-end gap-3">
              <button
                onClick={() => setDeleteConfirm(null)}
                className="rounded-xl border border-white/[0.06] bg-white/[0.02] px-4 py-3 text-sm text-gray-300 hover:bg-white/[0.04]"
              >
                Cancelar
              </button>
              <button
                onClick={() => handleDelete(deleteConfirm)}
                className="rounded-xl bg-red-500 px-4 py-3 text-sm font-semibold text-white hover:bg-red-600"
              >
                Eliminar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
