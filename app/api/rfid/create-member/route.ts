// app/api/rfid/create-member/route.ts
import { NextRequest, NextResponse } from "next/server";
import prisma from "@/app/libs/prismadb";
import { getServerSession } from "next-auth";
import { options as authOptions } from "@/app/api/auth/[...nextauth]/options";
import bcrypt from "bcrypt";

// Ensure this export is correctly formatted for Next.js 13+ App Router
export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  
  if (!session?.user?.id || !['admin', 'employee'].includes(session.user.role as string)) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  try {
    const body = await req.json();
    const { 
      name, 
      email, 
      phone,
      trainer,
      gender,
      age,
      height,
      weight,
      rfidCardNumber, 
      membershipType, 
      membershipStatus,
      accessPoints,
      goal,
      level,
      medicalConditions,
      emergencyContact,
      dietaryRestrictions,
      notes
    } = body;
    // Validation code...
    if (!name || !email || !rfidCardNumber) {
      return NextResponse.json({ 
        error: "Nombre, email y número de tarjeta RFID son requeridos" 
      }, { status: 400 });
    }
    
    // Create user logic...
    const password = (Math.floor(Math.random() * 900000) + 100000).toString();
    const hashedPassword = await bcrypt.hash(password, 12);

    // Store extra data as JSON
    const extraData = {
      medicalConditions,
      emergencyContact,
      dietaryRestrictions,
      notes,
    };

    const user = await prisma.user.create({
      data: { 
        name,
        email,
        hashedPassword,
        trainer,
        role: "member",
        gender: gender || "male",
        age: age ? parseInt(age.toString()) : 18,
        height: height ? parseInt(height.toString()) : 170,
        weight: weight ? parseInt(weight.toString()) : 70,
        goal: goal || "lose_weight",
        level: level || "beginner",
        phone: phone ? parseInt(phone.toString()) : null,
        rfidCardNumber,
        rfidAssignedAt: new Date(),
        membershipType: membershipType || "standard",
        membershipStatus: membershipStatus || "active",
        accessPoints: accessPoints ? parseInt(accessPoints.toString()) : 30,
        isActive: true,
        post: JSON.stringify(extraData)
      }
    });
    return NextResponse.json({ 
      message: "Miembro creado correctamente", 
      user,
      password,
    }, { status: 201 });
  } catch (error) {
    console.error("Error al crear miembro:", error);
    return NextResponse.json({ 
      error: "Error interno del servidor: " + (error instanceof Error ? error.message : String(error))
    }, { status: 500 });
  }
}