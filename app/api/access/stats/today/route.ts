// app/api/access/stats/today/route.ts
import { NextResponse } from "next/server";
import prisma from "@/app/libs/prismadb";

export async function GET() {
  try {
    // Crear fechas para el inicio y fin del día actual
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);
    
    // Contar accesos permitidos de hoy
    const count = await prisma.accessLog.count({
      where: {
        timestamp: {
          gte: today,
          lt: tomorrow
        },
        status: "allowed"
      }
    });
    
    return NextResponse.json({ count });
  } catch (error) {
    console.error("Error al obtener estadísticas de acceso:", error);
    return NextResponse.json({ error: "Error al obtener estadísticas" }, { status: 500 });
  }
}