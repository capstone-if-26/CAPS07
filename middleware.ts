import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

const ALLOWED_ORIGIN = process.env.NEXT_PUBLIC_APP_URL || "*";

const SKIP_PATHS = ["/_next/static", "/_next/image", "/favicon.ico"];

const SESSION_COOKIE_NAME = "better-auth.session_token";

const PROTECTED_ADMIN_PATHS = ["/admin/dashboard"];

export function middleware(request: NextRequest) {
  const { method, nextUrl } = request;
  const path = nextUrl.pathname;

  // Protect admin page routes — redirect to login if session cookie is absent
  if (PROTECTED_ADMIN_PATHS.some((p) => path.startsWith(p))) {
    const sessionCookie = request.cookies.get(SESSION_COOKIE_NAME);
    if (!sessionCookie) {
      const loginUrl = new URL("/admin/login", request.url);
      loginUrl.searchParams.set("redirect", path);
      return NextResponse.redirect(loginUrl);
    }
  }

  const origin = request.headers.get("origin") ?? ALLOWED_ORIGIN;

  if (method === "OPTIONS") {
    return new NextResponse(null, {
      status: 204,
      headers: {
        "Access-Control-Allow-Origin": origin,
        "Access-Control-Allow-Methods":
          "GET, POST, PUT, PATCH, DELETE, OPTIONS",
        "Access-Control-Allow-Headers":
          "Content-Type, Authorization, X-Requested-With",
        "Access-Control-Allow-Credentials": "true",
        "Access-Control-Max-Age": "86400",
      },
    });
  }

  if (SKIP_PATHS.some((p) => path.startsWith(p))) {
    return NextResponse.next();
  }

  const requestId =
    request.headers.get("x-request-id") ?? crypto.randomUUID();
  const requestStart = Date.now();

  // Forward request_id downstream so API route handlers can pick it up
  const requestHeaders = new Headers(request.headers);
  requestHeaders.set("x-request-id", requestId);
  requestHeaders.set("x-request-start", String(requestStart));

  const response = NextResponse.next({
    request: { headers: requestHeaders },
  });

  // Only set CORS headers for API routes
  if (path.startsWith("/api/")) {
    response.headers.set("Access-Control-Allow-Origin", origin);
    response.headers.set(
      "Access-Control-Allow-Methods",
      "GET, POST, PUT, PATCH, DELETE, OPTIONS",
    );
    response.headers.set(
      "Access-Control-Allow-Headers",
      "Content-Type, Authorization, X-Requested-With",
    );
    response.headers.set("Access-Control-Allow-Credentials", "true");
  }

  response.headers.set("x-request-id", requestId);

  // Structured log — console is the only safe I/O in Edge Runtime
  console.log(
    JSON.stringify({
      level: "info",
      time: new Date().toISOString(),
      module: "middleware",
      request_id: requestId,
      method,
      path,
      msg: "http.request_received",
    }),
  );

  return response;
}

export const config = {
  matcher: ["/api/:path*", "/admin/:path*"],
};
