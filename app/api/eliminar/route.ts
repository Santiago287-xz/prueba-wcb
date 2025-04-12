// app/api/test-notification/route.ts
import { NextResponse } from "next/server";
import { broadcastEvent } from "@/app/api/rfid-events/route";

export async function GET() {
  const testEvent = {
    type: "allowed",
    message: "Prueba de notificación",
    user: { 
      id: "test-id",
      name: "Usuario de Prueba", 
      email: "test@example.com" 
    },
    cardNumber: "TEST-CARD",
    deviceId: "test-device",
    timestamp: new Date().toISOString()
  };
  
  console.log("Enviando notificación de prueba");
  broadcastEvent(testEvent);
  
  return NextResponse.json({ 
    success: true, 
    message: "Notificación de prueba enviada" 
  });
}