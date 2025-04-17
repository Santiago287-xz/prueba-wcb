'use client';

import React, { useEffect, useState, useRef, useCallback } from 'react';
import { format, subDays, startOfMonth, endOfMonth, startOfWeek, endOfWeek, startOfDay, endOfDay } from 'date-fns';
import {
  BarChart, PieChart, ComposedChart, XAxis, YAxis, CartesianGrid,
  Tooltip, Legend, Bar, Line, Pie, Cell, ResponsiveContainer
} from 'recharts';

interface DateRange {
  start: Date;
  end: Date;
}

interface Transaction {
  id: string;
  type: 'income' | 'expense';
  category: string;
  amount: number;
  description?: string;
  paymentMethod: string;
  location?: string;
  createdAt: string;
  user?: { name: string; id: string };
}

const formatCurrency = (amount: number) =>
  new Intl.NumberFormat('es-AR', {
    style: 'currency',
    currency: 'ARS',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  }).format(amount);

const categoryTranslations: Record<string, string> = {
  'court_rental': 'Alquiler de Canchas',
  'membership': 'Membresía',
  'food': 'Alimentos',
  'drinks': 'Bebidas',
  'equipment': 'Equipamiento',
  'salary': 'Salarios',
  'maintenance': 'Mantenimiento',
  'utilities': 'Servicios',
  'supplies': 'Suministros',
  'events': 'Eventos',
  'other': 'Otros'
};

const paymentMethodTranslations: Record<string, string> = {
  'cash': 'Efectivo',
  'card': 'Tarjeta',
  'transfer': 'Transferencia',
  'points': 'Puntos',
  'check': 'Cheque'
};

const translateCategory = (category: string): string => {
  return categoryTranslations[category] || category;
};

const translatePaymentMethod = (method: string): string => {
  return paymentMethodTranslations[method] || method;
};

