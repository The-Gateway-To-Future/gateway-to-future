import { NextResponse } from "next/server";
import { isLevel } from "@/lib/config";
import { getVerifiedSession } from "@/lib/server/auth-session";
import {
  getServerExamTest,
  getUnlockedProductSlugs,
  sanitizeExamTestForClient,
} from "@/lib/server/catalog";
import { downloadDriveText, resolveDrivePath } from "@/lib/server/drive";
import { isDriveConfigured } from "@/lib/server/env";
import type { ExamTest } from "@/lib/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const rawLevel = (searchParams.get("level") || "b1").toLowerCase();
  const level = isLevel(rawLevel) ? rawLevel : "b1";
  const testId = searchParams.get("testId") || `gtf-${level}-modelltest-1`;

  // Derive caller identity strictly from verified session (never trust ?email= spoofing)
  const session = await getVerifiedSession(req);
  const userEmail = session?.email || "";

  let rawTest: ExamTest | null = null;
  let source: "google-drive" | "offline-fallback" = "offline-fallback";

  // 1. Try loading JSON test definition from Google Drive if configured
  if (isDriveConfigured()) {
    try {
      const fileId = await resolveDrivePath(`tests/${level}/${testId}.json`);
      const text = await downloadDriveText(fileId);
      rawTest = JSON.parse(text) as ExamTest;
      source = "google-drive";
    } catch (err) {
      console.warn(`[gtf] Drive test lookup tests/${level}/${testId}.json fell back to local sample:`, err);
    }
  }

  // 2. Fallback to built-in offline sample test
  if (!rawTest || !rawTest.sections || !rawTest.sections.hoeren) {
    rawTest = getServerExamTest(level, testId);
  }

  // 3. Entitlement Check (strictly fail-closed when not in Free Launch Mode)
  const isFreeLaunch = process.env.NEXT_PUBLIC_FREE_LAUNCH_MODE === "true";
  if (isFreeLaunch) {
    rawTest.isFree = true;
  } else if (!rawTest.isFree) {
    if (!session) {
      return NextResponse.json(
        {
          error: "Authentication required to access this mock test pack.",
          productSlug: rawTest.productSlug,
        },
        { status: 401 },
      );
    }
    try {
      const unlocked = await getUnlockedProductSlugs(session.email, session.uid);
      if (rawTest.productSlug && !unlocked.has(rawTest.productSlug)) {
        return NextResponse.json(
          {
            error: "This mock test pack is locked. Unlock it from your GTF Dashboard.",
            productSlug: rawTest.productSlug,
          },
          { status: 402 },
        );
      }
    } catch (err) {
      console.error("[gtf] Entitlement verification failed (failing closed):", err);
      return NextResponse.json(
        { error: "Unable to verify pack entitlement right now. Please retry." },
        { status: 503 },
      );
    }
  }

  const sanitized = sanitizeExamTestForClient(rawTest, userEmail || "student@gatewaytofuture.com");
  return NextResponse.json({
    source,
    test: sanitized,
  });
}
