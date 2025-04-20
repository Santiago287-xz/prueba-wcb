// app/api/booking/purge/route.ts
import { NextResponse } from "next/server";
import prisma from "@/app/libs/prismadb";
import { getServerSession } from "next-auth";
import { options as authOptions } from "@/app/api/auth/[...nextauth]/options";

export async function DELETE() {
  const session = await getServerSession(authOptions);
  if (
    !session?.user?.id || 
    (session.user.role !== "admin" && session.user.role !== "court_manager")
  ) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }
  

  try {
    // Eliminar todas las transacciones
    await prisma.courtReservation.deleteMany({});
    
    return NextResponse.json({ 
      success: true, 
      message: "Todas las reservas han sido eliminadas" 
    });
  } catch (error) {
    console.error("Error al eliminar reservas:", error);
    return NextResponse.json({ 
      error: "Error interno del servidor" 
    }, { status: 500 });
  }
}