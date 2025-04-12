// app/api/rfid/stats/route.ts - Actualizado para sistema de puntos
import { NextResponse } from "next/server";
import prisma from "@/app/libs/prismadb";

export async function GET() {
  try {
    const totalMembers = await prisma.user.count({
      where: {
        rfidCardNumber: { not: null }
      }
    });
    const activeMembers = await prisma.user.count({
      where: {
        rfidCardNumber: { not: null },
        accessPoints: { gt: 0 }
      }
    });    
    const expiredMembers = await prisma.user.count({
      where: {
        rfidCardNumber: { not: null },
        accessPoints: { equals: 0 }
      }
    });
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);
    
    const todayAccesses = await prisma.accessLog.count({
      where: {
        timestamp: {
          gte: today,
          lt: tomorrow
        }
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