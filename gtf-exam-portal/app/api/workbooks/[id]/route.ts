import { NextResponse } from "next/server";
import { getVerifiedSession, requireVerifiedSession } from "@/lib/server/auth-session";
import {
  getUnlockedProductSlugs,
  getWorkbookById,
  getWorkbookForClient,
} from "@/lib/server/catalog";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function normalizeGermanAnswer(val: string): string {
  return val
    .trim()
    .toLowerCase()
    .replace(/[.!?]+$/g, "")
    .replace(/\s+/g, " ");
}

export async function GET(
  req: Request,
  context: { params: Promise<{ id: string }> },
) {
  const { id } = await context.params;
  const session = await getVerifiedSession(req);
  const workbook = await getWorkbookForClient(id, session?.email || "");
  if (!workbook) {
    return NextResponse.json({ error: "Workbook not found." }, { status: 404 });
  }

  return NextResponse.json({ workbook });
}

export async function POST(
  req: Request,
  context: { params: Promise<{ id: string }> },
) {
  const auth = await requireVerifiedSession(req);
  if (auth.response) return auth.response;

  const { id } = await context.params;
  const wb = getWorkbookById(id);
  if (!wb) {
    return NextResponse.json({ error: "Workbook not found." }, { status: 404 });
  }

  // Enforce entitlement before revealing correct answers & explanations
  const isFreeLaunch = process.env.NEXT_PUBLIC_FREE_LAUNCH_MODE === "true";
  if (!isFreeLaunch && !wb.isFree) {
    const unlocked = await getUnlockedProductSlugs(auth.session.email, auth.session.uid);
    if (!unlocked.has(wb.productSlug)) {
      return NextResponse.json(
        { error: "This workbook is locked. Unlock it to submit answers and view solutions." },
        { status: 402 },
      );
    }
  }

  const body = (await req.json().catch(() => ({}))) as { answers?: Record<string, string> };
  const answers = body.answers || {};

  const graded = wb.questions.map((q) => {
    const given = (answers[q.id] || "").trim();
    const expectedList = Array.isArray(q.answer)
      ? q.answer
      : q.answer
        ? [q.answer]
        : [];

    const isCorrect =
      given.length > 0 &&
      expectedList.some(
        (exp) => normalizeGermanAnswer(exp) === normalizeGermanAnswer(given),
      );

    const displayCorrect =
      q.type === "mcq" && q.options
        ? (() => {
            const opt = q.options.find((o) => o.id === expectedList[0]);
            return opt ? `${opt.id.toUpperCase()}) ${opt.text}` : expectedList[0];
          })()
        : expectedList[0] || "";

    return {
      id: q.id,
      label: q.label,
      given,
      isCorrect,
      correctAnswer: displayCorrect,
      explanation: q.explanation || "",
    };
  });

  const correctCount = graded.filter((g) => g.isCorrect).length;
  const percent = Math.round((correctCount / Math.max(1, graded.length)) * 100);

  return NextResponse.json({
    score: correctCount,
    total: graded.length,
    percent,
    items: graded,
  });
}
