// app/api/members/rfid/assign/route.ts
import {
	NextRequest,
	NextResponse,
} from "next/server";
import prisma from "@/app/libs/prismadb";
import { getServerSession } from "next-auth";
import { options as authOptions } from "@/app/api/auth/[...nextauth]/options";

export async function POST(
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
		const {
			userId,
			rfidCardNumber,
			membershipType,
			accessPoints,
			trainer,
		} = (await req.json()) as {
			userId: string;
			rfidCardNumber: string;
			membershipType?: string;
			accessPoints?: number;
			trainer?: string;
		};
		if (!userId || !rfidCardNumber) {
			return NextResponse.json(
				{
					error:
						"Usuario y número de tarjeta RFID son requeridos",
				},
				{ status: 400 }
			);
		}

		// Check if the RFID card is already assigned to another user
		const existingCard =
			await prisma.user.findFirst({
				where: {
					rfidCardNumber,
					id: { not: userId },
				},
			});

		if (existingCard) {
			return NextResponse.json(
				{
					error:
						"Esta tarjeta RFID ya está asignada a otro usuario",
				},
				{ status: 400 }
			);
		}

		// Update user with RFID information
		const updateData: any = {
			rfidCardNumber,
			rfidAssignedAt: new Date(),
			isActive: true,
		};

		// Add optional fields if provided
		if (membershipType) {
			updateData.membershipType =
				membershipType;
		}

		if (accessPoints !== undefined) {
			updateData.accessPoints =
				accessPoints;
			// Update membership status based on points
			updateData.membershipStatus =
				accessPoints > 0
					? "active"
					: "expired";
		}
		if (trainer) {
			updateData.trainer = trainer;
		}
		const user =
			await prisma.user.update({
				where: { id: userId },
				data: updateData,
			});

		return NextResponse.json(
			{
				message:
					"Tarjeta RFID asignada correctamente",
				user,
			},
			{ status: 200 }
		);
	} catch (error) {
		console.error(
			"Error al asignar tarjeta RFID:",
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
