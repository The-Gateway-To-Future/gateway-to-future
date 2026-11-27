import { NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * SMS OTP verification is disabled until a real OTP provider (Firebase Phone Auth / Twilio Verify)
 * is provisioned. Never accept unverified OTP strings.
 */
export async function POST() {
  return NextResponse.json(
    {
      ok: false,
      verified: false,
      code: "SMS_OTP_NOT_CONFIGURED",
      error: "SMS OTP verification is not currently enabled. Email verification is used for account security.",
    },
    { status: 501 },
  );
}
