import { format } from "date-fns";
import { es } from 'date-fns/locale';
import { ModalDataType } from "../../types/bookings/types";
import { useEffect, useRef } from "react";

interface BookingModalProps {
  modalData: ModalDataType;
  setModalData: (data: ModalDataType) => void;
  loading: boolean;
  closeModal: () => void;
  handleBooking: () => Promise<void>;
  handleCancel: (id: string) => Promise<void>;
  handleUpdatePayment: () => Promise<void>;
  error: string | null;
  setError: (error: string | null) => void;
}

export function BookingModal({
  modalData,
  setModalData,
  loading,
  closeModal,
  handleBooking,
  handleCancel,
  handleUpdatePayment,
  error,
  setError
}: BookingModalProps) {
  // Use refs to track previous values and avoid unnecessary validations
  const prevName = useRef(modalData.name);
  const prevPhone = useRef(modalData.phone);
  const prevRecurrenceEnd = useRef(modalData.recurrenceEnd);
  
  // Validation effects - moved out of render cycle
  useEffect(() => {
    if (prevName.current !== modalData.name) {
      prevName.current = modalData.name;
      
      if (modalData.name.length > 50) {
        setError("El nombre no puede exceder los 50 caracteres");
      } else if (error && error.includes("nombre")) {
        setError(null);
      }
    }
  }, [modalData.name, error, setError]);

  useEffect(() => {
    if (prevPhone.current !== modalData.phone) {
      prevPhone.current = modalData.phone;
      
      if (modalData.phone.length > 0 && (modalData.phone.length < 3 || modalData.phone.length > 20)) {
        setError("El teléfono debe tener entre 3 y 20 caracteres");
      } else if (error && error.includes("teléfono")) {
        setError(null);
      }
    }
  }, [modalData.phone, error, setError]);

  useEffect(() => {
    if (prevRecurrenceEnd.current !== modalData.recurrenceEnd) {
      prevRecurrenceEnd.current = modalData.recurrenceEnd;
      
      if (modalData.isRecurring && modalData.recurrenceEnd) {
        const endDate = new Date(modalData.recurrenceEnd);
        const startDate = modalData.selectedDay || new Date();
        
        if (endDate <= startDate) {
          setError("La fecha de finalización debe ser posterior a la fecha de inicio");
        } else if (error && error.includes("fecha de finalización")) {
          setError(null);
        }
      }
    }
  }, [modalData.recurrenceEnd, modalData.isRecurring, modalData.selectedDay, error, setError]);

  // Clean handlers that don't update state during render
  const handleNameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setModalData({...modalData, name: e.target.value});
  };
  
  const handlePhoneChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setModalData({...modalData, phone: e.target.value});
  };
  
  const handleRecurrenceEndChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setModalData({...modalData, recurrenceEnd: e.target.value});
  };

  const handlePaymentMethodChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setModalData({...modalData, paymentMethod: e.target.value});
  };

  const handlePaymentNotesChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setModalData({...modalData, paymentNotes: e.target.value});
  };

  const handlePaidSessionsChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setModalData({...modalData, paidSessions: parseInt(e.target.value) || 0});
  };

  const handleRecurringChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setModalData({...modalData, isRecurring: e.target.checked});
    if (error && (error.includes("recurrente") || error.includes("finalización"))) {
      setError(null);
    }
  };

  // Simple validation functions that don't update state
  const isNameValid = modalData.name.trim() !== '' && modalData.name.length <= 50;
  const isPhoneValid = modalData.phone.trim() !== '' && modalData.phone.length >= 3 && modalData.phone.length <= 20;
  const isRecurrenceEndValid = !modalData.isRecurring || (modalData.recurrenceEnd && new Date(modalData.recurrenceEnd) > (modalData.selectedDay || new Date()));
  const isFormValid = isNameValid && isPhoneValid && isRecurrenceEndValid;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white p-4 rounded max-w-md w-full shadow-lg">
        <div className="flex justify-between items-center mb-4">
          <div className="font-bold text-lg">
            {modalData.type === 'create' && 'Nueva Reserva'}
            {modalData.type === 'edit' && 'Editar Reserva'}
            {modalData.type === 'view' && 'Detalles de Reserva'}
          </div>
          <button 
            onClick={closeModal}
            className="text-gray-400 hover:text-gray-600"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
        
        {/* Mostrar error si existe */}
        {error && (
          <div className="mb-4 p-3 bg-red-100 text-red-700 rounded border border-red-200">
            {error}
          </div>
        )}
        
        {modalData.selectedDay && modalData.selectedHour !== undefined && (
          <div className="mb-4 p-2 bg-blue-50 rounded">
            <div className="font-medium">{format(modalData.selectedDay, "EEEE d 'de' MMMM", { locale: es })}</div>
            <div className="text-sm">{modalData.selectedHour}:00 - {modalData.selectedHour + 1}:30</div>
          </div>
        )}
        
        {modalData.reservation && (
          <div className="mb-4 p-2 bg-gray-50 rounded">
            <div className="font-medium">
              {format(new Date(modalData.reservation.startTime as string), "EEEE d 'de' MMMM", { locale: es })}
            </div>
            <div className="text-sm">
              {format(new Date(modalData.reservation.startTime as string), "HH:mm")} - 
              {format(new Date(modalData.reservation.endTime as string), "HH:mm")}
            </div>
          </div>
        )}
        
        {/* Formulario de reserva */}
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Nombre <span className="text-red-500">*</span>
            </label>
            <input 
              type="text" 
              value={modalData.name} 
              onChange={handleNameChange}
              className={`w-full p-2 border rounded focus:ring-blue-500 focus:border-blue-500 ${
                !isNameValid && modalData.name.length > 0 ? 'border-red-500' : ''
              }`} 
              placeholder="Nombre del cliente (máx. 50 caracteres)"
              disabled={loading || modalData.type === 'view'}
              maxLength={50}
              required
            />
            <div className="text-xs text-gray-500 mt-1">
              {modalData.name.length}/50 caracteres
            </div>
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Teléfono <span className="text-red-500">*</span>
            </label>
            <input 
              type="text" 
              value={modalData.phone} 
              onChange={handlePhoneChange}
              className={`w-full p-2 border rounded focus:ring-blue-500 focus:border-blue-500 ${
                !isPhoneValid && modalData.phone.length > 0 ? 'border-red-500' : ''
              }`} 
              placeholder="Número de teléfono (entre 3 y 20 caracteres)"
              disabled={loading || modalData.type === 'view'}
              maxLength={20}
              required
            />
            <div className="text-xs text-gray-500 mt-1">
              {modalData.phone.length}/20 caracteres
            </div>
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Método de pago
            </label>
            <select 
              value={modalData.paymentMethod} 
              onChange={handlePaymentMethodChange}
              className="w-full p-2 border rounded focus:ring-blue-500 focus:border-blue-500 appearance-none"
              disabled={loading || modalData.type === 'view'}
            >
              <option value="pending">Pendiente</option>
              <option value="transfer">Transferencia</option>
              <option value="cash">Efectivo</option>
            </select>
          </div>
          
          <div>
            <label className="flex items-center">
              <input 
                type="checkbox" 
                checked={modalData.isRecurring} 
                onChange={handleRecurringChange}
                className="h-4 w-4 text-blue-600 rounded focus:ring-blue-500 mr-2"
                disabled={loading || modalData.type === 'view'}
              />
              <span className="text-sm font-medium text-gray-700">Turno fijo semanal</span>
            </label>
          </div>
          
          {modalData.isRecurring && (
            <div className="pl-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Fecha final <span className="text-red-500">*</span>
                </label>
                <input 
                  type="date" 
                  value={modalData.recurrenceEnd} 
                  onChange={handleRecurrenceEndChange}
                  className={`w-full p-2 border rounded focus:ring-blue-500 focus:border-blue-500 ${
                    !isRecurrenceEndValid && modalData.recurrenceEnd ? 'border-red-500' : ''
                  }`}
                  disabled={loading || modalData.type === 'view'}
                  min={modalData.selectedDay ? format(new Date(modalData.selectedDay), 'yyyy-MM-dd') : undefined}
                  required
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Sesiones pagadas
                </label>
                <input 
                  type="number" 
                  value={modalData.paidSessions} 
                  onChange={handlePaidSessionsChange}
                  className="w-full p-2 border rounded focus:ring-blue-500 focus:border-blue-500" 
                  placeholder="0"
                  min="0"
                  disabled={loading || modalData.type === 'view'}
                />
              </div>
            </div>
          )}
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Notas de pago
            </label>
            <textarea 
              value={modalData.paymentNotes} 
              onChange={handlePaymentNotesChange}
              className="w-full p-2 border rounded focus:ring-blue-500 focus:border-blue-500" 
              placeholder="Notas adicionales sobre el pago"
              rows={2}
              disabled={loading || modalData.type === 'view'}
              maxLength={255}
            />
            <div className="text-xs text-gray-500 mt-1">
              {modalData.paymentNotes.length}/255 caracteres
            </div>
          </div>
        </div>
        
        <div className="mt-6 flex justify-end gap-2">
          {modalData.type === 'edit' && (
            <button 
              onClick={() => handleCancel(modalData.reservation?.id || '')}
              disabled={loading}
              className="px-4 py-2 border border-transparent rounded shadow-sm text-sm font-medium text-white bg-red-600 hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 mr-auto"
            >
              {loading ? 'Cancelando...' : 'Cancelar Reserva'}
            </button>
          )}
          
          <button 
            onClick={closeModal}
            disabled={loading}
            className="px-4 py-2 border border-gray-300 rounded shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
          >
            {modalData.type === 'view' ? 'Cerrar' : 'Volver'}
          </button>
          
          {modalData.type === 'create' && (
            <button 
              onClick={handleBooking}
              disabled={loading || !isFormValid}
              className="px-4 py-2 border border-transparent rounded shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:bg-blue-300 disabled:cursor-not-allowed"
            >
              {loading ? 'Guardando...' : 'Guardar Reserva'}
            </button>
          )}
          
          {modalData.type === 'edit' && (
            <button 
              onClick={handleUpdatePayment}
              disabled={loading || !isNameValid || !isPhoneValid}
              className="px-4 py-2 border border-transparent rounded shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:bg-blue-300 disabled:cursor-not-allowed"
            >
              {loading ? 'Actualizando...' : 'Actualizar Reserva'}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}