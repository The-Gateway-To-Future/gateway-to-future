"use client";

import { useCallback, useEffect, useState } from "react";
import {
  AlertCircle,
  CheckCircle2,
  ExternalLink,
  Headphones,
  Lock,
  Sparkles,
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
  onWorkbookLoaded?: (wb: WorkbookClientView) => void;
}

export function FocusedWorkbookWorkspace({
  workbookId,
  onWorkbookLoaded,
}: FocusedWorkbookWorkspaceProps) {
  const [workbook, setWorkbook] = useState<WorkbookClientView | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [graded, setGraded] = useState<GradedWorkbookResponse | null>(null);
  const [grading, setGrading] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const storageKey = `gtf_wb_answers_${workbookId}`;

  const fetchWorkbook = useCallback(
    async (emailOverride?: string) => {
      setLoading(true);
      setError(null);
      try {
        const email = emailOverride || getActiveUserEmail();
        const cleanId = decodeURIComponent(workbookId).trim();

        // 1. Immediate local load from Core Labs repository (0ms delay)
        const coreLab = getCoreLabById(cleanId);
        let loadedLocally = false;
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
          loadedLocally = true;
          setLoading(false);
        }

        // 2. Primary: Server API route
        try {
          const res = await fetch(
            `/api/workbooks/${encodeURIComponent(cleanId)}?email=${encodeURIComponent(email)}`,
          );
          if (res.ok) {
            const data = (await res.json()) as { workbook?: WorkbookClientView };
            if (data?.workbook) {
              setWorkbook(data.workbook);
              onWorkbookLoaded?.(data.workbook);
              return;
            }
          }
        } catch (apiErr) {
          console.warn("[FocusedWorkbookWorkspace] API fetch error:", apiErr);
        }

        // 3. Client-side Firestore fallback: Check 'materials' & 'workbooks'
        try {
          const db = getFirebaseFirestore();
          // Check materials collection (16EmployerFactory)
          const matRef = doc(db, "materials", cleanId);
          const matSnap = await getDoc(matRef);
          if (matSnap.exists()) {
            const d = matSnap.data();
            const clientWb: WorkbookClientView = {
              id: cleanId,
              title: d.title || cleanId,
              subtitle: d.subtitle || "",
              level: d.level || "b1",
              pages: d.pages || 1,
              topics: Array.isArray(d.topics) ? d.topics : [],
              questions: Array.isArray(d.questions) ? d.questions : [],
              unlocked: true,
              viewerEmail: email,
              productSlug: d.productSlug || cleanId,
              audioUrl: d.audioUrl || undefined,
              isFree: true,
              coverColor: d.coverColor || "#0F172A",
              priceEur: typeof d.priceEur === "number" ? d.priceEur : 0,
              priceInr: typeof d.priceInr === "number" ? d.priceInr : 0,
            };
            setWorkbook(clientWb);
            onWorkbookLoaded?.(clientWb);
            return;
          }

          // Check workbooks collection
          const wbRef = doc(db, "workbooks", cleanId);
          const wbSnap = await getDoc(wbRef);
          if (wbSnap.exists()) {
            const d = wbSnap.data();
            const clientWb: WorkbookClientView = {
              id: cleanId,
              title: d.title || cleanId,
              subtitle: d.subtitle || "",
              level: d.level || "b1",
              pages: d.pages || 1,
              topics: Array.isArray(d.topics) ? d.topics : [],
              questions: Array.isArray(d.questions) ? d.questions : [],
              unlocked: true,
              viewerEmail: email,
              productSlug: d.productSlug || cleanId,
              audioUrl: d.audioUrl || undefined,
              isFree: true,
              coverColor: d.coverColor || "#0F172A",
              priceEur: typeof d.priceEur === "number" ? d.priceEur : 0,
              priceInr: typeof d.priceInr === "number" ? d.priceInr : 0,
            };
            setWorkbook(clientWb);
            onWorkbookLoaded?.(clientWb);
            return;
          }
        } catch (fsErr) {
          console.warn("[FocusedWorkbookWorkspace] Firestore fallback failed:", fsErr);
        }

        // If loaded from local Core Labs repository, retain it without error
        if (loadedLocally) {
          return;
        }

        // Neither server API, Firestore, nor Core Labs contained this document
        setError("Content not found or still generating.");
      } catch (err) {
        console.error("[FocusedWorkbookWorkspace] Unexpected load error:", err);
        setError("Content not found or still generating.");
      } finally {
        setLoading(false);
      }
    },
    [workbookId, onWorkbookLoaded],
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
      const res = await fetch(`/api/workbooks/${encodeURIComponent(workbookId)}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ answers }),
      });
      if (res.ok) {
        const data = (await res.json()) as GradedWorkbookResponse;
        setGraded(data);
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
            className="relative z-10 rounded-xl border border-slate-200 bg-slate-50 px-4 py-2 text-xs font-semibold uppercase tracking-wider text-slate-700 hover:bg-slate-100 transition shadow-xs cursor-pointer"
          >
            Erneut versuchen
          </button>
          <Link
            href="/academy"
            className="relative z-10 rounded-xl bg-slate-900 px-4 py-2 text-xs font-semibold uppercase tracking-wider text-white hover:bg-slate-800 transition shadow-sm"
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
            className="relative z-10 inline-flex items-center gap-2 rounded-xl bg-slate-900 px-6 py-3 text-xs font-semibold uppercase tracking-[0.16em] text-white transition hover:bg-slate-800 shadow-sm"
          >
            <span>Unlock with GTF Pro (€50 / mo)</span>
          </Link>

          <a
            href={BRAND.whatsappUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="relative z-10 inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-5 py-3 text-xs font-semibold uppercase tracking-[0.14em] text-slate-700 hover:bg-slate-50 transition shadow-xs"
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

  return (
    <div className="light-study space-y-6 select-none text-slate-900">
      <AntiPiracyShield
        userEmail={workbook.viewerEmail}
        resourceTitle={`${workbook.title} (${workbook.level.toUpperCase()})`}
      />

      <div className="grid gap-6 lg:grid-cols-12">
        <div className="lg:col-span-7 space-y-4">
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
                    <span>Error: Audio file could not be loaded or is missing.</span>
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

          <AntiPiracyPdfViewer
            pdfToken={workbook.pdfToken}
            viewerEmail={workbook.viewerEmail || "demo@gatewaytofuture.com"}
            workbookTitle={`${workbook.title} (${workbook.level.toUpperCase()})`}
            totalPages={workbook.pages}
            currentPage={currentPage}
            onPageChange={setCurrentPage}
          />
        </div>

        {/* Interactive Answer Sheet Sidebar */}
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

            <div className="max-h-[540px] space-y-3.5 overflow-y-auto pr-1">
              {(Array.isArray(workbook.questions) ? workbook.questions : []).map((q) => {
                const val = answers[q.id] || "";
                const gradedItem = graded?.items.find((it) => it.id === q.id);

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
                      <button
                        type="button"
                        onClick={() => setCurrentPage(q.page)}
                        className="relative z-10 rounded-lg border border-slate-200 bg-white px-2 py-0.5 text-[10px] font-semibold text-slate-600 hover:text-slate-900 hover:bg-slate-100 transition shadow-xs cursor-pointer"
                      >
                        Seite {q.page} anzeigen
                      </button>
                    </div>

                    <p className="mt-1.5 text-xs font-medium text-slate-800">{q.prompt}</p>

                    {q.type === "mcq" && Array.isArray(q.options) && q.options.length > 0 ? (
                      <div className="mt-2.5 grid grid-cols-3 gap-2">
                        {q.options.map((opt) => {
                          const active = val === opt.id;
                          return (
                            <button
                              key={opt.id}
                              type="button"
                              onClick={() => setAnswer(q.id, opt.id)}
                              className={`relative z-10 rounded-lg border px-2.5 py-2 text-xs font-semibold transition cursor-pointer ${
                                active
                                  ? "border-slate-900 bg-slate-900 text-white shadow-xs"
                                  : "border-slate-200 bg-white text-slate-700 hover:bg-slate-100 hover:text-slate-900 shadow-xs"
                              }`}
                            >
                              {opt.id.toUpperCase()}) {opt.text}
                            </button>
                          );
                        })}
                      </div>
                    ) : (
                      <div className="mt-2.5 space-y-1.5">
                        <div className="flex items-center gap-1">
                          {MINI_UMLAUTS.map((u) => (
                            <button
                              key={u}
                              type="button"
                              onClick={() => setAnswer(q.id, val + u)}
                              className="relative z-10 rounded border border-slate-200 bg-white px-2 py-0.5 font-mono text-xs font-semibold text-slate-700 hover:bg-slate-900 hover:text-white transition shadow-xs cursor-pointer"
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
              className="relative z-10 flex w-full items-center justify-center gap-2 rounded-xl bg-slate-900 py-3 text-xs font-semibold uppercase tracking-[0.16em] text-white transition hover:bg-slate-800 shadow-sm disabled:opacity-50 cursor-pointer"
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
