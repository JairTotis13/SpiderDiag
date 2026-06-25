import { useEffect, useRef, useCallback, useState } from 'react';
import { useAuthStore } from '@/store/authStore';
import type { LiveReading } from '@/types';

const WS_URL = import.meta.env.VITE_WS_URL || `ws://${window.location.host}/ws`;

export function useOBDWebSocket(diagnosticId: number | null) {
  const wsRef = useRef<WebSocket | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [latestData, setLatestData] = useState<LiveReading | null>(null);
  const [dataHistory, setDataHistory] = useState<LiveReading[]>([]);
  const [dtcCodes, setDtcCodes] = useState<unknown[]>([]);
  const [alerts, setAlerts] = useState<unknown[]>([]);
  const reconnectTimeout = useRef<ReturnType<typeof setTimeout>>();

  const connect = useCallback(() => {
    if (!diagnosticId) return;
    if (wsRef.current?.readyState === WebSocket.OPEN) return;

    const token = useAuthStore.getState().token;
    const ws = new WebSocket(`${WS_URL}/api/v1/obd/ws/${diagnosticId}?token=${token}`);

    ws.onopen = () => {
      setIsConnected(true);
      console.log('WebSocket connected');
    };

    ws.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);

        // Check if it's an alert
        if (data.type === 'alert') {
          setAlerts((prev) => [data.data, ...prev].slice(0, 50));
          return;
        }

        // Check if it's DTC codes
        if (data.type === 'dtc_codes') {
          setDtcCodes(data.data);
          return;
        }

        // Live reading data
        if (data.timestamp) {
          const reading: LiveReading = {
            diagnostic_id: diagnosticId,
            vehicle_id: 0,
            rpm: data.rpm ?? null,
            speed: data.speed ?? null,
            engine_temp: data.engine_temp ?? null,
            voltage: data.voltage ?? null,
            fuel_consumption: data.fuel_consumption ?? null,
            engine_load: data.engine_load ?? null,
            map_pressure: data.map_pressure ?? null,
            tps_position: data.tps_position ?? null,
            timestamp: data.timestamp,
          };
          setLatestData(reading);
          setDataHistory((prev) => {
            const next = [reading, ...prev];
            return next.slice(0, 300); // Keep last 300 readings
          });
        }
      } catch (e) {
        // Non-JSON message (e.g. pong)
      }
    };

    ws.onclose = () => {
      setIsConnected(false);
      // Auto-reconnect after 3 seconds
      reconnectTimeout.current = setTimeout(() => {
        connect();
      }, 3000);
    };

    ws.onerror = () => {
      ws.close();
    };

    wsRef.current = ws;
  }, [diagnosticId]);

  useEffect(() => {
    connect();

    // Send ping every 30s to keep alive
    const pingInterval = setInterval(() => {
      if (wsRef.current?.readyState === WebSocket.OPEN) {
        wsRef.current.send('ping');
      }
    }, 30000);

    return () => {
      clearInterval(pingInterval);
      clearTimeout(reconnectTimeout.current);
      if (wsRef.current) {
        wsRef.current.close();
        wsRef.current = null;
      }
    };
  }, [connect]);

  const disconnect = useCallback(() => {
    clearTimeout(reconnectTimeout.current);
    if (wsRef.current) {
      wsRef.current.close();
      wsRef.current = null;
    }
    setIsConnected(false);
    setDataHistory([]);
    setLatestData(null);
  }, []);

  return {
    isConnected,
    latestData,
    dataHistory,
    dtcCodes,
    alerts,
    disconnect,
  };
}
