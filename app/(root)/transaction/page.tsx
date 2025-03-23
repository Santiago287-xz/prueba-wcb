'use client';

import { useEffect, useState } from 'react';
import { format } from 'date-fns';
import TransactionModal from '@/components/transactions/TransactionModal';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';

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

export default function TransactionsPage() {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [dateRange, setDateRange] = useState({
    start: new Date(new Date().setDate(new Date().getDate() - 30)),
    end: new Date()
  });
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [currentTransaction, setCurrentTransaction] = useState<Transaction | null>(null);
  const [view, setView] = useState<'chart' | 'table'>('chart');
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    totalIncome: 0,
    totalExpense: 0,
    balance: 0,
    cashTotal: 0,
    incomeCount: 0,
    expenseCount: 0,
    cashCount: 0
  });
  const [chartData, setChartData] = useState({
    trendData: [],
    categoryData: []
  });

  useEffect(() => {
    fetchTransactions();
  }, [dateRange]);

  const fetchTransactions = async () => {
    setLoading(true);
    try {
      const start = format(dateRange.start, 'yyyy-MM-dd');
      const end = format(dateRange.end, 'yyyy-MM-dd');
      
      const response = await fetch(`/api/transactions?start=${start}&end=${end}`);
      if (!response.ok) throw new Error('Error al cargar transacciones');
      
      const data = await response.json();
      setTransactions(data.transactions);
      setStats(data.summary);
      setChartData(data.chartData);
    } catch (error) {
      console.error('Error:', error);
    } finally {
      setLoading(false);
    }
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

  const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884d8', '#82ca9d'];

  return (
    <div className="container mx-auto p-4">
      <h1 className="text-2xl font-bold mb-6">Tablero de Transacciones</h1>
      
      <div className="flex flex-col md:flex-row justify-between items-center mb-6">
        <div className="border rounded p-2 flex items-center mb-2 md:mb-0">
          <input
            type="date"
            value={format(dateRange.start, 'yyyy-MM-dd')}
            onChange={(e) => setDateRange({ ...dateRange, start: new Date(e.target.value) })}
            className="mr-2"
          />
          <span className="mx-2">-</span>
          <input
            type="date"
            value={format(dateRange.end, 'yyyy-MM-dd')}
            onChange={(e) => setDateRange({ ...dateRange, end: new Date(e.target.value) })}
          />
        </div>
        
        <div className="flex">
          <button
            onClick={fetchTransactions}
            className="px-4 py-2 bg-blue-500 text-white rounded mr-2 flex items-center"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-1" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M4 2a1 1 0 011 1v2.101a7.002 7.002 0 0111.601 2.566 1 1 0 11-1.885.666A5.002 5.002 0 005.999 7H9a1 1 0 010 2H4a1 1 0 01-1-1V3a1 1 0 011-1zm.008 9.057a1 1 0 011.276.61A5.002 5.002 0 0014.001 13H11a1 1 0 110-2h5a1 1 0 011 1v5a1 1 0 11-2 0v-2.101a7.002 7.002 0 01-11.601-2.566 1 1 0 01.61-1.276z" clipRule="evenodd" />
            </svg>
            Actualizar
          </button>
          <button
            onClick={exportToCSV}
            className="px-4 py-2 border rounded flex items-center"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-1" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M3 17a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm3.293-7.707a1 1 0 011.414 0L9 10.586V3a1 1 0 112 0v7.586l1.293-1.293a1 1 0 111.414 1.414l-3 3a1 1 0 01-1.414 0l-3-3a1 1 0 010-1.414z" clipRule="evenodd" />
            </svg>
            Exportar
          </button>
        </div>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <div className="bg-white p-4 rounded shadow">
          <h3 className="text-lg font-medium text-green-600 flex items-center">
            <span className="mr-2">↑</span> Ingresos Totales
          </h3>
          <p className="text-2xl font-bold">${stats.totalIncome.toFixed(2)}</p>
          <p className="text-sm text-gray-500">{stats.incomeCount} transacciones</p>
        </div>
        
        <div className="bg-white p-4 rounded shadow">
          <h3 className="text-lg font-medium text-red-600 flex items-center">
            <span className="mr-2">↓</span> Gastos Totales
          </h3>
          <p className="text-2xl font-bold">${stats.totalExpense.toFixed(2)}</p>
          <p className="text-sm text-gray-500">{stats.expenseCount} transacciones</p>
        </div>
        
        <div className="bg-white p-4 rounded shadow">
          <h3 className="text-lg font-medium">Balance</h3>
          <p className={`text-2xl font-bold ${stats.balance >= 0 ? 'text-green-600' : 'text-red-600'}`}>
            ${stats.balance.toFixed(2)}
          </p>
          <p className="text-sm text-gray-500">{stats.balance >= 0 ? 'Positivo' : 'Negativo'}</p>
        </div>
        
        <div className="bg-white p-4 rounded shadow flex items-start">
          <div>
            <h3 className="text-lg font-medium">Efectivo</h3>
            <p className="text-2xl font-bold">${stats.cashTotal.toFixed(2)}</p>
            <p className="text-sm text-gray-500">{stats.cashCount} transacciones</p>
          </div>
          <div className="ml-auto">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-gray-500" viewBox="0 0 20 20" fill="currentColor">
              <path d="M4 4a2 2 0 00-2 2v1h16V6a2 2 0 00-2-2H4z" />
              <path fillRule="evenodd" d="M18 9H2v5a2 2 0 002 2h12a2 2 0 002-2V9zM4 13a1 1 0 011-1h1a1 1 0 110 2H5a1 1 0 01-1-1zm5-1a1 1 0 100 2h1a1 1 0 100-2H9z" clipRule="evenodd" />
            </svg>
          </div>
        </div>
      </div>
      
      <div className="mb-6">
        <div className="flex border-b">
          <button
            className={`px-4 py-2 ${view === 'chart' ? 'border-b-2 border-blue-500 font-medium' : ''}`}
            onClick={() => setView('chart')}
          >
            Gráficos
          </button>
          <button
            className={`px-4 py-2 ${view === 'table' ? 'border-b-2 border-blue-500 font-medium' : ''}`}
            onClick={() => setView('table')}
          >
            Tabla
          </button>
        </div>
      </div>
      
      {view === 'chart' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
          <div className="bg-white p-4 rounded shadow">
            <h3 className="text-lg font-medium mb-2">Ingresos vs Gastos</h3>
            <p className="text-sm text-gray-500 mb-4">Tendencia mensual de ingresos y gastos</p>
            
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={chartData.trendData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="month" />
                <YAxis />
                <Tooltip />
                <Legend />
                <Line type="monotone" dataKey="income" stroke="#10B981" name="Ingresos" />
                <Line type="monotone" dataKey="expense" stroke="#EF4444" name="Gastos" />
              </LineChart>
            </ResponsiveContainer>
          </div>
          
          <div className="bg-white p-4 rounded shadow">
            <h3 className="text-lg font-medium mb-2">Transacciones por Categoría</h3>
            <p className="text-sm text-gray-500 mb-4">Distribución del monto por categoría</p>
            
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={chartData.categoryData}
                  cx="50%"
                  cy="50%"
                  outerRadius={100}
                  fill="#8884d8"
                  dataKey="total"
                  nameKey="category"
                  label={(entry) => `${entry.category}: ${entry.total}%`}
                >
                  {chartData.categoryData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}
      
      {view === 'table' && (
        <div className="bg-white rounded shadow overflow-hidden">
          <div className="flex justify-between items-center p-4 border-b">
            <h3 className="text-lg font-medium">Todas las transacciones</h3>
            <button
              onClick={() => {
                setCurrentTransaction(null);
                setIsModalOpen(true);
              }}
              className="px-4 py-2 bg-blue-500 text-white rounded"
            >
              Nueva Transacción
            </button>
          </div>
          
          <div className="overflow-x-auto">
            <table className="min-w-full">
              <thead>
                <tr className="bg-gray-100">
                  <th className="px-4 py-2 text-left">Fecha</th>
                  <th className="px-4 py-2 text-left">Descripción</th>
                  <th className="px-4 py-2 text-left">Categoría</th>
                  <th className="px-4 py-2 text-left">Método</th>
                  <th className="px-4 py-2 text-left">Monto</th>
                  <th className="px-4 py-2 text-left">Acciones</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr>
                    <td colSpan={6} className="px-4 py-2 text-center">Cargando...</td>
                  </tr>
                ) : transactions.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-4 py-2 text-center">No hay transacciones para mostrar.</td>
                  </tr>
                ) : (
                  transactions.map((transaction) => (
                    <tr key={transaction.id} className="border-b hover:bg-gray-50">
                      <td className="px-4 py-2">
                        {format(new Date(transaction.createdAt), 'dd/MM/yyyy')}
                      </td>
                      <td className="px-4 py-2">{transaction.description || '-'}</td>
                      <td className="px-4 py-2">{transaction.category}</td>
                      <td className="px-4 py-2">{transaction.paymentMethod}</td>
                      <td className={`px-4 py-2 font-medium ${transaction.type === 'income' ? 'text-green-600' : 'text-red-600'}`}>
                        {transaction.type === 'income' ? '+' : '-'}${transaction.amount.toFixed(2)}
                      </td>
                      <td className="px-4 py-2">
                        <button
                          onClick={() => {
                            setCurrentTransaction(transaction);
                            setIsModalOpen(true);
                          }}
                          className="text-blue-500 mr-2"
                        >
                          Editar
                        </button>
                        <button
                          onClick={() => handleDeleteTransaction(transaction.id)}
                          className="text-red-500"
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