import { format, startOfWeek, addDays, isSameDay, isPast } from "date-fns";
import { es } from 'date-fns/locale';
import { CourtData, Event, Reservation } from "../../types/bookings/types";
import { BookingSlot } from "./BookingSlot";

interface MobileCalendarProps {
  loading: boolean;
  isBlocked: boolean;
  event: Event | null;
  courtData: CourtData | null;
  weekStart: Date;
  openModal: (type: 'create' | 'edit' | 'view', data: {reservation?: Reservation, day?: Date, hour?: number}) => void;
}

export function MobileCalendar({ loading, isBlocked, event, courtData, weekStart, openModal }: MobileCalendarProps) {
  const daysOfWeek = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i));
  const hours = Array.from({ length: 7 }, (_, i) => i + 12);
  const today = new Date();

  if (loading) {
    return (
      <div className="p-4 text-center">
        <div className="inline-block animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-blue-500"></div>
        <p className="mt-2 text-gray-600">Cargando...</p>
      </div>
    );
  }

  if (isBlocked) {
    return (
      <div className="p-4 text-center bg-red-50">
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
      <div className="p-4 text-center text-gray-600">No hay datos disponibles</div>
    );
  }

  return (
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
                
                <div className="p-2 flex flex-col gap-2 mt-2">
                  {hours.map(hour => (
                    <div key={hour} className="border rounded overflow-hidden flex">
                      <div className="bg-gray-100 p-2 text-center font-medium flex items-center">
                        {hour}:00
                      </div>
                      <div className="h-12 w-full">
                        <BookingSlot 
                          day={day} 
                          hour={hour} 
                          courtData={courtData} 
                          openModal={openModal} 
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </details>
            </div>
          </div>
        );
      })}
    </div>
  );
}