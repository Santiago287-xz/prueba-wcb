import { NextResponse } from 'next/server';
import { getToken } from 'next-auth/jwt';
import type { NextRequest } from 'next/server';

export async function middleware(request: NextRequest) {
  const token = await getToken({ req: request, secret: process.env.NEXTAUTH_SECRET });
  
  const path = request.nextUrl.pathname;
  
  const protectedRoutes = {
    '/add-user': ['admin'],
    '/attendance': ['admin'],
    '/booking': ['admin', 'court_manager'],
    '/diet': ['admin'],
    '/exercise': ['admin'],
    '/fees': ['admin'],
    '/inventory': ['admin', 'employee'],
    '/manage-user': ['admin'],
    '/notifications': ['admin', 'trainer', 'user', 'employee', 'court_manager'],
    '/products': ['admin', 'employee'],
    '/profile': ['admin', 'trainer', 'user', 'employee', 'court_manager'],
    '/sales': ['admin', 'employee'],
    '/students': ['admin', 'trainer'],
    '/trainers': ['admin', 'trainer'],
    '/user': ['admin', 'trainer', 'user', 'employee', 'court_manager']
  };
  
  const isProtected = Object.keys(protectedRoutes).some(route => 
    path === route || path.startsWith(`${route}/`)
  );
  
  if (isProtected) {
    if (!token) {
      const url = new URL('/auth/signin', request.url);
      url.searchParams.set('callbackUrl', path);
      return NextResponse.redirect(url);
    }
    
    const userRole = token.role as string;
    const allowedRoles = Object.entries(protectedRoutes).find(([route]) => 
      path === route || path.startsWith(`${route}/`)
    )?.[1] || [];
    
    if (!allowedRoles.includes(userRole)) {
      return NextResponse.redirect(new URL('/unauthorized', request.url));
    }
  }
  
  return NextResponse.next();
}

export const config = {
  matcher: [
    '/bookings/:path*',
    '/admin/:path*',
  ],
};