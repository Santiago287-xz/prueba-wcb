import { NextRequest, NextResponse } from "next/server";
import prisma from "@/app/libs/prismadb";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const {
      reservationId,
      userId,
      paymentMethod,
      amount,
      description,
      paidSessions,
      paymentNotes
    } = body;

    // Validation
    if (!reservationId || !amount || !paymentMethod) {
      return NextResponse.json(
        { error: "Faltan datos requeridos" },
        { status: 400 }
      );
    }

    // Check if reservation exists
    const reservation = await prisma.courtReservation.findUnique({
      where: { id: reservationId },
      include: { court: true }
    });

    if (!reservation) {
      return NextResponse.json(
        { error: "Reserva no encontrada" },
        { status: 404 }
      );
    }

    // Create transaction
    const transaction = await prisma.transaction.create({
      data: {
        type: 'income',
        category: 'court_rental',
        amount,
        description: description || `Pago de reserva de cancha ${reservation.court.name}`,
        paymentMethod,
        reservation: { connect: { id: reservationId } },
        ...(userId ? { user: { connect: { id: userId } } } : {})
      }
    });

    // Update reservation payment info
    await prisma.courtReservation.update({
      where: { id: reservationId },
      data: {
        paymentMethod,
        lastPaymentDate: new Date(),
        ...(reservation.isRecurring && paidSessions ? { paidSessions } : {}),
        ...(paymentNotes ? { paymentNotes } : {})
      }
    });

    return NextResponse.json(transaction, { status: 201 });
  } catch (error) {
    console.error('Error:', error);
    return NextResponse.json(
      { error: "Error al crear la factura" },
      { status: 500 }
    );
  }
}