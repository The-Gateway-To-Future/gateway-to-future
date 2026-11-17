import { NextRequest, NextResponse } from "next/server";
import { normalizeEmail, triggerStudentWelcomeWebhook } from "@/lib/server/student-auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * POST /api/auth/welcome
 * Triggers background "Welcome to GTF" onboarding automation upon new user registration.
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json().catch(() => ({}));
    const email = normalizeEmail(typeof body.email === "string" ? body.email : "");
    const name = typeof body.name === "string" ? body.name.trim() : "";
    const phone = typeof body.phone === "string" ? body.phone.trim() : "";
    const course = typeof body.course === "string" ? body.course.trim() : "A1";
    const uid = typeof body.uid === "string" ? body.uid.trim() : "";

    if (!email || !email.includes("@")) {
      return NextResponse.json(
        { ok: false, error: "Valid email is required." },
        { status: 400 },
      );
    }

    // TODO: Connect to n8n/WhatsApp API to send the Official GTF Welcome Message.
    triggerStudentWelcomeWebhook({
      name: name || email.split("@")[0] || "GTF Candidate",
      email,
      phone,
      course,
    });

    const externalWebhookUrl = process.env.GTF_WELCOME_WEBHOOK_URL?.trim();
    if (externalWebhookUrl) {
      fetch(externalWebhookUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          event: "gtf.user.registered",
          name: name || "GTF Candidate",
          email,
          phone,
          course,
          uid,
          source: "gtf-exam-portal",
          timestamp: new Date().toISOString(),
        }),
      }).catch(() => {});
    }

    return NextResponse.json({
      ok: true,
      queued: true,
      email,
    });
  } catch (err) {
    console.error("[GTF Auth Welcome] Error:", err);
    return NextResponse.json(
      { ok: false, error: "Failed to queue welcome automation." },
      { status: 500 },
    );
  }
}
