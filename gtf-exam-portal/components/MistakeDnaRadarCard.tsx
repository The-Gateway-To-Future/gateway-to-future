"use client";

import React, { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  Activity,
  ArrowRight,
  Brain,
  CheckCircle2,
  Flame,
  ShieldAlert,
  Sparkles,
  Target,
  Zap,
} from "lucide-react";
import {
  MISTAKE_DNA_EVENT,
  computeMistakeRadar,
  loadMistakeDna,
  readLocalMistakeDna,
  type MistakeAxisScore,
  type MistakeDnaRecord,
} from "@/lib/mistake-dna/store";
import {
  MISTAKE_AXES,
  MISTAKE_AXIS_META,
  MISTAKE_TAXONOMY,
  type MistakeCode,
} from "@/lib/mistake-dna/taxonomy";
import type { ExamMistakeCluster, Level } from "@/lib/types";

interface MistakeDnaRadarCardProps {
  mode: "dashboard" | "exam-review";
  uid?: string;
  examClusters?: ExamMistakeCluster[];
  level?: Level;
}

/**
 * Compact, dependency-free 5-axis SVG Radar Chart showing Mistake-DNA health (0–100 per axis).
 * Higher radius = stronger mastery; dips visibly flag recurring German weak spots.
 */
function FiveAxisRadarSvg({ axes }: { axes: MistakeAxisScore[] }) {
  const size = 216;
  const cx = size / 2;
  const cy = size / 2;
  const maxR = 68;
  const rings = [0.33, 0.66, 1.0];

  const angleFor = (idx: number) => -Math.PI / 2 + (idx * 2 * Math.PI) / axes.length;

  const pointAt = (idx: number, fraction: number) => {
    const a = angleFor(idx);
    return {
      x: cx + Math.cos(a) * maxR * fraction,
      y: cy + Math.sin(a) * maxR * fraction,
    };
  };

  const dataPoints = axes
    .map((ax, i) => {
      const frac = Math.max(0.18, Math.min(1, ax.healthScore / 100));
      const p = pointAt(i, frac);
      return `${p.x.toFixed(1)},${p.y.toFixed(1)}`;
    })
    .join(" ");

  return (
    <svg
      viewBox={`0 0 ${size} ${size}`}
      className="w-full max-w-[220px] h-auto mx-auto select-none"
      role="img"
      aria-label="5-axis German Mistake-DNA Radar Chart"
    >
      {/* Concentric pentagon grid rings */}
      {rings.map((r) => {
        const poly = axes
          .map((_, i) => {
            const p = pointAt(i, r);
            return `${p.x.toFixed(1)},${p.y.toFixed(1)}`;
          })
          .join(" ");
        return (
          <polygon
            key={r}
            points={poly}
            fill="none"
            stroke="#e2e8f0"
            strokeWidth={r === 1 ? "1.2" : "0.8"}
            strokeDasharray={r === 1 ? undefined : "2 2"}
          />
        );
      })}

      {/* Radial axis spokes */}
      {axes.map((ax, i) => {
        const edge = pointAt(i, 1);
        return (
          <line
            key={ax.axis}
            x1={cx}
            y1={cy}
            x2={edge.x}
            y2={edge.y}
            stroke="#e2e8f0"
            strokeWidth="0.9"
          />
        );
      })}

      {/* Student mastery polygon */}
      <polygon
        points={dataPoints}
        fill="rgba(15, 76, 129, 0.16)"
        stroke="#0f4c81"
        strokeWidth="2"
        strokeLinejoin="round"
      />

      {/* Vertex dots & labels */}
      {axes.map((ax, i) => {
        const frac = Math.max(0.18, Math.min(1, ax.healthScore / 100));
        const dot = pointAt(i, frac);
        const lbl = pointAt(i, 1.3);
        const isWeak = ax.healthScore < 75;
        return (
          <g key={ax.axis}>
            <circle
              cx={dot.x}
              cy={dot.y}
              r={isWeak ? 4.2 : 3.2}
              fill={isWeak ? "#d97706" : "#0f4c81"}
              stroke="#ffffff"
              strokeWidth="1.5"
            />
            <text
              x={lbl.x}
              y={lbl.y + 3}
              textAnchor="middle"
              className="fill-slate-700 text-[9px] font-bold"
            >
              {ax.shortLabel}
            </text>
          </g>
        );
      })}
    </svg>
  );
}

