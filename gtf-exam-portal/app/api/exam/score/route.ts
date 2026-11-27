import crypto from "crypto";
import { NextResponse } from "next/server";
import { isLevel } from "@/lib/config";
import { classifyMistakeCodes, normalizeMistakeCodes } from "@/lib/mistake-dna/taxonomy";
import type { MistakeOccurrenceInput } from "@/lib/mistake-dna/store";
import { requireVerifiedSession } from "@/lib/server/auth-session";
import { getServerExamTest, saveExamAttempt } from "@/lib/server/catalog";
import { getFirebaseAdminFirestore } from "@/lib/server/firebase-admin";
import { recordMistakeOccurrencesAdmin } from "@/lib/server/mistake-dna-admin";
import { verifyAiEvaluationToken } from "@/lib/server/rate-limit";
import type {
  ExamMistakeCluster,
  ExamResult,
  MistakeCode,
  Question,
  SchreibenEvaluation,
  ScoredItem,
  SectionKey,
  SectionScore,
  SprechenEvaluation,
} from "@/lib/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

interface ScoreRequestBody {
  level?: string;
  testId?: string;
  attemptKey?: string;
  lesenAnswers?: Record<string, string>;
  hoerenAnswers?: Record<string, string>;
  schreibenEvaluations?: Record<string, SchreibenEvaluation>;
  sprechenEvaluations?: Record<string, SprechenEvaluation>;
}

const recentAttemptCache = new Map<string, { attemptId: string; persisted: boolean; at: number }>();

function optionText(q: Question, id: string | null | undefined): string | null {
  if (!id) return null;
  if (q.type === "richtig_falsch") {
    return id === "richtig" ? "Richtig" : id === "falsch" ? "Falsch" : id;
  }
  const found = q.options.find((o) => o.id === id);
  return found ? `${found.id.toUpperCase()}) ${found.text}` : id;
}

