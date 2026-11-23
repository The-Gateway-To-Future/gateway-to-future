"use client";

import Link from "next/link";
import React, { Suspense, useEffect, useMemo, useState } from "react";
import {
  ArrowRight,
  BookOpen,
  CheckCircle2,
  Headphones,
  Lock,
  Mic,
  PenTool,
  ShieldCheck,
  Unlock,
} from "lucide-react";
import {
  FlashcardEngine,
  TRACK_FLASHCARD_DECKS,
  type DynamicFlashcardDeck,
} from "@/components/FlashcardEngine";
import type { Level, PricingTierKey } from "@/lib/config";
import { useAuth } from "@/lib/auth-context";
import {
  getStepId,
  getUserProgress,
  resolveProgressUid,
  updateUserProgress,
  USER_PROGRESS_EVENT,
  type UserProgress,
} from "@/lib/firebase/progress";
import type { DivisionId, FlashcardDeckItem, WorkbookContentType } from "@/lib/types";

export interface RoadmapWorkbookSummary {
  id: string;
  title: string;
  subtitle: string;
  level: Level;
  divisionId?: DivisionId;
  track?: string;
  contentType?: WorkbookContentType;
  module?: string;
  skill?: string;
  audioUrl?: string;
  productSlug: string;
  isFree: boolean;
  priceEur: number;
  priceInr: number;
  pages: number;
  coverColor: string;
  topics: string[];
  questionCount: number;
  flashcards?: FlashcardDeckItem[];
  unlocked: boolean;
}

interface GuidedRoadmapTimelineProps {
  trackKey: string;
  trackLabel: string;
  examLevel: string;
  workbooks: RoadmapWorkbookSummary[];
  bypassPaywall: boolean;
  onOpenUnlock: (
    slug: string,
    title: string,
    track?: string,
    defaultTier?: PricingTierKey,
  ) => void;
}

type StepNumber = 1 | 2 | 3 | 4;

