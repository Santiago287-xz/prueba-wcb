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

interface BookingCalendarProps {
  initialCourts: Court[];
}

export function BookingCalendar({ initialCourts }: BookingCalendarProps) {
  // Core state
  const [courts, setCourts] = useState<Court[]>(initialCourts);
  const [selectedCourt, setSelectedCourt] = useState<Court | null>(null);
  const [weekStart, setWeekStart] = useState<Date>(startOfWeek(new Date(), { weekStartsOn: 1 }));
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  
  // Default modal data
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
  
  // Modal state
  const [modalData, setModalData] = useState<ModalDataType>(defaultModalData);

  // Fetch API URL memo
  const apiUrl = useMemo(() => {
    if (!selectedCourt) return null;
    return `/api/bookings?weekStart=${format(weekStart, "yyyy-MM-dd")}&weekEnd=${format(endOfWeek(weekStart, { weekStartsOn: 1 }), "yyyy-MM-dd")}&courtId=${selectedCourt.id}`;
  }, [selectedCourt, weekStart]);

  // Fetching data with cache
  const { data, isLoading, mutate } = useCachedFetch(apiUrl);
  
  // Fetch courts only once if initial data not provided
  const fetchCourtsData = useCallback(async () => {
    try {
      const res = await fetch("/api/courts");
      if (!res.ok) {
        throw new Error("Error al cargar las canchas");
      }
      const data = await res.json();
      setCourts(data);
    } catch (error) {
      setError(error instanceof Error ? error.message : "Error al cargar las canchas");
    }
  }, []);

  useEffect(() => {
    if (courts.length === 0) {
      fetchCourtsData();
    }
  }, [courts.length, fetchCourtsData]);

  // Clear error when changing court or week
  useEffect(() => {
    setError(null);
  }, [selectedCourt, weekStart]);

  // Extract data from fetch results - memoized
  const { courtData, isBlocked, event } = useMemo(() => {
    return {
      courtData: data?.blocked ? null : data?.court as CourtData | null,
      isBlocked: data?.blocked || false,
      event: data?.event as Event | null
    };
  }, [data]);

  // Validate reservation data
  const validateReservationData = useCallback((): boolean => {
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

  // Modal handlers
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

  // API handlers
  const handleBooking = useCallback(async () => {
    if (isLoading || !selectedCourt || !modalData.selectedDay || modalData.selectedHour === undefined) {
      return;
    }
    
    setError(null);
    
    // Validar datos
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
      mutate(); // Refresh data
    } catch (error) {
      setError(error instanceof Error ? error.message : "Error al crear la reserva");
    } finally {
      setLoading(false);
    }
  }, [isLoading, selectedCourt, modalData, validateReservationData, closeModal, mutate]);

  const handleCancel = useCallback(async (id: string) => {
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
      mutate(); // Refresh data
    } catch (error) {
      setError(error instanceof Error ? error.message : "Error al cancelar la reserva");
    } finally {
      setLoading(false);
    }
  }, [isLoading, selectedCourt, closeModal, mutate]);

  const handleUpdatePayment = useCallback(async () => {
    if (isLoading || !modalData.reservation || !selectedCourt) return;
    
    setLoading(true);
    setError(null);
    
    // Validar datos
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
      mutate(); // Refresh data
    } catch (error) {
      setError(error instanceof Error ? error.message : "Error al actualizar la reserva");
    } finally {
      setLoading(false);
    }
  }, [isLoading, modalData, selectedCourt, validateReservationData, closeModal, mutate]);

  // Memoize handlers to pass to components
  const calendarProps = useMemo(() => ({
    loading: isLoading || loading,
    isBlocked,
    event,
    courtData,
    weekStart,
    openModal
  }), [isLoading, loading, isBlocked, event, courtData, weekStart, openModal]);

  return (
    <div className="max-w-full md:max-w-5xl mx-auto bg-white rounded shadow">
      <div className="p-4 border-b">
        <h1 className="text-xl font-bold text-gray-800">Sistema de Reservas</h1>
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

      {/* Error message */}
      {error && (
        <div className="p-3 my-2 mx-4 bg-red-100 text-red-700 rounded border border-red-200">
          {error}
        </div>
      )}

      {selectedCourt && (
        <>
          {/* Desktop calendar */}
          <div className="hidden md:block overflow-x-auto">
            <DesktopCalendar {...calendarProps} />
          </div>

          {/* Mobile calendar */}
          <div className="block md:hidden">
            <MobileCalendar {...calendarProps} />
          </div>
        </>
      )}
      
      {/* Modal */}
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
    </div>
  );
}