// middleware.ts
import { NextRequest, NextResponse } from "next/server";
import { getToken } from "next-auth/jwt";

// Exact mapping of paths to allowed roles
const PATH_PERMISSIONS = {
  // Admin-only paths
  '/add-user': ['admin'],
  '/analytics': ['admin'],
  '/attendance': ['admin', 'trainer'],
  '/booking': ['admin', 'employee', 'court_manager'],
  '/categories': ['admin', 'court_manager'],
  '/manage-user': ['admin'],
  '/rfid-management': ['admin', 'employee'],
  '/sales': ['admin', 'employee'],
  '/trainers': ['admin'],
  
  // Member paths
  '/user': ['member'],
  
  // Shared paths
  '/profile': ['admin', 'trainer', 'member', 'employee', 'court_manager'],
  '/notifications': ['admin', 'trainer', 'member', 'employee', 'court_manager'],
  '/(auth)/unauthorized': ['admin', 'trainer', 'member', 'employee', 'court_manager', 'receptionist'],
};

// API permissions
const API_PERMISSIONS = {
  '/api/analytics': ['admin', 'employee'],
  '/api/attendance': ['admin', 'trainer'],
  '/api/bookings': ['admin', 'employee', 'court_manager'],
  '/api/categories': ['admin', 'court_manager'],
  '/api/courts': ['admin', 'employee', 'court_manager'],
  '/api/events': ['admin', 'employee', 'court_manager'],
  '/api/inventory': ['admin', 'employee'],
  '/api/members': ['admin', 'employee'],
  '/api/notification': ['admin', 'trainer', 'member', 'employee', 'court_manager'],
  '/api/payment': ['member'],
  '/api/rfid': ['admin', 'employee'],
  '/api/sales': ['admin', 'employee'],
  '/api/transactions': ['admin'],
  '/api/users': ['admin'],
};

// Public paths that don't require auth
const PUBLIC_PATHS = [
  '/signin',
  '/signup',
  '/forgot-password',
  '/password-reset',
  '/(auth)/unauthorized', // Make unauthorized page accessible
];

export async function middleware(request: NextRequest) {
  const path = request.nextUrl.pathname;
  
  // Ignore static files and specific API paths
  if (
    path.startsWith('/_next') || 
    path.startsWith('/favicon.ico') ||
    path.startsWith('/api/auth')
  ) {
    return NextResponse.next();
  }
  
  // Get user's token
  const token = await getToken({ req: request });
  const role = token?.role as string;

  // Allow access to unauthorized page without redirection
  if (path === '/(auth)/unauthorized') {
    return NextResponse.next();
  }

  // Handle API routes
  if (path.startsWith('/api/')) {
    // If no token, reject
    if (!token) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    }
    
    // Check API permissions
    let hasPermission = false;
    for (const [apiPath, roles] of Object.entries(API_PERMISSIONS)) {
      if (path.startsWith(apiPath) && roles.includes(role)) {
        hasPermission = true;
        break;
      }
    }
    
    if (!hasPermission) {
      return NextResponse.json({ error: "Acceso denegado" }, { status: 403 });
    }
    
    return NextResponse.next();
  }
  
  // Handle page routes
  
  // Allow public paths
  if (PUBLIC_PATHS.some(p => path.startsWith(p))) {
    return NextResponse.next();
  }
  
  // Redirect to login if not authenticated
  if (!token) {
    return NextResponse.redirect(new URL('/signin', request.url));
  }
  
  // Check exact page permissions
  let pathToCheck = path;
  // Remove trailing slash if present
  if (pathToCheck.endsWith('/') && pathToCheck !== '/') {
    pathToCheck = pathToCheck.slice(0, -1);
  }
  // If path is root, allow (dashboard)
  if (pathToCheck === '/') {
    return NextResponse.next();
  }
  
  // For all other paths, check against exact permissions
  const exactPath = Object.keys(PATH_PERMISSIONS).find(p => 
    pathToCheck === p || pathToCheck.startsWith(`${p}/`)
  );
  
  if (exactPath && PATH_PERMISSIONS[exactPath].includes(role)) {
    return NextResponse.next();
  }
  
  // Access denied - redirect to unauthorized page in auth folder
  return NextResponse.redirect(new URL('/unauthorized', request.url));
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
};