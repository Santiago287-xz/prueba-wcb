// app/api/rfid/prices/route.ts
import { NextRequest, NextResponse } from "next/server";
import prisma from "@/app/libs/prismadb";
import { getServerSession } from "next-auth";
import { options as authOptions } from "@/app/api/auth/[...nextauth]/options";

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions);
  
  if (!session?.user?.id) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }
  
  try {
    const { searchParams } = new URL(req.url);
    const active = searchParams.get('active');
    
    const whereClause: any = {};
    if (active === 'true') {
      whereClause.active = true;
    } else if (active === 'false') {
      whereClause.active = false;
    }
    
    const prices = await prisma.membershipPrice.findMany({
      where: whereClause,
      orderBy: { basePrice: 'asc' }
    });
    
    return NextResponse.json(prices);
  } catch (error) {
    console.error("Error al obtener precios de membresía:", error);
    return NextResponse.json({ error: "Error del servidor" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  
  if (!session?.user?.id || session.user.role !== 'admin') {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  try {
    const { type, basePrice, description, active } = await req.json();
    
    // Validación básica
    if (!type || typeof type !== 'string' || !basePrice || isNaN(parseFloat(basePrice))) {
      return NextResponse.json({ 
        error: "Se requiere tipo y precio base válido" 
      }, { status: 400 });
    }

    // Verificar si ya existe un tipo con el mismo nombre
    const existingPrice = await prisma.membershipPrice.findFirst({
      where: { 
        type: { 
          equals: type,
          mode: 'insensitive'
        } 
      }
    });

    if (existingPrice) {
      return NextResponse.json({ 
        error: "Ya existe un tipo de membresía con este nombre" 
      }, { status: 400 });
    }

    // Crear el nuevo precio
    const price = await prisma.membershipPrice.create({
      data: {
        type,
        basePrice: parseFloat(basePrice),
        description: description || null,
        active: active !== undefined ? active : true
      }
    });
    
    return NextResponse.json(price, { status: 201 });
  } catch (error) {
    console.error("Error al crear precio de membresía:", error);
    return NextResponse.json({ error: "Error del servidor" }, { status: 500 });
  }
}