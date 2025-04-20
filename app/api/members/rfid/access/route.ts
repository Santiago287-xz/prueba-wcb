import {
	NextRequest,
	NextResponse,
} from "next/server";
import prisma from "@/app/libs/prismadb";
import { broadcastEvent } from "@/app/libs/broadcast";

const API_KEY =
	process.env.RFID_API_KEY ||
	"your_secret_api_key";
const TOLERANCE_MINUTES = 20; // Período de tolerancia de 20 minutos

export async function POST(
	req: NextRequest
) {
	const authHeader = req.headers.get(
		"authorization"
	);
	// Verificar API key para dispositivos externos (Arduino)
	const isExternalDevice =
		authHeader &&
		authHeader.startsWith("Bearer ") &&
		authHeader.substring(7) === API_KEY;

	// Si no es un dispositivo externo, verificar si es una solicitud interna del sistema
	if (!isExternalDevice) {
		const origin =
			req.headers.get("origin") || "";
		const isInternalRequest =
			origin.includes(
				req.headers.get("host") || ""
			);

		if (!isInternalRequest) {
			return NextResponse.json(
				{ error: "Unauthorized" },
				{ status: 401 }
			);
		}
	}

	try {
		const body = await req.json();
		const {
			rfidCardNumber,
			deviceId = "entrance",
		} = body;

		if (!rfidCardNumber) {
			return NextResponse.json(
				{
					error:
						"RFID card number is required",
				},
				{ status: 400 }
			);
		}
		const user =
			await prisma.user.findFirst({
				where: { rfidCardNumber },
			});
		const now = new Date();

		let accessStatus:
			| "allowed"
			| "denied"
			| "warning" = "denied";
		let reason: string | null =
			"Tarjeta RFID no registrada";
		let pointsDeducted = 0;
		let isToleranceEntry = false;

		if (user) {
			// Verificar último acceso para determinar si está dentro del período de tolerancia
			const lastLog =
				await prisma.accessLog.findFirst(
					{
						where: {
							userId: user.id,
						},
						orderBy: {
							timestamp: "desc",
						},
					}
				);

			if (lastLog) {
				const lastAccessTime = new Date(
					lastLog.timestamp
				);
				const diffMinutes =
					(now.getTime() -
						lastAccessTime.getTime()) /
					(1000 * 60);

				// Si está dentro del período de tolerancia, no reducir puntos
				if (
					diffMinutes <=
					TOLERANCE_MINUTES
				) {
					isToleranceEntry = true;
				}
			}

			// Verificar puntos de acceso disponibles
			if (user.accessPoints > 0) {
				accessStatus = "allowed";
				reason = null;

				// Solo deducir puntos si no está en período de tolerancia
				if (!isToleranceEntry) {
					pointsDeducted = 1;

					// Actualizar puntos de acceso del usuario
					await prisma.user.update({
						where: { id: user.id },
						data: {
							accessPoints: {
								decrement: 1,
							},
							lastCheckIn: now,
						},
					});
				} else {
					// Actualizar solo lastCheckIn si está en período de tolerancia
					await prisma.user.update({
						where: { id: user.id },
						data: { lastCheckIn: now },
					});
				}
			} else {
				accessStatus = "warning";
				reason =
					"Sin puntos de acceso disponibles";
			}
		} else {
			NextResponse.json(
				{
					error:
						"Ningun usuario encontrado",
				},
				{ status: 404 }
			);
		}

		// Crear entrada en el registro de acceso
		await prisma.accessLog.create({
			data: {
				...(user?.id
					? { userId: user.id }
					: {}),
				status: accessStatus,
				reason,
				deviceId,
				pointsDeducted,
				isToleranceEntry,
			},
		});

		try {
			broadcastEvent({
				type: accessStatus,
				message:
					reason ||
					(isToleranceEntry
						? "Acceso permitido (tolerancia)"
						: "Acceso permitido"),
				user: user
					? {
							id: user.id,
							name: user.name,
							email: user.email,
							accessPoints:
								user.accessPoints -
								(isToleranceEntry
									? 0
									: pointsDeducted),
							membershipStatus:
								user.membershipStatus,
					  }
					: null,
				pointsDeducted,
				isToleranceEntry,
				cardNumber: rfidCardNumber,
				deviceId,
				timestamp: now.toISOString(),
			});
		} catch (error) {
			console.error(
				"🔴 Error during broadcast:",
				error
			);
		}

		return NextResponse.json({
			status: accessStatus,
			message:
				reason ||
				(isToleranceEntry
					? "Acceso permitido (tolerancia)"
					: "Acceso permitido"),
			pointsDeducted,
			isToleranceEntry,
			pointsRemaining: user
				? user.accessPoints -
				  (isToleranceEntry
						? 0
						: pointsDeducted)
				: 0,
			timestamp: now.toISOString(),
		});
	} catch (error) {
		console.error(
			"Error processing RFID access:",
			error
		);
		return NextResponse.json(
			{
				error: "Internal server error",
			},
			{ status: 500 }
		);
	}
}
