import { NextResponse } from "next/server";
import { revokeSessionToken } from "@/lib/server/session-manager";
import { PAID_APPOINTMENT_COOKIE } from "@/lib/server/consultation-contact";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => ({}));
    const token =
      body.sessionToken ||
      req.headers.get("x-gtf-session-token") ||
      req.headers.get("authorization")?.replace(/^Bearer\s+/i, "") ||
      "";

    if (token) {
      try {
        await revokeSessionToken(token, "USER_EXPLICIT_LOGOUT");
      } catch {
        // Non-blocking
      }
    }

    const response = NextResponse.json({
      success: true,
      ok: true,
      message: "Logged out successfully.",
    });

    // Clear all session, legacy, and consultation cookies
    response.cookies.delete("gtf_session");
    response.cookies.delete("gtf_student_session");
    response.cookies.delete("gtf_auth_token");
    response.cookies.delete(PAID_APPOINTMENT_COOKIE);

    return response;
  } catch (err) {
    return NextResponse.json(
      { success: false, ok: false, error: err instanceof Error ? err.message : "Logout failed." },
      { status: 500 },
    );
  }
}
