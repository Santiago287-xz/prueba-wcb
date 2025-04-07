'use client';

import { useEffect, useState, useRef, useCallback } from 'react';
import { format, subDays, startOfMonth, startOfDay, endOfDay, isEqual } from 'date-fns';
import TransactionModal from '@/app/components/Transactions/TransactionModal';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell, BarChart, Bar } from 'recharts';

interface Transaction {
  id: string;
  type: 'income' | 'expense';
  category: string;
  amount: number;
  description?: string;
  paymentMethod: string;
  location?: string;
  createdAt: string;
}

interface Summary {
  totalIncome: number;
  totalExpense: number;
  balance: number;
  cashTotal: number;
  cardTotal: number;
  incomeCount: number;
  expenseCount: number;
  cashCount: number;
  cardCount: number;
}

interface ChartData {
  trendData: any[];
  categoryData: any[];
  paymentMethodData: any[];
}

const AnimatedCounter = ({ value, duration = 1000, previousValue = 0 }: { value: number; duration?: number; previousValue?: number }) => {
  const [displayValue, setDisplayValue] = useState(previousValue);
  const prevValueRef = useRef(previousValue);
  const startTime = useRef<number | null>(null);
  const requestRef = useRef<number>();

  const animate = useCallback((timestamp: number) => {
    if (startTime.current === null) {
      startTime.current = timestamp;
    }

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
    if (value !== prevValueRef.current) {
      requestRef.current = requestAnimationFrame(animate);
    }

    return () => {
      if (requestRef.current) {
        cancelAnimationFrame(requestRef.current);
      }
    };
  }, [value, animate]);

  return <>{displayValue.toFixed(2)}</>;
};

const SkeletonLoader = ({ className = "" }: { className?: string }) => (
  <div className={`animate-pulse bg-gray-200 rounded ${className}`}></div>
);

