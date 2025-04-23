// app/api/members/rfid/stats/route.ts - Updated for points-based system
import { NextResponse } from "next/server";
import prisma from "@/app/libs/prismadb";
import { getServerSession } from "next-auth";
import { options as authOptions } from "@/app/api/auth/[...nextauth]/options";

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id || !['admin', 'recepcionst'].includes(session.user.role as string)) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }
  try {
    const totalMembers = await prisma.user.count({
      where: {
        rfidCardNumber: { not: null }
      }
    });
    
    // Active members now have accessPoints > 0
    const activeMembers = await prisma.user.count({
      where: {
        rfidCardNumber: { not: null },
        accessPoints: { gt: 0 }
      }
    });    
    
    // Expired members now have accessPoints = 0
    const expiredMembers = await prisma.user.count({
      where: {
        rfidCardNumber: { not: null },
        accessPoints: { equals: 0 }
      }
    });
    
    // Today's accesses remain the same
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);
    
    const todayAccesses = await prisma.accessLog.count({
      where: {
        timestamp: {
          gte: today,
          lt: tomorrow
        },
        status: "allowed"
      }
    });
    
    return NextResponse.json({ 
      totalMembers, 
      activeMembers, 
      expiredMembers, 
      todayAccesses 
    });
  } catch (error) {
    console.error("Error al obtener estadísticas de RFID:", error);
    return NextResponse.json({ error: "Error interno del servidor" }, { status: 500 });
  }
}