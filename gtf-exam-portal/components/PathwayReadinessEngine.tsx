"use client";

import React, { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  ArrowRight,
  Calculator,
  Check,
  CheckCircle2,
  Cloud,
  Compass,
  FileCheck2,
  GraduationCap,
  HardDrive,
  ShieldCheck,
  Sparkles,
  Stethoscope,
  Briefcase,
} from "lucide-react";
import { WebOnly } from "@/components/ReaderAppNotice";
import { useAuth } from "@/lib/auth-context";
import { loadExamState, type StoredExamState } from "@/lib/client-storage";
import { BRAND } from "@/lib/config";
import {
  getUserProgressWithStatus,
  resolveProgressUid,
  updateUserProgressWithStatus,
  USER_PROGRESS_EVENT,
  type UserProgress,
} from "@/lib/firebase/progress";
import {
  computeMistakeRadar,
  loadMistakeDna,
  MISTAKE_DNA_EVENT,
  type MistakeRadarSummary,
} from "@/lib/mistake-dna/store";
import {
  applyTrackSelectionToSteps,
  computePathwayReadiness,
  computeSperrkontoGap,
  PATHWAY_TRACKS,
  resolveActivePathwayTrack,
  type PathwayTrackId,
} from "@/lib/pathway-readiness";

const TRACK_ICONS: Record<PathwayTrackId, typeof GraduationCap> = {
  studienkolleg_uni: GraduationCap,
  ausbildung_dual: Briefcase,
  pflege_medizin: Stethoscope,
};

export interface PathwayReadinessEngineProps {
  mode?: "full" | "compact";
}

