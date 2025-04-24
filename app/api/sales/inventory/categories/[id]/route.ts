// app/api/sales/inventory/categories/[id]/route.ts
import { NextRequest, NextResponse } from "next/server";
import prisma from "@/app/libs/prismadb";
import { getServerSession } from "next-auth";
import { options as authOptions } from "@/app/api/auth/[...nextauth]/options";

interface Params {
  params: {
    id: string;
  };
}

// PUT: Actualizar una categoría
export async function PUT(req: NextRequest, { params }: Params) {
  const session = await getServerSession(authOptions);
  
  // Verificar que el usuario está autenticado y tiene permisos
  if (!session?.user?.id || !['admin', 'court_manager', 'receptionist'].includes(session.user.role as string)) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  try {
    const { id } = params;
    const { name } = await req.json();
    
    if (!name || typeof name !== "string" || name.trim() === "") {
      return NextResponse.json({ error: "Nombre de categoría requerido" }, { status: 400 });
    }

    // Verificar si existe la categoría
    const category = await prisma.category.findUnique({
      where: { id }
    });

    if (!category) {
      return NextResponse.json({ error: "Categoría no encontrada" }, { status: 404 });
    }

    // Verificar si ya existe otra categoría con el mismo nombre
    const existingCategory = await prisma.category.findFirst({
      where: {
        name: {
          equals: name,
          mode: 'insensitive' // Ignorar mayúsculas/minúsculas
        },
        id: {
          not: id
        }
      }
    });

    if (existingCategory) {
      return NextResponse.json({ error: "Ya existe otra categoría con este nombre" }, { status: 400 });
    }

    // Actualizar la categoría
    const updatedCategory = await prisma.category.update({
      where: { id },
      data: {
        name: name.trim()
      }
    });

    return NextResponse.json(updatedCategory);
  } catch (error) {
    console.error("Error al actualizar categoría:", error);
    return NextResponse.json({ error: "Error al actualizar la categoría" }, { status: 500 });
  }
}

// DELETE: Eliminar una categoría
export async function DELETE(req: NextRequest, { params }: Params) {
  const session = await getServerSession(authOptions);
  
  // Verificar que el usuario está autenticado y tiene permisos
  if (!session?.user?.id || !['admin', 'court_manager', 'receptionist'].includes(session.user.role as string)) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  try {
    const { id } = params;

    // Verificar si existe la categoría
    const category = await prisma.category.findUnique({
      where: { id }
    });

    if (!category) {
      return NextResponse.json({ error: "Categoría no encontrada" }, { status: 404 });
    }

    // Buscar productos que usen esta categoría
    const productsCount = await prisma.product.count({
      where: { categoryId: id }
    });

    // Si hay productos usando esta categoría, actualizar esos productos para eliminar la referencia
    if (productsCount > 0) {
      await prisma.product.updateMany({
        where: { categoryId: id },
        data: { categoryId: '' }
      });
    }

    // Eliminar la categoría
    await prisma.category.delete({
      where: { id }
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error al eliminar categoría:", error);
    return NextResponse.json({ error: "Error al eliminar la categoría" }, { status: 500 });
  }
}