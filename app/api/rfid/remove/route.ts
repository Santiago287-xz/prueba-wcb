// app/api/rfid/remove/route.ts
import { NextRequest, NextResponse } from "next/server";
import prisma from "@/app/libs/prismadb";
import { getServerSession } from "next-auth";
import { options as authOptions } from "@/app/api/auth/[...nextauth]/options";

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  
  if (!session?.user?.id || !['admin', 'employee'].includes(session.user.role as string)) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  try {
    const { userId } = await req.json() as { userId: string };
    
    if (!userId) {
      return NextResponse.json({ error: "ID de usuario requerido" }, { status: 400 });
    }

    // Check if user exists
    const user = await prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      return NextResponse.json({ error: "Usuario no encontrado" }, { status: 404 });
    }

    // Remove RFID card information
    await prisma.user.update({
      where: { id: userId },
      data: {
        rfidCardNumber: null,
        rfidAssignedAt: null,
      }
    });

    return NextResponse.json({ 
      message: "Tarjeta RFID eliminada correctamente"
    }, { status: 200 });
  } catch (error) {
    console.error("Error al eliminar tarjeta RFID:", error);
    return NextResponse.json({ error: "Error interno del servidor" }, { status: 500 });
  }
}