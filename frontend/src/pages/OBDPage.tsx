import { useState, useEffect, useCallback } from 'react';
import { Wrench, Plug, PlugZap, Download, Trash2, RefreshCw } from 'lucide-react';
import { obdService } from '@/services/dataService';
import { clientService, vehicleService } from '@/services/dataService';
import { useOBDWebSocket } from '@/hooks/useOBDWebSocket';
import { StatCard } from '@/components/common/StatCard';
import { Gauge, Thermometer, BatteryCharging, Car, Activity } from 'lucide-react';
import { sileo } from 'sileo';
import type { Client, Vehicle, OBDStatus, LiveReading } from '@/types';

export default function OBDPage() {
  const [status, setStatus] = useState<OBDStatus | null>(null);
  const [clients, setClients] = useState<Client[]>([]);
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [selectedClient, setSelectedClient] = useState<number | ''>('');
  const [selectedVehicle, setSelectedVehicle] = useState<number | ''>('');
  const [connecting, setConnecting] = useState(false);
  const [diagnosticId, setDiagnosticId] = useState<number | null>(null);
  const [dtcCodes, setDtcCodes] = useState<unknown[]>([]);
  const [readingDTC, setReadingDTC] = useState(false);
  const [clearingDTC, setClearingDTC] = useState(false);

  const { isConnected, latestData } = useOBDWebSocket(diagnosticId);

  const fetchStatus = useCallback(async () => {
    try {
      const s = await obdService.getStatus();
      setStatus(s);
    } catch {
      // ignore
    }
  }, []);

  useEffect(() => {
    fetchStatus();
    clientService.list({ limit: 200 }).then((r) => setClients(r.items));

    const interval = setInterval(fetchStatus, 5000);
    return () => clearInterval(interval);
  }, [fetchStatus]);

  useEffect(() => {
    if (selectedClient) {
      vehicleService.list({ client_id: Number(selectedClient), limit: 100 }).then((r) =>
        setVehicles(r.items)
      );
    } else {
      setVehicles([]);
    }
  }, [selectedClient]);

  const handleConnect = async () => {
    if (!selectedVehicle || !selectedClient) {
      sileo.error({ title: 'Selecciona un cliente y vehículo' });
      return;
    }
    setConnecting(true);
    try {
      const result = await obdService.connect({
        vehicle_id: Number(selectedVehicle),
        client_id: Number(selectedClient),
      });
      setDiagnosticId(result.data.diagnostic_id);
      sileo.success({ title: 'Conectado al vehículo' });
      fetchStatus();
    } catch (e: any) {
      sileo.error({ title: e.response?.data?.detail || 'Error al conectar OBD-II' });
    } finally {
      setConnecting(false);
    }
  };

  const handleDisconnect = async () => {
    try {
      await obdService.disconnect();
      setDiagnosticId(null);
      sileo.success({ title: 'Desconectado' });
      fetchStatus();
    } catch {
      sileo.error({ title: 'Error al desconectar' });
    }
  };

  const handleReadDTC = async () => {
    setReadingDTC(true);
    try {
      const result = await obdService.readDTC();
      setDtcCodes(result.data.codes || []);
      sileo.success({ title: `Encontrados ${result.data.codes?.length || 0} códigos DTC` });
    } catch {
      sileo.error({ title: 'Error al leer códigos DTC' });
    } finally {
      setReadingDTC(false);
    }
  };

  const handleClearDTC = async () => {
    setClearingDTC(true);
    try {
      const result = await obdService.clearDTC();
      if (result.data.success) {
        sileo.success({ title: 'Códigos DTC borrados correctamente' });
        setDtcCodes([]);
      } else {
        sileo.error({ title: 'No se pudieron borrar los códigos' });
      }
    } catch {
      sileo.error({ title: 'Error al borrar códigos DTC' });
    } finally {
      setClearingDTC(false);
    }
  };

  const r = latestData;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-white">Diagnóstico OBD-II</h1>
        <p className="text-sm text-gray-600">Conexión y monitoreo del vehículo</p>
      </div>

      {/* Connection Panel */}
      <div className="rounded-2xl border border-white/[0.06] bg-[#0e0e1a] p-5">
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-semibold">Panel de Conexión</h2>
          <span
            className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-medium ${
              isConnected
                ? 'bg-emerald-500/10 text-emerald-400 ring-1 ring-inset ring-emerald-500/20'
                : 'bg-gray-500/10 text-gray-500 ring-1 ring-inset ring-gray-500/20'
            }`}
          >
            <span
              className={`h-2 w-2 rounded-full ${
                isConnected ? 'bg-emerald-500 animate-pulse' : 'bg-gray-600'
              }`}
            />
            {isConnected ? 'Conectado' : 'Desconectado'}
          </span>
        </div>

        {status && (
          <div className="mb-4 grid grid-cols-1 gap-3 text-sm min-[400px]:grid-cols-2 sm:grid-cols-4">
            <div className="rounded-xl bg-white/[0.02] p-3">
              <p className="text-gray-500">Puerto</p>
              <p className="font-mono font-medium">{status.port || '—'}</p>
            </div>
            <div className="rounded-xl bg-white/[0.02] p-3">
              <p className="text-gray-500">Protocolo</p>
              <p className="font-mono font-medium">{status.protocol || '—'}</p>
            </div>
            <div className="rounded-xl bg-white/[0.02] p-3">
              <p className="text-gray-500">Comandos</p>
              <p className="font-mono font-medium">{status.supported_commands?.length || 0}</p>
            </div>
            <div className="rounded-xl bg-white/[0.02] p-3">
              <p className="text-gray-500">Estado</p>
              <p className="font-mono font-medium">
                {status.connected ? 'OK' : 'Offline'}
              </p>
            </div>
          </div>
        )}

        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label className="mb-1 block text-sm text-gray-400">Cliente</label>
            <select
              value={selectedClient}
              onChange={(e) => {
                setSelectedClient(Number(e.target.value));
                setSelectedVehicle('');
              }}
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
            <label className="mb-1 block text-sm text-gray-400">Vehículo</label>
            <select
              value={selectedVehicle}
              onChange={(e) => setSelectedVehicle(Number(e.target.value))}
              className="w-full rounded-xl border border-white/[0.06] bg-white/[0.02] px-3 py-2.5 text-sm text-white focus:border-indigo-500/50 focus:outline-none focus:ring-4 focus:ring-indigo-500/10"
              disabled={!selectedClient}
            >
              <option value="">Seleccionar vehículo...</option>
              {vehicles.map((v) => (
                <option key={v.id} value={v.id}>
                  {v.brand} {v.model} ({v.year}) {v.license_plate && ` - ${v.license_plate}`}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="mt-6 flex flex-wrap gap-3">
          {!isConnected ? (
            <button
              onClick={handleConnect}
              disabled={connecting || !selectedVehicle}
              className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-emerald-600 to-green-600 px-5 py-3 text-sm font-semibold text-white shadow-lg shadow-emerald-500/25 hover:from-emerald-500 hover:to-green-500 disabled:opacity-50"
            >
              <Plug size={18} />
              {connecting ? 'Conectando...' : 'Conectar'}
            </button>
          ) : (
            <button
              onClick={handleDisconnect}
              className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-red-600 to-rose-600 px-5 py-3 text-sm font-semibold text-white shadow-lg shadow-red-500/25 hover:from-red-500 hover:to-rose-500"
            >
              <PlugZap size={18} />
              Desconectar
            </button>
          )}

          {isConnected && (
            <>
              <button
                onClick={handleReadDTC}
                disabled={readingDTC}
                className="inline-flex items-center gap-2 rounded-xl border border-white/[0.06] bg-white/[0.02] px-4 py-3 text-sm text-gray-300 hover:bg-white/[0.04] disabled:opacity-50"
              >
                <RefreshCw size={16} className={readingDTC ? 'animate-spin' : ''} />
                Leer DTC
              </button>
              <button
                onClick={handleClearDTC}
                disabled={clearingDTC}
                className="inline-flex items-center gap-2 rounded-xl border border-white/[0.06] bg-white/[0.02] px-4 py-3 text-sm text-orange-400 hover:bg-white/[0.04] disabled:opacity-50"
              >
                <Trash2 size={16} />
                Borrar DTC
              </button>
            </>
          )}
        </div>
      </div>

      {/* Live Readings */}
      {isConnected && (
        <>
          <h2 className="font-semibold text-lg">Lecturas en Vivo</h2>
          <div className="grid grid-cols-1 gap-4 min-[400px]:grid-cols-2 sm:grid-cols-4">
            <StatCard
              title="RPM"
              value={r?.rpm?.toFixed(0) ?? '--'}
              icon={<Gauge size={20} />}
              color="primary"
              unit="rpm"
            />
            <StatCard
              title="Velocidad"
              value={r?.speed?.toFixed(0) ?? '--'}
              icon={<Car size={20} />}
              color="blue"
              unit="km/h"
            />
            <StatCard
              title="Temp. Motor"
              value={r?.engine_temp?.toFixed(1) ?? '--'}
              icon={<Thermometer size={20} />}
              color={r?.engine_temp && r.engine_temp > 105 ? 'red' : 'green'}
              unit="°C"
            />
            <StatCard
              title="Voltaje"
              value={r?.voltage?.toFixed(1) ?? '--'}
              icon={<BatteryCharging size={20} />}
              color={
                r?.voltage && (r.voltage < 12.6 || r.voltage > 14.8) ? 'orange' : 'green'
              }
              unit="V"
            />
            <StatCard
              title="Carga Motor"
              value={r?.engine_load?.toFixed(1) ?? '--'}
              icon={<Activity size={20} />}
              color="primary"
              unit="%"
            />
            <StatCard
              title="Presión MAP"
              value={r?.map_pressure?.toFixed(1) ?? '--'}
              icon={<Activity size={20} />}
              color="primary"
              unit="kPa"
            />
            <StatCard
              title="TPS"
              value={r?.tps_position?.toFixed(1) ?? '--'}
              icon={<Gauge size={20} />}
              color="blue"
              unit="%"
            />
            <StatCard
              title="Consumo"
              value={r?.fuel_consumption?.toFixed(2) ?? '--'}
              icon={<Activity size={20} />}
              color="orange"
              unit="L/h"
            />
          </div>
        </>
      )}

      {/* DTC Codes Found */}
      {dtcCodes.length > 0 && (
        <div className="rounded-2xl border border-white/[0.06] bg-[#0e0e1a] p-5">
          <h2 className="mb-3 font-semibold">Códigos DTC Encontrados</h2>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-white/[0.04] text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  <th className="pb-2">Código</th>
                  <th className="pb-2">Descripción</th>
                </tr>
              </thead>
              <tbody>
                {dtcCodes.map((c: any, i: number) => (
                  <tr key={i} className="border-b border-white/[0.02]">
                    <td className="py-2 font-mono font-medium text-orange-400">
                      {c.code}
                    </td>
                    <td className="py-2 text-gray-400">{c.description || '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
