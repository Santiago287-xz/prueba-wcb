// app/api/socketio/route.ts
import { Server as NetServer } from 'http';
import { NextApiRequest } from 'next';
import { Server as ServerIO } from 'socket.io';
import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

let io: ServerIO;

export async function GET(req: NextApiRequest) {
  if (!io) {
    const res: any = new NextResponse();
    const httpServer: NetServer = res.socket.server;

    if (!httpServer.io) {
      console.log('Starting socket.io server');
      io = new ServerIO(httpServer, {
        path: '/api/socketio',
        addTrailingSlash: false,
      });

      httpServer.io = io;

      io.on('connection', (socket) => {
        console.log('New client connected');
        
        socket.on('join-receptionist', () => {
          socket.join('receptionists');
          console.log('Receptionist joined');
        });

        socket.on('disconnect', () => {
          console.log('Client disconnected');
        });
      });
    } else {
      io = httpServer.io;
    }
  }

  return new NextResponse('WebSocket server is running', { status: 200 });
}