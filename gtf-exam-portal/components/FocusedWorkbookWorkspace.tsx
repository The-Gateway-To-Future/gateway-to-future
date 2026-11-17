"use client";

import { useCallback, useEffect, useState } from "react";
import {
  AlertCircle,
  BookOpen,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  ExternalLink,
  Headphones,
  Lock,
  RotateCw,
  Sparkles,
  Volume2,
  XCircle,
} from "lucide-react";
import { AntiPiracyPdfViewer } from "@/components/AntiPiracyPdfViewer";
import { AntiPiracyShield } from "@/components/AntiPiracyShield";
import { getActiveUserEmail } from "@/lib/client-storage";
import { BRAND } from "@/lib/config";
import { doc, getDoc } from "firebase/firestore";
import { getFirebaseFirestore } from "@/lib/firebase";
import Link from "next/link";
import type { WorkbookClientView } from "@/lib/types";
import { getCoreLabById, convertLabToWorkbook } from "@/lib/curriculum-labs";
import { generateFallbackLesson } from "@/lib/fallback-lessons";

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
  topicTitleHint?: string;
  topicSubtitleHint?: string;
  onWorkbookLoaded?: (wb: WorkbookClientView) => void;
}

export function FocusedWorkbookWorkspace({
  workbookId,
  levelHint,
  topicTitleHint,
  topicSubtitleHint,
  onWorkbookLoaded,
}: FocusedWorkbookWorkspaceProps) {
  const [workbook, setWorkbook] = useState<WorkbookClientView | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [graded, setGraded] = useState<GradedWorkbookResponse | null>(null);
  const [grading, setGrading] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // In-lesson interactive flashcard state (when no PDF)
  const [cardIndex, setCardIndex] = useState(0);
  const [isFlipped, setIsFlipped] = useState(false);

  const storageKey = `gtf_wb_answers_${workbookId}`;

  const fetchWorkbook = useCallback(
    async (emailOverride?: string) => {
      setLoading(true);
      setError(null);
      try {
        const email = emailOverride || getActiveUserEmail();
        const cleanId = decodeURIComponent(workbookId || "").trim();

        // 1. Immediate local lookup from 40 Core Labs repository (0ms delay)
        const coreLab = getCoreLabById(cleanId, levelHint);
        if (coreLab) {
          const wb = convertLabToWorkbook(coreLab);
          const clientWb: WorkbookClientView = {
            ...wb,
            unlocked: true,
            viewerEmail: email,
            isFree: true,
            coverColor: wb.coverColor || "#0F172A",
            priceEur: wb.priceEur || 0,
            priceInr: wb.priceInr || 0,
          };
          setWorkbook(clientWb);
          onWorkbookLoaded?.(clientWb);
          setLoading(false);
          return;
        }

        // 2. Fetch server API with strict 4-second timeout
        const controller = new AbortController();
        const apiTimeoutId = setTimeout(() => controller.abort(), 4000);

        try {
          const res = await fetch(
            `/api/workbooks/${encodeURIComponent(cleanId)}?email=${encodeURIComponent(email)}`,
            { signal: controller.signal },
          );
          clearTimeout(apiTimeoutId);
          if (res.ok) {
            const data = (await res.json()) as { workbook?: WorkbookClientView };
            if (data?.workbook) {
              setWorkbook(data.workbook);
              onWorkbookLoaded?.(data.workbook);
              setLoading(false);
              return;
            }
          }
        } catch {
          clearTimeout(apiTimeoutId);
        }

        // 3. Client-side Firestore check with strict 4-second timeout race
        try {
          const firestoreQueryPromise = (async () => {
            const db = getFirebaseFirestore();
            const matRef = doc(db, "materials", cleanId);
            const matSnap = await getDoc(matRef);
            if (matSnap.exists()) {
              return matSnap.data();
            }
            const wbRef = doc(db, "workbooks", cleanId);
            const wbSnap = await getDoc(wbRef);
            if (wbSnap.exists()) {
              return wbSnap.data();
            }
            return null;
          })();

          const timeoutPromise = new Promise<null>((_, reject) =>
            setTimeout(() => reject(new Error("Firestore timeout after 4000ms")), 4000),
          );

          const fsData = await Promise.race([firestoreQueryPromise, timeoutPromise]);
          if (fsData) {
            const clientWb: WorkbookClientView = {
              id: cleanId,
              title: fsData.title || cleanId,
              subtitle: fsData.subtitle || "",
              level: fsData.level || (levelHint as any) || "b1",
              pages: fsData.pages || 4,
              topics: Array.isArray(fsData.topics) ? fsData.topics : [],
              questions: Array.isArray(fsData.questions) ? fsData.questions : [],
              unlocked: true,
              viewerEmail: email,
              productSlug: fsData.productSlug || cleanId,
              audioUrl: fsData.audioUrl || undefined,
              isFree: true,
              coverColor: fsData.coverColor || "#0F172A",
              priceEur: typeof fsData.priceEur === "number" ? fsData.priceEur : 0,
              priceInr: typeof fsData.priceInr === "number" ? fsData.priceInr : 0,
            };
            setWorkbook(clientWb);
            onWorkbookLoaded?.(clientWb);
            setLoading(false);
            return;
          }
        } catch {
          // Firestore timed out or errored
        }

        // 4. GUARANTEED ZERO-SPIN FALLBACK LESSON GENERATION
        // If Firestore document does not exist, never leave the user waiting!
        const fallback = generateFallbackLesson(
          cleanId,
          levelHint,
          topicTitleHint,
          topicSubtitleHint,
          email,
        );
        setWorkbook(fallback);
        onWorkbookLoaded?.(fallback);
      } catch (err) {
        console.error("[FocusedWorkbookWorkspace] Unexpected load error:", err);
        const fallback = generateFallbackLesson(
          workbookId,
          levelHint,
          topicTitleHint,
          topicSubtitleHint,
          emailOverride,
        );
        setWorkbook(fallback);
        onWorkbookLoaded?.(fallback);
      } finally {
        setLoading(false);
      }
    },
    [workbookId, levelHint, topicTitleHint, topicSubtitleHint, onWorkbookLoaded],
  );

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

  if (loading) {
    return (
      <div className="light-study flex flex-col items-center justify-center rounded-2xl border border-slate-200 bg-white p-12 text-center space-y-4 shadow-sm text-slate-900">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-slate-900 border-t-transparent" />
        <div className="text-sm font-semibold text-slate-800">
          Lade geschütztes GTF Arbeitsheft…
        </div>
        <p className="text-xs text-slate-500">Synchronisiere Lernmaterialien &amp; Audio-Streams</p>
      </div>
    );
  }

  if (error || !workbook) {
    return (
      <div className="light-study mx-auto max-w-xl rounded-2xl border border-red-200 bg-white p-8 text-center space-y-4 shadow-sm text-slate-900">
        <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-xl border border-red-200 bg-red-50 text-red-600">
          <XCircle className="h-6 w-6" />
        </div>
        <div className="space-y-1">
          <h3 className="text-base font-semibold text-slate-900">
            Arbeitsheft nicht verfügbar
          </h3>
          <p className="text-sm text-slate-600">
            {error || "Content not found or still generating."}
          </p>
        </div>
        <div className="flex items-center justify-center gap-3 pt-2">
          <button
            onClick={() => {
              setError(null);
              fetchWorkbook();
            }}
            className="relative z-20 rounded-xl border border-slate-200 bg-slate-50 px-4 py-2 text-xs font-semibold uppercase tracking-wider text-slate-700 hover:bg-slate-100 transition shadow-xs cursor-pointer"
          >
            Erneut versuchen
          </button>
          <Link
            href="/academy"
            className="relative z-20 rounded-xl bg-slate-900 px-4 py-2 text-xs font-semibold uppercase tracking-wider text-white hover:bg-slate-800 transition shadow-sm cursor-pointer"
          >
            Zurück zur Akademie
          </Link>
        </div>
      </div>
    );
  }

  if (!workbook.unlocked) {
    return (
      <div className="light-study mx-auto max-w-2xl rounded-2xl border border-slate-200 bg-white p-8 text-center space-y-5 shadow-sm text-slate-900">
        <AntiPiracyShield
          userEmail={workbook.viewerEmail}
          resourceTitle={`${workbook.title} (${workbook.level.toUpperCase()})`}
        />
        <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl border border-amber-200 bg-amber-50 text-amber-700">
          <Lock className="h-7 w-7" />
        </div>
        <div className="space-y-2">
          <span className="inline-block rounded-full border border-slate-200 bg-slate-100 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-700">
            Level {workbook.level.toUpperCase()} Digital Workbook · {workbook.pages} Pages
          </span>
          <h2 className="text-2xl font-semibold tracking-tight text-slate-900">
            {workbook.title} — {workbook.subtitle}
          </h2>
          <p className="text-sm text-slate-600 leading-relaxed">
            Includes {(workbook.questions || []).length} interactive exercises ({(Array.isArray(workbook.topics) ? workbook.topics : []).join(" · ")})
            with anti-piracy in-app PDF streaming and instant answer-sheet grading.
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
          Questions? Contact Official GTF Support:{" "}
          <a
            href={BRAND.whatsappUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="font-semibold text-emerald-600 hover:underline"
          >
            {BRAND.supportPhone}
          </a>
        </p>
      </div>
    );
  }

  const isListeningWorkbook = Boolean(
    workbook?.audioUrl ||
      workbook?.skill === "hoeren" ||
      workbook?.title?.toLowerCase().includes("hören") ||
      workbook?.id?.toLowerCase().includes("hoeren"),
  );

  const normalizeAudioUrl = (url?: string | null): string => {
    if (!url) return "";
    const trimmed = url.trim();
    if (!trimmed) return "";
    if (/^(https?:\/\/|blob:|data:)/i.test(trimmed)) {
      return trimmed;
    }
    return trimmed.startsWith("/") ? trimmed : `/${trimmed}`;
  };

  const levelLower = (workbook?.level || "b1").toLowerCase();
  const fallbackLocalTrack =
    workbook?.id?.includes("b2-hoeren-02")
      ? "/audio/hoeren/daf_b2_hoeren_02.mp3"
      : workbook?.id?.includes("b2-hoeren") || levelLower === "b2"
      ? "/audio/hoeren/daf_b2_hoeren_01.mp3"
      : workbook?.id?.includes("b1-hoeren-02")
      ? "/audio/hoeren/daf_b1_hoeren_02.mp3"
      : workbook?.id?.includes("b1-hoeren") || workbook?.id?.includes("b1-lab") || levelLower === "b1"
      ? "/audio/hoeren/daf_b1_hoeren_01.mp3"
      : workbook?.id?.includes("a2-hoeren") || levelLower === "a2"
      ? "/audio/hoeren/daf_a2_hoeren_01.mp3"
      : "/audio/hoeren/daf_a1_hoeren_01.mp3";

  const rawWorkbookAudioUrl = workbook?.audioUrl && workbook.audioUrl.trim() !== ""
    ? workbook.audioUrl
    : fallbackLocalTrack;

  const resolvedAudioUrl = normalizeAudioUrl(rawWorkbookAudioUrl);

  const [activeAudioSrc, setActiveAudioSrc] = useState(resolvedAudioUrl);
  const [audioError, setAudioError] = useState(false);
  const [triedFallback, setTriedFallback] = useState(false);

  useEffect(() => {
    setActiveAudioSrc(resolvedAudioUrl);
    setAudioError(false);
    setTriedFallback(false);
  }, [resolvedAudioUrl]);

  const handleAudioError = () => {
    if (!triedFallback && fallbackLocalTrack && activeAudioSrc !== fallbackLocalTrack) {
      console.warn("[FocusedWorkbookWorkspace] Primary audio source failed, attempting local verified fallback:", fallbackLocalTrack);
      setTriedFallback(true);
      setActiveAudioSrc(fallbackLocalTrack);
      setAudioError(false);
    } else {
      setAudioError(true);
    }
  };

  const speakText = (text: string) => {
    if (typeof window === "undefined" || !("speechSynthesis" in window)) return;
    try {
      window.speechSynthesis.cancel();
      const u = new SpeechSynthesisUtterance(text);
      u.lang = "de-DE";
      u.rate = 0.9;
      window.speechSynthesis.speak(u);
    } catch {
      // ignore
    }
  };

  const flashcardsList = Array.isArray(workbook?.flashcards) ? workbook.flashcards : [];
  const currentCard = flashcardsList.length > 0 ? flashcardsList[cardIndex % flashcardsList.length] : null;

  return (
    <div className="light-study space-y-6 select-none text-slate-900">
      <AntiPiracyShield
        userEmail={workbook.viewerEmail}
        resourceTitle={`${workbook.title} (${workbook.level.toUpperCase()})`}
      />

      <div className="grid gap-6 lg:grid-cols-12">
        {/* Left Column: Audio + PDF (or Rich Study Dossier) */}
        <div className="lg:col-span-7 space-y-5">
          {isListeningWorkbook && (
            <div className="rounded-2xl border border-slate-200 bg-white p-4 sm:p-5 text-slate-900 shadow-sm">
              <div className="flex items-center justify-between gap-3 mb-3">
                <div className="flex items-center gap-3 min-w-0">
                  <div className="flex h-9 w-9 items-center justify-center rounded-xl border border-slate-200 bg-slate-100 text-slate-700 shrink-0">
                    <Headphones className="h-4 w-4" />
                  </div>
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] font-semibold uppercase tracking-[0.18em] text-slate-500">
                        Goethe / telc Studio Audio
                      </span>
                      <span className="rounded-full border border-emerald-200 bg-emerald-50 px-2 py-0.5 text-[9px] font-semibold text-emerald-700">
                        128 kbps HD
                      </span>
                    </div>
                    <h3 className="text-xs sm:text-sm font-semibold text-slate-900 truncate">
                      {workbook.title}
                    </h3>
                  </div>
                </div>
                <span className="hidden sm:inline-flex rounded-lg border border-slate-200 bg-slate-100 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wider text-slate-600 shrink-0">
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
                  <div className="mt-2 rounded-lg border border-red-200 bg-red-50 p-2.5 text-xs font-semibold text-red-600 flex items-center gap-1.5">
                    <AlertCircle className="h-4 w-4 shrink-0 text-red-600" />
                    <span>Hinweis: Lokaler Audiotrack wird für diese Übungssitzung bereitgestellt.</span>
                  </div>
                )}
              </div>

              <p className="mt-2.5 text-[11px] text-slate-500 leading-snug">
                <span className="text-amber-700 font-semibold uppercase tracking-wider">
                  PRÜFUNGSHINWEIS ·
                </span>{" "}
                Der Audiotext wird während der Prüfung 1x bis 2x abgespielt. Notieren Sie Ihre Antworten im Antwortblatt rechts.
              </p>
            </div>
          )}

          {/* Conditional: If PDF token exists, render canvas viewer. Otherwise, render Rich Study Dossier */}
          {workbook.pdfToken ? (
            <AntiPiracyPdfViewer
              pdfToken={workbook.pdfToken}
              viewerEmail={workbook.viewerEmail || "demo@gatewaytofuture.com"}
              workbookTitle={`${workbook.title} (${workbook.level.toUpperCase()})`}
              totalPages={workbook.pages}
              currentPage={currentPage}
              onPageChange={setCurrentPage}
            />
          ) : (
            <div className="space-y-5">
              {/* 1. Interactive Flashcard Module */}
              {currentCard && (
                <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm space-y-4">
                  <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                    <div className="flex items-center gap-2">
                      <span className="rounded-md border border-slate-200 bg-slate-100 px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-slate-700">
                        {currentCard.category || "Vokabel"}
                      </span>
                      <span className="text-xs font-semibold text-slate-500">
                        Karte {cardIndex + 1} von {flashcardsList.length}
                      </span>
                    </div>

                    <button
                      type="button"
                      onClick={() => speakText(currentCard.german)}
                      className="relative z-20 rounded-lg border border-slate-200 bg-slate-50 p-1.5 text-slate-700 hover:bg-slate-100 transition shadow-xs cursor-pointer"
                      title="Aussprache anhören"
                    >
                      <Volume2 className="h-4 w-4" />
                    </button>
                  </div>

                  {/* Flippable Card Body */}
                  <div
                    onClick={() => setIsFlipped(!isFlipped)}
                    className="relative z-20 min-h-[170px] rounded-xl border border-slate-200 bg-slate-50/70 p-6 flex flex-col justify-center items-center text-center cursor-pointer transition-all duration-300 hover:shadow-md hover:bg-white"
                  >
                    {!isFlipped ? (
                      <div className="space-y-2">
                        <span className="text-[10px] font-semibold uppercase tracking-widest text-slate-400">
                          DEUTSCH · TIPPE ZUM WENDEN
                        </span>
                        <h4 className="text-2xl sm:text-3xl font-bold tracking-tight text-slate-900">
                          {currentCard.german}
                        </h4>
                        {currentCard.phonetic && (
                          <p className="font-mono text-xs text-slate-500">
                            [{currentCard.phonetic}]
                          </p>
                        )}
                        <p className="text-xs text-slate-600 italic pt-1">
                          &ldquo;{currentCard.exampleDe}&rdquo;
                        </p>
                      </div>
                    ) : (
                      <div className="space-y-2">
                        <span className="text-[10px] font-semibold uppercase tracking-widest text-slate-400">
                          BEDEUTUNG &amp; HINWEISE
                        </span>
                        <h4 className="text-xl sm:text-2xl font-bold text-slate-900">
                          {currentCard.english}
                        </h4>
                        {currentCard.hindi && (
                          <p className="text-sm font-semibold text-emerald-700">
                            {currentCard.hindi}
                          </p>
                        )}
                        <p className="text-xs text-slate-600 italic">
                          {currentCard.exampleTranslation}
                        </p>
                        {currentCard.grammarTip && (
                          <div className="rounded-lg bg-amber-50 border border-amber-200 px-3 py-1 text-[11px] text-amber-800 font-medium mt-2">
                            💡 {currentCard.grammarTip}
                          </div>
                        )}
                      </div>
                    )}
                  </div>

                  {/* Flashcard Navigation Buttons */}
                  <div className="flex items-center justify-between pt-1">
                    <button
                      type="button"
                      onClick={() => {
                        setIsFlipped(false);
                        setCardIndex((prev) => (prev > 0 ? prev - 1 : flashcardsList.length - 1));
                      }}
                      className="relative z-20 inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3.5 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 transition shadow-xs cursor-pointer"
                    >
                      <ChevronLeft className="h-4 w-4" />
                      <span>Zurück</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => setIsFlipped(!isFlipped)}
                      className="relative z-20 inline-flex items-center gap-1.5 rounded-xl border border-slate-300 bg-slate-100 px-4 py-2 text-xs font-semibold text-slate-800 hover:bg-slate-200 transition shadow-xs cursor-pointer"
                    >
                      <RotateCw className="h-3.5 w-3.5" />
                      <span>{isFlipped ? "Vorderseite" : "Umdrehen"}</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        setIsFlipped(false);
                        setCardIndex((prev) => (prev + 1) % flashcardsList.length);
                      }}
                      className="relative z-20 inline-flex items-center gap-1.5 rounded-xl bg-slate-900 px-4 py-2 text-xs font-semibold text-white hover:bg-slate-800 transition shadow-sm cursor-pointer"
                    >
                      <span>Weiter</span>
                      <ChevronRight className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              )}

              {/* 2. Reading / Listening Passage */}
              {workbook.readingPassage && (
                <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm space-y-3">
                  <div className="flex items-center gap-2 border-b border-slate-100 pb-3">
                    <BookOpen className="h-4 w-4 text-slate-700" />
                    <span className="text-xs font-bold uppercase tracking-wider text-slate-800">
                      Lesetext / Dialogmanuskript
                    </span>
                  </div>
                  <p className="text-sm text-slate-700 leading-relaxed whitespace-pre-line font-normal">
                    {workbook.readingPassage}
                  </p>
                </div>
              )}

              {/* 3. Grammar Blueprint & Exam Pro-Tips */}
              {workbook.grammarNotes && (
                <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm space-y-4">
                  <div className="flex items-center gap-2 border-b border-slate-100 pb-3">
                    <Sparkles className="h-4 w-4 text-amber-600" />
                    <span className="text-xs font-bold uppercase tracking-wider text-slate-800">
                      Grammatik-Blueprint &amp; Prüfungsregeln
                    </span>
                  </div>

                  <p className="text-xs text-slate-700 leading-relaxed font-medium">
                    {workbook.grammarNotes.rule}
                  </p>

                  <div className="rounded-xl border border-amber-200 bg-amber-50/70 p-4 space-y-1.5">
                    <span className="text-[10px] font-bold uppercase tracking-widest text-amber-800">
                      ⚡ GOETHE / TELC PRO-TIPP
                    </span>
                    <p className="text-xs text-amber-900 leading-relaxed">
                      {workbook.grammarNotes.proTip}
                    </p>
                  </div>

                  {Array.isArray(workbook.grammarNotes.examples) &&
                    workbook.grammarNotes.examples.length > 0 && (
                      <div className="space-y-1.5 pt-1">
                        <span className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">
                          Musterbeispiele:
                        </span>
                        <ul className="list-disc list-inside text-xs text-slate-600 space-y-1">
                          {workbook.grammarNotes.examples.map((ex, idx) => (
                            <li key={idx}>{ex}</li>
                          ))}
                        </ul>
                      </div>
                    )}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Right Column: Interactive Answer Sheet */}
        <div className="lg:col-span-5 space-y-4">
          <div className="rounded-2xl border border-slate-200 bg-white p-5 space-y-4 shadow-sm">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div>
                <span className="text-[10px] font-semibold uppercase tracking-[0.18em] text-slate-500">
                  Interactive Answer Sheet
                </span>
                <h2 className="text-base font-semibold text-slate-900 german-headline">
                  Antwortblatt ({(workbook.questions || []).length} Aufgaben)
                </h2>
              </div>

              {graded && (
                <span className="rounded-xl border border-emerald-300 bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-700">
                  Score: {graded.score}/{graded.total} ({graded.percent}%)
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
                      <span className="font-semibold text-slate-900">{q.label}</span>
                      <span className="text-[10px] font-medium text-slate-500">
                        Teil {q.page || 1}
                      </span>
                    </div>

                    <p className="mt-1.5 text-xs font-medium text-slate-800">{q.prompt}</p>

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
                              <span className="mr-2 uppercase font-mono">{opt.id})</span>
                              {opt.text}
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
                              {u}
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
                      <div className="mt-2.5 rounded-lg border border-slate-200 bg-white p-2.5 text-[11px] space-y-1 shadow-xs">
                        <div className="flex items-center gap-1.5 font-semibold">
                          {gradedItem.isCorrect ? (
                            <span className="inline-flex items-center gap-1 text-emerald-700">
                              <CheckCircle2 className="h-3.5 w-3.5" /> Richtig!
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 text-amber-700">
                              <XCircle className="h-3.5 w-3.5" /> Lösung: {gradedItem.correctAnswer}
                            </span>
                          )}
                        </div>
                        {gradedItem.explanation && (
                          <p className="text-slate-600 german-reading leading-relaxed">
                            {gradedItem.explanation}
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
              <span>{grading ? "Prüfe Antworten…" : "Antwortblatt jetzt auswerten"}</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
