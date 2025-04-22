"use client";

import { format, differenceInWeeks, isValid, isBefore, parse } from "date-fns";
import { es } from 'date-fns/locale';
import { useState, useEffect, useRef, useMemo } from "react";
import { ModalDataType } from "../../types/bookings";
import { CalendarIcon, DollarSign, Users } from "lucide-react";

// Nueva función helper para convertir y validar la hora
const parseTime = (time: string | number | undefined): string => {
  // Si no se recibe valor, retorna valor por defecto.
  if (time === undefined || time === null) return "10:00";

  if (typeof time === "number") {
    return time < 10 ? `0${time}:00` : `${time}:00`;
  }

  // Verificar si es un string con formato HH:mm
  const match = String(time).match(/^(\d{1,2}):(\d{2})$/);
  if (match) {
    const [, h, m] = match;
    const hh = parseInt(h, 10);
    const mm = parseInt(m, 10);
    if (hh >= 0 && hh <= 24 && mm >= 0 && mm < 60) {
      return `${hh < 10 ? '0' + hh : hh}:${mm < 10 ? '0' + mm : mm}`;
    }
  }
  // Valor por defecto en caso de falla
  return "10:00";
};

interface BookingModalProps {
  modalData: ModalDataType;
  setModalData: (data: ModalDataType | ((prev: ModalDataType) => ModalDataType)) => void;
  loading: boolean;
  closeModal: () => void;
  handleBooking: () => Promise<{ id: string }>; // se espera que retorne un objeto con id
  handleCancel: (id: string) => Promise<void>;
  handleUpdatePayment: () => Promise<void>;
  error: string | null;
  setError: (error: string | null) => void;
}

