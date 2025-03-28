"use client";

import { useState, useCallback, useMemo } from "react";
import useSWR from 'swr';
import { UnifiedCalendar } from "./UnifiedCalendar";
import { ReservationModal } from "./ReservationModal";
import EventModal from "./EventModal";
import BookingInvoiceModal from "../Transactions/BookingInvoiceModal";
import TransactionModal from "@/app/components/Transactions/TransactionModal";
import { Court, Reservation, ModalDataType } from "../../types/bookings/types";
import { useGlobalMutate } from "@/app/hooks/useGlobalMutate";

interface Transaction {
  id?: string;
  type: 'income' | 'expense';
  category: string;
  amount: number;
  description?: string;
  paymentMethod: string;
  location?: string;
  userId?: string;
}

const fetcher = async (url: string) => {
  const res = await fetch(url, {
    headers: { 'Cache-Control': 'no-cache' }
  });
  if (!res.ok) {
    const error = await res.json();
    throw new Error(error.error || "Failed to fetch data");
  }
  return res.json();
};

interface CalendarContainerProps {
  initialCourts: Court[];
}

export function Calendar({ initialCourts }: CalendarContainerProps) {
  const { data: courts = initialCourts, mutate: mutateCourts } = useSWR<Court[]>(
    '/api/courts',
    fetcher,
    {
      fallbackData: initialCourts,
      revalidateOnFocus: false,
      dedupingInterval: 60000,
    }
  );

  const { mutateAll } = useGlobalMutate();

  const [currentDate, setCurrentDate] = useState<Date>(new Date());
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  // Transaction modal state
  const [isTransactionModalOpen, setIsTransactionModalOpen] = useState(false);
  const [currentTransaction, setCurrentTransaction] = useState<Transaction | null>(null);

  const defaultModalData = useMemo(() => ({
    isOpen: false,
    type: 'create' as const,
    reservation: null,
    selectedDay: null,
    selectedHour: undefined,
    name: '',
    phone: '',
    paymentMethod: 'pending',
    isRecurring: false,
    recurrenceEnd: '',
    paidSessions: 0,
    paymentNotes: '',
    courtId: ''
  }), []);

  const [modalData, setModalData] = useState<ModalDataType>(defaultModalData);
  const [isInvoiceModalOpen, setIsInvoiceModalOpen] = useState(false);
  const [isEventModalOpen, setIsEventModalOpen] = useState(false);
  const [selectedReservation, setSelectedReservation] = useState<Reservation | null>(null);

  const openReservationModal = useCallback((day: Date, hour?: number) => {
    setError(null);
    setModalData({
      ...defaultModalData,
      isOpen: true,
      type: 'create',
      selectedDay: day,
      selectedHour: hour ?? 12,
    });
  }, [defaultModalData]);

  const openDetailModal = useCallback((reservation: Reservation) => {
    setError(null);

    const startTime = new Date(reservation.startTime as string);
    const now = new Date();
    const isPast = startTime < now;
    const modalType = isPast ? 'view' : 'edit';

    setModalData({
      isOpen: true,
      type: modalType,
      reservation,
      selectedDay: startTime,
      selectedHour: `${startTime.getHours().toString().padStart(2, '0')}:${startTime.getMinutes().toString().padStart(2, '0')}`,
      paidSessions: reservation.paidSessions || 0,
      paymentMethod: reservation.paymentMethod || 'pending',
      paymentNotes: reservation.paymentNotes || '',
      name: reservation.name || '',
      phone: reservation.phone || '',
      isRecurring: reservation.isRecurring || false,
      recurrenceEnd: reservation.recurrenceEnd ?
        new Date(reservation.recurrenceEnd as string).toISOString().split('T')[0] : '',
      courtId: reservation.courtId || '',
    });
  }, []);

  const openEventModal = useCallback((event?: Reservation) => {
    if (event) {
      setSelectedReservation(event);
    }
    setIsEventModalOpen(true);
  }, []);

  const openInvoiceModal = useCallback((reservation: Reservation) => {
    setSelectedReservation(reservation);
    setIsInvoiceModalOpen(true);
  }, []);

  // Transaction modal handlers
  const openTransactionModal = useCallback((transaction: Transaction | null = null) => {
    setCurrentTransaction(transaction);
    setIsTransactionModalOpen(true);
  }, []);

  const closeTransactionModal = useCallback(() => {
    setIsTransactionModalOpen(false);
  }, []);

  const handleSaveTransaction = useCallback(async (transaction: Transaction) => {
    try {
      const method = transaction.id ? 'PUT' : 'POST';
      const url = transaction.id ? `/api/transactions/${transaction.id}` : '/api/transactions';
      
      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(transaction)
      });
      
      if (!response.ok) throw new Error('Error al guardar la transacción');
      
      setIsTransactionModalOpen(false);
      mutateAll();
    } catch (error) {
      console.error('Error:', error);
    }
  }, [mutateAll]);

  const closeModal = useCallback(() => {
    setError(null);
    setModalData(prev => ({ ...prev, isOpen: false }));
  }, []);

  const handleBooking = useCallback(async () => {
    if (loading || !modalData.selectedDay) {
      return;
    }

    setError(null);

    if (!modalData.name?.trim()) {
      setError("El nombre es obligatorio");
      return;
    }

    if (!modalData.phone?.trim()) {
      setError("El teléfono es obligatorio");
      return;
    }

    if (!modalData.courtId) {
      setError("Selecciona una cancha");
      return;
    }

    const { name, phone, paymentMethod, isRecurring, recurrenceEnd, paidSessions, paymentNotes, courtId } = modalData;

    const startTime = new Date(modalData.selectedDay);

    let hours = modalData.selectedHour as number;
    let minutes = 0;

    if (typeof modalData.selectedHour === 'string' && modalData.selectedHour.includes(':')) {
      const [hourStr, minuteStr] = modalData.selectedHour.split(':');
      hours = parseInt(hourStr, 10);
      minutes = parseInt(minuteStr, 10);
    }

    startTime.setHours(hours, minutes, 0, 0);
    const endTime = new Date(startTime);

    const selectedCourt = courts.find(court => court.id === courtId);
    if (selectedCourt) {
      if (selectedCourt.type === 'futbol') {
        endTime.setTime(startTime.getTime() + 60 * 60 * 1000);
      } else {
        endTime.setTime(startTime.getTime() + 90 * 60 * 1000);
      }
    }

    const body = {
      courtId,
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
        headers: {
          "Content-Type": "application/json",
          "Cache-Control": "no-cache"
        },
        body: JSON.stringify(body),
      });

      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.error || "Error al crear la reserva");
      }

      await res.json();
      closeModal();
      await mutateAll();
    } catch (error) {
      setError(error instanceof Error ? error.message : "Error al crear la reserva");
    } finally {
      setLoading(false);
    }
  }, [loading, modalData, closeModal, courts, mutateAll]);

  const handleCancel = useCallback(async (id: string) => {
    if (loading) return;

    setLoading(true);
    setError(null);

    try {
      const res = await fetch("/api/bookings", {
        method: "DELETE",
        headers: {
          "Content-Type": "application/json",
          "Cache-Control": "no-cache"
        },
        body: JSON.stringify({ reservationId: id }),
      });

      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.error || "Error al cancelar la reserva");
      }

      closeModal();
      await mutateAll();
    } catch (error) {
      setError(error instanceof Error ? error.message : "Error al cancelar la reserva");
    } finally {
      setLoading(false);
    }
  }, [loading, closeModal, mutateAll]);

  const handleUpdatePayment = useCallback(async () => {
    if (loading || !modalData.reservation) return;

    setLoading(true);
    setError(null);

    if (!modalData.name?.trim()) {
      setError("El nombre es obligatorio");
      setLoading(false);
      return;
    }

    if (!modalData.phone?.trim()) {
      setError("El teléfono es obligatorio");
      setLoading(false);
      return;
    }

    let startTime = new Date(modalData.reservation.startTime);
    let endTime = new Date(modalData.reservation.endTime);

    if (modalData.selectedDay) {
      const newDate = new Date(modalData.selectedDay);

      if (modalData.selectedHour !== undefined) {
        if (typeof modalData.selectedHour === 'string' && modalData.selectedHour.includes(':')) {
          const [hourStr, minuteStr] = modalData.selectedHour.split(':');
          const hours = parseInt(hourStr, 10);
          const minutes = parseInt(minuteStr, 10);

          newDate.setHours(hours, minutes, 0, 0);
          startTime = newDate;

          const selectedCourt = courts.find(court => court.id === modalData.courtId);
          endTime = new Date(startTime);

          if (selectedCourt) {
            if (selectedCourt.type === 'futbol') {
              endTime.setTime(startTime.getTime() + 60 * 60 * 1000);
            } else {
              endTime.setTime(startTime.getTime() + 90 * 60 * 1000);
            }
          }
        } else {
          // Mantener compatibilidad con el formato numérico anterior
          const hours = typeof modalData.selectedHour === 'number'
            ? modalData.selectedHour
            : parseInt(modalData.selectedHour, 10);

          newDate.setHours(hours, 0, 0, 0);
          startTime = newDate;

          const selectedCourt = courts.find(court => court.id === modalData.courtId);
          endTime = new Date(startTime);

          if (selectedCourt) {
            if (selectedCourt.type === 'futbol') {
              endTime.setTime(startTime.getTime() + 60 * 60 * 1000);
            } else {
              endTime.setTime(startTime.getTime() + 90 * 60 * 1000);
            }
          }
        }
      } else {
        startTime = new Date(
          newDate.getFullYear(),
          newDate.getMonth(),
          newDate.getDate(),
          startTime.getHours(),
          startTime.getMinutes()
        );

        const durationMs = endTime.getTime() - new Date(modalData.reservation.startTime).getTime();
        endTime = new Date(startTime.getTime() + durationMs);
      }
    }

    try {
      const res = await fetch("/api/bookings", {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          "Cache-Control": "no-cache"
        },
        body: JSON.stringify({
          reservationId: modalData.reservation.id,
          startTime: startTime.toISOString(),
          endTime: endTime.toISOString(),
          name: modalData.name,
          phone: modalData.phone,
          courtId: modalData.courtId,
          paidSessions: modalData.paidSessions,
          paymentMethod: modalData.paymentMethod,
          paymentNotes: modalData.paymentNotes,
          isRecurring: modalData.isRecurring,
          ...(modalData.isRecurring && modalData.recurrenceEnd ? {
            recurrenceEnd: new Date(modalData.recurrenceEnd).toISOString()
          } : {})
        }),
      });

      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.error || "Error al actualizar la reserva");
      }

      closeModal();
      await mutateAll();
    } catch (error) {
      setError(error instanceof Error ? error.message : "Error al actualizar la reserva");
    } finally {
      setLoading(false);
    }
  }, [loading, modalData, closeModal, courts, mutateAll]);

  const handleEventSuccess = useCallback(() => {
    setIsEventModalOpen(false);
    setSelectedReservation(null); // Esta línea es importante
    mutateAll();
  }, [mutateAll]);

  const handleInvoiceSuccess = useCallback(() => {
    setIsInvoiceModalOpen(false);
    mutateAll();
  }, [mutateAll]);

  const enhancedModalData = useMemo(() => ({
    ...modalData,
    courtId: modalData.courtId || modalData.reservation?.courtId || '',
    setCourtId: (courtId: string) => {
      setModalData(prev => ({ ...prev, courtId }));
    },
    courts,
    // Add the openInvoiceModal handler to the modal data
    openInvoiceModal: modalData.reservation ? () => openInvoiceModal(modalData.reservation as Reservation) : null
  }), [modalData, courts, openInvoiceModal]);

  return (
    <div className="max-w-full md:max-w-6xl mx-auto bg-white rounded shadow">
      <div className="p-4 border-b flex justify-between items-center">
        <h1 className="text-xl font-bold text-gray-800">Reservas de Canchas</h1>
        <div className="flex space-x-2">
          <button
            onClick={() => openReservationModal(currentDate)}
            className="px-4 py-2 bg-blue-600 text-white rounded flex items-center"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-1" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M10 3a1 1 0 00-1 1v5H4a1 1 0 100 2h5v5a1 1 0 102 0v-5h5a1 1 0 100-2h-5V4a1 1 0 00-1-1z" clipRule="evenodd" />
            </svg>
            Crear Reserva
          </button>
          <button
            onClick={() => openEventModal()}
            className="px-4 py-2 bg-green-600 text-white rounded flex items-center"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-1" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M6 2a1 1 0 00-1 1v1H4a2 2 0 00-2 2v10a2 2 0 002 2h12a2 2 0 002-2V6a2 2 0 00-2-2h-1V3a1 1 0 10-2 0v1H7V3a1 1 0 00-1-1zm0 5a1 1 0 000 2h8a1 1 0 100-2H6z" clipRule="evenodd" />
            </svg>
            Crear Evento
          </button>
          <button
            onClick={() => openTransactionModal()}
            className="px-4 py-2 bg-purple-600 text-white rounded flex items-center"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-1" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M4 4a2 2 0 00-2 2v4a2 2 0 002 2V12a2 2 0 002 2h8a2 2 0 002-2v-.5a2 2 0 002-2V6a2 2 0 00-2-2H4z" />
              <path d="M3 13.75a.75.75 0 01.75-.75h1.5a.75.75 0 010 1.5h-1.5a.75.75 0 01-.75-.75zM3 10.75a.75.75 0 01.75-.75h1.5a.75.75 0 010 1.5h-1.5a.75.75 0 01-.75-.75zM7 10.75a.75.75 0 01.75-.75h1.5a.75.75 0 010 1.5h-1.5A.75.75 0 017 10.75zM7 13.75a.75.75 0 01.75-.75h1.5a.75.75 0 010 1.5h-1.5a.75.75 0 01-.75-.75zM11 10.75a.75.75 0 01.75-.75h1.5a.75.75 0 010 1.5h-1.5a.75.75 0 01-.75-.75z" />
            </svg>
            Nueva Transacción
          </button>
        </div>
      </div>

      <UnifiedCalendar
        courts={courts}
        currentDate={currentDate}
        setCurrentDate={setCurrentDate}
        openReservationModal={openReservationModal}
        openEventModal={openEventModal}
        openDetailModal={openDetailModal}
        openInvoiceModal={openInvoiceModal}
        loading={loading}
      />

      {modalData.isOpen && (
        <ReservationModal
          modalData={enhancedModalData}
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

      {isTransactionModalOpen && (
        <TransactionModal
          transaction={currentTransaction}
          onClose={closeTransactionModal}
          onSave={handleSaveTransaction}
          hideFields
        />
      )}

      {isInvoiceModalOpen && selectedReservation && (
        <BookingInvoiceModal
          reservationId={selectedReservation.id || selectedReservation.virtualId || ''}
          courtName={selectedReservation.courtName || ''}
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
          initialEvent={selectedReservation}
          onClose={() => {
            setIsEventModalOpen(false);
            setSelectedReservation(null);
          }}
          onSuccess={handleEventSuccess}
        />
      )}
    </div>
  );
}