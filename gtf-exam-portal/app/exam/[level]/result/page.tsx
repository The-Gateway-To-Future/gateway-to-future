"use client";

import Link from "next/link";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import { Suspense, useEffect, useState } from "react";
import {
  Award,
  CheckCircle2,
  Lock,
  RotateCcw,
  ShieldCheck,
  XCircle,
} from "lucide-react";
import { ExamHeader } from "@/components/ExamHeader";
import { MathText } from "@/components/MathText";
import { MistakeDnaRadarCard } from "@/components/MistakeDnaRadarCard";
import { BottomNavigationBar } from "@/components/BottomNavigationBar";
import { useAuth } from "@/lib/auth-context";
import {
  loadExamState,
  resetExamState,
  type ExamMode,
} from "@/lib/client-storage";
import { SECTION_META, isLevel, type Level, type SectionKey } from "@/lib/config";
import { resolveProgressUid } from "@/lib/firebase/progress";
import { loadMistakeDna } from "@/lib/mistake-dna/store";
import { MISTAKE_TAXONOMY } from "@/lib/mistake-dna/taxonomy";
import type { ExamResult } from "@/lib/types";

function ExamResultPageInner() {
  const router = useRouter();
  const { user } = useAuth();
  const params = useParams<{ level: string }>();
  const searchParams = useSearchParams();
  const rawLevel = (params?.level || "b1").toLowerCase();
  const level: Level = isLevel(rawLevel) ? rawLevel : "b1";
  const defaultTestId = `gtf-${level}-modelltest-1`;
  const testId = (searchParams?.get("testId") || defaultTestId).trim().toLowerCase();
  const testQuery =
    testId !== defaultTestId ? `?testId=${encodeURIComponent(testId)}` : "";

  const [result, setResult] = useState<ExamResult | null>(null);
  const [examMode, setExamMode] = useState<ExamMode>("practice");
  const [expiredSections, setExpiredSections] = useState<SectionKey[]>([]);
  const [activeSectionTab, setActiveSectionTab] = useState<SectionKey>("lesen");
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const computeScorecard = async () => {
    setLoading(true);
    setErrorMsg(null);
    try {
      const st = loadExamState(level, undefined, testId);
      setExamMode(st.examMode || "practice");
      setExpiredSections(st.expiredSections || []);
      const attemptKey = `${level}_${testId}_${st.startedAt || 0}`;
      const res = await fetch("/api/exam/score", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          level,
          testId,
          attemptKey,
          lesenAnswers: st.lesenAnswers,
          hoerenAnswers: st.hoerenAnswers,
          schreibenEvaluations: st.schreibenEvaluations,
          sprechenEvaluations: st.sprechenEvaluations,
        }),
      });
      if (res.ok) {
        const data = (await res.json()) as { result: ExamResult };
        setResult(data.result);
        // Refresh local Mistake-DNA cache from cloud so Dashboard Radar reflects this exam immediately
        const uid = resolveProgressUid(user);
        if (uid && uid !== "guest") {
          void loadMistakeDna(uid);
        }
      } else {
        const errData = await res.json().catch(() => ({}));
        setErrorMsg(errData.error || "Ergebnis konnte nicht berechnet werden.");
      }
    } catch {
      setErrorMsg("Netzwerkfehler beim Berechnen des Prüfungsergebnisses.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    computeScorecard();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [level, testId]);

  const handleRestart = () => {
    if (
      typeof window !== "undefined" &&
      !window.confirm(
        "Möchten Sie wirklich alle Antworten dieses Modelltests (Lesen, Hören, Schreiben, Sprechen) zurücksetzen und neu starten?",
      )
    ) {
      return;
    }
    resetExamState(level, undefined, testId);
    router.push(`/exam/${level}/lesen${testQuery}`);
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
        testId={testId}
        onResetExam={handleRestart}
      />

      <main className="mx-auto w-full max-w-7xl flex-1 px-4 py-6 sm:px-6">
        {errorMsg ? (
          <div className="rounded-2xl border border-amber-300 bg-amber-50 p-6 text-center text-sm text-amber-900 shadow-sm space-y-3">
            <p className="font-bold">{errorMsg}</p>
            <button
              type="button"
              onClick={computeScorecard}
              className="rounded-xl bg-slate-900 px-4 py-2 text-xs font-bold text-white hover:bg-slate-800 transition cursor-pointer"
            >
              Erneut versuchen
            </button>
          </div>
        ) : loading || !result ? (
          <div className="rounded-2xl border border-slate-200 bg-white p-8 text-center text-sm text-slate-600 shadow-sm flex items-center justify-center gap-3">
            <div className="h-4 w-4 animate-spin rounded-full border-2 border-slate-300 border-t-slate-900" />
            <span>Berechne Ihr vollständiges Goethe / telc Prüfungsergebnis…</span>
          </div>
        ) : (
          <div className="space-y-6">
            {/* Overall Scorecard Banner + Authentic Modular Pass Gates */}
            <div className="rounded-2xl border border-slate-200 bg-white p-6 text-slate-900 shadow-sm sm:p-8">
              <div className="flex flex-wrap items-center justify-between gap-6">
                <div className="space-y-2">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-slate-100 px-3 py-1 text-xs font-bold text-slate-800">
                      <Award className="h-4 w-4 text-amber-600" />
                      <span>Offizieller GTF Prüfungsbericht · Attempt {result.attemptId}</span>
                    </span>
                    <span
                      className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-bold ${
                        examMode === "exam"
                          ? "border-rose-200 bg-rose-50 text-rose-800"
                          : "border-sky-200 bg-sky-50 text-sky-800"
                      }`}
                    >
                      {examMode === "exam" ? (
                        <Lock className="h-3.5 w-3.5" />
                      ) : (
                        <ShieldCheck className="h-3.5 w-3.5" />
                      )}
                      <span>
                        {examMode === "exam"
                          ? "Prüfungsmodus (Proctored)"
                          : "Übungsmodus (Practice)"}
                      </span>
                    </span>
                  </div>
                  <h2 className="text-2xl font-extrabold tracking-tight text-slate-900 sm:text-3xl">{result.title}</h2>
                  <p className="text-xs text-slate-500 sm:text-sm">
                    Goethe/telc Modular-Regel: Jedes der 4 Module muss einzeln ≥ {result.passPercent}% erreichen.
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
                      {result.passed
                        ? "GESAMTZERTIFIKAT BESTANDEN"
                        : `${result.sections.filter((s) => s.passed).length}/4 MODULE BESTANDEN`}
                    </div>
                  </div>
                </div>
              </div>

              {/* Modular Pass Gate Status Strip */}
              {(() => {
                const passedModules = result.sections.filter((s) => s.passed);
                const failedModules = result.sections.filter((s) => !s.passed);
                return (
                  <div
                    className={`mt-5 rounded-2xl border p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs ${
                      result.passed
                        ? "border-emerald-200 bg-emerald-50/70 text-emerald-950"
                        : "border-amber-200 bg-amber-50/70 text-amber-950"
                    }`}
                  >
                    <div className="space-y-1">
                      <p className="font-extrabold uppercase tracking-wider text-[11px]">
                        {result.passed
                          ? "Alle 4 Modul-Bestehensgrenzen erfüllt (≥ 60% pro Modul)"
                          : `Modulare Bestehensprüfung: ${passedModules.length} von ${result.sections.length} Modulen ≥ ${result.passPercent}%`}
                      </p>
                      <p className="text-slate-700 leading-relaxed">
                        {result.passed
                          ? "Herzlichen Glückwunsch! Sie haben sowohl den Gesamtschnitt als auch jede einzelne Modul-Hürde bestanden."
                          : `Nach offizieller Goethe/telc-Regel reichen ${result.overallPercent}% gesamt allein nicht aus — wiederholen Sie gezielt die offenen Module (${failedModules.map((m) => SECTION_META[m.section].label).join(", ")}), bis jedes Modul ≥ ${result.passPercent}% erreicht.`}
                      </p>
                    </div>
                    {failedModules.length > 0 && (
                      <div className="flex flex-wrap gap-1.5 shrink-0">
                        {failedModules.map((m) => (
                          <Link
                            key={m.section}
                            href={`/exam/${level}/${m.section}${testQuery}`}
                            className="inline-flex items-center gap-1 rounded-lg bg-slate-900 px-3 py-1.5 text-[11px] font-bold text-white hover:bg-slate-800 transition"
                          >
                            <span>{SECTION_META[m.section].label} wiederholen</span>
                          </Link>
                        ))}
                      </div>
                    )}
                  </div>
                );
              })()}

              {/* 4 Section summary cards */}
              <div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                {(result?.sections || []).map((sec) => {
                  const meta = SECTION_META[sec.section];
                  const active = activeSectionTab === sec.section;
                  const wasAutoSubmitted = expiredSections.includes(sec.section);
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
                          {sec.passed ? "Bestanden ✓" : `< ${result.passPercent}%`}
                        </span>
                      </div>
                      <p
                        className={`text-[11px] mt-1 ${
                          active ? "text-slate-300" : "text-slate-500"
                        }`}
                      >
                        {meta.english}
                        {wasAutoSubmitted ? " · Zeitlimit" : ""}
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

            {/* Mistake-DNA Weak-Spot Breakdown for This Exam */}
            <MistakeDnaRadarCard
              mode="exam-review"
              examClusters={result.mistakeSummary || []}
              level={level}
            />

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
                      href={`/exam/${level}/${currentSection.section}${testQuery}`}
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

                      {!item.isCorrect && item.mistakeTags && item.mistakeTags.length > 0 && (
                        <div className="mt-2.5 flex flex-wrap items-center gap-1.5">
                          <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500">
                            Mistake-DNA:
                          </span>
                          {item.mistakeTags.map((code) => (
                            <Link
                              key={code}
                              href={`/mistake-dna?focus=${encodeURIComponent(code)}`}
                              className="inline-flex items-center gap-1 rounded-md border border-amber-300 bg-amber-100/80 px-2 py-0.5 font-mono text-[10px] font-bold text-amber-900 hover:bg-amber-200 transition"
                            >
                              <span>{code}</span>
                              <span className="font-sans font-semibold text-amber-800">
                                · {MISTAKE_TAXONOMY[code]?.shortLabel || code}
                              </span>
                            </Link>
                          ))}
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

export default function ExamResultPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center bg-slate-50 text-slate-600 text-sm">
          Lade Prüfungsergebnis…
        </div>
      }
    >
      <ExamResultPageInner />
    </Suspense>
  );
}
