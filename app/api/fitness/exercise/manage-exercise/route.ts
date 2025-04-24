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

export async function GET(req: Request) {
  try {
    const session = await getSession();

    if (!session?.user?.id || !['admin', 'trainer'].includes(session.user.role as string)) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    }

    const exercises = await prisma.exerciseList.findMany();

    if (!exercises || exercises.length === 0) {
      return NextResponse.json(
        {
          data: [],
        },
        {
          status: 200,
        }
      );
    }

    return NextResponse.json(
      {
        status: "success",
        data: exercises,
      },
      {
        status: 200,
      }
    );
  } catch (error) {
    return NextResponse.json({ error: error, status: false });
  }
}

export async function POST(req: Request) {
  try {
    const session = await getSession();

    if (!session?.user?.id || !['admin', 'court_manager', 'receptionist'].includes(session.user.role as string)) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    }

    const { name } = await req.json();

    if (!name) {
      return NextResponse.json(
        {
          error: "Invalid exercise name",
        },
        {
          status: 400,
        }
      );
    }

    const exerciseExists = await prisma.exerciseList.findFirst({
      where: { name },
    });

    if (exerciseExists) {
      return NextResponse.json(
        {
          error: "Exercise already exists",
        },
        {
          status: 400,
        }
      );
    }

    const exercise = await prisma.exerciseList.create({
      data: {
        name,
        sets: 0,
        reps: 0,
        trainer: {
          connect: {
            id: session.user.id
          }
        }
      },
    });

    return NextResponse.json(
      {
        status: "success",
        data: exercise,
      },
      { status: 201 }
    );
  } catch (error) {
    return NextResponse.json({ error: error, status: false });
  }
}