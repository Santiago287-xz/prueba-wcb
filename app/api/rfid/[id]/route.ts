// app/api/members/[id]/route.ts
import { NextRequest, NextResponse } from "next/server";
import prisma from "@/app/libs/prismadb";
import { getServerSession } from "next-auth";
import { options as authOptions } from "@/app/api/auth/[...nextauth]/options";

interface Params {
  params: {
    id: string;
  };
}

export async function DELETE(req: NextRequest, { params }: Params) {
  const session = await getServerSession(authOptions);
  
  if (!session?.user?.id || !['admin', 'receptionist'].includes(session.user.role as string)) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  try {
    const { id } = params;
    
    // Verificar si el usuario existe
    const user = await prisma.user.findUnique({
      where: { id },
      select: { id: true, name: true, rfidCardNumber: true }
    });
    
    if (!user) {
      return NextResponse.json({ error: "Usuario no encontrado" }, { status: 404 });
    }
    
    // Eliminar registros relacionados primero
    // Nota: Dependiendo de tus relaciones en Prisma, estos pasos pueden ser automáticos con cascadeDelete
    
    // 1. Eliminar historial de accesos RFID si existe
    await prisma.accessLog.deleteMany({
      where: { userId: id }
    });    
    
    // 2. Eliminar ejercicios asignados al usuario
    await prisma.userExercise.deleteMany({
      where: { userId: id }
    });

    // 3. Eliminar transacciones si existen
    if (prisma.transaction) {
      await prisma.transaction.deleteMany({
        where: { userId: id }
      });
    }
    
    // 4. Eliminar el usuario
    await prisma.user.delete({
      where: { id }
    });
    
    return NextResponse.json({ 
      success: true,
      message: `Usuario "${user.name}" eliminado correctamente` 
    });
  } catch (error) {
    console.error("Error al eliminar usuario:", error);
    return NextResponse.json({ 
      error: "Error al eliminar el usuario. Puede tener registros asociados que impiden su eliminación."
    }, { status: 500 });
  }
}