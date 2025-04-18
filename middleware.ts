import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

// Define protected routes that require authentication
const protectedRoutes = ["/dashboard", "/summary", "/account"];

// Define auth routes
const authRoutes = ["/auth/login", "/auth/signup"];

export function middleware(request: NextRequest) {
  const token = request.cookies.get("authToken")?.value || "";
  const { pathname } = request.nextUrl;

  // Check if the path starts with any of the protected routes
  const isProtectedRoute = protectedRoutes.some(
    (route) => pathname.startsWith(route) || pathname === route
  );

  // Handle API routes separately - we don't want to redirect these
  if (pathname.startsWith("/api/")) {
    return NextResponse.next();
  }

  // Check authentication for protected routes
  if (isProtectedRoute) {
    // If no token exists, redirect to login
    if (!token) {
      return NextResponse.redirect(new URL("/auth/login", request.url));
    }
  }

  // If user is already logged in and tries to access auth routes
  const isAuthRoute = authRoutes.some((route) => pathname === route);
  if (isAuthRoute && token) {
    return NextResponse.redirect(new URL("/dashboard", request.url));
  }

  return NextResponse.next();
}

// Match all routes except for static files, api routes, and _next
export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:jpg|jpeg|gif|png)|api).*)",
  ],
};
