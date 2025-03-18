import { getServerSession } from "next-auth/next";
import { NextResponse } from "next/server";
import { options } from "../auth/[...nextauth]/options";
import { SessionUser } from "@/types";
import prisma from "@/app/libs/prismadb";

export async function GET() {
  const session = await getServerSession(options);

  const sessionUser = session?.user as SessionUser;

  if (!sessionUser?.email) {
    return NextResponse.json(
      {
        error: "Not authenticated",
      },
      { status: 401 }
    );
  }

  if (sessionUser.role === "user") {
    return NextResponse.json(
      {
        error: "Not authorized",
      },
      { status: 403 }
    );
  }

  const users = await prisma.user.findMany({
    where: {
      role: "user",
    },
    select: {
      id: true,
      name: true,
      email: true,
      role: true,
      age: true,
      gender: true,
      height: true,
      weight: true,
      createdAt: true,
      updatedAt: true,
    },
  });

  return NextResponse.json({
    status: 200,
    data: users,
  });
}
