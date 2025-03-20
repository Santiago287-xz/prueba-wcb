"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { format, startOfWeek, addDays, isSameDay, getHours, endOfWeek, parseISO, isPast } from "date-fns";
import { es } from 'date-fns/locale';

// Define interfaces for type safety
interface Court {
  id: string;
  name: string;
  type?: string;
}

interface Reservation {
  id: string;
  courtId: string;
  startTime: string | Date;
  endTime: string | Date;
  guestName: string;
  guestPhone: string;
  paymentMethod: string;
  isRecurring: boolean;
  recurrenceEnd?: string | Date;
  paidSessions?: number;
  paymentNotes?: string;
}

interface CourtData {
  id: string;
  name: string;
  type?: string;
  reservations: Reservation[];
}

interface Event {
  id: string;
  name: string;
  startTime: string | Date;
  endTime: string | Date;
}

interface FormDataType {
  guestName: string;
  guestPhone: string;
  paymentMethod: string;
  isRecurring: boolean;
  recurrenceEnd: string;
  paidSessions?: number;
  paymentNotes?: string;
}

interface ModalDataType {
  isOpen: boolean;
  type: 'create' | 'edit' | 'view';
  reservation: Reservation | null;
  selectedDay?: Date;
  selectedHour?: number;
  paidSessions: number;
  paymentMethod: string;
  paymentNotes: string;
  guestName: string;
  guestPhone: string;
  isRecurring: boolean;
  recurrenceEnd: string;
}

