import { NextRequest, NextResponse } from "next/server";
import prisma from "@/app/libs/prismadb";
import { getServerSession } from "next-auth";
import { options as authOptions } from "@/app/api/auth/[...nextauth]/options";

// POST: Crear un evento (bloquea canchas de fútbol)
export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id || session.user.role !== "admin") {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  const { name, date } = await req.json();

  const startOfDay = new Date(date);
  startOfDay.setHours(0, 0, 0, 0);
  const endOfDay = new Date(date);
  endOfDay.setHours(23, 59, 59, 999);

  // Verificar si ya hay un evento en esa fecha
  const existingEvent = await prisma.event.findFirst({
    where: {
      courtType: "futbol",
      date: { gte: startOfDay, lte: endOfDay },
    },
  });

  if (existingEvent) {
    return NextResponse.json(
      { error: "Ya existe un evento en esa fecha" },
      { status: 409 }
    );
  }

  // Crear el evento (bloquea de 12:00 a 17:00)
  const event = await prisma.event.create({
    data: {
      name,
      courtType: "futbol",
      date: new Date(date),
      startTime: new Date(`${date}T12:00:00Z`),
      endTime: new Date(`${date}T17:00:00Z`),
    },
  });

  return NextResponse.json(event, { status: 201 });
}