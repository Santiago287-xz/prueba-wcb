import { NextResponse } from "next/server";
import prisma from "@/app/libs/prismadb";
import { getSession } from "../../users/route";
import { SessionUser } from "@/types";

export async function GET() {
  try {
    const session = await getSession();
    const sessionUser = session?.user as SessionUser;

    if (!session) {
      return NextResponse.json(
        { error: "Unauthenticated" },
        {
          status: 401,
        }
      );
    }

    if (sessionUser.role !== "user") {
      return NextResponse.json(
        {
          error: "Unauthorized",
        },
        {
          status: 403,
        }
      );
    }

    const attendances = await prisma.attendance.findMany({
      where: {
        studentId: sessionUser.id,
      },
      include: {
        student: {
          select: {
            id: true,
            name: true,
            email: true,
            image: true,
          },
        },
      },
    });

    if (!attendances || attendances.length === 0) {
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
        data: attendances,
      },
      {
        status: 200,
      }
    );
  } catch (err: Error | any) {
    return NextResponse.json(
      {
        error: err.message,
      },
      {
        status: err.status,
      }
    );
  }
}

export async function PATCH() {
  try {
    const session = await getSession();
    const sessionUser = session?.user as SessionUser;
    
    if (!session) {
      return NextResponse.json(
        { error: "Unauthenticated" },
        {
          status: 401,
        }
      );
    }
    
    const today = new Date();
    
    const toDayHour = Number(today.getHours()) + 6;
    const toDayMin = Number(today.getMinutes());
    
    const attendanceExist = await prisma.attendance.findFirst({
      where: {
        studentId: sessionUser.id,
        date: new Date().toISOString().split("T")[0],
        isPresent: false,
      },
    });
    
    if (!attendanceExist) {
      return NextResponse.json(
        {
          error: "Attendance Unavailable",
        },
        {
          status: 400,
        }
      );
    }
    
    const fTimeHour = Number(attendanceExist.fromTime.toString().split(":")[0]);
    const fTimeMin = Number(attendanceExist.fromTime.toString().split(":")[1]);
    
    const tTimeHour = Number(attendanceExist.toTime.toString().split(":")[0]);
    const tTimeMin = Number(attendanceExist.toTime.toString().split(":")[1]);
    
    // Convert all times to minutes for easier comparison
    const currentTimeInMinutes = toDayHour * 60 + toDayMin;
    const fromTimeInMinutes = fTimeHour * 60 + fTimeMin;
    const toTimeInMinutes = tTimeHour * 60 + tTimeMin;
    
    // Allow 5 minutes early and 10 minutes late
    const earliestAllowedTime = fromTimeInMinutes - 5;
    const latestAllowedTime = toTimeInMinutes + 10;
    
    if (currentTimeInMinutes < earliestAllowedTime || currentTimeInMinutes > latestAllowedTime) {
      return NextResponse.json(
        {
          error: "You are not allowed to mark attendance at this time",
        },
        {
          status: 400,
        }
      );
    }
    
    const attendance = await prisma.attendance.update({
      where: {
        id: attendanceExist.id,
      },
      data: {
        isPresent: true,
      },
    });
    
    return NextResponse.json(
      {
        data: attendance,
      },
      {
        status: 200,
      }
    );
  } catch (err: Error | any) {
    return NextResponse.json(
      {
        error: err.message,
      },
      {
        status: err.status,
      }
    );
  }
}