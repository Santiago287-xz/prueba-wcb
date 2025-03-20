import { NextRequest, NextResponse } from "next/server";
import prisma from "@/app/libs/prismadb";

// GET: Listar todas las canchas disponibles
export async function GET(req: NextRequest) {
  const courts = await prisma.court.findMany();
  return NextResponse.json(courts, { status: 200 });
}