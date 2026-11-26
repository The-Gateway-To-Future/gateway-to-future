"use client";

import React, { useRef, useState } from "react";
import Link from "next/link";
import {
  AnimatePresence,
  motion,
  useReducedMotion,
  useScroll,
  useSpring,
  useTransform,
} from "framer-motion";
import {
  ArrowRight,
  Flame,
  Headphones,
  LogIn,
  Maximize2,
  Mic,
  Minimize2,
  Play,
  Target,
} from "lucide-react";
import { HEADER_IMAGES } from "@/components/BreadcrumbHeader";

export type ActiveCefrLevel = "a1" | "a2" | "b1" | "b2";

export interface StudentHubHeroSliderProps {
  studentDisplayName: string;
  streakCount: number;
  completedStepsCount: number;
  masteredCardsCount: number;
  activeLevel?: ActiveCefrLevel;
  isAuthenticated: boolean;
}

interface LevelDisplayMeta {
  code: string;
  trackLabel: string;
  examMilestone: string;
}

const LEVEL_DISPLAY_MAP: Record<ActiveCefrLevel, LevelDisplayMeta> = {
  a1: {
    code: "A1",
    trackLabel: "A1 Anfänger",
    examMilestone: "Goethe A1 Start Deutsch 1",
  },
  a2: {
    code: "A2",
    trackLabel: "A2 Grundlagen",
    examMilestone: "Goethe A2 Prüfungsvorbereitung",
  },
  b1: {
    code: "B1",
    trackLabel: "B1 Mittelstufe",
    examMilestone: "Goethe B1 Prüfungsvorbereitung",
  },
  b2: {
    code: "B2",
    trackLabel: "B2 Gute Mittelstufe",
    examMilestone: "Goethe / telc B2 Prüfungsvorbereitung",
  },
};

