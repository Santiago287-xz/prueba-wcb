import { NextRequest, NextResponse } from "next/server";
import prisma from "@/app/libs/prismadb";
import { addDays, isBefore, isAfter, isSameDay, getDay, format } from "date-fns";
import { getServerSession } from "next-auth/next";
import { options } from '../auth/[...nextauth]/options';
// Función para optimizar las consultas de reservas
async function getReservationsEfficiently(courtId: string, startDate: Date, endDate: Date): Promise<{
  nonRecurringRes: any[];
  recurringRes: any[];
}> {
  const session = await getServerSession(options);
  
  if (!session?.user?.id || !['admin', 'court_manager', 'receptionist'].includes(session.user.role as string)) {
    throw new Error("No autorizado");
  }
  const nonRecurringRes = await prisma.courtReservation.findMany({
    where: {
      courtId: courtId,
      status: "confirmed",
      isRecurring: false,
      OR: [
        {
          // Hora de inicio dentro del rango
          startTime: { gte: startDate, lte: endDate },
        },
        {
          // Hora de fin dentro del rango
          endTime: { gte: startDate, lte: endDate },
        },
        {
          // Reserva que abarca todo el rango
          AND: [
            { startTime: { lt: startDate } },
            { endTime: { gt: endDate } }
          ]
        }
      ]
    },
    select: {
      id: true,
      courtId: true,
      name: true,
      phone: true,
      startTime: true,
      endTime: true,
      status: true,
      paymentMethod: true,
      isRecurring: true,
      recurrenceEnd: true,
      paidSessions: true,
      lastPaymentDate: true,
      paymentNotes: true
    }
  });

  // Obtener reservas recurrentes que podrían impactar esta semana
  const recurringRes = await prisma.courtReservation.findMany({
    where: {
      courtId: courtId,
      status: "confirmed",
      isRecurring: true,
      startTime: { lte: endDate },
      OR: [
        { recurrenceEnd: null },
        { recurrenceEnd: { gte: startDate } }
      ]
    },
    select: {
      id: true,
      courtId: true,
      name: true,
      phone: true,
      startTime: true,
      endTime: true,
      status: true,
      paymentMethod: true,
      isRecurring: true,
      recurrenceEnd: true,
      paidSessions: true,
      lastPaymentDate: true,
      paymentNotes: true
    }
  });

  return { nonRecurringRes, recurringRes };
}

