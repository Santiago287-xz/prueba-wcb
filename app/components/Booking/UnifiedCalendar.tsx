"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import { format, startOfWeek, endOfWeek, addDays, isSameDay, isToday, parseISO } from "date-fns";
import { es } from 'date-fns/locale';
import useSWR from 'swr';
import { Court, Reservation } from "../../types/bookings/types";

// Types
interface EventIndicator {
  type: 'futbol' | 'padel' | 'event';
  count: number;
}

interface DayEvents {
  date: Date;
  events: Reservation[];
  indicators: EventIndicator[];
}

interface GroupedEvent extends Reservation {
  courts: string[];
}

interface UnifiedCalendarProps {
  courts: Court[];
  currentDate: Date;
  setCurrentDate: (date: Date) => void;
  openReservationModal: (date: Date, hour?: number) => void;
  openEventModal: () => void;
  openDetailModal: (reservation: Reservation) => void;
  loading: boolean;
}

// Improved fetcher with error handling
const fetcher = async (url: string) => {
  const res = await fetch(url);
  if (!res.ok) {
    const error = await res.json();
    throw new Error(error.error || "Error fetching data");
  }
  return res.json();
};

export function UnifiedCalendar({
  courts,
  currentDate,
  setCurrentDate,
  openReservationModal,
  openEventModal,
  openDetailModal,
  loading: externalLoading
}: UnifiedCalendarProps) {
  const [isMobile, setIsMobile] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  // Calculate week start and end dates - memoized
  const weekStart = useMemo(() => {
    return startOfWeek(currentDate, { weekStartsOn: 1 }); // Start week on Monday
  }, [currentDate]);
  
  const weekEnd = useMemo(() => {
    return endOfWeek(weekStart, { weekStartsOn: 1 });
  }, [weekStart]);

  // Format dates for API calls
  const startDateStr = useMemo(() => format(weekStart, "yyyy-MM-dd"), [weekStart]);
  const endDateStr = useMemo(() => format(weekEnd, "yyyy-MM-dd"), [weekEnd]);

  // Use SWR for all reservations at once instead of per court
  const { data: reservationsData, error: reservationsError, isLoading: reservationsLoading } = useSWR(
    courts.length > 0 ? `/api/bookings/week?start=${startDateStr}&end=${endDateStr}` : null,
    fetcher,
    {
      revalidateOnFocus: false,
      dedupingInterval: 30000, // 30 seconds cache
    }
  );

  // Check if mobile
  useEffect(() => {
    const checkIfMobile = () => {
      setIsMobile(window.innerWidth < 768);
    };
    
    checkIfMobile();
    window.addEventListener('resize', checkIfMobile);
    
    return () => {
      window.removeEventListener('resize', checkIfMobile);
    };
  }, []);

  // Set error from SWR
  useEffect(() => {
    if (reservationsError) {
      setError("Error fetching calendar data");
      console.error(reservationsError);
    } else {
      setError(null);
    }
  }, [reservationsError]);

  // Generate days of the week - memoized
  const weekDays = useMemo(() => {
    return Array.from({ length: 7 }, (_, i) => addDays(weekStart, i));
  }, [weekStart]);
  
  // For desktop view, get 3 consecutive days starting with the selected day
  const threeDaysView = useMemo(() => {
    const dayIndex = weekDays.findIndex(day => isSameDay(day, currentDate));
    if (dayIndex === -1) return weekDays.slice(0, 3);
    
    // If selected day is one of the last two days of the week, show last 3 days
    if (dayIndex >= weekDays.length - 2) {
      return weekDays.slice(weekDays.length - 3);
    }
    
    // Otherwise show selected day and next two days
    return weekDays.slice(dayIndex, dayIndex + 3);
  }, [weekDays, currentDate]);

  // Process all events from SWR response - memoized for performance
  const allEvents = useMemo(() => {
    if (!reservationsData) return [];
    
    // Create a map to deduplicate events
    const eventMap = new Map<string, Reservation>();
    
    // Process reservations
    if (reservationsData.reservations) {
      reservationsData.reservations.forEach((reservation: Reservation) => {
        const id = reservation.id || reservation.virtualId;
        if (id) {
          const court = courts.find(c => c.id === reservation.courtId);
          if (court) {
            eventMap.set(id, {
              ...reservation,
              courtName: court.name,
              courtType: court.type
            });
          }
        }
      });
    }
    
    // Process and group events by name + time
    const groupedEvents = new Map<string, GroupedEvent>();
    
    if (reservationsData.events) {
      reservationsData.events.forEach((event: any) => {
        const eventId = `event-${event.id}`;
        const court = courts.find(c => c.id === event.courtId);
        
        if (court) {
          // Create a key that combines name and time to identify related events
          const groupKey = `${event.name}-${event.startTime}-${event.endTime}`;
          
          if (groupedEvents.has(groupKey)) {
            // If we already have this event, just add the court to its courts array
            const existingEvent = groupedEvents.get(groupKey)!;
            existingEvent.courts.push(court.name);
          } else {
            // Otherwise create a new grouped event
            groupedEvents.set(groupKey, {
              id: eventId,
              name: event.name,
              courtId: court.id,
              courtName: court.name,
              courtType: court.type,
              startTime: event.startTime,
              endTime: event.endTime,
              isEvent: true,
              courts: [court.name]
            });
          }
        }
      });
    }
    
    // Add all the grouped events to the event map
    groupedEvents.forEach((event, key) => {
      eventMap.set(key, event);
    });
    
    return Array.from(eventMap.values());
  }, [reservationsData, courts]);

  // Process events by day - heavily memoized calculation
  const dayEventMap = useMemo(() => {
    const result: {[key: string]: DayEvents} = {};
    
    // Initialize the days
    weekDays.forEach(day => {
      const dateKey = format(day, 'yyyy-MM-dd');
      result[dateKey] = {
        date: day,
        events: [],
        indicators: [
          { type: 'futbol', count: 0 },
          { type: 'padel', count: 0 },
          { type: 'event', count: 0 }
        ]
      };
    });
    
    // Add reservations to the appropriate days
    allEvents.forEach(reservation => {
      const startTime = typeof reservation.startTime === 'string' 
        ? parseISO(reservation.startTime) 
        : reservation.startTime;
      
      const dateKey = format(startTime, 'yyyy-MM-dd');
      
      // Only process if the day is within our current week view
      if (result[dateKey]) {
        // Add to events list
        result[dateKey].events.push(reservation);
        
        // Update indicators
        if ((reservation as any).isEvent) {
          const eventIndicator = result[dateKey].indicators.find(i => i.type === 'event');
          if (eventIndicator) eventIndicator.count += 1;
        }
        else if (reservation.courtType === 'futbol') {
          const futbolIndicator = result[dateKey].indicators.find(i => i.type === 'futbol');
          if (futbolIndicator) futbolIndicator.count += 1;
        } else if (reservation.courtType === 'padel') {
          const padelIndicator = result[dateKey].indicators.find(i => i.type === 'padel');
          if (padelIndicator) padelIndicator.count += 1;
        }
      }
    });
    
    // Sort events by time in each day
    Object.values(result).forEach(dayData => {
      dayData.events.sort((a, b) => {
        const timeA = new Date(a.startTime as string).getTime();
        const timeB = new Date(b.startTime as string).getTime();
        return timeA - timeB;
      });
    });
    
    return result;
  }, [weekDays, allEvents]);

  // Group events by time for the selected day - memoized
  const selectedDayEvents = useMemo(() => {
    const dayKey = format(currentDate, 'yyyy-MM-dd');
    const dayData = dayEventMap[dayKey];
    
    if (!dayData) return [];
    
    // Group by hour
    const eventsByHour: {[hour: string]: Reservation[]} = {};
    
    dayData.events.forEach(event => {
      const startTime = typeof event.startTime === 'string' 
        ? parseISO(event.startTime) 
        : event.startTime;
      
      const hour = format(startTime, 'HH:mm');
      
      if (!eventsByHour[hour]) {
        eventsByHour[hour] = [];
      }
      
      eventsByHour[hour].push(event);
    });
    
    // Convert to sorted array
    return Object.entries(eventsByHour)
      .sort(([hourA], [hourB]) => hourA.localeCompare(hourB))
      .map(([hour, events]) => ({ hour, events }));
    
  }, [currentDate, dayEventMap]);

  // Navigation functions - memoized callbacks
  const goToPreviousWeek = useCallback(() => {
    setCurrentDate(addDays(weekStart, -7));
  }, [weekStart, setCurrentDate]);
  
  const goToNextWeek = useCallback(() => {
    setCurrentDate(addDays(weekStart, 7));
  }, [weekStart, setCurrentDate]);
  
  const goToToday = useCallback(() => {
    setCurrentDate(new Date());
  }, [setCurrentDate]);
  
  const selectDay = useCallback((day: Date) => {
    setCurrentDate(day);
  }, [setCurrentDate]);

  // Get event color based on type
  const getEventColor = useCallback((reservation: Reservation) => {
    if ((reservation as any).isEvent) return 'green';
    if (reservation.courtType === 'futbol') return 'red';
    if (reservation.courtType === 'padel') return 'yellow';
    return 'purple'; // Fallback
  }, []);

  // Format court names for display
  const formatCourtNames = useCallback((reservation: Reservation) => {
    if ((reservation as any).isEvent && (reservation as any).courts) {
      const courts = (reservation as any).courts;
      if (courts.length > 1) {
        // Extract court numbers for more concise display
        const courtNumbers = courts.map((courtName: string) => {
          const match = courtName.match(/\d+/);
          return match ? match[0] : courtName;
        });
        
        // For events with multiple courts, show "Canchas X, Y, Z"
        return `Canchas ${courtNumbers.join(', ')}`;
      }
    }
    
    // For regular reservations or single-court events
    return reservation.courtName;
  }, []);

  // Check if loading
  const isLoading = externalLoading || reservationsLoading;

  // Refetch data callback
  const refetchData = useCallback(() => {
    window.location.reload();
  }, []);

  // Render the week header - memoized
  const renderWeekHeader = useCallback(() => {
    const weekRange = `${format(weekStart, "d MMM", { locale: es })} - ${format(addDays(weekStart, 6), "d MMM", { locale: es })}`;
    
    return (
      <div className="mb-4 flex justify-between items-center">
        <div className="text-xl font-bold">
          {format(currentDate, "MMMM yyyy", { locale: es })}
        </div>
        
        <div className="flex items-center gap-2">
          <button 
            onClick={goToPreviousWeek}
            className="p-2 rounded-full hover:bg-gray-100"
            aria-label="Semana anterior"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M12.707 5.293a1 1 0 010 1.414L9.414 10l3.293 3.293a1 1 0 01-1.414 1.414l-4-4a1 1 0 010-1.414l4-4a1 1 0 011.414 0z" clipRule="evenodd" />
            </svg>
          </button>
          
          <span className="text-sm">{weekRange}</span>
          
          <button 
            onClick={goToToday}
            className="py-1 px-2 text-xs bg-blue-500 text-white rounded"
          >
            Hoy
          </button>
          
          <button 
            onClick={goToNextWeek}
            className="p-2 rounded-full hover:bg-gray-100"
            aria-label="Semana siguiente"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z" clipRule="evenodd" />
            </svg>
          </button>
        </div>
      </div>
    );
  }, [currentDate, weekStart, goToPreviousWeek, goToToday, goToNextWeek]);

  // Day indicator dots - memoized
  const renderIndicatorDots = useCallback((indicators: EventIndicator[]) => {
    return (
      <div className="flex justify-center mt-1 gap-1">
        {indicators.map((indicator, index) => {
          if (indicator.count === 0) return null;
          
          const color = 
            indicator.type === 'futbol' ? 'bg-red-500' :
            indicator.type === 'padel' ? 'bg-yellow-500' : 
            'bg-green-500';
          
          return (
            <div 
              key={index} 
              className={`w-2 h-2 rounded-full ${color}`}
              title={`${indicator.count} ${indicator.type}`}
            />
          );
        })}
      </div>
    );
  }, []);

  // Render desktop calendar - memoized
  const renderDesktopView = useCallback(() => {
    return (
      <>
        {renderWeekHeader()}
        
        <div className="grid grid-cols-7 gap-2 mb-6">
          {weekDays.map((day) => {
            const dateKey = format(day, 'yyyy-MM-dd');
            const dayData = dayEventMap[dateKey];
            const isCurrentDay = isToday(day);
            const isSelected = isSameDay(day, currentDate);
            
            return (
              <div 
                key={dateKey}
                className={`text-center p-2 rounded cursor-pointer ${isSelected ? 'bg-blue-500 text-white' : 'hover:bg-gray-100'} ${isCurrentDay && !isSelected ? 'border border-blue-500' : ''}`}
                onClick={() => selectDay(day)}
              >
                <div className="uppercase text-xs font-medium">
                  {format(day, "EEE", { locale: es })}
                </div>
                <div className="text-lg font-bold">
                  {format(day, "d")}
                </div>
                {dayData && renderIndicatorDots(dayData.indicators)}
              </div>
            );
          })}
        </div>
        
        <div className="grid grid-cols-3 gap-4">
          {threeDaysView.map((day) => {
            const dateKey = format(day, 'yyyy-MM-dd');
            const dayData = dayEventMap[dateKey];
            const isSelected = isSameDay(day, currentDate);
            
            return (
              <div key={dateKey} className="border rounded-lg overflow-hidden h-fit">
                <div className={`p-3 font-bold text-center ${isSelected ? 'bg-blue-500 text-white' : 'bg-gray-50'}`}>
                  <h3 className="capitalize">
                    {format(day, "EEEE d", { locale: es })}
                  </h3>
                </div>
                
                <div className="divide-y">
                  {dayData && dayData.events.length > 0 ? (
                    dayData.events.map((event) => {
                      const startTime = new Date(event.startTime as string);
                      const endTime = new Date(event.endTime as string);
                      const eventColor = getEventColor(event);
                      const isEventType = (event as any).isEvent;
                      
                      return (
                        <div 
                          key={event.id || event.virtualId} 
                          className={`p-4 hover:bg-gray-50 cursor-pointer ${isEventType ? 'bg-green-50' : ''}`}
                          onClick={() => openDetailModal(event)}
                        >
                          <div className="flex items-center">
                            <div className={`w-3 h-3 rounded-full bg-${eventColor}-500 mr-2 flex-shrink-0`}></div>
                            <div className="w-full">
                              <div className="flex justify-between items-start">
                                <p className="font-medium">{event.name}</p>
                                {isEventType && (
                                  <span className="text-xs px-2 py-1 bg-green-100 rounded-full text-green-800">Evento</span>
                                )}
                              </div>
                              <p className="text-sm text-gray-600">
                                {format(startTime, "HH:mm")} - {format(endTime, "HH:mm")}
                              </p>
                              <p className="text-xs text-gray-500">{formatCourtNames(event)}</p>
                            </div>
                          </div>
                        </div>
                      );
                    })
                  ) : (
                    <div className="p-6 text-center text-gray-500">
                      <p className="mb-3">No hay eventos programados</p>
                      <button 
                        onClick={() => openReservationModal(day)}
                        className="text-blue-500 text-sm font-medium hover:underline"
                      >
                        + Crear reserva
                      </button>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </>
    );
  }, [renderWeekHeader, weekDays, dayEventMap, currentDate, threeDaysView, renderIndicatorDots, getEventColor, openDetailModal, openReservationModal, selectDay, formatCourtNames]);

  // Render mobile calendar - memoized
  const renderMobileView = useCallback(() => {
    return (
      <>
        {renderWeekHeader()}
        
        <div className="grid grid-cols-7 gap-1 mb-6">
          {weekDays.map((day) => {
            const dateKey = format(day, 'yyyy-MM-dd');
            const dayData = dayEventMap[dateKey];
            const isCurrentDay = isToday(day);
            const isSelected = isSameDay(day, currentDate);
            
            return (
              <div 
                key={dateKey}
                className={`
                  text-center p-1 rounded cursor-pointer
                  ${isSelected ? 'bg-blue-500 text-white' : 'hover:bg-gray-100'}
                  ${isCurrentDay && !isSelected ? 'border border-blue-500' : ''}
                `}
                onClick={() => selectDay(day)}
              >
                <div className="uppercase text-xs">
                  {format(day, "E", { locale: es })}
                </div>
                <div className="text-lg font-semibold">
                  {format(day, "d")}
                </div>
                {dayData && renderIndicatorDots(dayData.indicators)}
              </div>
            );
          })}
        </div>
        
        <div>
          <h2 className="text-lg font-bold mb-4 capitalize">
            {format(currentDate, "EEEE d 'de' MMMM", { locale: es })}
          </h2>
          
          <div className="divide-y">
            {selectedDayEvents.length > 0 ? (
              selectedDayEvents.map(({ hour, events }) => (
                <div key={hour} className="py-2">
                  <div className="flex items-center">
                    <div className="bg-gray-100 px-2 py-1 rounded-full text-sm font-medium">
                      {hour}
                    </div>
                  </div>
                  
                  <div className="mt-2 space-y-2">
                    {events.map((event) => {
                      const startTime = new Date(event.startTime as string);
                      const endTime = new Date(event.endTime as string);
                      const eventColor = getEventColor(event);
                      const isEventType = (event as any).isEvent;
                      
                      return (
                        <div 
                          key={event.id || event.virtualId}
                          className={`p-3 border rounded-lg hover:bg-gray-50 cursor-pointer ${isEventType ? 'bg-green-50' : ''}`}
                          onClick={() => openDetailModal(event)}
                        >
                          <div className="flex items-center">
                            <div className={`w-3 h-3 rounded-full bg-${eventColor}-500 mr-2 flex-shrink-0`}></div>
                            <div className="w-full">
                              <div className="flex justify-between items-start">
                                <p className="font-medium">{event.name}</p>
                                {isEventType && (
                                  <span className="text-xs px-2 py-0.5 bg-green-100 rounded-full text-green-800">Evento</span>
                                )}
                              </div>
                              <div className="flex justify-between">
                                <p className="text-sm text-gray-600">
                                  {format(startTime, "HH:mm")} - {format(endTime, "HH:mm")}
                                </p>
                              </div>
                              <p className="text-xs text-gray-500">{formatCourtNames(event)}</p>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              ))
            ) : (
              <div className="py-8 text-center text-gray-500">
                <p className="mb-3">No hay eventos programados para este día</p>
                <button
                  onClick={() => openReservationModal(currentDate)}
                  className="inline-flex items-center justify-center px-4 py-2 bg-blue-500 text-white rounded-md"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-1" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M10 3a1 1 0 00-1 1v5H4a1 1 0 100 2h5v5a1 1 0 102 0v-5h5a1 1 0 100-2h-5V4a1 1 0 00-1-1z" clipRule="evenodd" />
                  </svg>
                  Crear Reserva
                </button>
              </div>
            )}
          </div>
        </div>
      </>
    );
  }, [renderWeekHeader, weekDays, dayEventMap, currentDate, selectedDayEvents, openDetailModal, openReservationModal, getEventColor, renderIndicatorDots, selectDay, formatCourtNames]);

  // Render loading state
  if (isLoading) {
    return (
      <div className="p-8 text-center">
        <div className="inline-block animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-blue-500"></div>
        <p className="mt-2 text-gray-600">Cargando...</p>
      </div>
    );
  }

  // Render error state
  if (error) {
    return (
      <div className="p-8 text-center text-red-600">
        <p>{error}</p>
        <button 
          onClick={refetchData}
          className="mt-2 px-4 py-2 bg-blue-500 text-white rounded"
        >
          Reintentar
        </button>
      </div>
    );
  }

  return (
    <div className="p-4">
      {isMobile ? renderMobileView() : renderDesktopView()}
    </div>
  );
}