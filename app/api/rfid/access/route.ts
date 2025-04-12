import { NextRequest, NextResponse } from "next/server";
import prisma from "@/app/libs/prismadb";
import { broadcastEvent } from "@/app/libs/broadcast";

const API_KEY = process.env.RFID_API_KEY || "your_secret_api_key";

export async function POST(req: NextRequest) {
  const authHeader = req.headers.get("authorization");
  
  if (!authHeader || !authHeader.startsWith("Bearer ") || authHeader.substring(7) !== API_KEY) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  
  try {
    const body = await req.json();
    const { rfidCardNumber, deviceId } = body;
    
    if (!rfidCardNumber || !deviceId) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }
    
    const user = await prisma.user.findFirst({
      where: { rfidCardNumber }
    });
    
    const now = new Date();
    
    let accessStatus: 'allowed' | 'denied' | 'warning' = "denied";
    let reason: string | null = "Tarjeta RFID no registrada";
    
    if (user) {
      // Check membership expiry
      if (user.membershipExpiry && new Date(user.membershipExpiry) > now) {
        accessStatus = "allowed";
        reason = null;
      } else {
        accessStatus = "warning";
        reason = "Membresía expirada";
        
        // Update membership status
        await prisma.user.update({
          where: { id: user.id },
          data: { membershipStatus: "expired" }
        });
      }
      
      // Update last check-in time
      await prisma.user.update({
        where: { id: user.id },
        data: { lastCheckIn: now }
      });
    }
    
    // Create access log
    const accessLog = await prisma.accessLog.create({
      data: {
        userId: user?.id || req.headers.get("x-forwarded-for") || "unknown",
        status: accessStatus,
        reason,
        deviceId
      }
    });
    
    // Broadcast event for real-time notification
    broadcastEvent({
      type: accessStatus,
      message: reason || 'Acceso permitido',
      user: user ? {
        id: user.id,
        name: user.name,
        email: user.email,
        membershipType: user.membershipType,
        membershipExpiry: user.membershipExpiry,
        membershipStatus: user.membershipStatus
      } : null,
      cardNumber: rfidCardNumber,
      deviceId,
      timestamp: now.toISOString()
    });
    
    return NextResponse.json({
      status: accessStatus,
      message: reason || "Access granted",
      timestamp: now.toISOString()
    });
    
  } catch (error) {
    console.error("Error processing RFID access:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}