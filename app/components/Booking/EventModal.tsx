import { useState } from 'react';
import { format, addHours, parseISO, isValid } from 'date-fns';
import { Court, Reservation } from "../../types/bookings/types";

interface EventModalProps {
  courts: Court[];
  initialEvent?: Reservation | null;
  onClose: () => void;
  onSuccess: () => void;
}

export default function EventModal({
  courts,
  initialEvent,
  onClose,
  onSuccess
}: EventModalProps) {
  const futbolCourts = courts.filter(c => c.type === 'futbol');
  const padelCourts = courts.filter(c => c.type === 'padel');
  
  const today = new Date();
  today.setHours(12, 0, 0, 0);
  const endTime = addHours(today, 5);
  
  const isEditMode = Boolean(initialEvent);
  
  const getEventId = () => {
    if (!initialEvent) return null;
    
    if ((initialEvent as any).originalId && typeof (initialEvent as any).originalId === 'string') {
      const originalId = (initialEvent as any).originalId;
      
      if (originalId.startsWith('event-')) {
        const parts = originalId.split('-');
        
        if (parts.length >= 3 && parts[0] === 'event' && parts[1] === 'event') {
          return parts[2];
        }
        
        if (parts.length >= 2 && parts[0] === 'event') {
          return parts[1];
        }
      }
      
      return originalId;
    }
    
    const id = initialEvent.id || (initialEvent as any).virtualId;
    if (!id) return null;
    
    if (typeof id === 'string' && id.includes('event-')) {
      const parts = id.split('-');
      
      if (parts.length >= 3 && parts[0] === 'event' && parts[1] === 'event') {
        return parts[2];
      }
      
      if (parts.length >= 2 && parts[0] === 'event') {
        return parts[1];
      }
    }
    
    return id;
  };
  
  const eventId = getEventId();
  const isVirtualEvent = !eventId || !isEditMode;
  
  const safeFormat = (dateStr: string | null | undefined, formatStr: string, defaultValue: string): string => {
    if (!dateStr) return defaultValue;
    
    try {
      const date = parseISO(dateStr);
      if (!isValid(date)) return defaultValue;
      return format(date, formatStr);
    } catch (error) {
      return defaultValue;
    }
  };
  
  const getInitialCourts = () => {
    if (!initialEvent) {
      return {
        futbol: futbolCourts.slice(0, Math.min(2, futbolCourts.length)).map(c => c.id),
        padel: padelCourts.slice(0, Math.min(1, padelCourts.length)).map(c => c.id)
      };
    }
    
    try {
      const courtIds = initialEvent.courtId ? [initialEvent.courtId] : [];
      
      if ((initialEvent as any).courts && Array.isArray((initialEvent as any).courts)) {
        const courtNames = (initialEvent as any).courts;
        
        futbolCourts.forEach(court => {
          if (courtNames.includes(court.name) && !courtIds.includes(court.id)) {
            courtIds.push(court.id);
          }
        });
        
        padelCourts.forEach(court => {
          if (courtNames.includes(court.name) && !courtIds.includes(court.id)) {
            courtIds.push(court.id);
          }
        });
      }
      
      return {
        futbol: futbolCourts.filter(c => courtIds.includes(c.id)).map(c => c.id),
        padel: padelCourts.filter(c => courtIds.includes(c.id)).map(c => c.id)
      };
    } catch (error) {
      return {
        futbol: [],
        padel: []
      };
    }
  };
  
  const initialCourtSelection = getInitialCourts();
  
  const defaultDate = format(today, 'yyyy-MM-dd');
  const defaultStartTime = format(today, 'HH:mm');
  const defaultEndTime = format(endTime, 'HH:mm');
  
  const [formData, setFormData] = useState({
    name: initialEvent?.name || '',
    date: initialEvent && initialEvent.startTime 
      ? safeFormat(initialEvent.startTime as string, 'yyyy-MM-dd', defaultDate)
      : defaultDate,
    startTime: initialEvent && initialEvent.startTime 
      ? safeFormat(initialEvent.startTime as string, 'HH:mm', defaultStartTime)
      : defaultStartTime,
    endTime: initialEvent && initialEvent.endTime 
      ? safeFormat(initialEvent.endTime as string, 'HH:mm', defaultEndTime)
      : defaultEndTime,
    selectedFutbolCourts: initialCourtSelection.futbol,
    selectedPadelCourts: initialCourtSelection.padel
  });
  
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData({
      ...formData,
      [name]: value
    });
  };
  
  const handleCourtSelectionChange = (courtId: string, courtType: string) => {
    if (courtType === 'futbol') {
      const currentSelection = [...formData.selectedFutbolCourts];
      
      if (currentSelection.includes(courtId)) {
        setFormData({
          ...formData,
          selectedFutbolCourts: currentSelection.filter(id => id !== courtId)
        });
      } else {
        setFormData({
          ...formData,
          selectedFutbolCourts: [...currentSelection, courtId]
        });
      }
    } else {
      const currentSelection = [...formData.selectedPadelCourts];
      
      if (currentSelection.includes(courtId)) {
        setFormData({
          ...formData,
          selectedPadelCourts: currentSelection.filter(id => id !== courtId)
        });
      } else {
        setFormData({
          ...formData,
          selectedPadelCourts: [...currentSelection, courtId]
        });
      }
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.name.trim()) {
      setError('El nombre del evento es obligatorio');
      return;
    }
    
    if (formData.selectedFutbolCourts.length === 0 && formData.selectedPadelCourts.length === 0) {
      setError('Debe seleccionar al menos una cancha');
      return;
    }
    
    setLoading(true);
    setError(null);
    
    const allSelectedCourtIds = [
      ...formData.selectedFutbolCourts,
      ...formData.selectedPadelCourts
    ];
    
    try {
      const method = isVirtualEvent || !eventId ? 'POST' : 'PUT';
      
      const body = {
        name: formData.name,
        date: formData.date,
        startTime: `${formData.date}T${formData.startTime}:00`,
        endTime: `${formData.date}T${formData.endTime}:00`,
        courtIds: allSelectedCourtIds,
        ...(eventId && method === 'PUT' && { id: eventId })
      };
      
      const response = await fetch('/api/events', {
        method,
        headers: {
          'Content-Type': 'application/json',
          'Cache-Control': 'no-cache'
        },
        body: JSON.stringify(body)
      });
      
      let result;
      try {
        const text = await response.text();
        
        try {
          result = JSON.parse(text);
        } catch (err) {
          if (!response.ok) {
            throw new Error(`Error ${response.status}: ${response.statusText}`);
          }
          result = { success: true };
        }
      } catch (err) {
        if (!response.ok) {
          throw new Error(`Error ${response.status}: ${response.statusText}`);
        }
        result = { success: true };
      }
      
      if (!response.ok) {
        throw new Error(result?.error || `Error ${response.status}: ${response.statusText}`);
      }
      
      onSuccess();
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Error desconocido');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!eventId) {
      setError('No se puede eliminar un evento que no existe en la base de datos');
      return;
    }
    
    if (!confirm('¿Está seguro de que desea eliminar este evento? Esta acción no se puede deshacer.')) {
      return;
    }
    
    setLoading(true);
    setError(null);
    
    try {
      const response = await fetch('/api/events', {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
          'Cache-Control': 'no-cache'
        },
        body: JSON.stringify({ eventId })
      });
      
      let result;
      try {
        result = await response.json();
      } catch (err) {
        if (!response.ok) {
          throw new Error(`Error ${response.status}: ${response.statusText}`);
        }
        result = { success: true };
      }
      
      if (!response.ok) {
        throw new Error(result.error || `Error ${response.status}: ${response.statusText}`);
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
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4 overflow-y-auto">
      <div className="bg-white p-5 rounded max-w-md w-full shadow-lg my-8">
        <div className="flex justify-between items-center mb-4">
          <div className="font-bold text-xl">
            {isEditMode && !isVirtualEvent ? 'Editar Evento' : 'Crear Evento'}
          </div>
          <button 
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600"
            type="button"
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
        
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Nombre del Evento <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              name="name"
              value={formData.name}
              onChange={handleChange}
              className="w-full p-2 border rounded focus:ring-blue-500 focus:border-blue-500"
              disabled={loading}
              required
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Fecha <span className="text-red-500">*</span>
            </label>
            <input
              type="date"
              name="date"
              value={formData.date}
              onChange={handleChange}
              className="w-full p-2 border rounded focus:ring-blue-500 focus:border-blue-500"
              disabled={loading}
              required
            />
          </div>
          
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Hora de inicio <span className="text-red-500">*</span>
              </label>
              <input
                type="time"
                name="startTime"
                value={formData.startTime}
                onChange={handleChange}
                className="w-full p-2 border rounded focus:ring-blue-500 focus:border-blue-500"
                disabled={loading}
                required
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Hora de fin <span className="text-red-500">*</span>
              </label>
              <input
                type="time"
                name="endTime"
                value={formData.endTime}
                onChange={handleChange}
                className="w-full p-2 border rounded focus:ring-blue-500 focus:border-blue-500"
                disabled={loading}
                required
              />
            </div>
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Canchas de Fútbol <span className="text-gray-500 text-xs">(Recomendado: 2)</span>
            </label>
            <div className="grid grid-cols-2 gap-2">
              {futbolCourts.map((court) => (
                <div key={court.id} className="flex items-center">
                  <input
                    type="checkbox"
                    id={`futbol-${court.id}`}
                    checked={formData.selectedFutbolCourts.includes(court.id)}
                    onChange={() => handleCourtSelectionChange(court.id, 'futbol')}
                    className="h-4 w-4 text-blue-600 rounded focus:ring-blue-500 mr-2"
                    disabled={loading}
                  />
                  <label htmlFor={`futbol-${court.id}`} className="text-sm">{court.name}</label>
                </div>
              ))}
            </div>
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Canchas de Pádel <span className="text-gray-500 text-xs">(Recomendado: 1)</span>
            </label>
            <div className="grid grid-cols-2 gap-2">
              {padelCourts.map((court) => (
                <div key={court.id} className="flex items-center">
                  <input
                    type="checkbox"
                    id={`padel-${court.id}`}
                    checked={formData.selectedPadelCourts.includes(court.id)}
                    onChange={() => handleCourtSelectionChange(court.id, 'padel')}
                    className="h-4 w-4 text-blue-600 rounded focus:ring-blue-500 mr-2"
                    disabled={loading}
                  />
                  <label htmlFor={`padel-${court.id}`} className="text-sm">{court.name}</label>
                </div>
              ))}
            </div>
          </div>
          
          <div className="flex justify-between mt-6">
            {isEditMode && eventId && !isVirtualEvent && (
              <button
                type="button"
                onClick={handleDelete}
                disabled={loading}
                className="px-4 py-2 border border-red-600 text-red-600 hover:bg-red-50 rounded shadow-sm text-sm font-medium focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500"
              >
                Eliminar
              </button>
            )}
            
            <div className={`flex gap-2 ${isEditMode && eventId && !isVirtualEvent ? '' : 'ml-auto'}`}>
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
                disabled={loading}
                className="px-4 py-2 border border-transparent rounded shadow-sm text-sm font-medium text-white bg-green-600 hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 disabled:bg-green-300 disabled:cursor-not-allowed"
              >
                {loading ? 
                  (isEditMode && !isVirtualEvent ? 'Actualizando...' : 'Creando...') : 
                  (isEditMode && !isVirtualEvent ? 'Actualizar Evento' : 'Crear Evento')
                }
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}