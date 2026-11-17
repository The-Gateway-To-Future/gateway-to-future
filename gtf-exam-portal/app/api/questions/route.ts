import { NextResponse } from "next/server";
import fs from "fs";
import path from "path";
import { isLevel } from "@/lib/config";
import { getServerExamTest, sanitizeExamTestForClient } from "@/lib/server/catalog";
import { serverEnv } from "@/lib/server/env";
import type { ExamTest } from "@/lib/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const trackParam = (searchParams.get("track") || searchParams.get("level") || "b1").toLowerCase().trim();
  const bankParam = searchParams.get("bank");
  const userEmail = (searchParams.get("email") || serverEnv.demoUserEmail).toLowerCase().trim();

  // If directly requesting a specific question bank JSON
  if (bankParam) {
    const safeName = bankParam.replace(/[^a-z0-9_]/g, "");
    const bankFile = path.join(process.cwd(), "data", "question_banks", `${safeName}.json`);
    if (fs.existsSync(bankFile)) {
      try {
        const bankData = JSON.parse(fs.readFileSync(bankFile, "utf8"));
        return NextResponse.json({ success: true, bank: bankData });
      } catch {
        // fall through
      }
    }
  }

  const level = isLevel(trackParam) ? trackParam : "b1";
  const testId = searchParams.get("testId") || `gtf-${level}-modelltest-1`;

  try {
    const rawTest = getServerExamTest(level, testId);
    const sanitized = sanitizeExamTestForClient(rawTest, userEmail);

    // Optional modular question bank lookup
    let modularBank = null;
    const qbFile = path.join(process.cwd(), "data", "question_banks", `daf_${level}.json`);
    const stkFile = path.join(process.cwd(), "data", "question_banks", `stk_${level}.json`);
    const pfFile = path.join(process.cwd(), "data", "question_banks", "pflege_b1_b2.json");

    if (fs.existsSync(qbFile)) {
      modularBank = JSON.parse(fs.readFileSync(qbFile, "utf8"));
    } else if (fs.existsSync(stkFile)) {
      modularBank = JSON.parse(fs.readFileSync(stkFile, "utf8"));
    } else if (level.includes("pflege") && fs.existsSync(pfFile)) {
      modularBank = JSON.parse(fs.readFileSync(pfFile, "utf8"));
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
      { status: 500 }
    );
  }
}
