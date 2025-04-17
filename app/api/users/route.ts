import bcrypt from "bcrypt";
import { getServerSession } from "next-auth/next";
import { NextResponse } from "next/server";
import { options } from "@/app/api/auth/[...nextauth]/options";
import { SessionUser } from "@/types";
import prisma from "@/app/libs/prismadb";
import { User } from "@prisma/client";
import { revalidatePath } from "next/cache";

export async function getSession() {
  try {
    return await getServerSession(options);
  } catch (error) {
    console.error("Error while fetching session:", error);
    return null;
  }
}

export async function GET(request: Request) {
  const session = await getSession();
  const sessionUser = session?.user as SessionUser;

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

// Resto del código POST y PATCH sin cambios...
export async function POST(req: Request) {
    try {
        const session = await getSession();
        const sessionUser = session?.user as SessionUser;

        if (!sessionUser?.email) {
            return NextResponse.json(
                {
                    error: "Not authenticated",
                },
                {status: 401}
            );
        }

        if (sessionUser.role === "user") {
            return NextResponse.json(
                {
                    error: "Not authorized",
                },
                {status: 403}
            );
        }

        const body = await req.json();

        if (!body.email || !body.password) {
            return NextResponse.json(
                {
                    error: "Missing email or password",
                },
                {status: 400}
            );
        }

        const userExists = await prisma.user.findUnique({
            where: {email: body.email},
        });

        if (userExists) {
            return NextResponse.json(
                {
                    error: "User already exists",
                },
                {status: 409}
            );
        }

        if (sessionUser.role === body.role) {
            return NextResponse.json({
                error: `You can't add an ${body.role}`
            }, {
                status: 503
            });
        }

        const hashedPassword = await bcrypt.hash(body.password, 12);

        // Crear el objeto de datos para usuario
        const userData = {
            name: body.name,
            email: body.email,
            role: body.role,
            hashedPassword,
            gender: body.gender || "male",
            phone: body.phone || 0,
            // Asignar valores por defecto para campos requeridos
            age: body.age || 30,
            weight: body.weight || 70,
            height: body.height || 170,
            goal: body.goal || "get_fitter",
            level: body.level || "beginner",
            // No intentamos asignar adminId ni trainerId
        };

        const user = await prisma.user.create({
            data: userData
        });

        // Remover el password hasheado de la respuesta
        const userResponse = { ...user };
        userResponse.hashedPassword = undefined as any;

        return NextResponse.json({
            status: 201,
            data: userResponse,
        });
    } catch (error) {
        console.error("Error creating user:", error);
        return NextResponse.json({
            error: error instanceof Error ? error.message : "Unknown error"
        }, {
            status: 500
        });
    }
}

export async function PATCH(req: Request) {
    try {
        const session = await getSession();
        const sessionUser = session?.user as SessionUser;

        if (!session || !sessionUser) {
            return NextResponse.json({
                error: "unauthenticated"
            }, {
                status: 401,
            })
        }

        const body = await req.json();

        if (sessionUser?.role === 'admin' && body.trainerId && body.userId && body.trainerId !== body.userId) {
            const user = await prisma.user.findUnique({
                where: {
                    id: body.userId as string
                }
            })

            const trainer = await prisma.user.findUnique({
                where: {
                    id: body.trainerId as string
                }
            })

            if (!user || !trainer) {
                return NextResponse.json({
                    error: "No user or trainer found in the list!!!"
                }, {
                    status: 400
                })
            }

            const updateUser = await prisma.user.update({
                where: {
                    id: user.id
                }, data: {
                    trainer: trainer.id // Actualizado para usar 'trainer' en lugar de 'trainerId'
                }
            })

            if (!updateUser) {
                return NextResponse.json({
                    error: "Something is wrong to update the trainer"
                })
            }

            return NextResponse.json({
                message: "User updated successfully"
            }, {
                status: 201
            })
        } else if (sessionUser?.role === 'trainer' && body.trainerId && body.userId && body.trainerId !== body.userId) {
            return NextResponse.json({
                error: "You can't update the trainer"
            }, {
                status: 400
            })
        } else if (sessionUser?.role === 'user' && body.trainerId && body.userId && body.trainerId !== body.userId) {
            return NextResponse.json({
                error: "You can't update the trainer"
            }, {
                status: 400
            })
        } else {
            if (body.email) {
                return NextResponse.json({
                    error: "You can't update the email"
                }, {
                    status: 400
                })
            }

            const user = await prisma.user.findUnique({
                where: {
                    id: sessionUser.id
                }
            })

            if (!user) {
                return NextResponse.json({
                    error: "User not found"
                }, {
                    status: 400
                })
            }

            let hashedPassword = user.hashedPassword;

            if (body.password) {
                hashedPassword = await bcrypt.hash(body.password, 12);
            }

            const userUpdate = await prisma.user.update({
                where: {
                    id: sessionUser.id
                },
                data: {
                    name: body.name !== "" ? body.name : user.name,
                    age: body.age !== "" ? body.age : user.age,
                    weight: body.weight !== "" ? body.weight : user.weight,
                    height: body.height !== "" ? body.height : user.height,
                    goal: body.goal !== "" ? body.goal : user.goal,
                    level: body.level !== "" ? body.level :  user.level,
                    phone: body.phone !== "" ? body.phone : user.phone,
                    hashedPassword,
                    isActive: body.isActive
                }
            })

            if (!userUpdate) {
                return NextResponse.json({
                    error: "Updating failed"
                }, {
                    status: 400
                })
            }

            if (body.isActive) {
                revalidatePath("/")
            }

            return NextResponse.json({
                message: "Updated successfully"
            }, {
                status: 200
            })
        }
    } catch (err: Error | any) {
        console.error(err)
        return NextResponse.json({
            error: err.message
        }, {
            status: 500
        })
    }
}