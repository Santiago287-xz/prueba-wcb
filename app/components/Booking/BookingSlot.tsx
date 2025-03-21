import { format, isSameDay, isPast, getHours } from "date-fns";
import { Reservation, CourtData } from "../../types/bookings/types";

interface BookingSlotProps {
  day: Date;
  hour: number;
  courtData: CourtData | null;
  openModal: (type: 'create' | 'edit' | 'view', data: { reservation?: Reservation, day?: Date, hour?: number }) => void;
}

export function BookingSlot({ day, hour, courtData, openModal }: BookingSlotProps) {
  // Check if this slot has a reservation
  const checkReservation = (type: 'exists' | 'data') => {
    if (!courtData?.reservations?.length) return type === 'exists' ? false : null;

    const result = courtData.reservations.find(r => {
      try {
        const startTime = typeof r.startTime === 'string' ? new Date(r.startTime) : r.startTime;
        return isSameDay(startTime, day) && getHours(startTime) === hour;
      } catch (error) {
        return false;
      }
    });

    return type === 'exists' ? !!result : result;
  };

  // Check if slot is in the past
  const isDateTimePast = () => {
    const dateTime = new Date(day);
    dateTime.setHours(hour, 0, 0, 0);
    return isPast(dateTime);
  };

  const getPaymentMethodText = (method: string) => {
    switch (method) {
      case 'pending': return 'Pendiente';
      case 'transfer': return 'Transferencia';
      case 'cash': return 'Efectivo';
      default: return method;
    }
  };

  const exists = checkReservation('exists');
  const reservation = exists ? checkReservation('data') as Reservation : null;
  const isPastTime = isDateTimePast();

  if (exists && reservation) {
    return (
      <div
        className={`${isPastTime ? 'bg-gray-100' : 'bg-red-100'} p-2 rounded h-full flex flex-col justify-center cursor-pointer`}
        onClick={() => openModal(isPastTime ? 'view' : 'edit', { reservation })}
      >
        <div className="hidden md:block">
          <div className="font-medium">{reservation.guestName}</div>
          <div className="text-xs text-gray-600">{reservation.guestPhone}</div>
          {reservation.isRecurring && (
            <div className="mt-1 text-xs">
              <span className="bg-blue-500 text-white px-1 rounded">Fijo</span>
              {` ${reservation.paidSessions || 0} pagadas`}
            </div>
          )}
          <div className="mt-1">
            <span className={`text-xs px-2 py-1 rounded-full inline-block ${reservation.paymentMethod === 'pending' ? 'bg-yellow-100 text-yellow-800' :
              reservation.paymentMethod === 'cash' ? 'bg-green-100 text-green-800' :
                'bg-blue-100 text-blue-800'
              }`}>
              {getPaymentMethodText(reservation.paymentMethod)}
            </span>
          </div>
        </div>
        <div className="md:hidden block m-auto">
          <div className="font-medium">{reservation.guestName} - {reservation.guestPhone}</div>
        </div>
      </div>
    );
  } else if (!isPastTime) {
    return (
      <button
        onClick={() => openModal('create', { day, hour })}
        className="bg-green-500 text-white p-2 w-full h-full hover:bg-green-600 transition rounded-tr rounded-br md:rounded"
      >
        Reservar
      </button>
    );
  } else {
    return (
      <div className="w-full h-full flex items-center justify-center text-gray-400">
        -
      </div>
    );
  }
}