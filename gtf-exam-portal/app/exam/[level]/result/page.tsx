"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useEffect, useState } from "react";
import {
  Award,
  CheckCircle2,
  RotateCcw,
  XCircle,
} from "lucide-react";
import { ExamHeader } from "@/components/ExamHeader";
import { MathText } from "@/components/MathText";
import { BottomNavigationBar } from "@/components/BottomNavigationBar";
import {
  getActiveUserEmail,
  getActiveUserProfile,
  loadExamState,
  resetExamState,
} from "@/lib/client-storage";
import { SECTION_META, isLevel, type Level, type SectionKey } from "@/lib/config";
import type { ExamResult } from "@/lib/types";

export default function ExamResultPage() {
  const params = useParams<{ level: string }>();
  const rawLevel = (params?.level || "b1").toLowerCase();
  const level: Level = isLevel(rawLevel) ? rawLevel : "b1";

  const [result, setResult] = useState<ExamResult | null>(null);
  const [activeSectionTab, setActiveSectionTab] = useState<SectionKey>("lesen");
  const [loading, setLoading] = useState(true);

  const computeScorecard = async () => {
    setLoading(true);
    try {
      const st = loadExamState(level);
      const profile = getActiveUserProfile();
      const userEmail = profile?.userEmail || getActiveUserEmail();
      const studentId = profile?.studentId;
      const res = await fetch("/api/exam/score", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          level,
          testId: st.testId,
          userEmail,
          studentId,
          lesenAnswers: st.lesenAnswers,
          hoerenAnswers: st.hoerenAnswers,
          schreibenEvaluations: st.schreibenEvaluations,
          sprechenEvaluations: st.sprechenEvaluations,
        }),
      });
      if (res.ok) {
        const data = (await res.json()) as { result: ExamResult };
        setResult(data.result);
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    computeScorecard();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [level]);

  const handleRestart = () => {
    resetExamState(level);
    computeScorecard();
  };

  const currentSection = result?.sections.find((s) => s.section === activeSectionTab);
  const isStkExam =
    level === "m_kurs" ||
    level === "t_kurs" ||
    level === "w_kurs" ||
    level === "g_kurs";

  return (
    <div className="min-h-screen flex flex-col bg-slate-50 text-slate-900 pb-28 md:pb-12 light-study">
      <ExamHeader
        level={level}
        activeSection="result"
        durationMinutes={0}
        testTitle={result?.title}
        onResetExam={handleRestart}
      />

      <main className="mx-auto w-full max-w-7xl flex-1 px-4 py-6 sm:px-6">
        {loading || !result ? (
          <div className="rounded-2xl border border-slate-200 bg-white p-8 text-center text-sm text-slate-600 shadow-sm flex items-center justify-center gap-3">
            <div className="h-4 w-4 animate-spin rounded-full border-2 border-slate-300 border-t-slate-900" />
            <span>Berechne Ihr vollständiges Goethe / telc Prüfungsergebnis…</span>
          </div>
        ) : (
          <div className="space-y-6">
            {/* Overall Scorecard Banner */}
            <div className="rounded-2xl border border-slate-200 bg-white p-6 text-slate-900 shadow-sm sm:p-8">
              <div className="flex flex-wrap items-center justify-between gap-6">
                <div className="space-y-2">
                  <div className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-slate-100 px-3 py-1 text-xs font-bold text-slate-800">
                    <Award className="h-4 w-4 text-amber-600" />
                    <span>Offizieller GTF Prüfungsbericht · Attempt {result.attemptId}</span>
                  </div>
                  <h2 className="text-2xl font-extrabold tracking-tight text-slate-900 sm:text-3xl">{result.title}</h2>
                  <p className="text-xs text-slate-500 sm:text-sm">
                    Bestehensgrenze: {result.passPercent}% · Alle vier Module im Überblick
                  </p>
                </div>

                <div className="flex items-center gap-4 rounded-2xl border border-slate-200 bg-slate-50 px-6 py-4 shadow-xs">
                  <div className="text-right">
                    <div className="text-[11px] uppercase tracking-wider text-slate-500 font-semibold">
                      Gesamtergebnis
                    </div>
                    <div className="text-3xl font-extrabold text-slate-900">
                      {result.overallPercent}%
                    </div>
                    <div
                      className={`text-xs font-bold mt-0.5 ${
                        result.passed ? "text-emerald-600" : "text-amber-600"
                      }`}
                    >
                      {result.passed ? "BESTANDEN (PASSED)" : "NOCH IN ÜBUNG (< 60%)"}
                    </div>
                  </div>
                </div>
              </div>

              {/* 4 Section summary cards */}
              <div className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                {(result?.sections || []).map((sec) => {
                  const meta = SECTION_META[sec.section];
                  const active = activeSectionTab === sec.section;
                  return (
                    <button
                      key={sec.section}
                      type="button"
                      onClick={() => setActiveSectionTab(sec.section)}
                      className={`relative z-20 cursor-pointer flex flex-col justify-between rounded-2xl border p-4 text-left transition ${
                        active
                          ? "border-slate-900 !bg-slate-900 !text-white shadow-md"
                          : "border-slate-200 bg-white text-slate-800 hover:border-slate-300 hover:bg-slate-50/80 shadow-xs"
                      }`}
                    >
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-xs font-extrabold uppercase tracking-wider">
                          {meta.label}
                        </span>
                        <span
                          className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${
                            sec.passed
                              ? active
                                ? "bg-emerald-600 text-white"
                                : "bg-emerald-50 text-emerald-700 border border-emerald-200"
                              : active
                                ? "bg-amber-600 text-white"
                                : "bg-amber-50 text-amber-700 border border-amber-200"
                          }`}
                        >
                          {sec.passed ? "≥ 60%" : "< 60%"}
                        </span>
                      </div>
                      <p
                        className={`text-[11px] mt-1 ${
                          active ? "text-slate-300" : "text-slate-500"
                        }`}
                      >
                        {meta.english}
                      </p>
                      <div className="mt-3 flex items-baseline justify-between">
                        <span className="text-2xl font-extrabold">{sec.percent}%</span>
                        <span
                          className={`text-xs font-mono ${
                            active ? "text-slate-300" : "text-slate-500"
                          }`}
                        >
                          {sec.score} / {sec.max} Pkt.
                        </span>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Detailed Item-by-Item Breakdown & Explanations */}
            {currentSection && (
              <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm space-y-4 text-slate-900">
                <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 pb-4">
                  <div>
                    <h3 className="text-lg font-bold text-slate-900">
                      Detailauswertung &amp; Erklärungen:{" "}
                      {SECTION_META[currentSection.section].label} (
                      {SECTION_META[currentSection.section].english})
                    </h3>
                    <p className="text-xs text-slate-500 mt-0.5">
                      Jede Aufgabe mit richtiger Lösung und zweisprachiger Erklärung (Deutsch + Hinglish).
                    </p>
                  </div>

                  <div className="flex flex-wrap items-center gap-2">
                    <Link
                      href={`/exam/${level}/${currentSection.section}`}
                      className="relative z-10 cursor-pointer rounded-xl bg-slate-900 text-white px-3.5 py-2 text-xs font-bold hover:bg-slate-800 transition shadow-xs"
                    >
                      Modul {SECTION_META[currentSection.section].label} öffnen
                    </Link>
                    <button
                      type="button"
                      onClick={handleRestart}
                      className="relative z-10 cursor-pointer inline-flex items-center gap-1 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-100 hover:text-slate-900 transition"
                    >
                      <RotateCcw className="h-3.5 w-3.5" />
                      <span>Alle Antworten zurücksetzen</span>
                    </button>
                  </div>
                </div>

                <div className="space-y-3">
                  {(currentSection?.items || []).map((item) => (
                    <div
                      key={item.id}
                      className={`rounded-2xl border p-4 text-xs sm:text-sm ${
                        item.isCorrect
                          ? "border-emerald-200 bg-emerald-50/50"
                          : "border-amber-200 bg-amber-50/50"
                      }`}
                    >
                      <div className="flex flex-wrap items-start justify-between gap-2">
                        <div>
                          <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
                            {item.teilTitle}
                          </span>
                          <h4 className="font-bold text-slate-900 mt-0.5 overflow-x-auto">
                            {isStkExam ? <MathText text={item.prompt} /> : item.prompt}
                          </h4>
                        </div>

                        {item.isCorrect ? (
                          <span className="inline-flex items-center gap-1 rounded-full border border-emerald-200 bg-emerald-100/70 px-2.5 py-0.5 text-xs font-bold text-emerald-800">
                            <CheckCircle2 className="h-3.5 w-3.5" /> Richtig
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 rounded-full border border-amber-200 bg-amber-100/70 px-2.5 py-0.5 text-xs font-bold text-amber-800">
                            <XCircle className="h-3.5 w-3.5" /> Überprüfen
                          </span>
                        )}
                      </div>

                      <div className="mt-2.5 flex flex-wrap gap-4 text-xs">
                        <div>
                          <span className="text-slate-600">Ihre Antwort: </span>
                          <strong
                            className={
                              item.isCorrect ? "text-emerald-700" : "text-rose-600"
                            }
                          >
                            {item.givenText ? (
                              isStkExam ? <MathText text={item.givenText} /> : item.givenText
                            ) : (
                              "— (Keine Angabe)"
                            )}
                          </strong>
                        </div>
                        <div>
                          <span className="text-slate-600">Richtige Lösung: </span>
                          <strong className="text-emerald-700">
                            {isStkExam ? <MathText text={item.correctText} /> : item.correctText}
                          </strong>
                        </div>
                      </div>

                      {item.explanation && (
                        <div className="mt-2.5 rounded-xl bg-white p-3 text-xs text-slate-700 border border-slate-200 shadow-xs overflow-x-auto">
                          <strong className="text-slate-900">Erklärung: </strong>
                          {isStkExam ? <MathText text={item.explanation} /> : item.explanation}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </main>

      <BottomNavigationBar />
    </div>
  );
}
