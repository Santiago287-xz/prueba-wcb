import { NextResponse, NextRequest } from 'next/server';
import prisma from "@/app/libs/prismadb";
import { getServerSession } from "next-auth";
import { options as authOptions } from "@/app/api/auth/[...nextauth]/options";

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions);
  
  if (!session?.user?.id || !['admin', 'receptionist', 'trainer'].includes(session.user.role as string)) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }
  
  try {
    const trainers = await prisma.user.findMany({
      where: { role: 'trainer' },
      select: { id: true, name: true }
    });
    
    return NextResponse.json({ data: trainers });
  } catch (error) {
    console.error("Error al obtener entrenadores:", error);
    return NextResponse.json({ error: "Error al obtener entrenadores" }, { status: 500 });
  }
}