export async function POST(req: Request) {
  const auth = await requireVerifiedSession(req);
  if (auth.response) return auth.response;

  try {
    const { session } = auth;
    const body = (await req.json()) as ScoreRequestBody;
    const rawLevel = (body.level || "b1").toLowerCase();
    const level = isLevel(rawLevel) ? rawLevel : "b1";
    const test = getServerExamTest(level, body.testId);

    const lesenAnswers = body.lesenAnswers || {};
    const hoerenAnswers = body.hoerenAnswers || {};
    const schreibenEvals = body.schreibenEvaluations || {};
    const sprechenEvals = body.sprechenEvaluations || {};

    // 1. Score Lesen + Sprachbausteine (denominator = true max points, capped at 100%)
    const lesenItems: ScoredItem[] = [];
    let lesenMaxPoints = 0;
    for (const teil of test.sections.lesen.teile) {
      if (teil.kind === "reading") {
        for (const q of teil.questions) {
          const pts = Math.max(1, Number(q.points || 1));
          lesenMaxPoints += pts;
          const given = lesenAnswers[q.id] ?? null;
          const correct = q.answer || "";
          const isCorrect = Boolean(given && given === correct);
          const mistakeTags =
            !isCorrect && given
              ? classifyMistakeCodes({
                  section: "lesen",
                  prompt: q.prompt,
                  explanation: q.explanation,
                  given: optionText(q, given),
                  correct: optionText(q, correct) || correct,
                  explicitTags: q.mistakeTags,
                })
              : undefined;
          lesenItems.push({
            id: q.id,
            teilTitle: teil.title,
            prompt: q.prompt,
            given,
            givenText: optionText(q, given),
            correct,
            correctText: optionText(q, correct) || correct,
            isCorrect,
            points: isCorrect ? pts : 0,
            explanation: q.explanation || "",
            mistakeTags,
          });
        }
      } else {
        for (const g of teil.gaps) {
          const pts = Math.max(1, Number(g.points || 1));
          lesenMaxPoints += pts;
          const key = `gap-${g.id}`;
          const given = lesenAnswers[key] ?? lesenAnswers[g.id] ?? null;
          const correct = g.answer || "";
          const pool = g.options || teil.wordBank || [];
          const findLabel = (val: string | null) => {
            if (!val) return null;
            const opt = pool.find((o) => o.id === val);
            return opt ? `${opt.id.toUpperCase()}) ${opt.text}` : val;
          };
          const isCorrect = Boolean(given && given === correct);
          const mistakeTags =
            !isCorrect && given
              ? classifyMistakeCodes({
                  section: "lesen",
                  prompt: `${teil.title} Lücke [${g.id}]`,
                  explanation: g.explanation,
                  given: findLabel(given),
                  correct: findLabel(correct) || correct,
                  explicitTags: g.mistakeTags,
                })
              : undefined;
          lesenItems.push({
            id: key,
            teilTitle: teil.title,
            prompt: `Lücke [${g.id}]`,
            given,
            givenText: findLabel(given),
            correct,
            correctText: findLabel(correct) || correct,
            isCorrect,
            points: isCorrect ? pts : 0,
            explanation: g.explanation || "",
            mistakeTags,
          });
        }
      }
    }

    const lesenRawScore = lesenItems.reduce((sum, it) => sum + it.points, 0);
    const lesenMax = Math.max(1, lesenMaxPoints);
    const lesenPercent = Math.min(100, Math.round((lesenRawScore / lesenMax) * 100));

    // 2. Score Hören (denominator = true max points, capped at 100%)
    const hoerenItems: ScoredItem[] = [];
    let hoerenMaxPoints = 0;
    for (const teil of test.sections.hoeren.teile) {
      for (const q of teil.questions) {
        const pts = Math.max(1, Number(q.points || 1));
        hoerenMaxPoints += pts;
        const given = hoerenAnswers[q.id] ?? null;
        const correct = q.answer || "";
        const isCorrect = Boolean(given && given === correct);
        const mistakeTags =
          !isCorrect && given
            ? classifyMistakeCodes({
                section: "hoeren",
                prompt: q.prompt,
                explanation: q.explanation,
                given: optionText(q, given),
                correct: optionText(q, correct) || correct,
                explicitTags: q.mistakeTags,
              })
            : undefined;
        hoerenItems.push({
          id: q.id,
          teilTitle: teil.title,
          prompt: q.prompt,
          given,
          givenText: optionText(q, given),
          correct,
          correctText: optionText(q, correct) || correct,
          isCorrect,
          points: isCorrect ? pts : 0,
          explanation: q.explanation || "",
          mistakeTags,
        });
      }
    }

    const hoerenRawScore = hoerenItems.reduce((sum, it) => sum + it.points, 0);
    const hoerenMax = Math.max(1, hoerenMaxPoints);
    const hoerenPercent = Math.min(100, Math.round((hoerenRawScore / hoerenMax) * 100));

    // 3. Score Schreiben — cryptographically verify server-issued evalToken AND divide by TOTAL tasks
    let schreibenVerifiedTotal = 0;
    const schreibenItems: ScoredItem[] = test.sections.schreiben.tasks.map((task) => {
      const ev = schreibenEvals[task.id];
      const isSignedValid = Boolean(
        ev &&
          verifyAiEvaluationToken({
            kind: "schreiben",
            uid: session.uid,
            itemId: task.id,
            score: ev.score,
            cefrEstimate: ev.cefrEstimate,
            evaluatedAt: ev.evaluatedAt,
            evalToken: ev.evalToken,
          }),
      );
      const pct = isSignedValid && ev ? Math.max(0, Math.min(100, Math.round(ev.score))) : 0;
      schreibenVerifiedTotal += pct;
      const isCorrect = pct >= test.passPercent;
      const schreibenTags =
        isSignedValid && ev
          ? normalizeMistakeCodes([
              ...(ev.mistakeTags || []),
              ...(ev.corrections || []).map((c) => c.mistakeCode).filter(Boolean),
            ])
          : [];
      return {
        id: task.id,
        teilTitle: task.title,
        prompt: task.situation,
        given: ev ? `${ev.wordCount} Wörter (${ev.cefrEstimate})` : null,
        givenText: isSignedValid && ev
          ? `${pct}/100 Punkte · Niveau ${ev.cefrEstimate}`
          : ev
            ? "Unverifizierte Bewertung — bitte erneut einreichen"
            : "Noch nicht eingereicht",
        correct: `≥ ${test.passPercent}/100 Punkte`,
        correctText: `Goethe/telc Bestehensgrenze (${test.passPercent}%)`,
        isCorrect,
        points: pct,
        explanation:
          isSignedValid && ev
            ? `${ev.summaryDe} — Hinglish: ${ev.summaryHinglish}`
            : "Reichen Sie Ihren Text im Modul „Schreiben“ zur verifizierten KI-Bewertung ein.",
        mistakeTags: schreibenTags.length > 0 ? schreibenTags : undefined,
      };
    });

    const totalSchreibenTasks = Math.max(1, test.sections.schreiben.tasks.length);
    const schreibenPercent = Math.min(
      100,
      Math.round(schreibenVerifiedTotal / totalSchreibenTasks),
    );

    // 4. Score Sprechen — cryptographically verify server-issued evalToken AND divide by TOTAL teile
    let sprechenVerifiedTotal = 0;
    const sprechenItems: ScoredItem[] = test.sections.sprechen.teile.map((teil) => {
      const ev = sprechenEvals[teil.id];
      const isSignedValid = Boolean(
        ev &&
          verifyAiEvaluationToken({
            kind: "sprechen",
            uid: session.uid,
            itemId: teil.id,
            score: ev.score,
            cefrEstimate: ev.cefrEstimate,
            evaluatedAt: ev.evaluatedAt,
            evalToken: ev.evalToken,
          }),
      );
      const pct = isSignedValid && ev ? Math.max(0, Math.min(100, Math.round(ev.score))) : 0;
      sprechenVerifiedTotal += pct;
      const isCorrect = pct >= test.passPercent;
      const sprechenTags =
        isSignedValid && ev
          ? normalizeMistakeCodes([
              ...(ev.mistakeTags || []),
              ...(ev.corrections || []).map((c) => c.mistakeCode).filter(Boolean),
            ])
          : [];
      return {
        id: teil.id,
        teilTitle: teil.title,
        prompt: teil.card.heading,
        given: ev ? `${ev.durationSeconds}s Aufnahme` : null,
        givenText: isSignedValid && ev
          ? `${pct}/100 Punkte · Niveau ${ev.cefrEstimate}`
          : ev
            ? "Unverifizierte Bewertung — bitte erneut aufnehmen"
            : "Noch nicht aufgenommen",
        correct: `≥ ${test.passPercent}/100 Punkte`,
        correctText: `Goethe/telc Bestehensgrenze (${test.passPercent}%)`,
        isCorrect,
        points: pct,
        explanation:
          isSignedValid && ev
            ? `${ev.summaryDe} — Hinglish: ${ev.summaryHinglish}`
            : "Nehmen Sie im Modul „Sprechen“ Ihre Antwort per Mikrofon auf.",
        mistakeTags: sprechenTags.length > 0 ? sprechenTags : undefined,
      };
    });

    const totalSprechenTeile = Math.max(1, test.sections.sprechen.teile.length);
    const sprechenPercent = Math.min(
      100,
      Math.round(sprechenVerifiedTotal / totalSprechenTeile),
    );

    const sections: SectionScore[] = [
      {
        section: "lesen",
        score: lesenRawScore,
        max: lesenMax,
        percent: lesenPercent,
        passed: lesenPercent >= test.passPercent,
        items: lesenItems,
      },
      {
        section: "hoeren",
        score: hoerenRawScore,
        max: hoerenMax,
        percent: hoerenPercent,
        passed: hoerenPercent >= test.passPercent,
        items: hoerenItems,
      },
      {
        section: "schreiben",
        score: schreibenPercent,
        max: 100,
        percent: schreibenPercent,
        passed: schreibenPercent >= test.passPercent,
        items: schreibenItems,
      },
      {
        section: "sprechen",
        score: sprechenPercent,
        max: 100,
        percent: sprechenPercent,
        passed: sprechenPercent >= test.passPercent,
        items: sprechenItems,
      },
    ];

    const overallPercent = Math.round(
      sections.reduce((acc, s) => acc + s.percent, 0) / sections.length,
    );
    // Authentic Goethe/telc certification standard: must pass EVERY module (prevents 0% Sprechen passing!)
    const passed = overallPercent >= test.passPercent && sections.every((s) => s.passed);

    // Idempotency key: prevents refreshing `/exam/[level]/result` from inserting duplicate rows
    const contentFingerprint = crypto
      .createHash("sha256")
      .update(
        JSON.stringify({
          uid: session.uid,
          testId: test.id,
          level,
          attemptKey: body.attemptKey || "",
          lesenPercent,
          hoerenPercent,
          schreibenPercent,
          sprechenPercent,
        }),
      )
      .digest("hex")
      .slice(0, 20);

    const hasAnyAnswer =
      Object.keys(lesenAnswers).length > 0 ||
      Object.keys(hoerenAnswers).length > 0 ||
      schreibenVerifiedTotal > 0 ||
      sprechenVerifiedTotal > 0;

    // Aggregate Mistake-DNA weak-spot clusters across all 4 sections
    const clusterMap = new Map<
      MistakeCode,
      {
        count: number;
        sections: Set<SectionKey>;
        samplePrompt?: string;
        sampleWrong?: string;
        sampleRight?: string;
      }
    >();
    const dnaOccurrencesToPersist: MistakeOccurrenceInput[] = [];

    for (const sec of sections) {
      for (const item of sec.items) {
        if (!item.mistakeTags || item.mistakeTags.length === 0) continue;
        for (const code of item.mistakeTags) {
          const entry = clusterMap.get(code) || { count: 0, sections: new Set<SectionKey>() };
          entry.count += 1;
          entry.sections.add(sec.section);
          if (!entry.samplePrompt && item.prompt) {
            entry.samplePrompt = item.prompt.slice(0, 180);
            entry.sampleWrong = (item.givenText || item.given || "").slice(0, 140);
            entry.sampleRight = (item.correctText || item.correct || "").slice(0, 140);
          }
          clusterMap.set(code, entry);

          // Only auto-persist Lesen & Hören here (Schreiben/Sprechen already persisted on AI eval)
          if (sec.section === "lesen" || sec.section === "hoeren") {
            dnaOccurrencesToPersist.push({
              errorKey: code,
              source: sec.section,
              prompt: item.prompt,
              wrong: item.givenText || item.given || "",
              right: item.correctText || item.correct || "",
            });
          }
        }
      }
    }

    const mistakeSummary: ExamMistakeCluster[] = Array.from(clusterMap.entries())
      .map(([errorKey, data]) => ({
        errorKey,
        count: data.count,
        sections: Array.from(data.sections),
        samplePrompt: data.samplePrompt,
        sampleWrong: data.sampleWrong,
        sampleRight: data.sampleRight,
      }))
      .sort((a, b) => b.count - a.count);

    let attemptId: string | null = `score_${contentFingerprint}`;
    let persisted = false;

    const cached = recentAttemptCache.get(contentFingerprint);
    if (cached && Date.now() - cached.at < 30 * 60 * 1000) {
      attemptId = cached.attemptId;
      persisted = cached.persisted;
    } else if (hasAnyAnswer) {
      const saved = await saveExamAttempt({
        userEmail: session.email,
        testId: test.id,
        level,
        lesenScore: lesenPercent,
        hoerenScore: hoerenPercent,
        schreibenScore: schreibenPercent,
        sprechenScore: sprechenPercent,
        overallPercent,
        passed,
        answersJson: { lesenAnswers, hoerenAnswers },
        aiFeedbackJson: { schreibenPercent, sprechenPercent },
      });
      attemptId = saved.id;
      persisted = saved.persisted;

      // Durable Cloud Firestore write with deterministic idempotent doc ID (Admin SDK)
      try {
        const adminDb = await getFirebaseAdminFirestore();
        if (adminDb) {
          await adminDb
            .collection("test_scores")
            .doc(`score_${contentFingerprint}`)
            .set(
              {
                scoreId: `score_${contentFingerprint}`,
                studentId: session.uid,
                course: level,
                level: level.toUpperCase().slice(0, 10),
                score: overallPercent,
                passPercent: test.passPercent,
                passed,
                sections: {
                  lesen: lesenPercent,
                  hoeren: hoerenPercent,
                  schreiben: schreibenPercent,
                  sprechen: sprechenPercent,
                },
                submittedAt: new Date(),
              },
              { merge: true },
            );
          persisted = true;
        }
      } catch (fsErr) {
        console.warn("[GTF Firestore] Test score admin sync notice:", fsErr);
      }

      if (dnaOccurrencesToPersist.length > 0) {
        await recordMistakeOccurrencesAdmin(session.uid, dnaOccurrencesToPersist).catch(() => {});
      }

      if (recentAttemptCache.size > 500) recentAttemptCache.clear();
      recentAttemptCache.set(contentFingerprint, {
        attemptId,
        persisted,
        at: Date.now(),
      });
    }

    const result: ExamResult = {
      testId: test.id,
      level,
      title: test.title,
      passPercent: test.passPercent,
      sections,
      overallPercent,
      passed,
      attemptId,
      persisted,
      mistakeSummary,
    };

    return NextResponse.json({ result });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Failed to score exam" },
      { status: 500 },
    );
  }
}
