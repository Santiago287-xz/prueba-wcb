// app/api/users/[userId]/route.ts
import { NextResponse } from "next/server";
import prisma from "@/app/libs/prismadb";

export async function GET(
  request: Request,
  { params }: { params: { userId: string } }
) {
  try {
    // Extrae el userId de los parámetros de la ruta
    const userId = params.userId;
    
    // Valida el formato del ID
    if (!userId || !/^[0-9a-fA-F]{24}$/.test(userId)) {
      return NextResponse.json(
        { error: "ID de usuario inválido" },
        { status: 400 }
      );
    }

    // Busca el usuario en la base de datos
    const user = await prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      return NextResponse.json(
        { error: "Usuario no encontrado" },
        { status: 404 }
      );
    }

    // Elimina la contraseña hasheada de la respuesta
    const { hashedPassword, ...userWithoutPassword } = user;

    return NextResponse.json(userWithoutPassword);
  } catch (error) {
    console.error("Error al obtener usuario:", error);
    return NextResponse.json(
      { error: "Error al obtener usuario" },
      { status: 500 }
    );
  }
}