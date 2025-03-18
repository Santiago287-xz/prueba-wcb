import {NextResponse} from "next/server";
import prismadb from "@/app/libs/prismadb";

import bcrypt from "bcrypt";


export async function POST(req: Request) {
    try {
        const body = await req.json();
        const {password, confirmPassword, token} = body;

        if (!password || !confirmPassword || !token) {
            return NextResponse.json(
                {
                    error: "Missing password, confirmPassword or token",
                },
                {status: 400}
            );
        }

        if (password !== confirmPassword) {
            return NextResponse.json(
                {
                    error: "Passwords do not match",
                },
                {status: 400}
            );
        }

        const passwordResetToken = await prismadb.passwordResetToken.findUnique({
            where: {
                token,
                createdAt: {
                    gt: new Date(Date.now() - 30 * 60 * 1000)
                },
                resetAt: null
            }
        })


        if (!passwordResetToken) {
            return NextResponse.json(
                {
                    error: "Invalid token",
                },
                {status: 400}
            );
        }

        const user = await prismadb.user.findUnique({
            where: {
                id: passwordResetToken.userId
            }
        })

        if (!user) {
            return NextResponse.json(
                {
                    error: "Invalid token",
                },
                {status: 400}
            );
        }

        const hashedPassword = await bcrypt.hash(password, 12);

        await prismadb.user.update({
            where: {
                id: user.id
            },
            data: {
                hashedPassword
            }
        })


        await prismadb.passwordResetToken.update({
            where: {
                id: passwordResetToken.id
            },
            data: {
                resetAt: new Date()
            }
        })

        return NextResponse.json(
            {
                message: "Password reset successfully",
            },
            {status: 200}
        );


    } catch (error: Error | any) {
        return NextResponse.json(
            {
                error: error.message,
            },
            {status: 500}
        );
    }
}