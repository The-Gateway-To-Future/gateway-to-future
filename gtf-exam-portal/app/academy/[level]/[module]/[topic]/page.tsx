"use client";

import React, { Suspense, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { ArrowRight, Clock, ShieldCheck } from "lucide-react";
import { Navbar } from "@/components/Navbar";
import { BreadcrumbHeader } from "@/components/BreadcrumbHeader";
import { BottomNavigationBar } from "@/components/BottomNavigationBar";
import {
  FlashcardEngine,
  TRACK_FLASHCARD_DECKS,
} from "@/components/FlashcardEngine";
import { FocusedWorkbookWorkspace } from "@/components/FocusedWorkbookWorkspace";
import { StudienkollegHub } from "@/components/StudienkollegHub";
import { FachspracheMedizinHub } from "@/components/FachspracheMedizinHub";
import type { RoadmapWorkbookSummary } from "@/components/GuidedRoadmapTimeline";
import { useAuth } from "@/lib/auth-context";
import { getActiveUserEmail } from "@/lib/client-storage";
import { SECTION_META, type PricingTierKey, type SectionKey } from "@/lib/config";
import {
  getStepId,
  getUserProgress,
  resolveProgressUid,
  updateUserProgress,
  USER_PROGRESS_EVENT,
  type UserProgress,
} from "@/lib/firebase/progress";
import {
  cleanWorkbookTitle,
  getTopicsForSubdivision,
} from "@/lib/subdivisions";
import { getCoreLabById } from "@/lib/curriculum-labs";
import type { FlashcardDeckItem, WorkbookClientView } from "@/lib/types";

export default function AcademyTopicWorkspacePage() {
  const params = useParams<{ level: string; module: string; topic: string }>();
  const rawLevel = decodeURIComponent(params?.level || "a1");
  const rawModule = decodeURIComponent(params?.module || "01-vocabulary");
  const rawTopic = decodeURIComponent(params?.topic || "core-deck");

  const router = useRouter();
  const { user } = useAuth();
  const uid = useMemo(() => resolveProgressUid(user), [user]);
  const [userProgress, setUserProgress] = useState<UserProgress | null>(null);
  const [workbooks, setWorkbooks] = useState<RoadmapWorkbookSummary[]>([]);
  const [unlockedSlugs, setUnlockedSlugs] = useState<Set<string>>(new Set());
  const [catalogLoaded, setCatalogLoaded] = useState(false);
  const [workbookMeta, setWorkbookMeta] = useState<WorkbookClientView | null>(null);

  // Reset workbook metadata when navigating between topics
  useEffect(() => {
    setWorkbookMeta(null);
  }, [rawLevel, rawModule, rawTopic]);

  useEffect(() => {
    let active = true;
    getUserProgress(uid).then((prog) => {
      if (active) setUserProgress(prog);
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
  }, [uid]);

  useEffect(() => {
    let active = true;
    const email = user?.userEmail || getActiveUserEmail();
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 4000);

    fetch(`/api/catalog?email=${encodeURIComponent(email)}`, {
      signal: controller.signal,
    })
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        clearTimeout(timeoutId);
        if (!active) return;
        if (data) {
          const prods = Array.isArray(data.products) ? data.products : [];
          setUnlockedSlugs(
            new Set(
              prods
                .filter((p: { unlocked?: boolean }) => p.unlocked)
                .map((p: { slug: string }) => p.slug),
            ),
          );
          if (Array.isArray(data.workbooks)) {
            setWorkbooks(data.workbooks as RoadmapWorkbookSummary[]);
          }
        }
        setCatalogLoaded(true);
      })
      .catch(() => {
        clearTimeout(timeoutId);
        if (active) setCatalogLoaded(true);
      });
    return () => {
      active = false;
      clearTimeout(timeoutId);
      controller.abort();
    };
  }, [user]);

  const { info, moduleSlug, moduleMeta, topics } = useMemo(
    () => getTopicsForSubdivision(rawLevel, rawModule, workbooks),
    [rawLevel, rawModule, workbooks],
  );

  const matchedTopic = useMemo(
    () => topics.find((t) => t.id === rawTopic),
    [topics, rawTopic],
  );

  const handleToggleMasteredCard = (_cardId: string, masteredIdsList: string[]) => {
    setUserProgress((prev) =>
      prev
        ? { ...prev, masteredFlashcards: masteredIdsList }
        : {
            uid,
            completedSteps: [],
            masteredFlashcards: masteredIdsList,
            lastLoginDate: new Date().toISOString().slice(0, 10),
            currentStreak: 1,
          },
    );
    void updateUserProgress(uid, { masteredFlashcards: masteredIdsList });
  };

  // Resolve workspace kind cleanly
  const isCoreDeck = rawTopic === "core-deck";
  const isFactoryDeck = rawTopic.startsWith("wb-fc-");
  const isVocabLabDeck = rawModule === "01-vocabulary" && rawTopic.startsWith("vocab-");
  const isStkWorkspace =
    rawTopic === "stk-workspace" || rawTopic === "stk-syllabus";
  const isPflegeHub =
    rawTopic === "pflege-clinical-hub" || rawTopic === "pflege-dialogues";
  const isExamLauncher =
    matchedTopic?.kind === "exam-simulator" ||
    rawTopic === "exam-lesen" ||
    rawTopic === "exam-hoeren" ||
    rawTopic === "exam-schreiben" ||
    rawTopic === "exam-sprechen" ||
    rawTopic === "lab-hoeren" ||
    rawTopic === "lab-hoeren-simulator" ||
    rawTopic === "lab-lesen" ||
    rawTopic === "lab-lesen-simulator";

  const resolvedSection: SectionKey = (() => {
    const clean = rawTopic
      .replace(/^(exam-|lab-)/, "")
      .replace(/-simulator$/, "");
    if (
      clean === "lesen" ||
      clean === "hoeren" ||
      clean === "schreiben" ||
      clean === "sprechen"
    ) {
      return clean;
    }
    return "lesen";
  })();

  const factoryWorkbookId = isFactoryDeck ? rawTopic.slice("wb-fc-".length) : "";
  const factoryWorkbook = useMemo(
    () => workbooks.find((w) => w.id === factoryWorkbookId),
    [workbooks, factoryWorkbookId],
  );

  const coreDeckConfig =
    (info?.flashcardKey && TRACK_FLASHCARD_DECKS[info.flashcardKey]) ||
    TRACK_FLASHCARD_DECKS.a1 || {
      title: "German Vocabulary Flashcards",
      deck: [],
    };

  const vocabLabDeck: FlashcardDeckItem[] = useMemo(() => {
    if (!isVocabLabDeck) return [];
    const labSlug = rawTopic.slice("vocab-".length);
    const lab = getCoreLabById(labSlug, info.levelKey);
    if (!lab) return coreDeckConfig?.deck || [];
    const labCards: FlashcardDeckItem[] = (lab.questions || []).slice(0, 8).map((q, idx) => {
      const answerStr = Array.isArray(q.answer) ? q.answer[0] : q.answer || "";
      const chosenOption =
        q.type === "mcq" && Array.isArray(q.options)
          ? q.options.find((o) => o.id === answerStr)?.text || answerStr
          : answerStr;
      return {
        id: `${lab.id}-vc-${idx + 1}`,
        german: chosenOption || q.label || lab.title,
        category: q.label || lab.topics[0] || "Wortschatz",
        english: q.prompt || lab.subtitle,
        hindi: q.explanation || `Lab ${lab.level.toUpperCase()} — ${lab.title}`,
        exampleDe: q.prompt || lab.title,
        exampleTranslation: chosenOption ? `Lösung: ${chosenOption}` : lab.subtitle,
        grammarTip: q.explanation || "",
      };
    });
    return labCards.length > 0 ? labCards : (coreDeckConfig?.deck || []);
  }, [isVocabLabDeck, rawTopic, info.levelKey, coreDeckConfig]);

  const pageTitle =
    matchedTopic?.title ||
    (workbookMeta ? cleanWorkbookTitle(workbookMeta.title) : null) ||
    (isExamLauncher
      ? `${info?.label || "Exam"} ${SECTION_META[resolvedSection]?.label || "Prüfung"}`
      : rawTopic === "stk-syllabus"
      ? `${info?.label || "Studienkolleg"} Syllabus & Past Papers`
      : isStkWorkspace
      ? `${info?.label || "Studienkolleg"} Formula Calculator Engine`
      : rawTopic === "pflege-dialogues"
      ? "Clinical Ward Dialogues & Redemittel"
      : isPflegeHub
      ? "ISBAR Shift Handover Simulator"
      : `${info?.label || "Academy"} Focused Workspace`);

  const pageSubtitle =
    matchedTopic?.subtitle ||
    workbookMeta?.subtitle ||
    "Single-focus learning environment. No distractions, no stacked modules.";

  return (
    <div className="min-h-screen flex flex-col bg-slate-50 text-slate-900">
      <Navbar activeDivision={info.divisionId} />

      <main className="flex-1 pb-24 lg:pb-12 bg-slate-50 text-slate-900 light-study">
        <BreadcrumbHeader
          breadcrumbs={[
            { label: "Home", href: "/dashboard" },
            { label: info.divisionLabel, href: info.divisionHref },
            { label: info.label, href: `/academy/${info.levelKey}` },
            {
              label: moduleMeta.title,
              href: `/academy/${info.levelKey}/${moduleSlug}`,
            },
            { label: pageTitle },
          ]}
          eyebrow={
            matchedTopic?.indexLabel || `${info.label} · FOCUSED WORKSPACE`
          }
          title={pageTitle}
          subtitle={pageSubtitle}
          theme={matchedTopic?.theme || moduleMeta.theme}
          backHref={`/academy/${info.levelKey}/${moduleSlug}`}
          backLabel="Topics"
        />

        <section className="mx-auto w-full max-w-6xl px-4 sm:px-8 py-10">
          {/* 1. Core, Lab Vocab, or Factory Flashcard Deck */}
          {(isCoreDeck || isFactoryDeck || isVocabLabDeck) && (
            <div key={`deck-wrap-${rawTopic}`} className="mx-auto max-w-4xl">
              {isFactoryDeck && !catalogLoaded ? (
                <div className="rounded-2xl border border-slate-200 bg-white p-8 text-sm text-slate-600 shadow-sm">
                  Loading flashcard deck…
                </div>
              ) : isFactoryDeck &&
                (!factoryWorkbook || !factoryWorkbook.flashcards?.length) ? (
                <div className="rounded-2xl border border-slate-200 bg-white p-8 space-y-4 shadow-sm text-slate-900">
                  <p className="text-sm text-slate-600">
                    This flashcard deck has no cards loaded yet. Open the core{" "}
                    {info.label} deck instead.
                  </p>
                  <Link
                    href={`/academy/${info.levelKey}/01-vocabulary/core-deck`}
                    className="relative z-20 inline-flex items-center gap-2 rounded-xl bg-slate-900 px-6 py-3 text-xs font-semibold uppercase tracking-[0.16em] text-white hover:bg-slate-800 transition shadow-sm cursor-pointer"
                  >
                    Open Core Deck
                  </Link>
                </div>
              ) : (
                <Suspense fallback={<p className="text-sm text-slate-500 py-4">Loading Workspace...</p>}>
                  <FlashcardEngine
                    title={
                      isFactoryDeck && factoryWorkbook
                        ? cleanWorkbookTitle(factoryWorkbook.title)
                        : isVocabLabDeck
                        ? (matchedTopic?.title || `${info.label} Lab Vocabulary`)
                        : (coreDeckConfig?.title || "German Vocabulary Flashcards")
                    }
                    deck={
                      isFactoryDeck && Array.isArray(factoryWorkbook?.flashcards)
                        ? (factoryWorkbook.flashcards as FlashcardDeckItem[])
                        : isVocabLabDeck
                        ? vocabLabDeck
                        : (coreDeckConfig?.deck || [])
                    }
                    masteredCardIds={userProgress?.masteredFlashcards}
                    onToggleMasteredCard={handleToggleMasteredCard}
                    onCompleteDeck={() => {
                      const step1 = getStepId(info.levelKey, 1);
                      const merged = Array.from(
                        new Set([...(userProgress?.completedSteps || []), step1]),
                      );
                      void updateUserProgress(uid, { completedSteps: merged });
                    }}
                  />
                </Suspense>
              )}
            </div>
          )}

          {/* 2. Studienkolleg Dedicated Formula & Past-Paper Workspace */}
          {isStkWorkspace && (
            <StudienkollegHub
              unlockedCourses={unlockedSlugs}
              initialTrack={info.stkTrack || "t_kurs"}
              initialView={
                rawTopic === "stk-syllabus" ? "syllabus" : "formulas"
              }
              onRequestAccess={(slug, title) =>
                router.push(
                  `/pricing?product=${encodeURIComponent(slug)}&title=${encodeURIComponent(title)}`,
                )
              }
            />
          )}

          {/* 3. Pflege Clinical ISBAR Simulator */}
          {isPflegeHub && (
            <FachspracheMedizinHub
              unlockedCourses={unlockedSlugs}
              initialView={
                rawTopic === "pflege-dialogues" ? "dialogue" : "isbar_trainer"
              }
              onRequestAccess={(slug, title) =>
                router.push(
                  `/pricing?product=${encodeURIComponent(slug)}&title=${encodeURIComponent(title)}`,
                )
              }
            />
          )}

          {/* 4. Focused Exam / Lab Briefing Launcher */}
          {isExamLauncher && (
            <div className="mx-auto max-w-3xl rounded-2xl border border-slate-200 bg-white p-6 sm:p-10 space-y-6 text-slate-900 shadow-sm">
              <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 pb-4">
                <span className="text-[11px] font-semibold uppercase tracking-[0.22em] text-slate-500">
                  OFFICIAL SIMULATION BRIEFING
                </span>
                <span className="rounded-full border border-slate-200 bg-slate-100 px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.16em] text-slate-700">
                  {info?.label || "Exam"} · {SECTION_META[resolvedSection]?.label || "Section"}
                </span>
              </div>

              <div className="space-y-3">
                <h2 className="text-2xl sm:text-3xl font-semibold tracking-tight text-slate-900">
                  {info?.label || "Exam"} · {SECTION_META[resolvedSection]?.label || "Section"} (
                  {SECTION_META[resolvedSection]?.english || "Preparation"})
                </h2>
                <p className="text-sm text-slate-600 leading-relaxed">
                  Entering the live exam room activates distraction-free Focus
                  Mode. Audio rules, countdown timers, and automated grading
                  follow official Goethe, telc, and Studienkolleg assessment
                  standards.
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 space-y-1">
                  <div className="flex items-center gap-2 text-xs font-semibold text-slate-900">
                    <Clock className="h-4 w-4 text-slate-600" />
                    <span>Focus Mode Timer</span>
                  </div>
                  <p className="text-xs text-slate-500">
                    Real exam pacing with locked listening replay counters where
                    applicable.
                  </p>
                </div>
                <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 space-y-1">
                  <div className="flex items-center gap-2 text-xs font-semibold text-slate-900">
                    <ShieldCheck className="h-4 w-4 text-emerald-600" />
                    <span>Instant Musterlösung</span>
                  </div>
                  <p className="text-xs text-slate-500">
                    Automated scoring and detailed explanations upon submission.
                  </p>
                </div>
              </div>

              <div className="flex flex-wrap items-center justify-between gap-4 pt-4 border-t border-slate-100">
                <Link
                  href={`/academy/${info.levelKey}/${moduleSlug}`}
                  className="relative z-20 inline-flex items-center justify-center rounded-xl border border-slate-200 bg-white px-6 py-3 text-xs font-semibold uppercase tracking-[0.16em] text-slate-700 hover:bg-slate-50 transition shadow-xs cursor-pointer"
                >
                  Back to Topics
                </Link>
                <Link
                  href={`/exam/${info.examLevel}/${resolvedSection}`}
                  className="relative z-20 inline-flex items-center gap-2 rounded-xl bg-slate-900 px-7 py-3 text-xs font-semibold uppercase tracking-[0.18em] text-white hover:bg-slate-800 transition shadow-sm cursor-pointer"
                >
                  <span>Launch Live Exam</span>
                  <ArrowRight className="h-4 w-4" />
                </Link>
              </div>
            </div>
          )}

          {/* 5. Any Workbook / Chapter Dossier */}
          {!isCoreDeck &&
            !isFactoryDeck &&
            !isVocabLabDeck &&
            !isStkWorkspace &&
            !isPflegeHub &&
            !isExamLauncher && (
              <Suspense fallback={<p className="text-sm text-slate-500 py-4">Loading Workspace...</p>}>
                <FocusedWorkbookWorkspace
                  workbookId={rawTopic}
                  levelHint={info?.levelKey || rawLevel}
                  moduleHint={rawModule}
                  topicTitleHint={matchedTopic?.title || pageTitle}
                  topicSubtitleHint={matchedTopic?.subtitle || pageSubtitle}
                  onWorkbookLoaded={(wb) => setWorkbookMeta(wb)}
                />
              </Suspense>
            )}
        </section>
      </main>

      <BottomNavigationBar />
    </div>
  );
}
