import { format } from "date-fns";
import { es } from 'date-fns/locale';
import { ModalDataType } from "../../types/bookings/types";

interface BookingModalProps {
  modalData: ModalDataType;
  setModalData: (data: ModalDataType) => void;
  loading: boolean;
  closeModal: () => void;
  handleBooking: () => Promise<void>;
  handleCancel: (id: string) => Promise<void>;
  handleUpdatePayment: () => Promise<void>;
}

export function BookingModal({
  modalData,
  setModalData,
  loading,
  closeModal,
  handleBooking,
  handleCancel,
  handleUpdatePayment
}: BookingModalProps) {
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
              Nombre
            </label>
            <input 
              type="text" 
              value={modalData.guestName} 
              onChange={e => setModalData({...modalData, guestName: e.target.value})} 
              className="w-full p-2 border rounded focus:ring-blue-500 focus:border-blue-500" 
              placeholder="Nombre del cliente"
              disabled={loading || modalData.type === 'view'}
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Teléfono
            </label>
            <input 
              type="text" 
              value={modalData.guestPhone} 
              onChange={e => setModalData({...modalData, guestPhone: e.target.value})} 
              className="w-full p-2 border rounded focus:ring-blue-500 focus:border-blue-500" 
              placeholder="Número de teléfono"
              disabled={loading || modalData.type === 'view'}
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Método de pago
            </label>
            <select 
              value={modalData.paymentMethod} 
              onChange={e => setModalData({...modalData, paymentMethod: e.target.value})} 
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
                onChange={e => setModalData({...modalData, isRecurring: e.target.checked})} 
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
                  Fecha final
                </label>
                <input 
                  type="date" 
                  value={modalData.recurrenceEnd} 
                  onChange={e => setModalData({...modalData, recurrenceEnd: e.target.value})} 
                  className="w-full p-2 border rounded focus:ring-blue-500 focus:border-blue-500"
                  disabled={loading || modalData.type === 'view'}
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Sesiones pagadas
                </label>
                <input 
                  type="number" 
                  value={modalData.paidSessions} 
                  onChange={e => setModalData({...modalData, paidSessions: parseInt(e.target.value)})} 
                  className="w-full p-2 border rounded focus:ring-blue-500 focus:border-blue-500" 
                  placeholder="0"
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
              onChange={e => setModalData({...modalData, paymentNotes: e.target.value})} 
              className="w-full p-2 border rounded focus:ring-blue-500 focus:border-blue-500" 
              placeholder="Notas adicionales sobre el pago"
              rows={2}
              disabled={loading || modalData.type === 'view'}
            />
          </div>
        </div>
        
        <div className="mt-6 flex justify-end gap-2">
          {modalData.type === 'edit' && (
            <button 
              onClick={() => handleCancel(modalData.reservation?.id || '')}
              disabled={loading}
              className="px-4 py-2 border border-transparent rounded shadow-sm text-sm font-medium text-white bg-red-600 hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 mr-auto"
            >
              Cancelar Reserva
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
              disabled={loading}
              className="px-4 py-2 border border-transparent rounded shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
            >
              {loading ? 'Guardando...' : 'Guardar Reserva'}
            </button>
          )}
          
          {modalData.type === 'edit' && (
            <button 
              onClick={handleUpdatePayment}
              disabled={loading}
              className="px-4 py-2 border border-transparent rounded shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
            >
              {loading ? 'Actualizando...' : 'Actualizar Reserva'}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}