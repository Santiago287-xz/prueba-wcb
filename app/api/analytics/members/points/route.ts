// app/api/members/points.ts - API to get member points info
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

	const { searchParams } = new URL(
		req.url
	);
	const start =
		searchParams.get("start");
	const end = searchParams.get("end");

	const startDate = start
		? new Date(start)
		: new Date(
				Date.now() -
					30 * 24 * 60 * 60 * 1000
		  );
	const endDate = end
		? new Date(end)
		: new Date();

	try {
		// Get total members count
		const totalMembers =
			await prisma.user.count({
				where: {
					role: "member",
					rfidCardNumber: { not: null },
				},
			});

		// Get points-related transactions
		const pointsTransactions =
			await prisma.transaction.findMany(
				{
					where: {
						type: "income",
						category: {
							contains: "membership",
						},
						createdAt: {
							gte: startDate,
							lte: endDate,
						},
					},
				}
			);

		// Calculate total points revenue
		const pointsRevenue =
			pointsTransactions.reduce(
				(total, transaction) =>
					total + transaction.amount,
				0
			);

		// Get new members this month
		const oneMonthAgo = new Date();
		oneMonthAgo.setMonth(
			oneMonthAgo.getMonth() - 1
		);

		const newMembers =
			await prisma.user.count({
				where: {
					role: "member",
					createdAt: {
						gte: oneMonthAgo,
					},
				},
			});

		// Get active members (with positive points)
		const activeMembers =
			await prisma.user.count({
				where: {
					role: "member",
					accessPoints: { gt: 0 },
				},
			});

		// Calculate retention (active/total)
		const retention =
			totalMembers > 0
				? Math.round(
						(activeMembers /
							totalMembers) *
							100
				  )
				: 0;
		// Return compiled data
		return NextResponse.json(
			{
				totalMembers,
				activeMembers,
				newThisMonth: newMembers,
				pointsRevenue,
				retention,
				pointsTransactions:
					pointsTransactions.length,
			},
			{ status: 200 }
		);
	} catch (error) {
		console.error(
			"Error obtaining points information:",
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
