import { getServerSession } from "next-auth/next";
import { NextResponse } from "next/server";
import { options } from "@/app/api/auth/[...nextauth]/options";
import prisma from "@/app/libs/prismadb";
import { User } from "@prisma/client";

export const dynamic = 'force-dynamic';
export const fetchCache = 'force-no-store';
export const revalidate = 0;

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

export async function GET(request: Request) {
  const session = await getSession();
  const sessionUser = session?.user;

  if (!sessionUser?.email) {
    return NextResponse.json(
      { error: "Not authenticated" },
      { status: 401 }
    );
  }

  if (sessionUser.role === "user") {
    return NextResponse.json(
      { error: "Not authorized" },
      { status: 403 }
    );
  }

  // Usar la URL de Request en lugar de NextApiRequest
  const url = new URL(request.url);
  
  // Parse the "page" and "limit" parameters
  const page = url.searchParams.get("page") || "1";
  const limit = url.searchParams.get("limit") || "10";
  const role = url.searchParams.get("role") || "";
  const search = url.searchParams.get("search") || "";

  const parsedPage = Math.max(parseInt(page, 10), 1);
  const parsedLimit = parseInt(limit, 10);

  // Build query object
  let whereClause: any = {};
  
  // Si hay un filtro de rol, agregarlo a la consulta
  if (role) {
    whereClause.role = role;
  }
  
  // Si hay un término de búsqueda, agregarlo a la consulta
  if (search) {
    whereClause.OR = [
      { name: { contains: search, mode: 'insensitive' } },
      { email: { contains: search, mode: 'insensitive' } }
    ];
  }
  
  // Si el usuario es un entrenador, restringir para mostrar solo usuarios asignados a este entrenador
  if (sessionUser.role === "trainer") {
    whereClause.trainer = sessionUser.id;
  }

  const users = await prisma.user.findMany({
    where: whereClause,
    skip: (parsedPage - 1) * parsedLimit,
    take: parsedLimit,
  });

  users.map((user: User) => (user.hashedPassword = undefined as unknown as any));

  const count = await prisma.user.count({
    where: whereClause
  });

  const onlineUsers = users.filter((user: User) => user.isActive === true);
  const students = users.filter((user: User) => user.role === "user");
  const trainers = users.filter((user: User) => user.role === "trainer");

  const pages = Math.ceil(count / parsedLimit);

  // Adjust the pagination object based on the total number of pages
  const pagination = {
    page: parsedPage,
    limit: parsedLimit,
    next: Math.min(parsedPage + 1, pages),
    previous: Math.max(parsedPage - 1, 1),
    first: 1,
    last: pages,
  };

  return NextResponse.json({
    status: 200,
    data: users,
    onlineUsers: onlineUsers.length,
    students: students.length,
    trainers: trainers.length,
    count,
    pages,
    pagination,
  });
}