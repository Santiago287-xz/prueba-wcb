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

    const nonRecurringRes = await prisma.courtReservation.findMany({
      where: {
        courtId: courtId,
        status: "confirmed",
        isRecurring: false,
        startTime: { gte: startDate },
        endTime: { lte: endDate },
      }
    });

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

    const processedRecurringRes = [];
    for (const res of recurringRes) {
      const resStart = new Date(res.startTime);
      const resDay = getDay(resStart);
      
      for (let i = 0; i < 7; i++) {
        const currentDay = addDays(startDate, i);
        
        if (getDay(currentDay) === resDay) {
          if (!res.recurrenceEnd || isAfter(res.recurrenceEnd, currentDay)) {
            if (!isBefore(currentDay, resStart)) {
              const startHour = resStart.getHours();
              const startMin = resStart.getMinutes();
              const endHour = new Date(res.endTime).getHours();
              const endMin = new Date(res.endTime).getMinutes();
              
              const weeklyStart = new Date(currentDay);
              weeklyStart.setHours(startHour, startMin, 0, 0);
              
              const weeklyEnd = new Date(currentDay);
              weeklyEnd.setHours(endHour, endMin, 0, 0);
              
              if (isAfter(weeklyStart, startDate) && isBefore(weeklyEnd, endDate)) {
                const weeklyInstance = {
                  ...res,
                  startTime: weeklyStart,
                  endTime: weeklyEnd
                };
                processedRecurringRes.push(weeklyInstance);
              }
            }
          }
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

    if (!isRecurring) {
      const overlappingReservation = await prisma.courtReservation.findFirst({
        where: {
          courtId,
          status: "confirmed",
          OR: [
            {
              startTime: { lte: end },
              endTime: { gte: start },
            },
          ],
        },
      });

      if (overlappingReservation) {
        return NextResponse.json({ error: "El horario ya está reservado" }, { status: 409 });
      }
    } else {
      const dayOfWeek = getDay(start);
      const recurrenceEndDate = recurrenceEnd ? new Date(recurrenceEnd) : null;
      
      const existingReservations = await prisma.courtReservation.findMany({
        where: {
          courtId,
          status: "confirmed",
        },
      });
      
      let currentDate = new Date(start);
      while (!recurrenceEndDate || isBefore(currentDate, recurrenceEndDate)) {
        for (const existing of existingReservations) {
          const existingStart = new Date(existing.startTime);
          
          if (existing.isRecurring) {
            const existingDay = getDay(existingStart);
            if (dayOfWeek === existingDay) {
              const existingEnd = existing.recurrenceEnd || new Date(2099, 11, 31);
              if (isBefore(currentDate, existingEnd)) {
                if (existingStart.getHours() === start.getHours()) {
                  return NextResponse.json(
                    { error: "Conflicto con una reserva recurrente existente" }, 
                    { status: 409 }
                  );
                }
              }
            }
          } 
          else if (
            isSameDay(currentDate, existingStart) && 
            existingStart.getHours() === start.getHours()
          ) {
            return NextResponse.json(
              { error: "Conflicto con una reserva existente" }, 
              { status: 409 }
            );
          }
        }
        
        currentDate = addDays(currentDate, 7);
      }
    }

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
  const { reservationId, paidSessions, paymentMethod, paymentNotes } = body;

  try {
    if (!reservationId) {
      return NextResponse.json({ error: "Falta ID de reserva" }, { status: 400 });
    }

    const updatedReservation = await prisma.courtReservation.update({
      where: { id: reservationId },
      data: {
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
  const { reservationId } = body;

  try {
    if (!reservationId) {
      return NextResponse.json({ error: "Falta ID de reserva" }, { status: 400 });
    }

    await prisma.courtReservation.delete({
      where: { id: reservationId },
    });

    return NextResponse.json({ success: true }, { status: 200 });
  } catch (error) {
    return NextResponse.json({ error: "Error al eliminar el recordatorio" }, { status: 500 });
  }
}