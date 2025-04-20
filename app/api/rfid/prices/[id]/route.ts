// app/api/rfid/prices/[id]/route.ts
import { NextRequest, NextResponse } from "next/server";
import prisma from "@/app/libs/prismadb";
import { getServerSession } from "next-auth";
import { options as authOptions } from "@/app/api/auth/[...nextauth]/options";

// GET: Obtener un precio de membresía específico
export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const session = await getServerSession(authOptions);
  
  if (!session?.user?.id) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  try {
    const { id } = params;
    
    const price = await prisma.membershipPrice.findUnique({
      where: { id }
    });
    
    if (!price) {
      return NextResponse.json({ error: "Precio no encontrado" }, { status: 404 });
    }
    
    return NextResponse.json(price);
  } catch (error) {
    console.error("Error al obtener precio de membresía:", error);
    return NextResponse.json({ error: "Error del servidor" }, { status: 500 });
  }
}

// PUT: Actualizar un precio de membresía
export async function PUT(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const session = await getServerSession(authOptions);
  
  if (!session?.user?.id || session.user.role !== 'admin') {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  try {
    const { id } = params;
    const { type, basePrice, description, active } = await req.json();
    
    // Verificar que el precio existe
    const existingPrice = await prisma.membershipPrice.findUnique({
      where: { id }
    });
    
    if (!existingPrice) {
      return NextResponse.json({ error: "Precio no encontrado" }, { status: 404 });
    }
    
    // Verificar si ya existe otro tipo con el mismo nombre (excepto este)
    if (type && type !== existingPrice.type) {
      const duplicateType = await prisma.membershipPrice.findFirst({
        where: {
          type: {
            equals: type,
            mode: 'insensitive'
          },
          id: { not: id }
        }
      });
      
      if (duplicateType) {
        return NextResponse.json({ 
          error: "Ya existe otro tipo de membresía con este nombre" 
        }, { status: 400 });
      }
    }
    
    // Actualizar el precio
    const updatedPrice = await prisma.membershipPrice.update({
      where: { id },
      data: {
        ...(type && { type }),
        ...(basePrice !== undefined && { basePrice: parseFloat(basePrice) }),
        ...(description !== undefined && { description }),
        ...(active !== undefined && { active })
      }
    });
    
    return NextResponse.json(updatedPrice);
  } catch (error) {
    console.error("Error al actualizar precio de membresía:", error);
    return NextResponse.json({ error: "Error del servidor" }, { status: 500 });
  }
}

// DELETE: Eliminar un precio de membresía
export async function DELETE(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const session = await getServerSession(authOptions);
  
  if (!session?.user?.id || session.user.role !== 'admin') {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  try {
    const { id } = params;
    
    // Verificar que el precio existe
    const existingPrice = await prisma.membershipPrice.findUnique({
      where: { id }
    });
    
    if (!existingPrice) {
      return NextResponse.json({ error: "Precio no encontrado" }, { status: 404 });
    }
    
    // Contar usuarios que usan este tipo de membresía
    const usersCount = await prisma.user.count({
      where: { membershipType: existingPrice.type }
    });
    
    // Si hay usuarios usando este tipo, no permitir eliminar
    if (usersCount > 0) {
      return NextResponse.json({ 
        error: `No se puede eliminar este tipo de membresía porque ${usersCount} usuarios lo están utilizando` 
      }, { status: 400 });
    }
    
    // Eliminar el precio
    await prisma.membershipPrice.delete({
      where: { id }
    });
    
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error al eliminar precio de membresía:", error);
    return NextResponse.json({ error: "Error del servidor" }, { status: 500 });
  }
}