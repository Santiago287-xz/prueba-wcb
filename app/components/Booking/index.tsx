"use client";

import { useState, useCallback, useMemo, useEffect } from "react";
import useSWR from 'swr';
import { UnifiedCalendar } from "./UnifiedCalendar";
import { ReservationModal } from "./ReservationModal";
import EventModal from "./EventModal";
import BookingInvoiceModal from "../Transactions/BookingInvoiceModal";
import TransactionModal from "@/app/components/Transactions/TransactionModal";
import { Court, Reservation, ModalDataType, PaymentMethodType } from "../../types/bookings";
import { useGlobalMutate } from "@/app/hooks/useGlobalMutate";
import { OverheadView } from './OverheadView';
import { format, startOfWeek, endOfWeek } from 'date-fns';
import { Tab, Tabs } from '@mui/material';

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

// Add this type guard function near the top of the file
function isValidPaymentMethod(method: string): method is PaymentMethodType {
  return ['pending', 'cash', 'transfer', 'card'].includes(method);
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
  const [currentView, setCurrentView] = useState<number>(0); // 0 for calendar, 1 for overhead view
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [isPurgeDialogOpen, setIsPurgeDialogOpen] = useState<boolean>(false);
  const [isPurging, setIsPurging] = useState<boolean>(false);

  // Transaction modal state
  const [isTransactionModalOpen, setIsTransactionModalOpen] = useState(false);
  const [currentTransaction, setCurrentTransaction] = useState<Transaction | null>(null);

  const defaultModalData = useMemo(() => ({
    isOpen: false,
    type: 'create' as const,
    reservation: null,
    selectedDay: null,
    selectedHour: "12:00",
    name: '',
    phone: '',
    paymentMethod: 'pending' as PaymentMethodType,
    paymentAmount: 0,
    isRecurring: false,
    recurrenceEnd: '',
    paidSessions: 0,
    paymentNotes: '',
    courtId: '',
    courts: [] as Court[],
  }), []);

  const [modalData, setModalData] = useState<ModalDataType>(defaultModalData);
  const [isInvoiceModalOpen, setIsInvoiceModalOpen] = useState(false);
  const [isEventModalOpen, setIsEventModalOpen] = useState(false);
  const [selectedReservation, setSelectedReservation] = useState<Reservation | null>(null);

  // For the overhead view, fetch reservations and events for the current week
  const weekStart = useMemo(() => startOfWeek(currentDate, { weekStartsOn: 1 }), [currentDate]);
  const weekEnd = useMemo(() => endOfWeek(weekStart, { weekStartsOn: 1 }), [weekStart]);

  const startDateStr = useMemo(() => format(weekStart, "yyyy-MM-dd"), [weekStart]);
  const endDateStr = useMemo(() => format(weekEnd, "yyyy-MM-dd"), [weekEnd]);

  const { data: weekData, error: weekDataError } = useSWR(
    courts.length > 0 ? `/api/bookings/week?start=${startDateStr}&end=${endDateStr}` : null,
    fetcher,
    {
      revalidateOnFocus: false,
      dedupingInterval: 30000,
    }
  );

  const allReservations = useMemo(() => {
    return weekData?.reservations || [];
  }, [weekData]);

  const allEvents = useMemo(() => {
    return weekData?.events || [];
  }, [weekData]);

  const openReservationModal = useCallback((day: Date, hour?: number) => {
    setError(null);
    setModalData({
      ...defaultModalData,
      isOpen: true,
      type: 'create',
      selectedDay: day,
      selectedHour: hour ?? 12,
      courts,
    });
  }, [defaultModalData, courts]);

  const openDetailModal = useCallback((reservation: Reservation) => {
    setError(null);

    const startTime = new Date(reservation.startTime as string);
    const now = new Date();
    const isPast = startTime < now;
    const modalType = isPast ? 'view' : 'edit';

    // Get payment method from reservation and validate it
    const paymentMethod = reservation.paymentMethod || 'pending';
    const validatedPaymentMethod = isValidPaymentMethod(paymentMethod)
      ? paymentMethod
      : 'pending' as PaymentMethodType;

    setModalData({
      isOpen: true,
      type: modalType,
      reservation,
      selectedDay: startTime,
      selectedHour: `${startTime.getHours().toString().padStart(2, '0')}:${startTime.getMinutes().toString().padStart(2, '0')}`,
      paidSessions: reservation.paidSessions || 0,
      paymentMethod: validatedPaymentMethod,
      paymentAmount: 0,
      paymentNotes: reservation.paymentNotes || '',
      name: reservation.name || '',
      phone: reservation.phone || '',
      isRecurring: reservation.isRecurring || false,
      recurrenceEnd: reservation.recurrenceEnd ?
        new Date(reservation.recurrenceEnd as string).toISOString().split('T')[0] : '',
      courtId: reservation.courtId || '',
      courts, // Añadir courts
    });
  }, [courts]);

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

    let hours = typeof modalData.selectedHour === 'string'
      ? parseInt(modalData.selectedHour.split(':')[0], 10)
      : modalData.selectedHour;
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

      const reservationData = await res.json();
      closeModal();
      await mutateAll();
      return reservationData;
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
    setSelectedReservation(null);
    mutateAll();
  }, [mutateAll]);

  const handleInvoiceSuccess = useCallback(() => {
    setIsInvoiceModalOpen(false);
    mutateAll();
  }, [mutateAll]);

  const handleTabChange = (event: React.SyntheticEvent, newValue: number) => {
    setCurrentView(newValue);
  };

  const handleCourtClick = useCallback((court: Court) => {
    openReservationModal(currentDate, new Date().getHours());
    setModalData(prev => ({
      ...prev,
      courtId: court.id
    }));
  }, [currentDate, openReservationModal]);

  const openPurgeDialog = useCallback(() => {
    setIsPurgeDialogOpen(true);
  }, []);

  const closePurgeDialog = useCallback(() => {
    setIsPurgeDialogOpen(false);
  }, []);

  const handlePurgeData = useCallback(async () => {
    setIsPurging(true);
    try {
      // Purge bookings
      await fetch('/api/bookings/purge', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' }
      });

      // Purge transactions
      await fetch('/api/transactions/purge', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' }
      });

      await mutateAll();
      closePurgeDialog();
    } catch (error) {
      console.error('Error purging data:', error);
    } finally {
      setIsPurging(false);
    }
  }, [mutateAll, closePurgeDialog]);

  const enhancedModalData = useMemo(() => ({
    ...modalData,
    courtId: modalData.courtId || modalData.reservation?.courtId || '',
    setCourtId: (courtId: string) => {
      setModalData(prev => ({ ...prev, courtId }));
    },
    courts,
    openInvoiceModal: modalData.reservation ? () => openInvoiceModal(modalData.reservation as Reservation) : null
  }), [modalData, courts, openInvoiceModal]);

  const [isMobile, setIsMobile] = useState(false);
  useEffect(() => {
    const handleResize = () => {
      const mobile = window.innerWidth < 768;
      setIsMobile(mobile);
      if (mobile) {
        setCurrentView(0);
      }
    };
    handleResize();
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  return (
    <div className="max-w-full md:max-w-7xl mx-auto bg-white rounded shadow">
      <div className="p-4 border-b flex justify-between items-center">
        <h1 className="text-xl font-bold text-gray-800 hidden md:block">Reservas de Canchas</h1>
        <div className="flex gap-2 flex-wrap w-full md:w-auto">
          <div className="grid grid-cols-2 md:flex gap-2 w-full md:w-auto">
            <button
              onClick={() => openReservationModal(currentDate)}
              className="px-4 py-2 bg-blue-600 text-white rounded flex items-center justify-center"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-1" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M10 3a1 1 0 00-1 1v5H4a1 1 0 100 2h5v5a1 1 0 102 0v-5h5a1 1 0 100-2h-5V4a1 1 0 00-1-1z" clipRule="evenodd" />
              </svg>
              Crear Reserva
            </button>
            <button
              onClick={() => openEventModal()}
              className="px-4 py-2 bg-green-600 text-white rounded flex items-center justify-center"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-1" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M6 2a1 1 0 00-1 1v1H4a2 2 0 00-2 2v10a2 2 0 002 2h12a2 2 0 002-2V6a2 2 0 00-2-2h-1V3a1 1 0 10-2 0v1H7V3a1 1 0 00-1-1zm0 5a1 1 0 000 2h8a1 1 0 100-2H6z" clipRule="evenodd" />
              </svg>
              Crear Evento
            </button>
            <button
              onClick={() => openTransactionModal()}
              className="px-4 py-2 bg-purple-600 text-white rounded flex items-center justify-center"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-1" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M4 4a2 2 0 00-2 2v4a2 2 0 002 2V12a2 2 0 002 2h8a2 2 0 002-2v-.5a2 2 0 002-2V6a2 2 0 00-2-2H4z" />
                <path d="M3 13.75a.75.75 0 01.75-.75h1.5a.75.75 0 010 1.5h-1.5a.75.75 0 01-.75-.75zM3 10.75a.75.75 0 01.75-.75h1.5a.75.75 0 010 1.5h-1.5a.75.75 0 01-.75-.75zM7 10.75a.75.75 0 01.75-.75h1.5a.75.75 0 010 1.5h-1.5A.75.75 0 017 10.75zM7 13.75a.75.75 0 01.75-.75h1.5a.75.75 0 010 1.5h-1.5a.75.75 0 01-.75-.75zM11 10.75a.75.75 0 01.75-.75h1.5a.75.75 0 010 1.5h-1.5a.75.75 0 01-.75-.75z" />
              </svg>
              Transacción
            </button>
            <button
              onClick={openPurgeDialog}
              className="px-4 py-2 bg-red-600 text-white rounded flex items-center justify-center"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-1" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v10a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0011 2H9zM7 8a1 1 0 012 0v6a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v6a1 1 0 102 0V8a1 1 0 00-1-1z" clipRule="evenodd" />
              </svg>
              Purgar Datos
            </button>
          </div>
        </div>
      </div>

      {!isMobile && (
        <div className="px-4 py-2 border-b">
          <Tabs value={currentView} onChange={handleTabChange} aria-label="view tabs">
            <Tab label="Calendario" id="calendar-tab" />
            <Tab label="Vista desde arriba" id="overhead-tab" />
          </Tabs>
        </div>
      )}

      {isMobile ? (
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
      ) : (
        <>
          {currentView === 0 ? (
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
          ) : (
            <div className="p-4">
              <OverheadView
                courts={courts}
                reservations={allReservations}
                events={allEvents}
                onCourtClick={handleCourtClick}
                currentDate={currentDate}
              />
            </div>
          )}
        </>
      )}

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
          category="court_rental"
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

      {isPurgeDialogOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white p-6 rounded-lg shadow-lg max-w-md w-full">
            <h2 className="text-xl font-bold text-red-600 mb-4">Confirmar eliminación</h2>
            <p className="mb-6">
              ¿Está seguro de que desea eliminar todos los datos? Esta acción no se puede deshacer y eliminará todas las reservas y transacciones.
            </p>
            <div className="flex justify-end gap-3">
              <button
                onClick={closePurgeDialog}
                disabled={isPurging}
                className="px-4 py-2 border border-gray-300 rounded text-gray-700 bg-white hover:bg-gray-50"
              >
                Cancelar
              </button>
              <button
                onClick={handlePurgeData}
                disabled={isPurging}
                className="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700 disabled:opacity-50 flex items-center"
              >
                {isPurging ? (
                  <>
                    <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    Eliminando...
                  </>
                ) : (
                  <>Eliminar todos los datos</>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}