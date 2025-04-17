import { NextRequest, NextResponse } from "next/server";
import prisma from "@/app/libs/prismadb";
import { getServerSession } from "next-auth/next";
import { options } from '../auth/[...nextauth]/options';
// GET: Listar todas las canchas disponibles
export async function GET(req: NextRequest) {
  const session = await getServerSession(options);
  
  if (!session?.user?.id || !['admin', 'court_manager', 'receptionist'].includes(session.user.role as string)) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }
  const courts = await prisma.court.findMany();
  return NextResponse.json(courts, { status: 200 });
}