export async function GET(req: NextRequest) {
  const session = await getServerSession(options);
  
  if (!session?.user?.id || !['admin', 'court_manager', 'receptionist'].includes(session.user.role as string)) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }
  const { searchParams } = new URL(req.url);
  const weekStart = searchParams.get("weekStart");
  const weekEnd = searchParams.get("weekEnd");
  const courtId = searchParams.get("courtId");

  if (!weekStart || !weekEnd || !courtId) {
    return NextResponse.json({ error: "Faltan parámetros" }, { status: 400 });
  }

  try {
    const startDate = new Date(weekStart);
    const endDate = new Date(weekEnd);
    endDate.setHours(23, 59, 59, 999);
    endDate.setDate(endDate.getDate() + 1);

    // Actualizar estado de reservas completadas en una sola consulta
    const today = new Date();
    await prisma.courtReservation.updateMany({
      where: {
        isRecurring: false,
        endTime: { lt: today },
        status: "confirmed"
      },
      data: {
        status: "completed"
      }
    });

    // Obtener información de la cancha
    const court = await prisma.court.findUnique({
      where: { id: courtId },
      select: {
        id: true,
        name: true,
        type: true
      }
    });

    if (!court) {
      return NextResponse.json({ error: "Cancha no encontrada" }, { status: 404 });
    }

    // Verificar eventos
    let event = null;
    let isBlocked = false;
    
    try {
      if (prisma.event) {
        event = await prisma.event.findFirst({
          where: {
            courtIds: { has: courtId },  // Verificar si el ID de la cancha está en la lista
            date: { 
              gte: startDate,
              lte: endDate 
            },
          },
          select: {
            id: true,
            name: true,
            courtIds: true,  // Incluir courtIds en lugar de courtType
            date: true,
            startTime: true,
            endTime: true
          }
        });
        
        if (event) {
          isBlocked = true;
          return NextResponse.json({ blocked: true, event }, { 
            status: 200,
            headers: {
              'Cache-Control': 'no-store, must-revalidate',
              'Pragma': 'no-cache',
              'Expires': '0'
            }
          });
        }
      }
    } catch (err) {
      // Manejo silencioso en producción
    }

    // Obtener conteo total de reservas (solo ID para rendimiento)
    const totalReservations = await prisma.courtReservation.count({
      where: {
        courtId: courtId,
        status: "confirmed",
      }
    });

    // Obtener reservas eficientemente
    let nonRecurringRes = [];
    let recurringRes = [];

    try {
      const result = await getReservationsEfficiently(courtId, startDate, endDate);
      nonRecurringRes = result.nonRecurringRes;
      recurringRes = result.recurringRes;
    } catch (err) {
      if (err instanceof Error && err.message === "No autorizado") {
        return NextResponse.json({ error: "No autorizado" }, { status: 401 });
      }
      throw err; // Re-throw other errors
    }

    // Generar instancias virtuales de reservas recurrentes para esta semana
    const processedRecurringRes = [];
    
    for (const res of recurringRes) {
      const originalStart = new Date(res.startTime);
      const originalEnd = new Date(res.endTime);
      const weekDay = getDay(originalStart);
      const startHour = originalStart.getHours();
      const startMinute = originalStart.getMinutes();
      const duration = originalEnd.getTime() - originalStart.getTime();
      
      // Encontrar el día correspondiente en la semana actual
      const weekDates = Array.from({length: 7}, (_, i) => {
        const date = addDays(startDate, i);
        return {
          date,
          dayOfWeek: getDay(date)
        };
      });
      
      const matchingDays = weekDates.filter(d => d.dayOfWeek === weekDay);
      
      for (const day of matchingDays) {
        // Verificar si esta instancia es válida
        if (isBefore(day.date, originalStart)) {
          continue;
        }
        
        if (res.recurrenceEnd && isAfter(day.date, res.recurrenceEnd)) {
          continue;
        }
        
        // Crear una instancia para esta semana
        const instanceStart = new Date(day.date);
        instanceStart.setHours(startHour, startMinute, 0, 0);
        
        const instanceEnd = new Date(instanceStart);
        instanceEnd.setTime(instanceStart.getTime() + duration);
        
        if (!(isAfter(instanceStart, endDate) || isBefore(instanceEnd, startDate))) {
          const virtualInstance = {
            ...res,
            startTime: instanceStart,
            endTime: instanceEnd,
            virtualId: `${res.id}-${format(instanceStart, 'yyyy-MM-dd')}`,
            isVirtualInstance: true,
            parentId: res.id
          };
          
          processedRecurringRes.push(virtualInstance);
        }
      }
    }

    const combinedReservations = [...nonRecurringRes, ...processedRecurringRes];
    
    const courtWithReservations = {
      ...court,
      reservations: combinedReservations,
    };

    return NextResponse.json(
      { 
        blocked: isBlocked, 
        court: courtWithReservations, 
        event,
        totalReservations: totalReservations,
        weekRange: {
          start: startDate.toISOString(), 
          end: endDate.toISOString()
        }
      }, 
      { 
        status: 200,
        headers: {
          'Cache-Control': 'no-store, must-revalidate',
          'Pragma': 'no-cache',
          'Expires': '0'
        }
      }
    );
  } catch (error) {
    return NextResponse.json({ error: "Error interno del servidor" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(options);
  
  if (!session?.user?.id || !['admin', 'court_manager', 'receptionist'].includes(session.user.role as string)) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }
  const body = await req.json();
  
  const {
    courtId,
    name,
    phone,
    startTime,
    endTime,
    paymentMethod,
    isRecurring,
    recurrenceEnd,
    paidSessions,
    paymentNotes
  } = body;

  try {
    // Validaciones básicas de datos
    if (!courtId || !startTime || !endTime) {
      return NextResponse.json({ error: "Faltan datos requeridos" }, { status: 400 });
    }

    if (!name || name.trim() === '') {
      return NextResponse.json({ error: "El nombre es obligatorio" }, { status: 400 });
    }

    if (!phone || phone.trim() === '') {
      return NextResponse.json({ error: "El teléfono es obligatorio" }, { status: 400 });
    }

    if (name.length < 3 || name.length > 50) {
      return NextResponse.json({ error: "El nombre debe tener entre 3 y 50 caracteres" }, { status: 400 });
    }

    if (phone.length < 3 || phone.length > 20) {
      return NextResponse.json({ error: "El teléfono debe tener entre 3 y 20 caracteres" }, { status: 400 });
    }

    // Validar fechas
    const start = new Date(startTime);
    const end = new Date(endTime);
    
    if (isNaN(start.getTime()) || isNaN(end.getTime())) {
      return NextResponse.json({ error: "Formato de fecha inválido" }, { status: 400 });
    }
    
    if (start >= end) {
      return NextResponse.json({ error: "La hora de inicio debe ser anterior a la hora de fin" }, { status: 400 });
    }

    const weekDay = getDay(start);
    const recurrenceEndDate = recurrenceEnd ? new Date(recurrenceEnd) : null;

    if (isRecurring && recurrenceEnd) {
      const recurrenceEndDateTime = new Date(recurrenceEnd);
      if (isNaN(recurrenceEndDateTime.getTime()) || recurrenceEndDateTime <= start) {
        return NextResponse.json({ 
          error: "La fecha de finalización de la reserva recurrente debe ser posterior a la fecha de inicio" 
        }, { status: 400 });
      }
    }

    // Verificar conflictos basados en el patrón de recurrencia
    if (isRecurring) {
      // Optimizar la búsqueda de conflictos para reservas recurrentes
      const potentialConflicts = await prisma.courtReservation.findMany({
        where: {
          courtId,
          status: "confirmed"
        },
        select: {
          id: true,
          isRecurring: true,
          startTime: true,
          endTime: true,
          recurrenceEnd: true
        }
      });
      
      // Obtener todas las fechas potenciales para esta reserva recurrente
      const datesInPattern = [];
      let currentDate = new Date(start);
      const maxIterations = 52; // Limitar a un año para evitar bucles infinitos
      let iterations = 0;
      
      while ((!recurrenceEndDate || isBefore(currentDate, recurrenceEndDate)) && iterations < maxIterations) {
        datesInPattern.push(new Date(currentDate));
        currentDate = addDays(currentDate, 7); // Avanzar a la siguiente semana
        iterations++;
      }
      
      // Verificar conflictos para cada fecha en el patrón
      for (const date of datesInPattern) {
        const dateStart = new Date(date);
        dateStart.setHours(start.getHours(), start.getMinutes(), 0, 0);
        
        const dateEnd = new Date(date);
        dateEnd.setHours(end.getHours(), end.getMinutes(), 0, 0);
        
        for (const existingRes of potentialConflicts) {
          // Verificar conflictos con reservas no recurrentes
          if (!existingRes.isRecurring) {
            const existingStart = new Date(existingRes.startTime);
            
            if (isSameDay(dateStart, existingStart) && 
                dateStart.getHours() === existingStart.getHours()) {
              return NextResponse.json({ 
                error: `Conflicto con una reserva existente el ${format(dateStart, 'dd/MM/yyyy')} a las ${format(dateStart, 'HH:mm')}` 
              }, { status: 409 });
            }
          } 
          // Verificar conflictos con reservas recurrentes
          else {
            const existingRecurStart = new Date(existingRes.startTime);
            const existingRecurringWeekDay = getDay(existingRecurStart);
            const existingRecurringHour = existingRecurStart.getHours();
            const existingRecurringEnd = existingRes.recurrenceEnd ? new Date(existingRes.recurrenceEnd) : null;
            
            // Si mismo día de la semana y hora, verificar si los patrones se superponen
            if (weekDay === existingRecurringWeekDay && 
                start.getHours() === existingRecurringHour) {
              
              // Verificar si los patrones de recurrencia se superponen
              const patternsOverlap = (
                // Si alguno no tiene fecha de finalización, se superponen
                !recurrenceEndDate || 
                !existingRecurringEnd ||
                // O si las fechas finales se superponen
                (recurrenceEndDate && existingRecurringEnd && 
                 (isBefore(start, existingRecurringEnd) && 
                  (!recurrenceEndDate || isBefore(existingRecurStart, recurrenceEndDate))))
              );
              
              if (patternsOverlap) {
                return NextResponse.json({ 
                  error: "Conflicto con una reserva recurrente existente en el mismo día y hora" 
                }, { status: 409 });
              }
            }
          }
        }
      }
    } else {
      const overlappingReservation = await prisma.courtReservation.findFirst({
        where: {
          courtId,
          status: "confirmed",
          OR: [
            {
              isRecurring: false,
              startTime: { lt: end },
              endTime: { gt: start }
            },
            {
              isRecurring: true,
              startTime: { lt: end },
              OR: [
                { recurrenceEnd: null },
                { recurrenceEnd: { gte: start } }
              ]
            }
          ]
        },
        select: {
          id: true,
          isRecurring: true,
          startTime: true
        }
      });
      
      if (overlappingReservation) {
        // Para reservas recurrentes, verificar si el día/hora específico tiene conflictos
        if (overlappingReservation.isRecurring) {
          const recurStart = new Date(overlappingReservation.startTime);
          const recurWeekDay = getDay(recurStart);
          const recurHour = recurStart.getHours();
          
          // Solo hay conflicto si es el mismo día de la semana y hora
          if (getDay(start) === recurWeekDay && start.getHours() === recurHour) {
            return NextResponse.json({ error: "El horario ya está reservado (conflicto con reserva recurrente)" }, { status: 409 });
          }
        } else {
          return NextResponse.json({ error: "El horario ya está reservado" }, { status: 409 });
        }
      }
    }

    // Crear la reserva
    const createData = {
      court: { connect: { id: courtId } },
      name,
      phone,
      startTime: start,
      endTime: end,
      paymentMethod: paymentMethod || "pending",
      isRecurring: isRecurring || false,
      ...(isRecurring && recurrenceEnd ? { recurrenceEnd: new Date(recurrenceEnd) } : {}),
      ...(isRecurring && paidSessions !== undefined ? { paidSessions } : {}),
      ...(paymentMethod !== "pending" ? { lastPaymentDate: new Date() } : {}),
      ...(paymentNotes ? { paymentNotes } : {})
    };
    
    const reservation = await prisma.courtReservation.create({
      data: createData,
    });

    return NextResponse.json(reservation, { status: 201 });
  } catch (error) {
    return NextResponse.json({ 
      error: "Error al crear la reserva: " + (error instanceof Error ? error.message : "Error desconocido")
    }, { status: 500 });
  }
}

export async function PUT(req: NextRequest) {
  const session = await getServerSession(options);
  
  if (!session?.user?.id || !['admin', 'court_manager', 'receptionist'].includes(session.user.role as string)) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }
  try {
    const body = await req.json();
    
    const { 
      reservationId, 
      startTime, 
      endTime, 
      name, 
      phone, 
      courtId,
      paidSessions, 
      paymentMethod, 
      paymentNotes,
      isRecurring,
      recurrenceEnd
    } = body;

    if (!reservationId) {
      return NextResponse.json({ error: "Falta ID de reserva" }, { status: 400 });
    }

    // Validar datos si están presentes
    if (name !== undefined) {
      if (name.trim() === '') {
        return NextResponse.json({ error: "El nombre no puede estar vacío" }, { status: 400 });
      }
      if (name.length < 3 || name.length > 50) {
        return NextResponse.json({ error: "El nombre debe tener entre 3 y 50 caracteres" }, { status: 400 });
      }
    }

    if (phone !== undefined) {
      if (phone.trim() === '') {
        return NextResponse.json({ error: "El teléfono no puede estar vacío" }, { status: 400 });
      }
      if (phone.length < 3 || phone.length > 20) {
        return NextResponse.json({ error: "El teléfono debe tener entre 3 y 20 caracteres" }, { status: 400 });
      }
    }

    // Verificar si la reserva existe antes de intentar actualizarla
    const existingReservation = await prisma.courtReservation.findUnique({
      where: { id: reservationId },
      select: { 
        id: true,
        startTime: true,
        endTime: true,
        courtId: true
      }
    });
    
    if (!existingReservation) {
      return NextResponse.json({ error: "Reserva no encontrada" }, { status: 404 });
    }

    // Verificar conflictos si se cambia la fecha/hora o cancha
    if ((startTime && endTime) || courtId) {
      const newStartTime = startTime ? new Date(startTime) : new Date(existingReservation.startTime);
      const newEndTime = endTime ? new Date(endTime) : new Date(existingReservation.endTime);
      const newCourtId = courtId || existingReservation.courtId;
      
      // No verificar conflicto consigo mismo
      const conflictingReservation = await prisma.courtReservation.findFirst({
        where: {
          id: { not: reservationId },
          courtId: newCourtId,
          status: "confirmed",
          OR: [
            {
              isRecurring: false,
              startTime: { lt: newEndTime },
              endTime: { gt: newStartTime }
            }
          ]
        }
      });
      
      if (conflictingReservation) {
        return NextResponse.json({ error: "El nuevo horario ya está reservado" }, { status: 409 });
      }
    }

    // Construir el objeto data para la actualización (solo campos necesarios)
    const updateData: any = {};
    
    if (startTime !== undefined) updateData.startTime = new Date(startTime);
    if (endTime !== undefined) updateData.endTime = new Date(endTime);
    if (name !== undefined) updateData.name = name;
    if (phone !== undefined) updateData.phone = phone;
    if (courtId !== undefined) updateData.court = { connect: { id: courtId } };
    if (paidSessions !== undefined) updateData.paidSessions = paidSessions;
    if (paymentMethod !== undefined) updateData.paymentMethod = paymentMethod;
    if (paymentMethod !== undefined && paymentMethod !== "pending") updateData.lastPaymentDate = new Date();
    if (paymentNotes !== undefined) updateData.paymentNotes = paymentNotes;
    if (isRecurring !== undefined) updateData.isRecurring = isRecurring;
    if (recurrenceEnd !== undefined) updateData.recurrenceEnd = new Date(recurrenceEnd);
    
    // Actualizar la reserva
    const updatedReservation = await prisma.courtReservation.update({
      where: { id: reservationId },
      data: updateData
    });
    
    return NextResponse.json(updatedReservation, { status: 200 });
  } catch (error) {
    return NextResponse.json({ 
      error: "Error al actualizar la reserva", 
      details: error instanceof Error ? error.message : "Error desconocido"
    }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  const session = await getServerSession(options);
  
  if (!session?.user?.id || !['admin', 'court_manager', 'receptionist'].includes(session.user.role as string)) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }
  try {
    const body = await req.json();
    
    const { reservationId, deleteEntireSeries } = body;

    if (!reservationId) {
      return NextResponse.json({ error: "Falta ID de reserva" }, { status: 400 });
    }

    // Verificar si la reserva existe para IDs normales
    if (!reservationId.includes('-')) {
      const existingReservation = await prisma.courtReservation.findUnique({
        where: { id: reservationId },
        select: { id: true }
      });
      
      if (!existingReservation) {
        return NextResponse.json({ error: "Reserva no encontrada" }, { status: 404 });
      }
    }

    // Comprobar si es una instancia virtual o una reserva real
    if (reservationId.includes('-') && deleteEntireSeries) {
      // Es una instancia virtual, extraer el ID padre
      const parentId = reservationId.split('-')[0];
      
      // Verificar si la reserva padre existe
      const existingParent = await prisma.courtReservation.findUnique({
        where: { id: parentId },
        select: { id: true }
      });
      
      if (!existingParent) {
        return NextResponse.json({ error: "Reserva padre no encontrada" }, { status: 404 });
      }
      
      await prisma.courtReservation.delete({
        where: { id: parentId },
      });
    } else if (deleteEntireSeries) {
      // Eliminar toda la serie recurrente directamente
      await prisma.courtReservation.delete({
        where: { id: reservationId },
      });
    } else {
      // Solo eliminar esta reserva específica
      await prisma.courtReservation.delete({
        where: { id: reservationId },
      });
    }

    return NextResponse.json({ success: true }, { status: 200 });
  } catch (error) {
    return NextResponse.json({ 
      error: "Error al eliminar la reserva",
      details: error instanceof Error ? error.message : "Error desconocido"
    }, { status: 500 });
  }
}