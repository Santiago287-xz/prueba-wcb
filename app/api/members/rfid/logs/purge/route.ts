// app/api/members/rfid/logs/purge/route.ts
import { NextResponse } from "next/server";
import prisma from "@/app/libs/prismadb";
import { getServerSession } from "next-auth";
import { options as authOptions } from "@/app/api/auth/[...nextauth]/options";

export async function DELETE() {
  const session = await getServerSession(authOptions);
  
  if (!session?.user?.id || session.user.role !== 'admin') {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  try {
    // Eliminar todos los logs
    await prisma.accessLog.deleteMany({});
    
    return NextResponse.json({ 
      success: true, 
      message: "Todos los logs han sido eliminados" 
    });
  } catch (error) {
    console.error("Error al eliminar logs:", error);
    return NextResponse.json({ 
      error: "Error interno del servidor" 
    }, { status: 500 });
  }
}