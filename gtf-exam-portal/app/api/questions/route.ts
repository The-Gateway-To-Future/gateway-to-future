import { NextResponse } from "next/server";
import fs from "fs";
import path from "path";
import { isLevel } from "@/lib/config";
import { requireVerifiedSession } from "@/lib/server/auth-session";
import {
  getServerExamTest,
  getUnlockedProductSlugs,
  sanitizeExamTestForClient,
} from "@/lib/server/catalog";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const SENSITIVE_QUESTION_KEYS = new Set([
  "answer",
  "answers",
  "correctAnswer",
  "correctOption",
  "correct",
  "explanation",
  "solution",
  "musterloesung",
]);

/**
 * Recursively removes all answer keys and solutions before returning any question bank to clients.
 */
function stripAnswersRecursively(value: unknown): unknown {
  if (Array.isArray(value)) {
    return value.map(stripAnswersRecursively);
  }
  if (value && typeof value === "object") {
    const out: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(value as Record<string, unknown>)) {
      if (SENSITIVE_QUESTION_KEYS.has(k)) continue;
      out[k] = stripAnswersRecursively(v);
    }
    return out;
  }
  return value;
}

export async function GET(req: Request) {
  const auth = await requireVerifiedSession(req);
  if (auth.response) return auth.response;

  const { searchParams } = new URL(req.url);
  const trackParam = (
    searchParams.get("track") ||
    searchParams.get("level") ||
    "b1"
  )
    .toLowerCase()
    .trim();
  const bankParam = searchParams.get("bank");
  const userEmail = auth.session.email;

  const isFreeLaunch = process.env.NEXT_PUBLIC_FREE_LAUNCH_MODE === "true";

  // Direct sanitized question bank lookup (answers & solutions ALWAYS stripped)
  if (bankParam) {
    const safeName = bankParam.replace(/[^a-z0-9_-]/gi, "");
    const bankFile = path.join(process.cwd(), "data", "question_banks", `${safeName}.json`);
    if (fs.existsSync(bankFile)) {
      try {
        const bankData = JSON.parse(fs.readFileSync(bankFile, "utf8"));
        return NextResponse.json({
          success: true,
          bank: stripAnswersRecursively(bankData),
        });
      } catch {
        // fall through
      }
    }
  }

  const level = isLevel(trackParam) ? trackParam : "b1";
  const testId = searchParams.get("testId") || `gtf-${level}-modelltest-1`;

  try {
    const rawTest = getServerExamTest(level, testId);
    if (!isFreeLaunch && !rawTest.isFree) {
      const unlocked = await getUnlockedProductSlugs(userEmail, auth.session.uid);
      if (rawTest.productSlug && !unlocked.has(rawTest.productSlug)) {
        return NextResponse.json(
          { success: false, error: "This test pack is locked." },
          { status: 402 },
        );
      }
    }

    const sanitized = sanitizeExamTestForClient(rawTest, userEmail);

    // Optional modular question bank lookup (strictly stripped of answer keys)
    let modularBank: unknown = null;
    const qbFile = path.join(process.cwd(), "data", "question_banks", `daf_${level}.json`);
    const stkFile = path.join(process.cwd(), "data", "question_banks", `stk_${level}.json`);
    const pfFile = path.join(process.cwd(), "data", "question_banks", "pflege_b1_b2.json");

    if (fs.existsSync(qbFile)) {
      modularBank = stripAnswersRecursively(JSON.parse(fs.readFileSync(qbFile, "utf8")));
    } else if (fs.existsSync(stkFile)) {
      modularBank = stripAnswersRecursively(JSON.parse(fs.readFileSync(stkFile, "utf8")));
    } else if (level.includes("pflege") && fs.existsSync(pfFile)) {
      modularBank = stripAnswersRecursively(JSON.parse(fs.readFileSync(pfFile, "utf8")));
    }

    return NextResponse.json({
      success: true,
      track: level,
      test: sanitized,
      questionBank: modularBank,
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Failed to load questions";
    return NextResponse.json(
      {
        success: false,
        error: message,
      },
      { status: 500 },
    );
  }
}
