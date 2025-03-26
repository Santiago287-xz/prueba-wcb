"use client";

import { format, parseISO, differenceInWeeks, isValid, isBefore } from "date-fns";
import { es } from 'date-fns/locale';
import { useState, useEffect, useRef, useCallback } from "react";
import { Court, ModalDataType } from "../../types/bookings/types";

interface BookingModalProps {
  modalData: ModalDataType;
  setModalData: (data: ModalDataType | ((prev: ModalDataType) => ModalDataType)) => void;
  loading: boolean;
  closeModal: () => void;
  handleBooking: () => Promise<void>;
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
  const initialRenderRef = useRef(true);
  const modalOpenRef = useRef(false);
  const nameRef = useRef<HTMLInputElement>(null);
  const userTimeChangeRef = useRef(false);

  const [selectedCourtId, setSelectedCourtId] = useState<string>(modalData.courtId || "");
  const [endTimeDisplay, setEndTimeDisplay] = useState<string>("");
  const [selectedDate, setSelectedDate] = useState<Date>(modalData.selectedDay || new Date());
  const [selectedHour, setSelectedHour] = useState<string>(() => {
    if (typeof modalData.selectedHour === 'string') {
      // Ensure it's in HH:MM format
      if (modalData.selectedHour.includes(':')) {
        return modalData.selectedHour;
      }
    } else if (typeof modalData.selectedHour === 'number') {
      return modalData.selectedHour < 10 ? `0${modalData.selectedHour}:00` : `${modalData.selectedHour}:00`;
    }
    return "10:00";
  });

  const [availableTimeSlots, setAvailableTimeSlots] = useState<string[]>([]);
  const [isTimeUnavailable, setIsTimeUnavailable] = useState<boolean>(false);
  const [timeError, setTimeError] = useState<string | null>(null);
  const [totalSessions, setTotalSessions] = useState<number>(0);
  const [remainingSessions, setRemainingSessions] = useState<number>(0);
  const [recurrenceEndError, setRecurrenceEndError] = useState<string | null>(null);

  const [expandedSection, setExpandedSection] = useState<string>("client");

  useEffect(() => {
    if (modalData.type && !modalOpenRef.current) {
      modalOpenRef.current = true;
      setTimeout(() => {
        if (nameRef.current) {
          nameRef.current.focus();
        }
      }, 100);
    }

    if (!modalData.type) {
      modalOpenRef.current = false;
    }
  }, [modalData.type]);

  // Initialize values
  useEffect(() => {
    if (initialRenderRef.current) {
      initialRenderRef.current = false;
      return;
    }

    setSelectedCourtId(modalData.courtId || "");

    if (modalData.selectedDay) {
      setSelectedDate(modalData.selectedDay);
    }

    // Skip updating selectedHour if the change came from user input
    if (!userTimeChangeRef.current) {
      if (modalData.selectedHour !== undefined) {
        if (typeof modalData.selectedHour === 'number') {
          const hour = modalData.selectedHour;
          setSelectedHour(hour < 10 ? `0${hour}:00` : `${hour}:00`);
        } else if (typeof modalData.selectedHour === 'string') {
          setSelectedHour(modalData.selectedHour);
        }
      }

      if (modalData.reservation) {
        const startTime = new Date(modalData.reservation.startTime);
        setSelectedDate(startTime);
        const hourStr = startTime.getHours().toString().padStart(2, '0');
        const minuteStr = startTime.getMinutes().toString().padStart(2, '0');
        setSelectedHour(`${hourStr}:${minuteStr}`);
      }
    }

    // Reset the flag after processing
    userTimeChangeRef.current = false;
  }, [modalData.courtId, modalData.selectedDay, modalData.selectedHour, modalData.reservation]);

