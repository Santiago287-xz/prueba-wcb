import { NextRequest, NextResponse } from "next/server";
import prisma from "@/app/libs/prismadb";
import { startOfWeek, endOfWeek, addDays, isBefore, isAfter, isSameDay, getDay, format } from "date-fns";

export async function GET(req: NextRequest) {
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

    const court = await prisma.court.findUnique({
      where: { id: courtId },
    });

    if (!court) {
      return NextResponse.json({ error: "Cancha no encontrada" }, { status: 404 });
    }

    let event = null;
    let isBlocked = false;
    
    try {
      if (prisma.event) {
        event = await prisma.event.findFirst({
          where: {
            courtType: court.type,
            date: { 
              gte: startDate,
              lte: endDate 
            },
          },
        });
        
        if (event && court.type === "futbol") {
          isBlocked = true;
          return NextResponse.json({ blocked: true, event }, { status: 200 });
        }
      }
    } catch (err) {
      // Manejo silencioso en producción
    }

    const allReservations = await prisma.courtReservation.findMany({
      where: {
        courtId: courtId,
        status: "confirmed",
      },
    });

    // Get non-recurring reservations for this week
    const nonRecurringRes = await prisma.courtReservation.findMany({
      where: {
        courtId: courtId,
        status: "confirmed",
        isRecurring: false,
        startTime: { gte: startDate },
        endTime: { lte: endDate },
      }
    });

    // Get recurring reservations that could impact this week
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
      }
    });

    // Generate virtual instances of recurring reservations for this week
    const processedRecurringRes = [];
    
    for (const res of recurringRes) {
      const originalStart = new Date(res.startTime);
      const originalEnd = new Date(res.endTime);
      const weekDay = getDay(originalStart);
      const startHour = originalStart.getHours();
      const startMinute = originalStart.getMinutes();
      const duration = originalEnd.getTime() - originalStart.getTime();
      
      // Find the matching day in the current week
      const weekDates = Array.from({length: 7}, (_, i) => {
        const date = addDays(startDate, i);
        return {
          date,
          dayOfWeek: getDay(date)
        };
      });
      
      const matchingDays = weekDates.filter(d => d.dayOfWeek === weekDay);
      
      for (const day of matchingDays) {
        // Check if this instance is valid (after start date and before recurrence end)
        if (isBefore(day.date, originalStart)) {
          continue;
        }
        
        if (res.recurrenceEnd && isAfter(day.date, res.recurrenceEnd)) {
          continue;
        }
        
        // Create an instance for this week
        const instanceStart = new Date(day.date);
        instanceStart.setHours(startHour, startMinute, 0, 0);
        
        const instanceEnd = new Date(instanceStart);
        instanceEnd.setTime(instanceStart.getTime() + duration);
        
        if (isAfter(instanceStart, startDate) && isBefore(instanceEnd, endDate)) {
          const virtualInstance = {
            ...res,
            startTime: instanceStart,
            endTime: instanceEnd,
            virtualId: `${res.id}-${format(instanceStart, 'yyyy-MM-dd')}`, // Add virtual ID for front-end
            isVirtualInstance: true,
            parentId: res.id // Reference to the original recurring reservation
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
        totalReservations: allReservations.length,
        weekRange: {
          start: startDate.toISOString(), 
          end: endDate.toISOString()
        }
      }, 
      { status: 200 }
    );
  } catch (error) {
    return NextResponse.json({ error: "Error interno del servidor" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  const body = await req.json();
  const {
    courtId,
    userId,
    guestName,
    guestPhone,
    startTime,
    endTime,
    paymentMethod,
    isRecurring,
    recurrenceEnd,
    paidSessions,
    paymentNotes
  } = body;

  try {
    if (!courtId || !startTime || !endTime) {
      return NextResponse.json({ error: "Faltan datos requeridos" }, { status: 400 });
    }

    const start = new Date(startTime);
    const end = new Date(endTime);
    const weekDay = getDay(start);
    const recurrenceEndDate = recurrenceEnd ? new Date(recurrenceEnd) : null;

    // Check for conflicts based on recurrence pattern
    if (isRecurring) {
      // For recurring reservations, check conflicts for all dates in the recurrence pattern
      const potentialConflicts = await prisma.courtReservation.findMany({
        where: {
          courtId,
          status: "confirmed"
        }
      });
      
      // Get all potential dates for this recurring reservation
      const datesInPattern = [];
      let currentDate = new Date(start);
      
      while (!recurrenceEndDate || isBefore(currentDate, recurrenceEndDate)) {
        datesInPattern.push(new Date(currentDate));
        currentDate = addDays(currentDate, 7); // Move to next week
      }
      
      // Check conflicts for each date in the pattern
      for (const date of datesInPattern) {
        const dateStart = new Date(date);
        dateStart.setHours(start.getHours(), start.getMinutes(), 0, 0);
        
        const dateEnd = new Date(date);
        dateEnd.setHours(end.getHours(), end.getMinutes(), 0, 0);
        
        for (const existingRes of potentialConflicts) {
          // Check conflicts with non-recurring reservations
          if (!existingRes.isRecurring) {
            const existingStart = new Date(existingRes.startTime);
            
            if (isSameDay(dateStart, existingStart) && 
                dateStart.getHours() === existingStart.getHours()) {
              return NextResponse.json({ 
                error: `Conflicto con una reserva existente el ${format(dateStart, 'dd/MM/yyyy')} a las ${format(dateStart, 'HH:mm')}` 
              }, { status: 409 });
            }
          } 
          // Check conflicts with recurring reservations
          else {
            const existingRecurStart = new Date(existingRes.startTime);
            const existingRecurringWeekDay = getDay(existingRecurStart);
            const existingRecurringHour = existingRecurStart.getHours();
            const existingRecurringEnd = existingRes.recurrenceEnd ? new Date(existingRes.recurrenceEnd) : null;
            
            // If same weekday and hour, check if the patterns overlap
            if (weekDay === existingRecurringWeekDay && 
                start.getHours() === existingRecurringHour) {
              
              // Check if the recurrence patterns overlap
              const patternsOverlap = (
                // If either has no end date, they overlap
                !recurrenceEndDate || 
                !existingRecurringEnd ||
                // Or if the end dates overlap
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
      // For non-recurring reservations, use simpler conflict check
      const overlappingReservation = await prisma.courtReservation.findFirst({
        where: {
          courtId,
          status: "confirmed",
          OR: [
            // Direct time overlap with non-recurring reservation
            {
              isRecurring: false,
              startTime: { lte: end },
              endTime: { gte: start }
            },
            // Overlap with a virtual instance of a recurring reservation
            {
              isRecurring: true,
              startTime: { lte: end },
              OR: [
                { recurrenceEnd: null },
                { recurrenceEnd: { gte: start } }
              ]
            }
          ]
        }
      });
      
      if (overlappingReservation) {
        // For recurring reservations, check if the specific day/hour conflicts
        if (overlappingReservation.isRecurring) {
          const recurStart = new Date(overlappingReservation.startTime);
          const recurWeekDay = getDay(recurStart);
          const recurHour = recurStart.getHours();
          
          // Only a conflict if same day of week and hour
          if (getDay(start) === recurWeekDay && start.getHours() === recurHour) {
            return NextResponse.json({ error: "El horario ya está reservado (conflicto con reserva recurrente)" }, { status: 409 });
          }
        } else {
          return NextResponse.json({ error: "El horario ya está reservado" }, { status: 409 });
        }
      }
    }

    // Create the reservation
    const reservation = await prisma.courtReservation.create({
      data: {
        court: { connect: { id: courtId } },
        ...(userId ? { user: { connect: { id: userId } } } : {}),
        guestName,
        guestPhone,
        startTime: start,
        endTime: end,
        paymentMethod: paymentMethod || "pending",
        isRecurring: isRecurring || false,
        ...(isRecurring && recurrenceEnd ? { recurrenceEnd: new Date(recurrenceEnd) } : {}),
        ...(isRecurring && paidSessions !== undefined ? { paidSessions } : {}),
        ...(paymentMethod !== "pending" ? { lastPaymentDate: new Date() } : {}),
        ...(paymentNotes ? { paymentNotes } : {})
      },
    });

    return NextResponse.json(reservation, { status: 201 });
  } catch (error) {
    return NextResponse.json({ error: "Error al crear la reserva" }, { status: 500 });
  }
}

export async function PUT(req: NextRequest) {
  const body = await req.json();
  const { reservationId, guestName, guestPhone, paidSessions, paymentMethod, paymentNotes } = body;

  try {
    if (!reservationId) {
      return NextResponse.json({ error: "Falta ID de reserva" }, { status: 400 });
    }

    const updatedReservation = await prisma.courtReservation.update({
      where: { id: reservationId },
      data: {
        ...(guestName !== undefined ? { guestName } : {}),
        ...(guestPhone !== undefined ? { guestPhone } : {}),
        ...(paidSessions !== undefined ? { paidSessions } : {}),
        ...(paymentMethod ? { paymentMethod } : {}),
        ...(paymentMethod !== "pending" ? { lastPaymentDate: new Date() } : {}),
        ...(paymentNotes !== undefined ? { paymentNotes } : {})
      },
    });

    return NextResponse.json(updatedReservation, { status: 200 });
  } catch (error) {
    return NextResponse.json({ error: "Error al actualizar la reserva" }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  const body = await req.json();
  const { reservationId, deleteEntireSeries } = body;

  try {
    if (!reservationId) {
      return NextResponse.json({ error: "Falta ID de reserva" }, { status: 400 });
    }

    // Check if this is a virtual instance or a real reservation
    if (reservationId.includes('-') && deleteEntireSeries) {
      // This is a virtual instance, extract the parent ID
      const parentId = reservationId.split('-')[0];
      
      await prisma.courtReservation.delete({
        where: { id: parentId },
      });
    } else if (deleteEntireSeries) {
      // Delete the entire recurring series directly
      await prisma.courtReservation.delete({
        where: { id: reservationId },
      });
    } else {
      // Just delete this specific reservation
      await prisma.courtReservation.delete({
        where: { id: reservationId },
      });
    }

    return NextResponse.json({ success: true }, { status: 200 });
  } catch (error) {
    return NextResponse.json({ error: "Error al eliminar la reserva" }, { status: 500 });
  }
}