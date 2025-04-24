// app/api/members/rfid/reset-password/route.ts
import { NextRequest, NextResponse } from "next/server";
import prisma from "@/app/libs/prismadb";
import { getServerSession } from "next-auth";
import { options as authOptions } from "@/app/api/auth/[...nextauth]/options";
import bcrypt from "bcrypt";

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  
  if (!session?.user?.id || !['admin', 'receptionist'].includes(session.user.role as string)) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  try {
    const { userId } = await req.json();
    
    if (!userId) {
      return NextResponse.json({ error: "ID de usuario requerido" }, { status: 400 });
    }

    // Verificar que el usuario existe
    const user = await prisma.user.findUnique({
      where: { id: userId }
    });

    if (!user) {
      return NextResponse.json({ error: "Usuario no encontrado" }, { status: 404 });
    }

    // Generar contraseña numérica de 6 dígitos
    const newPassword = Math.floor(100000 + Math.random() * 900000).toString();
    
    // Hashear la nueva contraseña
    const hashedPassword = await bcrypt.hash(newPassword, 12);

    // Actualizar la contraseña del usuario
    await prisma.user.update({
      where: { id: userId },
      data: { hashedPassword }
    });

    // Devolver la nueva contraseña para mostrarla al admin (solo una vez)
    return NextResponse.json({ 
      success: true, 
      newPassword,
      message: "Contraseña restablecida correctamente" 
    });
  } catch (error) {
    console.error("Error al restablecer contraseña:", error);
    return NextResponse.json({ error: "Error interno del servidor" }, { status: 500 });
  }
}