export function PathwayReadinessEngine({ mode = "full" }: PathwayReadinessEngineProps) {
  const { user } = useAuth();
  const uid = useMemo(() => resolveProgressUid(user), [user]);

  const [progress, setProgress] = useState<UserProgress | null>(null);
  const [syncedToCloud, setSyncedToCloud] = useState<boolean>(false);
  const [savingMilestone, setSavingMilestone] = useState<string | null>(null);
  const [mistakeRadar, setMistakeRadar] = useState<MistakeRadarSummary | null>(null);
  const [examStates, setExamStates] = useState<
    Partial<Record<"a1" | "a2" | "b1" | "b2", StoredExamState | null>>
  >({});

  // Financial Gap Calculator inputs
  const [monthlyStipendEur, setMonthlyStipendEur] = useState<number>(1050);
  const [currentSavingsEur, setCurrentSavingsEur] = useState<number>(4000);

  useEffect(() => {
    let active = true;

    getUserProgressWithStatus(uid).then((res) => {
      if (!active) return;
      setProgress(res.progress);
      setSyncedToCloud(res.syncedToCloud);
    });

    loadMistakeDna(uid).then((res) => {
      if (!active) return;
      setMistakeRadar(computeMistakeRadar(res.records));
    });

    setExamStates({
      a1: loadExamState("a1"),
      a2: loadExamState("a2"),
      b1: loadExamState("b1"),
      b2: loadExamState("b2"),
    });

    const onProgress = (ev: Event) => {
      const detail = (ev as CustomEvent<UserProgress>).detail;
      if (detail && detail.uid === uid) {
        setProgress(detail);
      }
    };
    const onMistake = () => {
      loadMistakeDna(uid).then((res) => {
        if (active) setMistakeRadar(computeMistakeRadar(res.records));
      });
    };

    window.addEventListener(USER_PROGRESS_EVENT, onProgress);
    window.addEventListener(MISTAKE_DNA_EVENT, onMistake);
    return () => {
      active = false;
      window.removeEventListener(USER_PROGRESS_EVENT, onProgress);
      window.removeEventListener(MISTAKE_DNA_EVENT, onMistake);
    };
  }, [uid]);

  const completedSteps = progress?.completedSteps || [];
  const activeTrackId = useMemo(
    () => resolveActivePathwayTrack(completedSteps, user?.course),
    [completedSteps, user?.course],
  );

  // Set sensible default stipend when switching between Nursing vs Dual Ausbildung
  useEffect(() => {
    if (activeTrackId === "pflege_medizin") {
      setMonthlyStipendEur(1490);
    } else if (activeTrackId === "ausbildung_dual") {
      setMonthlyStipendEur(1050);
    }
  }, [activeTrackId]);

  const readiness = useMemo(
    () =>
      computePathwayReadiness({
        trackId: activeTrackId,
        completedSteps,
        masteredFlashcardsCount: progress?.masteredFlashcards?.length || 0,
        currentStreak: progress?.currentStreak || 1,
        mistakeRadar,
        examStates,
      }),
    [activeTrackId, completedSteps, progress, mistakeRadar, examStates],
  );

  const sperrkonto = useMemo(
    () =>
      computeSperrkontoGap({
        trackId: activeTrackId,
        monthlyStipendEur,
        currentSavingsEur,
      }),
    [activeTrackId, monthlyStipendEur, currentSavingsEur],
  );

  const handleSelectTrack = async (nextTrack: PathwayTrackId) => {
    const nextSteps = applyTrackSelectionToSteps(completedSteps, nextTrack);
    setProgress((prev) =>
      prev
        ? { ...prev, completedSteps: nextSteps }
        : {
            uid,
            completedSteps: nextSteps,
            masteredFlashcards: [],
            lastLoginDate: new Date().toISOString().slice(0, 10),
            currentStreak: 1,
          },
    );
    const res = await updateUserProgressWithStatus(uid, { completedSteps: nextSteps });
    setProgress(res.progress);
    setSyncedToCloud(res.syncedToCloud);
  };

  const handleToggleMilestone = async (stepId: string) => {
    setSavingMilestone(stepId);
    const exists = completedSteps.includes(stepId);
    const nextSteps = exists
      ? completedSteps.filter((s) => s !== stepId)
      : [...completedSteps, stepId];

    setProgress((prev) =>
      prev
        ? { ...prev, completedSteps: nextSteps }
        : {
            uid,
            completedSteps: nextSteps,
            masteredFlashcards: [],
            lastLoginDate: new Date().toISOString().slice(0, 10),
            currentStreak: 1,
          },
    );
    try {
      const res = await updateUserProgressWithStatus(uid, { completedSteps: nextSteps });
      setProgress(res.progress);
      setSyncedToCloud(res.syncedToCloud);
    } finally {
      setSavingMilestone(null);
    }
  };

  /* ══════════════════ COMPACT DASHBOARD BANNER MODE ══════════════════ */
  if (mode === "compact") {
    const topAction = readiness.nextActions[0];
    return (
      <section className="mx-auto max-w-6xl px-4 sm:px-8 pt-6">
        <div className="rounded-3xl border border-slate-200 bg-white p-5 sm:p-6 shadow-xs flex flex-col lg:flex-row lg:items-center justify-between gap-5">
          <div className="flex items-start sm:items-center gap-4 min-w-0">
            <div className="flex h-14 w-14 shrink-0 flex-col items-center justify-center rounded-2xl bg-slate-900 text-white shadow-xs">
              <span className="text-lg font-extrabold leading-none">{readiness.totalScore}</span>
              <span className="text-[9px] font-bold uppercase tracking-widest text-slate-300 mt-0.5">
                / 100
              </span>
            </div>
            <div className="min-w-0 space-y-1">
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-indigo-700">
                  GERMANY PATHWAY READINESS
                </span>
                <span className="rounded-full border border-slate-200 bg-slate-100 px-2.5 py-0.5 text-[10px] font-bold text-slate-700">
                  {readiness.track.shortLabel}
                </span>
                <span className="rounded-full border border-emerald-200 bg-emerald-50 px-2.5 py-0.5 text-[10px] font-bold text-emerald-800">
                  {readiness.readinessBand}
                </span>
              </div>
              <h2 className="text-base sm:text-lg font-bold text-slate-900 truncate">
                {topAction
                  ? `Next Action: ${topAction.title}`
                  : `${readiness.pillars.regulatoryDossier.completed}/${readiness.pillars.regulatoryDossier.total} Visa & Regulatory Milestones Verified`}
              </h2>
              <p className="text-xs text-slate-600 line-clamp-1">
                CEFR &amp; Exams: {readiness.pillars.cefrAndExams.score}/40 · Mistake-DNA:{" "}
                {readiness.pillars.linguisticPrecision.score}/15 · Dossier:{" "}
                {readiness.pillars.regulatoryDossier.score}/30 · Track:{" "}
                {readiness.pillars.trackSpecialization.score}/15
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2.5 shrink-0">
            {topAction && (
              <Link
                href={topAction.href}
                className="inline-flex items-center gap-1.5 rounded-xl bg-slate-900 px-4 py-2.5 text-xs font-bold text-white hover:bg-slate-800 transition"
              >
                <span>{topAction.ctaLabel}</span>
                <ArrowRight className="h-3.5 w-3.5" />
              </Link>
            )}
            <Link
              href="/pathways"
              className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-slate-50 px-4 py-2.5 text-xs font-bold text-slate-800 hover:bg-slate-100 transition"
            >
              <Compass className="h-3.5 w-3.5 text-indigo-600" />
              <span>Open Full Readiness Plan</span>
            </Link>
          </div>
        </div>
      </section>
    );
  }

  /* ══════════════════ FULL ACTION ENGINE MODE (/pathways) ══════════════════ */
  const completedSet = new Set(completedSteps);

  return (
    <section className="mx-auto max-w-6xl px-4 sm:px-8 pt-10 pb-4 space-y-8">
      {/* 1. Pathway Track Selector + Cloud Sync Status */}
      <div className="rounded-3xl border border-slate-200 bg-white p-5 sm:p-8 shadow-sm space-y-6">
        <div className="flex flex-wrap items-start justify-between gap-4 border-b border-slate-100 pb-5">
          <div className="space-y-1">
            <p className="text-[11px] font-bold uppercase tracking-[0.22em] text-indigo-700">
              LIVE ACTION ENGINE · § 16b / § 16a / § 16d / § 81a AUFENTHG
            </p>
            <h2 className="text-2xl sm:text-3xl font-bold tracking-tight text-slate-900">
              Unified Germany Pathway Readiness Score
            </h2>
            <p className="text-xs sm:text-sm text-slate-600 max-w-2xl">
              Connects your live Academy CEFR progress, proctored Modelltests, Mistake-DNA precision, and statutory German embassy dossier into one 0–100 action score.
            </p>
          </div>

          <span
            className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-[11px] font-bold ${
              syncedToCloud
                ? "border-emerald-200 bg-emerald-50 text-emerald-800"
                : "border-slate-200 bg-slate-100 text-slate-700"
            }`}
          >
            {syncedToCloud ? (
              <>
                <Cloud className="h-3.5 w-3.5 text-emerald-600" />
                <span>Firestore Cloud Synced</span>
              </>
            ) : (
              <>
                <HardDrive className="h-3.5 w-3.5 text-slate-500" />
                <span>Saved Locally</span>
              </>
            )}
          </span>
        </div>

        {/* 3 Target Track Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          {(Object.keys(PATHWAY_TRACKS) as PathwayTrackId[]).map((tid) => {
            const t = PATHWAY_TRACKS[tid];
            const Icon = TRACK_ICONS[tid];
            const active = tid === activeTrackId;
            return (
              <button
                key={tid}
                type="button"
                onClick={() => handleSelectTrack(tid)}
                className={`text-left rounded-2xl border p-4 transition cursor-pointer ${
                  active
                    ? "border-slate-900 bg-slate-900 text-white shadow-sm"
                    : "border-slate-200 bg-slate-50/70 text-slate-900 hover:border-slate-300 hover:bg-white"
                }`}
              >
                <div className="flex items-center justify-between gap-2 mb-2">
                  <span
                    className={`inline-flex h-8 w-8 items-center justify-center rounded-xl border ${
                      active
                        ? "border-white/20 bg-white/10 text-amber-300"
                        : "border-slate-200 bg-white text-indigo-700"
                    }`}
                  >
                    <Icon className="h-4 w-4" />
                  </span>
                  <span
                    className={`rounded-full px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider ${
                      active
                        ? "bg-emerald-400/20 text-emerald-200 border border-emerald-400/30"
                        : "bg-white text-slate-600 border border-slate-200"
                    }`}
                  >
                    Target {t.targetCefr}
                  </span>
                </div>
                <p className="text-sm font-bold">{t.shortLabel}</p>
                <p
                  className={`text-[11px] mt-1 leading-relaxed ${
                    active ? "text-slate-300" : "text-slate-600"
                  }`}
                >
                  {t.legalBasis}
                </p>
              </button>
            );
          })}
        </div>

        {/* Score Ring + 4-Pillar Breakdown */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-center rounded-2xl border border-slate-200 bg-slate-50/80 p-5 sm:p-6">
          <div className="lg:col-span-4 flex items-center gap-5">
            <div className="relative flex h-24 w-24 shrink-0 flex-col items-center justify-center rounded-3xl bg-slate-900 text-white shadow-md">
              <span className="text-3xl font-black tracking-tight">{readiness.totalScore}</span>
              <span className="text-[10px] font-bold uppercase tracking-widest text-slate-300">
                of 100
              </span>
            </div>
            <div className="space-y-1.5">
              <span className="inline-flex items-center gap-1 rounded-full border border-emerald-200 bg-emerald-50 px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider text-emerald-800">
                <ShieldCheck className="h-3 w-3" />
                <span>{readiness.readinessBand}</span>
              </span>
              <h3 className="text-base font-bold text-slate-900">{readiness.track.title}</h3>
              <p className="text-xs text-slate-600 leading-relaxed">{readiness.track.summary}</p>
            </div>
          </div>

          <div className="lg:col-span-8 grid grid-cols-1 sm:grid-cols-2 gap-3.5">
            {[
              {
                label: "1. German CEFR & Proctor Exams",
                score: readiness.pillars.cefrAndExams.score,
                max: readiness.pillars.cefrAndExams.max,
                detail: readiness.pillars.cefrAndExams.detail,
                barClass: "bg-indigo-600",
              },
              {
                label: "2. Regulatory & Visa Dossier",
                score: readiness.pillars.regulatoryDossier.score,
                max: readiness.pillars.regulatoryDossier.max,
                detail: readiness.pillars.regulatoryDossier.detail,
                barClass: "bg-emerald-600",
              },
              {
                label: "3. Mistake-DNA Precision",
                score: readiness.pillars.linguisticPrecision.score,
                max: readiness.pillars.linguisticPrecision.max,
                detail: readiness.pillars.linguisticPrecision.detail,
                barClass: "bg-amber-500",
              },
              {
                label: "4. Track Specialization",
                score: readiness.pillars.trackSpecialization.score,
                max: readiness.pillars.trackSpecialization.max,
                detail: readiness.pillars.trackSpecialization.detail,
                barClass: "bg-slate-800",
              },
            ].map((p) => {
              const pct = Math.round((p.score / p.max) * 100);
              return (
                <div
                  key={p.label}
                  className="rounded-xl border border-slate-200 bg-white p-3.5 space-y-2"
                >
                  <div className="flex items-center justify-between gap-2 text-xs font-bold text-slate-900">
                    <span>{p.label}</span>
                    <span className="font-mono">
                      {p.score}/{p.max} pts
                    </span>
                  </div>
                  <div className="h-2 w-full rounded-full bg-slate-100 overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all ${p.barClass}`}
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                  <p className="text-[11px] text-slate-500 leading-snug">{p.detail}</p>
                </div>
              );
            })}
          </div>
        </div>

        {/* Top 3 Highest-Leverage Next Actions */}
        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-amber-600" />
            <h3 className="text-xs font-bold uppercase tracking-[0.18em] text-slate-800">
              Top 3 Next Actions to Boost Your Readiness Score
            </h3>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {readiness.nextActions.map((act) => (
              <div
                key={act.id}
                className="rounded-2xl border border-slate-200 bg-white p-4 flex flex-col justify-between gap-3 shadow-2xs"
              >
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-indigo-700">
                      {act.priorityBadge}
                    </span>
                    <span className="rounded-full bg-emerald-50 border border-emerald-200 px-2 py-0.5 text-[10px] font-bold text-emerald-800">
                      +{act.impactPoints} pts
                    </span>
                  </div>
                  <h4 className="text-sm font-bold text-slate-900">{act.title}</h4>
                  <p className="text-xs text-slate-600 leading-relaxed">{act.reason}</p>
                </div>
                <Link
                  href={act.href}
                  className="inline-flex items-center justify-between rounded-xl bg-slate-900 px-3.5 py-2 text-xs font-bold text-white hover:bg-slate-800 transition"
                >
                  <span>{act.ctaLabel}</span>
                  <ArrowRight className="h-3.5 w-3.5" />
                </Link>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* 2. Interactive 8-Step Regulatory Checklist + 2026 Sperrkonto Calculator */}
      <div
        id="dossier-checklist"
        className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start"
      >
        {/* Left 7 cols: Cloud-Synced Regulatory Dossier Checklist */}
        <div className="lg:col-span-7 rounded-3xl border border-slate-200 bg-white p-5 sm:p-6 shadow-sm space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 pb-3.5">
            <div>
              <span className="text-[10px] font-bold uppercase tracking-[0.18em] text-slate-500">
                CLOUD-SYNCED REGULATORY DOSSIER
              </span>
              <h3 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                <FileCheck2 className="h-5 w-5 text-emerald-600" />
                <span>{readiness.track.shortLabel} — 8 Mandatory Milestones</span>
              </h3>
            </div>
            <span className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-xs font-bold text-slate-800">
              {readiness.pillars.regulatoryDossier.completed} /{" "}
              {readiness.pillars.regulatoryDossier.total} Verified
            </span>
          </div>

          <div className="space-y-2.5">
            {readiness.track.milestones.map((m, idx) => {
              const checked = completedSet.has(m.stepId);
              const busy = savingMilestone === m.stepId;
              return (
                <div
                  key={m.id}
                  className={`rounded-2xl border p-3.5 transition ${
                    checked
                      ? "border-emerald-300 bg-emerald-50/50"
                      : "border-slate-200 bg-slate-50/50 hover:bg-white"
                  }`}
                >
                  <div className="flex items-start gap-3">
                    <button
                      type="button"
                      disabled={busy}
                      onClick={() => handleToggleMilestone(m.stepId)}
                      aria-label={`Toggle ${m.title}`}
                      className={`mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-lg border transition cursor-pointer ${
                        checked
                          ? "border-emerald-600 bg-emerald-600 text-white"
                          : "border-slate-300 bg-white text-transparent hover:border-slate-500"
                      }`}
                    >
                      <Check className="h-3.5 w-3.5" />
                    </button>

                    <div className="flex-1 min-w-0 space-y-1">
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <span className="text-xs sm:text-sm font-bold text-slate-900">
                          {idx + 1}. {m.title}
                        </span>
                        <span className="rounded-md border border-slate-200 bg-white px-2 py-0.5 text-[10px] font-semibold text-slate-600">
                          {m.divisionCode} · {m.authority}
                        </span>
                      </div>
                      <p className="text-xs text-slate-600 leading-relaxed">{m.subtitle}</p>
                      {m.actionHref && m.actionLabel && (
                        <Link
                          href={m.actionHref}
                          className="inline-flex items-center gap-1 pt-1 text-[11px] font-bold text-indigo-700 hover:text-indigo-900"
                        >
                          <span>{m.actionLabel}</span>
                          <ArrowRight className="h-3 w-3" />
                        </Link>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Right 5 cols: 2026 Sperrkonto / § 16a Stipend Gap Calculator + Founder Mentorship */}
        <div className="lg:col-span-5 space-y-6">
          <div className="rounded-3xl border border-slate-200 bg-white p-5 sm:p-6 shadow-sm space-y-4">
            <div className="border-b border-slate-100 pb-3">
              <span className="text-[10px] font-bold uppercase tracking-[0.18em] text-amber-700">
                DIV-02 · STATUTORY LIVELIHOOD CALCULATOR (2026)
              </span>
              <h3 className="text-lg font-bold text-slate-900 flex items-center gap-2 mt-0.5">
                <Calculator className="h-5 w-5 text-indigo-600" />
                <span>Sperrkonto &amp; Stipend Gap Check</span>
              </h3>
            </div>

            {activeTrackId !== "studienkolleg_uni" && (
              <div className="space-y-1.5">
                <label className="block text-xs font-bold text-slate-700">
                  Gross Monthly Contract Stipend (€ / Month)
                </label>
                <input
                  type="number"
                  min={0}
                  max={5000}
                  step={25}
                  value={monthlyStipendEur}
                  onChange={(e) => setMonthlyStipendEur(Number(e.target.value) || 0)}
                  className="w-full rounded-xl border border-slate-300 bg-slate-50 px-3.5 py-2 text-sm font-bold text-slate-900 focus:border-slate-900 focus:bg-white focus:outline-none"
                />
                <p className="text-[11px] text-slate-500">
                  Benchmark: €1,091/mo (§ 16a AufenthG). Public Hospital Nursing TVAöD pays ~€1,490/mo Year 1.
                </p>
              </div>
            )}

            <div className="space-y-1.5">
              <label className="block text-xs font-bold text-slate-700">
                Liquid Blocked-Account Savings Ready (€ EUR)
              </label>
              <input
                type="number"
                min={0}
                max={50000}
                step={250}
                value={currentSavingsEur}
                onChange={(e) => setCurrentSavingsEur(Number(e.target.value) || 0)}
                className="w-full rounded-xl border border-slate-300 bg-slate-50 px-3.5 py-2 text-sm font-bold text-slate-900 focus:border-slate-900 focus:bg-white focus:outline-none"
              />
            </div>

            <div
              className={`rounded-2xl border p-4 space-y-2 ${
                sperrkonto.fullyCovered
                  ? "border-emerald-300 bg-emerald-50/80 text-emerald-950"
                  : "border-amber-300 bg-amber-50/80 text-amber-950"
              }`}
            >
              <div className="flex items-center justify-between text-xs font-bold">
                <span>12-Month Blocked Top-Up Required:</span>
                <span className="font-mono text-sm">
                  €{sperrkonto.requiredBlockedTopUpEur.toLocaleString("en-IN")}
                </span>
              </div>
              <div className="flex items-center justify-between text-xs font-bold">
                <span>Remaining Savings Gap:</span>
                <span className="font-mono text-sm">
                  €{sperrkonto.netGapAfterSavingsEur.toLocaleString("en-IN")} (≈ ₹
                  {sperrkonto.estimatedGapInr.toLocaleString("en-IN")})
                </span>
              </div>
              <p className="text-xs leading-relaxed pt-1 border-t border-black/10">
                {sperrkonto.fullyCovered && (
                  <CheckCircle2 className="inline h-3.5 w-3.5 mr-1 text-emerald-700" />
                )}
                {sperrkonto.summaryNote}
              </p>
            </div>
          </div>

          {/* Founder Mentorship Escalation Card (Honors AGENTS.md Principle #3 & Play Store safety) */}
          <div className="rounded-3xl border border-slate-200 bg-slate-900 p-5 sm:p-6 text-white space-y-3">
            <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-amber-300">
              BERLIN HQ · DIRECT FOUNDER MENTORSHIP
            </span>
            <h4 className="text-base font-bold">
              Need 1-on-1 APS, Anabin, or Hospital Dossier Review?
            </h4>
            <p className="text-xs text-slate-300 leading-relaxed">
              Work directly with GTF Founders Ashutosh Sharma (Germany Relocation &amp; Medical Pathway Specialist, Berlin) and Sarbjit Kour (C1/B2 Language Master Coach, Berlin).
            </p>
            <WebOnly
              nativeFallback={
                <Link
                  href="/about"
                  className="inline-flex items-center gap-2 rounded-xl bg-white px-4 py-2.5 text-xs font-bold text-slate-900 hover:bg-slate-100 transition"
                >
                  <span>Contact Berlin Advisory Team ({BRAND.supportEmail})</span>
                </Link>
              }
            >
              <Link
                href="/pricing#consultation-booking"
                className="inline-flex items-center gap-2 rounded-xl bg-white px-4 py-2.5 text-xs font-bold text-slate-900 hover:bg-slate-100 transition"
              >
                <span>Book Founder Strategy Session</span>
                <ArrowRight className="h-3.5 w-3.5" />
              </Link>
            </WebOnly>
          </div>
        </div>
      </div>
    </section>
  );
}
