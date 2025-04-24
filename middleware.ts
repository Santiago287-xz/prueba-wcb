import { NextRequest, NextResponse } from "next/server";
import { getToken } from "next-auth/jwt";

const PATH_PERMISSIONS = {
  "/add-user": ["admin"],
  "/analytics": ["admin"],
  "/attendance": ["admin", "trainer"],
  "/booking": ["admin", "court_manager"],
  "/categories": ["admin", "court_manager"],
  "/manage-user": ["admin", "trainer"],
  "/rfid-management": ["admin", "receptionist"],
  "/sales": ["admin", "receptionist", "court_manager"],
  "/trainers": ["admin"],
  "/exercise-assignment": ["admin", "trainer"],
  "/profile": ["admin", "trainer", "member", "court_manager", "receptionist"],
  "/notifications": ["admin", "trainer", "member", "court_manager", "receptionist"],
  "/unauthorized": ["admin", "trainer", "member", "court_manager", "receptionist"],
};

const API_PERMISSIONS = {
  "/api/analytics": ["admin"],
  "/api/bookings": ["admin", "court_manager"],
  "/api/sales": ["admin", "receptionist", "court_manager"],
  "/api/sales/inventory/categories": ["admin", "receptionist","court_manager"],
  "/api/sales/inventory/products": ["admin", "receptionist","court_manager"],
  "/api/sales/inventory/stock": ["admin", "receptionist","court_manager"],
  "/api/sales/inventory": ["admin", "receptionist", "court_manager"],
  "/api/courts": ["admin", "court_manager"],
  "/api/events": ["admin", "court_manager"],
  "/api/members": ["admin", "receptionist", "trainer"],
  "/api/members/membersId": ["admin", "receptionist", "trainer"],
  "/api/members/assigned": ["admin", "receptionist", "trainer"],
  "/api/create-user": ["admin", "trainer"],
  "/api/rfid/trainers": ["admin", "receptionist", "trainer"],
  "api/members/rfid/events": ["admin", "receptionist"],
  "/api/payments/stripe": ["member"],
  "/api/rfid": ["admin", "receptionist"],
  "/api/transactions": ["admin"],
  "/api/fitness/exercise": ["admin", "trainer", "member"],
  "/api/fitness/exercise-assignment": ["admin", "trainer"],
  "/api/fitness": ["admin", "trainer"],
};

const PUBLIC_PATHS = ["/signin", "/signup", "/forgot-password", "/password-reset", "/unauthorized", "/uploads"];

export async function middleware(request: NextRequest) {
  let path = request.nextUrl.pathname;

  if (path.startsWith("/_next") || path.startsWith("/favicon.ico") || path.startsWith("/api/auth")) {
    return NextResponse.next();
  }

  if (path.startsWith("/api/")) {
    if (path === "/api/members/rfid/access" && request.method === "POST") {
      return NextResponse.next();
    }

    const token = await getToken({ req: request });
    if (!token) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

    let hasPermission = false;
    for (const [apiPath, roles] of Object.entries(API_PERMISSIONS)) {
      if (path.startsWith(apiPath) && roles.includes(token.role as string)) {
        hasPermission = true;
        break;
      }
    }

    if (!hasPermission) {
      return NextResponse.json({ error: "Acceso denegado", role: token.role, path }, { status: 403 });
    }

    return NextResponse.next();
  }

  if (PUBLIC_PATHS.some((p) => path.startsWith(p))) {
    return NextResponse.next();
  }

  const token = await getToken({ req: request });
  if (!token) return NextResponse.redirect(new URL("/signin", request.url));

  if (path === "/") {
    return NextResponse.next();
  }

  let pathToCheck = path.endsWith("/") && path !== "/" ? path.slice(0, -1) : path;
  if (pathToCheck === "/") {
    return NextResponse.next();
  }

  const exactPath = Object.keys(PATH_PERMISSIONS).find(
    (p) => pathToCheck === p || pathToCheck.startsWith(`${p}/`)
  );

  if (exactPath && PATH_PERMISSIONS[exactPath as keyof typeof PATH_PERMISSIONS].includes(token.role as string)) {
    return NextResponse.next();
  }

  return NextResponse.redirect(new URL("/unauthorized", request.url));
}

export const config = { matcher: ["/((?!_next/static|_next/image|sounds|favicon.ico).*)"] };