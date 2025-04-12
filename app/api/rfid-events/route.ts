import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from "next-auth";
import { options as authOptions } from "@/app/api/auth/[...nextauth]/options";
import { addClient, removeClient, clients } from "@/app/libs/broadcast";

export async function GET(req: NextRequest) {
  console.log("SSE connection iniciada");
  const session = await getServerSession(authOptions);
  
  // Ampliar los roles permitidos
  if (!session?.user?.id) {
    console.log("Usuario no autenticado");
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  console.log("Usuarios conectados antes:", clients.size);
  
  // Create a stream for Server-Sent Events
  const stream = new ReadableStream({
    start(controller) {
      addClient(controller);
      
      // Send initial connection message
      const data = `data: ${JSON.stringify({ event: 'connected' })}\n\n`;
      controller.enqueue(new TextEncoder().encode(data));
    },
    cancel(controller) {
      removeClient(controller);
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