export default function TransactionsPage() {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [dateRange, setDateRange] = useState({
    start: new Date(new Date().setDate(new Date().getDate() - 30)),
    end: new Date()
  });
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [currentTransaction, setCurrentTransaction] = useState<Transaction | null>(null);
  const [view, setView] = useState<'chart' | 'table'>('chart');
  const [loading, setLoading] = useState(false);
  const [initialLoading, setInitialLoading] = useState(true);
  const [paymentMethodView, setPaymentMethodView] = useState<'cash' | 'card'>('cash');
  const [stats, setStats] = useState<Summary>({
    totalIncome: 0,
    totalExpense: 0,
    balance: 0,
    cashTotal: 0,
    cardTotal: 0,
    incomeCount: 0,
    expenseCount: 0,
    cashCount: 0,
    cardCount: 0
  });
  const [chartData, setChartData] = useState<ChartData>({
    trendData: [],
    categoryData: [],
    paymentMethodData: []
  });

  const [autoRefresh, setAutoRefresh] = useState({
    enabled: false,
    interval: 60000
  });

  const [chartInterval, setChartInterval] = useState('month');
  const [lastRefresh, setLastRefresh] = useState(new Date());
  const [activePreset, setActivePreset] = useState('last30');

  const isMounted = useRef(true);
  const previousDateRange = useRef(dateRange);
  const initialLoadComplete = useRef(false);
  const previousStats = useRef<Summary>(stats);
  const lastDataHash = useRef<string>('');
  const currentFilters = useRef({
    dateRange,
    chartInterval,
    activePreset
  });

  // Function to create a hash from data for comparison
  const createDataHash = (data: any): string => {
    return JSON.stringify({
      transactions: data.transactions?.length,
      income: data.summary?.totalIncome,
      expense: data.summary?.totalExpense,
      lastId: data.transactions?.[0]?.id
    });
  };

  // Update currentFilters ref when filters change
  useEffect(() => {
    currentFilters.current = {
      dateRange,
      chartInterval,
      activePreset
    };
  }, [dateRange, chartInterval, activePreset]);

  useEffect(() => {
    return () => {
      isMounted.current = false;
    };
  }, []);

  useEffect(() => {
    if (!initialLoadComplete.current) {
      initialLoadComplete.current = true;
      fetchTransactions();
    }
  }, []);

  useEffect(() => {
    // Only fetch if the date range has changed
    const startChanged = !isEqual(dateRange.start, previousDateRange.current.start);
    const endChanged = !isEqual(dateRange.end, previousDateRange.current.end);

    if (startChanged || endChanged) {
      previousDateRange.current = dateRange;
      fetchTransactions();
    }
  }, [dateRange]);

  useEffect(() => {
    fetchTransactions();
  }, [chartInterval]);

  useEffect(() => {
    let intervalId: NodeJS.Timeout;

    if (autoRefresh.enabled) {
      intervalId = setInterval(() => {
        if (isMounted.current) {
          // Use the currentFilters ref to ensure we respect the user's selection
          fetchTransactions(false);
          setLastRefresh(new Date());
        }
      }, autoRefresh.interval);
    }

    return () => {
      if (intervalId) clearInterval(intervalId);
    };
  }, [autoRefresh]);

  const fetchTransactions = async (showLoadingState = true) => {
    if (showLoadingState) {
      setLoading(true);
    }

    try {
      // Use current filters from ref to ensure we respect user selections
      const filters = currentFilters.current;

      // Format using end of day to include the full selected day
      const start = format(startOfDay(filters.dateRange.start), 'yyyy-MM-dd\'T\'HH:mm:ss');
      const end = format(endOfDay(filters.dateRange.end), 'yyyy-MM-dd\'T\'HH:mm:ss');

      const response = await fetch(`/api/transactions?start=${start}&end=${end}&interval=${filters.chartInterval}`);
      if (!response.ok) throw new Error('Error al cargar transacciones');

      const data = await response.json();

      // Create data hash to check if anything changed
      const newDataHash = createDataHash(data);

      // Only update state if data changed
      if (lastDataHash.current !== newDataHash) {
        previousStats.current = stats;

        // Add card total to summary if not present
        if (data.summary && !data.summary.cardTotal) {
          data.summary.cardTotal = data.summary.totalIncome + data.summary.totalExpense - data.summary.cashTotal;
          data.summary.cardCount = data.transactions.filter((t: Transaction) =>
            t.paymentMethod.toLowerCase().includes('tarjeta') ||
            t.paymentMethod.toLowerCase().includes('card')
          ).length;
        }

        const paymentMethodData = generatePaymentMethodData(data.transactions);

        setTransactions(data.transactions);
        setStats(data.summary);
        setChartData({
          trendData: data.chartData.trendData,
          categoryData: data.chartData.categoryData,
          paymentMethodData
        });

        lastDataHash.current = newDataHash;
      }

      setLastRefresh(new Date());
    } catch (error) {
      console.error('Error:', error);
    } finally {
      setLoading(false);
      setInitialLoading(false);
    }
  };

  const generatePaymentMethodData = (transactionData: Transaction[]) => {
    if (!transactionData || transactionData.length === 0) {
      return [];
    }

    const methodCounts: Record<string, { count: number, amount: number }> = {};

    transactionData.forEach(t => {
      if (!methodCounts[t.paymentMethod]) {
        methodCounts[t.paymentMethod] = { count: 0, amount: 0 };
      }
      methodCounts[t.paymentMethod].count += 1;
      methodCounts[t.paymentMethod].amount += t.amount;
    });

    return Object.entries(methodCounts).map(([method, data]) => ({
      method,
      count: data.count,
      amount: data.amount,
      percentage: Math.round((data.count / transactionData.length) * 100) || 0
    }));
  };

  const handleSaveTransaction = async (transaction: any) => {
    try {
      const method = transaction.id ? 'PUT' : 'POST';
      const url = transaction.id ? `/api/transactions/${transaction.id}` : '/api/transactions';

      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(transaction)
      });
      if (!response.ok) throw new Error('Error al guardar la transacción');

      fetchTransactions();
      setIsModalOpen(false);
    } catch (error) {
      console.error('Error:', error);
    }
  };

  const handleDeleteTransaction = async (id: string) => {
    if (!confirm('¿Estás seguro de eliminar esta transacción?')) return;

    try {
      const response = await fetch(`/api/transactions/${id}`, {
        method: 'DELETE'
      });

      if (!response.ok) throw new Error('Error al eliminar la transacción');

      fetchTransactions();
    } catch (error) {
      console.error('Error:', error);
    }
  };

  const exportToCSV = () => {
    const headers = ['Fecha', 'Tipo', 'Categoría', 'Monto', 'Método', 'Descripción'];
    const csvData = transactions.map(t => [
      format(new Date(t.createdAt), 'dd/MM/yyyy'),
      t.type === 'income' ? 'Ingreso' : 'Gasto',
      t.category,
      t.amount.toFixed(2),
      t.paymentMethod,
      t.description || ''
    ]);

    const csvContent = [
      headers.join(','),
      ...csvData.map(row => row.join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `transacciones_${format(new Date(), 'yyyy-MM-dd')}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const applyDatePreset = (preset: string) => {
    const today = new Date();
    let start = new Date();
    let end = new Date(today);

    switch (preset) {
      case 'today':
        start = startOfDay(today);
        end = endOfDay(today);
        break;
      case 'yesterday':
        start = startOfDay(subDays(today, 1));
        end = endOfDay(subDays(today, 1));
        break;
      case 'last7':
        start = startOfDay(subDays(today, 6));
        end = endOfDay(today);
        break;
      case 'last30':
        start = startOfDay(subDays(today, 29));
        end = endOfDay(today);
        break;
      case 'thisMonth':
        start = startOfMonth(today);
        end = endOfDay(today);
        break;
      case 'lastMonth': {
        const lastMonth = new Date(today.getFullYear(), today.getMonth() - 1, 1);
        start = startOfMonth(lastMonth);
        const lastDayOfMonth = new Date(today.getFullYear(), today.getMonth(), 0);
        end = endOfDay(lastDayOfMonth);
        break;
      }
      default:
        start = subDays(today, 29);
    }

    setDateRange({ start, end });
    setActivePreset(preset);
  };

  const togglePaymentMethodView = () => {
    setPaymentMethodView(prev => prev === 'cash' ? 'card' : 'cash');
  };

  // Custom Recharts tooltip to prevent label truncation
  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-white p-2 border shadow-md rounded text-xs">
          <p className="font-medium">{label}</p>
          {payload.map((entry: any, index: number) => (
            <p key={`item-${index}`} style={{ color: entry.color }}>
              {entry.name}: ${entry.value.toFixed(2)}
            </p>
          ))}
        </div>
      );
    }
    return null;
  };

  // Recharts custom label for Pie charts
  const renderCustomizedLabel = ({ cx, cy, midAngle, innerRadius, outerRadius, percent, index, name }: any) => {
    const RADIAN = Math.PI / 200;
    const radius = innerRadius + (outerRadius - innerRadius) * 0.5;
    const x = cx + radius * Math.cos(-midAngle * RADIAN);
    const y = cy + radius * Math.sin(-midAngle * RADIAN);

    return (
      <text
        x={x}
        y={y}
        fill="white"
        textAnchor={x > cx ? 'start' : 'end'}
        dominantBaseline="central"
        fontSize={10}
      >
        {`${(percent * 100).toFixed(0)}%`}
      </text>
    );
  };

  const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884d8', '#82ca9d', '#a4de6c', '#d0ed57'];

  return (
    <div className="container mx-auto p-2 sm:p-4 overflow-hidden">
      <h1 className="text-xl sm:text-2xl font-bold mb-4 sm:mb-6">Tablero de Transacciones</h1>

      <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center mb-4 sm:mb-6 gap-2">
        <div className="flex flex-col sm:flex-row items-start sm:items-center w-full gap-2">
          <div className="border rounded p-1 sm:p-2 flex items-center justify-center w-full md:w-auto">
            <input
              type="date"
              value={format(dateRange.start, 'yyyy-MM-dd')}
              onChange={(e) => {
                setDateRange({ ...dateRange, start: new Date(e.target.value) });
                setActivePreset('custom');
              }}
              className="text-sm p-1"
            />
            <span className="mx-1 sm:mx-2">-</span>
            <input
              type="date"
              value={format(dateRange.end, 'yyyy-MM-dd')}
              onChange={(e) => {
                setDateRange({ ...dateRange, end: new Date(e.target.value) });
                setActivePreset('custom');
              }}
              className="text-sm p-1"
            />
          </div>

          <div className="flex flex-wrap gap-1">
            <button
              onClick={() => applyDatePreset('today')}
              className={`px-2 py-1 text-xs rounded ${activePreset === 'today' ? 'bg-blue-500 text-white' : 'bg-gray-200'}`}
            >
              Hoy
            </button>
            <button
              onClick={() => applyDatePreset('yesterday')}
              className={`px-2 py-1 text-xs rounded ${activePreset === 'yesterday' ? 'bg-blue-500 text-white' : 'bg-gray-200'}`}
            >
              Ayer
            </button>
            <button
              onClick={() => applyDatePreset('last7')}
              className={`px-2 py-1 text-xs rounded ${activePreset === 'last7' ? 'bg-blue-500 text-white' : 'bg-gray-200'}`}
            >
              7 días
            </button>
            <button
              onClick={() => applyDatePreset('last30')}
              className={`px-2 py-1 text-xs rounded ${activePreset === 'last30' ? 'bg-blue-500 text-white' : 'bg-gray-200'}`}
            >
              30 días
            </button>
            <button
              onClick={() => applyDatePreset('thisMonth')}
              className={`px-2 py-1 text-xs rounded ${activePreset === 'thisMonth' ? 'bg-blue-500 text-white' : 'bg-gray-200'}`}
            >
              Este mes
            </button>
            <button
              onClick={() => applyDatePreset('lastMonth')}
              className={`px-2 py-1 text-xs rounded ${activePreset === 'lastMonth' ? 'bg-blue-500 text-white' : 'bg-gray-200'}`}
            >
              Mes anterior
            </button>
          </div>
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto">
          <div className="flex items-center">
            <input
              id="autoRefresh"
              type="checkbox"
              checked={autoRefresh.enabled}
              onChange={(e) => setAutoRefresh({ ...autoRefresh, enabled: e.target.checked })}
              className="mr-1"
            />
            <label htmlFor="autoRefresh" className="text-xs whitespace-nowrap">
              Auto:
            </label>
          </div>

          <select
            value={autoRefresh.interval}
            onChange={(e) => setAutoRefresh({ ...autoRefresh, interval: Number(e.target.value) })}
            className="border rounded text-xs p-1"
            disabled={!autoRefresh.enabled}
          >
            <option value={5000}>5s</option>
            <option value={15000}>15s</option>
            <option value={30000}>30s</option>
            <option value={60000}>1m</option>
            <option value={300000}>5m</option>
          </select>

          <button
            onClick={() => fetchTransactions()}
            className="px-2 py-1 bg-blue-500 text-white rounded text-xs flex items-center ml-auto"
            disabled={loading}
          >
            {loading ? (
              <svg className="animate-spin h-3 w-3 mr-1" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
            ) : (
              <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3 mr-1" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M4 2a1 1 0 011 1v2.101a7.002 7.002 0 0111.601 2.566 1 1 0 11-1.885.666A5.002 5.002 0 005.999 7H9a1 1 0 010 2H4a1 1 0 01-1-1V3a1 1 0 011-1zm.008 9.057a1 1 0 011.276.61A5.002 5.002 0 0014.001 13H11a1 1 0 110-2h5a1 1 0 011 1v5a1 1 0 11-2 0v-2.101a7.002 7.002 0 01-11.601-2.566 1 1 0 01.61-1.276z" clipRule="evenodd" />
              </svg>
            )}
            Actualizar
          </button>

          <button
            onClick={exportToCSV}
            className="px-2 py-1 border rounded flex items-center text-xs"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3 mr-1" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M3 17a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm3.293-7.707a1 1 0 011.414 0L9 10.586V3a1 1 0 112 0v7.586l1.293-1.293a1 1 0 111.414 1.414l-3 3a1 1 0 01-1.414 0l-3-3a1 1 0 010-1.414z" clipRule="evenodd" />
            </svg>
            CSV
          </button>
        </div>
      </div>

      <div className="text-xs text-gray-500 mb-2">
        {autoRefresh.enabled ?
          `Auto-actualización cada ${autoRefresh.interval / 1000}s` :
          `Última actualización: ${format(lastRefresh, 'HH:mm:ss')}`
        }
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-2 sm:gap-4 mb-4 sm:mb-6">
        <div className="bg-white p-3 rounded shadow transition-all hover:shadow-md">
          {initialLoading ? (
            <>
              <SkeletonLoader className="h-5 w-24 mb-2" />
              <SkeletonLoader className="h-8 w-32 mb-2" />
              <SkeletonLoader className="h-4 w-20" />
            </>
          ) : (
            <>
              <h3 className="text-sm sm:text-base font-medium text-green-600 flex items-center">
                <span className="mr-2">↑</span> Ingresos
              </h3>
              <p className="text-lg sm:text-2xl font-bold">$<AnimatedCounter
                value={stats.totalIncome}
                previousValue={previousStats.current.totalIncome}
              /></p>
              <p className="text-xs text-gray-500">{stats.incomeCount} transacciones</p>
            </>
          )}
        </div>

        <div className="bg-white p-3 rounded shadow transition-all hover:shadow-md">
          {initialLoading ? (
            <>
              <SkeletonLoader className="h-5 w-24 mb-2" />
              <SkeletonLoader className="h-8 w-32 mb-2" />
              <SkeletonLoader className="h-4 w-20" />
            </>
          ) : (
            <>
              <h3 className="text-sm sm:text-base font-medium text-red-600 flex items-center">
                <span className="mr-2">↓</span> Gastos
              </h3>
              <p className="text-lg sm:text-2xl font-bold">$<AnimatedCounter
                value={stats.totalExpense}
                previousValue={previousStats.current.totalExpense}
              /></p>
              <p className="text-xs text-gray-500">{stats.expenseCount} transacciones</p>
            </>
          )}
        </div>

        <div className="bg-white p-3 rounded shadow transition-all hover:shadow-md">
          {initialLoading ? (
            <>
              <SkeletonLoader className="h-5 w-24 mb-2" />
              <SkeletonLoader className="h-8 w-32 mb-2" />
              <SkeletonLoader className="h-4 w-20" />
            </>
          ) : (
            <>
              <h3 className="text-sm sm:text-base font-medium">Balance</h3>
              <p className={`text-lg sm:text-2xl font-bold ${stats.balance >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                $<AnimatedCounter
                  value={stats.balance}
                  previousValue={previousStats.current.balance}
                />
              </p>
              <p className="text-xs text-gray-500">{stats.balance >= 0 ? 'Positivo' : 'Negativo'}</p>
            </>
          )}
        </div>

        <div
          className="bg-white p-3 rounded shadow transition-all hover:shadow-md flex items-start cursor-pointer"
          onClick={togglePaymentMethodView}
        >
          {initialLoading ? (
            <div className="w-full">
              <SkeletonLoader className="h-5 w-24 mb-2" />
              <SkeletonLoader className="h-8 w-32 mb-2" />
              <SkeletonLoader className="h-4 w-20" />
            </div>
          ) : (
            <>
              <div>
                <h3 className="text-sm sm:text-base font-medium">{paymentMethodView === 'cash' ? 'Efectivo' : 'Tarjeta'}</h3>
                <p className="text-lg sm:text-2xl font-bold">$<AnimatedCounter
                  value={paymentMethodView === 'cash' ? stats.cashTotal : stats.cardTotal}
                  previousValue={paymentMethodView === 'cash' ? previousStats.current.cashTotal : previousStats.current.cardTotal}
                /></p>
                <p className="text-xs text-gray-500">
                  {paymentMethodView === 'cash' ? stats.cashCount : stats.cardCount} transacciones
                </p>
              </div>
              <div className="ml-auto">
                {paymentMethodView === 'cash' ? (
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 sm:h-6 sm:w-6 text-gray-500" viewBox="0 0 20 20" fill="currentColor">
                    <path d="M4 4a2 2 0 00-2 2v1h16V6a2 2 0 00-2-2H4z" />
                    <path fillRule="evenodd" d="M18 9H2v5a2 2 0 002 2h12a2 2 0 002-2V9zM4 13a1 1 0 011-1h1a1 1 0 110 2H5a1 1 0 01-1-1zm5-1a1 1 0 100 2h1a1 1 0 100-2H9z" clipRule="evenodd" />
                  </svg>
                ) : (
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 sm:h-6 sm:w-6 text-gray-500" viewBox="0 0 20 20" fill="currentColor">
                    <path d="M4 4a2 2 0 00-2 2v4a2 2 0 002 2V12a2 2 0 002 2h8a2 2 0 002-2v-.5a2 2 0 002-2V6a2 2 0 00-2-2H4z" />
                    <path d="M3 13.75a.75.75 0 01.75-.75h1.5a.75.75 0 010 1.5h-1.5a.75.75 0 01-.75-.75zM3 10.75a.75.75 0 01.75-.75h1.5a.75.75 0 010 1.5h-1.5a.75.75 0 01-.75-.75zM7 10.75a.75.75 0 01.75-.75h1.5a.75.75 0 010 1.5h-1.5A.75.75 0 017 10.75zM7 13.75a.75.75 0 01.75-.75h1.5a.75.75 0 010 1.5h-1.5a.75.75 0 01-.75-.75zM11 10.75a.75.75 0 01.75-.75h1.5a.75.75 0 010 1.5h-1.5a.75.75 0 01-.75-.75z" />
                  </svg>
                )}
              </div>
            </>
          )}
        </div>
      </div>

      <div className="mb-4 sm:mb-6">
        <div className="flex border-b">
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
            Tabla
          </button>
        </div>
      </div>

      {view === 'chart' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6 mb-4 sm:mb-6">
          <div className="bg-white p-3 sm:p-4 rounded shadow transition-all hover:shadow-md">
            <div className="flex justify-between items-center mb-2">
              <h3 className="text-sm sm:text-lg font-medium">Ingresos vs Gastos</h3>
              <div className="flex items-center">
                <span className="text-xs mr-2">Agrupar:</span>
                <select
                  value={chartInterval}
                  onChange={(e) => setChartInterval(e.target.value)}
                  className="border rounded p-1 text-xs"
                >
                  <option value="day">Día</option>
                  <option value="week">Semana</option>
                  <option value="month">Mes</option>
                  <option value="quarter">Trimestre</option>
                  <option value="year">Año</option>
                </select>
              </div>
            </div>

            {initialLoading ? (
              <div className="w-full">
                <SkeletonLoader className="h-56 w-full mb-3" />
                <SkeletonLoader className="h-36 w-full" />
              </div>
            ) : (
              <>
                <ResponsiveContainer width="100%" height={220}>
                  <LineChart
                    data={chartData.trendData}
                    margin={{ top: 5, right: 20, left: 0, bottom: 5 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis
                      dataKey={chartInterval === 'day' ? 'date' : chartInterval}
                      tick={{ fontSize: 10 }}
                      tickFormatter={(value) => value?.toString().substring(0, 10) || ""}
                    />
                    <YAxis tick={{ fontSize: 10 }} />
                    <Tooltip content={<CustomTooltip />} />
                    <Legend
                      iconSize={10}
                      wrapperStyle={{ fontSize: 10 }}
                      formatter={(value) => <span style={{ fontSize: 10, color: '#333' }}>{value}</span>}
                    />
                    <Line
                      type="monotone"
                      dataKey="income"
                      stroke="#10B981"
                      name="Ingresos"
                      strokeWidth={2}
                      dot={{ strokeWidth: 1, r: 2 }}
                      activeDot={{ r: 4 }}
                    />
                    <Line
                      type="monotone"
                      dataKey="expense"
                      stroke="#EF4444"
                      name="Gastos"
                      strokeWidth={2}
                      dot={{ strokeWidth: 1, r: 2 }}
                      activeDot={{ r: 4 }}
                    />
                  </LineChart>
                </ResponsiveContainer>

                <div className="mt-3">
                  <ResponsiveContainer width="100%" height={150}>
                    <BarChart
                      data={chartData.trendData}
                      margin={{ top: 5, right: 20, left: 0, bottom: 5 }}
                    >
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis
                        dataKey={chartInterval === 'day' ? 'date' : chartInterval}
                        tick={{ fontSize: 10 }}
                        tickFormatter={(value) => value?.toString().substring(0, 10) || ""}
                        interval="preserveStartEnd"
                      />
                      <YAxis tick={{ fontSize: 10 }} />
                      <Tooltip content={<CustomTooltip />} />
                      <Legend
                        iconSize={10}
                        wrapperStyle={{ fontSize: 10 }}
                        formatter={(value) => <span style={{ fontSize: 10, color: '#333' }}>{value}</span>}
                      />
                      <Bar
                        dataKey="income"
                        fill="#10B981"
                        name="Ingresos"
                        radius={[4, 4, 0, 0]}
                      />
                      <Bar
                        dataKey="expense"
                        fill="#EF4444"
                        name="Gastos"
                        radius={[4, 4, 0, 0]}
                      />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </>
            )}
          </div>
          <div className="hidden sm:grid grid-cols-1 gap-4">
            <div className="bg-white p-3 sm:p-4 rounded shadow transition-all hover:shadow-md">
              <h3 className="text-sm sm:text-lg font-medium mb-2">Transacciones por Categoría</h3>
              {initialLoading ? (
                <SkeletonLoader className="h-44 w-full rounded-lg mx-auto" />
              ) : (
                <ResponsiveContainer width="100%" height={200}>
                  <PieChart margin={{ top: 5, right: 5, left: 5, bottom: 5 }}>
                    <Pie
                      data={chartData.categoryData.sort((a, b) => b.total - a.total)}
                      cx="50%"
                      cy="50%"
                      outerRadius={70}
                      innerRadius={40}
                      paddingAngle={2}
                      fill="#8884d8"
                      dataKey="total"
                      nameKey="category"
                      labelLine={false}
                      animationBegin={0}
                      animationDuration={800}
                    >
                      {chartData.categoryData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip
                      formatter={(value, name) => [`${value}%`, name]}
                      wrapperStyle={{ fontSize: 12 }}
                    />
                    <Legend
                      iconSize={10}
                      layout="horizontal"
                      verticalAlign="bottom"
                      align="center"
                      wrapperStyle={{ fontSize: 10, overflowY: 'auto', marginTop: 10 }}
                      formatter={(value, entry, index) => {
                        const percentage = chartData.categoryData[index].total;
                        const displayName = value.length > 13 ? `${value.substring(0, 13)}...` : value;
                        return <span style={{ fontSize: 10, color: '#333' }}>
                          {displayName} ({percentage}%)
                        </span>;
                      }}
                    />
                  </PieChart>
                </ResponsiveContainer>
              )}
            </div>

            <div className="bg-white p-3 sm:p-4 rounded shadow transition-all hover:shadow-md">
              <h3 className="text-sm sm:text-lg font-medium mb-2">Métodos de Pago</h3>

              {initialLoading ? (
                <SkeletonLoader className="h-44 w-full rounded-lg mx-auto" />
              ) : (
                <ResponsiveContainer width="100%" height={200}>
                  <PieChart margin={{ top: 5, right: 5, left: 5, bottom: 5 }}>
                    <Pie
                      data={chartData.paymentMethodData.sort((a, b) => b.count - a.count)}
                      cx="50%"
                      cy="50%"
                      outerRadius={70}
                      innerRadius={40}
                      paddingAngle={2}
                      fill="#8884d8"
                      dataKey="count"
                      nameKey="method"
                      labelLine={false}
                      animationBegin={0}
                      animationDuration={800}
                    >
                      {chartData.paymentMethodData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip
                      formatter={(value, name, props) => [`${props.payload.percentage}%`, props.payload.method]}
                      wrapperStyle={{ fontSize: 12 }}
                    />
                    <Legend
                      iconSize={8}
                      layout="horizontal"
                      verticalAlign="bottom"
                      align="center"
                      wrapperStyle={{ fontSize: 10, overflowY: 'auto', maxHeight: 40 }}
                      formatter={(value, entry, index) => {
                        const percentage = chartData.paymentMethodData[index].percentage;
                        const displayName = value.length > 13 ? `${value.substring(0, 13)}...` : value;
                        return <span style={{ fontSize: 10, color: '#333' }}>
                          {displayName} ({percentage}%)
                        </span>;
                      }}
                    />
                  </PieChart>
                </ResponsiveContainer>
              )}
            </div>
          </div>
        </div>
      )}

      {view === 'table' && (
        <div className="bg-white rounded shadow overflow-hidden">
          <div className="flex justify-between items-center p-3 sm:p-4 border-b">
            <h3 className="text-sm sm:text-lg font-medium">Todas las transacciones</h3>
            <button
              onClick={() => {
                setCurrentTransaction(null);
                setIsModalOpen(true);
              }}
              className="px-2 py-1 sm:px-4 sm:py-2 bg-blue-500 text-white rounded text-xs sm:text-sm"
            >
              Nueva Transacción
            </button>
          </div>

          <div className="overflow-x-auto">
            <table className="min-w-full">
              <thead>
                <tr className="bg-gray-100">
                  <th className="px-2 sm:px-4 py-1 sm:py-2 text-left text-xs">Fecha</th>
                  <th className="px-2 sm:px-4 py-1 sm:py-2 text-left text-xs hidden sm:block">Descripción</th>
                  <th className="px-2 sm:px-4 py-1 sm:py-2 text-left text-xs">Categoría</th>
                  <th className="px-2 sm:px-4 py-1 sm:py-2 text-left text-xs">Método</th>
                  <th className="px-2 sm:px-4 py-1 sm:py-2 text-left text-xs">Monto</th>
                  <th className="px-2 sm:px-4 py-1 sm:py-2 text-left text-xs hidden sm:block">Acciones</th>
                </tr>
              </thead>
              <tbody>
                {initialLoading ? (
                  Array(5).fill(0).map((_, i) => (
                    <tr key={i} className="border-b">
                      <td className="px-2 sm:px-4 py-1 sm:py-2">
                        <SkeletonLoader className="h-4 w-16" />
                      </td>
                      <td className="px-2 sm:px-4 py-1 sm:py-2">
                        <SkeletonLoader className="h-4 w-24" />
                      </td>
                      <td className="px-2 sm:px-4 py-1 sm:py-2">
                        <SkeletonLoader className="h-4 w-20" />
                      </td>
                      <td className="px-2 sm:px-4 py-1 sm:py-2">
                        <SkeletonLoader className="h-4 w-16" />
                      </td>
                      <td className="px-2 sm:px-4 py-1 sm:py-2">
                        <SkeletonLoader className="h-4 w-16" />
                      </td>
                      <td className="px-2 sm:px-4 py-1 sm:py-2">
                        <SkeletonLoader className="h-4 w-20" />
                      </td>
                    </tr>
                  ))
                ) : loading ? (
                  <tr>
                    <td colSpan={6} className="px-2 sm:px-4 py-3 sm:py-4 text-center text-xs">
                      <div className="flex justify-center items-center">
                        <svg className="animate-spin h-4 w-4 text-blue-500 mr-2" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                        </svg>
                        Actualizando datos...
                      </div>
                    </td>
                  </tr>
                ) : transactions.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-2 sm:px-4 py-1 sm:py-2 text-center text-xs">No hay transacciones para mostrar.</td>
                  </tr>
                ) : (
                  transactions.map((transaction) => (
                    <tr key={transaction.id} className="border-b hover:bg-gray-50 transition-colors" onClick={() => {
                      setCurrentTransaction(transaction);
                      setIsModalOpen(true);
                    }}>
                      <td className="px-2 sm:px-4 py-1 sm:py-2 text-xs">
                        {format(new Date(transaction.createdAt), 'dd/MM/yyyy')}
                      </td>
                      <td className="px-2 sm:px-4 py-1 sm:py-2 text-xs truncate max-w-[150px] hidden sm:block">{transaction.description || '-'}</td>
                      <td className="px-2 sm:px-4 py-1 sm:py-2 text-xs">{transaction.category}</td>
                      <td className="px-2 sm:px-4 py-1 sm:py-2 text-xs">{transaction.paymentMethod}</td>
                      <td className={`px-2 sm:px-4 py-1 sm:py-2 text-xs font-medium ${transaction.type === 'income' ? 'text-green-600' : 'text-red-600'}`}>
                        {transaction.type === 'income' ? '+' : '-'}${transaction.amount.toFixed(2)}
                      </td>
                      <td className="px-2 sm:px-4 py-1 sm:py-2 text-xs hidden sm:inline-block">
                        <button
                          onClick={() => {
                            setCurrentTransaction(transaction);
                            setIsModalOpen(true);
                          }}
                          className="text-blue-500 mr-2 hover:underline"
                        >
                          Editar
                        </button>
                        <button
                          onClick={() => handleDeleteTransaction(transaction.id)}
                          className="text-red-500 hover:underline"
                        >
                          Eliminar
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {isModalOpen && (
        <TransactionModal
          transaction={currentTransaction}
          onClose={() => setIsModalOpen(false)}
          onSave={handleSaveTransaction}
        />
      )}
    </div>
  );
}