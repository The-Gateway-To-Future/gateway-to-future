"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import {
  ArrowLeft,
  Award,
  BookOpen,
  ChevronDown,
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
  testId?: string;
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
  testId,
  onResetExam,
  answeredCount,
  totalQuestions,
}: ExamHeaderProps) {
  const router = useRouter();
  const defaultTestId = `gtf-${level}-modelltest-1`;
  const effectiveTestId = (testId || defaultTestId).trim().toLowerCase();
  const testQuery =
    effectiveTestId !== defaultTestId
      ? `?testId=${encodeURIComponent(effectiveTestId)}`
      : "";
  const hasMultipleSets =
    level === "a1" || level === "a2" || level === "b1" || level === "b2";
  const modelltestOptions = [
    { id: `gtf-${level}-modelltest-1`, label: "Modelltest 1" },
    { id: `gtf-${level}-modelltest-2`, label: "Modelltest 2" },
    { id: `gtf-${level}-modelltest-3`, label: "Modelltest 3" },
  ];
  const selectedModelltestId = modelltestOptions.some((o) => o.id === effectiveTestId)
    ? effectiveTestId
    : defaultTestId;

  const handleSwitchModelltest = (nextId: string) => {
    const href =
      nextId === defaultTestId
        ? `/exam/${level}/${activeSection}`
        : `/exam/${level}/${activeSection}?testId=${encodeURIComponent(nextId)}`;
    router.push(href);
  };
  const storageKey = `gtf_timer_deadline_${level}_${effectiveTestId}_${activeSection}`;
  const [secondsLeft, setSecondsLeft] = useState<number>(durationMinutes * 60);
  const [paused, setPaused] = useState(false);

  // Wall-clock deadline countdown so backgrounded mobile tabs never freeze the exam timer
  useEffect(() => {
    if (activeSection === "result") return;
    const totalSec = Math.max(60, durationMinutes * 60);
    const savedDeadline = Number(sessionStorage.getItem(storageKey));
    if (Number.isFinite(savedDeadline) && savedDeadline > Date.now()) {
      setSecondsLeft(Math.max(0, Math.ceil((savedDeadline - Date.now()) / 1000)));
    } else {
      const freshDeadline = Date.now() + totalSec * 1000;
      sessionStorage.setItem(storageKey, String(freshDeadline));
      setSecondsLeft(totalSec);
    }
  }, [storageKey, durationMinutes, activeSection]);

  useEffect(() => {
    if (activeSection === "result" || paused) return;
    // Sync deadline whenever resuming from pause
    const currentDeadline = Number(sessionStorage.getItem(storageKey));
    if (!Number.isFinite(currentDeadline) || Math.abs((currentDeadline - Date.now()) / 1000 - secondsLeft) > 2) {
      sessionStorage.setItem(storageKey, String(Date.now() + secondsLeft * 1000));
    }

    const tick = () => {
      const deadline = Number(sessionStorage.getItem(storageKey));
      if (Number.isFinite(deadline)) {
        setSecondsLeft(Math.max(0, Math.ceil((deadline - Date.now()) / 1000)));
      }
    };

    const id = window.setInterval(tick, 1000);
    const onVis = () => {
      if (document.visibilityState === "visible") tick();
    };
    document.addEventListener("visibilitychange", onVis);
    return () => {
      window.clearInterval(id);
      document.removeEventListener("visibilitychange", onVis);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeSection, paused, storageKey]);

  const resetTimer = () => {
    const fresh = Math.max(60, durationMinutes * 60);
    sessionStorage.setItem(storageKey, String(Date.now() + fresh * 1000));
    setSecondsLeft(fresh);
  };

  const levelDurations: Record<string, { lesen: number; hoeren: number; schreiben: number; sprechen: number }> = {
    a1: { lesen: 25, hoeren: 20, schreiben: 20, sprechen: 15 },
    a2: { lesen: 30, hoeren: 30, schreiben: 30, sprechen: 15 },
    b1: { lesen: 65, hoeren: 40, schreiben: 60, sprechen: 15 },
    b2: { lesen: 65, hoeren: 40, schreiben: 75, sprechen: 15 },
  };
  const durs = levelDurations[level] || { lesen: 60, hoeren: 30, schreiben: 45, sprechen: 15 };

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
      sub: `${activeSection === "lesen" && durationMinutes ? durationMinutes : durs.lesen}m`,
      href: `/exam/${level}/lesen${testQuery}`,
      icon: BookOpen,
    },
    {
      key: "hoeren",
      num: "2",
      label: "Hören",
      sub: `${activeSection === "hoeren" && durationMinutes ? durationMinutes : durs.hoeren}m`,
      href: `/exam/${level}/hoeren${testQuery}`,
      icon: Headphones,
    },
    {
      key: "schreiben",
      num: "3",
      label: "Schreiben",
      sub: `${activeSection === "schreiben" && durationMinutes ? durationMinutes : durs.schreiben}m`,
      href: `/exam/${level}/schreiben${testQuery}`,
      icon: PenTool,
    },
    {
      key: "sprechen",
      num: "4",
      label: "Sprechen",
      sub: `${activeSection === "sprechen" && durationMinutes ? durationMinutes : durs.sprechen}m`,
      href: `/exam/${level}/sprechen${testQuery}`,
      icon: Mic,
    },
    {
      key: "result",
      num: "5",
      label: "Ergebnis",
      sub: "Score",
      href: `/exam/${level}/result${testQuery}`,
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

        {/* Primary Header Row (compact on mobile to maximize reading/question space) */}
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-2 px-3 py-2 sm:py-2.5 sm:px-6">
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

        {/* Single-Row Section Tabs + Compact Modelltest Switcher (never wraps into 3 rows on mobile) */}
        <div className="mx-auto max-w-7xl px-3 sm:px-6 border-t border-slate-100 flex items-center justify-between gap-2">
          <nav className="flex flex-1 items-center gap-1.5 overflow-x-auto py-1.5 no-scrollbar min-w-0">
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

          {hasMultipleSets && (
            <div className="flex items-center gap-2 my-1.5 shrink-0 max-w-full">
              <label
                htmlFor="gtf-modelltest-switcher"
                className="text-[10px] font-semibold uppercase tracking-[0.14em] text-slate-500 hidden sm:inline"
              >
                Exam Set
              </label>
              <div className="relative">
                <select
                  id="gtf-modelltest-switcher"
                  aria-label="Modelltest wechseln"
                  value={selectedModelltestId}
                  onChange={(e) => handleSwitchModelltest(e.target.value)}
                  className="appearance-none rounded-xl border border-slate-200 bg-white pl-3 pr-8 py-1.5 text-xs font-semibold text-slate-800 shadow-xs transition hover:border-slate-300 hover:bg-slate-50 focus:border-slate-400 focus:outline-none cursor-pointer"
                >
                  {modelltestOptions.map((opt) => (
                    <option key={opt.id} value={opt.id}>
                      {opt.label}
                    </option>
                  ))}
                </select>
                <ChevronDown
                  className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-500"
                  aria-hidden="true"
                />
              </div>
            </div>
          )}
        </div>
      </header>
    </>
  );
}
