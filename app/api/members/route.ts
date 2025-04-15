// app/api/members/route.ts
import { NextRequest, NextResponse } from "next/server";
import prisma from "@/app/libs/prismadb";
import { getServerSession } from "next-auth";
import { options as authOptions } from "@/app/api/auth/[...nextauth]/options";

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions);
  
  if (!session?.user?.id || !['admin', 'employee'].includes(session.user.role as string)) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  try {
    const members = await prisma.user.findMany({
      where: {
        rfidCardNumber: { not: null }
      },
      orderBy: {
        createdAt: 'desc'
      }
    });
    console.log("members api", members)
    return NextResponse.json({ members }, { status: 200 });
  } catch (error) {
    console.error("Error fetching members:", error);
    return NextResponse.json({ 
      error: "Error interno del servidor" 
    }, { status: 500 });
  }
}