import { useEffect, useState, useMemo } from 'react';
import {
  Gauge,
  Thermometer,
  BatteryCharging,
  Car,
  Fuel,
  AlertTriangle,
  Activity,
  Zap,
  Users,
} from 'lucide-react';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  AreaChart,
  Area,
} from 'recharts';
import { StatCard } from '@/components/common/StatCard';
import { dashboardService } from '@/services/dataService';
import { useOBDWebSocket } from '@/hooks/useOBDWebSocket';
import type { DashboardSummary, LiveReading } from '@/types';

export default function DashboardPage() {
  const [summary, setSummary] = useState<DashboardSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const diagnosticId = 1; // Active diagnostic ID - in production, get from state/context

  // In production, diagnosticId comes from active connection state
  const activeDiag = null; // Set from OBD connect action
  const { isConnected, latestData, dataHistory } = useOBDWebSocket(activeDiag);

  useEffect(() => {
    dashboardService.getSummary().then(setSummary).finally(() => setLoading(false));
  }, []);

  const chartData = useMemo(() => {
    return dataHistory
      .slice(0, 60)
      .reverse()
      .map((d) => ({
        time: new Date(d.timestamp as number * 1000).toLocaleTimeString(),
        rpm: d.rpm,
        speed: d.speed,
        engine_temp: d.engine_temp,
        voltage: d.voltage,
        engine_load: d.engine_load,
      }));
  }, [dataHistory]);

  const r = latestData;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Dashboard</h1>
          <p className="text-sm text-gray-600">
            Monitoreo de diagnóstico en tiempo real
          </p>
        </div>
        <div className="flex items-center gap-3">
          <span
            className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-medium ring-1 ring-inset ${
              isConnected
                ? 'bg-emerald-500/10 text-emerald-400 ring-emerald-500/20'
                : 'bg-white/[0.02] text-gray-600 ring-white/[0.04]'
            }`}
          >
            <span
              className={`h-2 w-2 rounded-full shadow-[0_0_6px_currentColor] ${
                isConnected ? 'bg-emerald-400 animate-pulse' : 'bg-gray-700'
              }`}
            />
            {isConnected ? 'OBD Conectado' : 'OBD Desconectado'}
          </span>
        </div>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-1 gap-4 min-[400px]:grid-cols-2 md:grid-cols-4">
        <StatCard
          title="Clientes"
          value={summary?.total_clients ?? 0}
          icon={<Users size={20} />}
          color="blue"
          loading={loading}
        />
        <StatCard
          title="Vehículos"
          value={summary?.total_vehicles ?? 0}
          icon={<Car size={20} />}
          color="primary"
          loading={loading}
        />
        <StatCard
          title="Diagnósticos"
          value={summary?.total_diagnostics ?? 0}
          icon={<Activity size={20} />}
          color="green"
          loading={loading}
        />
        <StatCard
          title="Alertas"
          value={summary?.pending_alerts ?? 0}
          icon={<AlertTriangle size={20} />}
          color={summary?.pending_alerts ? 'red' : 'green'}
          loading={loading}
        />
      </div>

      {/* Live data gauges */}
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
          color={
            r?.engine_temp && r.engine_temp > 105 ? 'red' : 'green'
          }
          unit="°C"
        />
        <StatCard
          title="Voltaje"
          value={r?.voltage?.toFixed(1) ?? '--'}
          icon={<BatteryCharging size={20} />}
          color={
            r?.voltage && (r.voltage < 12.6 || r.voltage > 14.8)
              ? 'orange'
              : 'green'
          }
          unit="V"
        />
        <StatCard
          title="Carga Motor"
          value={r?.engine_load?.toFixed(1) ?? '--'}
          icon={<Zap size={20} />}
          color="primary"
          unit="%"
        />
        <StatCard
          title="Consumo"
          value={r?.fuel_consumption?.toFixed(1) ?? '--'}
          icon={<Fuel size={20} />}
          color="orange"
          unit="L/h"
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
      </div>

      {/* Charts */}
      <div className="grid gap-6 lg:grid-cols-2">
        {/* RPM Chart */}
        <div className="rounded-2xl border border-white/[0.06] bg-[#0e0e1a] p-5">
          <h3 className="mb-4 text-sm font-semibold text-gray-400">RPM en Tiempo Real</h3>
          <ResponsiveContainer width="100%" height={250}>
            <AreaChart data={chartData}>
              <defs>
                <linearGradient id="rpmGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#6366f1" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="#6366f1" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
              <XAxis dataKey="time" stroke="#6b7280" fontSize={11} />
              <YAxis stroke="#6b7280" fontSize={11} />
              <Tooltip
                contentStyle={{
                  backgroundColor: '#1e1e2e',
                  border: '1px solid #374151',
                  borderRadius: '8px',
                  color: '#e2e8f0',
                }}
              />
              <Area
                type="monotone"
                dataKey="rpm"
                stroke="#818cf8"
                fill="url(#rpmGradient)"
                strokeWidth={2}
                dot={false}
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>

        {/* Speed + Engine Load */}
        <div className="rounded-2xl border border-white/[0.06] bg-[#0e0e1a] p-5">
          <h3 className="mb-4 text-sm font-semibold text-gray-400">
            Velocidad y Temperatura
          </h3>
          <ResponsiveContainer width="100%" height={250}>
            <LineChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
              <XAxis dataKey="time" stroke="#6b7280" fontSize={11} />
              <YAxis stroke="#6b7280" fontSize={11} />
              <Tooltip
                contentStyle={{
                  backgroundColor: '#1e1e2e',
                  border: '1px solid #374151',
                  borderRadius: '8px',
                  color: '#e2e8f0',
                }}
              />
              <Line
                type="monotone"
                dataKey="speed"
                stroke="#448aff"
                strokeWidth={2}
                dot={false}
                name="Velocidad"
              />
              <Line
                type="monotone"
                dataKey="engine_temp"
                stroke="#e94560"
                strokeWidth={2}
                dot={false}
                name="Temp. Motor"
              />
            </LineChart>
          </ResponsiveContainer>
        </div>

        {/* Voltage Chart */}
        <div className="rounded-2xl border border-white/[0.06] bg-[#0e0e1a] p-5">
          <h3 className="mb-4 text-sm font-semibold text-gray-400">Voltaje de Batería</h3>
          <ResponsiveContainer width="100%" height={250}>
            <AreaChart data={chartData}>
              <defs>
                <linearGradient id="voltGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#00e676" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="#00e676" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
              <XAxis dataKey="time" stroke="#6b7280" fontSize={11} />
              <YAxis stroke="#6b7280" fontSize={11} domain={[10, 16]} />
              <Tooltip
                contentStyle={{
                  backgroundColor: '#1e1e2e',
                  border: '1px solid #374151',
                  borderRadius: '8px',
                  color: '#e2e8f0',
                }}
              />
              <Area
                type="monotone"
                dataKey="voltage"
                stroke="#00e676"
                fill="url(#voltGradient)"
                strokeWidth={2}
                dot={false}
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>

        {/* Engine Load */}
        <div className="rounded-2xl border border-white/[0.06] bg-[#0e0e1a] p-5">
          <h3 className="mb-4 text-sm font-semibold text-gray-400">Carga del Motor</h3>
          <ResponsiveContainer width="100%" height={250}>
            <AreaChart data={chartData}>
              <defs>
                <linearGradient id="loadGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#ff9100" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="#ff9100" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
              <XAxis dataKey="time" stroke="#6b7280" fontSize={11} />
              <YAxis stroke="#6b7280" fontSize={11} domain={[0, 100]} />
              <Tooltip
                contentStyle={{
                  backgroundColor: '#1e1e2e',
                  border: '1px solid #374151',
                  borderRadius: '8px',
                  color: '#e2e8f0',
                }}
              />
              <Area
                type="monotone"
                dataKey="engine_load"
                stroke="#ff9100"
                fill="url(#loadGradient)"
                strokeWidth={2}
                dot={false}
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
}
