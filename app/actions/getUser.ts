import prisma from "@/app/libs/prismadb";
export const dynamic = "force-dynamic";

interface IParams {
  userId?: string;
}

export default async function getUser(params: IParams) {
  try {
    const { userId } = params;

    if (!userId) {
      throw new Error("User id is required");
    }

    const fetchedUser = await prisma?.user?.findUnique({
      where: {
        id: userId,
      },
      include: {
        admin: {
          select: {
            id: true,
            name: true,
            email: true,
            image: true,
          },
        },
        trainer: {
          select: {
            id: true,
            name: true,
            email: true,
            image: true,
          },
        },
      },
    });

    if (!fetchedUser) {
      throw new Error("User not found");
    }

    fetchedUser.hashedPassword = undefined as any;

    return fetchedUser;
  } catch (error: any) {
    throw new Error(error);
  }
}
