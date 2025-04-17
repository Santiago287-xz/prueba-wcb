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
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');
    const status = searchParams.get('status');
    const page = parseInt(searchParams.get('page') || '0');
    const limit = parseInt(searchParams.get('limit') || '20');
    
    const skip = page * limit;
    
    let where: any = {};
    
    if (userId) {
      where.userId = userId;
    }
    
    if (startDate || endDate) {
      where.timestamp = {};
      
      if (startDate) {
        // Create date with time at beginning of day in local timezone
        const parsedStartDate = new Date(`${startDate}T00:00:00.000`);
        where.timestamp.gte = parsedStartDate;
      }
      
      if (endDate) {
        // Create date with time at end of day in local timezone and add 1 day
        const nextDay = new Date(`${endDate}T00:00:00.000`);
        nextDay.setDate(nextDay.getDate() + 1);
        where.timestamp.lt = nextDay; // Using lt instead of lte with nextDay
      }
    }
    
    if (status) {
      where.status = status;
    }
    
    // Get total count for pagination info
    const totalCount = await prisma.accessLog.count({ where });
    
    // Query logs with pagination
    const logs = await prisma.accessLog.findMany({
      where,
      select: {
        id: true,
        userId: true,
        timestamp: true,
        status: true,
        reason: true,
        // processedBy: true, // Removed to avoid MongoDB ObjectId serialization issues
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
      skip,
      take: limit
    });
    
    return NextResponse.json({
      logs,
      pagination: {
        page,
        limit,
        totalCount,
        totalPages: Math.ceil(totalCount / limit)
      }
    }, { status: 200 });
    
  } catch (error) {
    console.error("Error al obtener logs de acceso:", error);
    return NextResponse.json({ error: "Error interno del servidor" }, { status: 500 });
  }
}