export function ReservationModal({
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
  // Refs
  const nameRef = useRef<HTMLInputElement>(null);
  
  // Local state (minimal)
  const [expandedSection, setExpandedSection] = useState<string>("client");
  const [availableTimeSlots, setAvailableTimeSlots] = useState<string[]>([]);
  const [timeError, setTimeError] = useState<string | null>(null);
  const [transactionLoading, setTransactionLoading] = useState(false);
  const [dateValue, setDateValue] = useState(
    modalData.selectedDay ? format(parse(format(new Date(modalData.selectedDay), 'yyyy-MM-dd'), 'yyyy-MM-dd', new Date()), 'yyyy-MM-dd') : format(new Date(), 'yyyy-MM-dd')
  );
  
  // Computed state (instead of storing directly)
  const selectedCourtId = modalData.courtId || "";
  
  // Reemplazo de la lógica de selectedHour usando la función parseTime
  const selectedHour = useMemo(() => parseTime(modalData.selectedHour), [modalData.selectedHour]);
  
  const isPaid = useMemo(() => 
    modalData.paymentMethod !== 'pending' && modalData.paymentMethod !== undefined,
  [modalData.paymentMethod]);
  
  const alreadyPaid = useMemo(() => 
    modalData.type === 'edit' && 
    modalData.reservation && 
    modalData.reservation.paymentMethod !== 'pending',
  [modalData.type, modalData.reservation]);
  
  const selectedCourt = useMemo(() => 
    modalData.courts?.find(c => c.id === selectedCourtId),
  [modalData.courts, selectedCourtId]);
  
  const courtType = selectedCourt?.type;
  
  // Calculate end time
  const endTimeDisplay = useMemo(() => {
    if (!selectedHour || !courtType) return "";
    
    const [hoursStr, minutesStr] = selectedHour.split(':');
    const hours = parseInt(hoursStr, 10);
    const minutes = parseInt(minutesStr, 10);
    
    if (courtType === 'futbol') {
      const endHour = (hours + 1) % 24;
      return `${endHour < 10 ? '0' + endHour : endHour}:${minutes < 10 ? '0' + minutes : minutes}`;
    } else {
      let endHour = hours;
      let endMinutes = minutes + 30;
      
      if (endMinutes >= 60) {
        endHour = (endHour + 1) % 24;
        endMinutes -= 60;
      }
      
      endHour = (endHour + 1) % 24;
      return `${endHour < 10 ? '0' + endHour : endHour}:${endMinutes < 10 ? '0' + endMinutes : endMinutes}`;
    }
  }, [selectedHour, courtType]);
  
  // Check if time is unavailable
  const isTimeUnavailable = useMemo(() => 
    !availableTimeSlots.includes(selectedHour),
  [availableTimeSlots, selectedHour]);
  
  // Computed values for recurring sessions
  const { totalSessions, remainingSessions, recurrenceEndError } = useMemo(() => {
    if (!modalData.isRecurring || !modalData.recurrenceEnd) {
      return { totalSessions: 0, remainingSessions: 0, recurrenceEndError: null };
    }

    const startDate = parse(dateValue, 'yyyy-MM-dd', new Date());
    const endDate = new Date(modalData.recurrenceEnd);

    if (!isValid(endDate)) {
      return { 
        totalSessions: 0, 
        remainingSessions: 0, 
        recurrenceEndError: "La fecha ingresada no es válida" 
      };
    }

    if (isBefore(endDate, startDate)) {
      return { 
        totalSessions: 0, 
        remainingSessions: 0, 
        recurrenceEndError: "La fecha final debe ser posterior a la fecha de inicio" 
      };
    }

    const weeksBetween = differenceInWeeks(endDate, startDate);
    const total = Math.max(1, weeksBetween + 1);
    const remaining = total - (modalData.paidSessions || 0);
    
    return { totalSessions: total, remainingSessions: remaining, recurrenceEndError: null };
  }, [modalData.isRecurring, modalData.recurrenceEnd, dateValue, modalData.paidSessions]);
  
  // Check futbol time validation
  useEffect(() => {
    if (courtType === 'futbol' && selectedHour) {
      const [_, minutesStr] = selectedHour.split(':');
      const minutes = parseInt(minutesStr, 10);
      
      if (minutes !== 0) {
        setTimeError("Para canchas de fútbol, sólo se permiten reservas en horas exactas.");
      } else {
        setTimeError(null);
      }
    } else {
      setTimeError(null);
    }
  }, [courtType, selectedHour]);
  
  // Check availability effect
  useEffect(() => {
    if (!dateValue || !modalData.courtId) return;
    
    const dateStr = dateValue;
    const now = new Date();
    const isSameDay = format(now, 'yyyy-MM-dd') === dateStr;
    const currentHour = now.getHours();

    fetch(`/api/bookings?weekStart=${dateStr}&weekEnd=${dateStr}&courtId=${modalData.courtId}`, {
      headers: { 'Cache-Control': 'no-cache' }
    })
      .then(res => res.json())
      .then(data => {
        if (data.court && data.court.reservations) {
          const bookedSlots = new Set<string>();

          // Skip current reservation when checking availability in edit mode
          const reservationsToCheck = modalData.type === 'edit' && modalData.reservation
            ? data.court.reservations.filter((res: any) => res.id !== modalData.reservation?.id)
            : data.court.reservations;

          reservationsToCheck.forEach((res: any) => {
            const start = new Date(res.startTime);
            const end = new Date(res.endTime);

            let current = new Date(start);
            while (current < end) {
              bookedSlots.add(format(current, 'HH:mm'));
              current.setMinutes(current.getMinutes() + 30);
            }
          });

          // Generate all possible time slots based on court type
          const allPossibleSlots: string[] = [];
          for (let hour = 10; hour <= 24; hour++) {
            const displayHour = hour === 24 ? 0 : hour;
            const formattedHour = displayHour < 10 ? `0${displayHour}` : `${displayHour}`;

            allPossibleSlots.push(`${formattedHour}:00`);

            // For padel courts, also include half-hour slots
            if (data.court.type === 'padel' && hour < 24) {
              allPossibleSlots.push(`${formattedHour}:30`);
            }
          }

          // Filter out unavailable times
          const available = allPossibleSlots.filter(timeSlot => {
            const [hours] = timeSlot.split(':').map(Number);

            if (isSameDay && hours <= currentHour) {
              return false;
            }

            return !bookedSlots.has(timeSlot);
          });
          
          setAvailableTimeSlots(available);
        }
      })
      .catch(err => {
        console.error("Error fetching reservations:", err);
      });
  }, [dateValue, modalData.courtId, modalData.type, modalData.reservation]);

  // Initial focus
  useEffect(() => {
    if (modalData.type && nameRef.current) {
      setTimeout(() => nameRef.current?.focus(), 100);
    }
  }, [modalData.type]);

  // Form validation
  const isNameValid = (modalData.name?.trim().length || 0) >= 3 && (modalData.name?.length || 0) <= 50;
  const isPhoneValid = (modalData.phone?.trim().length || 0) >= 3 && (modalData.phone?.length || 0) <= 20;
  const isTimeValid = timeError === null && !isTimeUnavailable;
  const isCourtSelected = !!selectedCourtId;
  const isViewMode = modalData.type === 'view';
  const isDisabled = loading || isViewMode || transactionLoading;
  
  const isFormValid = 
    (modalData.name?.trim().length || 0) > 0 &&
    (modalData.phone?.trim().length || 0) > 0 &&
    isCourtSelected &&
    selectedHour &&
    isTimeValid &&
    (!isPaid || (modalData.paymentAmount || 0) > 0);

  // Form handlers
  const handleFormChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>
  ) => {
    const { name, value, type } = e.target;

    // Handle checkbox inputs
    if (type === 'checkbox') {
      const checked = (e.target as HTMLInputElement).checked;
      setModalData(prev => ({ ...prev, [name]: checked }));
      return;
    }

    // Handle phone numbers - strip non-numeric characters
    if (name === 'phone') {
      const numericValue = value.replace(/\D/g, '');
      setModalData(prev => ({ ...prev, [name]: numericValue }));
      return;
    }

    // Handle payment status
    if (name === 'paymentStatus') {
      const newIsPaid = value === 'paid';
      setModalData(prev => ({
        ...prev,
        paymentMethod: newIsPaid ? 'cash' : 'pending',
        paymentAmount: newIsPaid ? prev.paymentAmount || 0 : 0
      }));
      return;
    }
    
    // Handle date field
    if (name === 'date') {
      const parsedDate = parse(value, 'yyyy-MM-dd', new Date());
      if (isValid(parsedDate)) {
        setDateValue(value);
        setModalData(prev => ({ ...prev, selectedDay: parsedDate }));
      } else {
        setDateValue(value);
      }
      return;
    }

    // Handle court selection
    if (name === 'court') {
      setModalData(prev => ({ ...prev, courtId: value }));
      return;
    }
    
    // Handle hour selection
    if (name === 'time') {
      setModalData(prev => ({ ...prev, selectedHour: value }));
      return;
    }
    
    // Handle all other inputs directly
    setModalData(prev => ({ ...prev, [name]: value }));
  };

  // Toggle sections in mobile view
  const toggleSection = (section: string) => {
    setExpandedSection(expandedSection === section ? "" : section);
  };

  // Create transaction for payment
// En ReservationModal.tsx, función createTransaction
const createTransaction = async (reservationId: string): Promise<boolean> => {
  console.log(modalData, reservationId)
  if (!isPaid || !reservationId) return false;

  setTransactionLoading(true);

  try {
    // Asegura que el monto sea un número
    let paymentAmount = 0;
    if (typeof modalData.paymentAmount === 'number') {
      paymentAmount = modalData.paymentAmount;
    } else if (typeof modalData.paymentAmount === 'string') {
      // Limpia y convierte a número
      const cleanedAmount = modalData.paymentAmount.replace(/[^0-9.]/g, '');
      paymentAmount = parseFloat(cleanedAmount);
    }
    
    if (isNaN(paymentAmount) || paymentAmount <= 0) {
      throw new Error("El monto de pago no es válido");
    }
    
    const response = await fetch('/api/transactions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        type: 'income',
        category: 'court_rental',
        amount: paymentAmount, // Ahora es un número válido
        description: `Reserva: ${selectedCourt?.name || ''} - ${modalData.name}`,
        paymentMethod: modalData.paymentMethod,
        location: '',
        reservationId
      })
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error || 'Error al crear la transacción');
    }

    return true;
  } catch (error) {
    console.error('Error creating transaction:', error);
    setError(error instanceof Error ? error.message : 'Error al registrar el pago');
    return false;
  } finally {
    setTransactionLoading(false);
  }
};

  // Form submission handler
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (isPaid && (modalData.paymentAmount || 0) <= 0) {
      setError("Por favor ingrese un monto válido para el pago");
      return;
    }
    console.log(modalData)
    if (modalData.type === 'create') {
      try {
        const reservationData = await handleBooking();
      
      if (reservationData && isPaid) {
        await createTransaction(reservationData.id);
      }
      } catch (error) {
        console.error('Error al procesar la reserva:', error);
      }
    } else if (modalData.type === 'edit') {
      try {
        await handleUpdatePayment();
        if (isPaid && !alreadyPaid && modalData.reservation?.id) {
          await createTransaction(modalData.reservation.id);
        }
      } catch (error) {
        console.error('Error al actualizar la reserva:', error);
      }
    }
  };

  // Helper function to get payment method display text
  const getPaymentMethodDisplay = (method: string) => {
    switch (method) {
      case 'cash': return 'Efectivo';
      case 'transfer': return 'Transferencia';
      case 'card': return 'Tarjeta';
      default: return 'Otro';
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4 overflow-y-auto">
      <div className="bg-white p-5 rounded max-w-4xl w-full shadow-lg my-20 md:my-8 max-h-[80vh] overflow-y-auto">
        <div className="flex justify-between items-center mb-4">
          <div className="font-bold text-xl">
            {modalData.type === 'create' && 'Nueva Reserva'}
            {modalData.type === 'edit' && 'Editar Reserva'}
            {modalData.type === 'view' && 'Detalles de Reserva'}
          </div>
          <button
            onClick={closeModal}
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

        {/* Información de reserva */}
        {selectedHour && endTimeDisplay && (
          <div className="p-3 bg-blue-50 rounded mb-3">
            <div className="flex justify-between items-center">
              <div className="flex items-center">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-blue-500 mr-2" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-12a1 1 0 10-2 0v4a1 1 0 00.293.707l2.828 2.829a1 1 0 101.415-1.415L11 9.586V6z" clipRule="evenodd" />
                </svg>
                <div>
                  <div>{format(parse(dateValue, 'yyyy-MM-dd', new Date()), "EEEE d 'de' MMMM", { locale: es })}</div>
                  <div className="text-sm">
                    {selectedHour} - {endTimeDisplay}
                    <span className="text-xs text-gray-500 ml-2">
                      ({courtType === 'padel' ? '90 minutos' : '60 minutos'})
                    </span>
                  </div>
                </div>
              </div>

              {/* Badge "Reserva pagada" solo si alreadyPaid es true */}
              {alreadyPaid && modalData.type === 'edit' && (
                <div className="bg-green-100 text-green-800 px-3 py-1 rounded-full text-sm font-medium flex items-center">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                  </svg>
                  Reserva pagada
                </div>
              )}
            </div>
          </div>
        )}

        <form onSubmit={handleSubmit} noValidate>
          {/* Vista móvil */}
          <div className="md:hidden space-y-4">
            <div className="border rounded overflow-hidden">
              <button
                type="button"
                className={`w-full p-3 text-left font-semibold flex justify-between items-center ${expandedSection === "client" ? "bg-blue-50" : "bg-gray-50"}`}
                onClick={() => toggleSection("client")}
              >
                <div className="flex items-center">
                  <Users className="h-5 w-5 text-gray-700 mr-2" />
                  Información del Cliente
                </div>
                <svg xmlns="http://www.w3.org/2000/svg" className={`h-5 w-5 transform ${expandedSection === "client" ? "rotate-180" : ""}`} viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clipRule="evenodd" />
                </svg>
              </button>

              {expandedSection === "client" && (
                <div className="p-4 space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Nombre <span className="text-red-500">*</span>
                    </label>
                    <input
                      ref={nameRef}
                      type="text"
                      name="name"
                      value={modalData.name || ''}
                      onChange={handleFormChange}
                      className={`w-full p-2 border rounded focus:ring-blue-500 focus:border-blue-500 ${modalData.name?.length > 0 && !isNameValid ? 'border-red-500' : ''}`}
                      placeholder="Nombre del cliente"
                      disabled={isDisabled}
                      maxLength={50}
                      required
                    />
                    {modalData.name?.length > 0 && !isNameValid && (
                      <p className="text-xs text-red-500 mt-1">Mínimo 3 caracteres</p>
                    )}
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Teléfono <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      name="phone"
                      value={modalData.phone || ''}
                      onChange={handleFormChange}
                      className={`w-full p-2 border rounded focus:ring-blue-500 focus:border-blue-500 ${modalData.phone?.length > 0 && !isPhoneValid ? 'border-red-500' : ''}`}
                      placeholder="Número de teléfono"
                      disabled={isDisabled}
                      maxLength={20}
                      required
                    />
                    {modalData.phone?.length > 0 && !isPhoneValid && (
                      <p className="text-xs text-red-500 mt-1">Mínimo 3 dígitos</p>
                    )}
                  </div>

                  {/* Sección de pago */}
                  {alreadyPaid ? (
                    <div className="mt-4">
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Estado de pago
                      </label>
                      <div className="text-sm p-2 bg-green-50 border border-green-100 rounded">
                        Pagado con {getPaymentMethodDisplay(modalData.reservation?.paymentMethod || '')}
                      </div>
                    </div>
                  ) : (
                    <>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Estado de pago
                        </label>
                        <div className="relative">
                          <select
                            name="paymentStatus"
                            value={isPaid ? 'paid' : 'pending'}
                            onChange={handleFormChange}
                            className="w-full p-2 border rounded focus:ring-blue-500 focus:border-blue-500 appearance-none"
                            disabled={isDisabled}
                          >
                            <option value="pending">Pendiente</option>
                            <option value="paid">Pagado</option>
                          </select>
                          <div className="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none">
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-gray-400" viewBox="0 0 20 20" fill="currentColor">
                              <path fillRule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clipRule="evenodd" />
                            </svg>
                          </div>
                        </div>
                      </div>

                      {isPaid && (
                        <>
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                              Monto <span className="text-red-500">*</span>
                            </label>
                            <div className="relative">
                              <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-gray-500">$</span>
                              <input
                                type="number"
                                name="paymentAmount"
                                value={modalData.paymentAmount || ''}
                                onChange={handleFormChange}
                                className="w-full p-2 pl-7 border rounded focus:ring-blue-500 focus:border-blue-500"
                                placeholder="0.00"
                                disabled={isDisabled}
                                step="0.01"
                                min="0"
                                required={isPaid}
                              />
                            </div>
                            {isPaid && (modalData.paymentAmount || 0) <= 0 && (
                              <p className="text-xs text-red-500 mt-1">Ingrese un monto válido</p>
                            )}
                          </div>

                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                              Método de pago
                            </label>
                            <div className="relative">
                              <select
                                name="paymentMethod"
                                value={modalData.paymentMethod}
                                onChange={handleFormChange}
                                className="w-full p-2 border rounded focus:ring-blue-500 focus:border-blue-500 appearance-none"
                                disabled={isDisabled}
                              >
                                <option value="cash">Efectivo</option>
                                <option value="transfer">Transferencia</option>
                                <option value="card">Tarjeta</option>
                              </select>
                              <div className="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none">
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-gray-400" viewBox="0 0 20 20" fill="currentColor">
                                  <path fillRule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clipRule="evenodd" />
                                </svg>
                              </div>
                            </div>
                          </div>
                        </>
                      )}
                    </>
                  )}

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Notas de pago
                    </label>
                    <textarea
                      name="paymentNotes"
                      value={modalData.paymentNotes || ''}
                      onChange={handleFormChange}
                      className="w-full p-2 border rounded focus:ring-blue-500 focus:border-blue-500"
                      placeholder="Notas adicionales sobre el pago"
                      rows={3}
                      disabled={isDisabled}
                      maxLength={255}
                    />
                    <div className="text-xs text-gray-500 mt-1">
                      {(modalData.paymentNotes?.length || 0)}/255 caracteres
                    </div>
                  </div>
                </div>
              )}
            </div>

            <div className="border rounded overflow-hidden">
              <button
                type="button"
                className={`w-full p-3 text-left font-semibold flex justify-between items-center ${expandedSection === "reservation" ? "bg-blue-50" : "bg-gray-50"}`}
                onClick={() => toggleSection("reservation")}
              >
                <div className="flex items-center">
                  <CalendarIcon className="h-5 w-5 text-gray-700 mr-2"/>
                  Detalles de la Reservaa
                </div>
                <svg xmlns="http://www.w3.org/2000/svg" className={`h-5 w-5 transform ${expandedSection === "reservation" ? "rotate-180" : ""}`} viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clipRule="evenodd" />
                </svg>
              </button>

              {expandedSection === "reservation" && (
                <div className="p-4 space-y-4">
                  {(modalData.type === 'create' || modalData.type === 'edit') && modalData.courts && modalData.courts.length > 0 && (
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Cancha <span className="text-red-500">*</span>
                      </label>
                      <div className="relative">
                        <select
                          name="court"
                          value={selectedCourtId}
                          onChange={handleFormChange}
                          className={`w-full p-2 border rounded focus:ring-blue-500 focus:border-blue-500 ${!isCourtSelected ? 'border-red-500' : ''}`}
                          disabled={isDisabled || (modalData.type === 'edit' && alreadyPaid)}
                          required
                        >
                          <option value="" disabled>Selecciona una cancha</option>
                          {modalData.courts.map(court => (
                            <option key={court.id} value={court.id}>
                              {court.name} ({court.type === 'futbol' ? 'Fútbol' : 'Pádel'})
                            </option>
                          ))}
                        </select>
                        <div className="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none">
                          <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-gray-400" viewBox="0 0 20 20" fill="currentColor">
                            <path fillRule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clipRule="evenodd" />
                          </svg>
                        </div>
                      </div>
                      {!isCourtSelected && (
                        <p className="text-xs text-red-500 mt-1">Selecciona una cancha</p>
                      )}
                    </div>
                  )}

                  {(modalData.type === 'create' || modalData.type === 'edit') && (
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Fecha <span className="text-red-500">*</span>
                      </label>
                      <div className="relative">
                        <input
                          type="date"
                          name="date"
                          value={dateValue}
                          onChange={handleFormChange}
                          className="w-full p-2 border rounded focus:ring-blue-500 focus:border-blue-500"
                          disabled={isDisabled || (modalData.type === 'edit' && alreadyPaid)}
                          min={format(new Date(), 'yyyy-MM-dd')}
                        />
                        <div className="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none">
                          <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-gray-400" viewBox="0 0 20 20" fill="currentColor">
                            <path fillRule="evenodd" d="M6 2a1 1 0 00-1 1v1H4a2 2 0 00-2 2v10a2 2 0 002 2h12a2 2 0 002-2V6a2 2 0 00-2-2h-1V3a1 1 0 10-2 0v1H7V3a1 1 0 00-1-1zm0 5a1 1 0 000 2h8a1 1 100-2H6z" clipRule="evenodd" />
                          </svg>
                        </div>
                      </div>
                    </div>
                  )}

                  {(modalData.type === 'create' || modalData.type === 'edit') && selectedCourtId && (
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Hora <span className="text-red-500">*</span>
                      </label>

                      <div className="relative">
                        <input
                          type="time"
                          name="time"
                          value={selectedHour}
                          onChange={handleFormChange}
                          className={`w-full p-2 border rounded focus:ring-blue-500 focus:border-blue-500 ${isTimeUnavailable || timeError ? 'border-red-500 bg-red-50' : ''}`}
                          disabled={isDisabled || (modalData.type === 'edit' && alreadyPaid)}
                          required
                          min="10:00"
                          max="24:00"
                          step={courtType === 'futbol' ? "3600" : "1800"}
                        />
                        <div className="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none">
                          <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-gray-400" viewBox="0 0 20 20" fill="currentColor">
                            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-12a1 1 0 10-2 0v4a1 1 0 00.293.707l2.828 2.829a1 1 0 101.415-1.415L11 9.586V6z" clipRule="evenodd" />
                          </svg>
                        </div>
                      </div>

                      {courtType === 'futbol' && (
                        <p className="text-xs text-blue-600 mt-1">
                          Para fútbol, sólo se permiten reservas en horas exactas (10:00, 11:00, etc.)
                        </p>
                      )}

                      {courtType === 'padel' && (
                        <p className="text-xs text-blue-600 mt-1">
                          Para pádel, se permiten reservas a horas exactas o medias horas (10:00, 10:30, etc.)
                        </p>
                      )}

                      {timeError && (
                        <p className="text-xs text-red-500 mt-1">{timeError}</p>
                      )}

                      {isTimeUnavailable && (
                        <p className="text-xs text-red-500 mt-1">
                          Este horario no está disponible o ya ha pasado
                        </p>
                      )}
                    </div>
                  )}

                  <div className="mt-4">
                    <label className="flex items-center">
                      <input
                        type="checkbox"
                        name="isRecurring"
                        checked={modalData.isRecurring || false}
                        onChange={handleFormChange}
                        className="h-4 w-4 text-blue-600 rounded focus:ring-blue-500 mr-2"
                        disabled={isDisabled}
                      />
                      <span className="text-sm font-medium text-gray-700">Turno fijo semanal</span>
                    </label>
                    <p className="text-xs text-gray-500 ml-6">Reserva este mismo horario todas las semanas</p>
                  </div>

                  {modalData.isRecurring && (
                    <div className="pl-6 space-y-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Fecha final <span className="text-red-500">*</span>
                        </label>
                        <input
                          type="date"
                          name="recurrenceEnd"
                          value={modalData.recurrenceEnd || ''}
                          onChange={handleFormChange}
                          className={`w-full p-2 border rounded focus:ring-blue-500 focus:border-blue-500 ${recurrenceEndError ? 'border-red-500' : ''}`}
                          disabled={isDisabled}
                          min={dateValue}
                          required={modalData.isRecurring}
                        />
                        {recurrenceEndError && (
                          <p className="text-xs text-red-500 mt-1">{recurrenceEndError}</p>
                        )}
                        {totalSessions > 0 && !recurrenceEndError && (
                          <p className="text-xs text-blue-600 mt-1">
                            Total de sesiones: {totalSessions} (una por semana)
                          </p>
                        )}
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Sesiones pagadas
                        </label>
                        <input
                          type="number"
                          name="paidSessions"
                          value={modalData.paidSessions || 0}
                          onChange={handleFormChange}
                          className="w-full p-2 border rounded focus:ring-blue-500 focus:border-blue-500"
                          placeholder="0"
                          min="0"
                          max={totalSessions}
                          disabled={isDisabled || recurrenceEndError !== null}
                        />
                        {totalSessions > 0 && modalData.paidSessions !== undefined && !recurrenceEndError && (
                          <p className="text-xs text-blue-600 mt-1">
                            Sesiones pendientes de pago: {remainingSessions}
                          </p>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Vista desktop */}
          <div className="hidden md:grid md:grid-cols-2 gap-6 mb-6">
            <div className="space-y-4">
              <div className="flex items-center mb-2">
                <Users className="h-5 w-5 text-gray-700 mr-2" />
                <h2 className="text-lg font-medium">Información del Cliente</h2>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Nombre <span className="text-red-500">*</span>
                </label>
                <input
                  ref={nameRef}
                  type="text"
                  name="name"
                  value={modalData.name || ''}
                  onChange={handleFormChange}
                  className={`w-full p-2 border rounded focus:ring-blue-500 focus:border-blue-500 ${modalData.name?.length > 0 && !isNameValid ? 'border-red-500' : ''}`}
                  placeholder="Nombre del cliente"
                  disabled={isDisabled}
                  maxLength={50}
                  required
                />
                {modalData.name?.length > 0 && !isNameValid && (
                  <p className="text-xs text-red-500 mt-1">Mínimo 3 caracteres</p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Teléfono <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  name="phone"
                  value={modalData.phone || ''}
                  onChange={handleFormChange}
                  className={`w-full p-2 border rounded focus:ring-blue-500 focus:border-blue-500 ${modalData.phone?.length > 0 && !isPhoneValid ? 'border-red-500' : ''}`}
                  placeholder="Número de teléfono"
                  disabled={isDisabled}
                  maxLength={20}
                  required
                />
                {modalData.phone?.length > 0 && !isPhoneValid && (
                  <p className="text-xs text-red-500 mt-1">Mínimo 3 dígitos</p>
                )}
              </div>

              <div className="flex items-center mt-6 mb-2">
                {/* <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-gray-700 mr-2" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M4 4a2 2 0 00-2 2v4a2 2 01-2 2V6h10a2 2 00-2-2H4zm2 6a2 2 012-2h8a2 2 012 2v4a2 2 01-2-2v-4zm6 4a2 2 100-4 2 2 000 4z" clipRule="evenodd" />
                </svg> */}
                <DollarSign className="h-5 w-5 text-gray-700 mr-2" />
                <h2 className="text-lg font-medium">Detalles de Pago</h2>
              </div>
              {alreadyPaid ? (
                <div className="p-3 bg-green-50 rounded mb-4">
                  <div className="flex items-center">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-green-600 mr-2" viewBox="0 0 20 20" fill="currentColor">
                      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                    </svg>
                    <div>
                      <div className="font-medium text-green-800">Método de pago: {getPaymentMethodDisplay(modalData.reservation?.paymentMethod || '')}</div>
                    </div>
                  </div>
                </div>
              ) : (
                <>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Estado de pago
                    </label>
                    <select
                      name="paymentStatus"
                      value={isPaid ? 'paid' : 'pending'}
                      onChange={handleFormChange}
                      className="w-full p-2 border rounded focus:ring-blue-500 focus:border-blue-500 appearance-none"
                      disabled={isDisabled}
                    >
                      <option value="pending">Pendiente</option>
                      <option value="paid">Pagado</option>
                    </select>
                  </div>

                  {isPaid && (
                    <div className="mt-4 space-y-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Monto <span className="text-red-500">*</span>
                        </label>
                        <input
                          type="number"
                          name="paymentAmount"
                          value={modalData.paymentAmount || ''}
                          onChange={handleFormChange}
                          className="w-full p-2 border rounded focus:ring-blue-500 focus:border-blue-500"
                          placeholder="0.00"
                          disabled={isDisabled}
                          step="0.01"
                          min="0"
                          required={isPaid}
                        />
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Método de pago
                        </label>
                        <select
                          name="paymentMethod"
                          value={modalData.paymentMethod}
                          onChange={handleFormChange}
                          className="w-full p-2 border rounded focus:ring-blue-500 focus:border-blue-500 appearance-none"
                          disabled={isDisabled}
                        >
                          <option value="cash">Efectivo</option>
                          <option value="transfer">Transferencia</option>
                          <option value="card">Tarjeta</option>
                        </select>
                      </div>
                    </div>
                  )}
                </>
              )}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Notas de pago
                </label>
                <textarea
                  name="paymentNotes"
                  value={modalData.paymentNotes || ''}
                  onChange={handleFormChange}
                  className="w-full p-2 border rounded focus:ring-blue-500 focus:border-blue-500"
                  placeholder="Notas adicionales sobre el pago"
                  rows={3}
                  disabled={isDisabled}
                  maxLength={255}
                />
              </div>
            </div>

            <div className="space-y-4">
              <div className="flex items-center mb-2">
                <CalendarIcon className="h-5 w-5 text-gray-700 mr-2" />
                <h2 className="text-lg font-medium">Detalles de la Reserva</h2>
              </div>

              {(modalData.type === 'create' || modalData.type === 'edit') && modalData.courts && modalData.courts.length > 0 && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Cancha <span className="text-red-500">*</span>
                  </label>
                  <select
                    name="court"
                    value={selectedCourtId}
                    onChange={handleFormChange}
                    className={`w-full p-2 border rounded focus:ring-blue-500 focus:border-blue-500 ${!isCourtSelected ? 'border-red-500' : ''}`}
                    disabled={isDisabled}
                    required
                  >
                    <option value="" disabled>Selecciona una cancha</option>
                    {modalData.courts.map(court => (
                      <option key={court.id} value={court.id}>
                        {court.name} ({court.type === 'futbol' ? 'Fútbol' : 'Pádel'})
                      </option>
                    ))}
                  </select>
                  {!isCourtSelected && (
                    <p className="text-xs text-red-500 mt-1">Selecciona una cancha</p>
                  )}
                </div>
              )}

              {(modalData.type === 'create' || modalData.type === 'edit') && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Fecha <span className="text-red-500">*</span>
                  </label>
                  <div className="relative">
                    <input
                      type="date"
                      name="date"
                      value={dateValue}
                      onChange={handleFormChange}
                      className="w-full p-2 border rounded focus:ring-blue-500 focus:border-blue-500"
                      disabled={isDisabled}
                      min={format(new Date(), 'yyyy-MM-dd')}
                    />
                    <div className="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none">
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-gray-400" viewBox="0 0 20 20" fill="currentColor">
                        <path fillRule="evenodd" d="M6 2a1 1 0 00-1 1v1H4a2 2 0 00-2 2v10a2 2 0 002 2h12a2 2 0 002-2V6a2 2 0 00-2-2h-1V3a1 1 0 10-2 0v1H7V3a1 1 0 00-1-1zm0 5a1 1 0 000 2h8a1 1 100-2H6z" clipRule="evenodd" />
                      </svg>
                    </div>
                  </div>
                </div>
              )}

              {(modalData.type === 'create' || modalData.type === 'edit') && selectedCourtId && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Hora <span className="text-red-500">*</span>
                  </label>

                  <div className="relative">
                    <input
                      type="time"
                      name="time"
                      value={selectedHour}
                      onChange={handleFormChange}
                      className={`w-full p-2 border rounded focus:ring-blue-500 focus:border-blue-500 ${isTimeUnavailable || timeError ? 'border-red-500 bg-red-50' : ''}`}
                      disabled={isDisabled}
                      required
                      min="10:00"
                      max="24:00"
                      step={courtType === 'futbol' ? "3600" : "1800"}
                    />
                    <div className="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none">
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-gray-400" viewBox="0 0 20 20" fill="currentColor">
                        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-12a1 1 0 10-2 0v4a1 1 0 00.293.707l2.828 2.829a1 1 0 101.415-1.415L11 9.586V6z" clipRule="evenodd" />
                      </svg>
                    </div>
                  </div>

                  {courtType === 'futbol' && (
                    <p className="text-xs text-blue-600 mt-1">
                      Para fútbol, sólo se permiten reservas en horas exactas (10:00, 11:00, etc.)
                    </p>
                  )}

                  {courtType === 'padel' && (
                    <p className="text-xs text-blue-600 mt-1">
                      Para pádel, se permiten reservas a horas exactas o medias horas (10:00, 10:30, etc.)
                    </p>
                  )}

                  {timeError && (
                    <p className="text-xs text-red-500 mt-1">{timeError}</p>
                  )}

                  {isTimeUnavailable && (
                    <p className="text-xs text-red-500 mt-1">
                      Este horario no está disponible o ya ha pasado
                    </p>
                  )}
                </div>
              )}

              <div className="mt-4">
                <label className="flex items-center">
                  <input
                    type="checkbox"
                    name="isRecurring"
                    checked={modalData.isRecurring || false}
                    onChange={handleFormChange}
                    className="h-4 w-4 text-blue-600 rounded focus:ring-blue-500 mr-2"
                    disabled={isDisabled || (modalData.type === 'edit' && alreadyPaid)}
                  />
                  <span className="text-sm font-medium text-gray-700">Turno fijo semanal</span>
                </label>
                <p className="text-xs text-gray-500 ml-6">Reserva este mismo horario todas las semanas</p>
              </div>

              {modalData.isRecurring && (
                <div className="pl-6 space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Fecha final <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="date"
                      name="recurrenceEnd"
                      value={modalData.recurrenceEnd || ''}
                      onChange={handleFormChange}
                      className={`w-full p-2 border rounded focus:ring-blue-500 focus:border-blue-500 ${recurrenceEndError ? 'border-red-500' : ''}`}
                      disabled={isDisabled || (modalData.type === 'edit' && alreadyPaid)}
                      min={dateValue}
                      required={modalData.isRecurring}
                    />
                    {recurrenceEndError && (
                      <p className="text-xs text-red-500 mt-1">{recurrenceEndError}</p>
                    )}
                    {totalSessions > 0 && !recurrenceEndError && (
                      <p className="text-xs text-blue-600 mt-1">
                        Total de sesiones: {totalSessions} (una por semana)
                      </p>
                    )}
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Sesiones pagadas
                    </label>
                    <input
                      type="number"
                      name="paidSessions"
                      value={modalData.paidSessions || 0}
                      onChange={handleFormChange}
                      className="w-full p-2 border rounded focus:ring-blue-500 focus:border-blue-500"
                      placeholder="0"
                      min="0"
                      max={totalSessions}
                      disabled={isDisabled || recurrenceEndError !== null || (modalData.type === 'edit' && alreadyPaid)}
                    />
                    {totalSessions > 0 && modalData.paidSessions !== undefined && !recurrenceEndError && (
                      <p className="text-xs text-blue-600 mt-1">
                        Sesiones pendientes de pago: {remainingSessions}
                      </p>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>

          <div className="flex justify-between items-center border-t pt-4 mt-4">
            <div>
              {modalData.type === 'edit' && (
                <button
                  type="button"
                  onClick={() => handleCancel(modalData.reservation?.id || '')}
                  disabled={loading || transactionLoading}
                  className="px-4 py-2 border border-red-600 rounded shadow-sm text-sm font-medium text-red-600 hover:bg-red-50"
                >
                  Cancelar
                </button>
              )}
            </div>

            <div className="flex gap-3">
              {(modalData.type === 'create' || modalData.type === 'edit') && (
                <button
                  type="submit"
                  disabled={loading || transactionLoading || !isFormValid}
                  className="px-4 py-2 border border-transparent rounded shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {loading || transactionLoading ? 'Guardando...' : modalData.type === 'create' ? 'Crear' : 'Actualizar'}
                </button>
              )}
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}