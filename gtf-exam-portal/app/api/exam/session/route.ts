import crypto from "crypto";
import { NextResponse } from "next/server";
import { isLevel, SECTION_ORDER, type SectionKey } from "@/lib/config";
import { getEdgeSessionSecret } from "@/lib/server/auth-edge";
import { requireVerifiedSession } from "@/lib/server/auth-session";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const DEFAULT_SECTION_MINUTES: Record<string, Record<SectionKey, number>> = {
  a1: { lesen: 25, hoeren: 20, schreiben: 20, sprechen: 15 },
  a2: { lesen: 30, hoeren: 30, schreiben: 30, sprechen: 15 },
  b1: { lesen: 65, hoeren: 40, schreiben: 60, sprechen: 15 },
  b2: { lesen: 65, hoeren: 40, schreiben: 75, sprechen: 15 },
};

function isSectionKey(val: unknown): val is SectionKey {
  return typeof val === "string" && (SECTION_ORDER as readonly string[]).includes(val);
}

function signDeadline(payload: {
  uid: string;
  level: string;
  testId: string;
  section: SectionKey;
  deadlineMs: number;
}): string {
  const secret = getEdgeSessionSecret();
  if (!secret) return "";
  const canonical = `${payload.uid}|${payload.level}|${payload.testId}|${payload.section}|${payload.deadlineMs}`;
  return crypto.createHmac("sha256", secret).update(canonical).digest("base64url");
}

function verifyDeadline(
  token: string,
  payload: {
    uid: string;
    level: string;
    testId: string;
    section: SectionKey;
    deadlineMs: number;
  },
): boolean {
  if (!token) return false;
  const expected = signDeadline(payload);
  if (!expected) return false;
  const a = Buffer.from(token);
  const b = Buffer.from(expected);
  if (a.length !== b.length) return false;
  return crypto.timingSafeEqual(a, b);
}

/**
 * Anchors a wall-clock exam section deadline to authoritative server time (`serverNowMs`)
 * so Exam-Realism Mode (`Prüfungsmodus`) cannot be bypassed by refreshing or changing the device clock.
 */
export async function POST(req: Request) {
  const auth = await requireVerifiedSession(req);
  if (auth.response) return auth.response;

  try {
    const body = (await req.json()) as {
      level?: string;
      testId?: string;
      section?: string;
      durationMinutes?: number;
      existingDeadlineMs?: number;
      existingToken?: string;
    };

    const rawLevel = (body.level || "b1").toLowerCase();
    const level = isLevel(rawLevel) ? rawLevel : "b1";
    const section: SectionKey = isSectionKey(body.section) ? body.section : "lesen";
    const testId = (body.testId || `gtf-${level}-modelltest-1`).trim().toLowerCase().slice(0, 80);

    const defaultDur = DEFAULT_SECTION_MINUTES[level]?.[section] ?? 45;
    const clampedMinutes = Math.max(
      1,
      Math.min(180, Math.round(Number(body.durationMinutes) || defaultDur)),
    );
    const serverNowMs = Date.now();

    // Reuse an existing server-signed deadline if valid & not artificially extended
    if (
      typeof body.existingDeadlineMs === "number" &&
      Number.isFinite(body.existingDeadlineMs) &&
      typeof body.existingToken === "string" &&
      verifyDeadline(body.existingToken, {
        uid: auth.session.uid,
        level,
        testId,
        section,
        deadlineMs: body.existingDeadlineMs,
      })
    ) {
      const remainingSeconds = Math.max(
        0,
        Math.ceil((body.existingDeadlineMs - serverNowMs) / 1000),
      );
      return NextResponse.json(
        {
          ok: true,
          serverNowMs,
          deadlineMs: body.existingDeadlineMs,
          remainingSeconds,
          expired: remainingSeconds <= 0,
          deadlineToken: body.existingToken,
        },
        { headers: { "Cache-Control": "no-store" } },
      );
    }

    const deadlineMs = serverNowMs + clampedMinutes * 60 * 1000;
    const deadlineToken = signDeadline({
      uid: auth.session.uid,
      level,
      testId,
      section,
      deadlineMs,
    });

    return NextResponse.json(
      {
        ok: true,
        serverNowMs,
        deadlineMs,
        remainingSeconds: clampedMinutes * 60,
        expired: false,
        deadlineToken,
      },
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Failed to initialize exam session clock" },
      { status: 500 },
    );
  }
}
