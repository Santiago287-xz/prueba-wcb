// /api/fitness/exercise/assign-exercise/route.ts
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

export async function POST(req: Request) {
  try {
    const session = await getSession();
    const sessionUser = session?.user;

    if (!session?.user?.id || !['admin', 'trainer'].includes(session.user.role as string)) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    }

    const { selectedStudents, workOutArray, fromDate, toDate } = await req.json();

    // Validación detallada
    const missing = [];
    if (!selectedStudents) missing.push('selectedStudents');
    if (!workOutArray) missing.push('workOutArray');
    if (!fromDate) missing.push('fromDate');
    if (!toDate) missing.push('toDate');
    
    if (missing.length > 0) {
      return NextResponse.json(
        { error: `Missing fields: ${missing.join(', ')}` },
        { status: 400 }
      );
    }

    // Validar array de ejercicios
    if (!Array.isArray(workOutArray) || workOutArray.length === 0) {
      return NextResponse.json(
        { error: "No exercises selected" },
        { status: 400 }
      );
    }

    // Validar formato de fechas
    try {
      new Date(fromDate);
      new Date(toDate);
    } catch (e) {
      return NextResponse.json(
        { error: "Invalid date format" },
        { status: 400 }
      );
    }

    const students = await prisma.user.findMany({
      where: {
        id: { in: selectedStudents },
      },
    });

    if (students.length === 0) {
      return NextResponse.json(
        { error: "No valid students found" },
        { status: 400 }
      );
    }

    // Process each student
    await Promise.all(
      students.map(async (student) => {
        // For each exercise in the workout array
        for (const workOut of workOutArray) {
          // Create a UserExercise record for each exercise
          await prisma.userExercise.create({
            data: {
              userId: student.id,
              exerciseId: workOut.id,
              sets: workOut.sets || 0,
              reps: workOut.steps || 0,
              weight: workOut.kg || 0,
              // Duration field could be used for rest, but we'll check schema compatibility
              notes: `Assigned from ${fromDate} to ${toDate}`,
              assignedAt: new Date(),
              updatedAt: new Date(),
            },
          });
        }
      })
    );

    return NextResponse.json(
      { message: "Workout assigned successfully" },
      { status: 200 }
    );
  } catch (err) {
    console.error("Error assigning exercises:", err);
    return NextResponse.json({ 
      error: err instanceof Error ? err.message : "Unknown error"
    }, { status: 500 });
  }
}