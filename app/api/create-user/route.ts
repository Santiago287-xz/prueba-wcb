import { getServerSession } from "next-auth/next";
import { NextResponse } from "next/server";
import { options } from "@/app/api/auth/[...nextauth]/options";
import prisma from "@/app/libs/prismadb";
import { revalidatePath } from "next/cache";
import bcrypt from "bcrypt";

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

export async function POST(
	req: Request
) {
	try {
		const session = await getSession();
		const sessionUser = session?.user;

		if (!sessionUser?.email) {
			return NextResponse.json(
				{
					error: "Not authenticated",
					success: false,
				},
				{ status: 401 }
			);
		}

		if (sessionUser.role === "user") {
			return NextResponse.json(
				{
					error: "Not authorized",
					success: false,
				},
				{ status: 403 }
			);
		}

		const body = await req.json();

		if (!body.email || !body.password) {
			return NextResponse.json(
				{
					error:
						"Missing email or password",
					success: false,
				},
				{ status: 400 }
			);
		}

		// Validar el campo post para recepcionistas y administradores de canchas
		if (
			(body.role === "receptionist" ||
				body.role ===
					"court_manager") &&
			!body.post
		) {
			return NextResponse.json(
				{
					error:
						"El puesto es requerido para recepcionistas y administradores de canchas",
					success: false,
				},
				{ status: 400 }
			);
		}

		const userExists =
			await prisma.user.findUnique({
				where: { email: body.email },
			});

		if (userExists) {
			return NextResponse.json(
				{
					error: "User already exists",
					success: false,
					code: "EMAIL_EXISTS",
				},
				{ status: 409 }
			);
		}

		if (
			sessionUser.role === body.role
		) {
			return NextResponse.json(
				{
					error: `You can't add an ${body.role}`,
					success: false,
				},
				{
					status: 503,
				}
			);
		}

		const hashedPassword =
			await bcrypt.hash(
				body.password,
				12
			);

		const baseUserData = {
			name: body.name,
			email: body.email,
			role: body.role,
			hashedPassword,
			gender: body.gender || "male",
			phone: body.phone || 0,
			age: body.age || 30,
			weight: body.weight || 70,
			height: body.height || 170,
			goal: body.goal || "get_fitter",
			level: body.level || "beginner",
		};

		let userData: any = {
			...baseUserData,
		};

		// Agregar el campo post para recepcionistas y administradores de canchas
		if (
			body.role === "receptionist" ||
			body.role === "court_manager"
		) {
			userData.post = body.post;
		}

		const user =
			await prisma.user.create({
				data: userData,
			});

		const userResponse = { ...user };
		userResponse.hashedPassword =
			undefined as any;

		return NextResponse.json({
			status: 201,
			data: userResponse,
			success: true,
			message: `${body.role} created successfully`,
		});
	} catch (error) {
		console.error(
			"Error creating user:",
			error
		);
		return NextResponse.json(
			{
				error:
					error instanceof Error
						? error.message
						: "Unknown error",
				success: false,
			},
			{
				status: 500,
			}
		);
	}
}

export async function PATCH(
	req: Request
) {
	try {
		const session = await getSession();
		const sessionUser = session?.user;

		if (!session || !sessionUser) {
			return NextResponse.json(
				{
					error: "unauthenticated",
					success: false,
				},
				{
					status: 401,
				}
			);
		}

		const body = await req.json();

		if (
			sessionUser?.role === "admin" &&
			body.trainerId &&
			body.userId &&
			body.trainerId !== body.userId
		) {
			const user =
				await prisma.user.findUnique({
					where: {
						id: body.userId as string,
					},
				});

			const trainer =
				await prisma.user.findUnique({
					where: {
						id: body.trainerId as string,
					},
				});

			if (!user || !trainer) {
				return NextResponse.json(
					{
						error:
							"No user or trainer found in the list!!!",
						success: false,
					},
					{
						status: 400,
					}
				);
			}

			const updateUser =
				await prisma.user.update({
					where: {
						id: user.id,
					},
					data: {
						trainer: trainer.id,
					},
				});

			if (!updateUser) {
				return NextResponse.json({
					error:
						"Something is wrong to update the trainer",
					success: false,
				});
			}

			return NextResponse.json(
				{
					message:
						"User updated successfully",
					success: true,
				},
				{
					status: 201,
				}
			);
		} else if (
			sessionUser?.role === "trainer" &&
			body.trainerId &&
			body.userId &&
			body.trainerId !== body.userId
		) {
			return NextResponse.json(
				{
					error:
						"You can't update the trainer",
					success: false,
				},
				{
					status: 400,
				}
			);
		} else if (
			sessionUser?.role === "user" &&
			body.trainerId &&
			body.userId &&
			body.trainerId !== body.userId
		) {
			return NextResponse.json(
				{
					error:
						"You can't update the trainer",
					success: false,
				},
				{
					status: 400,
				}
			);
		} else {
			if (body.email) {
				return NextResponse.json(
					{
						error:
							"You can't update the email",
						success: false,
					},
					{
						status: 400,
					}
				);
			}

			const user =
				await prisma.user.findUnique({
					where: {
						id: sessionUser.id,
					},
				});

			if (!user) {
				return NextResponse.json(
					{
						error: "User not found",
						success: false,
					},
					{
						status: 400,
					}
				);
			}

			let hashedPassword =
				user.hashedPassword;

			if (body.password) {
				hashedPassword =
					await bcrypt.hash(
						body.password,
						12
					);
			}

			const userUpdate =
				await prisma.user.update({
					where: {
						id: sessionUser.id,
					},
					data: {
						name:
							body.name !== ""
								? body.name
								: user.name,
						age:
							body.age !== ""
								? body.age
								: user.age,
						weight:
							body.weight !== ""
								? body.weight
								: user.weight,
						height:
							body.height !== ""
								? body.height
								: user.height,
						goal:
							body.goal !== ""
								? body.goal
								: user.goal,
						level:
							body.level !== ""
								? body.level
								: user.level,
						phone:
							body.phone !== ""
								? body.phone
								: user.phone,
						hashedPassword,
						isActive: body.isActive,
					},
				});

			if (!userUpdate) {
				return NextResponse.json(
					{
						error: "Updating failed",
						success: false,
					},
					{
						status: 400,
					}
				);
			}

			if (body.isActive) {
				revalidatePath("/");
			}

			return NextResponse.json(
				{
					message:
						"Updated successfully",
					success: true,
				},
				{
					status: 200,
				}
			);
		}
	} catch (err: Error | any) {
		console.error(err);
		return NextResponse.json(
			{
				error: err.message,
				success: false,
			},
			{
				status: 500,
			}
		);
	}
}
