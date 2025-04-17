// app/api/transactions/route.ts
import {
	NextRequest,
	NextResponse,
} from "next/server";
import prisma from "@/app/libs/prismadb";
import { getServerSession } from "next-auth/next";
import { options as authOptions } from "../auth/[...nextauth]/options";
export async function GET(
	req: NextRequest
) {
	const { searchParams } = new URL(
		req.url
	);
	const start =
		searchParams.get("start");
	const end = searchParams.get("end");
	const category =
		searchParams.get("category");
	const type = searchParams.get("type");
	const paymentMethod =
		searchParams.get("paymentMethod");

	try {
		// Build query filters
		const filters: any = {};

		if (start && end) {
			filters.createdAt = {
				gte: new Date(start),
				lte: new Date(end),
			};
		}

		if (category)
			filters.category = category;
		if (type) filters.type = type;
		if (paymentMethod)
			filters.paymentMethod =
				paymentMethod;

		// Get transactions
		const transactions =
			await prisma.transaction.findMany(
				{
					where: filters,
					orderBy: {
						createdAt: "desc",
					},
					include: {
						user: {
							select: {
								id: true,
								name: true,
								email: true,
							},
						},
					},
				}
			);
		// Calculate summary stats
		const incomeTransactions =
			transactions.filter(
				(t) => t.type === "income"
			);
		const expenseTransactions =
			transactions.filter(
				(t) => t.type === "expense"
			);
		const cashTransactions =
			transactions.filter(
				(t) =>
					t.paymentMethod === "cash"
			);

		const totalIncome =
			incomeTransactions.reduce(
				(sum, t) => sum + t.amount,
				0
			);
		const totalExpense =
			expenseTransactions.reduce(
				(sum, t) => sum + t.amount,
				0
			);
		const cashTotal =
			cashTransactions.reduce(
				(sum, t) => sum + t.amount,
				0
			);

		// Group by category
		const categorySums: Record<
			string,
			number
		> = {};
		transactions.forEach((t) => {
			if (!categorySums[t.category])
				categorySums[t.category] = 0;
			categorySums[t.category] +=
				t.amount;
		});

		const totalAmount = Object.values(
			categorySums
		).reduce(
			(sum, val) => sum + val,
			0
		);

		const categoryData = Object.entries(
			categorySums
		).map(([category, total]) => ({
			category,
			total: Math.round(
				(total / totalAmount) * 100
			),
		}));

		// Group by month
		const monthlyData: Record<
			string,
			{
				income: number;
				expense: number;
			}
		> = {};

		transactions.forEach((t) => {
			const month = new Date(
				t.createdAt
			)
				.toISOString()
				.slice(0, 7);

			if (!monthlyData[month]) {
				monthlyData[month] = {
					income: 0,
					expense: 0,
				};
			}

			if (t.type === "income") {
				monthlyData[month].income +=
					t.amount;
			} else {
				monthlyData[month].expense +=
					t.amount;
			}
		});

		const trendData = Object.entries(
			monthlyData
		)
			.map(([month, data]) => ({
				month,
				income: data.income,
				expense: data.expense,
			}))
			.sort((a, b) =>
				a.month.localeCompare(b.month)
			);

		return NextResponse.json({
			transactions,
			summary: {
				totalIncome,
				totalExpense,
				balance:
					totalIncome - totalExpense,
				cashTotal,
				incomeCount:
					incomeTransactions.length,
				expenseCount:
					expenseTransactions.length,
				cashCount:
					cashTransactions.length,
			},
			chartData: {
				categoryData,
				trendData,
			},
		});
	} catch (error) {
		console.error("Error:", error);
		return NextResponse.json(
			{
				error:
					"Error interno del servidor",
			},
			{ status: 500 }
		);
	}
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const {
      type,
      category,
      amount,
      description,
      paymentMethod,
      location,
      saleId,
      reservationId,
      membershipId
    } = body;

    // Get authenticated user from session
    const session = await getServerSession(authOptions);
    const currentUserId = session?.user?.id;

    // Validation
    if (!type || !category || amount === undefined || !paymentMethod) {
      return NextResponse.json({ error: "Faltan datos requeridos" }, { status: 400 });
    }

    if (amount <= 0) {
      return NextResponse.json({ error: "El monto debe ser mayor que cero" }, { status: 400 });
    }

    // Create transaction data
    const transactionData: any = {
      type,
      category,
      amount,
      paymentMethod
    };

    // Add optional fields
    if (description) transactionData.description = description;
    if (location) transactionData.location = location;
    
    // Connect the transaction to the current user
    if (currentUserId) {
      transactionData.user = { connect: { id: currentUserId } };
    }

    // Add references if provided
    if (saleId) transactionData.sale = { connect: { id: saleId } };
    if (reservationId) transactionData.reservation = { connect: { id: reservationId } };
    if (membershipId) transactionData.membership = { connect: { id: membershipId } };

    // Create transaction
    const transaction = await prisma.transaction.create({
      data: transactionData
    });

    return NextResponse.json(transaction, { status: 201 });
  } catch (error) {
    console.error('Error:', error);
    return NextResponse.json({ error: "Error al crear la transacción" }, { status: 500 });
  }
}