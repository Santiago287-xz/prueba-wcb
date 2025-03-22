"use client";

import { useState, useEffect } from "react";
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
  
  // Modal state
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

  // Fetching data with cache
  const { data, isLoading, error, mutate } = useCachedFetch(
    selectedCourt ? `/api/bookings?weekStart=${format(weekStart, "yyyy-MM-dd")}&weekEnd=${format(endOfWeek(weekStart, { weekStartsOn: 1 }), "yyyy-MM-dd")}&courtId=${selectedCourt.id}` : null
  );
  
  // Fetch courts if initial data not provided
  // Fix for Function declarations not allowed inside blocks
const fetchCourtsData = async () => {
  try {
    const res = await fetch("/api/courts");
    const data = await res.json();
    setCourts(data);
  } catch (error) {
    console.error("Failed to fetch courts:", error);
  }
};

useEffect(() => {
  if (courts.length === 0) {
    fetchCourtsData();
  }
}, [courts.length]);

  // Extract data from fetch results
  const courtData = data?.blocked ? null : data?.court as CourtData | null;
  const isBlocked = data?.blocked || false;
  const event = data?.event as Event | null;

  // Modal handlers
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

  // API handlers
  const handleBooking = async () => {
    if (isLoading || !selectedCourt || !modalData.selectedDay || modalData.selectedHour === undefined) return;
    
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
      closeModal();
      mutate(); // Refresh data
    } catch (error) {
      alert(error instanceof Error ? error.message : "Error al crear la reserva");
    } finally {
      setLoading(false);
    }
  };

  const handleCancel = async (id: string) => {
    if (isLoading || !selectedCourt) return;
    
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
      
      closeModal();
      mutate(); // Refresh data
    } catch (error) {
      alert("Error al cancelar la reserva");
    } finally {
      setLoading(false);
    }
  };

  const handleUpdatePayment = async () => {
    if (isLoading || !modalData.reservation || !selectedCourt) return;
    
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
      
      closeModal();
      mutate(); // Refresh data
    } catch (error) {
      alert("Error al actualizar el pago");
    } finally {
      setLoading(false);
    }
  };

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

      {selectedCourt && (
        <>
          {/* Desktop calendar */}
          <div className="hidden md:block overflow-x-auto">
            <DesktopCalendar 
              loading={isLoading || loading}
              isBlocked={isBlocked}
              event={event}
              courtData={courtData}
              weekStart={weekStart}
              openModal={openModal}
            />
          </div>

          {/* Mobile calendar */}
          <div className="block md:hidden">
            <MobileCalendar 
              loading={isLoading || loading}
              isBlocked={isBlocked}
              event={event}
              courtData={courtData}
              weekStart={weekStart}
              openModal={openModal}
            />
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
        />
      )}
    </div>
  );
}
