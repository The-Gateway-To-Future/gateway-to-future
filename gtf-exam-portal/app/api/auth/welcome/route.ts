import { NextRequest, NextResponse } from "next/server";
import { requireVerifiedSession } from "@/lib/server/auth-session";
import { triggerStudentWelcomeWebhook } from "@/lib/server/student-auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * POST /api/auth/welcome
 * Authenticated endpoint to trigger onboarding welcome automation for the signed-in user only.
 */
export async function POST(request: NextRequest) {
  const auth = await requireVerifiedSession(request);
  if (auth.response) return auth.response;

  try {
    const { session } = auth;
    triggerStudentWelcomeWebhook({
      studentId: session.studentId,
      name: session.name,
      email: session.email,
      phone: session.phone,
      course: session.course,
    });

    const externalWebhookUrl = process.env.GTF_WELCOME_WEBHOOK_URL?.trim();
    if (externalWebhookUrl) {
      fetch(externalWebhookUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          event: "gtf.user.registered",
          studentId: session.studentId,
          name: session.name,
          email: session.email,
          phone: session.phone,
          course: session.course,
          uid: session.uid,
          source: "gtf-exam-portal",
          timestamp: new Date().toISOString(),
        }),
        signal: AbortSignal.timeout(5000),
      }).catch(() => {});
    }

    return NextResponse.json({
      ok: true,
      queued: true,
      email: session.email,
    });
  } catch (err) {
    console.error("[GTF Auth Welcome] Error:", err);
    return NextResponse.json(
      { ok: false, error: "Failed to queue welcome automation." },
      { status: 500 },
    );
  }
}
