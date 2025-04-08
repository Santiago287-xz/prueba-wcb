'use client';

import React, { useEffect, useState, useRef, useCallback } from 'react';
import { format, subDays, startOfMonth, startOfDay, endOfDay } from 'date-fns';
import {
  BarChart, LineChart, PieChart, XAxis, YAxis, CartesianGrid,
  Tooltip, Legend, Bar, Line, Pie, Cell, ResponsiveContainer
} from 'recharts';

/* ======= Interfaces y Tipos ======= */

interface GrowthData {
  date: string;
  total: number;
  active: number;
}

interface MembersMetrics {
  total: number;
  active: number;
  newThisMonth: number;
  retention: number;
  growthData: GrowthData[];
}

interface PopularTime {
  hour: string;
  reservations: number;
}

interface UtilizationByDay {
  day: string;
  futbol: number;
  padel: number;
}

interface TopClient {
  name: string;
  reservations: number;
}

interface CourtsMetrics {
  utilization: number;
  revenue: number;
  popularTimes: PopularTime[];
  popularCourts: any[];
  utilizationByDay: UtilizationByDay[];
  topClients: TopClient[];
}

interface ByCategory {
  name: string;
  value: number;
}

interface TopProduct {
  name: string;
  quantity: number;
  revenue: number;
}

interface SalesMetrics {
  total: number;
  byCategory: ByCategory[];
  topProducts: TopProduct[];
}

interface ByDayOfWeek {
  day: string;
  count: number;
}

interface AttendanceMetrics {
  today: number;
  thisWeek: number;
  avgDaily: number;
  peakHours: any[];
  byDayOfWeek: ByDayOfWeek[];
}

interface Metrics {
  members: MembersMetrics;
  courts: CourtsMetrics;
  sales: SalesMetrics;
  attendance: AttendanceMetrics;
}

interface DateRange {
  start: Date;
  end: Date;
}

interface AnimatedCounterProps {
  value: number;
  duration?: number;
  previousValue?: number;
}

/* ======= Componentes ======= */

// Contador animado con transiciones suaves
const AnimatedCounter: React.FC<AnimatedCounterProps> = ({ value, duration = 800, previousValue = 0 }) => {
  const [displayValue, setDisplayValue] = useState<number>(previousValue);
  const prevValueRef = useRef<number>(previousValue);
  const startTime = useRef<number | null>(null);
  const requestRef = useRef<number>();

  const animate = useCallback((timestamp: number) => {
    if (startTime.current === null) startTime.current = timestamp;
    const elapsed = timestamp - startTime.current;
    const progress = Math.min(elapsed / duration, 1);
    const easeOut = (t: number) => 1 - Math.pow(1 - t, 3);
    const easedProgress = easeOut(progress);
    const newValue = prevValueRef.current + (value - prevValueRef.current) * easedProgress;
    setDisplayValue(newValue);
    if (progress < 1) {
      requestRef.current = requestAnimationFrame(animate);
    } else {
      startTime.current = null;
      prevValueRef.current = value;
    }
  }, [value, duration]);

  useEffect(() => {
    if (typeof value === 'number' && !isNaN(value) && value !== prevValueRef.current) {
      if (requestRef.current) cancelAnimationFrame(requestRef.current);
      requestRef.current = requestAnimationFrame(animate);
    }
    return () => {
      if (requestRef.current) cancelAnimationFrame(requestRef.current);
    };
  }, [value, animate]);

  if (typeof value !== 'number' || isNaN(value)) return <>-</>;
  return <>{Number.isInteger(displayValue) ? displayValue.toFixed(0) : displayValue.toFixed(2)}</>;
};

// Helper para reintentos con backoff exponencial y timeout integrado.
async function fetchWithRetry(url: string, options = {}, retries = 3, backoff = 500): Promise<any> {
  for (let i = 0; i < retries; i++) {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 5000); // timeout de 5s
      const response = await fetch(url, { ...options, signal: controller.signal });
      clearTimeout(timeoutId);
      if (!response.ok) throw new Error(`Error: ${response.status}`);
      return await response.json();
    } catch (error) {
      if (i < retries - 1) {
        await new Promise(res => setTimeout(res, backoff * Math.pow(2, i)));
      } else {
        throw error;
      }
    }
  }
}

const formatCurrency = (amount: number) =>
  new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS' }).format(amount);

/* ======= Dashboard Principal ======= */