async function fetchWithRetry(url: string, options = {}, retries = 3, backoff = 500): Promise<any> {
  for (let i = 0; i < retries; i++) {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 5000);
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

const AnimatedCounter: React.FC<{
  value: number;
  duration?: number;
  previousValue?: number;
  prefix?: string;
  suffix?: string;
  formatAsNumber?: boolean;
  formatAsCurrency?: boolean;
}> = ({
  value,
  duration = 800,
  previousValue = 0,
  prefix = '',
  suffix = '',
  formatAsNumber = false,
  formatAsCurrency = false
}) => {
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

    if (formatAsCurrency) {
      return <>{formatCurrency(displayValue)}</>;
    }

    if (formatAsNumber) {
      const formatted = new Intl.NumberFormat('es-AR', {
        minimumFractionDigits: Number.isInteger(displayValue) ? 0 : 2,
        maximumFractionDigits: Number.isInteger(displayValue) ? 0 : 2
      }).format(displayValue);
      return <>{prefix}{formatted}{suffix}</>;
    }

    return <>{prefix}{Number.isInteger(displayValue) ? displayValue.toFixed(0) : displayValue.toFixed(2)}{suffix}</>;
  };

export default function AdminAnalytics() {
  const [dateRange, setDateRange] = useState<DateRange>({
    start: subDays(new Date(), 30),
    end: new Date()
  });
  const [loading, setLoading] = useState<boolean>(true);
  const [view, setView] = useState<'chart' | 'transactions'>('chart');
  const [activePreset, setActivePreset] = useState<string>('last30');
  const [autoRefresh, setAutoRefresh] = useState<boolean>(false);
  const [lastRefresh, setLastRefresh] = useState<Date>(new Date());
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [filteredTransactions, setFilteredTransactions] = useState<Transaction[] | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [showPurgeConfirm, setShowPurgeConfirm] = useState<boolean>(false);
  const [purgeLoading, setPurgeLoading] = useState<boolean>(false);
  const [purgeError, setPurgeError] = useState<string | null>(null);
  const [showRfidPurgeConfirm, setShowRfidPurgeConfirm] = useState<boolean>(false);
  const [rfidPurgeLoading, setRfidPurgeLoading] = useState<boolean>(false);
  const [rfidPurgeError, setRfidPurgeError] = useState<string | null>(null);
  const [purgeType, setPurgeType] = useState<string>('none');

  const [loadingStates, setLoadingStates] = useState({
    members: false,
    courts: false,
    sales: false,
    transactions: false,
    attendance: false,
    enhanced: false
  });

  const [metrics, setMetrics] = useState({
    members: {
      total: 0,
      pointsRevenue: 0,
      newThisMonth: 0,
      pointsRetention: 0
    },
    courts: {
      utilization: 0,
      revenue: 0,
      topClients: [],
      utilizationByDay: []
    },
    sales: {
      total: 0,
      byCategory: []
    },
    gymPoints: {
      totalPointsSold: 0,
      totalPointsUsed: 0,
      averagePointsPerMember: 0,
      pointPackagesSold: []
    },
    areas: {
      gym: { totalIncome: 0, totalExpense: 0, netProfit: 0, transactionCount: 0 },
      courts: { totalIncome: 0, totalExpense: 0, netProfit: 0, transactionCount: 0 },
      shop: { totalIncome: 0, totalExpense: 0, netProfit: 0, transactionCount: 0 }
    },
    financialComparison: []
  });

  const [activeFilters, setActiveFilters] = useState({
    category: '',
    location: '',
    type: ''
  });
  const prevMetricsRef = useRef({ ...metrics });
  
  const fetchData = useCallback(async (showLoading = true) => {
    if (showLoading) setLoading(true);
    try {
      setErrorMessage(null);
      const start = format(startOfDay(dateRange.start), "yyyy-MM-dd'T'HH:mm:ss");
      const end = format(endOfDay(dateRange.end), "yyyy-MM-dd'T'HH:mm:ss");
      const cacheBuster = Date.now();

      const [transactionData, membersData, courtsData, enhancedData] = await Promise.all([
        fetchWithRetry(`/api/transactions?start=${start}&end=${end}&_=${cacheBuster}`),
        fetchWithRetry(`/api/analytics/members/summary`),
        fetchWithRetry(`/api/analytics/courts?start=${start}&end=${end}&_=${cacheBuster}`),
        fetchWithRetry(`/api/analytics/financial?start=${start}&end=${end}&_=${cacheBuster}`)
      ]);
      
      if (transactionData) {
        setTransactions(transactionData.transactions || []);
        
        const salesTotal = transactionData.summary?.totalIncome || 0;
        setMetrics(prev => ({
          ...prev,
          sales: {
            ...prev.sales,
            total: salesTotal,
            byCategory: transactionData.chartData?.categoryData?.map(item => ({
              name: translateCategory(item.category),
              value: item.total,
              originalName: item.category
            })) || []
          }
        }));
      }

      if (membersData) {
        const memberCount = membersData.total || 0;

        let pointsRevenue = 0;
        let pointsRetention = 0;
        try {
          const pointsData = await fetchWithRetry(`/api/analytics/members/points?start=${start}&end=${end}&_=${cacheBuster}`);
          pointsRevenue = pointsData?.pointsRevenue || 0;
          pointsRetention = pointsData?.retention || 0;
        } catch (err) {
          console.error("Error fetching points data:", err);
        }

        setMetrics(prev => ({
          ...prev,
          members: {
            ...prev.members,
            total: memberCount,
            pointsRevenue: pointsRevenue,
            pointsRetention: pointsRetention,
          }
        }));
      }

      if (courtsData) {
        setMetrics(prev => ({
          ...prev,
          courts: {
            ...prev.courts,
            utilization: courtsData.utilization || 0,
            revenue: courtsData.revenue || 0,
            topClients: courtsData.topClients || [],
            utilizationByDay: courtsData.utilizationByDay || []
          }
        }));
      }

      if (enhancedData) {
        prevMetricsRef.current = { ...metrics };

        setMetrics(prev => ({
          ...prev,
          areas: enhancedData.areas || prev.areas,
          gymPoints: {
            totalPointsSold: enhancedData.gymPoints?.totalPointsSold || prev.gymPoints.totalPointsSold,
            totalPointsUsed: enhancedData.gymPoints?.totalPointsUsed || prev.gymPoints.totalPointsUsed,
            averagePointsPerMember: enhancedData.gymPoints?.averagePointsPerMember || prev.gymPoints.averagePointsPerMember,
            pointPackagesSold: enhancedData.gymPoints?.pointPackagesSold || prev.gymPoints.pointPackagesSold
          },
          financialComparison: enhancedData.financialComparison || prev.financialComparison
        }));
      }

    } catch (error) {
      console.error('Error fetching data:', error);
      setErrorMessage("Error al cargar datos. Verifique su conexión.");
    } finally {
      if (showLoading) setLoading(false);
      setLastRefresh(new Date());
    }
  }, [dateRange]);

  useEffect(() => {
    fetchData(true);
  }, [dateRange, fetchData]);

  useEffect(() => {
    if (!autoRefresh) return;

    const intervalId = setInterval(() => {
      fetchData(false);
    }, 10000);

    return () => clearInterval(intervalId);
  }, [autoRefresh, fetchData]);

  useEffect(() => {
    if (!transactions.length) return;

    const { category, location, type } = activeFilters;
    if (!category && !location && !type) {
      setFilteredTransactions(null);
      return;
    }

    let filtered = [...transactions];
    if (category) filtered = filtered.filter(t => t.category === category);
    if (location) filtered = filtered.filter(t => t.location === location);
    if (type) filtered = filtered.filter(t => t.type === type);

    setFilteredTransactions(filtered);
  }, [activeFilters, transactions]);

  const applyDatePreset = (preset: string) => {
    const today = new Date();
    let start: Date, end: Date = today;

    switch (preset) {
      case 'last7days': start = subDays(today, 6); break;
      case 'last30days': start = subDays(today, 29); break;
      case 'thisMonth': start = startOfMonth(today); break;
      case 'thisWeek': start = startOfWeek(today); end = endOfWeek(today); break;
      case 'lastMonth':
        start = startOfMonth(subDays(today, 31));
        end = endOfMonth(subDays(today, 31));
        break;
      default: start = subDays(today, 29);
    }

    setDateRange({ start, end });
    setActivePreset(preset);
  };

  const calculateTotalSales = () => {
    return (metrics.areas.gym.totalIncome || 0) +
      (metrics.areas.courts.totalIncome || 0) +
      (metrics.areas.shop.totalIncome || 0);
  };

  const handlePurgeData = async () => {
    setPurgeLoading(true);
    setPurgeError(null);
    try {
      const response = await fetch('/api/transactions/purge', {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
        },
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Error al purgar datos');
      }
      
      setShowPurgeConfirm(false);
      await fetchData(true);
    } catch (error) {
      console.error('Error purging data:', error);
      setPurgeError(error instanceof Error ? error.message : 'Error al purgar datos');
    } finally {
      setPurgeLoading(false);
    }
  };
  
  const handlePurgeRfidLogs = async () => {
    setRfidPurgeLoading(true);
    setRfidPurgeError(null);
    try {
      const response = await fetch('/api/members/rfid/logs/purge', {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
        },
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Error al purgar logs RFID');
      }
      
      setShowRfidPurgeConfirm(false);
    } catch (error) {
      console.error('Error purging RFID logs:', error);
      setRfidPurgeError(error instanceof Error ? error.message : 'Error al purgar logs RFID');
    } finally {
      setRfidPurgeLoading(false);
    }
  };

  const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884d8', '#82ca9d', '#ff7f0e', '#d62728', '#9467bd', '#e377c2'];

  return (
    <div className="container mx-auto px-4 py-6">
      {/* Header y controles */}
      <div className="mb-6 flex justify-between items-center flex-wrap gap-2">
        <div className="flex items-center gap-3">
          <h1 className="text-2xl font-bold text-gray-800">Panel Analítico</h1>
          <div className="relative inline-block">
            <button
              onClick={() => setPurgeType(purgeType === 'none' ? 'show' : 'none')}
              className="px-3 py-1 bg-red-500 hover:bg-red-600 text-white rounded text-sm transition-colors duration-200 shadow-sm flex items-center"
            >
              Purgar Datos
              <svg className="w-4 h-4 ml-1" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
            </button>
            {purgeType === 'show' && (
              <div className="absolute right-0 mt-2 w-48 bg-white rounded-md shadow-lg z-10">
                <div className="py-1">
                  <button
                    onClick={() => {
                      setShowPurgeConfirm(true);
                      setPurgeType('none');
                    }}
                    className="px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 hover:text-gray-900 w-full text-left"
                  >
                    Purgar Transacciones
                  </button>
                  <button
                    onClick={() => {
                      setShowRfidPurgeConfirm(true);
                      setPurgeType('none');
                    }}
                    className="px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 hover:text-gray-900 w-full text-left"
                  >
                    Purgar Logs RFID
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>

        {errorMessage && (
          <div className="w-full mb-4 bg-red-100 text-red-700 px-4 py-2 rounded-md shadow-sm">
            {errorMessage}
          </div>
        )}
        
        <div className="flex flex-wrap gap-3 items-center">
          <div className="flex items-center border rounded-md overflow-hidden shadow-sm bg-white">
            <input
              type="date"
              value={format(dateRange.start, 'yyyy-MM-dd')}
              onChange={(e) => {
                setDateRange({ ...dateRange, start: new Date(e.target.value) });
                setActivePreset('custom');
              }}
              className="text-sm border-none px-3 py-2 focus:outline-none"
              max={format(new Date(), 'yyyy-MM-dd')}
            />
            <span className="mx-1 text-gray-400">-</span>
            <input
              type="date"
              value={format(dateRange.end, 'yyyy-MM-dd')}
              onChange={(e) => {
                setDateRange({ ...dateRange, end: new Date(e.target.value) });
                setActivePreset('custom');
              }}
              className="text-sm border-none px-3 py-2 focus:outline-none"
              max={format(new Date(), 'yyyy-MM-dd')}
            />
          </div>
          
          <div className="flex gap-1 flex-wrap">
            <button
              onClick={() => applyDatePreset('last7days')}
              className={`px-3 py-2 text-xs rounded-md shadow-sm transition-colors duration-200 ${activePreset === 'last7days' ? 'bg-blue-500 text-white' : 'bg-white text-gray-700 hover:bg-gray-50'}`}
            >
              7 días
            </button>
            <button
              onClick={() => applyDatePreset('last30days')}
              className={`px-3 py-2 text-xs rounded-md shadow-sm transition-colors duration-200 ${activePreset === 'last30days' ? 'bg-blue-500 text-white' : 'bg-white text-gray-700 hover:bg-gray-50'}`}
            >
              30 días
            </button>
            <button
              onClick={() => applyDatePreset('thisMonth')}
              className={`px-3 py-2 text-xs rounded-md shadow-sm transition-colors duration-200 ${activePreset === 'thisMonth' ? 'bg-blue-500 text-white' : 'bg-white text-gray-700 hover:bg-gray-50'}`}
            >
              Este mes
            </button>
            <button
              onClick={() => applyDatePreset('thisWeek')}
              className={`px-3 py-2 text-xs rounded-md shadow-sm transition-colors duration-200 ${activePreset === 'thisWeek' ? 'bg-blue-500 text-white' : 'bg-white text-gray-700 hover:bg-gray-50'}`}
            >
              Esta semana
            </button>
          </div>
          
          <div className="flex items-center gap-2">
            <label className="text-xs flex items-center bg-white px-2 py-1 rounded-md shadow-sm">
              <input
                type="checkbox"
                checked={autoRefresh}
                onChange={(e) => setAutoRefresh(e.target.checked)}
                className="mr-1"
              />
              Auto-refresh
            </label>
            <button
              onClick={() => fetchData(true)}
              className="px-3 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded-md text-sm flex items-center transition-colors duration-200 shadow-sm"
              disabled={loading}
            >
              {loading ? (
                <svg className="animate-spin h-4 w-4 mr-1" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
              ) : (
                <svg className="h-4 w-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                </svg>
              )}
              Actualizar
            </button>
            <div className="text-xs text-gray-500 bg-white px-2 py-1 rounded-md shadow-sm">
              {format(lastRefresh, 'HH:mm:ss')}
            </div>
          </div>
        </div>
        
        <div className="w-full flex border-b mt-2">
          <button
            className={`px-4 py-2 text-sm transition-colors duration-200 ${view === 'chart' ? 'border-b-2 border-blue-500 text-blue-600 font-medium' : 'text-gray-600 hover:text-gray-800'}`}
            onClick={() => setView('chart')}
          >
            Gráficos
          </button>
          <button
            className={`px-4 py-2 text-sm transition-colors duration-200 ${view === 'transactions' ? 'border-b-2 border-blue-500 text-blue-600 font-medium' : 'text-gray-600 hover:text-gray-800'}`}
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
          secondary={`${formatCurrency(metrics.members.pointsRevenue || 0)} en puntos`}
          trend={`${metrics.members.pointsRetention || 0}% activos del total`}
          icon="users"
          loading={loadingStates.members || loading}
        />
        <MetricCard
          title="Uso de Canchas"
          value={metrics.courts.utilization}
          previousValue={prevMetricsRef.current.courts.utilization}
          secondary={`${formatCurrency(metrics.courts.revenue || 0)} en ingresos`}
          trend={`${metrics.areas.courts.transactionCount || 0} reservas`}
          icon="court"
          loading={loadingStates.courts || loading}
          suffix="%"
        />
        <MetricCard
          title="Ventas Totales"
          value={calculateTotalSales()}
          previousValue={prevMetricsRef.current.sales.total}
          secondary="Todos los ingresos"
          trend={`Ganancia: ${formatCurrency(
            (metrics.areas.gym.netProfit || 0) +
            (metrics.areas.courts.netProfit || 0) +
            (metrics.areas.shop.netProfit || 0)
          )}`}
          icon="money"
          loading={loading}
          formatAsCurrency={true}
        />
        <MetricCard
          title="Puntos Vendidos"
          value={metrics.gymPoints.totalPointsSold}
          previousValue={prevMetricsRef.current.gymPoints.totalPointsSold}
          secondary={`${metrics.gymPoints.totalPointsUsed || 0} puntos usados`}
          trend={`Prom: $${(metrics.gymPoints.totalPointsSold > 0 && metrics.members.total > 0)
            ? Math.round(metrics.gymPoints.totalPointsSold / metrics.members.total)
            : 0}/miembro`}
          icon="chart"
          loading={loadingStates.enhanced || loading}
          formatAsCurrency={true}
        />
      </div>

      {/* Vista de gráficos */}
      {view === 'chart' && (
        <>
          {/* Gráfico comparativo */}
          <div className="mb-6">
            <ChartCard title="Comparativa Ingresos vs Gastos" loading={loading}>
              {metrics.financialComparison && metrics.financialComparison.length > 0 ? (
                <ResponsiveContainer width="100%" height={300}>
                  <ComposedChart data={metrics.financialComparison}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="date" />
                    <YAxis />
                    <Tooltip formatter={(value) => formatCurrency(Number(value))} />
                    <Legend />
                    <Bar dataKey="income" name="Ingresos" fill="#4CAF50" />
                    <Bar dataKey="expense" name="Gastos" fill="#F44336" />
                    <Line type="monotone" dataKey="balance" name="Balance" stroke="#2196F3" />
                  </ComposedChart>
                </ResponsiveContainer>
              ) : (
                <div className="h-64 flex items-center justify-center text-gray-500">
                  No hay datos suficientes
                </div>
              )}
            </ChartCard>
          </div>

          {/* Gráficos por área */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mb-6">
            <ChartCard title="Método de pago" loading={loading}>
              <ResponsiveContainer width="100%" height={250}>
                <PieChart>
                  <Pie
                    data={[
                      { name: 'Efectivo', value: transactions.filter(t => t.paymentMethod === 'cash').reduce((sum, t) => sum + t.amount, 0) },
                      { name: 'Transferencia', value: transactions.filter(t => t.paymentMethod === 'transfer').reduce((sum, t) => sum + t.amount, 0) },
                      { name: 'Tarjeta', value: transactions.filter(t => t.paymentMethod === 'card').reduce((sum, t) => sum + t.amount, 0) }
                    ]}
                    dataKey="value"
                    nameKey="name"
                    cx="50%"
                    cy="50%"
                    outerRadius={80}
                    fill="#8884d8"
                    label={(entry) => `${entry.name}: ${Math.round(entry.percent * 100)}%`}
                  >
                    {[0, 1, 2].map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(value) => formatCurrency(Number(value))} />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            </ChartCard>

            <ChartCard title="Ocupación de Canchas" loading={loading}>
              {metrics.courts.utilizationByDay && metrics.courts.utilizationByDay.length > 0 ? (
                <ResponsiveContainer width="100%" height={250}>
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
                      label
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
          </div>
        </>
      )}

      {/* Vista de transacciones */}
      {view === 'transactions' && (
        <div className="bg-white rounded-lg shadow-md overflow-hidden">
          <div className="px-4 py-3 border-b">
            <h3 className="text-gray-700 font-medium">Registro de Transacciones</h3>
            <div className="flex flex-wrap gap-2 mt-2 mb-3">
              <div className="flex items-center gap-2 flex-wrap">
                <select
                  className="border rounded-md p-2 text-sm bg-white shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  onChange={(e) => setActiveFilters(prev => ({ ...prev, category: e.target.value }))}
                  value={activeFilters.category}
                >
                  <option value="">Todas las categorías</option>
                  {Array.from(new Set(transactions.map(t => t.category))).map((cat, idx) => (
                    <option key={idx} value={cat}>{translateCategory(cat)}</option>
                  ))}
                </select>

                <select
                  className="border rounded-md p-2 text-sm bg-white shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  onChange={(e) => setActiveFilters(prev => ({ ...prev, location: e.target.value }))}
                  value={activeFilters.location}
                >
                  <option value="">Todas las ubicaciones</option>
                  {Array.from(new Set(transactions.map(t => t.location).filter(Boolean))).map((loc, idx) => (
                    <option key={idx} value={loc}>{loc}</option>
                  ))}
                </select>

                <select
                  className="border rounded-md p-2 text-sm bg-white shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  onChange={(e) => setActiveFilters(prev => ({ ...prev, type: e.target.value }))}
                  value={activeFilters.type}
                >
                  <option value="">Todos los tipos</option>
                  <option value="income">Ingresos</option>
                  <option value="expense">Gastos</option>
                </select>

                {(activeFilters.category || activeFilters.location || activeFilters.type) && (
                  <button
                    className="bg-gray-200 text-gray-700 px-3 py-2 rounded-md text-xs hover:bg-gray-300 transition-colors duration-200 shadow-sm"
                    onClick={() => setActiveFilters({ category: '', location: '', type: '' })}
                  >
                    Limpiar filtros
                  </button>
                )}
              </div>
            </div>
          </div>
          <div className="overflow-x-auto">
            <table className="min-w-full">
              <thead>
                <tr className="bg-gray-100">
                  <th className="px-4 py-2 text-left text-xs font-medium text-gray-600">Fecha</th>
                  <th className="px-4 py-2 text-left text-xs font-medium text-gray-600">Tipo</th>
                  <th className="px-4 py-2 text-left text-xs font-medium text-gray-600">Usuario</th>
                  <th className="px-4 py-2 text-left text-xs font-medium text-gray-600">Categoría</th>
                  <th className="px-4 py-2 text-left text-xs font-medium text-gray-600">Monto</th>
                  <th className="px-4 py-2 text-left text-xs font-medium text-gray-600">Método de Pago</th>
                  <th className="px-4 py-2 text-left text-xs font-medium text-gray-600">Ubicación</th>
                  <th className="px-4 py-2 text-left text-xs font-medium text-gray-600">Descripción</th>
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
                ) : (filteredTransactions || transactions).length === 0 ? (
                  <tr>
                    <td colSpan={8} className="px-4 py-4 text-center text-sm text-gray-500">
                      No hay transacciones para mostrar
                    </td>
                  </tr>
                ) : (
                  (filteredTransactions || transactions).map((transaction, idx) => (
                    <tr key={idx} className="border-b hover:bg-gray-50">
                      <td className="px-4 py-2 text-sm">
                        {format(new Date(transaction.createdAt), 'dd/MM/yyyy HH:mm')}
                      </td>
                      <td className="px-4 py-2 text-sm">
                        <span className={`px-2 py-1 rounded-full text-xs ${transaction.type === 'income' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                          {transaction.type === 'income' ? 'Ingreso' : 'Gasto'}
                        </span>
                      </td>
                      <td className="px-4 py-2 text-sm">
                        {transaction.user?.name || '-'}
                      </td>
                      <td className="px-4 py-2 text-sm">{translateCategory(transaction.category)}</td>
                      <td className="px-4 py-2 text-sm font-medium">
                        <span className={transaction.type === 'income' ? 'text-green-600' : 'text-red-600'}>
                          {formatCurrency(transaction.amount)}
                        </span>
                      </td>
                      <td className="px-4 py-2 text-sm">{translatePaymentMethod(transaction.paymentMethod)}</td>
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

      {/* Modal de confirmación para purgar transacciones */}
      {showPurgeConfirm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-lg p-6 max-w-md w-full">
            <h3 className="text-lg font-bold text-gray-900 mb-3">Confirmar Purga de Transacciones</h3>
            <p className="text-sm text-gray-700 mb-4">
              ¿Estás seguro de que deseas eliminar todas las transacciones? Esta acción no se puede deshacer.
            </p>
            
            {purgeError && (
              <div className="mb-4 bg-red-100 text-red-700 p-3 rounded-md text-sm">
                {purgeError}
              </div>
            )}
            
            <div className="flex justify-end gap-3">
              <button
                onClick={() => setShowPurgeConfirm(false)}
                className="px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
                disabled={purgeLoading}
              >
                Cancelar
              </button>
              <button
                onClick={handlePurgeData}
                className="px-4 py-2 bg-red-600 text-white rounded-md text-sm font-medium hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500"
                disabled={purgeLoading}
              >
                {purgeLoading ? (
                  <span className="flex items-center">
                    <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    Eliminando...
                  </span>
                ) : (
                  'Confirmar Eliminación'
                )}
              </button>
            </div>
          </div>
        </div>
      )}
      
      {/* Modal de confirmación para purgar logs RFID */}
      {showRfidPurgeConfirm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-lg p-6 max-w-md w-full">
            <h3 className="text-lg font-bold text-gray-900 mb-3">Confirmar Purga de Logs RFID</h3>
            <p className="text-sm text-gray-700 mb-4">
              ¿Estás seguro de que deseas eliminar todos los logs de acceso RFID? Esta acción no se puede deshacer.
            </p>
            
            {rfidPurgeError && (
              <div className="mb-4 bg-red-100 text-red-700 p-3 rounded-md text-sm">
                {rfidPurgeError}
              </div>
            )}
            
            <div className="flex justify-end gap-3">
              <button
                onClick={() => setShowRfidPurgeConfirm(false)}
                className="px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
                disabled={rfidPurgeLoading}
              >
                Cancelar
              </button>
              <button
                onClick={handlePurgeRfidLogs}
                className="px-4 py-2 bg-red-600 text-white rounded-md text-sm font-medium hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500"
                disabled={rfidPurgeLoading}
              >
                {rfidPurgeLoading ? (
                  <span className="flex items-center">
                    <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    Eliminando...
                  </span>
                ) : (
                  'Confirmar Eliminación'
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

/* Componentes de UI */

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
  formatAsCurrency?: boolean;
}

const MetricCard: React.FC<MetricCardProps> = ({
  title, value, previousValue = 0, secondary, trend, icon, loading, prefix = '', suffix = '', formatAsCurrency = false
}) => {
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
    <div className="bg-white p-6 rounded-lg shadow-md transition-all duration-300 transform hover:scale-[1.02] hover:shadow-lg">
      <div className="flex justify-between">
        <div>
          <h3 className="text-gray-500 text-sm font-medium">{title}</h3>
          {loading ? (
            <>
              <div className="animate-pulse bg-gray-200 h-8 w-24 rounded mt-1"></div>
              <div className="animate-pulse bg-gray-200 h-4 w-32 rounded mt-1"></div>
              <div className="animate-pulse bg-gray-200 h-4 w-20 rounded mt-2"></div>
            </>
          ) : (
            <>
              <p className="text-2xl font-bold mt-1 transition-all duration-500">
                <AnimatedCounter
                  value={value}
                  previousValue={previousValue}
                  duration={1000}
                  prefix={prefix}
                  suffix={suffix}
                  formatAsNumber={!formatAsCurrency}
                  formatAsCurrency={formatAsCurrency}
                />
              </p>
              <p className="text-sm text-gray-600 mt-1">{secondary}</p>
              <p className="text-xs text-blue-600 mt-2 font-medium">{trend}</p>
            </>
          )}
        </div>
        <div className="transition-transform duration-300 transform hover:scale-110">
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
    <div className="bg-white p-5 rounded-lg shadow-md transition-all duration-300 hover:shadow-lg">
      <h3 className="text-gray-700 font-medium mb-4">{title}</h3>
      {loading ? (
        <div className="animate-pulse bg-gray-200 h-64 w-full rounded"></div>
      ) : (
        <div className="transition-opacity duration-500 opacity-100">
          {children}
        </div>
      )}
    </div>
  );
};