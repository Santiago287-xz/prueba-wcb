import { NextRequest, NextResponse } from "next/server";
import prisma from "@/app/libs/prismadb";
import { getServerSession } from "next-auth";
import { options as authOptions } from "@/app/api/auth/[...nextauth]/options";
import { addMonths, isAfter } from "date-fns";

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  
  if (!session?.user?.id || !['admin', 'employee'].includes(session.user.role as string)) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  try {
    const { 
      userId, 
      membershipType, 
      months, 
      paymentMethod,
      amount
    } = await req.json();
    
    if (!userId || !membershipType || !months || !paymentMethod || !amount) {
      return NextResponse.json({ error: "Faltan datos requeridos" }, { status: 400 });
    }

    const user = await prisma.user.findUnique({
      where: { id: userId }
    });

    if (!user) {
      return NextResponse.json({ error: "Usuario no encontrado" }, { status: 404 });
    }

    // Calculate new expiry date
    const now = new Date();
    const currentExpiry = user.membershipExpiry ? new Date(user.membershipExpiry) : now;
    
    let newExpiryDate;
    if (isAfter(currentExpiry, now)) {
      newExpiryDate = addMonths(currentExpiry, months);
    } else {
      newExpiryDate = addMonths(now, months);
    }

    // Start a transaction
    const result = await prisma.$transaction(async (tx) => {
      const transaction = await tx.transaction.create({
        data: {
          type: 'income',
          category: 'membership',
          amount,
          description: `Renovación de membresía ${membershipType} por ${months} mes(es) para ${user.name}`,
          paymentMethod,
          userId,
        }
      });

      const updatedUser = await tx.user.update({
        where: { id: userId },
        data: {
          membershipType,
          membershipStatus: 'active',
          membershipExpiry: newExpiryDate
        }
      });

      return { transaction, user: updatedUser };
    });

    return NextResponse.json({ 
      message: "Membresía renovada correctamente",
      data: result
    }, { status: 200 });
  } catch (error) {
    console.error("Error al renovar membresía:", error);
    return NextResponse.json({ error: "Error interno del servidor" }, { status: 500 });
  }
}