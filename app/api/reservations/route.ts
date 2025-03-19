import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { useSession } from "next-auth/react";
import { PrismaClient } from "@prisma/client";
import { parseISO, isValid, isBefore } from "date-fns";

const prisma = new PrismaClient();

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "No autenticado" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const startDate = searchParams.get("startDate");
  const endDate = searchParams.get("endDate");
  const courtId = searchParams.get("courtId");
  const userId = searchParams.get("userId");
  const status = searchParams.get("status");

  let where: any = {};

  if (startDate && endDate) {
    const parsedStart = parseISO(startDate);
    const parsedEnd = parseISO(endDate);
    if (!isValid(parsedStart) || !isValid(parsedEnd)) {
      return NextResponse.json({ error: "Fechas inválidas" }, { status: 400 });
    }

    where.OR = [
      {
        startTime: { gte: parsedStart, lte: parsedEnd },
      },
      {
        endTime: { gte: parsedStart, lte: parsedEnd },
      },
      {
        AND: [
          { startTime: { lte: parsedStart } },
          { endTime: { gte: parsedEnd } },
        ],
      },
    ];
  }

  if (courtId) where.courtId = courtId;
  if (userId) where.userId = userId;
  if (status) where.status = status;

  if (session.user.role !== "admin" && session.user.role !== "trainer") {
    where.userId = session.user.id;
  }

  try {
    const reservations = await prisma.courtReservation.findMany({
      where,
      include: {
        court: true,
        user: {
          select: { id: true, name: true, email: true, phone: true },
        },
      },
      orderBy: { startTime: "asc" },
    });

    return NextResponse.json(reservations);
  } catch (err) {
    console.error("Error al obtener reservas:", err);
    return NextResponse.json({ error: "Error al obtener reservas" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "No autenticado" }, { status: 401 });

  try {
    const { courtId, startTime, endTime, userId, notes, status } = await req.json();
    if (!courtId || !startTime || !endTime) {
      return NextResponse.json({ error: "Faltan datos requeridos (courtId, startTime, endTime)" }, { status: 400 });
    }

    const reservationUserId = userId || session.user.id;
    if (reservationUserId !== session.user.id && session.user.role !== "admin" && session.user.role !== "trainer") {
      return NextResponse.json({ error: "No tiene permisos para crear reservas para otros" }, { status: 403 });
    }

    const parsedStart = parseISO(startTime);
    const parsedEnd = parseISO(endTime);
    if (!isValid(parsedStart) || !isValid(parsedEnd) || isBefore(parsedEnd, parsedStart)) {
      return NextResponse.json({ error: "Fechas inválidas o incoherentes" }, { status: 400 });
    }

    const court = await prisma.court.findFirst({ where: { id: courtId, isActive: true } });
    if (!court) return NextResponse.json({ error: "Cancha no encontrada o inactiva" }, { status: 404 });

    const maintenanceConflict = await prisma.maintenanceSchedule.findFirst({
      where: {
        courtId,
        OR: [
          { startTime: { lte: parsedEnd }, endTime: { gte: parsedStart } },
        ],
      },
    });
    if (maintenanceConflict) {
      return NextResponse.json({ error: "Cancha en mantenimiento en ese horario" }, { status: 409 });
    }

    const existing = await prisma.courtReservation.findFirst({
      where: {
        courtId,
        status: { in: ["pending", "confirmed"] },
        OR: [
          { startTime: { lt: parsedEnd }, endTime: { gt: parsedStart } },
        ],
      },
    });
    if (existing) {
      return NextResponse.json({ error: "Conflicto con otra reserva" }, { status: 409 });
    }

    const newReservation = await prisma.courtReservation.create({
      data: {
        startTime: parsedStart,
        endTime: parsedEnd,
        status: status || "pending",
        notes,
        totalPrice: court.price,
        court: { connect: { id: courtId } },
        user: { connect: { id: reservationUserId } },
      },
      include: {
        court: true,
        user: { select: { id: true, name: true, email: true, phone: true } },
      },
    });

    await prisma.notification.create({
      data: {
        notification_text: `Tu reserva para ${court.name} el ${parsedStart.toLocaleDateString()} a las ${parsedStart.toLocaleTimeString()} ha sido confirmada.`,
        type: "message",
        pathName: `/reservations/${newReservation.id}`,
        user: { connect: { id: reservationUserId } },
        sender: { connect: { id: session.user.id } },
      },
    });

    return NextResponse.json(newReservation, { status: 201 });
  } catch (err) {
    console.error("Error al crear reserva:", err);
    return NextResponse.json({ error: "Error al crear la reserva" }, { status: 500 });
  }
}
