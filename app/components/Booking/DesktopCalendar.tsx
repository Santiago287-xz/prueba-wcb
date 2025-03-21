import { format, startOfWeek, addDays, isSameDay } from "date-fns";
import { es } from 'date-fns/locale';
import { CourtData, Event, Reservation } from "../../types/bookings/types";
import { BookingSlot } from "./BookingSlot";

interface DesktopCalendarProps {
  loading: boolean;
  isBlocked: boolean;
  event: Event | null;
  courtData: CourtData | null;
  weekStart: Date;
  openModal: (type: 'create' | 'edit' | 'view', data: {reservation?: Reservation, day?: Date, hour?: number}) => void;
}

export function DesktopCalendar({ loading, isBlocked, event, courtData, weekStart, openModal }: DesktopCalendarProps) {
  const daysOfWeek = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i));
  const hours = Array.from({ length: 7 }, (_, i) => i + 12);
  const today = new Date();

  if (loading) {
    return (
      <div className="p-8 text-center">
        <div className="inline-block animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-blue-500"></div>
        <p className="mt-2 text-gray-600">Cargando...</p>
      </div>
    );
  }

  if (isBlocked) {
    return (
      <div className="p-8 text-center bg-red-50">
        <p className="text-red-600">Cancha bloqueada por evento</p>
        {event && (
          <>
            <p className="font-bold mt-2">{event.name}</p>
            <p className="text-gray-700">
              {format(new Date(event.startTime as string), "HH:mm")} a {format(new Date(event.endTime as string), "HH:mm")}
            </p>
          </>
        )}
      </div>
    );
  }

  if (!courtData) {
    return (
      <div className="p-8 text-center text-gray-600">No hay datos disponibles</div>
    );
  }

  return (
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
            {daysOfWeek.map(day => (
              <td key={day.toISOString()} className="border p-2 relative">
                <BookingSlot 
                  day={day} 
                  hour={hour} 
                  courtData={courtData} 
                  openModal={openModal} 
                />
              </td>
            ))}
          </tr>
        ))}
      </tbody>
    </table>
  );
}