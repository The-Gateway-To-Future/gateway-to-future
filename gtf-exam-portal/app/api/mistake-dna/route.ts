import { NextResponse } from "next/server";
import { requireVerifiedSession } from "@/lib/server/auth-session";
import {
  applySm2ReviewAdmin,
  listMistakeDnaAdmin,
  recordMistakeOccurrencesAdmin,
} from "@/lib/server/mistake-dna-admin";
import { isMistakeCode } from "@/lib/mistake-dna/taxonomy";
import type {
  MistakeOccurrenceInput,
  MistakeSource,
  Sm2Quality,
} from "@/lib/mistake-dna/store";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const ALLOWED_SOURCES = new Set<MistakeSource>([
  "lesen",
  "hoeren",
  "schreiben",
  "sprechen",
  "workbook",
  "drill",
]);

export async function GET(req: Request) {
  const auth = await requireVerifiedSession(req);
  if (auth.response) return auth.response;

  const records = await listMistakeDnaAdmin(auth.session.uid);
  return NextResponse.json(
    {
      ok: true,
      uid: auth.session.uid,
      records,
    },
    {
      headers: { "Cache-Control": "no-store" },
    },
  );
}

export async function POST(req: Request) {
  const auth = await requireVerifiedSession(req);
  if (auth.response) return auth.response;

  try {
    const body = (await req.json()) as {
      action?: "record" | "review";
      occurrences?: unknown[];
      errorKey?: unknown;
      quality?: unknown;
    };

    if (body.action === "review") {
      if (!isMistakeCode(body.errorKey)) {
        return NextResponse.json({ error: "Invalid Mistake-DNA errorKey." }, { status: 400 });
      }
      const qNum = Number(body.quality);
      const quality: Sm2Quality =
        qNum === 1 || qNum === 3 || qNum === 4 || qNum === 5 ? qNum : 4;

      const updated = await applySm2ReviewAdmin(auth.session.uid, body.errorKey, quality);
      return NextResponse.json({ ok: true, record: updated });
    }

    if (body.action === "record") {
      const rawList = Array.isArray(body.occurrences) ? body.occurrences.slice(0, 40) : [];
      const sanitized: MistakeOccurrenceInput[] = [];
      for (const item of rawList) {
        if (!item || typeof item !== "object") continue;
        const obj = item as Record<string, unknown>;
        if (!isMistakeCode(obj.errorKey)) continue;
        const rawSource = String(obj.source || "drill") as MistakeSource;
        const source: MistakeSource = ALLOWED_SOURCES.has(rawSource) ? rawSource : "drill";
        sanitized.push({
          errorKey: obj.errorKey,
          source,
          prompt: typeof obj.prompt === "string" ? obj.prompt.slice(0, 180) : undefined,
          wrong: typeof obj.wrong === "string" ? obj.wrong.slice(0, 140) : undefined,
          right: typeof obj.right === "string" ? obj.right.slice(0, 140) : undefined,
        });
      }

      if (sanitized.length === 0) {
        return NextResponse.json({ ok: true, recorded: 0 });
      }

      const persisted = await recordMistakeOccurrencesAdmin(auth.session.uid, sanitized);
      return NextResponse.json({ ok: true, recorded: sanitized.length, persisted });
    }

    return NextResponse.json({ error: "Unsupported action." }, { status: 400 });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Failed to update Mistake-DNA" },
      { status: 500 },
    );
  }
}
