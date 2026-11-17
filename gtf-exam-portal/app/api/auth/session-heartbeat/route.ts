import { NextResponse } from "next/server";
import { validateSessionToken } from "@/lib/server/session-manager";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const token =
    searchParams.get("token") ||
    req.headers.get("x-gtf-session-token") ||
    req.headers.get("authorization")?.replace(/^Bearer\s+/i, "") ||
    "";

  if (!token) {
    return NextResponse.json(
      {
        valid: false,
        code: "MISSING_SESSION_TOKEN",
        message: "Authentication required. Please log in.",
      },
      { status: 401 },
    );
  }

  const result = await validateSessionToken(token);

  if (!result.valid) {
    return NextResponse.json(
      {
        valid: false,
        code: result.reason || "SESSION_INVALIDATED",
        message:
          result.reason === "LOGGED_OUT_BY_ANOTHER_DEVICE"
            ? "Your session has been terminated because this account was logged into on another device (Single-Device Session Lock: 1 active web + 1 active mobile session limit)."
            : "Your session has expired or is invalid. Please log in again.",
      },
      { status: 401 },
    );
  }

  return NextResponse.json({
    valid: true,
    userEmail: result.userEmail,
    deviceType: result.deviceType,
    heartbeatAt: new Date().toISOString(),
  });
}
