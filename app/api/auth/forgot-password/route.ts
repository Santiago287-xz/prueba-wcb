import Mailgun from "mailgun.js";
import formData from "form-data";
import {NextResponse} from "next/server";
import prismadb from "@/app/libs/prismadb";
import {randomUUID} from "node:crypto";

const API_KEY = process.env.NEXT_PUBLIC_MAILGUN_API_KEY || "";
const MAILGUN_DOMAIN = process.env.NEXT_PUBLIC_MAILGUN_DOMAIN || "";
const mailgun = new Mailgun(formData);
const client = mailgun.client({username: 'api', key: API_KEY});

export async function POST(req: Request) {
    try {
        const body = await req.json();
        const {email} = body;

        if (!email) {
            return NextResponse.json({error: "Email is required"}, {status: 400});
        }

        const user = await prismadb.user.findUnique({where: {email}});

        if (!user) {
            return NextResponse.json({error: "User not found"}, {status: 404});
        }

        const token = await prismadb.passwordResetToken.create({
            data: {
                userId: user.id,
                token: `${randomUUID()}${randomUUID()}`.replace(/-/g, ""),
                resetAt: null
            },
        });

        const DOMAIN = new URL(req.url).origin;

        const messageData = {
            from: `Password Reset <noreply@${MAILGUN_DOMAIN}>`,
            to: email,
            subject: "Reset Password Request",
            text: `
            Hi ${user.name},
            
            someone (hopefully you) requested a password reset for this account. If you did want to reset your password,
            please click here: ${DOMAIN}/password-reset?token=${token.token}
            
            for security reasons, this link is only valid for half hour.
            If you did not request this email, please ignore this email.
        `
        }
        await client.messages.create(MAILGUN_DOMAIN, messageData);
        return NextResponse.json({message: "Email sent successfully", status: 200});
    } catch (e) {
        return NextResponse.json({error: "Something went wrong"}, {status: 500});
    }
}