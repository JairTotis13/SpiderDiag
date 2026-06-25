import { useState, useEffect } from 'react';
import { FileText, Download, Plus, RefreshCw } from 'lucide-react';
import { sileo } from 'sileo';
import { reportService, diagnosticService } from '@/services/dataService';
import type { Report, Diagnostic, PaginatedResponse } from '@/types';

const PAGE_SIZE = 15;

const getVehicleLabel = (d: Diagnostic) =>
  d.vehicle ? `${d.vehicle.brand} ${d.vehicle.model}` : `Vehículo #${d.vehicle_id}`;

export default function ReportsPage() {
  const [data, setData] = useState<PaginatedResponse<Report> | null>(null);
  const [diagnostics, setDiagnostics] = useState<Diagnostic[]>([]);
  const [page, setPage] = useState(0);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    diagnostic_id: 0,
    shop_name: '',
    shop_address: '',
    shop_phone: '',
    recommendations: '',
  });

  const fetchReports = () => {
    setLoading(true);
    reportService
      .list({ skip: page * PAGE_SIZE, limit: PAGE_SIZE })
      .then(setData)
      .catch(() => sileo.error({ title: 'Error al cargar reportes' }))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    fetchReports();
  }, [page]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    diagnosticService
      .list({ limit: 200 })
      .then((r) => setDiagnostics(r.items))
      .catch(() => {});
  }, []);

  const handleGenerate = async () => {
    if (!form.diagnostic_id) {
      sileo.error({ title: 'Selecciona un diagnóstico' });
      return;
    }
    setSaving(true);
    try {
      await reportService.generate({
        diagnostic_id: form.diagnostic_id,
        report_type: 'full',
        recommendations: form.recommendations || undefined,
      });
      sileo.success({ title: 'Reporte generado exitosamente' });
      setModalOpen(false);
      setForm({ diagnostic_id: 0, shop_name: '', shop_address: '', shop_phone: '', recommendations: '' });
      fetchReports();
    } catch {
      sileo.error({ title: 'Error al generar reporte' });
    } finally {
      setSaving(false);
    }
  };

  const handleDownload = (reportId: number) => {
    window.open(reportService.downloadUrl(reportId), '_blank');
  };

  const getDiagnosticLabel = (diagnosticId: number) => {
    const d = diagnostics.find((x) => x.id === diagnosticId);
    if (d) return getVehicleLabel(d);
    return `Diagnóstico #${diagnosticId}`;
  };

  const totalPages = data?.total_pages ?? 1;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Reportes</h1>
          <p className="text-sm text-gray-600">Reportes de diagnóstico generados</p>
        </div>
        <button
          onClick={() => setModalOpen(true)}
          className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-indigo-600 to-violet-600 px-4 py-3 text-sm font-semibold text-white shadow-lg shadow-indigo-500/25 hover:from-indigo-500 hover:to-violet-500"
        >
          <Plus size={18} />
          Generar Reporte
        </button>
      </div>

      {/* Table */}
      <div className="overflow-x-auto rounded-2xl border border-white/[0.06] bg-[#0e0e1a]">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-white/[0.04] text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              <th className="px-4 py-3">Diagnóstico</th>
              <th className="px-4 py-3">Vehículo</th>
              <th className="px-4 py-3">Tipo</th>
              <th className="px-4 py-3">Generado</th>
              <th className="px-4 py-3 text-right">Acciones</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={5} className="px-4 py-8 text-center text-gray-500">
                  Cargando...
                </td>
              </tr>
            ) : data && data.items.length === 0 ? (
              <tr>
                <td colSpan={5} className="px-4 py-8 text-center text-gray-500">
                  No se encontraron reportes
                </td>
              </tr>
            ) : (
              data?.items.map((r) => (
                <tr key={r.id} className="border-b border-white/[0.02] hover:bg-white/[0.01]">
                  <td className="px-4 py-3 font-mono text-xs text-gray-400">
                    #{r.diagnostic_id}
                  </td>
                  <td className="px-4 py-3 font-medium">
                    {diagnostics.length > 0 ? getDiagnosticLabel(r.diagnostic_id) : `Vehículo #${r.vehicle_id}`}
                  </td>
                  <td className="px-4 py-3">
                    <span className="inline-flex rounded-full bg-indigo-500/10 text-indigo-400 ring-1 ring-inset ring-indigo-500/20 px-2.5 py-0.5 text-xs font-medium capitalize">
                      {r.report_type}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-gray-400 text-xs">
                    {r.generated_at ? new Date(r.generated_at).toLocaleString() : '—'}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <div className="inline-flex gap-1">
                      {r.pdf_path && (
                        <button
                          onClick={() => handleDownload(r.id)}
                          className="inline-flex items-center gap-1 rounded-xl border border-white/[0.06] bg-white/[0.02] px-3 py-1.5 text-xs text-gray-300 hover:bg-white/[0.04]"
                        >
                          <Download size={14} />
                          PDF
                        </button>
                      )}
                      <button
                        onClick={() => {
                          setForm((f) => ({ ...f, diagnostic_id: r.diagnostic_id }));
                          setModalOpen(true);
                        }}
                        className="inline-flex items-center gap-1 rounded-xl px-3 py-1.5 text-xs text-indigo-400 hover:bg-indigo-500/10"
                      >
                        <RefreshCw size={14} />
                        Nuevo
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

      {/* Generate Modal */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
          <div className="w-full max-w-md rounded-2xl border border-white/[0.08] bg-[#0e0e1a] p-6 shadow-2xl">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-lg font-semibold">Generar Reporte</h2>
              <button
                onClick={() => setModalOpen(false)}
                className="rounded p-1 text-gray-400 hover:text-white"
              >
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
              </button>
            </div>
            <div className="space-y-4">
              <div>
                <label className="mb-1 block text-sm text-gray-400">Diagnóstico *</label>
                <select
                  value={form.diagnostic_id || ''}
                  onChange={(e) => setForm({ ...form, diagnostic_id: Number(e.target.value) })}
                  className="w-full rounded-xl border border-white/[0.06] bg-white/[0.02] px-3 py-2.5 text-sm text-white focus:border-indigo-500/50 focus:outline-none focus:ring-4 focus:ring-indigo-500/10"
                >
                  <option value="">Seleccionar diagnóstico...</option>
                  {diagnostics.map((d) => (
                    <option key={d.id} value={d.id}>
                      #{d.id} — {getVehicleLabel(d)}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="mb-1 block text-sm text-gray-400">Taller</label>
                <input
                  type="text"
                  value={form.shop_name}
                  onChange={(e) => setForm({ ...form, shop_name: e.target.value })}
                  placeholder="Nombre del taller"
                  className="w-full rounded-xl border border-white/[0.06] bg-white/[0.02] px-4 py-3 text-sm text-white placeholder-gray-700 focus:border-indigo-500/50 focus:outline-none focus:ring-4 focus:ring-indigo-500/10"
                />
              </div>
              <div>
                <label className="mb-1 block text-sm text-gray-400">Dirección</label>
                <input
                  type="text"
                  value={form.shop_address}
                  onChange={(e) => setForm({ ...form, shop_address: e.target.value })}
                  placeholder="Dirección del taller"
                  className="w-full rounded-xl border border-white/[0.06] bg-white/[0.02] px-4 py-3 text-sm text-white placeholder-gray-700 focus:border-indigo-500/50 focus:outline-none focus:ring-4 focus:ring-indigo-500/10"
                />
              </div>
              <div>
                <label className="mb-1 block text-sm text-gray-400">Teléfono</label>
                <input
                  type="text"
                  value={form.shop_phone}
                  onChange={(e) => setForm({ ...form, shop_phone: e.target.value })}
                  placeholder="Teléfono de contacto"
                  className="w-full rounded-xl border border-white/[0.06] bg-white/[0.02] px-4 py-3 text-sm text-white placeholder-gray-700 focus:border-indigo-500/50 focus:outline-none focus:ring-4 focus:ring-indigo-500/10"
                />
              </div>
              <div>
                <label className="mb-1 block text-sm text-gray-400">Recomendaciones</label>
                <textarea
                  value={form.recommendations}
                  onChange={(e) => setForm({ ...form, recommendations: e.target.value })}
                  rows={4}
                  placeholder="Recomendaciones para el reporte..."
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
                onClick={handleGenerate}
                disabled={saving}
                className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-indigo-600 to-violet-600 px-4 py-3 text-sm font-semibold text-white shadow-lg shadow-indigo-500/25 hover:from-indigo-500 hover:to-violet-500 disabled:opacity-50"
              >
                <FileText size={16} />
                {saving ? 'Generando...' : 'Generar'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
