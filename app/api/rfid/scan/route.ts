// app/api/rfid/scan/route.ts
import { NextRequest, NextResponse } from "next/server";
import prisma from "@/app/libs/prismadb";
import { getServerSession } from "next-auth";
import { options as authOptions } from "@/app/api/auth/[...nextauth]/options";
import { AccessLogData, RFIDEventPayload, RFIDScanResponse } from "@/app/types/membership";
import { broadcastEvent } from "@/app/libs/broadcast";

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  
  if (!session?.user?.id) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  try {
    const { rfidCardNumber } = await req.json() as { rfidCardNumber: string };
    
    if (!rfidCardNumber) {
      return NextResponse.json({ error: "Número de tarjeta RFID requerido" }, { status: 400 });
    }

    // Find user with this RFID card
    const user = await prisma.user.findFirst({
      where: { rfidCardNumber }
    });

    if (!user) {
      // Log the unregistered card
      const accessLog = await prisma.accessLog.create({
        data: {
          userId: session.user.id, // Using the current user's ID as a fallback
          status: "denied",
          reason: "Tarjeta no registrada",
          processedBy: session.user.id
        }
      });

      broadcastEvent({
        type: 'denied',
        message: 'Tarjeta RFID no registrada',
        cardNumber: rfidCardNumber
      });

      const response: RFIDScanResponse = {
        status: "denied", 
        message: "Tarjeta RFID no registrada",
        accessLog
      };

      return NextResponse.json(response, { status: 200 });
    }

    // Check membership status
    const now = new Date();
    let accessStatus: 'allowed' | 'denied' | 'warning' = "allowed";
    let reason: string | null = null;

    // Check if membership is expired
    if (user.membershipExpiry && new Date(user.membershipExpiry) < now) {
      accessStatus = "warning";
      reason = "Membresía expirada";
      
      // Update membership status
      await prisma.user.update({
        where: { id: user.id },
        data: { membershipStatus: "expired" }
      });
    }
    
    // Check if payment is pending
    if (user.membershipStatus === "pending") {
      accessStatus = "warning";
      reason = "Pago pendiente";
    }

    // Create access log
    const accessLogData: AccessLogData = {
      userId: user.id,
      status: accessStatus,
      reason,
      processedBy: session.user.id
    };

    const accessLog = await prisma.accessLog.create({
      data: accessLogData
    });

    // Update last check-in time
    await prisma.user.update({
      where: { id: user.id },
      data: { lastCheckIn: now }
    });

    // Broadcast event for real-time notification
    const eventPayload: RFIDEventPayload = {
      type: accessStatus,
      message: reason || 'Membresía activa',
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        membershipType: user.membershipType,
        membershipExpiry: user.membershipExpiry,
        membershipStatus: user.membershipStatus,
        lastCheckIn: user.lastCheckIn
      },
      cardNumber: rfidCardNumber,
      timestamp: now.toISOString()
    };

    broadcastEvent(eventPayload);

    const response: RFIDScanResponse = {
      status: accessStatus,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        membershipType: user.membershipType,
        membershipExpiry: user.membershipExpiry,
        membershipStatus: user.membershipStatus,
        lastCheckIn: user.lastCheckIn
      },
      accessLog,
      message: reason || "Membresía activa"
    };

    return NextResponse.json(response, { status: 200 });
  } catch (error) {
    console.error("Error al escanear tarjeta RFID:", error);
    return NextResponse.json({ error: "Error interno del servidor" }, { status: 500 });
  }
}