export function GuidedRoadmapTimeline({
  trackKey,
  trackLabel,
  examLevel,
  workbooks,
  bypassPaywall,
  onOpenUnlock,
}: GuidedRoadmapTimelineProps) {
  const { user } = useAuth();
  const uid = useMemo(() => resolveProgressUid(user), [user]);
  const [userProgress, setUserProgress] = useState<UserProgress | null>(null);
  const [activeStep, setActiveStep] = useState<StepNumber>(1);
  const [savingStep, setSavingStep] = useState(false);

  // Fetch user's Firestore progress on mount/login & subscribe to live updates
  useEffect(() => {
    let active = true;
    getUserProgress(uid).then((prog) => {
      if (!active) return;
      setUserProgress(prog);
      const completed = prog.completedSteps || [];
      const s1 = completed.includes(getStepId(trackKey, 1));
      const s2 = completed.includes(getStepId(trackKey, 2));
      const s3 = completed.includes(getStepId(trackKey, 3));
      const resumeStep: StepNumber = s1 && s2 && s3 ? 4 : s1 && s2 ? 3 : s1 ? 2 : 1;
      setActiveStep(resumeStep);
    });

    const onProgressUpdate = (ev: Event) => {
      const detail = (ev as CustomEvent<UserProgress>).detail;
      if (detail && detail.uid === uid) {
        setUserProgress(detail);
      }
    };
    window.addEventListener(USER_PROGRESS_EVENT, onProgressUpdate);
    return () => {
      active = false;
      window.removeEventListener(USER_PROGRESS_EVENT, onProgressUpdate);
    };
  }, [uid, trackKey]);

  const deckConfig = useMemo(() => {
    return TRACK_FLASHCARD_DECKS[trackKey] || TRACK_FLASHCARD_DECKS.a1;
  }, [trackKey]);

  // Dynamic Flashcard decks sourced from data/catalog.json & data/question_banks/
  const dynamicDecks: DynamicFlashcardDeck[] = useMemo(() => {
    return workbooks
      .filter((wb) => Array.isArray(wb.flashcards) && wb.flashcards.length > 0)
      .map((wb) => ({
        id: `wb-fc-${wb.id}`,
        title: wb.title.replace(/^[^\wÄÖÜäöüß]+/, ""),
        cards: wb.flashcards as FlashcardDeckItem[],
      }));
  }, [workbooks]);

  // Partition workbooks cleanly across Grammar Foundations (Step 2) & Hören/Lesen Practice (Step 3)
  const { grammarWorkbooks, practiceWorkbooks } = useMemo(() => {
    const grammar: RoadmapWorkbookSummary[] = [];
    const practice: RoadmapWorkbookSummary[] = [];

    for (const wb of workbooks) {
      const idLow = wb.id.toLowerCase();
      const titleLow = wb.title.toLowerCase();
      const skillLow = (wb.skill || "").toLowerCase();

      const isPracticeSkill =
        skillLow === "hoeren" ||
        skillLow === "lesen" ||
        titleLow.includes("hören") ||
        titleLow.includes("lesen") ||
        idLow.includes("hoeren") ||
        idLow.includes("lesen") ||
        titleLow.includes("c-test") ||
        titleLow.includes("isbar") ||
        titleLow.includes("fallstudie");

      const isGrammarCore =
        titleLow.includes("säulen") ||
        titleLow.includes("grammatik") ||
        titleLow.includes("architektur") ||
        titleLow.includes("kapitel") ||
        titleLow.includes("arbeitsbuch") ||
        titleLow.includes("vorbereitungsheft") ||
        titleLow.includes("modul 1") ||
        titleLow.includes("math") ||
        idLow.includes("grammatik");

      if (isGrammarCore && !isPracticeSkill) {
        grammar.push(wb);
      } else if (isPracticeSkill) {
        practice.push(wb);
      } else {
        grammar.push(wb);
      }
    }

    // Ensure neither step feels empty if a division has focused items
    return {
      grammarWorkbooks: grammar.length > 0 ? grammar : workbooks.slice(0, 3),
      practiceWorkbooks: practice.length > 0 ? practice : workbooks,
    };
  }, [workbooks]);

  const completedSteps = userProgress?.completedSteps || [];
  const step1Id = getStepId(trackKey, 1);
  const step2Id = getStepId(trackKey, 2);
  const step3Id = getStepId(trackKey, 3);
  const isStep1Completed = completedSteps.includes(step1Id);
  const isStep2Completed = completedSteps.includes(step2Id);
  const isStep3Completed = completedSteps.includes(step3Id);

  const isStep2Locked = !isStep1Completed;
  const isStep3Locked = !(isStep1Completed && isStep2Completed);
  const isModelltestsUnlocked = isStep1Completed && isStep2Completed && isStep3Completed;

  const completeStepsAndAdvance = async (
    stepsToComplete: number[],
    nextStep: StepNumber,
  ) => {
    const newIds = stepsToComplete.map((n) => getStepId(trackKey, n));
    const mergedCompleted = Array.from(new Set([...completedSteps, ...newIds]));

    setSavingStep(true);
    setUserProgress((prev) =>
      prev
        ? { ...prev, completedSteps: mergedCompleted }
        : {
            uid,
            completedSteps: mergedCompleted,
            masteredFlashcards: [],
            lastLoginDate: new Date().toISOString().slice(0, 10),
            currentStreak: 1,
          },
    );
    setActiveStep(nextStep);

    try {
      const updated = await updateUserProgress(uid, {
        completedSteps: mergedCompleted,
      });
      setUserProgress(updated);
    } finally {
      setSavingStep(false);
    }
  };

  const handleToggleMasteredCard = (
    _cardId: string,
    nextMasteredCardIds: string[],
  ) => {
    setUserProgress((prev) =>
      prev
        ? { ...prev, masteredFlashcards: nextMasteredCardIds }
        : {
            uid,
            completedSteps,
            masteredFlashcards: nextMasteredCardIds,
            lastLoginDate: new Date().toISOString().slice(0, 10),
            currentStreak: 1,
          },
    );
    void updateUserProgress(uid, { masteredFlashcards: nextMasteredCardIds });
  };

  const renderWorkbookCard = (wb: RoadmapWorkbookSummary, badgeText: string) => {
    const isItemUnlocked = bypassPaywall || wb.unlocked;
    const isHoeren =
      wb.skill === "hoeren" ||
      Boolean(wb.audioUrl) ||
      wb.title.toLowerCase().includes("hören") ||
      wb.id.toLowerCase().includes("hoeren");
    // Only the workbook's own bound audioUrl — never a level/number-based guess.
    const rawAudioUrl = isHoeren ? wb.audioUrl || "" : "";
    const resolvedAudioSrc = rawAudioUrl
      ? rawAudioUrl.startsWith("/")
        ? rawAudioUrl
        : `/${rawAudioUrl}`
      : "";

    return (
      <div
        key={wb.id}
        className="rounded-2xl border border-slate-200 bg-white p-5 sm:p-7 shadow-sm hover:shadow-md transition flex flex-col justify-between min-h-[220px] h-auto"
      >
        <div className="flex-1 flex flex-col">
          <div className="flex items-center justify-between gap-3 mb-3">
            <span className="rounded-md bg-slate-100 px-2.5 py-0.5 text-[10px] font-extrabold uppercase text-slate-700">
              {badgeText}
            </span>
            {isItemUnlocked && (
              <span className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-600">
                <CheckCircle2 className="h-3.5 w-3.5" /> Free Access
              </span>
            )}
          </div>

          <h4 className="mt-1.5 text-base font-black text-slate-900 leading-snug break-words hyphens-auto">
            {wb.title}
          </h4>

          <p className="mt-2 text-xs text-slate-500 leading-relaxed break-words flex-1">
            {wb.topics && wb.topics.length > 0 ? wb.topics.slice(0, 3).join(" · ") : wb.subtitle}
          </p>

          {resolvedAudioSrc && (
            <div className="mt-3 rounded-xl border border-amber-200/80 bg-amber-50/60 p-2">
              <p className="text-[10px] font-black uppercase tracking-wider text-amber-900 mb-1 flex items-center gap-1">
                <Headphones className="h-3 w-3" />
                <span>Direct Audio Preview</span>
              </p>
              <audio
                controls
                preload="metadata"
                playsInline
                src={resolvedAudioSrc}
                className="w-full h-9"
                onError={(e) => {
                  console.warn("[GuidedRoadmapTimeline] Audio stream failed:", e);
                }}
              />
            </div>
          )}
        </div>

        <div className="mt-5 pt-3.5 border-t border-slate-100 flex items-center justify-between gap-2 text-xs">
          <span className="text-[11px] text-slate-400">
            {wb.pages} Pages{wb.questionCount > 0 ? ` · ${wb.questionCount} Q` : ""}
            {wb.flashcards && wb.flashcards.length > 0 ? ` · ${wb.flashcards.length} Cards` : ""}
          </span>
          {isItemUnlocked ? (
            <Link
              href={`/workbooks/${wb.id}`}
              className="relative z-20 cursor-pointer inline-flex items-center gap-1.5 rounded-xl bg-gtf-primary px-3.5 py-1.5 text-xs font-bold text-white shadow-xs hover:bg-gtf-dark transition"
            >
              <span>Open Practice</span>
              <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          ) : (
            <button
              type="button"
              onClick={() =>
                onOpenUnlock(
                  wb.productSlug,
                  wb.title,
                  `${trackLabel}`,
                  "single_module",
                )
              }
              className="relative z-20 cursor-pointer inline-flex items-center gap-1.5 rounded-xl bg-gtf-primary px-3.5 py-1.5 text-xs font-bold text-white shadow-xs hover:bg-gtf-dark transition"
            >
              <span>Unlock Now (₹499)</span>
            </button>
          )}
        </div>
      </div>
    );
  };

  const milestones: {
    step: StepNumber;
    badge: string;
    title: string;
    subtitle: string;
    locked?: boolean;
    content: React.ReactNode;
  }[] = [
    {
      step: 1,
      badge: isStep1Completed
        ? "STEP 1 · COMPLETED"
        : activeStep === 1
        ? "ACTIVE STEP · START HERE"
        : "STEP 1 · CORE VOCABULARY",
      title: "Step 1: Core Vocabulary & Phrases (Interactive Flashcards)",
      subtitle: `Master active ${trackLabel} basics & vocabulary (${deckConfig.title}) with dynamic JSON flashcard decks and native German pronunciation.`,
      content: (
        <div className="space-y-4">
          <Suspense fallback={<p className="text-sm text-slate-500 py-4">Loading Workspace...</p>}>
            <FlashcardEngine
              title={deckConfig.title}
              deck={deckConfig.deck}
              dynamicDecks={dynamicDecks}
              masteredCardIds={userProgress?.masteredFlashcards}
              onToggleMasteredCard={handleToggleMasteredCard}
              onCompleteDeck={() => void completeStepsAndAdvance([1], 2)}
            />
          </Suspense>
          <div className="flex flex-wrap items-center justify-between gap-3">
            <p className="text-xs text-slate-500">
              Flip through cards or mark mastered, then mark Step 1 complete to unlock Step 2 ({step1Id}).
            </p>
            <button
              type="button"
              disabled={savingStep}
              onClick={() => void completeStepsAndAdvance([1], 2)}
              className="inline-flex items-center gap-2 rounded-xl bg-slate-900 px-5 py-2.5 text-xs font-semibold text-white shadow-sm hover:bg-slate-800 transition disabled:opacity-60 cursor-pointer"
            >
              <span>
                {isStep1Completed
                  ? "Step 1 Completed · Open Step 2: Grammar Foundations"
                  : "Mark Complete & Continue to Step 2: Grammar Foundations"}
              </span>
              <ArrowRight className="h-3.5 w-3.5 text-white" />
            </button>
          </div>
        </div>
      ),
    },
    {
      step: 2,
      locked: isStep2Locked,
      badge: isStep2Locked
        ? "LOCKED UNTIL STEP 1 IS COMPLETED"
        : isStep2Completed
        ? "STEP 2 · COMPLETED"
        : activeStep === 2
        ? "ACTIVE STEP · GRAMMAR"
        : "MILESTONE 2 · STRUCTURE",
      title: "Step 2: Grammar Foundations",
      subtitle: isStep2Locked
        ? `Complete Step 1 (${step1Id}) to unlock ${trackLabel} grammar workbooks and 122 Säulen sentence structures.`
        : `Build rock-solid ${trackLabel} sentence structure, 122 Säulen architecture, and targeted grammar chapters.`,
      content: isStep2Locked ? (
        <div className="rounded-2xl border border-amber-200 bg-amber-50/70 p-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-start gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-amber-200 bg-amber-100 text-amber-800">
              <Lock className="h-5 w-5" />
            </div>
            <div className="space-y-1">
              <p className="text-sm font-bold text-slate-900">
                Step 2 Locked Until Step 1 Is Completed
              </p>
              <p className="text-xs text-slate-600 leading-relaxed">
                Finish or mark Step 1 ({step1Id}) complete in Core Vocabulary Flashcards to unlock {trackLabel} Grammar Foundations.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => setActiveStep(1)}
            className="shrink-0 inline-flex items-center gap-2 rounded-xl bg-slate-900 px-4 py-2.5 text-xs font-semibold text-white hover:bg-slate-800 transition cursor-pointer"
          >
            <ArrowRight className="h-3.5 w-3.5" />
            <span>Go to Step 1</span>
          </button>
        </div>
      ) : (
        <div className="space-y-5">
          {grammarWorkbooks.length > 0 ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5 sm:gap-7 items-stretch">
              {grammarWorkbooks.map((wb) =>
                renderWorkbookCard(wb, `${trackLabel} · Grammar`),
              )}
            </div>
          ) : (
            <div className="rounded-2xl border border-slate-200 bg-slate-50 p-6 text-xs text-slate-600">
              Use the Sprachbausteine Grammar Simulator below to practice {trackLabel} structures before proceeding to Step 3.
            </div>
          )}
          <div className="flex flex-wrap items-center justify-between gap-3 pt-2">
            <Link
              href={`/exam/${examLevel}/lesen`}
              className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-slate-50 px-4 py-2 text-xs font-extrabold text-[#134074] hover:bg-slate-100 transition"
            >
              <BookOpen className="h-3.5 w-3.5" />
              <span>Practice Sprachbausteine &amp; Grammar</span>
            </Link>
            <button
              type="button"
              disabled={savingStep}
              onClick={() => void completeStepsAndAdvance([1, 2], 3)}
              className="inline-flex items-center gap-2 rounded-xl bg-slate-900 px-5 py-2.5 text-xs font-semibold text-white shadow-sm hover:bg-slate-800 transition disabled:opacity-60 cursor-pointer"
            >
              <span>
                {isStep2Completed
                  ? "Step 2 Completed · Open Step 3: Hören & Lesen Practice"
                  : "Mark Complete & Continue to Step 3: Hören & Lesen Practice"}
              </span>
              <ArrowRight className="h-3.5 w-3.5 text-white" />
            </button>
          </div>
        </div>
      ),
    },
    {
      step: 3,
      locked: isStep3Locked,
      badge: isStep3Locked
        ? "LOCKED UNTIL STEPS 1–2 ARE COMPLETED"
        : isStep3Completed
        ? "STEP 3 · COMPLETED"
        : activeStep === 3
        ? "ACTIVE STEP · HÖREN & LESEN"
        : "MILESTONE 3 · PRACTICE",
      title: "Step 3: Hören & Lesen Practice",
      subtitle: isStep3Locked
        ? `Complete Step 1 & Step 2 (${step1Id}, ${step2Id}) to unlock audio and reading comprehension practice.`
        : `Train comprehension with native Google Cloud Neural audio dialogues (Hören Practice) and authentic reading dossiers for ${trackLabel}.`,
      content: isStep3Locked ? (
        <div className="rounded-2xl border border-amber-200 bg-amber-50/70 p-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-start gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-amber-200 bg-amber-100 text-amber-800">
              <Lock className="h-5 w-5" />
            </div>
            <div className="space-y-1">
              <p className="text-sm font-bold text-slate-900">
                Step 3 Locked Until Steps 1 &amp; 2 Are Completed
              </p>
              <p className="text-xs text-slate-600 leading-relaxed">
                Complete Steps 1 and 2 first to unlock {trackLabel} Hören &amp; Lesen Practice dossiers.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => setActiveStep(isStep1Completed ? 2 : 1)}
            className="shrink-0 inline-flex items-center gap-2 rounded-xl bg-slate-900 px-4 py-2.5 text-xs font-semibold text-white hover:bg-slate-800 transition cursor-pointer"
          >
            <ArrowRight className="h-3.5 w-3.5" />
            <span>{isStep1Completed ? "Go to Step 2" : "Go to Step 1"}</span>
          </button>
        </div>
      ) : (
        <div className="space-y-5">
          {practiceWorkbooks.length > 0 && (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5 sm:gap-7 items-stretch">
              {practiceWorkbooks.map((wb) =>
                renderWorkbookCard(
                  wb,
                  wb.skill === "hoeren" || wb.title.toLowerCase().includes("hören")
                    ? `${trackLabel} · Hören`
                    : `${trackLabel} · Lesen`,
                ),
              )}
            </div>
          )}

          <div className="flex flex-wrap items-center justify-between gap-3 pt-2">
            <div className="flex flex-wrap items-center gap-2">
              <Link
                href={`/exam/${examLevel}/hoeren`}
                className="inline-flex items-center gap-1.5 rounded-xl border border-amber-300 bg-amber-50 px-4 py-2 text-xs font-extrabold text-amber-900 hover:bg-amber-100 transition"
              >
                <Headphones className="h-3.5 w-3.5" />
                <span>Open Hören Audio Practice</span>
              </Link>
              <Link
                href={`/exam/${examLevel}/lesen`}
                className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-slate-50 px-4 py-2 text-xs font-extrabold text-[#134074] hover:bg-slate-100 transition"
              >
                <BookOpen className="h-3.5 w-3.5" />
                <span>Open Lesen Practice</span>
              </Link>
            </div>

            <button
              type="button"
              disabled={savingStep}
              onClick={() => void completeStepsAndAdvance([1, 2, 3], 4)}
              className="inline-flex items-center gap-2 rounded-2xl bg-emerald-600 px-5 py-2.5 text-xs font-black text-white shadow-sm hover:bg-emerald-700 transition disabled:opacity-60"
            >
              <Unlock className="h-3.5 w-3.5" />
              <span>
                {isStep3Completed
                  ? "Step 3 Completed · Open Step 4: Modelltests"
                  : "Mark Complete & Unlock Step 4: Modelltests"}
              </span>
            </button>
          </div>
        </div>
      ),
    },
    {
      step: 4,
      locked: !isModelltestsUnlocked,
      badge: isModelltestsUnlocked
        ? "UNLOCKED · EXAM SIMULATION"
        : "LOCKED UNTIL PREVIOUS STEPS ARE COMPLETED",
      title: "Step 4: Modelltests",
      subtitle: isModelltestsUnlocked
        ? `All previous steps complete! Launch full timed ${trackLabel} Modelltest simulations across Lesen, Hören, Schreiben & Sprechen.`
        : `Step 4: Modelltests is locked until previous steps are completed (Steps 1–3 build the vocabulary, grammar, and listening endurance required to pass).`,
      content: isModelltestsUnlocked ? (
        <div className="space-y-5">
          <div className="rounded-2xl border border-emerald-200 bg-emerald-50/70 p-4 flex items-center gap-3 text-xs font-bold text-emerald-900">
            <ShieldCheck className="h-5 w-5 text-emerald-600 shrink-0" />
            <span>
              Steps 1–3 completed! Your {trackLabel} full Modelltest suite is unlocked.
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 items-stretch">
            {[
              {
                key: "lesen",
                label: "1. Lesen",
                sub: "Timed Reading & Gaps",
                icon: BookOpen,
                tone: "bg-sky-50 text-sky-800 border border-sky-200",
              },
              {
                key: "hoeren",
                label: "2. Hören",
                sub: "Exam Audio Simulation",
                icon: Headphones,
                tone: "bg-amber-100 text-amber-800",
              },
              {
                key: "schreiben",
                label: "3. Schreiben",
                sub: "AI Graded Writing",
                icon: PenTool,
                tone: "bg-emerald-100 text-emerald-800",
              },
              {
                key: "sprechen",
                label: "4. Sprechen",
                sub: "Whisper Oral Review",
                icon: Mic,
                tone: "bg-rose-100 text-rose-800",
              },
            ].map((mod) => {
              const Icon = mod.icon;
              return (
                <Link
                  key={mod.key}
                  href={`/exam/${examLevel}/${mod.key}`}
                  className="rounded-2xl border border-slate-200 bg-white p-4 shadow-xs hover:shadow-md transition flex flex-col justify-between gap-3 group"
                >
                  <div className="flex items-center gap-3">
                    <div className={`flex h-9 w-9 items-center justify-center rounded-xl ${mod.tone}`}>
                      <Icon className="h-4 w-4" />
                    </div>
                    <div>
                      <p className="text-sm font-black text-slate-900">{mod.label}</p>
                      <p className="text-[11px] text-slate-500">{mod.sub}</p>
                    </div>
                  </div>
                  <span className="inline-flex items-center gap-1 text-xs font-bold text-slate-900 group-hover:translate-x-0.5 transition">
                    <span>Start Modelltest</span>
                    <ArrowRight className="h-3.5 w-3.5" />
                  </span>
                </Link>
              );
            })}
          </div>
        </div>
      ) : (
        <div className="rounded-2xl border border-amber-200 bg-amber-50/70 p-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-start gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-amber-200 bg-amber-100 text-amber-800">
              <Lock className="h-5 w-5" />
            </div>
            <div className="space-y-1">
              <p className="text-sm font-bold text-slate-900">
                Modelltests Locked Until Previous Steps Are Completed
              </p>
              <p className="text-xs text-slate-600 leading-relaxed">
                Complete Steps 1, 2, and 3 above to unlock full timed Modelltest simulations for {trackLabel}, or fast-forward if you are retaking an assessment.
              </p>
            </div>
          </div>
          <button
            type="button"
            disabled={savingStep}
            onClick={() => void completeStepsAndAdvance([1, 2, 3], 4)}
            className="shrink-0 inline-flex items-center gap-2 rounded-xl bg-slate-900 px-4 py-2.5 text-xs font-semibold text-white hover:bg-slate-800 transition disabled:opacity-60 cursor-pointer"
          >
            <Unlock className="h-3.5 w-3.5" />
            <span>Complete Previous Steps &amp; Unlock</span>
          </button>
        </div>
      ),
    },
  ];

  return (
    <section id="guided-learning-roadmap" className="scroll-mt-20 space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <span className="inline-flex items-center gap-1.5 rounded-full border border-slate-200 bg-slate-100 text-slate-700 px-3 py-1 text-[10px] font-bold uppercase tracking-wider">
            {trackLabel} Guided Vertical Path · Sequential Mastery
          </span>
          <h3 className="mt-2 text-lg sm:text-xl font-black text-slate-900">
            Your Sequential {trackLabel} Roadmap
          </h3>
          <p className="text-xs text-slate-500">
            Follow Steps 1 → 2 → 3 → 4 in order: Core Vocabulary Flashcards, Grammar Foundations, Hören &amp; Lesen Practice, and timed Modelltests.
          </p>
        </div>
        <span className="inline-flex items-center gap-1.5 rounded-xl border border-emerald-300/60 bg-emerald-50 px-3.5 py-2 text-xs font-extrabold text-emerald-800 shrink-0">
          <CheckCircle2 className="h-4 w-4 text-emerald-600" />
          <span>Active Step: {activeStep} / 4</span>
        </span>
      </div>

      {/* Vertical Timeline Spine */}
      <div className="relative border-l-4 border-[#134074]/25 ml-4 sm:ml-6 pl-6 sm:pl-9 space-y-8">
        {milestones.map((milestone) => {
          const isActive = activeStep === milestone.step;
          const isCompleted =
            milestone.step === 1
              ? isStep1Completed
              : milestone.step === 2
              ? isStep2Completed
              : milestone.step === 3
              ? isStep3Completed
              : isModelltestsUnlocked;
          const isLockedNode = Boolean(milestone.locked);
          return (
            <div key={milestone.step} className="relative">
              {/* Timeline Circle Node */}
              <button
                type="button"
                onClick={() => setActiveStep(milestone.step)}
                aria-label={`Activate ${milestone.title}`}
                className={`absolute -left-[42px] sm:-left-[54px] top-1 flex h-9 w-9 items-center justify-center rounded-full text-xs font-black transition shadow-sm ${
                  isActive
                    ? "bg-[#0A1628] text-[#FFD166] ring-4 ring-[#FFD166]/60 scale-105"
                    : isLockedNode
                    ? "bg-slate-200 text-slate-500 border-2 border-slate-300"
                    : isCompleted
                    ? "bg-emerald-600 text-white ring-4 ring-emerald-100"
                    : "bg-white text-slate-600 border-2 border-slate-300 hover:border-[#134074]"
                }`}
              >
                {isLockedNode ? (
                  <Lock className="h-3.5 w-3.5" />
                ) : isCompleted ? (
                  "✓"
                ) : (
                  milestone.step
                )}
              </button>

              {/* Milestone Card */}
              <div
                className={`rounded-3xl border p-5 sm:p-7 transition-all ${
                  isActive
                    ? "border-[#134074]/40 bg-white shadow-md ring-1 ring-[#134074]/10"
                    : "border-slate-200/90 bg-slate-50/80 opacity-95 hover:opacity-100"
                }`}
              >
                <div
                  onClick={() => setActiveStep(milestone.step)}
                  className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 cursor-pointer"
                >
                  <div>
                    <span
                      className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-[10px] font-black uppercase tracking-wider ${
                        isLockedNode
                          ? "bg-amber-100 text-amber-900"
                          : isActive
                          ? "bg-[#FFD166] text-[#0A1628]"
                          : isCompleted
                          ? "bg-emerald-100 text-emerald-800"
                          : "bg-slate-200 text-slate-600"
                      }`}
                    >
                      {isLockedNode && <Lock className="h-2.5 w-2.5" />}
                      <span>{milestone.badge}</span>
                    </span>
                    <h4 className="mt-1.5 text-base sm:text-lg font-black text-slate-900 break-words hyphens-auto">
                      {milestone.title}
                    </h4>
                    <p className="mt-1 text-xs text-slate-600 leading-relaxed">
                      {milestone.subtitle}
                    </p>
                  </div>

                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      setActiveStep(milestone.step);
                    }}
                    className={`shrink-0 rounded-xl px-4 py-2 text-xs font-black transition ${
                      isLockedNode
                        ? "bg-amber-100 text-amber-900 border border-amber-200 hover:bg-amber-200"
                        : isActive
                        ? "bg-[#0A1628] text-[#FFD166]"
                        : "bg-white border border-slate-200 text-[#134074] hover:bg-slate-100"
                    }`}
                  >
                    {isLockedNode
                      ? isActive
                        ? "Locked (View Requirements)"
                        : "Locked · View"
                      : isActive
                      ? "Active Step"
                      : `Open Step ${milestone.step}`}
                  </button>
                </div>

                {isActive && (
                  <div className="mt-5 pt-5 border-t border-slate-100">
                    {milestone.content}
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}
