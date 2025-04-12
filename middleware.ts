// middleware.ts (updated)
import { withAuth, NextRequestWithAuth } from "next-auth/middleware";
import { NextResponse } from "next/server";

export default withAuth(
  function middleware(request: NextRequestWithAuth) {
    // Add the member role to appropriate routes
    const user =
      request.nextauth.token?.role === "user" &&
      (request.nextUrl.pathname.startsWith("/exercise") ||
        request.nextUrl.pathname.startsWith("/diet") ||
        request.nextUrl.pathname.startsWith("/fees") ||
        request.nextUrl.pathname.startsWith("/add-user") ||
        request.nextUrl.pathname.startsWith("/students"));

    if (user) {
      return NextResponse.rewrite(new URL("/unauthorized", request.url));
    }

    // Allow members to access user routes but not admin routes
    const member =
      request.nextauth.token?.role === "member" &&
      (request.nextUrl.pathname.startsWith("/manage-user") ||
       request.nextUrl.pathname.startsWith("/add-user") ||
       request.nextUrl.pathname.startsWith("/students"));

    if (member) {
      return NextResponse.rewrite(new URL("/unauthorized", request.url));
    }

    const adminOrTrainer =
      request.nextUrl.pathname.startsWith("/user") &&
      request.nextauth.token?.role !== "user" &&
      request.nextauth.token?.role !== "member";

    if (adminOrTrainer) {
      return NextResponse.rewrite(new URL("/unauthorized", request.url));
    }

    const admin =
       request.nextauth.token?.role !== "admin" &&
       request.nextUrl.pathname.startsWith("/manage-user");

    if (admin) {
      return NextResponse.rewrite(new URL("/unauthorized", request.url));
    }

    // Add RFID access management route protection
    const rfidManagement =
       request.nextUrl.pathname.startsWith("/rfid-management") &&
      request.nextauth.token?.role !== "admin" &&
      request.nextauth.token?.role !== "employee";

    if (rfidManagement) {
      return NextResponse.rewrite(new URL("/unauthorized", request.url));
    }
  },
  {
    callbacks: {
      authorized: ({token}) => !!token,
    },
    pages: {
      signIn: '/signin', // Correct signin path
    }
  }
);

export const config = {
  matcher: [
    "/",
    "/api",
    "/add-user",
    "/manage-user",
    "/profile",
    "/notifications",
    "/students/:path*",
    "/trainers/:path*",
    "/fees",
    "/exercise/:path*",
    "/diet/:path*",
    "/user/:path*",
    "/rfid-management/:path*",
  ],
};