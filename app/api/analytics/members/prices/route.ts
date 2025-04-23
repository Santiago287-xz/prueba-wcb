import { NextResponse } from "next/server";
import prisma from "@/app/libs/prismadb";
import { getServerSession } from "next-auth";
import { options as authOptions } from "@/app/api/auth/[...nextauth]/options";

export async function GET() {
  const session = await getServerSession(authOptions);
  
  if (!session?.user?.id) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }
  try {
    const prices = await prisma.membershipPrice.findMany({
      where: { active: true },
      orderBy: { basePrice: 'asc' }
    });
    
    // Map to types array for backward compatibility
    const types = prices.map(price => ({
      id: price.id,
      type: price.type,
      name: price.type.charAt(0).toUpperCase() + price.type.slice(1), // Capitalize first letter
      basePrice: price.basePrice,
      description: price.description
    }));
    
    return NextResponse.json({ types });
  } catch (error) {
    console.error("Error fetching membership types:", error);
    return NextResponse.json({ error: "Error interno del servidor" }, { status: 500 });
  }
}

export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  
  if (!session?.user?.id || !['admin', 'recepcionst'].includes(session.user.role as string)) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  try {
    const { type, name, basePrice, description } = await req.json();
    
    if (!type || typeof basePrice !== 'number' || basePrice <= 0) {
      return NextResponse.json({ 
        error: "Se requiere tipo y precio base válido" 
      }, { status: 400 });
    }

    // Check if type already exists
    const existing = await prisma.membershipPrice.findFirst({
      where: { 
        type: { 
          equals: type,
          mode: 'insensitive'
        } 
      }
    });

    if (existing) {
      return NextResponse.json({ 
        error: "Este tipo de membresía ya existe" 
      }, { status: 400 });
    }

    const price = await prisma.membershipPrice.create({
      data: {
        type,
        basePrice,
        description: description || null
      }
    });
    
    return NextResponse.json({ 
      type: {
        id: price.id,
        type: price.type,
        name: price.type.charAt(0).toUpperCase() + price.type.slice(1),
        basePrice: price.basePrice,
        description: price.description
      }
    }, { status: 201 });
  } catch (error) {
    console.error("Error creating membership type:", error);
    return NextResponse.json({ error: "Error interno del servidor" }, { status: 500 });
  }
}