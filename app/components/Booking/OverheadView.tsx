"use client";

import { useState, useEffect, useCallback } from 'react';
import { format } from 'date-fns';
import { Court, Reservation } from '../../types/bookings';

interface OverheadViewProps {
  courts: Court[];
  reservations: Reservation[];
  events: any[];
  onCourtClick: (court: Court) => void;
  currentDate: Date;
}

export function OverheadView({
  courts, 
  reservations, 
  events,
  onCourtClick,
  currentDate
}: OverheadViewProps) {
  const [hoveredCourt, setHoveredCourt] = useState<string | null>(null);
  const [selectedCourt, setSelectedCourt] = useState<Court | null>(null);
  const [lockHover, setLockHover] = useState<boolean>(false);
  
  // Filter reservations for the current day
  const todayReservations = reservations.filter(reservation => {
    const reservationDate = new Date(reservation.startTime);
    return (
      reservationDate.getDate() === currentDate.getDate() &&
      reservationDate.getMonth() === currentDate.getMonth() &&
      reservationDate.getFullYear() === currentDate.getFullYear()
    );
  });

  // Check if a court is currently occupied
  const isCourtOccupied = (courtId: string) => {
    const now = new Date();
    return todayReservations.some(reservation => {
      const startTime = new Date(reservation.startTime);
      const endTime = new Date(reservation.endTime);
      return reservation.courtId === courtId && startTime <= now && endTime >= now;
    });
  };

  // Check if a court has upcoming reservations
  const getCourtReservations = (courtId: string) => {
    const now = new Date();
    return todayReservations.filter(reservation => {
      const startTime = new Date(reservation.startTime);
      return reservation.courtId === courtId && startTime > now;
    }).sort((a, b) => {
      return new Date(a.startTime).getTime() - new Date(b.startTime).getTime();
    });
  };

  // Check if a court is part of an event
  const isCourtInEvent = (courtId: string) => {
    return events.some(event => 
      (event.courtId === courtId || (event.courtIds && event.courtIds.includes(courtId)))
    );
  };

  // Get event information for a court
  const getCourtEvent = (courtId: string) => {
    return events.find(event => 
      (event.courtId === courtId || (event.courtIds && event.courtIds.includes(courtId)))
    );
  };

  // Handle single click to select court
  const handleCourtClick = useCallback((court: Court) => {
    // Toggle selection if clicking the same court
    if (selectedCourt && selectedCourt.id === court.id) {
      setSelectedCourt(null);
    } else {
      setSelectedCourt(court);
    }
    
    setLockHover(true);
    
    // Set timer to unlock hover after 30 seconds
    setTimeout(() => {
      setLockHover(false);
    }, 30000);
  }, [selectedCourt]);
  
  // Handle double click to open modal
  const handleCourtDoubleClick = useCallback((court: Court) => {
    onCourtClick(court);
  }, [onCourtClick]);
  
  // Handle mouse enter only if not in lock mode
  const handleMouseEnter = useCallback((court: Court) => {
    if (!lockHover) {
      setHoveredCourt(court.id);
    }
  }, [lockHover]);
  
  // Handle mouse leave only if not in lock mode
  const handleMouseLeave = useCallback(() => {
    if (!lockHover) {
      setHoveredCourt(null);
    }
  }, [lockHover]);
  
  // Get the displayable reservations for info panel
  const getDisplayReservations = useCallback(() => {
    if (selectedCourt) {
      return getCourtReservations(selectedCourt.id);
    } else if (hoveredCourt) {
      const court = courts.find(c => c.id === hoveredCourt);
      if (court) {
        return getCourtReservations(court.id);
      }
    }
    return [];
  }, [hoveredCourt, selectedCourt, courts]);
  
  // Get the current court for info panel
  const getCurrentCourt = useCallback(() => {
    if (selectedCourt) {
      return selectedCourt;
    } else if (hoveredCourt) {
      return courts.find(c => c.id === hoveredCourt) || null;
    }
    return null;
  }, [hoveredCourt, selectedCourt, courts]);

  // Get event for current court
  const getCurrentCourtEvent = useCallback(() => {
    const court = getCurrentCourt();
    if (!court) return null;
    
    return getCourtEvent(court.id);
  }, [getCurrentCourt]);

  // Static positions for the courts based on type and name
  const getCourtPosition = (court: Court) => {
    if (court.type === 'futbol') {
      if (court.name.includes('1')) return { x: 320, y: 150, width: 350, height: 200 };
      if (court.name.includes('2')) return { x: 680, y: 10, width: 200, height: 340 };
      if (court.name.includes('3')) return { x: 1000, y: 10, width: 230, height: 170 };
      if (court.name.includes('4')) return { x: 1000, y: 185, width: 230, height: 170 };
    } else if (court.type === 'padel') {
      if (court.name.includes('1')) return { x: 320, y: 10, width: 170, height: 130 };
      if (court.name.includes('2')) return { x: 500, y: 10, width: 170, height: 130 };
      if (court.name.includes('3')) return { x: 10, y: 220, width: 170, height: 130 };
    }
    
    return { x: 0, y: 0, width: 100, height: 100 }; // Fallback
  };

  // Get court status for display
  const getCourtStatus = useCallback((courtId: string) => {
    if (isCourtInEvent(courtId)) return "Evento";
    if (isCourtOccupied(courtId)) return "Ocupado";
    return "Libre";
  }, [isCourtInEvent, isCourtOccupied]);

  // Get court status color
  const getCourtStatusColor = useCallback((courtId: string) => {
    if (isCourtInEvent(courtId)) return "bg-green-200";
    if (isCourtOccupied(courtId)) return "bg-red-200";
    return "bg-gray-200";
  }, [isCourtInEvent, isCourtOccupied]);

  return (
    <div className="flex flex-col space-y-4">
      <div className="relative m-auto w-[1250px] h-[400px] border-2 border-gray-300 rounded-lg bg-white overflow-hidden">
        {/* Main facility layout - Fixed positions */}
        <div className="absolute inset-0 p-4">
          
          {/* Gym area */}
          <div className="absolute left-[10px] top-[10px] w-[300px] h-[200px] bg-gray-800 flex items-center justify-center text-white font-bold rounded-lg shadow-md">
            <div className="flex flex-col items-center">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-12 w-12 mb-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.828 14.828a4 4 0 01-5.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <span className="text-xl">Gimnasio</span>
            </div>
          </div>
          
          {/* Canteen */}
          <div className="absolute left-[890px] top-[10px] w-[100px] h-[200px] bg-amber-700 flex items-center justify-center text-white font-bold rounded-lg shadow-md">
            <div className="flex flex-col items-center">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-10 w-10 mb-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v13m0-13V6a2 2 0 112 2h-2zm0 0V5.5A2.5 2.5 0 109.5 8H12zm-7 4h14M5 12a2 2 0 110-4h14a2 2 0 110 4M5 12v7a2 2 0 002 2h10a2 2 0 002-2v-7" />
              </svg>
              <span className="text-sm">Cantina</span>
            </div>
          </div>
          
          {/* Render courts using their static positions */}
          {courts.map(court => {
            const position = getCourtPosition(court);
            const courtType = court.type === 'futbol';
            const borderColor = courtType ? 'border-green-600' : 'border-blue-500';
            const isHovered = hoveredCourt === court.id;
            const isSelected = selectedCourt?.id === court.id;
            const statusColor = getCourtStatusColor(court.id);
            const courtEvent = getCourtEvent(court.id);
            
            return (
              <div
                key={court.id}
                className={`absolute cursor-pointer transition-all duration-300 text-center flex items-center justify-center text-sm font-medium shadow-lg rounded-md
                  ${statusColor}
                  ${isHovered && !isSelected ? 'transform scale-[1.01] z-10 border-blue-300 ring-2 ring-blue-300' : ''}
                  ${isSelected ? 'transform scale-[1.03] z-20 border-yellow-400 ring-2 ring-yellow-400' : ''}
                  border-4 ${!isHovered && !isSelected ? borderColor : ''}
                `}
                style={{
                  left: `${position.x}px`,
                  top: `${position.y}px`,
                  width: `${position.width}px`,
                  height: `${position.height}px`,
                  backgroundImage: courtType ? 'url(/grass-pattern.png)' : 'url(/padel-pattern.png)',
                  backgroundSize: 'cover',
                  backgroundOpacity: 0.3
                }}
                onClick={() => handleCourtClick(court)}
                onDoubleClick={() => handleCourtDoubleClick(court)}
                onMouseEnter={() => handleMouseEnter(court)}
                onMouseLeave={handleMouseLeave}
              >
                <div className="flex flex-col items-center bg-opacity-90 px-3 py-1 rounded-md">
                  <div className="font-bold text-lg">{court.name}</div>
                  {isCourtInEvent(court.id) && courtEvent && (
                    <div className="text-xs bg-green-600 text-white px-2 py-0.5 rounded-full mt-1">
                      {courtEvent.name} 
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
        
        {/* Legend */}
        <div className="absolute bottom-2 right-2 flex items-center text-xs">
          <div className="flex items-center mr-4">
            <div className="w-4 h-4 bg-gray-200 border border-gray-300 mr-1 rounded-sm"></div>
            <span>Libre</span>
          </div>
          <div className="flex items-center mr-4">
            <div className="w-4 h-4 bg-red-200 border border-gray-300 mr-1 rounded-sm"></div>
            <span>Ocupado</span>
          </div>
          <div className="flex items-center">
            <div className="w-4 h-4 bg-green-200 border border-gray-300 mr-1 rounded-sm"></div>
            <span>Evento</span>
          </div>
        </div>
      </div>
      
      {/* Court information panel */}
      <div className="m-auto w-[1250px] bg-white rounded-lg shadow-md p-4">
        {getCurrentCourt() ? (
          <div className="flex flex-col space-y-2">
            <div className="flex justify-between items-center border-b pb-2">
              <div className="flex items-center">
                <h3 className="text-xl font-bold">{getCurrentCourt()?.name}</h3>
                <span className={`ml-3 px-3 py-1 rounded-full text-xs ${
                  getCourtStatus(getCurrentCourt()?.id || '') === 'Libre' ? 'bg-gray-200' :
                  getCourtStatus(getCurrentCourt()?.id || '') === 'Ocupado' ? 'bg-red-200' : 'bg-green-200'
                }`}>
                  {getCourtStatus(getCurrentCourt()?.id || '')}
                </span>
              </div>
              <div className="text-sm text-gray-600">
                Tipo: {getCurrentCourt()?.type === 'futbol' ? 'Fútbol' : 'Pádel'}
              </div>
            </div>
            
            {/* Event details if applicable */}
            {getCurrentCourtEvent() && (
              <div className="bg-green-50 p-3 rounded-lg border border-green-200 mb-2">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="font-medium text-green-800">Evento: {getCurrentCourtEvent()?.name}</div>
                    {getCurrentCourtEvent()?.startTime && getCurrentCourtEvent()?.endTime && (
                      <div className="text-sm text-green-700">
                        Horario: {format(new Date(getCurrentCourtEvent()?.startTime), 'HH:mm')} - {format(new Date(getCurrentCourtEvent()?.endTime), 'HH:mm')}
                      </div>
                    )}
                  </div>
                  <span className="bg-green-600 text-white text-xs px-2 py-1 rounded">Evento especial</span>
                </div>
              </div>
            )}
            
            <div>
              <h4 className="font-medium text-gray-700 mb-1">Próximas reservas:</h4>
              {getDisplayReservations().length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2">
                  {getDisplayReservations().map((reservation, index) => (
                    <div key={index} className="border border-gray-100 rounded-lg p-3 bg-gray-50 hover:bg-gray-100 transition-colors duration-200 shadow-sm">
                      <div className="flex justify-between items-center">
                        <div className="font-medium text-blue-800">{format(new Date(reservation.startTime), 'HH:mm')} - {format(new Date(reservation.endTime), 'HH:mm')}</div>
                        <span className={`text-xs px-2 py-0.5 rounded-full ${
                          reservation.paymentMethod === 'cash' ? 'bg-green-100 text-green-800' : 
                          reservation.paymentMethod === 'transfer' ? 'bg-blue-100 text-blue-800' : 
                          'bg-yellow-100 text-yellow-800'
                        }`}>
                          {reservation.paymentMethod === 'cash' ? 'Efectivo' : 
                           reservation.paymentMethod === 'transfer' ? 'Transferencia' : 
                           'Pendiente'}
                        </span>
                      </div>
                      <div className="text-sm mt-1">{reservation.name}</div>
                      <div className="text-xs text-gray-500 flex items-center mt-1">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                        </svg>
                        {reservation.phone}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-gray-500 italic p-3 bg-gray-50 rounded-lg border border-dashed border-gray-300 text-center">
                  No hay reservas próximas para esta cancha
                </div>
              )}
            </div>
            
            <div className="text-xs text-gray-500 mt-2">
              {lockHover ? "Información bloqueada por 30 segundos" : "Pase el cursor sobre una cancha para ver su información"}
            </div>
          </div>
        ) : (
          <div className="text-center py-10 text-gray-500">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-12 w-12 mx-auto mb-2 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <p>Seleccione una cancha para ver su información</p>
          </div>
        )}
      </div>
    </div>
  );
}