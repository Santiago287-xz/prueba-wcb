// app/api/transactions/[id]/route.ts
import { NextRequest, NextResponse } from "next/server";
import prisma from "@/app/libs/prismadb";

export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const transaction = await prisma.transaction.findUnique({
      where: { id: params.id }
    });

    if (!transaction) {
      return NextResponse.json({ error: "Transacción no encontrada" }, { status: 404 });
    }

    return NextResponse.json(transaction);
  } catch (error) {
    return NextResponse.json({ error: "Error al obtener la transacción" }, { status: 500 });
  }
}

export async function PUT(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const body = await req.json();
    const { type, category, amount, description, paymentMethod, location } = body;

    // Check if transaction exists
    const transaction = await prisma.transaction.findUnique({
      where: { id: params.id }
    });

    if (!transaction) {
      return NextResponse.json({ error: "Transacción no encontrada" }, { status: 404 });
    }

    // Update transaction
    const updatedTransaction = await prisma.transaction.update({
      where: { id: params.id },
      data: {
        type,
        category,
        amount,
        description,
        paymentMethod,
        location
      }
    });

    return NextResponse.json(updatedTransaction);
  } catch (error) {
    return NextResponse.json({ error: "Error al actualizar la transacción" }, { status: 500 });
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    // Check if transaction exists
    const transaction = await prisma.transaction.findUnique({
      where: { id: params.id }
    });

    if (!transaction) {
      return NextResponse.json({ error: "Transacción no encontrada" }, { status: 404 });
    }

    // Delete transaction
    await prisma.transaction.delete({
      where: { id: params.id }
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json({ error: "Error al eliminar la transacción" }, { status: 500 });
  }
}