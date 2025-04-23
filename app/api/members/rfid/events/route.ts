import { NextRequest, NextResponse } from 'next/server';
import { addClient, removeClient } from '@/app/libs/broadcast';
import { getServerSession } from "next-auth/next";
import { options } from '@/app/api/auth/[...nextauth]/options';

export async function GET(req: NextRequest) {
  const session = await getServerSession(options);
  
  if (!session?.user?.id || !['admin', 'receptionist'].includes(session.user.role as string)) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }
  // Create a variable to store the controller reference
  let controllerRef: ReadableStreamDefaultController<Uint8Array> | null = null;
  
  try {
    const stream = new ReadableStream<Uint8Array>({
      start(controller) {
        
        // Store reference in outer scope
        controllerRef = controller;
        
        try {
          addClient(controller);
          const connectEvent = { event: 'connected', message: 'Conexión establecida' };
          const data = `data: ${JSON.stringify(connectEvent)}\n\n`;
          controller.enqueue(new TextEncoder().encode(data));
        } catch (error) {
          console.error("🔴 Error in stream start:", error);
        }
      },
      cancel(reason) {
        if (controllerRef) {
          removeClient(controllerRef);
          controllerRef = null;
        }
      }
    });
    
    return new NextResponse(stream, {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache, no-transform',
        'Connection': 'keep-alive',
      }
    });
  } catch (error) {
    console.error("🔴 Fatal error in SSE handler:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}