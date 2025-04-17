// app/api/inventory/categories/route.ts
import { NextRequest, NextResponse } from "next/server";
import prisma from "@/app/libs/prismadb";
import { getServerSession } from "next-auth";
import { options } from "@/app/api/auth/[...nextauth]/options";

// GET: Obtener todas las categorías
export async function GET(req: NextRequest) {
  const session = await getServerSession(options);
  
  if (!session?.user?.id) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }  
  try {
    const categories = await prisma.category.findMany({
      orderBy: {
        name: 'asc'
      }
    });
    
    return NextResponse.json(categories);
  } catch (error) {
    console.error("Error al obtener categorías:", error);
    return NextResponse.json({ error: "Error al obtener categorías" }, { status: 500 });
  }
}

// POST: Crear una nueva categoría
export async function POST(req: NextRequest) {
  const session = await getServerSession(options);
  
  // Verificar que el usuario está autenticado y tiene permisos
  if (!session?.user?.id || (session.user.role !== "admin" && session.user.role !== "court_manager")) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  try {
    const { name } = await req.json();
    
    if (!name || typeof name !== "string" || name.trim() === "") {
      return NextResponse.json({ error: "Nombre de categoría requerido" }, { status: 400 });
    }

    // Verificar si ya existe una categoría con el mismo nombre
    const existingCategory = await prisma.category.findFirst({
      where: {
        name: {
          equals: name,
          mode: 'insensitive' // Ignorar mayúsculas/minúsculas
        }
      }
    });

    if (existingCategory) {
      return NextResponse.json({ error: "Ya existe una categoría con este nombre" }, { status: 400 });
    }

    // Crear la categoría
    const category = await prisma.category.create({
      data: {
        name: name.trim()
      }
    });

    return NextResponse.json(category, { status: 201 });
  } catch (error) {
    console.error("Error al crear categoría:", error);
    return NextResponse.json({ error: "Error al crear la categoría" }, { status: 500 });
  }
}