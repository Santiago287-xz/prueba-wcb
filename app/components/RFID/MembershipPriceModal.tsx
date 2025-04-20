// app/components/RFID/MembershipPriceModal.tsx
import React, { useState, useEffect } from 'react';
import { X, Edit, Trash2, Plus, Check } from 'lucide-react';

interface MembershipPrice {
  id: string;
  type: string;
  basePrice: number;
  description: string | null;
  active: boolean;
}

interface MembershipPriceModalProps {
  open: boolean;
  onClose: () => void;
  isAdmin: boolean;
}

export default function MembershipPriceModal({ open, onClose, isAdmin }: MembershipPriceModalProps) {
  const [prices, setPrices] = useState<MembershipPrice[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [formMode, setFormMode] = useState<'create' | 'edit' | 'view'>('view');
  const [selectedPrice, setSelectedPrice] = useState<MembershipPrice | null>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  
  const [formData, setFormData] = useState({
    type: '',
    basePrice: '',
    description: '',
    active: true
  });

  // Cargar los precios al abrir el modal
  useEffect(() => {
    if (open) {
      fetchPrices();
    }
  }, [open]);

  const fetchPrices = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch('/api/rfid/prices');
      if (!response.ok) {
        throw new Error('Error al cargar los precios');
      }
      const data = await response.json();
      setPrices(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error inesperado');
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value, type } = e.target as HTMLInputElement;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? (e.target as HTMLInputElement).checked : value
    }));
  };

  const resetForm = () => {
    setFormData({
      type: '',
      basePrice: '',
      description: '',
      active: true
    });
    setSelectedPrice(null);
    setFormMode('view');
  };

  const handleEdit = (price: MembershipPrice) => {
    setSelectedPrice(price);
    setFormData({
      type: price.type,
      basePrice: price.basePrice.toString(),
      description: price.description || '',
      active: price.active
    });
    setFormMode('edit');
  };

  const handleDeleteClick = (price: MembershipPrice) => {
    setSelectedPrice(price);
    setDeleteDialogOpen(true);
  };

  const handleDelete = async () => {
    if (!selectedPrice) return;
    
    setLoading(true);
    setError(null);
    
    try {
      const response = await fetch(`/api/rfid/prices/${selectedPrice.id}`, {
        method: 'DELETE'
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Error al eliminar');
      }
      
      await fetchPrices();
      setDeleteDialogOpen(false);
      resetForm();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error inesperado');
    } finally {
      setLoading(false);
    }
  };

  const validateForm = () => {
    if (!formData.type.trim()) {
      setError('El tipo de membresía es obligatorio');
      return false;
    }
    
    if (!formData.basePrice || parseFloat(formData.basePrice) <= 0) {
      setError('El precio debe ser mayor que cero');
      return false;
    }
    
    return true;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) {
      return;
    }
    
    setLoading(true);
    setError(null);
    
    try {
      const url = formMode === 'create' 
        ? '/api/rfid/prices' 
        : `/api/rfid/prices/${selectedPrice?.id}`;
      
      const method = formMode === 'create' ? 'POST' : 'PUT';
      
      const response = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          type: formData.type,
          basePrice: parseFloat(formData.basePrice),
          description: formData.description || null,
          active: formData.active
        })
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Error al guardar');
      }
      
      await fetchPrices();
      resetForm();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error inesperado');
    } finally {
      setLoading(false);
    }
  };

  if (!open) return null;

  return (
    <>
      {/* Modal Base */}
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
        <div className="bg-white rounded-lg shadow-lg w-full max-w-4xl max-h-[90vh] overflow-auto">
          <div className="flex justify-between items-center p-4 border-b">
            <h2 className="text-xl font-semibold">Gestión de Tipos de Membresía</h2>
            <button 
              onClick={onClose}
              className="p-1 rounded-full hover:bg-gray-100"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
          
          <div className="p-5">
            {error && (
              <div className="mb-4 p-3 bg-red-50 text-red-700 rounded-md">
                {error}
              </div>
            )}
            
            {formMode !== 'view' && isAdmin && (
              <form onSubmit={handleSubmit} className="mb-6 border p-4 rounded-md bg-gray-50">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                  <div>
                    <label htmlFor="type" className="block text-sm font-medium text-gray-700 mb-1">
                      Tipo de Membresía
                    </label>
                    <input
                      id="type"
                      name="type"
                      value={formData.type}
                      onChange={handleInputChange}
                      className="w-full p-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      disabled={loading}
                      required
                    />
                  </div>
                  <div>
                    <label htmlFor="basePrice" className="block text-sm font-medium text-gray-700 mb-1">
                      Precio Base
                    </label>
                    <div className="relative">
                      <span className="absolute left-3 top-2 text-gray-500">$</span>
                      <input
                        id="basePrice"
                        name="basePrice"
                        type="number"
                        value={formData.basePrice}
                        onChange={handleInputChange}
                        className="w-full p-2 pl-6 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                        disabled={loading}
                        required
                        step="0.01"
                        min="0.01"
                      />
                    </div>
                  </div>
                  <div className="md:col-span-2">
                    <label htmlFor="description" className="block text-sm font-medium text-gray-700 mb-1">
                      Descripción
                    </label>
                    <textarea
                      id="description"
                      name="description"
                      value={formData.description}
                      onChange={handleInputChange}
                      className="w-full p-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      disabled={loading}
                      rows={2}
                    />
                  </div>
                  <div className="flex items-center">
                    <label htmlFor="active" className="text-sm font-medium text-gray-700 mr-3">
                      Activo
                    </label>
                    <div className="relative inline-block w-10 align-middle select-none">
                      <input
                        id="active"
                        name="active"
                        type="checkbox"
                        checked={formData.active}
                        onChange={(e) => setFormData(prev => ({ ...prev, active: e.target.checked }))}
                        className="sr-only"
                        disabled={loading}
                      />
                      <div className={`block h-6 rounded-full w-10 ${formData.active ? 'bg-blue-500' : 'bg-gray-300'}`} />
                      <div className={`absolute w-4 h-4 rounded-full bg-white transition-transform transform ${formData.active ? 'translate-x-5' : 'translate-x-1'} top-1`} />
                    </div>
                  </div>
                </div>
                
                <div className="flex justify-end gap-2">
                  <button 
                    type="button" 
                    onClick={resetForm}
                    className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50"
                    disabled={loading}
                  >
                    Cancelar
                  </button>
                  <button 
                    type="submit" 
                    className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 flex items-center justify-center"
                    disabled={loading}
                  >
                    {loading ? (
                      <svg className="animate-spin h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                    ) : formMode === 'create' ? 'Crear' : 'Actualizar'}
                  </button>
                </div>
              </form>
            )}
            
            <div className="overflow-auto">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {loading && !prices.length ? (
                  <div className="col-span-full flex justify-center items-center h-40">
                    <svg className="animate-spin h-8 w-8 text-blue-500" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                  </div>
                ) : prices.length === 0 ? (
                  <div className="col-span-full flex justify-center items-center h-40 bg-gray-50 rounded-lg">
                    <p className="text-gray-500">No hay tipos de membresía disponibles</p>
                  </div>
                ) : (
                  prices.map(price => (
                    <div key={price.id} className="border rounded-lg overflow-hidden shadow-sm hover:shadow transition-shadow">
                      <div className="p-4 border-b">
                        <div className="flex justify-between items-start">
                          <h3 className="font-semibold text-lg">{price.type}</h3>
                          <span className={`px-2 py-1 rounded-full text-xs ${
                            price.active ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                          }`}>
                            {price.active ? 'Activo' : 'Inactivo'}
                          </span>
                        </div>
                        <p className="text-gray-700 font-medium mt-1">
                          ${price.basePrice.toLocaleString('es-AR', {
                            minimumFractionDigits: 2,
                            maximumFractionDigits: 2
                          })}
                        </p>
                      </div>
                      <div className="px-4 py-3">
                        <p className="text-sm text-gray-600">
                          {price.description || '—'}
                        </p>
                      </div>
                      {isAdmin && (
                        <div className="px-4 py-2 bg-gray-50 flex justify-end gap-2">
                          <button
                            onClick={() => handleEdit(price)}
                            className="p-1 text-blue-600 hover:bg-blue-50 rounded"
                            title="Editar"
                          >
                            <Edit className="h-4 w-4" />
                          </button>
                          <button
                            onClick={() => handleDeleteClick(price)}
                            className="p-1 text-red-600 hover:bg-red-50 rounded"
                            title="Eliminar"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </div>
                      )}
                    </div>
                  ))
                )}
              </div>
            </div>
            
            {isAdmin && formMode === 'view' && (
              <button
                onClick={() => setFormMode('create')}
                className="mt-6 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 flex items-center gap-2"
                disabled={loading}
              >
                <Plus className="h-4 w-4" />
                Nuevo Tipo de Membresía
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Confirm Delete Dialog */}
      {deleteDialogOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
          <div className="bg-white rounded-lg shadow-lg w-full max-w-md p-6">
            <h3 className="text-lg font-semibold mb-2">Confirmar eliminación</h3>
            <p className="mb-4">
              ¿Está seguro de que desea eliminar este tipo de membresía? Esta acción no se puede deshacer.
            </p>
            <div className="flex justify-end gap-2">
              <button
                onClick={() => setDeleteDialogOpen(false)}
                className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50"
                disabled={loading}
              >
                Cancelar
              </button>
              <button
                onClick={handleDelete}
                className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 flex items-center justify-center"
                disabled={loading}
              >
                {loading ? (
                  <svg className="animate-spin h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                ) : 'Eliminar'}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}