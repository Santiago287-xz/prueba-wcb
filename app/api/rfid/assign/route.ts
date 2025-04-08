// app/api/rfid/assign/route.ts
import { NextRequest, NextResponse } from "next/server";
import prisma from "@/app/libs/prismadb";
import { getServerSession } from "next-auth";
import { options as authOptions } from "@/app/api/auth/[...nextauth]/options";
import { MembershipData } from "@/app/types/membership";

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  
  if (!session?.user?.id || !['admin', 'employee'].includes(session.user.role as string)) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  try {
    const { userId, rfidCardNumber, membershipType, membershipExpiry } = await req.json() as {
      userId: string;
      rfidCardNumber: string;
      membershipType?: string;
      membershipExpiry?: string;
    };
    
    if (!userId || !rfidCardNumber) {
      return NextResponse.json({ error: "Usuario y número de tarjeta RFID son requeridos" }, { status: 400 });
    }

    // Check if the RFID card is already assigned to another user
    const existingCard = await prisma.user.findFirst({
      where: { 
        rfidCardNumber,
        id: { not: userId }
      }
    });

    if (existingCard) {
      return NextResponse.json({ error: "Esta tarjeta RFID ya está asignada a otro usuario" }, { status: 400 });
    }

    // Update user with RFID information
    const updateData: MembershipData & { isActive: boolean } = { 
      rfidCardNumber,
      rfidAssignedAt: new Date(),
      membershipType: membershipType || 'standard',
      membershipExpiry: membershipExpiry ? new Date(membershipExpiry) : null,
      membershipStatus: "active",
      isActive: true
    };

    const user = await prisma.user.update({
      where: { id: userId },
      data: updateData
    });

    return NextResponse.json({ 
      message: "Tarjeta RFID asignada correctamente", 
      user 
    }, { status: 200 });
  } catch (error) {
    console.error("Error al asignar tarjeta RFID:", error);
    return NextResponse.json({ error: "Error interno del servidor" }, { status: 500 });
  }
}