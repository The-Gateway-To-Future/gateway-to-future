import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

const PROTECTED_PREFIXES = [
  "/dashboard",
  "/academy",
  "/studienkolleg",
  "/pflege",
  "/profile",
  "/exam",
  "/workbooks",
  "/pathways",
];

const AUTH_ROUTES = ["/login", "/register"];

/**
 * Lightweight Edge-safe structural & expiry validator for `gtf_auth_token`.
 * Allows portal session tokens (`gtf_sec_*`) and non-expired Firebase JWTs
 * (with a 5-minute clock-skew/refresh grace window).
 */
function isLikelyValidAuthToken(token: string): boolean {
  if (!token) return false;
  if (token.startsWith("gtf_sec_")) return true;

  const parts = token.split(".");
  if (parts.length !== 3) return false;

  try {
    const base64 = parts[1].replace(/-/g, "+").replace(/_/g, "/");
    const padded = base64.padEnd(base64.length + ((4 - (base64.length % 4)) % 4), "=");
    const payload = JSON.parse(atob(padded)) as { exp?: unknown };
    if (typeof payload.exp === "number") {
      return payload.exp * 1000 > Date.now() - 5 * 60 * 1000;
    }
    return true;
  } catch {
    return false;
  }
}

/**
 * Gateway To Future (GTF) — Edge Security Middleware
 *
 * Rules:
 *  1. In production (`NODE_ENV === 'production'`), strictly block `/setup` and `/api/setup`
 *     routes with 403 Forbidden.
 *  2. Protect portal routes (`/dashboard`, `/academy`, `/studienkolleg`, `/pflege`, `/profile`,
 *     `/exam`, `/workbooks`, `/pathways`) using the synced Firebase ID token cookie (`gtf_auth_token`).
 *  3. Redirect authenticated users away from `/login` and `/register` to `/dashboard` unless
 *     handling email verification action links (`?mode=`, `?oobCode=`) or explicit re-auth (`?force=`).
 */
export function middleware(request: NextRequest) {
  const { pathname, search, searchParams } = request.nextUrl;

  // 1. Strict production lockdown on visual setup wizard, setup APIs, and local-only website preview tools
  if (process.env.NODE_ENV === "production") {
    if (
      pathname.startsWith("/setup") ||
      pathname.startsWith("/api/setup") ||
      pathname.startsWith("/website-preview") ||
      pathname.startsWith("/api/admin/attach-website-button") ||
      pathname.startsWith("/api/admin/website-html")
    ) {
      return new NextResponse(
        JSON.stringify({
          error: "This internal development tool is strictly disabled in production environments.",
          code: "INTERNAL_TOOL_FORBIDDEN_IN_PRODUCTION",
        }),
        {
          status: 403,
          headers: {
            "Content-Type": "application/json",
            "X-Robots-Tag": "noindex, nofollow, noarchive",
          },
        },
      );
    }
  }

  // 2. Synced Firebase ID Token Cookie Check
  const authToken = request.cookies.get("gtf_auth_token")?.value?.trim() || "";
  const hasValidToken = isLikelyValidAuthToken(authToken);
  const isProtected = PROTECTED_PREFIXES.some(
    (prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`),
  );
  const isAuthRoute = AUTH_ROUTES.some(
    (route) => pathname === route || pathname.startsWith(`${route}/`),
  );
  const hasAuthActionParams =
    searchParams.has("oobCode") ||
    searchParams.has("mode") ||
    searchParams.has("force") ||
    searchParams.has("verify");

  if (isProtected && !hasValidToken) {
    const loginUrl = new URL("/login", request.url);
    const nextTarget = `${pathname}${search || ""}`;
    if (nextTarget && nextTarget !== "/") {
      loginUrl.searchParams.set("next", nextTarget);
    }
    const response = NextResponse.redirect(loginUrl);
    if (authToken) {
      response.cookies.delete("gtf_auth_token");
    }
    return response;
  }

  if (isAuthRoute) {
    if (hasValidToken && !hasAuthActionParams) {
      return NextResponse.redirect(new URL("/dashboard", request.url));
    }
    if (authToken && (!hasValidToken || searchParams.has("force"))) {
      const response = NextResponse.next();
      response.cookies.delete("gtf_auth_token");
      return response;
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    "/setup/:path*",
    "/api/setup/:path*",
    "/website-preview",
    "/website-preview/:path*",
    "/api/admin/attach-website-button",
    "/api/admin/attach-website-button/:path*",
    "/api/admin/website-html",
    "/api/admin/website-html/:path*",
    "/login",
    "/login/:path*",
    "/register",
    "/register/:path*",
    "/dashboard",
    "/dashboard/:path*",
    "/academy",
    "/academy/:path*",
    "/studienkolleg",
    "/studienkolleg/:path*",
    "/pflege",
    "/pflege/:path*",
    "/exam",
    "/exam/:path*",
    "/workbooks",
    "/workbooks/:path*",
    "/pathways",
    "/pathways/:path*",
    "/profile",
    "/profile/:path*",
  ],
};
