// app/api/analytics/courts/route.ts
import { NextResponse } from "next/server";
import prisma from "@/app/libs/prismadb";
import {
	format,
	eachDayOfInterval,
} from "date-fns";
import { getServerSession } from "next-auth";
import { options as authOptions } from "@/app/api/auth/[...nextauth]/options";

interface TimeMap {
  [hour: string]: number;
}

interface CourtMap {
  [courtId: string]: number;
}

interface ClientMap {
  [name: string]: number;
}


export async function GET(
	request: Request
) {
	const session =
		await getServerSession(authOptions);

	if (
		!session?.user?.id ||
		!["admin", "court_manager", 'receptionist'].includes(
			session.user.role as string
		)
	) {
		return NextResponse.json(
			{ error: "No autorizado" },
			{ status: 401 }
		);
	}
	const { searchParams } = new URL(
		request.url
	);
	const start =
		searchParams.get("start");
	const end = searchParams.get("end");

	try {
		const startDate = start
			? new Date(start)
			: new Date(
					Date.now() -
						30 * 24 * 60 * 60 * 1000
			  );
		const endDate = end
			? new Date(end)
			: new Date();
		endDate.setHours(23, 59, 59, 999);

		// Get all courts first to properly calculate utilization even if no reservations
		const allCourts =
			await prisma.court.findMany();
		if (!allCourts.length) {
			return NextResponse.json({
				utilization: 0,
				revenue: 0,
				popularTimes: [],
				popularCourts: [],
				utilizationByDay: [],
				topClients: [],
			});
		}

		// Get confirmed reservations
		const reservations =
			await prisma.courtReservation.findMany(
				{
					where: {
						startTime: {
							gte: startDate,
						},
						endTime: { lte: endDate },
						status: "confirmed",
					},
					include: {
						court: true,
					},
				}
			);

		// Calculate revenue using transactions
		const courtTransactions =
			await prisma.transaction.findMany(
				{
					where: {
						type: "income",
						createdAt: {
							gte: startDate,
							lte: endDate,
						},
						category: {
							contains: "court",
						},
					},
				}
			);

		// Get all court-related revenue, not just those linked to reservations
		const revenue =
			courtTransactions.reduce(
				(acc, t) => acc + t.amount,
				0
			);

		// Calculate popular times
		const popularTimesMap : TimeMap = {};
		reservations.forEach((res) => {
			const hour = new Date(
				res.startTime
			)
				.getHours()
				.toString();
			popularTimesMap[hour] =
				(popularTimesMap[hour] || 0) +
				1;
		});
		const popularTimes = Object.keys(
			popularTimesMap
		)
			.map((hour) => ({
				hour,
				reservations:
					popularTimesMap[hour],
			}))
			.sort(
				(a, b) =>
					parseInt(a.hour) -
					parseInt(b.hour)
			);

		// Calculate court popularity
		const courtsMap : CourtMap  = {};
		reservations.forEach((res) => {
			courtsMap[res.courtId] =
				(courtsMap[res.courtId] || 0) +
				1;
		});

		const popularCourts = allCourts
			.map((court) => {
				return {
					courtId: court.id,
					name: court.name,
					type: court.type,
					reservations:
						courtsMap[court.id] || 0,
				};
			})
			.sort(
				(a, b) =>
					b.reservations -
					a.reservations
			);

		// Calculate utilization by day with all days in range
		const days = eachDayOfInterval({
			start: startDate,
			end: endDate,
		});
		const utilizationByDay = days.map(
			(day) => {
				const dayStr = format(
					day,
					"yyyy-MM-dd"
				);
				const dayReservations =
					reservations.filter(
						(res) =>
							format(
								new Date(res.startTime),
								"yyyy-MM-dd"
							) === dayStr
					);

				const futbolCount =
					dayReservations.filter(
						(res) =>
							res.court.type
								.toLowerCase()
								.includes("futbol") ||
							res.court.type
								.toLowerCase()
								.includes("fútbol")
					).length;

				const padelCount =
					dayReservations.filter(
						(res) =>
							res.court.type
								.toLowerCase()
								.includes("padel") ||
							res.court.type
								.toLowerCase()
								.includes("pádel")
					).length;

				return {
					day: format(day, "dd/MM"),
					futbol: futbolCount,
					padel: padelCount,
				};
			}
		);

		// Find top clients
		const clientsMap: ClientMap  = {};
		reservations.forEach((res) => {
			if (res.name) {
				clientsMap[res.name] =
					(clientsMap[res.name] || 0) +
					1;
			}
		});
		const topClients = Object.entries(
			clientsMap
		)
			.map(([name, reservations]) => ({
				name,
				reservations,
			}))
			.sort(
				(a, b) =>
					b.reservations -
					a.reservations
			)
			.slice(0, 10);

		// Calculate utilization more accurately
		const daysInRange = days.length;
		const hoursPerDay = 14; // Assuming 8am-10pm operation
		const totalPossibleHours =
			allCourts.length *
			daysInRange *
			hoursPerDay;

		// Calculate actual usage hours from reservations
		const usedHours =
			reservations.reduce(
				(total, res) => {
					const startTime = new Date(
						res.startTime
					);
					const endTime = new Date(
						res.endTime
					);
					const hours =
						(endTime.getTime() -
							startTime.getTime()) /
						(1000 * 60 * 60);
					return total + hours;
				},
				0
			);

		const utilization =
			totalPossibleHours > 0
				? Math.max(
						1,
						Math.round(
							(usedHours /
								totalPossibleHours) *
								100
						)
				  )
				: 0;

		return NextResponse.json({
			utilization,
			revenue,
			popularTimes,
			popularCourts,
			utilizationByDay,
			topClients,
		});
	} catch (error) {
		console.error(
			"Error in courts analytics:",
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