export default function AdminAnalytics() {
  const [dateRange, setDateRange] = useState<DateRange>({ start: subDays(new Date(), 30), end: new Date() });
  const [loading, setLoading] = useState<boolean>(true);
  const [view, setView] = useState<'chart' | 'table' | 'transactions'>('chart');
  const [activePreset, setActivePreset] = useState<string>('last30');
  const [autoRefresh, setAutoRefresh] = useState<boolean>(false);
  const [lastRefresh, setLastRefresh] = useState<Date>(new Date());
  const [transactions, setTransactions] = useState<any[]>([]);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const [metrics, setMetrics] = useState<Metrics>({
    members: {
      total: 0,
      active: 0,
      newThisMonth: 0,
      retention: 0,
      growthData: []
    },
    courts: {
      utilization: 0,
      revenue: 0,
      popularTimes: [],
      popularCourts: [],
      utilizationByDay: [],
      topClients: []
    },
    sales: {
      total: 0,
      byCategory: [],
      topProducts: []
    },
    attendance: {
      today: 0,
      thisWeek: 0,
      avgDaily: 0,
      peakHours: [],
      byDayOfWeek: []
    }
  });

  const prevMetricsRef = useRef<Metrics>({ ...metrics });
  const dataHashRef = useRef<{ [key: string]: string }>({});

  const hashData = (data: any): string => {
    try {
      return JSON.stringify(data);
    } catch (e) {
      return '';
    }
  };

  /* ======= Funciones de Fetch ======= */

  const fetchTransactions = useCallback(async (showLoading = false) => {
    try {
      if (showLoading) setLoading(true);
      const start = format(startOfDay(dateRange.start), "yyyy-MM-dd'T'HH:mm:ss");
      const end = format(endOfDay(dateRange.end), "yyyy-MM-dd'T'HH:mm:ss");
      const cacheBuster = Date.now();
      const url = `/api/transactions?start=${start}&end=${end}&_=${cacheBuster}`;
      const data = await fetchWithRetry(url);
      const newHash = hashData(data.transactions);
      if (newHash !== dataHashRef.current.transactions) {
        setTransactions(data.transactions || []);
        dataHashRef.current.transactions = newHash;
      }
      setErrorMessage(null);
    } catch (error) {
      console.error('Error fetching transactions:', error);
      setErrorMessage("Error al cargar transacciones. Mostrando últimos datos conocidos.");
    } finally {
      if (showLoading) setLoading(false);
    }
  }, [dateRange]);

  const fetchMembers = useCallback(async (showLoading = false) => {
    try {
      const start = dateRange.start.toISOString();
      const end = dateRange.end.toISOString();
      const cacheBuster = Date.now();
      const url = `/api/analytics/members?start=${start}&end=${end}&_=${cacheBuster}`;
      const data = await fetchWithRetry(url);
      const newHash = hashData(data);
      if (newHash !== dataHashRef.current.members) {
        prevMetricsRef.current.members = { ...metrics.members };
        setMetrics(prev => ({
          ...prev,
          members: {
            ...data,
            growthData: data.growthData || []
          }
        }));
        dataHashRef.current.members = newHash;
      }
      setErrorMessage(null);
    } catch (error) {
      console.error('Error fetching members data:', error);
      setErrorMessage("Error al cargar datos de miembros.");
    }
  }, [dateRange, metrics.members]);

  const fetchCourts = useCallback(async (showLoading = false) => {
    try {
      const start = dateRange.start.toISOString();
      const end = dateRange.end.toISOString();
      const cacheBuster = Date.now();
      const url = `/api/analytics/courts?start=${start}&end=${end}&_=${cacheBuster}`;
      const data = await fetchWithRetry(url);
      const newHash = hashData(data);
      if (newHash !== dataHashRef.current.courts) {
        prevMetricsRef.current.courts = { ...metrics.courts };
        setMetrics(prev => ({
          ...prev,
          courts: {
            ...data,
            topClients: data.topClients || [],
            utilizationByDay: data.utilizationByDay || [],
            popularTimes: data.popularTimes || []
          }
        }));
        dataHashRef.current.courts = newHash;
      }
      setErrorMessage(null);
    } catch (error) {
      console.error('Error fetching courts data:', error);
      setErrorMessage("Error al cargar datos de canchas.");
    }
  }, [dateRange, metrics.courts]);

  const fetchSales = useCallback(async (showLoading = false) => {
    try {
      const start = dateRange.start.toISOString();
      const end = dateRange.end.toISOString();
      const cacheBuster = Date.now();
      const url = `/api/analytics/sales?start=${start}&end=${end}&_=${cacheBuster}`;
      const data = await fetchWithRetry(url);
      const newHash = hashData(data);
      if (newHash !== dataHashRef.current.sales) {
        prevMetricsRef.current.sales = { ...metrics.sales };
        setMetrics(prev => ({
          ...prev,
          sales: {
            ...data,
            byCategory: data.byCategory || [],
            topProducts: data.topProducts || []
          }
        }));
        dataHashRef.current.sales = newHash;
      }
      setErrorMessage(null);
    } catch (error) {
      console.error('Error fetching sales data:', error);
      setErrorMessage("Error al cargar datos de ventas.");
    }
  }, [dateRange, metrics.sales]);

  const fetchAttendance = useCallback(async (showLoading = false) => {
    try {
      const start = dateRange.start.toISOString();
      const end = dateRange.end.toISOString();
      const cacheBuster = Date.now();
      const url = `/api/analytics/attendance?start=${start}&end=${end}&_=${cacheBuster}`;
      const data = await fetchWithRetry(url);
      const newHash = hashData(data);
      if (newHash !== dataHashRef.current.attendance) {
        prevMetricsRef.current.attendance = { ...metrics.attendance };
        setMetrics(prev => ({
          ...prev,
          attendance: {
            today: data.today || 0,
            thisWeek: data.thisWeek || 0,
            avgDaily: data.avgDaily || 0,
            peakHours: data.peakHours || [],
            byDayOfWeek: data.byDayOfWeek || []
          }
        }));
        dataHashRef.current.attendance = newHash;
      }
      setErrorMessage(null);
    } catch (error) {
      console.error('Error fetching attendance data:', error);
      setErrorMessage("Error al cargar datos de asistencia.");
    }
  }, [dateRange, metrics.attendance]);

  const fetchAllAnalytics = useCallback(async () => {
    setLoading(true);
    try {
      setErrorMessage(null);
      await Promise.allSettled([
        fetchMembers(),
        fetchCourts(),
        fetchSales(),
        fetchTransactions(),
        fetchAttendance()
      ]);
    } finally {
      setLoading(false);
      setLastRefresh(new Date());
    }
  }, [fetchMembers, fetchCourts, fetchSales, fetchTransactions, fetchAttendance]);

  useEffect(() => {
    fetchAllAnalytics();
  }, [dateRange, fetchAllAnalytics]);

  useEffect(() => {
    if (!autoRefresh || loading) return;
    const shortInterval = setInterval(() => {
      fetchTransactions();
      fetchSales();
      setLastRefresh(new Date());
    }, 5000);
    const longInterval = setInterval(() => {
      fetchMembers();
      fetchCourts();
      fetchAttendance();
    }, 15000);
    return () => {
      clearInterval(shortInterval);
      clearInterval(longInterval);
    };
  }, [autoRefresh, fetchTransactions, fetchSales, fetchMembers, fetchCourts, fetchAttendance, loading]);

  const applyDatePreset = (preset: string) => {
    const today = new Date();
    let start: Date, end: Date = today;
    switch (preset) {
      case 'last7days':
        start = subDays(today, 6);
        break;
      case 'last30days':
        start = subDays(today, 29);
        break;
      case 'thisMonth':
        start = startOfMonth(today);
        break;
      default:
        start = subDays(today, 29);
    }
    setDateRange({ start, end });
    setActivePreset(preset);
  };

  const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884d8', '#82ca9d'];

  return (
    <div className="container mx-auto p-4">
      <div className="mb-6 flex justify-between items-center flex-wrap gap-2">
        <h1 className="text-2xl font-bold">Panel Analítico</h1>
        {errorMessage && (
          <div className="w-full mb-4 bg-red-100 text-red-700 px-4 py-2 rounded">
            {errorMessage}
          </div>
        )}
        <div className="flex flex-wrap gap-2 items-center">
          <div className="flex items-center border rounded p-2">
            <input
              type="date"
              value={format(dateRange.start, 'yyyy-MM-dd')}
              onChange={(e) => {
                setDateRange({ ...dateRange, start: new Date(e.target.value) });
                setActivePreset('custom');
              }}
              className="text-sm border-none"
              max={format(new Date(), 'yyyy-MM-dd')}
            />
            <span className="mx-2">-</span>
            <input
              type="date"
              value={format(dateRange.end, 'yyyy-MM-dd')}
              onChange={(e) => {
                setDateRange({ ...dateRange, end: new Date(e.target.value) });
                setActivePreset('custom');
              }}
              className="text-sm border-none"
              max={format(new Date(), 'yyyy-MM-dd')}
            />
          </div>
          <div className="flex gap-1 flex-wrap">
            <button
              onClick={() => applyDatePreset('last7days')}
              className={`px-2 py-1 text-xs rounded ${activePreset === 'last7days' ? 'bg-blue-500 text-white' : 'bg-gray-200'}`}
            >
              7 días
            </button>
            <button
              onClick={() => applyDatePreset('last30days')}
              className={`px-2 py-1 text-xs rounded ${activePreset === 'last30days' ? 'bg-blue-500 text-white' : 'bg-gray-200'}`}
            >
              30 días
            </button>
            <button
              onClick={() => applyDatePreset('thisMonth')}
              className={`px-2 py-1 text-xs rounded ${activePreset === 'thisMonth' ? 'bg-blue-500 text-white' : 'bg-gray-200'}`}
            >
              Este mes
            </button>
          </div>
          <div className="flex items-center gap-2">
            <label className="text-xs flex items-center">
              <input
                type="checkbox"
                checked={autoRefresh}
                onChange={(e) => setAutoRefresh(e.target.checked)}
                className="mr-1"
              />
              Auto-refresh
            </label>
            <button
              onClick={fetchAllAnalytics}
              className="px-3 py-1 bg-blue-500 text-white rounded text-sm flex items-center"
              disabled={loading}
            >
              {loading ? (
                <svg className="animate-spin h-4 w-4 mr-1" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
              ) : null}
              Actualizar
            </button>
            <div className="text-xs text-gray-500">
              {format(lastRefresh, 'HH:mm:ss')}
            </div>
          </div>
        </div>
        <div className="w-full flex border-b mt-2">
          <button
            className={`px-3 py-1 sm:px-4 sm:py-2 text-sm ${view === 'chart' ? 'border-b-2 border-blue-500 font-medium' : ''}`}
            onClick={() => setView('chart')}
          >
            Gráficos
          </button>
          <button
            className={`px-3 py-1 sm:px-4 sm:py-2 text-sm ${view === 'table' ? 'border-b-2 border-blue-500 font-medium' : ''}`}
            onClick={() => setView('table')}
          >
            Tablas
          </button>
          <button
            className={`px-3 py-1 sm:px-4 sm:py-2 text-sm ${view === 'transactions' ? 'border-b-2 border-blue-500 font-medium' : ''}`}
            onClick={() => setView('transactions')}
          >
            Transacciones
          </button>
        </div>
      </div>
      
      {/* Tarjetas de métricas clave */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <MetricCard
          title="Miembros"
          value={metrics.members.total}
          previousValue={prevMetricsRef.current.members.total}
          secondary={`${metrics.members.active || 0} activos`}
          trend={`+${metrics.members.newThisMonth || 0} este mes`}
          icon="users"
          loading={loading}
        />
        <MetricCard
          title="Uso de Canchas"
          value={metrics.courts.utilization}
          previousValue={prevMetricsRef.current.courts.utilization}
          secondary={`${formatCurrency(metrics.courts.revenue || 0)} en ingresos`}
          trend="Comparado con mes anterior"
          icon="court"
          loading={loading}
          suffix="%"
        />
        <MetricCard
          title="Ventas Totales"
          value={metrics.sales.total || 0}
          previousValue={prevMetricsRef.current.sales.total || 0}
          secondary="Productos y servicios"
          trend="Total del periodo"
          icon="money"
          loading={loading}
          prefix=""
        />
        <MetricCard
          title="Asistencia"
          value={metrics.attendance.today || 0}
          previousValue={prevMetricsRef.current.attendance.today || 0}
          secondary={`${metrics.attendance.thisWeek || 0} esta semana`}
          trend={`Prom: ${metrics.attendance.avgDaily || 0}/día`}
          icon="chart"
          loading={loading}
        />
      </div>
      
      {view === 'chart' && (
        <>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-6">
            <ChartCard title="Crecimiento de Miembros" loading={loading}>
              {metrics.members.growthData && metrics.members.growthData.length > 0 ? (
                <ResponsiveContainer width="100%" height={300}>
                  <LineChart data={metrics.members.growthData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="date" />
                    <YAxis />
                    <Tooltip />
                    <Legend />
                    <Line type="monotone" dataKey="total" stroke="#8884d8" name="Total Miembros" />
                    <Line type="monotone" dataKey="active" stroke="#82ca9d" name="Miembros Activos" />
                  </LineChart>
                </ResponsiveContainer>
              ) : (
                <div className="h-64 flex items-center justify-center text-gray-500">
                  No hay datos suficientes
                </div>
              )}
            </ChartCard>
            
            <ChartCard title="Ocupación de Canchas" loading={loading}>
              {metrics.courts.utilizationByDay && metrics.courts.utilizationByDay.length > 0 ? (
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={metrics.courts.utilizationByDay}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="day" />
                    <YAxis />
                    <Tooltip />
                    <Legend />
                    <Bar dataKey="futbol" name="Fútbol" fill="#8884d8" />
                    <Bar dataKey="padel" name="Pádel" fill="#82ca9d" />
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <div className="h-64 flex items-center justify-center text-gray-500">
                  No hay datos suficientes
                </div>
              )}
            </ChartCard>
          </div>
          
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mb-6">
            <ChartCard title="Horarios Populares" loading={loading}>
              {metrics.courts.popularTimes && metrics.courts.popularTimes.length > 0 ? (
                <ResponsiveContainer width="100%" height={250}>
                  <BarChart data={metrics.courts.popularTimes}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="hour" />
                    <YAxis />
                    <Tooltip />
                    <Legend />
                    <Bar dataKey="reservations" name="Reservas" fill="#8884d8" />
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <div className="h-64 flex items-center justify-center text-gray-500">
                  No hay datos suficientes
                </div>
              )}
            </ChartCard>
            
            <ChartCard title="Ventas por Categoría" loading={loading}>
              {metrics.sales.byCategory && metrics.sales.byCategory.length > 0 ? (
                <ResponsiveContainer width="100%" height={250}>
                  <PieChart>
                    <Pie
                      data={metrics.sales.byCategory}
                      dataKey="value"
                      nameKey="name"
                      cx="50%"
                      cy="50%"
                      outerRadius={80}
                      innerRadius={40}
                      fill="#8884d8"
                      paddingAngle={1}
                    >
                      {metrics.sales.byCategory.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip formatter={(value: any) => [formatCurrency(Number(value)), 'Ventas']} />
                    <Legend />
                  </PieChart>
                </ResponsiveContainer>
              ) : (
                <div className="h-64 flex items-center justify-center text-gray-500">
                  No hay datos suficientes
                </div>
              )}
            </ChartCard>
            
            <ChartCard title="Asistencia Semanal" loading={loading}>
              {metrics.attendance.byDayOfWeek && metrics.attendance.byDayOfWeek.length > 0 ? (
                <ResponsiveContainer width="100%" height={250}>
                  <BarChart data={metrics.attendance.byDayOfWeek}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="day" />
                    <YAxis />
                    <Tooltip />
                    <Legend />
                    <Bar dataKey="count" name="Asistencias" fill="#8884d8" />
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <div className="h-64 flex items-center justify-center text-gray-500">
                  No hay datos suficientes
                </div>
              )}
            </ChartCard>
          </div>

          <div className="mb-6">
            <ChartCard title="Ganancias Brutas" loading={loading}>
              {metrics.sales.byCategory && metrics.sales.byCategory.length > 0 ? (
                <ResponsiveContainer width="100%" height={300}>
                  <LineChart data={metrics.sales.byCategory}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="name" />
                    <YAxis />
                    <Tooltip formatter={(value: any) => [formatCurrency(Number(value)), 'Ingresos']} />
                    <Legend />
                    <Line type="monotone" dataKey="value" name="Ganancias" stroke="#82ca9d" />
                  </LineChart>
                </ResponsiveContainer>
              ) : (
                <div className="h-64 flex items-center justify-center text-gray-500">
                  No hay datos suficientes
                </div>
              )}
            </ChartCard>
          </div>
        </>
      )}
      
      {view === 'table' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <TableCard title="Productos Más Vendidos" loading={loading}>
            <table className="min-w-full">
              <thead>
                <tr className="bg-gray-100">
                  <th className="px-4 py-2 text-left text-xs font-medium">Producto</th>
                  <th className="px-4 py-2 text-left text-xs font-medium">Cantidad</th>
                  <th className="px-4 py-2 text-left text-xs font-medium">Ingresos</th>
                </tr>
              </thead>
              <tbody className="transition-opacity duration-300">
                {loading ? (
                  Array(5).fill(0).map((_, idx) => (
                    <tr key={idx} className="border-b">
                      <td className="px-4 py-2 text-sm">
                        <div className="animate-pulse bg-gray-200 h-4 w-24 rounded"></div>
                      </td>
                      <td className="px-4 py-2 text-sm">
                        <div className="animate-pulse bg-gray-200 h-4 w-12 rounded"></div>
                      </td>
                      <td className="px-4 py-2 text-sm">
                        <div className="animate-pulse bg-gray-200 h-4 w-16 rounded"></div>
                      </td>
                    </tr>
                  ))
                ) : metrics.sales.topProducts && metrics.sales.topProducts.length > 0 ? (
                  metrics.sales.topProducts.map((product, idx) => (
                    <tr key={idx} className="border-b">
                      <td className="px-4 py-2 text-sm">{product.name}</td>
                      <td className="px-4 py-2 text-sm">{product.quantity}</td>
                      <td className="px-4 py-2 text-sm">{formatCurrency(product.revenue)}</td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={3} className="px-4 py-4 text-center text-gray-500">
                      No hay datos disponibles
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </TableCard>
          
          <TableCard title="Clientes Frecuentes" loading={loading}>
            <table className="min-w-full">
              <thead>
                <tr className="bg-gray-100">
                  <th className="px-4 py-2 text-left text-xs font-medium">Cliente</th>
                  <th className="px-4 py-2 text-left text-xs font-medium">Reservas</th>
                </tr>
              </thead>
              <tbody className="transition-opacity duration-300">
                {loading ? (
                  Array(5).fill(0).map((_, idx) => (
                    <tr key={idx} className="border-b">
                      <td className="px-4 py-2 text-sm">
                        <div className="animate-pulse bg-gray-200 h-4 w-24 rounded"></div>
                      </td>
                      <td className="px-4 py-2 text-sm">
                        <div className="animate-pulse bg-gray-200 h-4 w-12 rounded"></div>
                      </td>
                    </tr>
                  ))
                ) : metrics.courts.topClients && metrics.courts.topClients.length > 0 ? (
                  metrics.courts.topClients.map((client, idx) => (
                    <tr key={idx} className="border-b">
                      <td className="px-4 py-2 text-sm">{client.name}</td>
                      <td className="px-4 py-2 text-sm">{client.reservations}</td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={2} className="px-4 py-4 text-center text-gray-500">
                      No hay datos disponibles
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </TableCard>

          <TableCard title="Ocupación por Canchas" loading={loading}>
            <table className="min-w-full">
              <thead>
                <tr className="bg-gray-100">
                  <th className="px-4 py-2 text-left text-xs font-medium">Día</th>
                  <th className="px-4 py-2 text-left text-xs font-medium">Fútbol (horas)</th>
                  <th className="px-4 py-2 text-left text-xs font-medium">Pádel (horas)</th>
                </tr>
              </thead>
              <tbody className="transition-opacity duration-300">
                {loading ? (
                  Array(7).fill(0).map((_, idx) => (
                    <tr key={idx} className="border-b">
                      <td className="px-4 py-2 text-sm">
                        <div className="animate-pulse bg-gray-200 h-4 w-16 rounded"></div>
                      </td>
                      <td className="px-4 py-2 text-sm">
                        <div className="animate-pulse bg-gray-200 h-4 w-12 rounded"></div>
                      </td>
                      <td className="px-4 py-2 text-sm">
                        <div className="animate-pulse bg-gray-200 h-4 w-12 rounded"></div>
                      </td>
                    </tr>
                  ))
                ) : metrics.courts.utilizationByDay && metrics.courts.utilizationByDay.length > 0 ? (
                  metrics.courts.utilizationByDay.map((day, idx) => (
                    <tr key={idx} className="border-b">
                      <td className="px-4 py-2 text-sm">{day.day}</td>
                      <td className="px-4 py-2 text-sm">{day.futbol}</td>
                      <td className="px-4 py-2 text-sm">{day.padel}</td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={3} className="px-4 py-4 text-center text-gray-500">
                      No hay datos disponibles
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </TableCard>

          <TableCard title="Asistencia por Día" loading={loading}>
            <table className="min-w-full">
              <thead>
                <tr className="bg-gray-100">
                  <th className="px-4 py-2 text-left text-xs font-medium">Día</th>
                  <th className="px-4 py-2 text-left text-xs font-medium">Asistencias</th>
                </tr>
              </thead>
              <tbody className="transition-opacity duration-300">
                {loading ? (
                  Array(7).fill(0).map((_, idx) => (
                    <tr key={idx} className="border-b">
                      <td className="px-4 py-2 text-sm">
                        <div className="animate-pulse bg-gray-200 h-4 w-16 rounded"></div>
                      </td>
                      <td className="px-4 py-2 text-sm">
                        <div className="animate-pulse bg-gray-200 h-4 w-12 rounded"></div>
                      </td>
                    </tr>
                  ))
                ) : metrics.attendance.byDayOfWeek && metrics.attendance.byDayOfWeek.length > 0 ? (
                  metrics.attendance.byDayOfWeek.map((day, idx) => (
                    <tr key={idx} className="border-b">
                      <td className="px-4 py-2 text-sm">{day.day}</td>
                      <td className="px-4 py-2 text-sm">{day.count}</td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={2} className="px-4 py-4 text-center text-gray-500">
                      No hay datos disponibles
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </TableCard>
        </div>
      )}
      
      {view === 'transactions' && (
        <div className="bg-white rounded-lg shadow-md overflow-hidden">
          <div className="px-4 py-3 border-b">
            <h3 className="text-gray-700 font-medium">Registro de Transacciones</h3>
          </div>
          <div className="overflow-x-auto">
            <table className="min-w-full">
              <thead>
                <tr className="bg-gray-100">
                  <th className="px-4 py-2 text-left text-xs font-medium">Fecha</th>
                  <th className="px-4 py-2 text-left text-xs font-medium">Tipo</th>
                  <th className="px-4 py-2 text-left text-xs font-medium">Categoría</th>
                  <th className="px-4 py-2 text-left text-xs font-medium">Monto</th>
                  <th className="px-4 py-2 text-left text-xs font-medium">Método de Pago</th>
                  <th className="px-4 py-2 text-left text-xs font-medium">Ubicación</th>
                  <th className="px-4 py-2 text-left text-xs font-medium">Descripción</th>
                </tr>
              </thead>
              <tbody className="transition-opacity duration-300">
                {loading ? (
                  Array(10).fill(0).map((_, idx) => (
                    <tr key={idx} className="border-b">
                      <td className="px-4 py-2 text-sm">
                        <div className="animate-pulse bg-gray-200 h-4 w-20 rounded"></div>
                      </td>
                      <td className="px-4 py-2 text-sm">
                        <div className="animate-pulse bg-gray-200 h-4 w-16 rounded"></div>
                      </td>
                      <td className="px-4 py-2 text-sm">
                        <div className="animate-pulse bg-gray-200 h-4 w-20 rounded"></div>
                      </td>
                      <td className="px-4 py-2 text-sm">
                        <div className="animate-pulse bg-gray-200 h-4 w-16 rounded"></div>
                      </td>
                      <td className="px-4 py-2 text-sm">
                        <div className="animate-pulse bg-gray-200 h-4 w-24 rounded"></div>
                      </td>
                      <td className="px-4 py-2 text-sm">
                        <div className="animate-pulse bg-gray-200 h-4 w-16 rounded"></div>
                      </td>
                      <td className="px-4 py-2 text-sm">
                        <div className="animate-pulse bg-gray-200 h-4 w-32 rounded"></div>
                      </td>
                    </tr>
                  ))
                ) : transactions.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="px-4 py-4 text-center text-sm text-gray-500">
                      No hay transacciones para mostrar
                    </td>
                  </tr>
                ) : (
                  transactions.map((transaction, idx) => (
                    <tr key={idx} className="border-b hover:bg-gray-50">
                      <td className="px-4 py-2 text-sm">
                        {format(new Date(transaction.createdAt), 'dd/MM/yyyy HH:mm')}
                      </td>
                      <td className="px-4 py-2 text-sm">
                        <span className={transaction.type === 'income' ? 'text-green-600' : 'text-red-600'}>
                          {transaction.type === 'income' ? 'Ingreso' : 'Gasto'}
                        </span>
                      </td>
                      <td className="px-4 py-2 text-sm">{transaction.category}</td>
                      <td className="px-4 py-2 text-sm font-medium">
                        <span className={transaction.type === 'income' ? 'text-green-600' : 'text-red-600'}>
                          {formatCurrency(transaction.amount)}
                        </span>
                      </td>
                      <td className="px-4 py-2 text-sm">{transaction.paymentMethod}</td>
                      <td className="px-4 py-2 text-sm">{transaction.location || '-'}</td>
                      <td className="px-4 py-2 text-sm">{transaction.description || '-'}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}

/* ======= Componentes de Presentación ======= */

interface MetricCardProps {
  title: string;
  value: number;
  previousValue?: number;
  secondary: string;
  trend: string;
  icon: 'users' | 'court' | 'money' | 'chart';
  loading: boolean;
  prefix?: string;
  suffix?: string;
}

const MetricCard: React.FC<MetricCardProps> = ({ title, value, previousValue = 0, secondary, trend, icon, loading, prefix = '', suffix = '' }) => {
  const icons: { [key in MetricCardProps['icon']]: JSX.Element } = {
    users: (
      <svg className="w-8 h-8 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"
           xmlns="http://www.w3.org/2000/svg">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
              d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
      </svg>
    ),
    court: (
      <svg className="w-8 h-8 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"
           xmlns="http://www.w3.org/2000/svg">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
              d="M5 12h.01M12 12h.01M19 12h.01M6 12a1 1 0 11-2 0 1 1 0 012 0zm7 0a1 1 0 11-2 0 1 1 0 012 0zm7 0a1 1 0 11-2 0 1 1 0 012 0z" />
      </svg>
    ),
    money: (
      <svg className="w-8 h-8 text-yellow-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"
           xmlns="http://www.w3.org/2000/svg">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
              d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
    ),
    chart: (
      <svg className="w-8 h-8 text-purple-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"
           xmlns="http://www.w3.org/2000/svg">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
              d="M7 12l3-3 3 3 4-4M8 21l4-4 4 4M3 4h18M4 4h16v12a1 1 0 01-1 1H5a1 1 0 01-1-1V4z" />
      </svg>
    )
  };

  return (
    <div className="bg-white p-4 rounded-lg shadow-md transition-all duration-300">
      <div className="flex justify-between">
        <div>
          <h3 className="text-gray-500 text-sm">{title}</h3>
          {loading ? (
            <>
              <div className="animate-pulse bg-gray-200 h-8 w-24 rounded mt-1"></div>
              <div className="animate-pulse bg-gray-200 h-4 w-32 rounded mt-1"></div>
              <div className="animate-pulse bg-gray-200 h-4 w-20 rounded mt-2"></div>
            </>
          ) : (
            <>
              <p className="text-2xl font-bold mt-1 transition-all duration-500">
                {prefix}<AnimatedCounter value={value} previousValue={previousValue} duration={1000} />{suffix}
              </p>
              <p className="text-sm text-gray-600 mt-1">{secondary}</p>
              <p className="text-xs text-blue-500 mt-2">{trend}</p>
            </>
          )}
        </div>
        <div>
          {icons[icon]}
        </div>
      </div>
    </div>
  );
};

interface ChartCardProps {
  title: string;
  children: React.ReactNode;
  loading: boolean;
}

const ChartCard: React.FC<ChartCardProps> = ({ title, children, loading }) => {
  return (
    <div className="bg-white p-4 rounded-lg shadow-md transition-all duration-300">
      <h3 className="text-gray-700 font-medium mb-4">{title}</h3>
      {loading ? (
        <div className="animate-pulse bg-gray-200 h-64 w-full rounded"></div>
      ) : (
        children
      )}
    </div>
  );
};

interface TableCardProps {
  title: string;
  children: React.ReactNode;
  loading: boolean;
}

const TableCard: React.FC<TableCardProps> = ({ title, children, loading }) => {
  return (
    <div className="bg-white rounded-lg shadow-md overflow-hidden transition-all duration-300">
      <div className="px-4 py-3 border-b">
        <h3 className="text-gray-700 font-medium">{title}</h3>
      </div>
      <div className="overflow-x-auto p-2">
        {children}
      </div>
    </div>
  );
};