export function MistakeDnaRadarCard({
  mode,
  uid,
  examClusters,
  level,
}: MistakeDnaRadarCardProps) {
  const [records, setRecords] = useState<MistakeDnaRecord[]>([]);
  const [loaded, setLoaded] = useState(mode === "exam-review");
  const [nowMs, setNowMs] = useState<number>(0);

  useEffect(() => {
    setNowMs(Date.now());
  }, []);

  useEffect(() => {
    if (mode !== "dashboard" || !uid) return;
    let active = true;

    // Instant local cache hydration for zero-lag mobile paint
    const cached = readLocalMistakeDna(uid);
    if (cached.length > 0) setRecords(cached);

    loadMistakeDna(uid)
      .then(({ records: fetched }) => {
        if (active) {
          setRecords(fetched);
          setLoaded(true);
        }
      })
      .catch(() => {
        if (active) setLoaded(true);
      });

    const onUpdated = (ev: Event) => {
      const detail = (ev as CustomEvent<{ uid: string; records: MistakeDnaRecord[] }>).detail;
      if (detail && detail.uid === uid && Array.isArray(detail.records)) {
        setRecords(detail.records);
      }
    };

    window.addEventListener(MISTAKE_DNA_EVENT, onUpdated);
    return () => {
      active = false;
      window.removeEventListener(MISTAKE_DNA_EVENT, onUpdated);
    };
  }, [mode, uid]);

  const dashboardRadar = useMemo(
    () => computeMistakeRadar(records, nowMs || Date.now()),
    [records, nowMs],
  );

  // Build exam-scoped radar when rendered on `/exam/[level]/result`
  const examAxes = useMemo<MistakeAxisScore[]>(() => {
    const counts: Record<string, number> = {};
    for (const c of examClusters || []) {
      const meta = MISTAKE_TAXONOMY[c.errorKey];
      if (!meta) continue;
      counts[meta.axis] = (counts[meta.axis] || 0) + c.count;
    }
    return MISTAKE_AXES.map((axis) => {
      const meta = MISTAKE_AXIS_META[axis];
      const errCount = counts[axis] || 0;
      const healthScore = Math.max(20, Math.min(100, 100 - errCount * 22));
      return {
        axis,
        label: meta.label,
        shortLabel: meta.shortLabel,
        labelDe: meta.labelDe,
        color: meta.color,
        totalErrors: errCount,
        dueCount: errCount > 0 ? 1 : 0,
        healthScore,
      };
    });
  }, [examClusters]);

  /* ───────────────────────── EXAM REVIEW MODE ───────────────────────── */
  if (mode === "exam-review") {
    const clusters = examClusters || [];
    if (clusters.length === 0) {
      return (
        <section className="rounded-2xl border border-emerald-200 bg-emerald-50/60 p-5 sm:p-6 shadow-xs">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div className="flex items-start gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-600 text-white shrink-0">
                <CheckCircle2 className="h-5 w-5" />
              </div>
              <div>
                <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-emerald-800">
                  MISTAKE-DNA DIAGNOSTICS · CLEAN RUN
                </p>
                <h3 className="text-base font-bold text-slate-900">
                  No Recurring Error Traps Triggered in This Attempt
                </h3>
                <p className="text-xs text-slate-600 mt-0.5">
                  Keep your accuracy sharp with your scheduled 5-minute daily SM-2 remediation deck.
                </p>
              </div>
            </div>
            <Link
              href="/mistake-dna"
              className="inline-flex items-center gap-1.5 rounded-xl bg-slate-900 px-4 py-2.5 text-xs font-bold uppercase tracking-[0.14em] text-white hover:bg-slate-800 transition"
            >
              <Zap className="h-3.5 w-3.5 text-amber-400" />
              <span>Open 5-Min Drill</span>
            </Link>
          </div>
        </section>
      );
    }

    const totalHits = clusters.reduce((s, c) => s + c.count, 0);

    return (
      <section className="rounded-2xl border border-slate-200 bg-white p-5 sm:p-6 shadow-sm space-y-5">
        <div className="flex flex-wrap items-start justify-between gap-4 border-b border-slate-100 pb-4">
          <div className="space-y-1">
            <div className="inline-flex items-center gap-1.5 rounded-full border border-amber-200 bg-amber-50 px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-[0.18em] text-amber-800">
              <Brain className="h-3 w-3" />
              <span>Mistake-DNA Exam Diagnostics · {(level || "b1").toUpperCase()}</span>
            </div>
            <h3 className="text-lg sm:text-xl font-bold tracking-tight text-slate-900">
              {clusters.length} Recurring Trap Pattern{clusters.length === 1 ? "" : "s"} Detected ({totalHits} Error{totalHits === 1 ? "" : "s"})
            </h3>
            <p className="text-xs text-slate-600">
              Every missed item has been auto-queued into your spaced-remediation deck with Hinglish rules.
            </p>
          </div>

          <Link
            href={`/mistake-dna?focus=${encodeURIComponent(clusters[0].errorKey)}`}
            className="inline-flex items-center gap-2 rounded-xl bg-slate-900 px-4 py-2.5 text-xs font-bold uppercase tracking-[0.14em] text-white hover:bg-slate-800 transition shadow-xs"
          >
            <Zap className="h-3.5 w-3.5 text-amber-400" />
            <span>Kill These Weaknesses (5 Min)</span>
            <ArrowRight className="h-3.5 w-3.5" />
          </Link>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-center">
          <div className="lg:col-span-4 rounded-xl border border-slate-100 bg-slate-50/70 p-4">
            <FiveAxisRadarSvg axes={examAxes} />
            <p className="text-center text-[11px] font-medium text-slate-500 mt-1">
              Exam-Scoped 5-Axis Trap Profile
            </p>
          </div>

          <div className="lg:col-span-8 space-y-2.5">
            {clusters.slice(0, 4).map((cluster) => {
              const meta = MISTAKE_TAXONOMY[cluster.errorKey];
              if (!meta) return null;
              return (
                <div
                  key={cluster.errorKey}
                  className="rounded-xl border border-slate-200 bg-slate-50/60 p-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                >
                  <div className="space-y-1 min-w-0">
                    <div className="flex flex-wrap items-center gap-1.5">
                      <span className="rounded-md bg-amber-100 border border-amber-200 px-2 py-0.5 font-mono text-[10px] font-bold text-amber-900">
                        {cluster.errorKey}
                      </span>
                      <span className="rounded-full bg-rose-50 border border-rose-200 px-2 py-0.5 text-[10px] font-bold text-rose-700">
                        {cluster.count}× missed
                      </span>
                      <span className="text-[10px] font-semibold uppercase text-slate-500">
                        {cluster.sections.join(" · ")}
                      </span>
                    </div>
                    <p className="text-xs font-bold text-slate-900">{meta.titleDe}</p>
                    <p className="text-[11px] text-slate-600 leading-relaxed line-clamp-2">
                      <strong className="text-slate-800">Hinglish Tip:</strong> {meta.whyIndiansMissItHinglish}
                    </p>
                  </div>

                  <Link
                    href={`/mistake-dna?focus=${encodeURIComponent(cluster.errorKey)}`}
                    className="shrink-0 inline-flex items-center justify-center gap-1.5 rounded-lg border border-slate-300 bg-white px-3 py-2 text-[11px] font-bold text-slate-800 hover:bg-slate-900 hover:text-white hover:border-slate-900 transition"
                  >
                    <Target className="h-3.5 w-3.5" />
                    <span>Drill Trap</span>
                  </Link>
                </div>
              );
            })}
          </div>
        </div>
      </section>
    );
  }

  /* ───────────────────────── DASHBOARD MODE ───────────────────────── */
  const hasTrackedData = dashboardRadar.totalTrackedPatterns > 0;
  const topSpots = dashboardRadar.topWeakSpots.slice(0, 3);

  return (
    <section className="mx-auto max-w-6xl px-4 sm:px-8 pt-6 sm:pt-8">
      <div className="rounded-3xl border border-slate-200 bg-white p-5 sm:p-7 shadow-sm space-y-5">
        {/* Header Bar */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-100 pb-4">
          <div className="space-y-1">
            <div className="flex flex-wrap items-center gap-2">
              <span className="inline-flex items-center gap-1.5 rounded-full border border-slate-200 bg-slate-100 px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-[0.2em] text-slate-700">
                <Activity className="h-3 w-3 text-[#0f4c81]" />
                <span>Mistake-DNA Engine · SM-2</span>
              </span>
              {dashboardRadar.dueNowCount > 0 ? (
                <span className="inline-flex items-center gap-1 rounded-full border border-amber-200 bg-amber-50 px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-[0.14em] text-amber-800">
                  <Flame className="h-3 w-3 text-amber-600" />
                  <span>{dashboardRadar.dueNowCount} Due Today</span>
                </span>
              ) : hasTrackedData ? (
                <span className="inline-flex items-center gap-1 rounded-full border border-emerald-200 bg-emerald-50 px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-[0.14em] text-emerald-700">
                  <CheckCircle2 className="h-3 w-3" />
                  <span>All Caught Up</span>
                </span>
              ) : (
                <span className="inline-flex items-center gap-1 rounded-full border border-indigo-200 bg-indigo-50 px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-[0.14em] text-indigo-700">
                  <Sparkles className="h-3 w-3" />
                  <span>Ready to Calibrate</span>
                </span>
              )}
            </div>
            <h2 className="text-xl sm:text-2xl font-semibold tracking-tight text-slate-900">
              Mistake-DNA Radar &amp; Daily Weak-Spot Remediation
            </h2>
          </div>

          <Link
            href="/mistake-dna"
            className="inline-flex items-center justify-center gap-2 rounded-xl bg-slate-900 px-5 py-3 text-xs font-bold uppercase tracking-[0.15em] text-white hover:bg-slate-800 transition shadow-xs shrink-0"
          >
            <Zap className="h-4 w-4 text-amber-400" />
            <span>
              {hasTrackedData
                ? "Kill Your Weaknesses (5 Min)"
                : "Start 5-Min DNA Calibration"}
            </span>
            <ArrowRight className="h-3.5 w-3.5" />
          </Link>
        </div>

        {/* Main Split: 5-Axis Radar + Top Weak-Spot Clusters */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-center">
          {/* Left: Compact 5-Axis SVG Radar */}
          <div className="lg:col-span-4 rounded-2xl border border-slate-100 bg-slate-50/70 p-4 space-y-3">
            <FiveAxisRadarSvg axes={dashboardRadar.axes} />
            <div className="grid grid-cols-3 gap-2 pt-2 border-t border-slate-200/70 text-center">
              <div>
                <div className="text-base font-extrabold text-slate-900">
                  {loaded ? dashboardRadar.totalTrackedPatterns : "—"}
                </div>
                <div className="text-[10px] font-semibold uppercase tracking-wider text-slate-500">
                  Patterns
                </div>
              </div>
              <div>
                <div className="text-base font-extrabold text-amber-600">
                  {loaded ? dashboardRadar.dueNowCount : "—"}
                </div>
                <div className="text-[10px] font-semibold uppercase tracking-wider text-slate-500">
                  Due Now
                </div>
              </div>
              <div>
                <div className="text-base font-extrabold text-emerald-600">
                  {loaded ? dashboardRadar.masteredCount : "—"}
                </div>
                <div className="text-[10px] font-semibold uppercase tracking-wider text-slate-500">
                  Fixed
                </div>
              </div>
            </div>
          </div>

          {/* Right: Top Weak-Spot Clusters or Calibration Preview */}
          <div className="lg:col-span-8 space-y-3">
            {hasTrackedData ? (
              <>
                <div className="flex items-center justify-between">
                  <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-slate-500">
                    Your Highest-Frequency German Traps
                  </p>
                  <Link
                    href="/mistake-dna"
                    className="text-xs font-semibold text-[#0f4c81] hover:underline"
                  >
                    View all {dashboardRadar.totalTrackedPatterns} →
                  </Link>
                </div>

                <div className="space-y-2.5">
                  {topSpots.map((rec) => {
                    const meta = MISTAKE_TAXONOMY[rec.errorKey];
                    if (!meta) return null;
                    const isDue =
                      !rec.mastered &&
                      new Date(rec.nextReviewAt).getTime() <= (nowMs || Date.now());
                    return (
                      <Link
                        key={rec.errorKey}
                        href={`/mistake-dna?focus=${encodeURIComponent(rec.errorKey)}`}
                        className="group block rounded-2xl border border-slate-200 bg-slate-50/50 hover:bg-white hover:border-slate-300 p-3.5 transition shadow-2xs"
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div className="space-y-1 min-w-0">
                            <div className="flex flex-wrap items-center gap-1.5">
                              <span className="rounded-md bg-slate-900 px-2 py-0.5 font-mono text-[10px] font-bold text-white">
                                {rec.errorKey}
                              </span>
                              <span className="rounded-full bg-rose-50 border border-rose-200 px-2 py-0.5 text-[10px] font-bold text-rose-700">
                                {rec.occurrences}× hit
                              </span>
                              {rec.mastered ? (
                                <span className="rounded-full bg-emerald-50 border border-emerald-200 px-2 py-0.5 text-[10px] font-bold text-emerald-700">
                                  Mastered
                                </span>
                              ) : isDue ? (
                                <span className="rounded-full bg-amber-50 border border-amber-200 px-2 py-0.5 text-[10px] font-bold text-amber-800">
                                  Review Due
                                </span>
                              ) : (
                                <span className="text-[10px] font-medium text-slate-500">
                                  Next in {Math.max(1, rec.intervalDays)}d
                                </span>
                              )}
                            </div>
                            <p className="text-xs sm:text-sm font-bold text-slate-900 group-hover:text-[#0f4c81] transition">
                              {meta.shortLabel} — {meta.titleEn}
                            </p>
                            <p className="text-[11px] text-slate-600 line-clamp-1">
                              {meta.goldenRuleDe}
                            </p>
                          </div>
                          <ArrowRight className="h-4 w-4 text-slate-400 group-hover:text-slate-900 shrink-0 mt-1 transition" />
                        </div>
                      </Link>
                    );
                  })}
                </div>
              </>
            ) : (
              <div className="rounded-2xl border border-slate-200 bg-slate-50/60 p-5 space-y-4">
                <div className="flex items-start gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-amber-100 text-amber-800 shrink-0">
                    <ShieldAlert className="h-5 w-5" />
                  </div>
                  <div className="space-y-1">
                    <h3 className="text-sm sm:text-base font-bold text-slate-900">
                      Automatically Groups Your Recurring German Traps
                    </h3>
                    <p className="text-xs text-slate-600 leading-relaxed">
                      Every missed question in Lesen, Hören, Workbooks, or AI Schreiben/Sprechen is tagged into
                      14 Indian-learner trap patterns (<code className="font-mono text-[11px]">WORD_ORDER_WEIL</code>,{" "}
                      <code className="font-mono text-[11px]">CASE_DAT_WECHSEL</code>,{" "}
                      <code className="font-mono text-[11px]">HOEREN_TIME_TRAP</code>) and scheduled with SM-2 spaced remediation.
                    </p>
                  </div>
                </div>

                <div className="flex flex-wrap gap-2">
                  {(
                    [
                      "WORD_ORDER_WEIL",
                      "CASE_DAT_WECHSEL",
                      "PERFEKT_HABEN_SEIN",
                      "PREP_ZU_NACH_IN",
                      "HOEREN_TIME_TRAP",
                    ] as MistakeCode[]
                  ).map((code) => (
                    <Link
                      key={code}
                      href={`/mistake-dna?focus=${encodeURIComponent(code)}`}
                      className="inline-flex items-center gap-1 rounded-full border border-slate-200 bg-white px-3 py-1.5 text-[11px] font-semibold text-slate-700 hover:border-slate-900 hover:text-slate-900 transition"
                    >
                      <span>{MISTAKE_TAXONOMY[code].shortLabel}</span>
                    </Link>
                  ))}
                </div>
              </div>
            )}

            {/* 5-Axis Horizontal Mini-Bars for ultra-clear mobile scan */}
            <div className="grid grid-cols-2 sm:grid-cols-5 gap-2 pt-1">
              {dashboardRadar.axes.map((ax) => (
                <div
                  key={ax.axis}
                  className="rounded-xl border border-slate-100 bg-slate-50 px-2.5 py-2"
                >
                  <div className="flex items-center justify-between text-[10px] font-bold text-slate-700">
                    <span className="truncate">{ax.shortLabel}</span>
                    <span className={ax.healthScore < 75 ? "text-amber-700" : "text-emerald-700"}>
                      {ax.healthScore}%
                    </span>
                  </div>
                  <div className="mt-1.5 h-1.5 w-full rounded-full bg-slate-200 overflow-hidden">
                    <div
                      className="h-full rounded-full transition-all duration-500"
                      style={{
                        width: `${ax.healthScore}%`,
                        backgroundColor: ax.healthScore < 75 ? "#d97706" : ax.color,
                      }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
