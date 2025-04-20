import { NextResponse } from "next/server";
import prisma from "@/app/libs/prismadb";

export async function GET(
  request: Request,
  { params }: { params: { membersId: string } }
) {
  try {
    // Extrae el membersId de los parámetros de la ruta
    const membersId = params.membersId;
    
    // Valida el formato del ID
    if (!membersId || !/^[0-9a-fA-F]{24}$/.test(membersId)) {
      return NextResponse.json(
        { error: "ID de usuario inválido" },
        { status: 400 }
      );
    }

    // Busca el usuario en la base de datos
    const user = await prisma.user.findUnique({
      where: { id: membersId },
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