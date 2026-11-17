import { NextResponse } from "next/server";
import { isLevel } from "@/lib/config";
import {
  getServerExamTest,
  getUnlockedProductSlugs,
  sanitizeExamTestForClient,
} from "@/lib/server/catalog";
import { downloadDriveText, resolveDrivePath } from "@/lib/server/drive";
import { isDriveConfigured, serverEnv } from "@/lib/server/env";
import type { ExamTest } from "@/lib/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const rawLevel = (searchParams.get("level") || "b1").toLowerCase();
  const level = isLevel(rawLevel) ? rawLevel : "b1";
  const testId = searchParams.get("testId") || `gtf-${level}-modelltest-1`;
  const userEmail = (searchParams.get("email") || serverEnv.demoUserEmail).toLowerCase().trim();

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

  // 3. Global Free Launch Mode bypass or Entitlement Check
  const isFreeLaunch = process.env.NEXT_PUBLIC_FREE_LAUNCH_MODE === "true";
  if (isFreeLaunch) {
    rawTest.isFree = true;
  } else if (!rawTest.isFree) {
    try {
      const unlocked = await getUnlockedProductSlugs(userEmail);
      if (rawTest.productSlug && !unlocked.has(rawTest.productSlug)) {
        return NextResponse.json(
          {
            error: "This mock test pack is locked. Unlock it from your GTF Dashboard.",
            productSlug: rawTest.productSlug,
          },
          { status: 402 },
        );
      }
    } catch {
      // In case of DB lookup failure, allow access to prevent blocking legitimate students
      rawTest.isFree = true;
    }
  }

  const sanitized = sanitizeExamTestForClient(rawTest, userEmail);
  return NextResponse.json({
    source,
    test: sanitized,
  });
}
