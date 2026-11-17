"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import {
  ArrowLeft,
  Award,
  BookOpen,
  Clock,
  Headphones,
  Mic,
  Pause,
  PenTool,
  Play,
  RotateCcw,
} from "lucide-react";
import { LEVEL_META, type Level, type SectionKey } from "@/lib/config";
import { AntiPiracyShield } from "@/components/AntiPiracyShield";

interface ExamHeaderProps {
  level: Level;
  activeSection: SectionKey | "result";
  durationMinutes: number;
  testTitle?: string;
  onResetExam?: () => void;
  answeredCount?: number;
  totalQuestions?: number;
}

function formatSeconds(sec: number): string {
  const m = Math.floor(sec / 60);
  const s = sec % 60;
  return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
}

export function ExamHeader({
  level,
  activeSection,
  durationMinutes,
  testTitle,
  onResetExam,
  answeredCount,
  totalQuestions,
}: ExamHeaderProps) {
  const storageKey = `gtf_timer_${level}_${activeSection}`;
  const [secondsLeft, setSecondsLeft] = useState<number>(durationMinutes * 60);
  const [paused, setPaused] = useState(false);

  useEffect(() => {
    if (activeSection === "result") return;
    const saved = sessionStorage.getItem(storageKey);
    if (saved && Number.isFinite(Number(saved)) && Number(saved) > 0) {
      setSecondsLeft(Number(saved));
    } else {
      setSecondsLeft(durationMinutes * 60);
    }
  }, [storageKey, durationMinutes, activeSection]);

  useEffect(() => {
    if (activeSection === "result" || paused) return;
    const id = window.setInterval(() => {
      setSecondsLeft((prev) => {
        const next = Math.max(0, prev - 1);
        sessionStorage.setItem(storageKey, String(next));
        return next;
      });
    }, 1000);
    return () => window.clearInterval(id);
  }, [activeSection, paused, storageKey]);

  const resetTimer = () => {
    const fresh = durationMinutes * 60;
    setSecondsLeft(fresh);
    sessionStorage.setItem(storageKey, String(fresh));
  };

  const navItems: {
    key: SectionKey | "result";
    num: string;
    label: string;
    sub: string;
    href: string;
    icon: typeof BookOpen;
  }[] = [
    {
      key: "lesen",
      num: "1",
      label: "Lesen",
      sub: "70 Min",
      href: `/exam/${level}/lesen`,
      icon: BookOpen,
    },
    {
      key: "hoeren",
      num: "2",
      label: "Hören",
      sub: "40 Min",
      href: `/exam/${level}/hoeren`,
      icon: Headphones,
    },
    {
      key: "schreiben",
      num: "3",
      label: "Schreiben",
      sub: "60 Min",
      href: `/exam/${level}/schreiben`,
      icon: PenTool,
    },
    {
      key: "sprechen",
      num: "4",
      label: "Sprechen",
      sub: "15 Min",
      href: `/exam/${level}/sprechen`,
      icon: Mic,
    },
    {
      key: "result",
      num: "5",
      label: "Ergebnis",
      sub: "Scorecard",
      href: `/exam/${level}/result`,
      icon: Award,
    },
  ];

  const meta = LEVEL_META[level];
  const isLowTime = secondsLeft < 300;

  // Calculate section progress
  const sectionIndex = navItems.findIndex((item) => item.key === activeSection);
  const progressPercent =
    totalQuestions && totalQuestions > 0
      ? Math.round(((answeredCount || 0) / totalQuestions) * 100)
      : Math.round(((sectionIndex + 1) / navItems.length) * 100);

  return (
    <>
      <AntiPiracyShield
        resourceTitle={testTitle || `GTF ${meta.label} Modelltest`}
      />

      {/* Focus Mode Header Container (Quizlet / Babbel Clean Light Theme) */}
      <header className="sticky top-0 z-30 w-full border-b border-slate-200 bg-white/95 backdrop-blur-xl text-slate-900 select-none pt-[env(safe-area-inset-top)] shadow-xs">
        {/* Top Slim Progress Bar */}
        <div className="h-1 w-full bg-slate-100 overflow-hidden">
          <motion.div
            initial={{ width: 0 }}
            animate={{ width: `${progressPercent}%` }}
            transition={{ duration: 0.3 }}
            className="h-full bg-slate-900 rounded-r-full"
          />
        </div>

        {/* Primary Header Row */}
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-3 px-3 py-3 sm:px-6">
          {/* Left: Exit Link & Exam Metadata */}
          <div className="flex items-center gap-3 min-w-0">
            <Link
              href="/dashboard"
              className="relative z-10 inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 hover:text-slate-900 hover:bg-slate-50 transition shadow-xs shrink-0 cursor-pointer"
              title="Leave focus mode and return to dashboard"
            >
              <ArrowLeft className="h-4 w-4" />
              <span className="hidden sm:inline">Exit Exam</span>
            </Link>

            <div className="flex items-center gap-2.5 min-w-0">
              <span className="inline-flex h-8 min-w-[2.5rem] px-2 items-center justify-center rounded-xl border border-slate-200 bg-slate-100 text-xs font-bold uppercase tracking-wider text-slate-800 shrink-0">
                {meta.label}
              </span>
              <div className="min-w-0">
                <h1 className="text-xs sm:text-sm font-semibold text-slate-900 truncate max-w-[160px] sm:max-w-md">
                  {testTitle || `GTF ${meta.label} Modelltest 1`}
                </h1>
                <p className="text-[10px] font-medium uppercase tracking-[0.14em] text-slate-500 hidden sm:block truncate">
                  Goethe / telc {meta.label} Focus Mode · Pass ≥ 60%
                </p>
              </div>
            </div>
          </div>

          {/* Right: Live Countdown Timer & Controls */}
          <div className="flex items-center gap-2 shrink-0">
            {activeSection !== "result" && (
              <div
                className={`flex items-center gap-2 rounded-xl border px-3 py-1.5 text-xs font-semibold transition-colors ${
                  isLowTime
                    ? "border-rose-300 bg-rose-50 text-rose-700"
                    : "border-slate-200 bg-slate-50 text-slate-900"
                }`}
              >
                <Clock
                  className={`h-3.5 w-3.5 shrink-0 ${
                    isLowTime ? "animate-pulse text-rose-600" : "text-slate-500"
                  }`}
                />
                <span className="font-mono text-xs sm:text-sm font-bold tracking-tight">
                  {formatSeconds(secondsLeft)}
                </span>
                <button
                  type="button"
                  onClick={() => setPaused((p) => !p)}
                  className="relative z-10 rounded-lg bg-slate-900 text-white px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wider hover:bg-slate-800 transition cursor-pointer"
                  title={paused ? "Timer fortsetzen" : "Timer anhalten"}
                >
                  {paused ? <Play className="h-3 w-3 fill-current inline" /> : <Pause className="h-3 w-3 inline" />}
                  <span className="hidden sm:inline ml-1">{paused ? "Resume" : "Pause"}</span>
                </button>
                <button
                  type="button"
                  onClick={resetTimer}
                  title="Timer zurücksetzen"
                  className="relative z-10 rounded-lg p-1 text-slate-400 hover:bg-slate-200 hover:text-slate-900 transition cursor-pointer"
                >
                  <RotateCcw className="h-3 w-3" />
                </button>
              </div>
            )}

            {onResetExam && (
              <button
                type="button"
                onClick={onResetExam}
                className="relative z-10 hidden sm:inline-flex rounded-xl border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50 hover:text-slate-900 transition shadow-xs cursor-pointer"
              >
                Reset
              </button>
            )}
          </div>
        </div>

        {/* Section Tabs Bar */}
        <div className="mx-auto max-w-7xl px-3 sm:px-6 border-t border-slate-100">
          <nav className="flex items-center gap-1.5 overflow-x-auto py-2 no-scrollbar">
            {navItems.map((item) => {
              const Icon = item.icon;
              const active = item.key === activeSection;

              return (
                <Link
                  key={item.key}
                  href={item.href}
                  className={`relative z-10 flex items-center gap-2 whitespace-nowrap rounded-xl px-3.5 py-1.5 text-xs transition-all duration-200 cursor-pointer ${
                    active
                      ? "bg-slate-900 text-white font-semibold shadow-xs"
                      : "border border-slate-200 bg-white text-slate-600 font-medium hover:text-slate-900 hover:bg-slate-50 shadow-xs"
                  }`}
                >
                  <Icon
                    className={`h-3.5 w-3.5 shrink-0 ${
                      active ? "text-white" : "text-slate-400"
                    }`}
                  />
                  <span>
                    {item.num}. {item.label}
                  </span>
                  <span
                    className={`rounded-full px-1.5 py-0.5 text-[9px] font-semibold uppercase tracking-wider ${
                      active
                        ? "bg-white/20 text-white"
                        : "bg-slate-100 text-slate-500"
                    }`}
                  >
                    {item.sub}
                  </span>
                </Link>
              );
            })}
          </nav>
        </div>
      </header>
    </>
  );
}
