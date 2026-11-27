"use client";

import React, { Suspense, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import {
  ArrowRight,
  BookOpen,
  Brain,
  CheckCircle2,
  Clock,
  Cloud,
  CloudOff,
  Flame,
  RotateCcw,
  Sparkles,
  Trophy,
  XCircle,
  Zap,
} from "lucide-react";
import { Navbar } from "@/components/Navbar";
import { BreadcrumbHeader, HEADER_IMAGES } from "@/components/BreadcrumbHeader";
import { BottomNavigationBar } from "@/components/BottomNavigationBar";
import { useAuth } from "@/lib/auth-context";
import { resolveProgressUid } from "@/lib/firebase/progress";
import {
  buildDailyWeaknessDeck,
  computeMistakeRadar,
  loadMistakeDna,
  recordMistakeOccurrences,
  submitMistakeSm2Review,
  type DailyWeaknessCard,
  type MistakeDnaRecord,
  type Sm2Quality,
} from "@/lib/mistake-dna/store";
import {
  MISTAKE_AXIS_META,
  MISTAKE_TAXONOMY,
  isMistakeCode,
  type MistakeCode,
} from "@/lib/mistake-dna/taxonomy";

const SM2_BUTTONS: {
  quality: Sm2Quality;
  label: string;
  sub: string;
  tone: string;
}[] = [
  {
    quality: 1,
    label: "Again",
    sub: "Re-queue today",
    tone: "border-rose-300 bg-rose-50 text-rose-800 hover:bg-rose-100",
  },
  {
    quality: 3,
    label: "Hard",
    sub: "1–4 days",
    tone: "border-amber-300 bg-amber-50 text-amber-800 hover:bg-amber-100",
  },
  {
    quality: 4,
    label: "Good",
    sub: "1–6+ days",
    tone: "border-emerald-300 bg-emerald-50 text-emerald-800 hover:bg-emerald-100",
  },
  {
    quality: 5,
    label: "Easy",
    sub: "3–8+ days",
    tone: "border-sky-300 bg-sky-50 text-sky-800 hover:bg-sky-100",
  },
];

function formatCountdown(seconds: number): string {
  const safe = Math.max(0, seconds);
  const m = Math.floor(safe / 60);
  const s = safe % 60;
  return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
}

function MistakeDnaPageInner() {
  const searchParams = useSearchParams();
  const focusParam = searchParams?.get("focus") || "";
  const focusCode: MistakeCode | null = isMistakeCode(focusParam) ? focusParam : null;

  const { user } = useAuth();
  const uid = useMemo(() => resolveProgressUid(user), [user]);

  const [records, setRecords] = useState<MistakeDnaRecord[]>([]);
  const [deck, setDeck] = useState<DailyWeaknessCard[]>([]);
  const [loading, setLoading] = useState(true);
  const [syncedToCloud, setSyncedToCloud] = useState<boolean | null>(null);

  const [currentIndex, setCurrentIndex] = useState(0);
  const [selectedOption, setSelectedOption] = useState<string | null>(null);
  const [savingReview, setSavingReview] = useState(false);
  const [sessionComplete, setSessionComplete] = useState(false);

  const [sessionStats, setSessionStats] = useState<{
    correct: number;
    missed: number;
    reviewedCodes: MistakeCode[];
  }>({ correct: 0, missed: 0, reviewedCodes: [] });

  // 5-minute focus sprint timer (300s)
  const [secondsLeft, setSecondsLeft] = useState(300);

  useEffect(() => {
    let active = true;
    setLoading(true);
    loadMistakeDna(uid)
      .then(({ records: loadedRecords, syncedFromCloud }) => {
        if (!active) return;
        setRecords(loadedRecords);
        setSyncedToCloud(syncedFromCloud);
        setDeck(buildDailyWeaknessDeck(loadedRecords, 8, Date.now(), focusCode));
        setCurrentIndex(0);
        setSelectedOption(null);
        setSessionComplete(false);
        setSessionStats({ correct: 0, missed: 0, reviewedCodes: [] });
        setSecondsLeft(300);
        setLoading(false);
      })
      .catch(() => {
        if (!active) return;
        setDeck(buildDailyWeaknessDeck([], 8, Date.now(), focusCode));
        setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [uid, focusCode]);

  useEffect(() => {
    if (loading || sessionComplete) return;
    const id = window.setInterval(() => {
      setSecondsLeft((prev) => (prev > 0 ? prev - 1 : 0));
    }, 1000);
    return () => window.clearInterval(id);
  }, [loading, sessionComplete]);

  const currentCard = deck[currentIndex] || null;
  const taxonomy = currentCard ? MISTAKE_TAXONOMY[currentCard.drill.errorKey] : null;
  const axisMeta = taxonomy ? MISTAKE_AXIS_META[taxonomy.axis] : null;
  const isAnswered = selectedOption !== null;
  const isCorrectAnswer = Boolean(
    currentCard && selectedOption && selectedOption === currentCard.drill.correctId,
  );

  const radarSummary = useMemo(() => computeMistakeRadar(records), [records]);

  const handleSelectOption = (optionId: string) => {
    if (isAnswered || !currentCard) return;
    setSelectedOption(optionId);
    const correct = optionId === currentCard.drill.correctId;

    setSessionStats((prev) => ({
      correct: prev.correct + (correct ? 1 : 0),
      missed: prev.missed + (correct ? 0 : 1),
      reviewedCodes: Array.from(new Set([...prev.reviewedCodes, currentCard.drill.errorKey])),
    }));

    // If missed during calibration or review, log sample immediately so Mistake-DNA captures it
    if (!correct) {
      const pickedOpt = currentCard.drill.options.find((o) => o.id === optionId);
      const rightOpt = currentCard.drill.options.find((o) => o.id === currentCard.drill.correctId);
      void recordMistakeOccurrences(uid, [
        {
          errorKey: currentCard.drill.errorKey,
          source: "drill",
          prompt: currentCard.drill.promptDe,
          wrong: pickedOpt?.text || optionId,
          right: rightOpt?.text || currentCard.drill.correctId,
        },
      ]).then(({ records: updated, syncedToCloud: ok }) => {
        setRecords(updated);
        setSyncedToCloud(ok);
      });
    }
  };

  const handleRateSm2 = async (quality: Sm2Quality) => {
    if (!currentCard || savingReview) return;
    setSavingReview(true);
    try {
      const { records: updated, syncedToCloud: ok } = await submitMistakeSm2Review(
        uid,
        currentCard.drill.errorKey,
        quality,
      );
      setRecords(updated);
      setSyncedToCloud(ok);
    } finally {
      setSavingReview(false);
    }

    if (currentIndex + 1 >= deck.length) {
      setSessionComplete(true);
    } else {
      setCurrentIndex((i) => i + 1);
      setSelectedOption(null);
    }
  };

  const handleStartFreshRound = () => {
    const nextDeck = buildDailyWeaknessDeck(records, 8, Date.now(), null);
    setDeck(nextDeck);
    setCurrentIndex(0);
    setSelectedOption(null);
    setSessionComplete(false);
    setSessionStats({ correct: 0, missed: 0, reviewedCodes: [] });
    setSecondsLeft(300);
  };

  return (
    <div className="min-h-screen flex flex-col bg-slate-50 text-slate-900 pb-28 md:pb-12">
      <Navbar />

      <main className="flex-1">
        <BreadcrumbHeader
          breadcrumbs={[
            { label: "Home", href: "/dashboard" },
            { label: "Mistake-DNA · Kill Your Weaknesses" },
          ]}
          eyebrow="MISTAKE-DNA · SPACED REMEDIATION (SM-2)"
          title={
            focusCode && MISTAKE_TAXONOMY[focusCode]
              ? `Target Trap: ${MISTAKE_TAXONOMY[focusCode].shortLabel}`
              : "Kill Your Weaknesses · 5-Min Sprint"
          }
          subtitle="Dynamic daily drills built from your highest-frequency German errors — with Hinglish rules and SM-2 memory scheduling."
          theme="hub"
          backgroundImage={HEADER_IMAGES.b1}
          backHref="/dashboard"
          backLabel="Hub"
          rightBadge={
            <span className="inline-flex items-center gap-1.5 rounded-full border border-white/25 bg-white/10 px-3 py-1 text-[10px] font-bold uppercase tracking-[0.14em] text-white backdrop-blur-md">
              <Clock className="h-3.5 w-3.5 text-amber-300" />
              <span>{formatCountdown(secondsLeft)}</span>
            </span>
          }
        />

        <section className="mx-auto max-w-4xl px-4 sm:px-6 py-7 sm:py-10 space-y-6">
          {/* Status Strip */}
          <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-slate-200 bg-white px-4 py-3 text-xs shadow-2xs">
            <div className="flex flex-wrap items-center gap-3">
              <span className="inline-flex items-center gap-1.5 font-bold text-slate-900">
                <Brain className="h-4 w-4 text-[#0f4c81]" />
                <span>
                  {sessionComplete
                    ? "Sprint Complete"
                    : `Drill ${Math.min(currentIndex + 1, deck.length)} of ${deck.length}`}
                </span>
              </span>
              <span className="text-slate-300">|</span>
              <span className="inline-flex items-center gap-1 font-semibold text-emerald-700">
                <CheckCircle2 className="h-3.5 w-3.5" />
                {sessionStats.correct} Right
              </span>
              <span className="inline-flex items-center gap-1 font-semibold text-amber-700">
                <Flame className="h-3.5 w-3.5" />
                {sessionStats.missed} Caught
              </span>
            </div>

            <div className="flex items-center gap-2 text-[11px] font-semibold">
              {syncedToCloud ? (
                <span className="inline-flex items-center gap-1 text-emerald-700">
                  <Cloud className="h-3.5 w-3.5" />
                  <span>Synced to Firestore</span>
                </span>
              ) : (
                <span className="inline-flex items-center gap-1 text-slate-500">
                  <CloudOff className="h-3.5 w-3.5" />
                  <span>Local Cache Active</span>
                </span>
              )}
            </div>
          </div>

          {/* Progress Bar */}
          {!loading && deck.length > 0 && (
            <div className="h-2 w-full rounded-full bg-slate-200 overflow-hidden">
              <div
                className="h-full rounded-full bg-[#0f4c81] transition-all duration-300"
                style={{
                  width: `${
                    sessionComplete
                      ? 100
                      : Math.round(((currentIndex + (isAnswered ? 1 : 0)) / deck.length) * 100)
                  }%`,
                }}
              />
            </div>
          )}

          {loading ? (
            <div className="rounded-2xl border border-slate-200 bg-white p-10 text-center text-sm text-slate-500 shadow-sm">
              Building your personalized Mistake-DNA remediation deck…
            </div>
          ) : sessionComplete ? (
            /* ── SESSION COMPLETE SUMMARY ── */
            <div className="rounded-3xl border border-slate-200 bg-white p-6 sm:p-9 shadow-sm space-y-6">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-100 pb-5">
                <div className="flex items-center gap-3.5">
                  <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-emerald-600 text-white shrink-0">
                    <Trophy className="h-6 w-6" />
                  </div>
                  <div>
                    <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-emerald-700">
                      DAILY REMEDIATION COMPLETE
                    </p>
                    <h2 className="text-xl sm:text-2xl font-bold text-slate-900">
                      Weak-Spot Sprint Finished!
                    </h2>
                  </div>
                </div>
                <div className="rounded-2xl border border-slate-200 bg-slate-50 px-5 py-3 text-center">
                  <div className="text-2xl font-extrabold text-slate-900">
                    {Math.round(
                      (sessionStats.correct / Math.max(1, sessionStats.correct + sessionStats.missed)) *
                        100,
                    )}
                    %
                  </div>
                  <div className="text-[10px] font-semibold uppercase tracking-wider text-slate-500">
                    Drill Accuracy
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                  <p className="text-[10px] font-bold uppercase tracking-wider text-slate-500">
                    Patterns Strengthened
                  </p>
                  <p className="text-2xl font-extrabold text-slate-900 mt-1">
                    {sessionStats.reviewedCodes.length}
                  </p>
                </div>
                <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                  <p className="text-[10px] font-bold uppercase tracking-wider text-slate-500">
                    Remaining Due Today
                  </p>
                  <p className="text-2xl font-extrabold text-amber-600 mt-1">
                    {radarSummary.dueNowCount}
                  </p>
                </div>
                <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                  <p className="text-[10px] font-bold uppercase tracking-wider text-slate-500">
                    Mastered Traps
                  </p>
                  <p className="text-2xl font-extrabold text-emerald-600 mt-1">
                    {radarSummary.masteredCount}
                  </p>
                </div>
              </div>

              <div className="space-y-2">
                <p className="text-xs font-bold uppercase tracking-wider text-slate-500">
                  Scheduled SM-2 Next Reviews
                </p>
                <div className="flex flex-wrap gap-2">
                  {sessionStats.reviewedCodes.map((code) => {
                    const rec = records.find((r) => r.errorKey === code);
                    const label = MISTAKE_TAXONOMY[code]?.shortLabel || code;
                    return (
                      <span
                        key={code}
                        className="inline-flex items-center gap-1.5 rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-xs font-semibold text-slate-800"
                      >
                        <span>{label}</span>
                        <span className="text-[10px] font-mono text-slate-500">
                          {rec?.intervalDays ? `→ ${rec.intervalDays}d` : "→ today"}
                        </span>
                      </span>
                    );
                  })}
                </div>
              </div>

              <div className="flex flex-wrap items-center justify-between gap-3 pt-4 border-t border-slate-100">
                <button
                  type="button"
                  onClick={handleStartFreshRound}
                  className="inline-flex items-center gap-2 rounded-xl border border-slate-300 bg-white px-5 py-3 text-xs font-bold uppercase tracking-[0.14em] text-slate-800 hover:bg-slate-50 transition cursor-pointer"
                >
                  <RotateCcw className="h-3.5 w-3.5" />
                  <span>Drill Another 5-Min Round</span>
                </button>
                <Link
                  href="/dashboard"
                  className="inline-flex items-center gap-2 rounded-xl bg-slate-900 px-6 py-3 text-xs font-bold uppercase tracking-[0.14em] text-white hover:bg-slate-800 transition"
                >
                  <span>Back to Dashboard</span>
                  <ArrowRight className="h-3.5 w-3.5" />
                </Link>
              </div>
            </div>
          ) : currentCard && taxonomy ? (
            /* ── ACTIVE REMEDIATION DRILL CARD ── */
            <div className="rounded-3xl border border-slate-200 bg-white p-5 sm:p-8 shadow-sm space-y-6">
              {/* Taxonomy Tag Header */}
              <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 pb-4">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="rounded-lg bg-slate-900 px-2.5 py-1 font-mono text-[11px] font-bold text-white">
                    {taxonomy.code}
                  </span>
                  {axisMeta && (
                    <span
                      className="rounded-full px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider text-white"
                      style={{ backgroundColor: axisMeta.color }}
                    >
                      {axisMeta.shortLabel}
                    </span>
                  )}
                  <span className="rounded-full border border-slate-200 bg-slate-100 px-2.5 py-0.5 text-[10px] font-bold text-slate-700">
                    {currentCard.drill.cefr}
                  </span>
                </div>

                {currentCard.record ? (
                  <span className="inline-flex items-center gap-1 rounded-full border border-rose-200 bg-rose-50 px-2.5 py-0.5 text-[11px] font-bold text-rose-700">
                    <Flame className="h-3 w-3" />
                    <span>{currentCard.record.occurrences}× past error · Streak {currentCard.record.streak}</span>
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1 rounded-full border border-indigo-200 bg-indigo-50 px-2.5 py-0.5 text-[11px] font-bold text-indigo-700">
                    <Sparkles className="h-3 w-3" />
                    <span>Baseline Calibration Trap</span>
                  </span>
                )}
              </div>

              {/* Real Student Mistake Replay Banner (when captured from past exams/AI) */}
              {currentCard.recentSample && (
                <div className="rounded-2xl border border-amber-200 bg-amber-50/70 p-4 space-y-1.5 text-xs">
                  <p className="text-[10px] font-extrabold uppercase tracking-[0.16em] text-amber-800">
                    Your Recent Real Mistake (Auto-Captured)
                  </p>
                  <p className="text-slate-700 font-medium">{currentCard.recentSample.prompt}</p>
                  <div className="flex flex-wrap gap-3 pt-1">
                    <span className="text-rose-700">
                      ✗ Yours: <strong className="line-through">{currentCard.recentSample.wrong}</strong>
                    </span>
                    <span className="text-emerald-700">
                      ✓ Correct: <strong>{currentCard.recentSample.right}</strong>
                    </span>
                  </div>
                </div>
              )}

              {/* Drill Prompt */}
              <div className="space-y-1.5">
                <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-slate-500">
                  {taxonomy.titleDe}
                </p>
                <h2 className="text-lg sm:text-xl font-bold text-slate-900 leading-snug">
                  {currentCard.drill.promptDe}
                </h2>
              </div>

              {/* Options */}
              <div className="space-y-2.5">
                {currentCard.drill.options.map((opt) => {
                  const isPicked = selectedOption === opt.id;
                  const isRight = opt.id === currentCard.drill.correctId;
                  let style =
                    "border-slate-200 bg-white text-slate-900 hover:border-slate-400 hover:bg-slate-50";
                  if (isAnswered) {
                    if (isRight) {
                      style = "border-emerald-500 bg-emerald-50 text-emerald-950 ring-1 ring-emerald-500";
                    } else if (isPicked && !isRight) {
                      style = "border-rose-400 bg-rose-50 text-rose-950";
                    } else {
                      style = "border-slate-200 bg-slate-50/60 text-slate-400";
                    }
                  }

                  return (
                    <button
                      key={opt.id}
                      type="button"
                      disabled={isAnswered}
                      onClick={() => handleSelectOption(opt.id)}
                      className={`w-full min-h-[48px] rounded-2xl border px-4 py-3 text-left text-sm font-semibold flex items-center justify-between gap-3 transition cursor-pointer disabled:cursor-default ${style}`}
                    >
                      <span className="flex items-center gap-3">
                        <span className="inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-lg border border-current/20 bg-white/70 font-mono text-xs font-bold uppercase">
                          {opt.id}
                        </span>
                        <span>{opt.text}</span>
                      </span>
                      {isAnswered && isRight && (
                        <CheckCircle2 className="h-5 w-5 text-emerald-600 shrink-0" />
                      )}
                      {isAnswered && isPicked && !isRight && (
                        <XCircle className="h-5 w-5 text-rose-600 shrink-0" />
                      )}
                    </button>
                  );
                })}
              </div>

              {/* Post-Answer Hinglish Mentor Breakdown + SM-2 Rating Controls */}
              {isAnswered && (
                <div className="space-y-5 pt-2 border-t border-slate-100">
                  <div
                    className={`rounded-2xl border p-4 sm:p-5 space-y-2.5 ${
                      isCorrectAnswer
                        ? "border-emerald-200 bg-emerald-50/70"
                        : "border-amber-200 bg-amber-50/70"
                    }`}
                  >
                    <div className="flex items-center gap-2 text-xs font-extrabold uppercase tracking-wider">
                      {isCorrectAnswer ? (
                        <span className="text-emerald-800">✓ Richtig! Pattern Strengthened</span>
                      ) : (
                        <span className="text-amber-900">✗ Trap Caught — Lock In This Rule</span>
                      )}
                    </div>
                    <p className="text-xs sm:text-sm text-slate-800 font-medium leading-relaxed">
                      <strong className="text-slate-950">Deutsch: </strong>
                      {currentCard.drill.explanationDe}
                    </p>
                    <p className="text-xs sm:text-sm text-slate-800 leading-relaxed">
                      <strong className="text-[#0f4c81]">Hinglish Mentor Tip: </strong>
                      {currentCard.drill.explanationHinglish}
                    </p>
                    <div className="rounded-xl bg-white/90 border border-slate-200 p-3 text-xs space-y-1">
                      <p className="font-bold text-slate-900">Golden Rule: {taxonomy.goldenRuleDe}</p>
                      <p className="text-slate-600">{taxonomy.whyIndiansMissItHinglish}</p>
                    </div>
                    <div className="pt-1">
                      <Link
                        href={taxonomy.recommendedGrammarHref}
                        className="inline-flex items-center gap-1.5 text-xs font-bold text-[#0f4c81] hover:underline"
                      >
                        <BookOpen className="h-3.5 w-3.5" />
                        <span>Open Full Grammar / Lab Module</span>
                      </Link>
                    </div>
                  </div>

                  {/* SM-2 Confidence & Next-Interval Buttons */}
                  <div className="space-y-2">
                    <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-slate-500">
                      Rate Recall to Schedule Next SM-2 Review
                    </p>
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                      {SM2_BUTTONS.map((btn) => {
                        const recommended =
                          (!isCorrectAnswer && btn.quality === 1) ||
                          (isCorrectAnswer && btn.quality === 4);
                        return (
                          <button
                            key={btn.quality}
                            type="button"
                            disabled={savingReview}
                            onClick={() => void handleRateSm2(btn.quality)}
                            className={`min-h-[54px] rounded-xl border px-3 py-2.5 text-center transition cursor-pointer disabled:opacity-50 ${btn.tone} ${
                              recommended ? "ring-2 ring-slate-900 ring-offset-1" : ""
                            }`}
                          >
                            <div className="text-xs font-extrabold flex items-center justify-center gap-1">
                              {recommended && <Zap className="h-3 w-3" />}
                              <span>{btn.label}</span>
                            </div>
                            <div className="text-[10px] opacity-80 mt-0.5">{btn.sub}</div>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                </div>
              )}
            </div>
          ) : null}
        </section>
      </main>

      <BottomNavigationBar />
    </div>
  );
}

export default function MistakeDnaPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center bg-slate-50 text-slate-500 text-sm">
          Loading Mistake-DNA Workspace…
        </div>
      }
    >
      <MistakeDnaPageInner />
    </Suspense>
  );
}
