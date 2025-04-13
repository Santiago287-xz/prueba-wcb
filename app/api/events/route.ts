import { NextRequest, NextResponse } from "next/server";
import prisma from "@/app/libs/prismadb";
import { getServerSession } from "next-auth/next";
import { options as authOptions } from '../auth/[...nextauth]/options';
const extractMongoId = (id: string): string | null => {
  if (id.length === 24 && /^[0-9a-f]{24}$/i.test(id)) {
    return id;
  }

  if (id.startsWith('event-event-')) {
    const parts = id.split('-');
    if (parts.length >= 3) {
      return parts[2];
    }
  }
  
  if (id.startsWith('event-')) {
    const parts = id.split('-');
    if (parts.length >= 2) {
      return parts[1];
    }
  }

  return null;
};

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  
  if (!session?.user?.id) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }
  try {
    const body = await req.json();
    const { name, date, startTime, endTime, courtIds } = body;

    if (!name || !startTime || !endTime) {
      return NextResponse.json({ error: "Faltan datos requeridos" }, { status: 400 });
    }

    const start = new Date(startTime);
    const end = new Date(endTime);
    
    if (isNaN(start.getTime()) || isNaN(end.getTime())) {
      return NextResponse.json({ error: "Formato de fecha inválido" }, { status: 400 });
    }
    
    if (start >= end) {
      return NextResponse.json({ error: "La hora de inicio debe ser anterior a la hora de fin" }, { status: 400 });
    }

    if (!courtIds || !Array.isArray(courtIds) || courtIds.length === 0) {
      return NextResponse.json({ error: "Debe seleccionar al menos una cancha" }, { status: 400 });
    }

    const courts = await prisma.court.findMany({
      where: { id: { in: courtIds } }
    });
    
    if (courts.length !== courtIds.length) {
      return NextResponse.json({ error: "Una o más canchas seleccionadas no existen" }, { status: 400 });
    }

    for (const courtId of courtIds) {
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

    const eventDate = new Date(date);
    const event = await prisma.event.create({
      data: {
        name,
        date: eventDate,
        startTime: start,
        endTime: end,
        courtIds
      }
    });

    return NextResponse.json(event, { status: 201 });
  } catch (error) {
    return NextResponse.json({ 
      error: "Error al crear el evento: " + (error instanceof Error ? error.message : "Error desconocido")
    }, { status: 500 });
  }
}

export async function PUT(req: NextRequest) {
  const session = await getServerSession(authOptions);
  
  if (!session?.user?.id) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }
  try {
    const body = await req.json();
    const { id, name, date, startTime, endTime, courtIds } = body;
    
    if (!id) {
      return NextResponse.json({ error: "Falta ID del evento" }, { status: 400 });
    }
    
    const cleanId = extractMongoId(id);
    if (!cleanId) {
      return NextResponse.json({ 
        error: `ID inválido: ${id}` 
      }, { status: 400 });
    }
    
    if (!name || !startTime || !endTime) {
      return NextResponse.json({ error: "Faltan datos requeridos" }, { status: 400 });
    }
    
    const start = new Date(startTime);
    const end = new Date(endTime);
    
    if (isNaN(start.getTime()) || isNaN(end.getTime())) {
      return NextResponse.json({ error: "Formato de fecha inválido" }, { status: 400 });
    }
    
    if (start >= end) {
      return NextResponse.json({ error: "La hora de inicio debe ser anterior a la hora de fin" }, { status: 400 });
    }
    
    if (!courtIds || !Array.isArray(courtIds) || courtIds.length === 0) {
      return NextResponse.json({ error: "Debe seleccionar al menos una cancha" }, { status: 400 });
    }
    
    const existingEvent = await prisma.event.findUnique({
      where: { id: cleanId }
    });
    
    if (!existingEvent) {
      return NextResponse.json({ error: "Evento no encontrado" }, { status: 404 });
    }
    
    const courts = await prisma.court.findMany({
      where: { id: { in: courtIds } }
    });
    
    if (courts.length !== courtIds.length) {
      return NextResponse.json({ error: "Una o más canchas seleccionadas no existen" }, { status: 400 });
    }
    
    for (const courtId of courtIds) {
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
    
    const eventDate = new Date(date);
    const updatedEvent = await prisma.event.update({
      where: { id: cleanId },
      data: {
        name,
        date: eventDate,
        startTime: start,
        endTime: end,
        courtIds
      }
    });
    
    return NextResponse.json(updatedEvent);
  } catch (error) {
    return NextResponse.json({ 
      error: "Error al actualizar el evento: " + (error instanceof Error ? error.message : "Error desconocido")
    }, { status: 500 });
  }
}

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions);
  
  if (!session?.user?.id) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }
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
  const session = await getServerSession(authOptions);
  
  if (!session?.user?.id) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }
  try {
    const body = await req.json();
    const { eventId } = body;
    
    if (!eventId) {
      return NextResponse.json({ error: "Falta ID del evento" }, { status: 400 });
    }
    
    const cleanId = extractMongoId(eventId);
    if (!cleanId) {
      return NextResponse.json({ 
        error: `ID inválido: ${eventId}` 
      }, { status: 400 });
    }
    
    const event = await prisma.event.findUnique({
      where: { id: cleanId }
    });
    
    if (!event) {
      return NextResponse.json({ error: "Evento no encontrado" }, { status: 404 });
    }
    
    await prisma.event.delete({
      where: { id: cleanId }
    });
    
    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json({ error: "Error al eliminar el evento" }, { status: 500 });
  }
}