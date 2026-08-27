import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

export function proxy(request: NextRequest) {
  const token = request.cookies.get("accessToken")?.value;
  const { pathname } = request.nextUrl;

  const isProtectedRoute =
    pathname.startsWith("/dashboard") || pathname.startsWith("/profile");
  const isAuthRoute =
    pathname.startsWith("/login") || pathname.startsWith("/signup");

  // Instant root route redirect
  if (pathname === "/") {
    return NextResponse.redirect(
      new URL(token ? "/dashboard" : "/login", request.url),
    );
  }

  // Here we are doing Internal routes protection with instant fallback to login page
  if (isProtectedRoute && !token) {
    const loginUrl = new URL("/login", request.url);
    loginUrl.searchParams.set("from", pathname);
    return NextResponse.redirect(loginUrl);
  }

  // Here we are redirecting authenticated users back to their dashboard instead of asking for login again
  if (isAuthRoute && token) {
    return NextResponse.redirect(new URL("/dashboard", request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/", "/dashboard/:path*", "/profile/:path*", "/login", "/signup"],
};
