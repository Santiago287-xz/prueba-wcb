// app/api/rfid/stats/route.ts
import { NextRequest, NextResponse } from "next/server";
import prisma from "@/app/libs/prismadb";
import { getServerSession } from "next-auth";
import { options as authOptions } from "@/app/api/auth/[...nextauth]/options";
import { MembershipStatsResponse } from "@/app/types/membership";

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions);
  
  if (!session?.user?.id || !['admin', 'employee'].includes(session.user.role as string)) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  try {
    // Get total members with RFID cards
    const totalMembers = await prisma.user.count({
      where: {
        role: "user",
        rfidCardNumber: { not: null }
      }
    });

    // Get active members
    const activeMembers = await prisma.user.count({
      where: {
        role: "user",
        rfidCardNumber: { not: null },
        membershipStatus: "active",
        membershipExpiry: { gte: new Date() }
      }
    });

    // Get expired members
    const expiredMembers = await prisma.user.count({
      where: {
        role: "user",
        rfidCardNumber: { not: null },
        OR: [
          { membershipStatus: "expired" },
          { 
            membershipExpiry: { lt: new Date() },
            membershipStatus: "active"
          }
        ]
      }
    });

    // Get today's accesses
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
    console.log(todayAccesses)

    const response: MembershipStatsResponse = {
      totalMembers,
      activeMembers,
      expiredMembers,
      todayAccesses
    };

    return NextResponse.json(response, { status: 200 });
  } catch (error) {
    console.error("Error al obtener estadísticas RFID:", error);
    return NextResponse.json({ error: "Error interno del servidor" }, { status: 500 });
  }
}