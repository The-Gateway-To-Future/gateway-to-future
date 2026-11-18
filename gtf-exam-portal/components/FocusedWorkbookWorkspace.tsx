"use client";

import React, { Suspense, useCallback, useEffect, useState } from "react";
import {
  AlertCircle,
  BookOpen,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  ExternalLink,
  Headphones,
  Lock,
  Sparkles,
  XCircle,
} from "lucide-react";
import { AntiPiracyPdfViewer } from "@/components/AntiPiracyPdfViewer";
import { AntiPiracyShield } from "@/components/AntiPiracyShield";
import { FlashcardEngine } from "@/components/FlashcardEngine";
import { getActiveUserEmail } from "@/lib/client-storage";
import { BRAND } from "@/lib/config";
import { doc, getDoc } from "firebase/firestore";
import { getFirebaseFirestore } from "@/lib/firebase";
import Link from "next/link";
import type { WorkbookClientView, WorkbookContentType } from "@/lib/types";
import { getCoreLabById, convertLabToWorkbook } from "@/lib/curriculum-labs";

function resolveStrictContentType(wb: WorkbookClientView | null, moduleHint?: string): WorkbookContentType {
  if (wb?.contentType) {
    return wb.contentType;
  }
  const mod = (wb?.module || moduleHint || "").toLowerCase();
  const sk = (wb?.skill || "").toLowerCase();
  const id = (wb?.id || "").toLowerCase();
  const title = (wb?.title || "").toLowerCase();

  if (sk === "schreiben" || id.includes("schreiben")) return "exam_schreiben";
  if (sk === "sprechen" || id.includes("sprechen")) return "exam_sprechen";
  if (sk === "hoeren" || id.includes("hoeren") || title.includes("hören")) return "exam_hoeren";
  if (
    sk === "lesen" ||
    id.includes("lesen") ||
    id.includes("sprachbausteine") ||
    id.includes("pruefungstraining") ||
    id.includes("modelltest") ||
    title.includes("lesen") ||
    title.includes("prüfungstraining") ||
    mod.includes("03-hoeren-lesen") ||
    mod.includes("04-modelltests")
  ) {
    return "exam_lesen";
  }
  if (mod.includes("02-grammar") || sk === "grammar" || id.includes("grammar") || id.includes("grammatik")) {
    return "grammar";
  }
  return "exam_lesen";
}

interface GradedWorkbookItem {
  id: string;
  label: string;
  given: string;
  isCorrect: boolean;
  correctAnswer: string;
  explanation: string;
}

interface GradedWorkbookResponse {
  score: number;
  total: number;
  percent: number;
  items: GradedWorkbookItem[];
}

const MINI_UMLAUTS = ["ä", "ö", "ü", "ß"] as const;

interface FocusedWorkbookWorkspaceProps {
  workbookId: string;
  levelHint?: string;
  moduleHint?: string;
  topicTitleHint?: string;
  topicSubtitleHint?: string;
  nextTopicHref?: string;
  nextTopicLabel?: string;
  onWorkbookLoaded?: (wb: WorkbookClientView | null) => void;
}

