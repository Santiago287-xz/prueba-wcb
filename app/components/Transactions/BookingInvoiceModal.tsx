import { useState } from 'react';
import { format } from 'date-fns';

interface BookingInvoiceModalProps {
  reservationId: string;
  courtName: string;
  startTime: string;
  endTime: string;
  clientName: string;
  userId?: string;
  onClose: () => void;
  onSuccess: () => void;
}

export default function BookingInvoiceModal({
  reservationId,
  courtName,
  startTime,
  endTime,
  clientName,
  userId,
  onClose,
  onSuccess
}: BookingInvoiceModalProps) {
  const [formData, setFormData] = useState({
    amount: 0,
    paymentMethod: 'cash',
    description: '',
    paidSessions: 1,
    paymentNotes: ''
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    
    if (name === 'amount') {
      setFormData({
        ...formData,
        amount: parseFloat(value) || 0
      });
    } else if (name === 'paidSessions') {
      setFormData({
        ...formData,
        paidSessions: parseInt(value) || 1
      });
    } else {
      setFormData({
        ...formData,
        [name]: value
      });
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (formData.amount <= 0) {
      setError('El monto debe ser mayor que cero');
      return;
    }
    
    setLoading(true);
    setError(null);
    
    try {
      const response = await fetch('/api/courts/invoicing', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          reservationId,
          userId,
          paymentMethod: formData.paymentMethod,
          amount: formData.amount,
          description: formData.description,
          paidSessions: formData.paidSessions,
          paymentNotes: formData.paymentNotes
        })
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Error al procesar el pago');
      }
      
      onSuccess();
      onClose();
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Error desconocido');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white p-4 rounded max-w-md w-full shadow-lg">
        <div className="flex justify-between items-center mb-4">
          <div className="font-bold text-lg">Registrar Pago</div>
          <button 
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
        
        {error && (
          <div className="mb-4 p-3 bg-red-100 text-red-700 rounded border border-red-200">
            {error}
          </div>
        )}
        
        <div className="mb-4 p-2 bg-blue-50 rounded">
          <div className="font-medium">{courtName}</div>
          <div className="text-sm">Cliente: {clientName}</div>
          <div className="text-sm">
            Horario: {format(new Date(startTime), 'HH:mm')} - {format(new Date(endTime), 'HH:mm')}
          </div>
        </div>
        
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Monto <span className="text-red-500">*</span>
            </label>
            <input
              type="number"
              name="amount"
              value={formData.amount}
              onChange={handleChange}
              className="w-full p-2 border rounded focus:ring-blue-500 focus:border-blue-500"
              disabled={loading}
              min="0"
              step="0.01"
              required
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Método de pago <span className="text-red-500">*</span>
            </label>
            <select
              name="paymentMethod"
              value={formData.paymentMethod}
              onChange={handleChange}
              className="w-full p-2 border rounded focus:ring-blue-500 focus:border-blue-500"
              disabled={loading}
              required
            >
              <option value="cash">Efectivo</option>
              <option value="transfer">Transferencia</option>
            </select>
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Sesiones pagadas
            </label>
            <input
              type="number"
              name="paidSessions"
              value={formData.paidSessions}
              onChange={handleChange}
              className="w-full p-2 border rounded focus:ring-blue-500 focus:border-blue-500"
              disabled={loading}
              min="1"
              step="1"
            />
            <div className="text-xs text-gray-500 mt-1">
              Para turnos fijos semanales
            </div>
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Notas de pago
            </label>
            <textarea
              name="paymentNotes"
              value={formData.paymentNotes}
              onChange={handleChange}
              className="w-full p-2 border rounded focus:ring-blue-500 focus:border-blue-500"
              disabled={loading}
              rows={2}
              maxLength={255}
            />
            <div className="text-xs text-gray-500 mt-1">
              {formData.paymentNotes.length}/255 caracteres
            </div>
          </div>
          
          <div className="flex justify-end gap-2 mt-6">
            <button
              type="button"
              onClick={onClose}
              disabled={loading}
              className="px-4 py-2 border border-gray-300 rounded shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={loading || formData.amount <= 0}
              className="px-4 py-2 border border-transparent rounded shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:bg-blue-300 disabled:cursor-not-allowed"
            >
              {loading ? 'Procesando...' : 'Registrar Pago'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}