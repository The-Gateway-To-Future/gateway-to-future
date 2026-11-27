import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import {
  GTF_LEGACY_SESSION_COOKIE,
  GTF_SESSION_COOKIE,
  verifySessionTokenEdge,
} from "@/lib/server/auth-edge";

const PROTECTED_PREFIXES = [
  "/dashboard",
  "/academy",
  "/studienkolleg",
  "/pflege",
  "/profile",
  "/exam",
  "/workbooks",
  "/pathways",
  "/mistake-dna",
];

const AUTH_ROUTES = ["/login", "/register"];

/**
 * Gateway To Future (GTF) — Edge Security Middleware
 *
 * Rules:
 *  1. In production (`NODE_ENV === 'production'`), strictly block `/setup`, `/api/setup`,
 *     and internal website preview/mutation endpoints with 403 Forbidden.
 *  2. Protect portal routes by cryptographically verifying the HttpOnly HMAC-SHA256
 *     `gtf_session` cookie using Web Crypto API (zero unsigned-prefix or unverified-JWT bypass).
 *  3. Redirect authenticated users away from `/login` and `/register` to `/dashboard` unless
 *     handling email verification action links (`?mode=`, `?oobCode=`) or explicit re-auth (`?force=`).
 */
export async function middleware(request: NextRequest) {
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

  // 2. Cryptographic HMAC-SHA256 Verification of HttpOnly `gtf_session` cookie
  const rawSessionCookie =
    request.cookies.get(GTF_SESSION_COOKIE)?.value?.trim() ||
    request.cookies.get(GTF_LEGACY_SESSION_COOKIE)?.value?.trim() ||
    "";
  const hasLegacyNonHttpOnlyCookie = Boolean(request.cookies.get("gtf_auth_token")?.value);
  const verifiedSession = rawSessionCookie
    ? await verifySessionTokenEdge(rawSessionCookie)
    : null;
  const hasValidSession = Boolean(verifiedSession);

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

  if (isProtected && !hasValidSession) {
    const loginUrl = new URL("/login", request.url);
    const nextTarget = `${pathname}${search || ""}`;
    if (nextTarget && nextTarget !== "/") {
      loginUrl.searchParams.set("next", nextTarget);
    }
    const response = NextResponse.redirect(loginUrl);
    if (rawSessionCookie) {
      response.cookies.delete(GTF_SESSION_COOKIE);
      response.cookies.delete(GTF_LEGACY_SESSION_COOKIE);
    }
    if (hasLegacyNonHttpOnlyCookie) {
      response.cookies.delete("gtf_auth_token");
    }
    return response;
  }

  if (isAuthRoute) {
    if (hasValidSession && !hasAuthActionParams) {
      return NextResponse.redirect(new URL("/dashboard", request.url));
    }
    if ((rawSessionCookie && (!hasValidSession || searchParams.has("force"))) || hasLegacyNonHttpOnlyCookie) {
      const response = NextResponse.next();
      if (!hasValidSession || searchParams.has("force")) {
        response.cookies.delete(GTF_SESSION_COOKIE);
        response.cookies.delete(GTF_LEGACY_SESSION_COOKIE);
      }
      if (hasLegacyNonHttpOnlyCookie) {
        response.cookies.delete("gtf_auth_token");
      }
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
    "/mistake-dna",
    "/mistake-dna/:path*",
  ],
};
