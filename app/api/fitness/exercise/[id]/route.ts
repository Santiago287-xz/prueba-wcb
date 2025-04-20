// app/api/fitness/exercise/[id]/route.ts
import { NextRequest, NextResponse } from "next/server";
import prisma from "@/app/libs/prismadb";
import { getServerSession } from "next-auth";
import { options as authOptions } from "@/app/api/auth/[...nextauth]/options";

export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.id || !['admin', 'trainer'].includes(session.user.role as string)) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    }
    
    const { id } = params;
    const { exerciseName, sets, reps, weight } = await req.json();
    
    // Find the exercise first to make sure it exists
    const exercise = await prisma.userExercise.findUnique({
      where: { id }
    });
    
    if (!exercise) {
      return NextResponse.json({ error: "Ejercicio no encontrado" }, { status: 404 });
    }
    
    // Update the exercise
    const updatedExercise = await prisma.userExercise.update({
      where: { id },
      data: {
        sets: sets || exercise.sets,
        reps: reps || exercise.reps,
        weight: weight || exercise.weight,
        updatedAt: new Date()
      }
    });
    
    return NextResponse.json({
      success: true,
      data: updatedExercise
    });
  } catch (error) {
    console.error("Error updating exercise:", error);
    return NextResponse.json({ 
      error: "Error interno del servidor" 
    }, { status: 500 });
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.id || !['admin', 'trainer'].includes(session.user.role as string)) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    }
    
    const { id } = params;
    
    // Find the exercise first to make sure it exists
    const exercise = await prisma.userExercise.findUnique({
      where: { id }
    });
    
    if (!exercise) {
      return NextResponse.json({ error: "Ejercicio no encontrado" }, { status: 404 });
    }
    
    // Delete the exercise
    await prisma.userExercise.delete({
      where: { id }
    });
    
    return NextResponse.json({
      success: true,
      message: "Ejercicio eliminado correctamente"
    });
  } catch (error) {
    console.error("Error deleting exercise:", error);
    return NextResponse.json({ 
      error: "Error interno del servidor" 
    }, { status: 500 });
  }
}