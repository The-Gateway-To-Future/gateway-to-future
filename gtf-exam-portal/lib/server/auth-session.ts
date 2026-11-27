import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { GTF_LEGACY_SESSION_COOKIE, GTF_SESSION_COOKIE } from "./auth-edge";
import { verifyFirebaseIdTokenServer } from "./firebase-admin";
import { normalizeEmail, verifyStudentSessionToken } from "./student-auth";

export interface VerifiedServerSession {
  uid: string;
  id: string;
  studentId: string;
  email: string;
  name: string;
  phone: string;
  course: string;
  role: "student" | "admin";
  source: "cookie" | "bearer-session" | "bearer-firebase";
}

const BOOTSTRAP_ADMIN_EMAILS = new Set([
  "ashusharma@gatewaytofuture.com",
  "skour8786@gmail.com",
]);

function deriveStudentId(rawId: string): string {
  if (rawId.startsWith("GTF-")) return rawId;
  return `GTF-2026-${rawId.slice(-4).toUpperCase() || "0001"}`;
}

/**
 * Cryptographically resolves the caller's verified identity from HttpOnly `gtf_session` cookie
 * or `Authorization: Bearer` header (signed session JWT or Firebase ID token).
 * NEVER reads untrusted `?email=` or `?token=` query parameters.
 */
export async function getVerifiedSession(
  req?: Request,
): Promise<VerifiedServerSession | null> {
  // 1. Check HttpOnly signed session cookie
  try {
    const cookieStore = await cookies();
    const cookieToken =
      cookieStore.get(GTF_SESSION_COOKIE)?.value?.trim() ||
      cookieStore.get(GTF_LEGACY_SESSION_COOKIE)?.value?.trim() ||
      "";
    if (cookieToken) {
      const payload = verifyStudentSessionToken(cookieToken);
      if (payload?.email) {
        const email = normalizeEmail(payload.email);
        const uid = (payload.uid || payload.id || "").trim();
        const role: "student" | "admin" =
          payload.role === "admin" || BOOTSTRAP_ADMIN_EMAILS.has(email)
            ? "admin"
            : "student";
        return {
          uid,
          id: payload.id || uid,
          studentId: payload.studentId || deriveStudentId(uid || payload.id),
          email,
          name: payload.name || email.split("@")[0] || "Student",
          phone: payload.phone || "",
          course: payload.course || "sprachakademie",
          role,
          source: "cookie",
        };
      }
    }
  } catch {
    // cookies() may be unavailable outside request context
  }

  // 2. Check Authorization: Bearer header
  const authHeader = req?.headers.get("authorization") || "";
  const bearerToken = authHeader.replace(/^Bearer\s+/i, "").trim();
  if (!bearerToken) return null;

  const bearerSession = verifyStudentSessionToken(bearerToken);
  if (bearerSession?.email) {
    const email = normalizeEmail(bearerSession.email);
    const uid = (bearerSession.uid || bearerSession.id || "").trim();
    const role: "student" | "admin" =
      bearerSession.role === "admin" || BOOTSTRAP_ADMIN_EMAILS.has(email)
        ? "admin"
        : "student";
    return {
      uid,
      id: bearerSession.id || uid,
      studentId: bearerSession.studentId || deriveStudentId(uid || bearerSession.id),
      email,
      name: bearerSession.name || email.split("@")[0] || "Student",
      phone: bearerSession.phone || "",
      course: bearerSession.course || "sprachakademie",
      role,
      source: "bearer-session",
    };
  }

  // 3. Verify as Firebase ID Token (used by native clients & explicit re-auth calls)
  const fbVerified = await verifyFirebaseIdTokenServer(bearerToken);
  if (fbVerified && fbVerified.uid && fbVerified.email && fbVerified.emailVerified !== false) {
    const email = normalizeEmail(fbVerified.email);
    const role: "student" | "admin" =
      fbVerified.isAdmin || BOOTSTRAP_ADMIN_EMAILS.has(email) ? "admin" : "student";
    return {
      uid: fbVerified.uid,
      id: fbVerified.uid,
      studentId: deriveStudentId(fbVerified.uid),
      email,
      name: fbVerified.displayName || email.split("@")[0] || "Student",
      phone: "",
      course: "sprachakademie",
      role,
      source: "bearer-firebase",
    };
  }

  return null;
}

export async function requireVerifiedSession(
  req?: Request,
): Promise<
  | { session: VerifiedServerSession; response?: never }
  | { session?: never; response: NextResponse }
> {
  const session = await getVerifiedSession(req);
  if (!session) {
    return {
      response: NextResponse.json(
        {
          ok: false,
          error: "Authentication required. Please sign in to your Gateway To Future account.",
        },
        { status: 401 },
      ),
    };
  }
  return { session };
}