export default function WeeklyBookingCalendar() {
  // Estados principales consolidados
  const [courts, setCourts] = useState<Court[]>([]);
  const [selectedCourt, setSelectedCourt] = useState<Court | null>(null);
  const [weekStart, setWeekStart] = useState<Date>(startOfWeek(new Date(), { weekStartsOn: 1 }));
  const [courtData, setCourtData] = useState<CourtData | null>(null);
  const [isBlocked, setIsBlocked] = useState<boolean>(false);
  const [event, setEvent] = useState<Event | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const fetchInProgress = useRef<boolean>(false);
  const dataCache = useRef<Record<string, any>>({});
  
  // Modal único para todas las interacciones
  const [modalData, setModalData] = useState<ModalDataType>({
    isOpen: false,
    type: 'create',
    reservation: null,
    paidSessions: 0,
    paymentMethod: 'pending',
    paymentNotes: '',
    guestName: '',
    guestPhone: '',
    isRecurring: false,
    recurrenceEnd: ''
  });

  // Constantes
  const daysOfWeek = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i));
  const hours = Array.from({ length: 7 }, (_, i) => i + 12);
  const today = new Date();

  // Cargar canchas - solo una vez
  useEffect(() => {
    async function fetchCourts() {
      try {
        const res = await fetch("/api/courts");
        const data = await res.json();
        setCourts(data);
      } catch (error) {
        // Error silencioso en producción
      }
    }
    fetchCourts();
  }, []);

  // Función para cargar los datos de la cancha
  const fetchCourtData = useCallback(async (courtId: string, startDate: Date) => {
    if (fetchInProgress.current) {
      return;
    }
    
    const cacheKey = `${courtId}_${format(startDate, "yyyy-MM-dd")}`;
    
    if (dataCache.current[cacheKey]) {
      const cachedData = dataCache.current[cacheKey];
      
      if (cachedData.blocked) {
        setIsBlocked(true);
        setEvent(cachedData.event);
        setCourtData(null);
      } else {
        setIsBlocked(false);
        setEvent(null);
        setCourtData(cachedData.court);
      }
      return;
    }
    
    fetchInProgress.current = true;
    setLoading(true);
    
    try {
      const weekEnd = endOfWeek(startDate, { weekStartsOn: 1 });
      weekEnd.setHours(24, 59, 59, 999);
      
      const res = await fetch(
        `/api/bookings?weekStart=${format(startDate, "yyyy-MM-dd")}&weekEnd=${format(weekEnd, "yyyy-MM-dd")}&courtId=${courtId}`,
        { cache: 'no-store' }
      );
      
      if (!res.ok) {
        throw new Error(`Error obteniendo datos: ${res.status} ${res.statusText}`);
      }
      
      const data = await res.json();
      
      // Guardar en cache
      dataCache.current[cacheKey] = data;
      
      if (data.blocked) {
        setIsBlocked(true);
        setEvent(data.event);
        setCourtData(null);
      } else {
        setIsBlocked(false);
        setEvent(null);
        setCourtData(data.court);
      }
    } catch (error) {
      // Error silencioso en producción
    } finally {
      setLoading(false);
      fetchInProgress.current = false;
    }
  }, []);

  // Manejar cambios de cancha o semana
  useEffect(() => {
    if (!selectedCourt) return;
    
    fetchCourtData(selectedCourt.id, weekStart);
  }, [selectedCourt, weekStart, fetchCourtData]);

  // Funciones principales
  const handleBooking = async () => {
    if (loading || !selectedCourt || !modalData.selectedDay || modalData.selectedHour === undefined) return;
    
    const { guestName, guestPhone, paymentMethod, isRecurring, recurrenceEnd, paidSessions, paymentNotes } = modalData;
    
    if (!guestName || !guestPhone) {
      alert("Por favor, ingresa nombre y teléfono");
      return;
    }

    const startTime = new Date(modalData.selectedDay);
    startTime.setHours(modalData.selectedHour, 0, 0);
    const endTime = new Date(startTime);
    endTime.setHours(modalData.selectedHour + 1, 30, 0);

    const body = {
      courtId: selectedCourt.id,
      startTime: startTime.toISOString(),
      endTime: endTime.toISOString(),
      guestName,
      guestPhone,
      paymentMethod,
      isRecurring: isRecurring || false,
      ...(isRecurring && recurrenceEnd ? { recurrenceEnd: new Date(recurrenceEnd).toISOString() } : {}),
      ...(isRecurring && paidSessions !== undefined ? { paidSessions } : {}),
      ...(paymentNotes ? { paymentNotes } : {})
    };

    setLoading(true);
    
    try {
      const res = await fetch("/api/bookings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.error || "Error al crear la reserva");
      }
      
      await res.json();
      
      // Limpiar cache para esta semana
      const cacheKey = `${selectedCourt.id}_${format(weekStart, "yyyy-MM-dd")}`;
      delete dataCache.current[cacheKey];
      
      closeModal();
      
      // Recargar datos
      await fetchCourtData(selectedCourt.id, weekStart);
    } catch (error) {
      alert(error instanceof Error ? error.message : "Error al crear la reserva");
    } finally {
      setLoading(false);
    }
  };

  const handleCancel = async (id: string) => {
    if (loading || !selectedCourt) return;
    
    setLoading(true);
    
    try {
      const res = await fetch("/api/bookings", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reservationId: id }),
      });
      
      if (!res.ok) {
        throw new Error("Error al cancelar la reserva");
      }
      
      // Limpiar cache y recargar
      const cacheKey = `${selectedCourt.id}_${format(weekStart, "yyyy-MM-dd")}`;
      delete dataCache.current[cacheKey];
      
      await fetchCourtData(selectedCourt.id, weekStart);
      
      closeModal();
    } catch (error) {
      alert("Error al cancelar la reserva");
    } finally {
      setLoading(false);
    }
  };

  const openModal = (type: 'create' | 'edit' | 'view', data: {reservation?: Reservation, day?: Date, hour?: number}) => {
    if (type === 'create' && data.day && data.hour !== undefined) {
      setModalData({
        isOpen: true,
        type: 'create',
        reservation: null,
        selectedDay: data.day,
        selectedHour: data.hour,
        guestName: '',
        guestPhone: '',
        paymentMethod: 'pending',
        isRecurring: false,
        recurrenceEnd: '',
        paidSessions: 0,
        paymentNotes: ''
      });
    } else if ((type === 'edit' || type === 'view') && data.reservation) {
      setModalData({
        isOpen: true,
        type,
        reservation: data.reservation,
        paidSessions: data.reservation.paidSessions || 0,
        paymentMethod: data.reservation.paymentMethod || 'pending',
        paymentNotes: data.reservation.paymentNotes || '',
        guestName: data.reservation.guestName || '',
        guestPhone: data.reservation.guestPhone || '',
        isRecurring: data.reservation.isRecurring || false,
        recurrenceEnd: data.reservation.recurrenceEnd ? 
          format(new Date(data.reservation.recurrenceEnd as string), 'yyyy-MM-dd') : ''
      });
    }
  };

  const closeModal = () => {
    console.log('Closing modal');
    setModalData({
      isOpen: false,
      type: 'create',
      reservation: null,
      paidSessions: 0,
      paymentMethod: 'pending',
      paymentNotes: '',
      guestName: '',
      guestPhone: '',
      isRecurring: false,
      recurrenceEnd: ''
    });
  };

  const handleUpdatePayment = async () => {
    if (loading || !modalData.reservation || !selectedCourt) return;
    
    setLoading(true);
    
    try {
      const res = await fetch("/api/bookings", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          reservationId: modalData.reservation.id,
          paidSessions: modalData.paidSessions,
          paymentMethod: modalData.paymentMethod,
          paymentNotes: modalData.paymentNotes
        }),
      });
      
      if (!res.ok) {
        throw new Error("Error al actualizar el pago");
      }
      
      // Limpiar cache y cerrar modal
      const cacheKey = `${selectedCourt.id}_${format(weekStart, "yyyy-MM-dd")}`;
      delete dataCache.current[cacheKey];
      
      closeModal();
      await fetchCourtData(selectedCourt.id, weekStart);
    } catch (error) {
      alert("Error al actualizar el pago");
    } finally {
      setLoading(false);
    }
  };

  // Verificación de reserva
  const checkReservation = (day: Date, hour: number, type: string) => {
    if (!courtData?.reservations?.length) return type === 'exists' ? false : null;
    
    const result = courtData.reservations.find(r => {
      try {
        const startTime = typeof r.startTime === 'string' ? parseISO(r.startTime) : r.startTime;
        return isSameDay(startTime, day) && getHours(startTime) === hour;
      } catch (error) {
        return false;
      }
    });
    
    return type === 'exists' ? !!result : result;
  };

  // Verificar si una fecha y hora ya pasó
  const isDateTimePast = (day: Date, hour: number) => {
    const dateTime = new Date(day);
    dateTime.setHours(hour, 0, 0, 0);
    return isPast(dateTime);
  };

  // Helper para mostrar método de pago
  const getPaymentMethodText = (method: string) => {
    switch(method) {
      case 'pending': return 'Pendiente';
      case 'transfer': return 'Transferencia';
      case 'cash': return 'Efectivo';
      default: return method;
    }
  };

  return (
    <div className="max-w-full md:max-w-5xl mx-auto bg-white rounded shadow">
      <div className="p-4 border-b">
        <h1 className="text-xl font-bold text-gray-800">Sistema de Reservas</h1>
      </div>
      
      {/* Selección mejorada */}
      <div className="p-4 border-b bg-gray-50">
        <div className="flex flex-col md:flex-row gap-4">
          <div className="w-full md:w-64">
            <label htmlFor="court-select" className="block text-sm font-medium text-gray-700 mb-1">
              Selecciona una cancha
            </label>
            <div className="relative">
              <select
                id="court-select"
                onChange={(e) => {
                  const courtId = e.target.value;
                  if (!courtId) {
                    setSelectedCourt(null);
                    return;
                  }
                  
                  const court = courts.find(c => c.id === courtId);
                  if (court) {
                    setSelectedCourt(court);
                  }
                }}
                className="block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-blue-500 focus:border-blue-500 rounded-md shadow-sm appearance-none"
                disabled={loading}
              >
                <option value="">Selecciona una cancha</option>
                {courts.map(c => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </select>
              <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2 text-gray-700">
                <svg className="h-5 w-5" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
                  <path fillRule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clipRule="evenodd" />
                </svg>
              </div>
            </div>
          </div>

          {selectedCourt && (
            <div className="flex-1">
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Semana
              </label>
              <div className="flex items-center bg-white rounded-md shadow-sm border border-gray-300 p-1">
                <button 
                  onClick={() => !loading && setWeekStart(addDays(weekStart, -7))}
                  disabled={loading} 
                  className="p-1 rounded-l hover:bg-gray-100 transition"
                  title="Semana anterior"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5 8.25 12l7.5-7.5" />
                  </svg>
                </button>
                
                <div className="flex-1 flex justify-center items-center font-medium">
                  <span className="text-sm">
                    {format(weekStart, "d 'de' MMMM", { locale: es })} - {format(addDays(weekStart, 6), "d 'de' MMMM, yyyy", { locale: es })}
                  </span>
                </div>
                
                <button 
                  onClick={() => !loading && setWeekStart(startOfWeek(new Date(), { weekStartsOn: 1 }))}
                  disabled={loading}
                  className="mx-1 px-2 py-1 bg-blue-100 hover:bg-blue-200 text-blue-800 rounded text-xs transition"
                  title="Semana actual"
                >
                  Hoy
                </button>
                
                <button 
                  onClick={() => !loading && setWeekStart(addDays(weekStart, 7))}
                  disabled={loading}
                  className="p-1 rounded-r hover:bg-gray-100 transition"
                  title="Semana siguiente"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5">
                    <path strokeLinecap="round" strokeLinejoin="round" d="m8.25 4.5 7.5 7.5-7.5 7.5" />
                  </svg>
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Vista de calendario para desktop */}
      {selectedCourt && (
        <div className="hidden md:block overflow-x-auto">
          {loading ? (
            <div className="p-8 text-center">
              <div className="inline-block animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-blue-500"></div>
              <p className="mt-2 text-gray-600">Cargando...</p>
            </div>
          ) : isBlocked ? (
            <div className="p-8 text-center bg-red-50">
              <p className="text-red-600">Cancha bloqueada por evento</p>
              {event && (
                <>
                  <p className="font-bold mt-2">{event.name}</p>
                  <p className="text-gray-700">{format(new Date(event.startTime as string), "HH:mm")} a {format(new Date(event.endTime as string), "HH:mm")}</p>
                </>
              )}
            </div>
          ) : !courtData ? (
            <div className="p-8 text-center text-gray-600">No hay datos disponibles</div>
          ) : (
            <table className="w-full border-collapse">
              <thead>
                <tr className="bg-gray-100">
                  <th className="border p-2 text-left">Hora</th>
                  {daysOfWeek.map(day => (
                    <th key={day.toISOString()} className={`border p-2 text-center ${isSameDay(day, today) ? 'bg-blue-50' : ''}`}>
                      {format(day, "EEEE", { locale: es })}
                      <br />
                      <span className={`${isSameDay(day, today) ? 'bg-blue-500 text-white rounded-full inline-block w-6 h-6 leading-6' : ''}`}>
                        {format(day, "d", { locale: es })}
                      </span>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {hours.map(hour => (
                  <tr key={hour}>
                    <td className="border p-2 bg-gray-50 font-medium">{hour}:00</td>
                    {daysOfWeek.map(day => {
                      const exists = checkReservation(day, hour, 'exists');
                      const reservation = exists ? checkReservation(day, hour, 'data') as Reservation : null;
                      const isPastTime = isDateTimePast(day, hour);
                      
                      return (
                        <td key={day.toISOString()} className="border p-2 h-20 relative">
                          {exists && reservation ? (
                            <div 
                              className={`${isPastTime ? 'bg-gray-100' : 'bg-red-100'} p-2 rounded h-full flex flex-col cursor-pointer`}
                              onClick={() => openModal(isPastTime ? 'view' : 'edit', { reservation })}
                            >
                              <div className="font-medium">{reservation.guestName}</div>
                              <div className="text-xs text-gray-600">{reservation.guestPhone}</div>
                              {reservation.isRecurring && (
                                <div className="mt-1 text-xs">
                                  <span className="bg-blue-500 text-white px-1 rounded">Fijo</span>
                                  {` ${reservation.paidSessions || 0} pagadas`}
                                </div>
                              )}
                              <div className="mt-1">
                                <span className={`text-xs px-2 py-1 rounded-full inline-block ${
                                  reservation.paymentMethod === 'pending' ? 'bg-yellow-100 text-yellow-800' : 
                                  reservation.paymentMethod === 'cash' ? 'bg-green-100 text-green-800' : 
                                  'bg-blue-100 text-blue-800'
                                }`}>
                                  {getPaymentMethodText(reservation.paymentMethod)}
                                </span>
                              </div>
                            </div>
                          ) : !isPastTime ? (
                            <button 
                              onClick={() => openModal('create', { day, hour })}
                              disabled={loading}
                              className="bg-green-500 text-white p-2 rounded w-full h-full hover:bg-green-600 transition"
                            >
                              Reservar
                            </button>
                          ) : (
                            <div className="w-full h-full flex items-center justify-center text-gray-400">
                              -
                            </div>
                          )}
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}

      {/* Vista de calendario para móvil (Acordeón) */}
      {selectedCourt && (
        <div className="block md:hidden">
          {loading ? (
            <div className="p-8 text-center">
              <div className="inline-block animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-blue-500"></div>
              <p className="mt-2 text-gray-600">Cargando...</p>
            </div>
          ) : isBlocked ? (
            <div className="p-4 text-center bg-red-50">
              <p className="text-red-600">Cancha bloqueada por evento</p>
              {event && (
                <>
                  <p className="font-bold mt-2">{event.name}</p>
                  <p className="text-gray-700">{format(new Date(event.startTime as string), "HH:mm")} a {format(new Date(event.endTime as string), "HH:mm")}</p>
                </>
              )}
            </div>
          ) : !courtData ? (
            <div className="p-4 text-center text-gray-600">No hay datos disponibles</div>
          ) : (
            <div className="divide-y">
              {daysOfWeek.map((day, index) => {
                const dayId = `day-${index}`;
                const isPastDay = isPast(day) && !isSameDay(day, today);
                return (
                  <div key={day.toISOString()} className="border-b">
                    <div className="p-3">
                      <details className="group" open={isSameDay(day, today)}>
                        <summary className={`flex justify-between items-center p-2 cursor-pointer list-none ${isSameDay(day, today) ? 'bg-blue-50 rounded' : ''}`}>
                          <h3 className="font-bold flex items-center">
                            {format(day, "EEEE d 'de' MMMM", { locale: es })}
                            {isSameDay(day, today) && (
                              <span className="ml-2 bg-blue-500 text-white text-xs px-2 py-1 rounded">Hoy</span>
                            )}
                          </h3>
                          <div className="flex items-center">
                            <span className={`text-sm mr-2 ${isPastDay ? 'text-gray-400' : ''}`}>
                              {isPastDay ? 'Pasado' : 'Disponible'}
                            </span>
                            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5 transition-transform group-open:rotate-180">
                              <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 8.25l-7.5 7.5-7.5-7.5" />
                            </svg>
                          </div>
                        </summary>
                        
                        <div className="p-2 grid grid-cols-2 gap-2 mt-2">
                          {hours.map(hour => {
                            const exists = checkReservation(day, hour, 'exists');
                            const reservation = exists ? checkReservation(day, hour, 'data') as Reservation : null;
                            const isPastTime = isDateTimePast(day, hour);
                            
                            return (
                              <div key={hour} className="border rounded overflow-hidden">
                                <div className="bg-gray-100 p-2 text-center font-medium">
                                  {hour}:00
                                </div>
                                
                                {exists && reservation ? (
                                  <div 
                                    className={`${isPastTime ? 'bg-gray-50' : 'bg-red-50'} p-2 flex flex-col gap-1`}
                                    onClick={() => openModal(isPastTime ? 'view' : 'edit', { reservation })}
                                  >
                                    <div className="font-medium">{reservation.guestName}</div>
                                    <div className="text-xs">{reservation.guestPhone}</div>
                                    
                                    {reservation.isRecurring && (
                                      <div className="text-xs">
                                        <span className="bg-blue-500 text-white px-1 rounded">Fijo</span>
                                        {` ${reservation.paidSessions || 0} pagadas`}
                                      </div>
                                    )}
                                    
                                    <div className="mt-1 flex">
                                      <span className={`text-xs px-2 py-1 rounded-full w-full text-center ${
                                        reservation.paymentMethod === 'pending' ? 'bg-yellow-100 text-yellow-800' : 
                                        reservation.paymentMethod === 'cash' ? 'bg-green-100 text-green-800' : 
                                        'bg-blue-100 text-blue-800'
                                      }`}>
                                        {getPaymentMethodText(reservation.paymentMethod)}
                                      </span>
                                    </div>
                                  </div>
                                ) : !isPastTime ? (
                                  <button 
                                    onClick={() => openModal('create', { day, hour })}
                                    disabled={loading}
                                    className="bg-green-500 text-white p-2 w-full text-center hover:bg-green-600 transition"
                                  >
                                    Reservar
                                  </button>
                                ) : (
                                  <div className="p-2 text-center text-gray-400">
                                    No disponible
                                  </div>
                                )}
                              </div>
                            );
                          })}
                        </div>
                      </details>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* Modal unificado */}
      {modalData.isOpen && (
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
      )}
    </div>
  );
}