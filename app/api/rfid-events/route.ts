// app/api/rfid-events/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from "next-auth";
import { options as authOptions } from "@/app/api/auth/[...nextauth]/options";

// Store connected clients
const clients = new Set<ReadableStreamController<Uint8Array>>();

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions);
  
  if (!session?.user?.id || !['admin', 'receptionist'].includes(session.user.role as string)) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  // Create a stream for Server-Sent Events
  const stream = new ReadableStream({
    start(controller) {
      clients.add(controller);
      
      // Send initial connection message
      const data = `data: ${JSON.stringify({ event: 'connected' })}\n\n`;
      controller.enqueue(new TextEncoder().encode(data));
    },
    cancel() {
      clients.delete(controller);
    }
  });

  return new NextResponse(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
    },
  });
}

// Function to broadcast events to all connected clients
export function broadcastEvent(eventData: any) {
  const data = `data: ${JSON.stringify(eventData)}\n\n`;
  const encoded = new TextEncoder().encode(data);
  
  clients.forEach(client => {
    try {
      client.enqueue(encoded);
    } catch (e) {
      console.error('Failed to send SSE:', e);
    }
  });
}