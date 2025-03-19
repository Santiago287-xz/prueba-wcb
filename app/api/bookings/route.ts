import { NextRequest, NextResponse } from "next/server";
import prisma from "@/app/libs/prismadb"; // Correcto según tu estructura
import { getServerSession } from "next-auth";
import { options as authOptions } from "@/app/api/auth/[...nextauth]/options"; // Ajustado para importar desde options.ts

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const date = searchParams.get("date");
  const courtType = searchParams.get("courtType");

  if (!date || !courtType) {
    return NextResponse.json({ error: "Faltan parámetros" }, { status: 400 });
  }

  const startOfDay = new Date(`${date}T00:00:00Z`);
  const endOfDay = new Date(`${date}T23:59:59Z`);

  const courts = await prisma.court.findMany({
    where: { type: courtType },
    include: {
      reservations: {
        where: {
          startTime: { gte: startOfDay },
          endTime: { lte: endOfDay },
          status: "confirmed",
        },
      },
    },
  });

  return NextResponse.json(courts);
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  const { courtId, startTime, endTime } = await req.json();

  const conflictingReservation = await prisma.courtReservation.findFirst({
    where: {
      courtId,
      status: "confirmed",
      OR: [
        {
          startTime: { lte: new Date(endTime) },
          endTime: { gte: new Date(startTime) },
        },
      ],
    },
  });

  if (conflictingReservation) {
    return NextResponse.json(
      { error: "El horario no está disponible" },
      { status: 409 }
    );
  }

  const reservation = await prisma.courtReservation.create({
    data: {
      courtId,
      userId: session.user.id, // El id ya está disponible gracias a tus callbacks
      startTime: new Date(startTime),
      endTime: new Date(endTime),
    },
  });

  return NextResponse.json(reservation, { status: 201 });
}