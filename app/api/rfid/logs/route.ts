// app/api/rfid/logs/route.ts
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
    const { searchParams } = new URL(req.url);
    const userId = searchParams.get('userId');
    const date = searchParams.get('date');
    const status = searchParams.get('status');
    const limit = parseInt(searchParams.get('limit') || '50');
    
    let where: any = {};
    
    if (userId) {
      where.userId = userId;
    }
    
    if (date) {
      const startDate = new Date(date);
      startDate.setHours(0, 0, 0, 0);
      
      const endDate = new Date(date);
      endDate.setHours(23, 59, 59, 999);
      
      where.timestamp = {
        gte: startDate,
        lte: endDate
      };
    }
    
    if (status) {
      where.status = status;
    }
    
    const logs = await prisma.accessLog.findMany({
      where,
      select: {
        id: true,
        userId: true,
        timestamp: true,
        status: true,
        reason: true,
        processedBy: true,
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            membershipType: true,
            membershipStatus: true
          }
        }
      },
      orderBy: {
        timestamp: 'desc'
      },
      take: limit
    });
    
    return NextResponse.json(logs, { status: 200 });
  } catch (error) {
    console.error("Error al obtener logs de acceso:", error);
    return NextResponse.json({ error: "Error interno del servidor" }, { status: 500 });
  }
}