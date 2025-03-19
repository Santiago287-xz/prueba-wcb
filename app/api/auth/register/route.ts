import { NextResponse } from "next/server";
import bcrypt from "bcrypt";
import prisma from "@/app/libs/prismadb";

export async function POST(req: Request) {
  const body = await req.json();

  const { name, email, password, role, gender } = body;

  const hashedPassword = await bcrypt.hash(password, 12);

  const user = await prisma.user.create({
    data: {
      email,
      name,
      role,
      hashedPassword,
      gender,
    },
  });

  user.hashedPassword = undefined as any;

  return NextResponse.json(user);
}
