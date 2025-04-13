// app/api/members/route.ts - API to get only members with RFID cards
import { NextRequest, NextResponse } from "next/server";
import prisma from "@/app/libs/prismadb";
import { getServerSession } from "next-auth";
import { options as authOptions } from "@/app/api/auth/[...nextauth]/options";

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions);
  
  if (!session?.user?.id || !['admin', 'employee'].includes(session.user.role as string)) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  try {
    // Get all users with RFID cards
    const members = await prisma.user.findMany({
      where: {
        rfidCardNumber: { not: null }
      },
      orderBy: {
        name: 'asc'
      }
    });
    
    return NextResponse.json({ members }, { status: 200 });
  } catch (error) {
    console.error("Error al obtener miembros:", error);
    return NextResponse.json({ error: "Error interno del servidor" }, { status: 500 });
  }
}