  // Check availability based on selected date and court
  useEffect(() => {
    if (!selectedDate || !selectedCourtId) return;

    const dateStr = format(selectedDate, 'yyyy-MM-dd');
    const now = new Date();
    const isSameDay = format(now, 'yyyy-MM-dd') === dateStr;
    const currentHour = now.getHours();

    fetch(`/api/bookings?weekStart=${dateStr}&weekEnd=${dateStr}&courtId=${selectedCourtId}`, {
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

          setIsTimeUnavailable(!available.includes(selectedHour));

        }
      })
      .catch(err => {
        console.error("Error fetching reservations:", err);
      });
  }, [selectedDate, selectedCourtId, selectedHour, modalData.type, modalData.reservation]);

  // Calculate end time based on court type and selected time
  useEffect(() => {
    if (!selectedCourtId || !modalData.courts || !selectedHour) return;

    const court = modalData.courts.find(c => c.id === selectedCourtId);
    if (!court) return;

    const [hoursStr, minutesStr] = selectedHour.split(':');
    const hours = parseInt(hoursStr, 10);
    const minutes = parseInt(minutesStr, 10);

    if (court.type === 'futbol' && minutes !== 0) {
      setTimeError("Para canchas de fútbol, sólo se permiten reservas en horas exactas.");
    } else {
      setTimeError(null);
    }

    if (court.type === 'futbol') {
      const endHour = hours + 1;
      setEndTimeDisplay(`${endHour < 10 ? '0' + endHour : endHour}:${minutes < 10 ? '0' + minutes : minutes}`);
    } else {
      let endHour = hours;
      let endMinutes = minutes + 30;

      if (endMinutes >= 60) {
        endHour += 1;
        endMinutes -= 60;
      }

      endHour += 1;

      setEndTimeDisplay(
        `${endHour < 10 ? '0' + endHour : endHour}:${endMinutes < 10 ? '0' + endMinutes : endMinutes}`
      );
    }
  }, [selectedCourtId, selectedHour, modalData.courts]);

  // Calculate session info for recurring bookings
  useEffect(() => {
    if (!modalData.isRecurring || !modalData.recurrenceEnd) {
      setTotalSessions(0);
      setRemainingSessions(0);
      setRecurrenceEndError(null);
      return;
    }

    const startDate = new Date(selectedDate);
    const endDate = new Date(modalData.recurrenceEnd);

    if (!isValid(endDate)) {
      setRecurrenceEndError("La fecha ingresada no es válida");
      setTotalSessions(0);
      setRemainingSessions(0);
      return;
    }

    if (isBefore(endDate, startDate)) {
      setRecurrenceEndError("La fecha final debe ser posterior a la fecha de inicio");
      setTotalSessions(0);
      setRemainingSessions(0);
      return;
    }

    setRecurrenceEndError(null);

    const weeksBetween = differenceInWeeks(endDate, startDate);
    const total = Math.max(1, weeksBetween + 1);
    setTotalSessions(total);

    const remaining = total - (modalData.paidSessions || 0);
    setRemainingSessions(remaining);
  }, [modalData.isRecurring, modalData.recurrenceEnd, selectedDate, modalData.paidSessions]);

  const handleCourtChange = useCallback((e: React.ChangeEvent<HTMLSelectElement>) => {
    const courtId = e.target.value;
    setSelectedCourtId(courtId);

    setModalData((prev) => ({
      ...prev,
      courtId
    }));
  }, [setModalData]);

  const handleDateChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const newDate = new Date(e.target.value);
    setSelectedDate(newDate);

    setModalData((prev) => ({
      ...prev,
      selectedDay: newDate
    }));
  }, [setModalData]);

  const handleTimeChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const timeValue = e.target.value;

    // Set the flag to indicate this change came from user input
    userTimeChangeRef.current = true;

    setSelectedHour(timeValue);

    setModalData((prev) => ({
      ...prev,
      selectedHour: timeValue
    }));
  }, [setModalData]);

  const handleNameChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    setModalData((prev) => ({
      ...prev,
      name: e.target.value
    }));
  }, [setModalData]);

  const handlePhoneChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const numericValue = e.target.value.replace(/\D/g, '');
    setModalData((prev) => ({
      ...prev,
      phone: numericValue
    }));
  }, [setModalData]);

  const handleRecurrenceEndChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    setModalData((prev) => ({
      ...prev,
      recurrenceEnd: e.target.value
    }));
  }, [setModalData]);

  const handlePaymentMethodChange = useCallback((e: React.ChangeEvent<HTMLSelectElement>) => {
    setModalData((prev) => ({
      ...prev,
      paymentMethod: e.target.value
    }));
  }, [setModalData]);

  const handlePaymentNotesChange = useCallback((e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setModalData((prev) => ({
      ...prev,
      paymentNotes: e.target.value
    }));
  }, [setModalData]);

  const handlePaidSessionsChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    setModalData((prev) => ({
      ...prev,
      paidSessions: parseInt(e.target.value) || 0
    }));
  }, [setModalData]);

  const handleRecurringChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    setModalData((prev) => ({
      ...prev,
      isRecurring: e.target.checked
    }));
  }, [setModalData]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (modalData.type === 'create') {
      handleBooking();
    } else if (modalData.type === 'edit') {
      handleUpdatePayment();
    }
  };

  const toggleSection = (section: string) => {
    setExpandedSection(expandedSection === section ? "" : section);
  };

  const isNameValid = modalData.name?.trim().length >= 3 && modalData.name?.length <= 50;
  const isPhoneValid = modalData.phone?.trim().length >= 3 && modalData.phone?.length <= 20;
  const isCourtSelected = modalData.type === 'edit' || modalData.type === 'view' || !!selectedCourtId;
  const isHourSelected = modalData.type === 'edit' || modalData.type === 'view' || !!selectedHour;
  const isRecurrenceEndValid = !modalData.isRecurring || (modalData.recurrenceEnd && !recurrenceEndError);
  const isTimeValid = timeError === null;

  const isFormValid = isNameValid && isPhoneValid && isCourtSelected && isHourSelected && isRecurrenceEndValid && !isTimeUnavailable && isTimeValid;

  const selectedCourt = modalData.courts?.find(c => c.id === selectedCourtId);
  const courtType = selectedCourt?.type;

  const isViewMode = modalData.type === 'view';
  const isDisabled = loading || isViewMode;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4 overflow-y-auto">
      <div className="bg-white p-5 rounded max-w-4xl w-full shadow-lg my-8">
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

        {selectedHour && endTimeDisplay && (
          <div className="p-3 bg-blue-50 rounded mb-6">
            <div className="flex items-center">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-blue-500 mr-2" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-12a1 1 0 10-2 0v4a1 1 0 00.293.707l2.828 2.829a1 1 0 101.415-1.415L11 9.586V6z" clipRule="evenodd" />
              </svg>
              <div>
                <div>{format(selectedDate, "EEEE d 'de' MMMM", { locale: es })}</div>
                <div className="text-sm">
                  {selectedHour} - {endTimeDisplay}
                </div>
                {courtType === 'padel' && (
                  <div className="text-xs text-gray-500">90 minutos</div>
                )}
                {courtType === 'futbol' && (
                  <div className="text-xs text-gray-500">60 minutos</div>
                )}
              </div>
            </div>
          </div>
        )}

        <form onSubmit={handleSubmit} noValidate>
          <div className="md:hidden space-y-4">
            <div className="border rounded overflow-hidden">
              <button
                type="button"
                className={`w-full p-3 text-left font-semibold flex justify-between items-center ${expandedSection === "client" ? "bg-blue-50" : "bg-gray-50"}`}
                onClick={() => toggleSection("client")}
              >
                <div className="flex items-center">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-gray-700 mr-2" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M10 9a3 3 0 100-6 3 3 0 000 6zm-7 9a7 7 0 1114 0H3z" clipRule="evenodd" />
                  </svg>
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
                      value={modalData.name || ''}
                      onChange={handleNameChange}
                      className={`w-full p-2 border rounded focus:ring-blue-500 focus:border-blue-500 ${modalData.name?.length > 0 && !isNameValid ? 'border-red-500' : ''
                        }`}
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
                      value={modalData.phone || ''}
                      onChange={handlePhoneChange}
                      className={`w-full p-2 border rounded focus:ring-blue-500 focus:border-blue-500 ${modalData.phone?.length > 0 && !isPhoneValid ? 'border-red-500' : ''
                        }`}
                      placeholder="Número de teléfono"
                      disabled={isDisabled}
                      maxLength={20}
                      required
                    />
                    {modalData.phone?.length > 0 && !isPhoneValid && (
                      <p className="text-xs text-red-500 mt-1">Mínimo 3 dígitos</p>
                    )}
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Método de pago
                    </label>
                    <select
                      value={modalData.paymentMethod || ''}
                      onChange={handlePaymentMethodChange}
                      className="w-full p-2 border rounded focus:ring-blue-500 focus:border-blue-500 appearance-none"
                      disabled={isDisabled}
                    >
                      <option value="pending">Pendiente</option>
                      <option value="transfer">Transferencia</option>
                      <option value="cash">Efectivo</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Notas de pago
                    </label>
                    <textarea
                      value={modalData.paymentNotes || ''}
                      onChange={handlePaymentNotesChange}
                      className="w-full p-2 border rounded focus:ring-blue-500 focus:border-blue-500"
                      placeholder="Notas adicionales sobre el pago"
                      rows={3}
                      disabled={isDisabled}
                      maxLength={255}
                    />
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
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-gray-700 mr-2" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M6 2a1 1 0 00-1 1v1H4a2 2 0 00-2 2v10a2 2 0 002 2h12a2 2 0 002-2V6a2 2 0 00-2-2h-1V3a1 1 0 10-2 0v1H7V3a1 1 0 00-1-1zm0 5a1 1 0 000 2h8a1 1 0 100-2H6z" clipRule="evenodd" />
                  </svg>
                  Detalles de la Reserva
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
                      <select
                        value={selectedCourtId}
                        onChange={handleCourtChange}
                        className={`w-full p-2 border rounded focus:ring-blue-500 focus:border-blue-500 ${!isCourtSelected ? 'border-red-500' : ''
                          }`}
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
                          value={format(selectedDate, 'yyyy-MM-dd')}
                          onChange={handleDateChange}
                          className="w-full p-2 border rounded focus:ring-blue-500 focus:border-blue-500"
                          disabled={isDisabled}
                          min={format(new Date(), 'yyyy-MM-dd')}
                        />
                        <div className="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none">
                          <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-gray-400" viewBox="0 0 20 20" fill="currentColor">
                            <path fillRule="evenodd" d="M6 2a1 1 0 00-1 1v1H4a2 2 0 00-2 2v10a2 2 0 002 2h12a2 2 0 002-2V6a2 2 0 00-2-2h-1V3a1 1 0 10-2 0v1H7V3a1 1 0 00-1-1zm0 5a1 1 0 000 2h8a1 1 0 100-2H6z" clipRule="evenodd" />
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
                          value={selectedHour}
                          onChange={handleTimeChange}
                          className={`w-full p-2 border rounded focus:ring-blue-500 focus:border-blue-500 ${isTimeUnavailable || timeError ? 'border-red-500 bg-red-50' : ''
                            }`}
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
                        checked={modalData.isRecurring || false}
                        onChange={handleRecurringChange}
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
                          value={modalData.recurrenceEnd || ''}
                          onChange={handleRecurrenceEndChange}
                          className={`w-full p-2 border rounded focus:ring-blue-500 focus:border-blue-500 ${recurrenceEndError ? 'border-red-500' : ''
                            }`}
                          disabled={isDisabled}
                          min={format(selectedDate, 'yyyy-MM-dd')}
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
                          value={modalData.paidSessions || 0}
                          onChange={handlePaidSessionsChange}
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

          <div className="hidden md:grid md:grid-cols-2 gap-6 mb-6">
            <div className="space-y-4">
              <div className="flex items-center mb-2">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-gray-700 mr-2" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M10 9a3 3 0 100-6 3 3 0 000 6zm-7 9a7 7 0 1114 0H3z" clipRule="evenodd" />
                </svg>
                <h2 className="text-lg font-medium">Información del Cliente</h2>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Nombre <span className="text-red-500">*</span>
                </label>
                <input
                  ref={nameRef}
                  type="text"
                  value={modalData.name || ''}
                  onChange={handleNameChange}
                  className={`w-full p-2 border rounded focus:ring-blue-500 focus:border-blue-500 ${modalData.name?.length > 0 && !isNameValid ? 'border-red-500' : ''
                    }`}
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
                  value={modalData.phone || ''}
                  onChange={handlePhoneChange}
                  className={`w-full p-2 border rounded focus:ring-blue-500 focus:border-blue-500 ${modalData.phone?.length > 0 && !isPhoneValid ? 'border-red-500' : ''
                    }`}
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
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-gray-700 mr-2" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M4 4a2 2 0 00-2 2v4a2 2 0 002 2V6h10a2 2 0 00-2-2H4zm2 6a2 2 0 012-2h8a2 2 0 012 2v4a2 2 0 01-2 2H8a2 2 0 01-2-2v-4zm6 4a2 2 0 100-4 2 2 0 000 4z" clipRule="evenodd" />
                </svg>
                <h2 className="text-lg font-medium">Detalles de Pago</h2>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Método de pago
                </label>
                <select
                  value={modalData.paymentMethod || ''}
                  onChange={handlePaymentMethodChange}
                  className="w-full p-2 border rounded focus:ring-blue-500 focus:border-blue-500 appearance-none"
                  disabled={isDisabled}
                >
                  <option value="pending">Pendiente</option>
                  <option value="transfer">Transferencia</option>
                  <option value="cash">Efectivo</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Notas de pago
                </label>
                <textarea
                  value={modalData.paymentNotes || ''}
                  onChange={handlePaymentNotesChange}
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
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-gray-700 mr-2" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M6 2a1 1 0 00-1 1v1H4a2 2 0 00-2 2v10a2 2 0 002 2h12a2 2 0 002-2V6a2 2 0 00-2-2h-1V3a1 1 0 10-2 0v1H7V3a1 1 0 00-1-1zm0 5a1 1 0 000 2h8a1 1 0 100-2H6z" clipRule="evenodd" />
                </svg>
                <h2 className="text-lg font-medium">Detalles de la Reserva</h2>
              </div>

              {(modalData.type === 'create' || modalData.type === 'edit') && modalData.courts && modalData.courts.length > 0 && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Cancha <span className="text-red-500">*</span>
                  </label>
                  <select
                    value={selectedCourtId}
                    onChange={handleCourtChange}
                    className={`w-full p-2 border rounded focus:ring-blue-500 focus:border-blue-500 ${!isCourtSelected ? 'border-red-500' : ''
                      }`}
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
                      value={format(selectedDate, 'yyyy-MM-dd')}
                      onChange={handleDateChange}
                      className="w-full p-2 border rounded focus:ring-blue-500 focus:border-blue-500"
                      disabled={isDisabled}
                      min={format(new Date(), 'yyyy-MM-dd')}
                    />
                    <div className="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none">
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-gray-400" viewBox="0 0 20 20" fill="currentColor">
                        <path fillRule="evenodd" d="M6 2a1 1 0 00-1 1v1H4a2 2 0 00-2 2v10a2 2 0 002 2h12a2 2 0 002-2V6a2 2 0 00-2-2h-1V3a1 1 0 10-2 0v1H7V3a1 1 0 00-1-1zm0 5a1 1 0 000 2h8a1 1 0 100-2H6z" clipRule="evenodd" />
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
                      value={selectedHour}
                      onChange={handleTimeChange}
                      className={`w-full p-2 border rounded focus:ring-blue-500 focus:border-blue-500 ${isTimeUnavailable || timeError ? 'border-red-500 bg-red-50' : ''
                        }`}
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
                    checked={modalData.isRecurring || false}
                    onChange={handleRecurringChange}
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
                      value={modalData.recurrenceEnd || ''}
                      onChange={handleRecurrenceEndChange}
                      className={`w-full p-2 border rounded focus:ring-blue-500 focus:border-blue-500 ${recurrenceEndError ? 'border-red-500' : ''
                        }`}
                      disabled={isDisabled}
                      min={format(selectedDate, 'yyyy-MM-dd')}
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
                      value={modalData.paidSessions || 0}
                      onChange={handlePaidSessionsChange}
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
          </div>

          <div className="flex justify-between items-center border-t pt-4 mt-4">
            {modalData.type === 'edit' && (
              <button
                type="button"
                onClick={() => handleCancel(modalData.reservation?.id || '')}
                disabled={loading}
                className="px-4 py-2 border border-transparent rounded shadow-sm text-sm font-medium text-white bg-red-600 hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500"
              >
                {loading ? 'Cancelando...' : 'Cancelar Reserva'}
              </button>
            )}

            <div className="flex gap-3 ml-auto">
              <button
                type="button"
                onClick={closeModal}
                disabled={loading}
                className="px-4 py-2 border border-gray-300 rounded shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
              >
                {modalData.type === 'view' ? 'Cerrar' : 'Volver'}
              </button>

              {modalData.type === 'create' && (
                <button
                  type="submit"
                  disabled={loading || !isFormValid}
                  className={`px-4 py-2 border border-transparent rounded shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 ${!isFormValid ? 'opacity-50 cursor-not-allowed' : ''
                    }`}
                >
                  {loading ? 'Guardando...' : 'Guardar Reserva'}
                </button>
              )}

              {modalData.type === 'edit' && (
                <button
                  type="submit"
                  disabled={loading || !isNameValid || !isPhoneValid || !isTimeValid}
                  className={`px-4 py-2 border border-transparent rounded shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 ${(!isNameValid || !isPhoneValid || !isTimeValid) ? 'opacity-50 cursor-not-allowed' : ''
                    }`}
                >
                  {loading ? 'Actualizando...' : 'Actualizar Reserva'}
                </button>
              )}
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}