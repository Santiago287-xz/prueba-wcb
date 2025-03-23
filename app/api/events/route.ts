// app/api/events/route.ts
import { NextRequest, NextResponse } from "next/server";
import prisma from "@/app/libs/prismadb";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const {
      name,
      date,
      startTime,
      endTime,
      futbolCourtIds,
      padelCourtIds
    } = body;

    // Validación básica
    if (!name || !startTime || !endTime) {
      return NextResponse.json({ error: "Faltan datos requeridos" }, { status: 400 });
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

    // Validar que se haya seleccionado al menos una cancha
    const allCourtIds = [...(futbolCourtIds || []), ...(padelCourtIds || [])];
    if (allCourtIds.length === 0) {
      return NextResponse.json({ error: "Debe seleccionar al menos una cancha" }, { status: 400 });
    }

    // Verificar que las canchas existan
    const courts = await prisma.court.findMany({
      where: { id: { in: allCourtIds } }
    });
    
    if (courts.length !== allCourtIds.length) {
      return NextResponse.json({ error: "Una o más canchas seleccionadas no existen" }, { status: 400 });
    }

    // Verificar disponibilidad para cada cancha seleccionada
    for (const courtId of allCourtIds) {
      const overlappingReservations = await prisma.courtReservation.findFirst({
        where: {
          courtId,
          status: "confirmed",
          OR: [
            {
              startTime: { lte: end },
              endTime: { gte: start }
            }
          ]
        }
      });
      
      if (overlappingReservations) {
        const court = courts.find(c => c.id === courtId);
        return NextResponse.json({ 
          error: `La cancha ${court?.name} ya tiene reservas durante ese horario` 
        }, { status: 409 });
      }
    }

    // Crear un único evento con todos los IDs de canchas
    const eventDate = new Date(date);
    const event = await prisma.event.create({
      data: {
        name,
        date: eventDate,
        startTime: start,
        endTime: end,
        courtIds: allCourtIds  // Guardar todos los IDs de las canchas
      }
    });

    return NextResponse.json(event, { status: 201 });
  } catch (error) {
    console.error("Error al crear evento:", error);
    return NextResponse.json({ 
      error: "Error al crear el evento: " + (error instanceof Error ? error.message : "Error desconocido")
    }, { status: 500 });
  }
}

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const date = searchParams.get("date");
    
    const whereClause: any = {};
    
    if (date) {
      const startDate = new Date(date);
      const endDate = new Date(date);
      endDate.setHours(23, 59, 59, 999);
      
      whereClause.date = { 
        gte: startDate,
        lte: endDate 
      };
    }
    
    const events = await prisma.event.findMany({
      where: whereClause,
      orderBy: { date: 'asc' }
    });
    
    return NextResponse.json(events);
  } catch (error) {
    return NextResponse.json({ error: "Error al obtener eventos" }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const body = await req.json();
    const { eventId } = body;
    
    if (!eventId) {
      return NextResponse.json({ error: "Falta ID del evento" }, { status: 400 });
    }
    
    // Verificar si el evento existe
    const event = await prisma.event.findUnique({
      where: { id: eventId }
    });
    
    if (!event) {
      return NextResponse.json({ error: "Evento no encontrado" }, { status: 404 });
    }
    
    // Eliminar evento
    await prisma.event.delete({
      where: { id: eventId }
    });
    
    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json({ error: "Error al eliminar el evento" }, { status: 500 });
  }
}