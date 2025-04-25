// app/api/members/route.ts
import { NextRequest, NextResponse } from "next/server";
import prisma from "@/app/libs/prismadb";
import { getServerSession } from "next-auth";
import { options } from "@/app/api/auth/[...nextauth]/options";

export const dynamic = 'force-dynamic';
export const fetchCache = 'force-no-store';
export const revalidate = 0;

async function getSession() {
  try {
    return await getServerSession(options);
  } catch (error) {
    console.error("Error while fetching session:", error);
    return null;
  }
}

export async function GET(req: NextRequest) {
  const session = await getSession();
  
  if (!session?.user?.id || !['admin', 'trainer', 'receptionist'].includes(session.user.role as string)) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  try {
    // Extraer memberId de los query params si existe
    const { searchParams } = new URL(req.url);
    const memberId = searchParams.get('memberId');
    
    // Si se solicita un miembro específico
    if (memberId) {
      const member = await prisma.user.findUnique({
        where: { 
          id: memberId 
        }
      });
      
      if (!member) {
        return NextResponse.json({ error: "Usuario no encontrado" }, { status: 404 });
      }
      
      // Excluir la contraseña hash de la respuesta
      const { hashedPassword, ...memberData } = member;
      return NextResponse.json(memberData);
    }
    
    // Si no hay memberId, devolver la lista de miembros
    const members = await prisma.user.findMany({
      where: {
        role: "member"
      },
      orderBy: {
        createdAt: 'desc'
      }
    });
    
    // Excluir la contraseña hash de cada usuario
    const membersWithoutPassword = members.map(member => {
      const { hashedPassword, ...memberData } = member;
      return memberData;
    });
    
    return NextResponse.json({ members: membersWithoutPassword }, { status: 200 });
  } catch (error) {
    console.error("Error fetching members:", error);
    return NextResponse.json({ 
      error: "Error interno del servidor" 
    }, { status: 500 });
  }
}

// El resto del código permanece igual...