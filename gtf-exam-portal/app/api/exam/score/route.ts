import { NextResponse } from "next/server";
import { isLevel } from "@/lib/config";
import { getServerExamTest, saveExamAttempt } from "@/lib/server/catalog";
import { serverEnv } from "@/lib/server/env";
import { saveTestScoreToFirestore } from "@/lib/server/firestore-student";
import type {
  ExamResult,
  Question,
  SchreibenEvaluation,
  ScoredItem,
  SectionScore,
  SprechenEvaluation,
} from "@/lib/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

interface ScoreRequestBody {
  level?: string;
  testId?: string;
  userEmail?: string;
  studentId?: string;
  lesenAnswers?: Record<string, string>;
  hoerenAnswers?: Record<string, string>;
  schreibenEvaluations?: Record<string, SchreibenEvaluation>;
  sprechenEvaluations?: Record<string, SprechenEvaluation>;
}

function optionText(q: Question, id: string | null | undefined): string | null {
  if (!id) return null;
  if (q.type === "richtig_falsch") {
    return id === "richtig" ? "Richtig" : id === "falsch" ? "Falsch" : id;
  }
  const found = q.options.find((o) => o.id === id);
  return found ? `${found.id.toUpperCase()}) ${found.text}` : id;
}

export async function POST(req: Request) {
  try {
    const body = (await req.json()) as ScoreRequestBody;
    const rawLevel = (body.level || "b1").toLowerCase();
    const level = isLevel(rawLevel) ? rawLevel : "b1";
    const test = getServerExamTest(level, body.testId);

    const lesenAnswers = body.lesenAnswers || {};
    const hoerenAnswers = body.hoerenAnswers || {};
    const schreibenEvals = body.schreibenEvaluations || {};
    const sprechenEvals = body.sprechenEvaluations || {};

    // 1. Score Lesen + Sprachbausteine
    const lesenItems: ScoredItem[] = [];
    for (const teil of test.sections.lesen.teile) {
      if (teil.kind === "reading") {
        for (const q of teil.questions) {
          const given = lesenAnswers[q.id] ?? null;
          const correct = q.answer || "";
          const isCorrect = Boolean(given && given === correct);
          lesenItems.push({
            id: q.id,
            teilTitle: teil.title,
            prompt: q.prompt,
            given,
            givenText: optionText(q, given),
            correct,
            correctText: optionText(q, correct) || correct,
            isCorrect,
            points: isCorrect ? q.points || 1 : 0,
            explanation: q.explanation || "",
          });
        }
      } else {
        for (const g of teil.gaps) {
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
          lesenItems.push({
            id: key,
            teilTitle: teil.title,
            prompt: `Lücke [${g.id}]`,
            given,
            givenText: findLabel(given),
            correct,
            correctText: findLabel(correct) || correct,
            isCorrect,
            points: isCorrect ? g.points || 1 : 0,
            explanation: g.explanation || "",
          });
        }
      }
    }

    const lesenRawScore = lesenItems.reduce((sum, it) => sum + it.points, 0);
    const lesenMax = Math.max(1, lesenItems.length);
    const lesenPercent = Math.round((lesenRawScore / lesenMax) * 100);

    // 2. Score Hören
    const hoerenItems: ScoredItem[] = [];
    for (const teil of test.sections.hoeren.teile) {
      for (const q of teil.questions) {
        const given = hoerenAnswers[q.id] ?? null;
        const correct = q.answer || "";
        const isCorrect = Boolean(given && given === correct);
        hoerenItems.push({
          id: q.id,
          teilTitle: teil.title,
          prompt: q.prompt,
          given,
          givenText: optionText(q, given),
          correct,
          correctText: optionText(q, correct) || correct,
          isCorrect,
          points: isCorrect ? q.points || 1 : 0,
          explanation: q.explanation || "",
        });
      }
    }

    const hoerenRawScore = hoerenItems.reduce((sum, it) => sum + it.points, 0);
    const hoerenMax = Math.max(1, hoerenItems.length);
    const hoerenPercent = Math.round((hoerenRawScore / hoerenMax) * 100);

    // 3. Score Schreiben (from AI evaluations)
    const schreibenItems: ScoredItem[] = test.sections.schreiben.tasks.map((task) => {
      const ev = schreibenEvals[task.id];
      const pct = ev ? ev.score : 0;
      const isCorrect = pct >= test.passPercent;
      return {
        id: task.id,
        teilTitle: task.title,
        prompt: task.situation,
        given: ev ? `${ev.wordCount} Wörter (${ev.cefrEstimate})` : null,
        givenText: ev ? `${ev.score}/100 Punkte · Niveau ${ev.cefrEstimate}` : "Noch nicht eingereicht",
        correct: `≥ ${test.passPercent}/100 Punkte`,
        correctText: `Goethe/telc Bestehensgrenze (${test.passPercent}%)`,
        isCorrect,
        points: pct,
        explanation: ev
          ? `${ev.summaryDe} — Hinglish: ${ev.summaryHinglish}`
          : "Reichen Sie Ihren Text im Modul „Schreiben“ zur KI-Bewertung ein.",
      };
    });

    const schreibenEvalValues = Object.values(schreibenEvals);
    const schreibenPercent =
      schreibenEvalValues.length > 0
        ? Math.round(
            schreibenEvalValues.reduce((acc, ev) => acc + ev.score, 0) /
              schreibenEvalValues.length,
          )
        : 0;

    // 4. Score Sprechen (from AI evaluations)
    const sprechenItems: ScoredItem[] = test.sections.sprechen.teile.map((teil) => {
      const ev = sprechenEvals[teil.id];
      const pct = ev ? ev.score : 0;
      const isCorrect = pct >= test.passPercent;
      return {
        id: teil.id,
        teilTitle: teil.title,
        prompt: teil.card.heading,
        given: ev ? `${ev.durationSeconds}s Aufnahme` : null,
        givenText: ev ? `${ev.score}/100 Punkte · Niveau ${ev.cefrEstimate}` : "Noch nicht aufgenommen",
        correct: `≥ ${test.passPercent}/100 Punkte`,
        correctText: `Goethe/telc Bestehensgrenze (${test.passPercent}%)`,
        isCorrect,
        points: pct,
        explanation: ev
          ? `${ev.summaryDe} — Hinglish: ${ev.summaryHinglish}`
          : "Nehmen Sie im Modul „Sprechen“ Ihre Antwort per Mikrofon auf.",
      };
    });

    const sprechenEvalValues = Object.values(sprechenEvals);
    const sprechenPercent =
      sprechenEvalValues.length > 0
        ? Math.round(
            sprechenEvalValues.reduce((acc, ev) => acc + ev.score, 0) /
              sprechenEvalValues.length,
          )
        : 0;

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
    const passed = overallPercent >= test.passPercent;

    const saved = await saveExamAttempt({
      userEmail: body.userEmail || serverEnv.demoUserEmail,
      testId: test.id,
      level,
      lesenScore: lesenPercent,
      hoerenScore: hoerenPercent,
      schreibenScore: schreibenPercent,
      sprechenScore: sprechenPercent,
      overallPercent,
      passed,
      answersJson: { lesenAnswers, hoerenAnswers },
      aiFeedbackJson: { schreibenEvals, sprechenEvals },
    });

    // Cloud Firestore Sync: Save score to `test_scores` collection in europe-west3
    let scoreId = `score_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    try {
      const email = (body.userEmail || serverEnv.demoUserEmail).toLowerCase().trim();
      let sanitizedStudentId = (body.studentId || "").trim();
      if (!sanitizedStudentId) {
        const emailPrefix = email.split("@")[0].replace(/[^A-Za-z0-9_-]/g, "_");
        sanitizedStudentId = `STUDENT_${emailPrefix}`;
      } else {
        sanitizedStudentId = sanitizedStudentId.replace(/[^A-Za-z0-9_-]/g, "_");
      }
      if (sanitizedStudentId.length < 3) sanitizedStudentId = "GTF_STUDENT";
      if (sanitizedStudentId.length > 50) sanitizedStudentId = sanitizedStudentId.substring(0, 50);

      const fsRes = await saveTestScoreToFirestore({
        scoreId,
        studentId: sanitizedStudentId,
        course: level,
        level,
        score: overallPercent,
        passPercent: test.passPercent,
        passed,
        sections: {
          lesen: Math.round(lesenPercent),
          hoeren: Math.round(hoerenPercent),
          schreiben: Math.round(schreibenPercent),
          sprechen: Math.round(sprechenPercent),
        },
        submittedAt: new Date().toISOString(),
      });
      if (fsRes.scoreId) {
        scoreId = fsRes.scoreId;
      }
    } catch (fsErr) {
      console.warn("[GTF Firestore] Test score sync non-fatal error:", fsErr);
    }

    const result: ExamResult = {
      testId: test.id,
      level,
      title: test.title,
      passPercent: test.passPercent,
      sections,
      overallPercent,
      passed,
      attemptId: saved.id,
      persisted: saved.persisted,
    };

    return NextResponse.json({ result });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Failed to score exam" },
      { status: 500 },
    );
  }
}