export function StudentHubHeroSlider({
  studentDisplayName,
  streakCount,
  completedStepsCount,
  masteredCardsCount,
  activeLevel = "b1",
  isAuthenticated,
}: StudentHubHeroSliderProps) {
  const heroRef = useRef<HTMLElement>(null);
  const touchStartYRef = useRef<number | null>(null);
  const shouldReduceMotion = useReducedMotion();
  const [isExpanded, setIsExpanded] = useState(false);

  const safeLevel: ActiveCefrLevel =
    activeLevel in LEVEL_DISPLAY_MAP ? activeLevel : "b1";
  const levelMeta = LEVEL_DISPLAY_MAP[safeLevel];
  const streakFormatted = String(Math.max(1, streakCount || 1)).padStart(2, "0");

  const { scrollYProgress } = useScroll({
    target: heroRef,
    offset: ["start start", "end start"],
  });

  const smoothProgress = useSpring(scrollYProgress, {
    stiffness: 180,
    damping: 28,
    mass: 0.35,
  });

  // Apple/BMW-style scroll-driven container expansion & parallax
  const frameScale = useTransform(smoothProgress, [0, 0.45], [0.965, 1]);
  const frameRadius = useTransform(smoothProgress, [0, 0.45], [24, 0]);
  const bgScale = useTransform(smoothProgress, [0, 1], [1.04, 1.18]);
  const bgY = useTransform(smoothProgress, [0, 1], ["0%", "16%"]);
  const fgY = useTransform(smoothProgress, [0, 0.9], [0, -16]);
  const fgOpacity = useTransform(smoothProgress, [0, 0.9], [1, 0.85]);

  const handleTouchStart = (e: React.TouchEvent<HTMLElement>) => {
    if (e.touches.length === 1) {
      touchStartYRef.current = e.touches[0].clientY;
    }
  };

  const handleTouchEnd = (e: React.TouchEvent<HTMLElement>) => {
    if (touchStartYRef.current === null || e.changedTouches.length === 0) return;
    const deltaY = e.changedTouches[0].clientY - touchStartYRef.current;
    touchStartYRef.current = null;

    if (typeof window !== "undefined" && window.scrollY <= 12) {
      if (deltaY > 45) {
        setIsExpanded(true);
      } else if (deltaY < -35 && isExpanded) {
        setIsExpanded(false);
      }
    }
  };

  const quickFocusTiles = [
    {
      id: "milestone",
      label: "NEXT MILESTONE",
      title: `Next: ${levelMeta.examMilestone}`,
      href: "/pathways",
      icon: Target,
    },
    {
      id: "hoeren",
      label: "DAILY HÖREN LAB",
      title: "Studio German Audio & Answer Sheets",
      href: `/academy/${safeLevel}/03-hoeren-lesen`,
      icon: Headphones,
    },
    {
      id: "sprechen",
      label: "AI SPRECHEN STUDIO",
      title: "Live de-DE Pronunciation Feedback",
      href: `/exam/${safeLevel}/sprechen`,
      icon: Mic,
    },
  ];

  return (
    <section
      ref={heroRef}
      aria-label="Student Command Hub Showcase"
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
      className="relative w-full overflow-hidden border-b border-slate-800/80 bg-slate-950 text-white select-none"
    >
      <motion.div
        initial={false}
        style={
          shouldReduceMotion
            ? { scale: 1, borderRadius: 0 }
            : {
                scale: isExpanded ? 1 : frameScale,
                borderRadius: isExpanded ? 0 : frameRadius,
              }
        }
        className={`relative w-full overflow-hidden bg-slate-950 transition-[min-height] duration-500 ease-out will-change-transform ${
          isExpanded
            ? "min-h-[380px] sm:min-h-[430px]"
            : "min-h-[268px] sm:min-h-[304px] lg:min-h-[336px]"
        }`}
      >
        {/* Cinematic Background Image with Scroll Parallax & Scale */}
        <motion.div
          aria-hidden="true"
          initial={false}
          style={
            shouldReduceMotion
              ? { scale: 1.04, y: "0%" }
              : { scale: bgScale, y: bgY }
          }
          className="pointer-events-none absolute inset-0 will-change-transform"
        >
          <div
            className="absolute inset-0 bg-cover bg-center blur-[1.5px]"
            style={{ backgroundImage: `url('${HEADER_IMAGES.hub}')` }}
          />
          <div className="absolute inset-0 bg-gradient-to-r from-[#050C1B]/95 via-[#0A1931]/80 to-[#06202B]/84" />
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,rgba(16,185,129,0.24),transparent_55%),radial-gradient(ellipse_at_bottom_left,rgba(255,209,102,0.16),transparent_50%)]" />
          <div className="absolute inset-0 bg-gradient-to-t from-slate-950/88 via-transparent to-slate-950/35" />
        </motion.div>

        {/* Foreground Content */}
        <motion.div
          initial={false}
          style={
            shouldReduceMotion ? { y: 0, opacity: 1 } : { y: fgY, opacity: fgOpacity }
          }
          className="relative z-10 mx-auto flex h-full max-w-6xl flex-col justify-between px-4 sm:px-8 py-6 sm:py-8 lg:py-10 gap-5"
        >
          {/* Top Eyebrow & Streak Pill */}
          <div className="flex flex-wrap items-center justify-between gap-2.5">
            <p className="text-[10px] sm:text-[11px] font-bold uppercase tracking-[0.22em] text-amber-300/95">
              STUDENT COMMAND HUB · ACTIVE TRACK
            </p>

            <div className="inline-flex items-center gap-2 rounded-full border border-emerald-400/35 bg-emerald-500/15 px-3.5 py-1 text-[10px] sm:text-[11px] font-bold uppercase tracking-[0.16em] text-emerald-100 backdrop-blur-md shadow-xs">
              <span className="relative flex h-2 w-2 shrink-0">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-400" />
              </span>
              <Flame className="h-3.5 w-3.5 text-amber-300 shrink-0" />
              <span>STREAK · {streakFormatted}D</span>
            </div>
          </div>

          {/* Headline, Progress Summary & CTAs */}
          <div className="space-y-3 sm:space-y-4">
            <div className="space-y-2">
              <h1 className="text-2xl sm:text-3xl lg:text-4xl font-extrabold tracking-tight leading-[1.12] text-white">
                Welcome back, {studentDisplayName} • Resume Track:{" "}
                <span className="text-amber-300">{levelMeta.trackLabel}</span>
              </h1>
              <p className="max-w-2xl text-xs sm:text-sm md:text-base text-slate-200/90 leading-relaxed">
                {completedStepsCount} completed milestones · {masteredCardsCount} mastered
                flashcards — pick up right inside your {levelMeta.code} workspace.
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-2.5 pt-1">
              <Link
                href={`/academy/${safeLevel}`}
                className="inline-flex items-center justify-center gap-2 rounded-xl bg-white px-5 sm:px-6 py-2.5 sm:py-3 text-[11px] sm:text-xs font-bold uppercase tracking-[0.16em] text-slate-950 shadow-sm transition hover:bg-slate-100"
              >
                <Play className="h-3.5 w-3.5 fill-current shrink-0" />
                <span>Continue Learning</span>
              </Link>

              {!isAuthenticated && (
                <Link
                  href="/login"
                  className="inline-flex items-center justify-center gap-1.5 rounded-xl border border-white/30 bg-white/10 px-4 py-2.5 sm:py-3 text-[11px] sm:text-xs font-semibold uppercase tracking-[0.16em] text-white backdrop-blur-md transition hover:bg-white/20 hover:border-white/50"
                >
                  <LogIn className="h-3.5 w-3.5 shrink-0" />
                  <span>Log In to Sync</span>
                </Link>
              )}

              <button
                type="button"
                onClick={() => setIsExpanded((prev) => !prev)}
                aria-expanded={isExpanded}
                className="inline-flex items-center justify-center gap-1.5 rounded-xl border border-white/25 bg-white/10 px-3.5 py-2.5 sm:py-3 text-[11px] sm:text-xs font-semibold uppercase tracking-[0.14em] text-slate-100 backdrop-blur-md transition hover:bg-white/20 hover:border-white/45 cursor-pointer"
              >
                {isExpanded ? (
                  <>
                    <Minimize2 className="h-3.5 w-3.5 shrink-0" />
                    <span>Compact View</span>
                  </>
                ) : (
                  <>
                    <Maximize2 className="h-3.5 w-3.5 shrink-0" />
                    <span>Expand Showcase</span>
                  </>
                )}
              </button>
            </div>
          </div>

          {/* Expanded Quick-Focus Strip (Revealed on Tap or Swipe-Down) */}
          <AnimatePresence initial={false}>
            {isExpanded && (
              <motion.div
                key="expanded-showcase-strip"
                initial={shouldReduceMotion ? { opacity: 1 } : { opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                exit={shouldReduceMotion ? { opacity: 0 } : { opacity: 0, y: 8 }}
                transition={{ duration: shouldReduceMotion ? 0.1 : 0.28, ease: "easeOut" }}
                className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2 border-t border-white/15"
              >
                {quickFocusTiles.map((tile) => {
                  const Icon = tile.icon;
                  return (
                    <Link
                      key={tile.id}
                      href={tile.href}
                      className="group flex items-center justify-between gap-3 rounded-2xl border border-white/15 bg-white/10 px-4 py-3 backdrop-blur-md transition hover:border-amber-300/60 hover:bg-white/15"
                    >
                      <div className="flex items-start gap-2.5 min-w-0">
                        <Icon className="h-4 w-4 text-amber-300 shrink-0 mt-0.5" />
                        <div className="min-w-0">
                          <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-amber-200/90">
                            {tile.label}
                          </p>
                          <p className="text-xs font-semibold text-white truncate">
                            {tile.title}
                          </p>
                        </div>
                      </div>
                      <ArrowRight className="h-3.5 w-3.5 text-white/70 group-hover:translate-x-0.5 group-hover:text-white transition shrink-0" />
                    </Link>
                  );
                })}
              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>
      </motion.div>
    </section>
  );
}

export const StudentHubScrollHero = StudentHubHeroSlider;
