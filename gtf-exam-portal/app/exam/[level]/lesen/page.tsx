"use client";

import Link from "next/link";
import { useParams, useSearchParams } from "next/navigation";
import { Suspense, useEffect, useState } from "react";
import { motion } from "framer-motion";
import {
  ArrowRight,
  Ban,
  BookOpen,
  CheckCircle2,
  Puzzle,
  Sparkles,
} from "lucide-react";
import { ExamHeader } from "@/components/ExamHeader";
import { MathText } from "@/components/MathText";
import {
  loadExamState,
  resetExamSection,
  saveExamState,
} from "@/lib/client-storage";
import { isLevel, type Level } from "@/lib/config";
import type { ExamTest, LesenTeil, SprachbausteineTeil } from "@/lib/types";

function LesenExamPageInner() {
  const params = useParams<{ level: string }>();
  const searchParams = useSearchParams();
  const rawLevel = (params?.level || "b1").toLowerCase();
  const level: Level = isLevel(rawLevel) ? rawLevel : "b1";
  const defaultTestId = `gtf-${level}-modelltest-1`;
  const testId = (searchParams?.get("testId") || defaultTestId).trim().toLowerCase();
  const testQuery =
    testId !== defaultTestId ? `?testId=${encodeURIComponent(testId)}` : "";

  const [test, setTest] = useState<ExamTest | null>(null);
  const [activeTeilIdx, setActiveTeilIdx] = useState(0);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [selectedWordId, setSelectedWordId] = useState<string | null>(null);
  const [draggedWordId, setDraggedWordId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setActiveTeilIdx(0);
    setSelectedWordId(null);
    setLoading(true);
    const state = loadExamState(level, undefined, testId);
    setAnswers(state.lesenAnswers || {});

    const cacheKey = `gtf_exam_test_${level}_${testId}`;
    // 1. Instant cache check for <100ms load
    try {
      const cached = sessionStorage.getItem(cacheKey);
      if (cached) {
        const parsed = JSON.parse(cached) as ExamTest;
        if (parsed?.sections?.lesen?.teile?.length) {
          setTest(parsed);
          setLoading(false);
        }
      }
    } catch {
      // ignore
    }

    async function fetchTest() {
      try {
        const res = await fetch(
          `/api/drive/fetch-test?level=${encodeURIComponent(level)}&testId=${encodeURIComponent(testId)}`,
          { credentials: "include" },
        );
        if (res.ok) {
          const data = (await res.json()) as { test: ExamTest };
          if (data?.test?.sections?.lesen?.teile?.length) {
            setTest(data.test);
            try {
              sessionStorage.setItem(cacheKey, JSON.stringify(data.test));
            } catch {}
          }
        }
      } catch (err) {
        console.warn("[gtf] Error loading lesen test:", err);
      } finally {
        setLoading(false);
      }
    }
    fetchTest();
  }, [level, testId]);

  const setAnswer = (key: string, value: string) => {
    setAnswers((prev) => {
      const next = { ...prev, [key]: value };
      saveExamState(level, (st) => ({ ...st, lesenAnswers: next }), undefined, testId);
      return next;
    });
  };

  const clearAnswer = (key: string) => {
    setAnswers((prev) => {
      const next = { ...prev };
      delete next[key];
      saveExamState(level, (st) => ({ ...st, lesenAnswers: next }), undefined, testId);
      return next;
    });
  };

  const handleReset = () => {
    if (
      typeof window !== "undefined" &&
      !window.confirm("Alle Antworten in diesem Modul (Lesen) zurücksetzen? Ihre anderen Prüfungsteile bleiben erhalten.")
    ) {
      return;
    }
    const fresh = resetExamSection(level, "lesen", undefined, testId);
    setAnswers(fresh.lesenAnswers);
  };

  const teile: LesenTeil[] = test?.sections.lesen.teile || [];
  const currentTeil: LesenTeil | undefined = teile[activeTeilIdx];
  const isStkExam =
    level === "m_kurs" ||
    level === "t_kurs" ||
    level === "w_kurs" ||
    level === "g_kurs";

  const renderSprachbausteinePassage = (teil: SprachbausteineTeil) => {
    const segments = teil.text.split(/(\{\{\d+\}\})/g);
    const wordBank = teil.wordBank || [];

    return (
      <div className="leading-8 text-sm text-slate-800 sm:text-base whitespace-pre-wrap german-reading prose-optimal">
        {segments.map((seg, idx) => {
          const match = /^\{\{(\d+)\}\}$/.exec(seg);
          if (!match) {
            return <span key={idx}>{seg}</span>;
          }
          const gapId = match[1];
          const answerKey = `gap-${gapId}`;
          const chosenId = answers[answerKey];
          const gapDef = teil.gaps.find((g) => g.id === gapId);
          const pool = gapDef?.options || wordBank;
          const chosenOption = pool.find((o) => o.id === chosenId);

          return (
            <span
              key={idx}
              onDragOver={(e) => e.preventDefault()}
              onDrop={() => {
                if (draggedWordId) {
                  setAnswer(answerKey, draggedWordId);
                  setDraggedWordId(null);
                }
              }}
              onClick={() => {
                if (teil.mode === "wordbank" && selectedWordId) {
                  setAnswer(answerKey, selectedWordId);
                  setSelectedWordId(null);
                } else if (chosenId) {
                  clearAnswer(answerKey);
                }
              }}
              className={`mx-1 inline-flex cursor-pointer items-center gap-1 rounded-lg border px-2.5 py-0.5 font-bold transition ${
                chosenOption
                  ? "bg-slate-900 text-white border-slate-900 shadow-xs"
                  : selectedWordId
                    ? "border-dashed border-emerald-500 bg-emerald-50 text-emerald-800 animate-pulse"
                    : "border-dashed border-slate-300 bg-slate-100 text-slate-700 hover:border-slate-500"
              }`}
              title={
                chosenOption
                  ? "Klicken zum Entfernen"
                  : "Lücke füllen (rechts auswählen oder Wort hineinziehen)"
              }
            >
              <span className="text-[11px] opacity-75">[{gapId}]</span>
              <span>{chosenOption ? chosenOption.text : "____"}</span>
            </span>
          );
        })}
      </div>
    );
  };

  return (
    <div className="min-h-screen flex flex-col bg-slate-50 text-slate-900 light-study">
      <ExamHeader
        level={level}
        activeSection="lesen"
        durationMinutes={test?.sections?.lesen?.durationMinutes || 70}
        testTitle={test?.title}
        testId={testId}
        onResetExam={handleReset}
      />

      <main className="mx-auto w-full max-w-7xl flex-1 px-4 py-6 sm:px-6">
        {loading && !currentTeil ? (
          <div className="rounded-2xl border border-slate-200 bg-white p-8 text-center text-sm text-slate-700 shadow-sm flex items-center justify-center gap-3">
            <div className="h-4 w-4 animate-spin rounded-full border-2 border-slate-300 border-t-slate-900" />
            <span>Lade Prüfungsmodul Lesen &amp; Sprachbausteine…</span>
          </div>
        ) : !currentTeil ? (
          <div className="rounded-2xl border border-amber-300 bg-amber-50 p-8 text-center text-sm text-amber-900 shadow-sm">
            <p className="font-bold text-slate-900">Keine Leseaufgaben für dieses Modul verfügbar.</p>
            <p className="text-xs text-amber-800 mt-1">Bitte wählen Sie einen anderen Prüfungsteil oben aus.</p>
          </div>
        ) : (
          <div className="space-y-5">
            {/* Sub-navigation across Lesen Teil 1-3 + Sprachbausteine Teil 1-2 */}
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="flex flex-wrap gap-1.5 p-1.5 bg-white rounded-2xl border border-slate-200 shadow-xs">
                {(teile || []).map((t, idx) => {
                  const active = idx === activeTeilIdx;
                  const isSb = t.kind === "sprachbausteine";
                  return (
                    <button
                      key={t.id}
                      type="button"
                      onClick={() => setActiveTeilIdx(idx)}
                      className={`relative z-20 inline-flex items-center gap-1.5 rounded-xl px-3.5 py-2 text-xs font-bold transition-colors select-none cursor-pointer ${
                        active
                          ? "text-white"
                          : "text-slate-600 hover:text-slate-900 hover:bg-slate-100"
                      }`}
                    >
                      {active && (
                        <motion.div
                          layoutId="active-lesen-teil-pill"
                          className="absolute inset-0 rounded-xl bg-slate-900 shadow-sm"
                          transition={{ type: "spring", stiffness: 450, damping: 32 }}
                        />
                      )}
                      <span className="relative z-10 flex items-center gap-1.5">
                        {isSb ? (
                          <Puzzle className={`h-3.5 w-3.5 ${active ? "text-white" : "text-amber-600"}`} />
                        ) : (
                          <BookOpen className={`h-3.5 w-3.5 ${active ? "text-white" : "text-sky-600"}`} />
                        )}
                        <span>{t.title}</span>
                      </span>
                    </button>
                  );
                })}
              </div>

              <Link
                href={`/exam/${level}/hoeren${testQuery}`}
                className="relative z-10 inline-flex items-center gap-1.5 rounded-xl bg-slate-900 text-white px-4 py-2 text-xs font-bold shadow-sm hover:bg-slate-800 transition cursor-pointer"
              >
                <span>Weiter zu Modul 2: Hören</span>
                <ArrowRight className="h-3.5 w-3.5 text-white" />
              </Link>
            </div>

            {/* Instructions banner */}
            <div className="rounded-xl border border-slate-200 bg-white px-4 py-3 text-xs font-medium text-slate-700 shadow-xs german-reading flex flex-wrap items-center justify-between gap-2">
              <div>
                <strong className="text-slate-900">{currentTeil.title}:</strong>{" "}
                {currentTeil.instructions}
              </div>
              {isStkExam && (
                <span className="inline-flex items-center gap-1.5 rounded-full border border-slate-200 bg-slate-100 px-2.5 py-0.5 text-[11px] font-semibold text-slate-700 shrink-0">
                  <Ban className="h-3 w-3 text-slate-500 shrink-0" aria-hidden="true" />
                  <span>Prüfungsmodus: Ohne Taschenrechner</span>
                </span>
              )}
            </div>

            {/* SPLIT-SCREEN EXAM WORKSPACE */}
            <div className="grid gap-6 lg:grid-cols-12">
              {/* LEFT PANE: Reading Passage or Sprachbausteine Lückentext */}
              <div className="lg:col-span-6 rounded-2xl border border-slate-200 bg-white p-5 sm:p-7 shadow-sm text-slate-900">
                {currentTeil.kind === "reading" ? (
                  <div>
                    <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 pb-3">
                      <div>
                        <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
                          Lesetext
                        </span>
                        <h2 className="text-lg font-bold text-slate-900 german-headline">
                          {currentTeil.passageTitle}
                        </h2>
                      </div>
                      {currentTeil.source && (
                        <span className="rounded-md border border-slate-200 bg-slate-50 px-2.5 py-1 text-[11px] font-mono text-slate-600">
                          {currentTeil.source}
                        </span>
                      )}
                    </div>

                    <div className="mt-5 space-y-4 text-sm sm:text-base text-slate-800 leading-relaxed sm:leading-loose german-reading prose-optimal overflow-x-auto">
                      {currentTeil.passage.split("\n\n").map((para, i) => (
                        <p key={i}>
                          {isStkExam ? <MathText text={para} /> : para}
                        </p>
                      ))}
                    </div>
                  </div>
                ) : (
                  <div>
                    <div className="border-b border-slate-100 pb-3">
                      <span className="inline-flex items-center gap-1 text-[11px] font-bold uppercase tracking-wider text-amber-700">
                        <Sparkles className="h-3.5 w-3.5 text-amber-600" />
                        Sprachbausteine Lückentext
                      </span>
                      <h2 className="text-lg font-bold text-slate-900 mt-0.5">
                        {currentTeil.title}
                      </h2>
                    </div>
                    <div className="mt-4">
                      {renderSprachbausteinePassage(currentTeil)}
                    </div>
                  </div>
                )}
              </div>

              {/* RIGHT PANE: Questions (Richtig/Falsch, MCQ, or Sprachbausteine Select/Wordbank) */}
              <div className="lg:col-span-6 space-y-4">
                {currentTeil.kind === "reading" ? (
                  (currentTeil.questions || []).map((q) => {
                    const selected = answers[q.id];
                    return (
                      <div
                        key={q.id}
                        className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm text-slate-900"
                      >
                        <p className="text-sm font-bold text-slate-900 overflow-x-auto">
                          {isStkExam ? <MathText text={q.prompt} /> : q.prompt}
                        </p>

                        {q.type === "richtig_falsch" ? (
                          <div className="mt-3 flex gap-3">
                            {(["richtig", "falsch"] as const).map((choice) => {
                              const active = selected === choice;
                              return (
                                <button
                                  key={choice}
                                  type="button"
                                  onClick={() => setAnswer(q.id, choice)}
                                  className={`relative z-20 flex-1 rounded-xl border py-2.5 text-xs font-bold uppercase tracking-wider transition cursor-pointer ${
                                    active
                                      ? "bg-slate-900 text-white border-slate-900 shadow-sm"
                                      : "border-slate-200 bg-slate-50 text-slate-700 hover:bg-slate-100 hover:text-slate-900"
                                  }`}
                                >
                                  {choice}
                                </button>
                              );
                            })}
                          </div>
                        ) : (
                          <div className="mt-3 space-y-2">
                            {(q.options || []).map((opt) => {
                              const active = selected === opt.id;
                              return (
                                <button
                                  key={opt.id}
                                  type="button"
                                  onClick={() => setAnswer(q.id, opt.id)}
                                  className={`relative z-20 flex w-full items-center gap-3 rounded-xl border px-3.5 py-2.5 text-left text-xs font-medium transition sm:text-sm cursor-pointer ${
                                    active
                                      ? "bg-slate-900 text-white border-slate-900 shadow-sm"
                                      : "border-slate-200 bg-slate-50 text-slate-800 hover:bg-slate-100 hover:text-slate-900"
                                  }`}
                                >
                                  <span
                                    className={`inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-md text-xs font-bold uppercase ${
                                      active
                                        ? "bg-white text-slate-900"
                                        : "bg-white text-slate-700 border border-slate-200"
                                    }`}
                                  >
                                    {opt.id}
                                  </span>
                                  <span className="min-w-0 overflow-x-auto">
                                    {isStkExam ? <MathText text={opt.text} /> : opt.text}
                                  </span>
                                </button>
                              );
                            })}
                          </div>
                        )}
                      </div>
                    );
                  })
                ) : currentTeil.mode === "select" ? (
                  (currentTeil.gaps || []).map((gap) => {
                    const key = `gap-${gap.id}`;
                    const selected = answers[key];
                    return (
                      <div
                        key={gap.id}
                        className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm text-slate-900"
                      >
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-bold text-slate-900">
                            Lücke [{gap.id}]
                          </span>
                          {selected && (
                            <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-700">
                              <CheckCircle2 className="h-3 w-3" /> Ausgewählt
                            </span>
                          )}
                        </div>
                        <div className="mt-2.5 grid grid-cols-1 sm:grid-cols-3 gap-2">
                          {(gap.options || []).map((opt) => {
                            const active = selected === opt.id;
                            return (
                              <button
                                key={opt.id}
                                type="button"
                                onClick={() => setAnswer(key, opt.id)}
                                className={`relative z-20 rounded-xl border px-3 py-2 text-xs font-bold transition cursor-pointer ${
                                  active
                                    ? "bg-slate-900 text-white border-slate-900 shadow-xs"
                                    : "border-slate-200 bg-slate-50 text-slate-800 hover:bg-slate-100 hover:text-slate-900"
                                }`}
                              >
                                {opt.id.toUpperCase()}) {opt.text}
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    );
                  })
                ) : (
                  /* Wordbank drag-and-drop + tap selector */
                  <div className="rounded-2xl border border-slate-200 bg-white p-5 space-y-4 shadow-sm text-slate-900">
                    <div>
                      <h3 className="text-sm font-bold text-slate-900">
                        Wortliste (Drag &amp; Drop oder Wort antippen → Lücke antippen)
                      </h3>
                      <p className="text-xs text-slate-500 mt-0.5">
                        Ziehen Sie ein Wort in eine Lücke links oder wählen Sie es hier für jede Lücke aus.
                      </p>
                    </div>

                    <div className="flex flex-wrap gap-2">
                      {(currentTeil.wordBank || []).map((w) => {
                        const usedInGap = currentTeil.gaps.find(
                          (g) => answers[`gap-${g.id}`] === w.id,
                        );
                        const isSelected = selectedWordId === w.id;
                        return (
                          <button
                            key={w.id}
                            type="button"
                            draggable
                            onDragStart={() => setDraggedWordId(w.id)}
                            onClick={() =>
                              setSelectedWordId((prev) => (prev === w.id ? null : w.id))
                            }
                            className={`relative z-20 rounded-xl border px-3 py-1.5 text-xs font-bold transition cursor-pointer ${
                              isSelected
                                ? "bg-slate-900 text-white border-slate-900 shadow-xs"
                                : usedInGap
                                  ? "border-slate-200 bg-slate-100 text-slate-400 line-through"
                                  : "border-slate-200 bg-slate-50 text-slate-800 hover:bg-slate-100 hover:text-slate-900"
                            }`}
                          >
                            {w.id.toUpperCase()}) {w.text}
                            {usedInGap ? ` [${usedInGap.id}]` : ""}
                          </button>
                        );
                      })}
                    </div>

                    <div className="space-y-2.5 pt-2 border-t border-slate-100">
                      {(currentTeil?.gaps || []).map((gap) => {
                        const key = `gap-${gap.id}`;
                        const currentVal = answers[key] || "";
                        return (
                          <div
                            key={gap.id}
                            className="flex items-center justify-between gap-3 rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-2"
                          >
                            <span className="text-xs font-bold text-slate-800">
                              Lücke [{gap.id}]
                            </span>
                            <select
                              value={currentVal}
                              onChange={(e) =>
                                e.target.value
                                  ? setAnswer(key, e.target.value)
                                  : clearAnswer(key)
                              }
                              className="relative z-20 rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs font-semibold text-slate-900 focus:border-slate-900 focus:outline-none shadow-xs cursor-pointer"
                            >
                              <option value="">— Wort wählen —</option>
                              {(currentTeil.wordBank || []).map((w) => (
                                <option key={w.id} value={w.id}>
                                  {w.id.toUpperCase()}) {w.text}
                                </option>
                              ))}
                            </select>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}

export default function LesenExamPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center bg-slate-50 text-slate-600 text-sm">
          Lade Prüfungsmodul Lesen…
        </div>
      }
    >
      <LesenExamPageInner />
    </Suspense>
  );
}
