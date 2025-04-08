// app/api/memberships/stats/route.ts
import { NextResponse } from "next/server";
import prisma from "@/app/libs/prismadb";

export async function GET() {
  try {
    // Obtener fecha actual para comparar membresías expiradas
    const now = new Date();
    
    // Contar todas las membresías (usuarios con RFID asignado)
    const total = await prisma.user.count({
      where: {
        rfidCardNumber: { not: null }
      }
    });
    
    // Contar membresías activas
    const active = await prisma.user.count({
      where: {
        rfidCardNumber: { not: null },
        membershipStatus: "active",
        membershipExpiry: { gt: now }
      }
    });
    
    // Contar membresías expiradas
    const expired = await prisma.user.count({
      where: {
        rfidCardNumber: { not: null },
        OR: [
          { membershipStatus: "expired" },
          { membershipExpiry: { lt: now } }
        ]
      }
    });
    
    return NextResponse.json({ total, active, expired });
  } catch (error) {
    console.error("Error al obtener estadísticas de membresías:", error);
    return NextResponse.json({ error: "Error al obtener estadísticas" }, { status: 500 });
  }
}