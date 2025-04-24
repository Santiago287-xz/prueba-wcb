// app/api/members/count/route.ts
import {
	NextRequest,
	NextResponse,
} from "next/server";
import prisma from "@/app/libs/prismadb";
import { getServerSession } from "next-auth";
import { options as authOptions } from "@/app/api/auth/[...nextauth]/options";

export async function GET(
	req: NextRequest
) {
	const session =
		await getServerSession(authOptions);

	if (
		!session?.user?.id ||
		!["admin", "receptionist"].includes(
			session.user.role as string
		)
	) {
		return NextResponse.json(
			{ error: "No autorizado" },
			{ status: 401 }
		);
	}

	try {
		// Contar todos los usuarios (sin traer sus datos completos)
		const totalMembers =
			await prisma.user.count({
				where: {
					rfidCardNumber: { not: null },
				},
			});

		// Contar usuarios activos (con puntos positivos)
		const activeMembers =
			await prisma.user.count({
				where: {
					rfidCardNumber: { not: null },
					accessPoints: { gt: 0 },
				},
			});

		// Contar usuarios nuevos (último mes)
		const lastMonth = new Date();
		lastMonth.setMonth(
			lastMonth.getMonth() - 1
		);
		const newMembers =
			await prisma.user.count({
				where: {
					rfidCardNumber: { not: null },
					createdAt: { gte: lastMonth },
				},
			});

		return NextResponse.json(
			{
				total: totalMembers,
				active: activeMembers,
				new: newMembers,
				retention:
					totalMembers > 0
						? Math.round(
								(activeMembers /
									totalMembers) *
									100
						  )
						: 0,
			},
			{ status: 200 }
		);
	} catch (error) {
		console.error(
			"Error al obtener conteo de miembros:",
			error
		);
		return NextResponse.json(
			{
				error:
					"Error interno del servidor",
			},
			{ status: 500 }
		);
	}
}