function FocusedWorkbookWorkspaceInner({
  workbookId,
  levelHint,
  moduleHint,
  topicTitleHint,
  topicSubtitleHint,
  nextTopicHref,
  nextTopicLabel,
  onWorkbookLoaded,
}: FocusedWorkbookWorkspaceProps) {
  const [isMounted, setIsMounted] = useState(false);
  useEffect(() => {
    setIsMounted(true);
  }, []);

  const [workbook, setWorkbook] = useState<WorkbookClientView | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [graded, setGraded] = useState<GradedWorkbookResponse | null>(null);
  const [grading, setGrading] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [activeAudioSrc, setActiveAudioSrc] = useState<string>("");
  const [audioError, setAudioError] = useState(false);

  const storageKey = `gtf_wb_answers_${workbookId}`;

  // Reset all state when workbookId, levelHint, or moduleHint changes
  useEffect(() => {
    setWorkbook(null);
    setCurrentPage(1);
    setAnswers({});
    setGraded(null);
    setGrading(false);
    setError(null);
    setActiveAudioSrc("");
    setAudioError(false);
    setLoading(true);
  }, [workbookId, levelHint, moduleHint]);

  const fetchWorkbook = useCallback(
    async (emailOverride?: string) => {
      setLoading(true);
      setError(null);

      const email = emailOverride || getActiveUserEmail();
      const cleanId = decodeURIComponent(workbookId || "").trim();
      const cleanLevel = (levelHint || "").toLowerCase().trim();
      const cleanModule = (moduleHint || "").toLowerCase().trim().replace(/^\d+-/, "");

      const resolveLocalLabFallback = (): WorkbookClientView | null => {
        const coreLab = getCoreLabById(cleanId, cleanLevel || undefined);
        if (!coreLab) return null;
        const wb = convertLabToWorkbook(coreLab);
        return {
          ...wb,
          unlocked: true,
          viewerEmail: email,
          isFree: true,
          coverColor: wb.coverColor || "#0F172A",
          priceEur: wb.priceEur || 0,
          priceInr: wb.priceInr || 0,
        };
      };

      const candidateIds = Array.from(
        new Set(
          [
            cleanId,
            cleanLevel && cleanModule ? `${cleanLevel}-${cleanModule}-${cleanId}` : "",
            cleanLevel ? `${cleanLevel}-${cleanId}` : "",
            cleanId.replace(/^(wb-|workbook-)/, ""),
            `wb-${cleanId}`,
            cleanLevel && cleanModule
              ? `${cleanLevel}-${cleanModule}-${cleanId.replace(/^(wb-|workbook-)/, "")}`
              : "",
          ].filter(Boolean),
        ),
      );

      const loadPipeline = async (): Promise<WorkbookClientView | null> => {
        // 1. Primary: Parallel Firestore lookup (`workbooks` & `materials`)
        try {
          const db = getFirebaseFirestore();
          const fsChecks = candidateIds.map(async (testId) => {
            try {
              const wbSnap = await getDoc(doc(db, "workbooks", testId));
              if (wbSnap.exists()) {
                return { id: testId, data: wbSnap.data() };
              }
              const matSnap = await getDoc(doc(db, "materials", testId));
              if (matSnap.exists()) {
                return { id: testId, data: matSnap.data() };
              }
            } catch {
              // ignore individual doc errors
            }
            return null;
          });

          const fsMatches = await Promise.all(fsChecks);
          const fsResult = fsMatches.find((r) => r !== null && Boolean(r.data)) || null;

          if (fsResult && fsResult.data) {
            const fsData = fsResult.data;
            const fsContentType = fsData.contentType as WorkbookContentType | undefined;
            const isGrammarDoc = fsContentType === "grammar";
            return {
              id: fsResult.id,
              title: fsData.title || topicTitleHint || cleanId,
              subtitle: fsData.subtitle || topicSubtitleHint || "",
              level: fsData.level || (cleanLevel as any) || "b1",
              contentType: fsContentType,
              module: fsData.module || undefined,
              skill: fsData.skill || undefined,
              pages: fsData.pages || 4,
              topics: Array.isArray(fsData.topics) ? fsData.topics : [],
              questions: isGrammarDoc
                ? []
                : Array.isArray(fsData.questions)
                ? fsData.questions
                : [],
              flashcards: isGrammarDoc && Array.isArray(fsData.flashcards) ? fsData.flashcards : [],
              grammarNotes:
                isGrammarDoc && fsData.grammarNotes && typeof fsData.grammarNotes === "object"
                  ? fsData.grammarNotes
                  : undefined,
              readingPassage:
                !isGrammarDoc && typeof fsData.readingPassage === "string" && fsData.readingPassage.trim()
                  ? fsData.readingPassage
                  : undefined,
              unlocked: true,
              viewerEmail: email,
              productSlug: fsData.productSlug || fsResult.id,
              audioUrl:
                fsContentType === "exam_hoeren" || fsContentType === "exam_sprechen"
                  ? fsData.audioUrl || undefined
                  : undefined,
              isFree: true,
              coverColor: fsData.coverColor || "#0F172A",
              priceEur: typeof fsData.priceEur === "number" ? fsData.priceEur : 0,
              priceInr: typeof fsData.priceInr === "number" ? fsData.priceInr : 0,
            };
          }
        } catch {
          // Firestore timed out or errored; fall through immediately
        }

        // 2. Immediate Local Core Labs & Grammar Pillars lookup before slow network fallbacks
        const localFallback = resolveLocalLabFallback();
        if (localFallback) {
          return localFallback;
        }

        // 3. Secondary: Server API (/api/workbooks/[id]) for catalog PDFs & custom workbooks
        for (const testId of candidateIds.slice(0, 3)) {
          try {
            const controller = new AbortController();
            const apiTimeoutId = setTimeout(() => controller.abort(), 1500);
            const res = await fetch(
              `/api/workbooks/${encodeURIComponent(testId)}?email=${encodeURIComponent(email)}`,
              { signal: controller.signal },
            );
            clearTimeout(apiTimeoutId);
            if (res.ok) {
              const data = (await res.json()) as { workbook?: WorkbookClientView };
              if (data?.workbook) {
                return data.workbook;
              }
            }
          } catch {
            // continue checking candidate IDs
          }
        }

        return null;
      };

      try {
        const hardTimeoutPromise = new Promise<"TIMEOUT">((resolve) =>
          setTimeout(() => resolve("TIMEOUT"), 2800),
        );

        const raceResult = await Promise.race([loadPipeline(), hardTimeoutPromise]);
        if (raceResult === "TIMEOUT") {
          const localFallback = resolveLocalLabFallback();
          setWorkbook(localFallback);
          onWorkbookLoaded?.(localFallback);
        } else {
          setWorkbook(raceResult);
          onWorkbookLoaded?.(raceResult);
        }
      } catch (err) {
        console.warn("[FocusedWorkbookWorkspace] Content query ended without match:", err);
        const localFallback = resolveLocalLabFallback();
        setWorkbook(localFallback);
        onWorkbookLoaded?.(localFallback);
      } finally {
        setLoading(false);
      }
    },
    [workbookId, levelHint, moduleHint, topicTitleHint, topicSubtitleHint, onWorkbookLoaded],
  );

  // Hard 3-second UI watchdog so loading spinner can NEVER spin infinitely
  useEffect(() => {
    if (!loading) return;
    const watchdog = setTimeout(() => {
      setLoading(false);
    }, 3000);
    return () => clearTimeout(watchdog);
  }, [loading, workbookId]);

  useEffect(() => {
    fetchWorkbook();
    if (typeof window !== "undefined") {
      try {
        const saved = localStorage.getItem(storageKey);
        if (saved) setAnswers(JSON.parse(saved));
      } catch {
        // ignore
      }
    }
  }, [fetchWorkbook, storageKey]);

  const setAnswer = (qId: string, val: string) => {
    setAnswers((prev) => {
      const next = { ...prev, [qId]: val };
      if (typeof window !== "undefined") {
        try {
          localStorage.setItem(storageKey, JSON.stringify(next));
        } catch {
          // ignore
        }
      }
      return next;
    });
  };

  const handleGrade = async () => {
    setGrading(true);
    try {
      // 1. Try server evaluation
      try {
        const res = await fetch(`/api/workbooks/${encodeURIComponent(workbookId)}`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ answers }),
        });
        if (res.ok) {
          const data = (await res.json()) as GradedWorkbookResponse;
          setGraded(data);
          return;
        }
      } catch {
        // Network/server failed, fall through to client-side evaluation
      }

      // 2. Client-side guaranteed local grading fallback
      if (workbook && Array.isArray(workbook.questions) && workbook.questions.length > 0) {
        const gradedItems = workbook.questions.map((q) => {
          const given = (answers[q.id] || "").trim();
          const expectedList = Array.isArray(q.answer)
            ? q.answer
            : q.answer
            ? [q.answer]
            : [];
          const isCorrect =
            given.length > 0 &&
            expectedList.some(
              (exp) =>
                exp.trim().toLowerCase().replace(/[.!?]+$/g, "") ===
                given.trim().toLowerCase().replace(/[.!?]+$/g, ""),
            );
          const displayCorrect =
            q.type === "mcq" && q.options
              ? (() => {
                  const opt = q.options.find((o) => o.id === expectedList[0]);
                  return opt ? `${opt.id.toUpperCase()}) ${opt.text}` : expectedList[0] || "";
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

        const correctCount = gradedItems.filter((g) => g.isCorrect).length;
        const percent = Math.round((correctCount / Math.max(1, gradedItems.length)) * 100);

        setGraded({
          score: correctCount,
          total: gradedItems.length,
          percent,
          items: gradedItems,
        });
      }
    } finally {
      setGrading(false);
    }
  };

  const normalizeAudioUrl = (url?: string | null): string => {
    if (!url) return "";
    const trimmed = url.trim();
    if (!trimmed) return "";
    if (/^(https?:\/\/|blob:|data:)/i.test(trimmed)) {
      return trimmed;
    }
    return trimmed.startsWith("/") ? trimmed : `/${trimmed}`;
  };

  const resolvedAudioUrl = normalizeAudioUrl(workbook?.audioUrl);

  useEffect(() => {
    if (resolvedAudioUrl) {
      setActiveAudioSrc(resolvedAudioUrl);
      setAudioError(false);
    } else {
      setActiveAudioSrc("");
    }
  }, [resolvedAudioUrl]);

  const handleAudioError = () => {
    setAudioError(true);
  };

  if (!isMounted) {
    return null;
  }

  if (loading) {
    return (
      <div
        key="wb-loading"
        className="light-study flex flex-col items-center justify-center rounded-2xl border border-slate-200 bg-white p-12 text-center space-y-4 shadow-sm text-slate-900"
      >
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-slate-900 border-t-transparent" />
        <div className="text-sm font-semibold text-slate-800">
          <span key="wb-loading-title">Lade geschütztes GTF Arbeitsheft…</span>
        </div>
        <p className="text-xs text-slate-500">
          <span key="wb-loading-sub">Synchronisiere Lernmaterialien &amp; Audio-Streams</span>
        </p>
      </div>
    );
  }

  if (error || !workbook) {
    const rawTopicName =
      topicTitleHint?.trim() ||
      decodeURIComponent(workbookId || "")
        .replace(/^(wb-factory-|wb-fc-|book-|dossier-|wb-|lab-|grammar-)/i, "")
        .replace(/[-_]+/g, " ")
        .replace(/\b\w/g, (c) => c.toUpperCase());

    const titleDisplay = `${rawTopicName} — Content Generating`;
    const levelDisplay = (levelHint || "b1").toUpperCase();
    const moduleDisplay = (moduleHint || "02-grammar")
      .replace(/^\d+-/, "")
      .replace(/[-_]+/g, " ")
      .toUpperCase();

    return (
      <div
        key={`wb-empty-${workbookId}`}
        className="light-study space-y-6 select-none text-slate-900 max-w-3xl mx-auto"
      >
        <div className="rounded-3xl border border-slate-200 bg-white p-8 sm:p-12 text-center space-y-6 shadow-sm">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl border border-amber-200 bg-amber-50 text-amber-600 shadow-xs">
            <Sparkles className="h-7 w-7 animate-pulse" />
          </div>

          <div className="space-y-2">
            <div className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-slate-100 px-3.5 py-1 text-[10px] font-semibold uppercase tracking-[0.18em] text-slate-700">
              <span key="empty-lvl">{levelDisplay}</span>
              <span key="empty-sep1">·</span>
              <span key="empty-mod">{moduleDisplay}</span>
              <span key="empty-sep2">·</span>
              <span key="empty-badge" className="text-amber-700 font-bold">IN PRODUKTION</span>
            </div>
            <h2 className="text-xl sm:text-2xl font-bold tracking-tight text-slate-900">
              <span key={`empty-title-${workbookId}`}>{titleDisplay}</span>
            </h2>
            <p className="text-sm font-medium text-slate-700 max-w-md mx-auto leading-relaxed pt-1">
              <span key="empty-desc-1">Die GTF AI-Factory erstellt derzeit dieses Material.</span>
            </p>
            <p className="text-xs text-slate-500 max-w-md mx-auto leading-relaxed">
              <span key="empty-desc-2">
                Dieses Modul wird für Ihren Vorbereitungspfad qualitätsgeprüft generiert. Audio-Player und Antwortbogen werden automatisch freigeschaltet, sobald das Material bereitsteht.
              </span>
            </p>
          </div>

          <div className="rounded-2xl border border-slate-100 bg-slate-50 p-4 text-xs text-slate-500 space-y-1 text-left max-w-md mx-auto font-mono">
            <p><span className="font-semibold text-slate-700">Level:</span>{" "}<span key="meta-lvl">{levelDisplay}</span></p>
            <p><span className="font-semibold text-slate-700">Modul:</span>{" "}<span key="meta-mod">{moduleDisplay}</span></p>
            <p><span className="font-semibold text-slate-700">Topic ID:</span>{" "}<span key="meta-id">{decodeURIComponent(workbookId)}</span></p>
            <p><span className="font-semibold text-slate-700">Status:</span>{" "}<span key="meta-status">Content In Production (AI Factory Queue)</span></p>
          </div>

          <div className="flex flex-wrap items-center justify-center gap-3 pt-3 border-t border-slate-100">
            <Link
              href={`/academy/${levelHint || "b1"}/${moduleHint || "02-grammar"}`}
              className="relative z-20 inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-5 py-2.5 text-xs font-semibold text-slate-700 hover:bg-slate-50 transition shadow-xs cursor-pointer"
            >
              <ChevronLeft className="h-4 w-4" />
              <span>Zurück zu den Themen</span>
            </Link>

            <Link
              href={`/academy/${levelHint || "b1"}/01-vocabulary/core-deck`}
              className="relative z-20 inline-flex items-center gap-2 rounded-xl bg-slate-900 px-5 py-2.5 text-xs font-semibold uppercase tracking-[0.14em] text-white hover:bg-slate-800 transition shadow-sm cursor-pointer"
            >
              <span>Vokabel-Deck öffnen</span>
              <ChevronRight className="h-4 w-4" />
            </Link>
          </div>
        </div>
      </div>
    );
  }

  if (!workbook.unlocked) {
    return (
      <div
        key={`wb-locked-${workbook.id}`}
        className="light-study mx-auto max-w-2xl rounded-2xl border border-slate-200 bg-white p-8 text-center space-y-5 shadow-sm text-slate-900"
      >
        <AntiPiracyShield
          userEmail={workbook.viewerEmail}
          resourceTitle={`${workbook.title} (${workbook.level.toUpperCase()})`}
        />
        <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl border border-amber-200 bg-amber-50 text-amber-700">
          <Lock className="h-7 w-7" />
        </div>
        <div className="space-y-2">
          <span
            key="locked-badge"
            className="inline-block rounded-full border border-slate-200 bg-slate-100 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-700"
          >
            {`Level ${workbook.level.toUpperCase()} Digital Workbook · ${workbook.pages} Pages`}
          </span>
          <h2 className="text-2xl font-semibold tracking-tight text-slate-900">
            <span key="locked-title">{`${workbook.title} — ${workbook.subtitle}`}</span>
          </h2>
          <p className="text-sm text-slate-600 leading-relaxed">
            <span key="locked-desc">
              {`Includes ${(workbook.questions || []).length} interactive exercises (${(Array.isArray(workbook.topics) ? workbook.topics : []).join(" · ")}) with anti-piracy in-app PDF streaming and instant answer-sheet grading.`}
            </span>
          </p>
        </div>

        <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
          <Link
            href={`/pricing?product=${encodeURIComponent(workbook.productSlug || workbook.id)}&title=${encodeURIComponent(workbook.title || "Workbook")}`}
            className="relative z-20 inline-flex items-center gap-2 rounded-xl bg-slate-900 px-6 py-3 text-xs font-semibold uppercase tracking-[0.16em] text-white transition hover:bg-slate-800 shadow-sm cursor-pointer"
          >
            <span>Unlock with GTF Pro (€50 / mo)</span>
          </Link>

          <a
            href={BRAND.whatsappUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="relative z-20 inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-5 py-3 text-xs font-semibold uppercase tracking-[0.14em] text-slate-700 hover:bg-slate-50 transition shadow-xs cursor-pointer"
          >
            <span>Contact Berlin Admissions</span>
            <ExternalLink className="h-3.5 w-3.5" />
          </a>
        </div>

        <p className="text-xs text-slate-500">
          <span>Questions? Contact Official GTF Support: </span>
          <a
            href={BRAND.whatsappUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="font-semibold text-emerald-600 hover:underline"
          >
            <span key="locked-phone">{BRAND.supportPhone}</span>
          </a>
        </p>
      </div>
    );
  }

  const effectiveContentType = resolveStrictContentType(workbook, moduleHint);
  const isGrammarMode = effectiveContentType === "grammar";
  const isExamLesenMode = effectiveContentType === "exam_lesen";
  const isExamHoerenMode = effectiveContentType === "exam_hoeren";
  const isExamSchreibenMode = effectiveContentType === "exam_schreiben";
  const isExamSprechenMode = effectiveContentType === "exam_sprechen";

  const showAudioPlayer =
    !isGrammarMode &&
    !isExamLesenMode &&
    !isExamSchreibenMode &&
    (isExamHoerenMode || isExamSprechenMode) &&
    Boolean(activeAudioSrc && activeAudioSrc.trim() !== "");

  const showGrammarSection = isGrammarMode;
  const showFlashcardsSection = isGrammarMode;
  const showReadingSection = !isGrammarMode;
  const showAnswerSheet = !isGrammarMode;

  const flashcardsList =
    showFlashcardsSection && Array.isArray(workbook?.flashcards) ? workbook.flashcards : [];

  return (
    <div key={`wb-root-${workbook.id}-${effectiveContentType}`} className="light-study space-y-6 select-none text-slate-900">
      <AntiPiracyShield
        userEmail={workbook.viewerEmail}
        resourceTitle={`${workbook.title} (${workbook.level.toUpperCase()})`}
      />

      {isGrammarMode ? (
        /* STRICT GRAMMAR MODE: ONLY Grammar Explanations & Grammar Flashcards.
           Exam Answer Sheets, Audio Players, and Reading Comprehension Passages are hidden. */
        <div key={`wb-grammar-${workbook.id}`} className="mx-auto max-w-4xl space-y-6" data-content-type="grammar">
          {showGrammarSection && (
            <div key={`wb-grammar-notes-${workbook.id}`} className="rounded-2xl border border-slate-200 bg-white p-6 sm:p-7 shadow-sm space-y-4">
              <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 pb-3">
                <div className="flex items-center gap-2">
                  <Sparkles className="h-4 w-4 text-amber-600" />
                  <span key="gr-header-title" className="text-xs font-bold uppercase tracking-wider text-slate-800">
                    Grammatik-Blueprint &amp; Strukturregeln
                  </span>
                </div>
                <span key="gr-header-badge" className="rounded-full border border-indigo-200 bg-indigo-50 px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-indigo-700">
                  122 Säulen · Theorie
                </span>
              </div>

              {Array.isArray(workbook.topics) && workbook.topics.length > 0 && (
                <div className="flex flex-wrap gap-1.5">
                  {workbook.topics.map((topic) => (
                    <span
                      key={topic}
                      className="rounded-lg border border-slate-200 bg-slate-50 px-2.5 py-1 text-[11px] font-semibold text-slate-700"
                    >
                      {topic}
                    </span>
                  ))}
                </div>
              )}

              {workbook.grammarNotes ? (
                <div key={`gr-notes-body-${workbook.id}`} className="space-y-4">
                  <p className="text-sm text-slate-700 leading-relaxed font-medium">
                    <span key="gr-rule">{workbook.grammarNotes.rule}</span>
                  </p>

                  {workbook.grammarNotes.proTip && (
                    <div key="gr-protip-box" className="rounded-xl border border-amber-200 bg-amber-50/70 p-4 space-y-1.5">
                      <span key="gr-protip-label" className="text-[10px] font-bold uppercase tracking-widest text-amber-800">
                        ⚡ GRAMMATIK-PRO-TIPP
                      </span>
                      <p className="text-xs text-amber-900 leading-relaxed">
                        <span key="gr-protip-text">{workbook.grammarNotes.proTip}</span>
                      </p>
                    </div>
                  )}

                  {Array.isArray(workbook.grammarNotes.examples) &&
                    workbook.grammarNotes.examples.length > 0 && (
                      <div key="gr-examples-box" className="space-y-2 pt-1">
                        <span key="gr-examples-label" className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">
                          Musterbeispiele:
                        </span>
                        <ul className="list-disc list-inside text-xs sm:text-sm text-slate-700 space-y-1.5">
                          {workbook.grammarNotes.examples.map((ex, idx) => (
                            <li key={`ex-${idx}`}>
                              <span key={`ex-span-${idx}`}>{ex}</span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}
                </div>
              ) : (
                <p className="text-sm text-slate-700 leading-relaxed">
                  <span key="gr-fallback-sub">{workbook.subtitle || workbook.title}</span>
                </p>
              )}
            </div>
          )}

          {showFlashcardsSection && (
            <div key={`wb-fc-engine-${workbook.id}`}>
              <Suspense
                fallback={
                  <p className="text-sm text-slate-500 py-4">
                    Lade Trilingual Grammatik-Flashcards…
                  </p>
                }
              >
                <FlashcardEngine
                  title={`${workbook.title} — Grammatik & Vokabel-Flashcards`}
                  deck={flashcardsList}
                  trackHint={levelHint || workbook.level}
                  nextTopicHref={
                    nextTopicHref ||
                    `/academy/${(levelHint || workbook.level || "a1").toLowerCase()}/02-grammar`
                  }
                  nextTopicLabel={nextTopicLabel || "Load Next Grammar Topic"}
                />
              </Suspense>
            </div>
          )}
        </div>
      ) : (
        /* STRICT PRÜFUNGSTRAINING MODE (exam_lesen / exam_hoeren / exam_schreiben / exam_sprechen):
           Grammar Pillars and Flashcards are hidden completely.
           exam_lesen hides the Audio Player and renders text + Answer Sheet. */
        <div key={`wb-exam-${workbook.id}-${effectiveContentType}`} className="grid gap-6 lg:grid-cols-12" data-content-type={effectiveContentType}>
          {/* Left Column: Audio (only Hören/Sprechen) + Reading Passage / PDF */}
          <div className="lg:col-span-7 space-y-5">
            {showAudioPlayer && (
              <div key={`wb-audio-${workbook.id}`} className="rounded-2xl border border-slate-200 bg-white p-4 sm:p-5 text-slate-900 shadow-sm">
                <div className="flex items-center justify-between gap-3 mb-3">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="flex h-9 w-9 items-center justify-center rounded-xl border border-slate-200 bg-slate-100 text-slate-700 shrink-0">
                      <Headphones className="h-4 w-4" />
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <span key="audio-studio-label" className="text-[10px] font-semibold uppercase tracking-[0.18em] text-slate-500">
                          Goethe / telc Studio Audio
                        </span>
                        <span key="audio-hd-badge" className="rounded-full border border-emerald-200 bg-emerald-50 px-2 py-0.5 text-[9px] font-semibold text-emerald-700">
                          128 kbps HD
                        </span>
                      </div>
                      <h3 className="text-xs sm:text-sm font-semibold text-slate-900 truncate">
                        <span key="audio-wb-title">{workbook.title}</span>
                      </h3>
                    </div>
                  </div>
                  <span key="audio-mode-badge" className="hidden sm:inline-flex rounded-lg border border-slate-200 bg-slate-100 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wider text-slate-600 shrink-0">
                    Prüfungsmodus Hören
                  </span>
                </div>

                <div className="rounded-xl border border-slate-200 bg-slate-50 p-2">
                  <audio
                    controls
                    preload="metadata"
                    playsInline
                    src={activeAudioSrc}
                    onError={handleAudioError}
                    onCanPlay={() => setAudioError(false)}
                    onLoadedMetadata={() => setAudioError(false)}
                    className="w-full h-10"
                  />
                  {audioError && (
                    <div key="audio-err-box" className="mt-2 rounded-lg border border-red-200 bg-red-50 p-2.5 text-xs font-semibold text-red-600 flex items-center gap-1.5">
                      <AlertCircle className="h-4 w-4 shrink-0 text-red-600" />
                      <span>Hinweis: Lokaler Audiotrack wird für diese Übungssitzung bereitgestellt.</span>
                    </div>
                  )}
                </div>

                <p className="mt-2.5 text-[11px] text-slate-500 leading-snug">
                  <span className="text-amber-700 font-semibold uppercase tracking-wider">
                    PRÜFUNGSHINWEIS ·
                  </span>{" "}
                  <span>
                    Der Audiotext wird während der Prüfung 1x bis 2x abgespielt. Notieren Sie Ihre Antworten im Antwortblatt rechts.
                  </span>
                </p>
              </div>
            )}

            {showReadingSection && workbook.pdfToken ? (
              <AntiPiracyPdfViewer
                key={`wb-pdf-${workbook.id}`}
                pdfToken={workbook.pdfToken}
                viewerEmail={workbook.viewerEmail || "demo@gatewaytofuture.com"}
                workbookTitle={`${workbook.title} (${workbook.level.toUpperCase()})`}
                totalPages={workbook.pages}
                currentPage={currentPage}
                onPageChange={setCurrentPage}
              />
            ) : (
              showReadingSection && (
                <div key={`wb-reading-${workbook.id}`} className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm space-y-3">
                  <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                    <div className="flex items-center gap-2">
                      <BookOpen className="h-4 w-4 text-slate-700" />
                      <span key={`reading-heading-${effectiveContentType}`} className="text-xs font-bold uppercase tracking-wider text-slate-800">
                        {isExamLesenMode
                          ? "Lesetext & Prüfungsaufgabe"
                          : isExamSchreibenMode
                          ? "Schreibaufgabe & Kriterien"
                          : isExamSprechenMode
                          ? "Sprechaufgabe & Redemittel-Briefing"
                          : "Hörverstehen — Aufgabenkontext"}
                      </span>
                    </div>
                    <span key={`reading-badge-${effectiveContentType}`} className="rounded-full border border-slate-200 bg-slate-100 px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-slate-600">
                      {effectiveContentType.replace("_", " ").toUpperCase()}
                    </span>
                  </div>

                  {workbook.readingPassage ? (
                    <p className="text-sm text-slate-700 leading-relaxed whitespace-pre-line font-normal german-reading">
                      <span key={`reading-passage-${workbook.id}`}>{workbook.readingPassage}</span>
                    </p>
                  ) : (
                    <div key={`reading-fallback-${workbook.id}`} className="space-y-2 text-sm text-slate-600 leading-relaxed">
                      <p className="font-semibold text-slate-800">
                        <span key="reading-fb-title">{workbook.title}</span>
                      </p>
                      <p>
                        <span key="reading-fb-sub">{workbook.subtitle}</span>
                      </p>
                      {isExamHoerenMode && (
                        <p className="text-xs text-slate-500">
                          <span key="reading-fb-hoeren">
                            Hören Sie die Audioaufnahme oben aufmerksam an und markieren Sie die richtigen Antworten im Antwortblatt rechts.
                          </span>
                        </p>
                      )}
                    </div>
                  )}
                </div>
              )
            )}
          </div>

          {/* Right Column: Interactive Answer Sheet */}
          {showAnswerSheet && (
            <div key={`wb-sheet-${workbook.id}`} className="lg:col-span-5 space-y-4">
              <div className="rounded-2xl border border-slate-200 bg-white p-5 space-y-4 shadow-sm">
                <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                  <div>
                    <span className="text-[10px] font-semibold uppercase tracking-[0.18em] text-slate-500">
                      Interactive Answer Sheet
                    </span>
                    <h2 className="text-base font-semibold text-slate-900 german-headline">
                      <span key="sheet-count">{`Antwortblatt (${(workbook.questions || []).length} Aufgaben)`}</span>
                    </h2>
                  </div>

                  {graded && (
                    <span key="sheet-score" className="rounded-xl border border-emerald-300 bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-700">
                      {`Score: ${graded.score}/${graded.total} (${graded.percent}%)`}
                    </span>
                  )}
                </div>

                <div className="max-h-[560px] space-y-3.5 overflow-y-auto pr-1">
                  {(Array.isArray(workbook?.questions) ? workbook.questions : []).map((q) => {
                    if (!q) return null;
                    const val = answers[q.id] || "";
                    const gradedItem = (graded?.items || []).find((it) => it.id === q.id);

                    return (
                      <div
                        key={q.id}
                        className={`rounded-xl border p-4 text-xs transition ${
                          gradedItem
                            ? gradedItem.isCorrect
                              ? "border-emerald-300 bg-emerald-50/70"
                              : "border-amber-300 bg-amber-50/70"
                            : "border-slate-200 bg-slate-50/60"
                        }`}
                      >
                        <div className="flex items-center justify-between gap-2">
                          <span key={`q-lbl-${q.id}`} className="font-semibold text-slate-900">{q.label}</span>
                          <span key={`q-page-${q.id}`} className="text-[10px] font-medium text-slate-500">
                            {`Teil ${q.page || 1}`}
                          </span>
                        </div>

                        <p className="mt-1.5 text-xs font-medium text-slate-800">
                          <span key={`q-prompt-${q.id}`}>{q.prompt}</span>
                        </p>

                        {q.type === "mcq" && Array.isArray(q.options) && q.options.length > 0 ? (
                          <div className="mt-2.5 grid grid-cols-1 gap-2">
                            {(q.options || []).map((opt) => {
                              const active = val === opt.id;
                              return (
                                <button
                                  key={opt.id}
                                  type="button"
                                  onClick={() => setAnswer(q.id, opt.id)}
                                  className={`relative z-20 text-left rounded-lg border px-3 py-2 text-xs font-semibold transition cursor-pointer ${
                                    active
                                      ? "border-slate-900 bg-slate-900 text-white shadow-xs"
                                      : "border-slate-200 bg-white text-slate-700 hover:bg-slate-100 hover:text-slate-900 shadow-xs"
                                  }`}
                                >
                                  <span className="mr-2 uppercase font-mono">{`${opt.id})`}</span>
                                  <span key={`opt-text-${q.id}-${opt.id}`}>{opt.text}</span>
                                </button>
                              );
                            })}
                          </div>
                        ) : (
                          <div className="mt-2.5 space-y-1.5">
                            <div className="flex items-center gap-1">
                              {(MINI_UMLAUTS || []).map((u) => (
                                <button
                                  key={u}
                                  type="button"
                                  onClick={() => setAnswer(q.id, val + u)}
                                  className="relative z-20 rounded border border-slate-200 bg-white px-2 py-0.5 font-mono text-xs font-semibold text-slate-700 hover:bg-slate-900 hover:text-white transition shadow-xs cursor-pointer"
                                >
                                  <span>{u}</span>
                                </button>
                              ))}
                            </div>
                            <input
                              type="text"
                              value={val}
                              onChange={(e) => setAnswer(q.id, e.target.value)}
                              placeholder="Ihre Lösung eingeben…"
                              className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs font-medium text-slate-900 placeholder:text-slate-400 focus:border-slate-900 focus:outline-none focus:ring-1 focus:ring-slate-900"
                            />
                          </div>
                        )}

                        {gradedItem && (
                          <div key={`graded-${q.id}`} className="mt-2.5 rounded-lg border border-slate-200 bg-white p-2.5 text-[11px] space-y-1 shadow-xs">
                            <div className="flex items-center gap-1.5 font-semibold">
                              {gradedItem.isCorrect ? (
                                <span key={`graded-ok-${q.id}`} className="inline-flex items-center gap-1 text-emerald-700">
                                  <CheckCircle2 className="h-3.5 w-3.5" />
                                  <span>Richtig!</span>
                                </span>
                              ) : (
                                <span key={`graded-err-${q.id}`} className="inline-flex items-center gap-1 text-amber-700">
                                  <XCircle className="h-3.5 w-3.5" />
                                  <span>{`Lösung: ${gradedItem.correctAnswer}`}</span>
                                </span>
                              )}
                            </div>
                            {gradedItem.explanation && (
                              <p className="text-slate-600 german-reading leading-relaxed">
                                <span key={`graded-exp-${q.id}`}>{gradedItem.explanation}</span>
                              </p>
                            )}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>

                <button
                  type="button"
                  disabled={grading}
                  onClick={handleGrade}
                  className="relative z-20 flex w-full items-center justify-center gap-2 rounded-xl bg-slate-900 py-3 text-xs font-semibold uppercase tracking-[0.16em] text-white transition hover:bg-slate-800 shadow-sm disabled:opacity-50 cursor-pointer"
                >
                  <Sparkles className="h-4 w-4" />
                  <span key={`grade-btn-${grading ? "busy" : "idle"}`}>
                    {grading ? "Prüfe Antworten…" : "Antwortblatt jetzt auswerten"}
                  </span>
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export function FocusedWorkbookWorkspace(props: FocusedWorkbookWorkspaceProps) {
  return (
    <Suspense fallback={<p className="text-sm text-slate-500 py-4">Loading Workspace...</p>}>
      <FocusedWorkbookWorkspaceInner {...props} />
    </Suspense>
  );
}
