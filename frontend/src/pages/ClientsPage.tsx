import { useState, useEffect } from 'react';
import { Search, Plus, Edit, Trash2, X } from 'lucide-react';
import { sileo } from 'sileo';
import { clientService } from '@/services/dataService';
import type { Client, ClientForm, PaginatedResponse } from '@/types';

const PAGE_SIZE = 15;

const emptyForm: ClientForm = {
  full_name: '',
  phone: '',
  email: '',
  address: '',
  notes: '',
};

export default function ClientsPage() {
  const [data, setData] = useState<PaginatedResponse<Client> | null>(null);
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(0);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [form, setForm] = useState<ClientForm>(emptyForm);
  const [saving, setSaving] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState<number | null>(null);

  const fetchClients = () => {
    setLoading(true);
    clientService
      .list({ skip: page * PAGE_SIZE, limit: PAGE_SIZE, search: search || undefined })
      .then(setData)
      .catch(() => sileo.error({ title: 'Error al cargar clientes' }))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    fetchClients();
  }, [page, search]); // eslint-disable-line react-hooks/exhaustive-deps

  const openCreate = () => {
    setEditingId(null);
    setForm(emptyForm);
    setModalOpen(true);
  };

  const openEdit = (client: Client) => {
    setEditingId(client.id);
    setForm({
      full_name: client.full_name,
      phone: client.phone ?? '',
      email: client.email ?? '',
      address: client.address ?? '',
      notes: client.notes ?? '',
    });
    setModalOpen(true);
  };

  const handleSave = async () => {
    if (!form.full_name.trim()) {
      sileo.error({ title: 'El nombre es obligatorio' });
      return;
    }
    setSaving(true);
    try {
      if (editingId) {
        await clientService.update(editingId, form);
        sileo.success({ title: 'Cliente actualizado' });
      } else {
        await clientService.create(form);
        sileo.success({ title: 'Cliente creado' });
      }
      setModalOpen(false);
      fetchClients();
    } catch {
      sileo.error({ title: 'Error al guardar cliente' });
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: number) => {
    try {
      await clientService.delete(id);
      sileo.success({ title: 'Cliente eliminado' });
      setDeleteConfirm(null);
      fetchClients();
    } catch (e: any) {
      sileo.error({ title: e.response?.data?.detail || 'Error al eliminar cliente' });
    }
  };

  const totalPages = data?.total_pages ?? 1;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Clientes</h1>
          <p className="text-sm text-gray-600">Gestión de clientes del taller</p>
        </div>
        <button
          onClick={openCreate}
          className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-indigo-600 to-violet-600 px-4 py-3 text-sm font-semibold text-white shadow-lg shadow-indigo-500/25 hover:from-indigo-500 hover:to-violet-500"
        >
          <Plus size={18} />
          Nuevo Cliente
        </button>
      </div>

      {/* Search bar */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" size={18} />
        <input
          type="text"
          value={search}
          onChange={(e) => {
            setSearch(e.target.value);
            setPage(0);
          }}
          placeholder="Buscar por nombre, email o teléfono..."
          className="w-full rounded-xl border border-white/[0.06] bg-white/[0.02] py-2.5 pl-10 pr-4 text-sm text-white placeholder-gray-600 focus:border-indigo-500/50 focus:outline-none focus:ring-4 focus:ring-indigo-500/10"
        />
      </div>

      {/* Table */}
      <div className="overflow-x-auto rounded-2xl border border-white/[0.06] bg-[#0e0e1a]">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-white/[0.04] text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              <th className="px-4 py-3">Nombre</th>
              <th className="px-4 py-3">Teléfono</th>
              <th className="px-4 py-3">Email</th>
              <th className="px-4 py-3 text-right">Acciones</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={4} className="px-4 py-8 text-center text-gray-500">
                  Cargando...
                </td>
              </tr>
            ) : data && data.items.length === 0 ? (
              <tr>
                <td colSpan={4} className="px-4 py-8 text-center text-gray-500">
                  No se encontraron clientes
                </td>
              </tr>
            ) : (
              data?.items.map((client) => (
                <tr key={client.id} className="border-b border-white/[0.02] hover:bg-white/[0.01]">
                  <td className="px-4 py-3 font-medium">{client.full_name}</td>
                  <td className="px-4 py-3 text-gray-400">{client.phone || '—'}</td>
                  <td className="px-4 py-3 text-gray-400">{client.email || '—'}</td>
                  <td className="px-4 py-3 text-right">
                    <div className="inline-flex gap-1">
                      <button
                        onClick={() => openEdit(client)}
                        className="rounded p-1.5 text-gray-400 transition-colors hover:bg-white/[0.04] hover:text-white"
                      >
                        <Edit size={16} />
                      </button>
                      <button
                        onClick={() => setDeleteConfirm(client.id)}
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
                {editingId ? 'Editar Cliente' : 'Nuevo Cliente'}
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
                <label className="mb-1 block text-sm text-gray-400">Nombre completo *</label>
                <input
                  type="text"
                  value={form.full_name}
                  onChange={(e) => setForm({ ...form, full_name: e.target.value })}
                  className="w-full rounded-xl border border-white/[0.06] bg-white/[0.02] px-4 py-3 text-sm text-white placeholder-gray-700 focus:border-indigo-500/50 focus:outline-none focus:ring-4 focus:ring-indigo-500/10"
                />
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="mb-1 block text-sm text-gray-400">Teléfono</label>
                  <input
                    type="text"
                    value={form.phone}
                    onChange={(e) => setForm({ ...form, phone: e.target.value })}
                    className="w-full rounded-xl border border-white/[0.06] bg-white/[0.02] px-4 py-3 text-sm text-white placeholder-gray-700 focus:border-indigo-500/50 focus:outline-none focus:ring-4 focus:ring-indigo-500/10"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-sm text-gray-400">Email</label>
                  <input
                    type="email"
                    value={form.email}
                    onChange={(e) => setForm({ ...form, email: e.target.value })}
                    className="w-full rounded-xl border border-white/[0.06] bg-white/[0.02] px-4 py-3 text-sm text-white placeholder-gray-700 focus:border-indigo-500/50 focus:outline-none focus:ring-4 focus:ring-indigo-500/10"
                  />
                </div>
              </div>
              <div>
                <label className="mb-1 block text-sm text-gray-400">Dirección</label>
                <input
                  type="text"
                  value={form.address}
                  onChange={(e) => setForm({ ...form, address: e.target.value })}
                  className="w-full rounded-xl border border-white/[0.06] bg-white/[0.02] px-4 py-3 text-sm text-white placeholder-gray-700 focus:border-indigo-500/50 focus:outline-none focus:ring-4 focus:ring-indigo-500/10"
                />
              </div>
              <div>
                <label className="mb-1 block text-sm text-gray-400">Notas</label>
                <textarea
                  value={form.notes}
                  onChange={(e) => setForm({ ...form, notes: e.target.value })}
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
            <h2 className="text-lg font-semibold">Eliminar Cliente</h2>
            <p className="mt-2 text-sm text-gray-400">
              ¿Estás seguro de eliminar este cliente? Esta acción no se puede deshacer.
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
