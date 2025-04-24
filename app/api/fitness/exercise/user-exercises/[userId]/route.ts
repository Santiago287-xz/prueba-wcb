// app/api/fitness/exercise/user-exercises/[userId]/route.ts
import { NextResponse } from "next/server";
import prisma from "@/app/libs/prismadb";

import { getServerSession } from "next-auth/next";
import { options } from "@/app/api/auth/[...nextauth]/options";

async function getSession() {
  try {
    return await getServerSession(
      options
    );
  } catch (error) {
    console.error(
      "Error while fetching session:",
      error
    );
    return null;
  }
}

export async function GET(req: Request, { params }: { params: { userId: string } }) {
  try {
    const session = await getSession();

    if (!session?.user?.id || !['admin', 'trainer'].includes(session.user.role as string)) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    }

    const { userId } = params;

    if (!userId) {
      return NextResponse.json(
        { error: "User ID is required" },
        { status: 400 }
      );
    }

    // Verificar que el usuario existe
    const user = await prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      return NextResponse.json(
        { error: "User not found" },
        { status: 404 }
      );
    }

    // Obtener ejercicios asignados al usuario
    const userExercises = await prisma.userExercise.findMany({
      where: { userId },
      include: {
        exercise: true,
      },
      orderBy: {
        assignedAt: 'desc'
      }
    });

    // Formatear los datos para el frontend
    const formattedExercises = userExercises.map(exercise => ({
      id: exercise.id,
      exerciseName: exercise.exercise.name,
      sets: exercise.sets || 0,
      reps: exercise.reps || 0,
      weight: exercise.weight || 0,
      duration: exercise.duration || 0,
      notes: exercise.notes,
      assignedAt: exercise.assignedAt,
    }));

    return NextResponse.json(
      {
        status: "success",
        data: formattedExercises,
      },
      { status: 200 }
    );
  } catch (error) {
    console.error("Error fetching user exercises:", error);
    return NextResponse.json(
      { error: "Failed to fetch user exercises" },
      { status: 500 }
    );
  }
}