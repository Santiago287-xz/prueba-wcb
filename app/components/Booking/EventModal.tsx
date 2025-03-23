// EventModal.tsx
import { useState } from 'react';
import { format, addHours } from 'date-fns';

interface Court {
  id: string;
  name: string;
  type: string;
}

interface EventModalProps {
  courts: Court[];
  onClose: () => void;
  onSuccess: () => void;
}

export default function EventModal({
  courts,
  onClose,
  onSuccess
}: EventModalProps) {
  const futbolCourts = courts.filter(c => c.type === 'futbol');
  const padelCourts = courts.filter(c => c.type === 'padel');
  
  const today = new Date();
  today.setHours(12, 0, 0, 0);
  const endTime = addHours(today, 5);
  
  const [formData, setFormData] = useState({
    name: '',
    date: format(today, 'yyyy-MM-dd'),
    startTime: format(today, 'HH:mm'),
    endTime: format(endTime, 'HH:mm'),
    selectedFutbolCourts: futbolCourts.slice(0, 2).map(c => c.id),
    selectedPadelCourts: padelCourts.slice(0, 1).map(c => c.id)
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
    
    try {
      const response = await fetch('/api/events', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          name: formData.name,
          date: formData.date,
          startTime: `${formData.date}T${formData.startTime}:00`,
          endTime: `${formData.date}T${formData.endTime}:00`,
          futbolCourtIds: formData.selectedFutbolCourts,
          padelCourtIds: formData.selectedPadelCourts
        })
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Error al crear el evento');
      }
      
      onSuccess();
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
          <div className="font-bold text-lg">Crear Evento</div>
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
              disabled={loading}
              className="px-4 py-2 border border-transparent rounded shadow-sm text-sm font-medium text-white bg-green-600 hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 disabled:bg-green-300 disabled:cursor-not-allowed"
            >
              {loading ? 'Creando...' : 'Crear Evento'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}