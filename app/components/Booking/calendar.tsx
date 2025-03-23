// calendar.tsx (modificado)
"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import { format, startOfWeek, endOfWeek } from "date-fns";
import { CourtsSelector } from "./CourtsSelector";
import { WeekSelector } from "./WeekSelector";
import { DesktopCalendar } from "./DesktopCalendar";
import { MobileCalendar } from "./MobileCalendar";
import { BookingModal } from "./modal";
import { useCachedFetch } from "../../hooks/useCachedFetch";
import { Court, CourtData, Reservation, Event, ModalDataType } from "../../types/bookings/types";
import BookingInvoiceModal from "../Transactions/BookingInvoiceModal";
import EventModal from "./EventModal";

interface BookingCalendarProps {
  initialCourts: Court[];
}

export function BookingCalendar({ initialCourts }: BookingCalendarProps) {
  // Estados originales
  const [courts, setCourts] = useState<Court[]>(initialCourts);
  const [selectedCourt, setSelectedCourt] = useState<Court | null>(null);
  const [weekStart, setWeekStart] = useState<Date>(startOfWeek(new Date(), { weekStartsOn: 1 }));
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  
  // Estados adicionales para modales
  const [isInvoiceModalOpen, setIsInvoiceModalOpen] = useState(false);
  const [isEventModalOpen, setIsEventModalOpen] = useState(false);
  const [selectedReservation, setSelectedReservation] = useState<Reservation | null>(null);  
  
  const defaultModalData = useMemo(() => ({
    isOpen: false,
    type: 'create' as const,
    reservation: null,
    paidSessions: 0,
    paymentMethod: 'pending',
    paymentNotes: '',
    name: '',
    phone: '',
    isRecurring: false,
    recurrenceEnd: ''
  }), []);
  
  const [modalData, setModalData] = useState<ModalDataType>(defaultModalData);

  const apiUrl = useMemo(() => {
    if (!selectedCourt) return null;
    return `/api/bookings?weekStart=${format(weekStart, "yyyy-MM-dd")}&weekEnd=${format(endOfWeek(weekStart, { weekStartsOn: 1 }), "yyyy-MM-dd")}&courtId=${selectedCourt.id}`;
  }, [selectedCourt, weekStart]);

  const { data, isLoading, mutate } = useCachedFetch(apiUrl);
  
  const fetchCourtsData = useCallback(async () => {
    try {
      const res = await fetch("/api/courts");
      if (!res.ok) throw new Error("Error al cargar las canchas");
      const data = await res.json();
      setCourts(data);
    } catch (error) {
      setError(error instanceof Error ? error.message : "Error al cargar las canchas");
    }
  }, []);

  useEffect(() => {
    if (courts.length === 0) fetchCourtsData();
  }, [courts.length, fetchCourtsData]);

  useEffect(() => {
    setError(null);
  }, [selectedCourt, weekStart]);

  const { courtData, isBlocked, event } = useMemo(() => {
    return {
      courtData: data?.blocked ? null : data?.court as CourtData | null,
      isBlocked: data?.blocked || false,
      event: data?.event as Event | null
    };
  }, [data]);

  // Validación de reservas
  const validateReservationData = useCallback((): boolean => {
    // Código original de validación...
    if (!modalData.name || modalData.name.trim() === '') {
      setError("El nombre es obligatorio");
      return false;
    }

    if (modalData.name.length > 50) {
      setError("El nombre no puede exceder los 50 caracteres");
      return false;
    }

    if (!modalData.phone || modalData.phone.trim() === '') {
      setError("El teléfono es obligatorio");
      return false;
    }

    if (modalData.phone.length < 3 || modalData.phone.length > 20) {
      setError("El teléfono debe tener entre 3 y 20 caracteres");
      return false;
    }

    if (modalData.isRecurring && !modalData.recurrenceEnd) {
      setError("La fecha de finalización es obligatoria para reservas recurrentes");
      return false;
    }

    if (modalData.isRecurring && modalData.recurrenceEnd) {
      const recurrenceEndDate = new Date(modalData.recurrenceEnd);
      const startDate = modalData.selectedDay || new Date();
      
      if (recurrenceEndDate <= startDate) {
        setError("La fecha de finalización debe ser posterior a la fecha de inicio");
        return false;
      }
    }

    return true;
  }, [modalData]);

  // Función para abrir el modal de facturación
  const openInvoiceModal = useCallback((reservation: Reservation) => {
    console.log(reservation)
    setSelectedReservation(reservation);
    setIsInvoiceModalOpen(true);
  }, []);

  // Función para abrir el modal de eventos
  const openEventModal = useCallback(() => {
    setIsEventModalOpen(true);
  }, []);

  // Modal handlers originales
  const openModal = useCallback((type: 'create' | 'edit' | 'view', data: {reservation?: Reservation, day?: Date, hour?: number}) => {
    setError(null);
    
    if (type === 'create' && data.day && data.hour !== undefined) {
      setModalData({
        isOpen: true,
        type: 'create',
        reservation: null,
        selectedDay: data.day,
        selectedHour: data.hour,
        name: '',
        phone: '',
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
        name: data.reservation.name || '',
        phone: data.reservation.phone || '',
        isRecurring: data.reservation.isRecurring || false,
        recurrenceEnd: data.reservation.recurrenceEnd ? 
          format(new Date(data.reservation.recurrenceEnd as string), 'yyyy-MM-dd') : ''
      });
    }
  }, []);

  const closeModal = useCallback(() => {
    setError(null);
    setModalData(defaultModalData);
  }, [defaultModalData]);

  // API handlers originales
  const handleBooking = useCallback(async () => {
    // Código original del handleBooking...
    if (isLoading || !selectedCourt || !modalData.selectedDay || modalData.selectedHour === undefined) {
      return;
    }
    
    setError(null);
    
    if (!validateReservationData()) {
      return;
    }

    const { name, phone, paymentMethod, isRecurring, recurrenceEnd, paidSessions, paymentNotes } = modalData;
    
    const startTime = new Date(modalData.selectedDay);
    startTime.setHours(modalData.selectedHour, 0, 0);
    const endTime = new Date(startTime);
    endTime.setHours(modalData.selectedHour + 1, 30, 0);

    const body = {
      courtId: selectedCourt.id,
      startTime: startTime.toISOString(),
      endTime: endTime.toISOString(),
      name,
      phone,
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
      closeModal();
      mutate();
    } catch (error) {
      setError(error instanceof Error ? error.message : "Error al crear la reserva");
    } finally {
      setLoading(false);
    }
  }, [isLoading, selectedCourt, modalData, validateReservationData, closeModal, mutate]);

  const handleCancel = useCallback(async (id: string) => {
    // Código original del handleCancel...
    if (isLoading || !selectedCourt) return;
    
    setLoading(true);
    setError(null);
    
    try {
      const res = await fetch("/api/bookings", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reservationId: id }),
      });
      
      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.error || "Error al cancelar la reserva");
      }
      
      closeModal();
      mutate();
    } catch (error) {
      setError(error instanceof Error ? error.message : "Error al cancelar la reserva");
    } finally {
      setLoading(false);
    }
  }, [isLoading, selectedCourt, closeModal, mutate]);

  const handleUpdatePayment = useCallback(async () => {
    // Código original del handleUpdatePayment...
    if (isLoading || !modalData.reservation || !selectedCourt) return;
    
    setLoading(true);
    setError(null);
    
    if (!validateReservationData()) {
      setLoading(false);
      return;
    }
    
    try {
      const res = await fetch("/api/bookings", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          reservationId: modalData.reservation.id,
          name: modalData.name,
          phone: modalData.phone,
          paidSessions: modalData.paidSessions,
          paymentMethod: modalData.paymentMethod,
          paymentNotes: modalData.paymentNotes
        }),
      });
      
      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.error || "Error al actualizar la reserva");
      }
      
      closeModal();
      mutate();
    } catch (error) {
      setError(error instanceof Error ? error.message : "Error al actualizar la reserva");
    } finally {
      setLoading(false);
    }
  }, [isLoading, modalData, selectedCourt, validateReservationData, closeModal, mutate]);

  // Handler para procesar pagos desde el modal de facturación
  const handleInvoiceSuccess = useCallback(() => {
    setIsInvoiceModalOpen(false);
    mutate();
  }, [mutate]);

  // Handler para eventos creados con éxito
  const handleEventSuccess = useCallback(() => {
    setIsEventModalOpen(false);
    mutate();
  }, [mutate]);

  // Props para los calendarios
  const calendarProps = useMemo(() => ({
    loading: isLoading || loading,
    isBlocked,
    event,
    courtData,
    weekStart,
    openModal,
    openInvoiceModal
  }), [isLoading, loading, isBlocked, event, courtData, weekStart, openModal, openInvoiceModal]);

  return (
    <div className="max-w-full md:max-w-5xl mx-auto bg-white rounded shadow">
      <div className="p-4 border-b flex justify-between items-center">
        <h1 className="text-xl font-bold text-gray-800">Sistema de Reservas</h1>
        <button
          onClick={openEventModal}
          className="px-4 py-2 bg-green-600 text-white rounded"
        >
          Crear Evento
        </button>
      </div>
      
      <div className="p-4 border-b bg-gray-50">
        <div className="flex flex-col md:flex-row gap-4">
          <CourtsSelector 
            courts={courts} 
            selectedCourt={selectedCourt} 
            setSelectedCourt={setSelectedCourt} 
            disabled={isLoading || loading} 
          />
          
          {selectedCourt && (
            <WeekSelector 
              weekStart={weekStart} 
              setWeekStart={setWeekStart} 
              disabled={isLoading || loading} 
            />
          )}
        </div>
      </div>

      {error && (
        <div className="p-3 my-2 mx-4 bg-red-100 text-red-700 rounded border border-red-200">
          {error}
        </div>
      )}

      {selectedCourt && (
        <>
          <div className="hidden md:block overflow-x-auto">
            <DesktopCalendar {...calendarProps} />
          </div>

          <div className="block md:hidden">
            <MobileCalendar {...calendarProps} />
          </div>
        </>
      )}
      
      {modalData.isOpen && (
        <BookingModal 
          modalData={modalData}
          setModalData={setModalData}
          loading={loading}
          closeModal={closeModal}
          handleBooking={handleBooking}
          handleCancel={handleCancel}
          handleUpdatePayment={handleUpdatePayment}
          error={error}
          setError={setError}
        />
      )}

      {isInvoiceModalOpen && selectedReservation && (
        <BookingInvoiceModal
          reservationId={selectedReservation.id || selectedReservation.virtualId || ''}
          courtName={courtData?.name || ''}
          startTime={selectedReservation.startTime as string}
          endTime={selectedReservation.endTime as string}
          clientName={selectedReservation.name || ''}
          onClose={() => setIsInvoiceModalOpen(false)}
          onSuccess={handleInvoiceSuccess}
        />
      )}

      {isEventModalOpen && (
        <EventModal
          courts={courts}
          onClose={() => setIsEventModalOpen(false)}
          onSuccess={handleEventSuccess}
        />
      )}
    </div>
  );
}