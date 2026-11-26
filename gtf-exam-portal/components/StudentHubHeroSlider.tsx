"use client";

import React, { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { AnimatePresence, motion, useReducedMotion, type PanInfo } from "framer-motion";
import {
  ArrowRight,
  ChevronLeft,
  ChevronRight,
  Compass,
  Flame,
  Headphones,
  LogIn,
  Mic,
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

interface SlideConfig {
  id: string;
  eyebrow: string;
  title: string;
  subtitle: string;
  backgroundImage: string;
  overlayClass: string;
  glowClass: string;
  badgeIcon: React.ReactNode;
  badgeText: string;
  badgePulse?: boolean;
  primaryHref: string;
  primaryLabel: string;
  primaryIcon: React.ReactNode;
  secondaryHref?: string;
  secondaryLabel?: string;
  secondaryIcon?: React.ReactNode;
}

const AUTO_ADVANCE_MS = 6000;

export function StudentHubHeroSlider({
  studentDisplayName,
  streakCount,
  completedStepsCount,
  masteredCardsCount,
  activeLevel = "b1",
  isAuthenticated,
}: StudentHubHeroSliderProps) {
  const shouldReduceMotion = useReducedMotion();
  const [activeIndex, setActiveIndex] = useState(0);
  const [direction, setDirection] = useState(1);
  const [isPaused, setIsPaused] = useState(false);

  const safeLevel: ActiveCefrLevel =
    activeLevel in LEVEL_DISPLAY_MAP ? activeLevel : "b1";
  const levelMeta = LEVEL_DISPLAY_MAP[safeLevel];
  const streakFormatted = String(Math.max(1, streakCount || 1)).padStart(2, "0");

  const slides: SlideConfig[] = useMemo(
    () => [
      {
        id: "active-track",
        eyebrow: "STUDENT COMMAND HUB · ACTIVE TRACK",
        title: `Welcome back, ${studentDisplayName} • Resume Track: ${levelMeta.trackLabel}`,
        subtitle: `${completedStepsCount} completed milestones · ${masteredCardsCount} mastered flashcards — pick up right inside your ${levelMeta.code} workspace.`,
        backgroundImage: HEADER_IMAGES.hub,
        overlayClass:
          "bg-gradient-to-r from-[#050C1B]/95 via-[#0A1931]/82 to-[#06202B]/86",
        glowClass:
          "bg-[radial-gradient(ellipse_at_top_right,rgba(16,185,129,0.24),transparent_55%),radial-gradient(ellipse_at_bottom_left,rgba(255,209,102,0.14),transparent_50%)]",
        badgeIcon: <Flame className="h-3.5 w-3.5 text-amber-300 shrink-0" />,
        badgeText: `STREAK · ${streakFormatted}D`,
        badgePulse: true,
        primaryHref: `/academy/${safeLevel}`,
        primaryLabel: "Continue Learning",
        primaryIcon: <Play className="h-3.5 w-3.5 fill-current shrink-0" />,
        secondaryHref: isAuthenticated ? undefined : "/login",
        secondaryLabel: isAuthenticated ? undefined : "Log In to Sync",
        secondaryIcon: isAuthenticated ? undefined : (
          <LogIn className="h-3.5 w-3.5 shrink-0" />
        ),
      },
      {
        id: "exam-milestone",
        eyebrow: "MY PLAN & CAREER ROADMAP · NEXT MILESTONE",
        title: `Next: ${levelMeta.examMilestone}`,
        subtitle:
          "Follow your 6-stage Germany pathway — CEFR A1–B2 certification, Studienkolleg, public university admission, and Berlin placement.",
        backgroundImage: HEADER_IMAGES.b2,
        overlayClass:
          "bg-gradient-to-r from-[#090D1F]/95 via-[#131C3A]/82 to-[#271C0B]/82",
        glowClass:
          "bg-[radial-gradient(ellipse_at_top_right,rgba(245,158,11,0.24),transparent_55%),radial-gradient(ellipse_at_bottom_left,rgba(99,102,241,0.18),transparent_50%)]",
        badgeIcon: <Target className="h-3.5 w-3.5 text-amber-300 shrink-0" />,
        badgeText: `6-STAGE ROADMAP · ${levelMeta.code}`,
        primaryHref: "/pathways",
        primaryLabel: "Open My Plan",
        primaryIcon: <Compass className="h-3.5 w-3.5 shrink-0" />,
        secondaryHref: `/academy/${safeLevel}/04-modelltests`,
        secondaryLabel: "Modelltests",
        secondaryIcon: <ArrowRight className="h-3.5 w-3.5 shrink-0" />,
      },
      {
        id: "daily-labs",
        eyebrow: "DAILY AUDIO & AI SPEAKING STUDIO",
        title: "Daily Hören & Sprechen Lab",
        subtitle:
          "Train with native German listening labs, synchronized answer sheets, and instant de-DE AI pronunciation feedback.",
        backgroundImage: HEADER_IMAGES.a2,
        overlayClass:
          "bg-gradient-to-r from-[#04141D]/95 via-[#082436]/82 to-[#0B172A]/88",
        glowClass:
          "bg-[radial-gradient(ellipse_at_top_right,rgba(34,211,238,0.22),transparent_55%),radial-gradient(ellipse_at_bottom_left,rgba(42,157,143,0.2),transparent_50%)]",
        badgeIcon: <Headphones className="h-3.5 w-3.5 text-cyan-300 shrink-0" />,
        badgeText: "STUDIO AUDIO · DE-DE AI",
        primaryHref: `/academy/${safeLevel}/03-hoeren-lesen`,
        primaryLabel: "Launch Hören Lab",
        primaryIcon: <ArrowRight className="h-3.5 w-3.5 shrink-0" />,
        secondaryHref: `/exam/${safeLevel}/sprechen`,
        secondaryLabel: "AI Sprechen",
        secondaryIcon: <Mic className="h-3.5 w-3.5 shrink-0" />,
      },
    ],
    [
      completedStepsCount,
      isAuthenticated,
      levelMeta.code,
      levelMeta.examMilestone,
      levelMeta.trackLabel,
      masteredCardsCount,
      safeLevel,
      streakFormatted,
      studentDisplayName,
    ],
  );

  const slideCount = slides.length;

  const goToSlide = useCallback(
    (targetIndex: number) => {
      const normalized = ((targetIndex % slideCount) + slideCount) % slideCount;
      setDirection(targetIndex >= activeIndex ? 1 : -1);
      setActiveIndex(normalized);
    },
    [activeIndex, slideCount],
  );

  const goNext = useCallback(() => {
    setDirection(1);
    setActiveIndex((prev) => (prev + 1) % slideCount);
  }, [slideCount]);

  const goPrev = useCallback(() => {
    setDirection(-1);
    setActiveIndex((prev) => (prev - 1 + slideCount) % slideCount);
  }, [slideCount]);

  useEffect(() => {
    if (isPaused || shouldReduceMotion) return undefined;
    const timer = window.setInterval(() => {
      setDirection(1);
      setActiveIndex((prev) => (prev + 1) % slideCount);
    }, AUTO_ADVANCE_MS);
    return () => window.clearInterval(timer);
  }, [isPaused, shouldReduceMotion, slideCount, activeIndex]);

  const handleDragEnd = (
    _event: MouseEvent | TouchEvent | PointerEvent,
    info: PanInfo,
  ) => {
    setIsPaused(false);
    if (info.offset.x < -50 || info.velocity.x < -400) {
      goNext();
    } else if (info.offset.x > 50 || info.velocity.x > 400) {
      goPrev();
    }
  };

  const currentSlide = slides[activeIndex];

  const slideVariants = {
    enter: (dir: number) =>
      shouldReduceMotion
        ? { opacity: 0 }
        : { x: dir > 0 ? 48 : -48, opacity: 0 },
    center: { x: 0, opacity: 1 },
    exit: (dir: number) =>
      shouldReduceMotion
        ? { opacity: 0 }
        : { x: dir > 0 ? -48 : 48, opacity: 0 },
  };

  return (
    <section
      aria-label="Student Command Hub Highlights"
      aria-roledescription="carousel"
      onMouseEnter={() => setIsPaused(true)}
      onMouseLeave={() => setIsPaused(false)}
      onFocusCapture={() => setIsPaused(true)}
      onBlurCapture={() => setIsPaused(false)}
      className="relative w-full h-[252px] sm:h-[290px] lg:h-[320px] overflow-hidden border-b border-slate-800/80 bg-slate-950 text-white select-none"
    >
      {/* Stacked Crossfading Cinematic Backgrounds (Zero Flash & Zero CLS) */}
      {slides.map((slide, idx) => {
        const isCurrent = idx === activeIndex;
        return (
          <motion.div
            key={slide.id}
            aria-hidden="true"
            initial={false}
            animate={{
              opacity: isCurrent ? 1 : 0,
              scale: shouldReduceMotion ? 1.03 : isCurrent ? 1.03 : 1.08,
            }}
            transition={{ duration: shouldReduceMotion ? 0.2 : 0.7, ease: "easeOut" }}
            className="pointer-events-none absolute inset-0"
          >
            <div
              className="absolute inset-0 bg-cover bg-center blur-[1.5px]"
              style={{ backgroundImage: `url('${slide.backgroundImage}')` }}
            />
            <div className={`absolute inset-0 ${slide.overlayClass}`} />
            <div className={`absolute inset-0 ${slide.glowClass}`} />
            <div className="absolute inset-0 bg-gradient-to-t from-slate-950/85 via-transparent to-slate-950/35" />
          </motion.div>
        );
      })}

      {/* Swipeable / Draggable Foreground Content */}
      <div className="relative z-10 mx-auto flex h-full max-w-6xl flex-col justify-between px-4 sm:px-8 pt-5 pb-3.5 sm:pt-7 sm:pb-4">
        <div className="relative flex-1 flex items-center overflow-hidden">
          <AnimatePresence initial={false} custom={direction} mode="popLayout">
            <motion.div
              key={currentSlide.id}
              custom={direction}
              variants={slideVariants}
              initial="enter"
              animate="center"
              exit="exit"
              transition={{
                x: { type: "spring", stiffness: 320, damping: 32 },
                opacity: { duration: 0.24 },
              }}
              drag={shouldReduceMotion ? false : "x"}
              dragDirectionLock
              dragConstraints={{ left: 0, right: 0 }}
              dragElastic={0.18}
              onDragStart={() => setIsPaused(true)}
              onDragEnd={handleDragEnd}
              className="w-full cursor-grab active:cursor-grabbing space-y-2.5 sm:space-y-3.5 pr-0 sm:pr-14"
            >
              {/* Top Eyebrow + Status Pill */}
              <div className="flex flex-wrap items-center justify-between gap-2">
                <p className="text-[10px] sm:text-[11px] font-bold uppercase tracking-[0.22em] text-amber-300/95">
                  {currentSlide.eyebrow}
                </p>

                <div className="inline-flex items-center gap-1.5 rounded-full border border-white/20 bg-white/10 px-3 py-1 text-[10px] sm:text-[11px] font-bold uppercase tracking-[0.16em] text-white backdrop-blur-md shadow-xs">
                  {currentSlide.badgePulse && (
                    <span className="relative flex h-2 w-2 shrink-0">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                      <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-400" />
                    </span>
                  )}
                  {currentSlide.badgeIcon}
                  <span>{currentSlide.badgeText}</span>
                </div>
              </div>

              {/* Main Headline + Subtitle */}
              <div className="space-y-1.5 sm:space-y-2">
                <h1 className="text-xl sm:text-3xl lg:text-[34px] font-extrabold tracking-tight leading-[1.14] text-white line-clamp-2">
                  {currentSlide.title}
                </h1>
                <p className="max-w-2xl text-xs sm:text-sm md:text-[15px] text-slate-200/90 leading-snug sm:leading-relaxed line-clamp-2">
                  {currentSlide.subtitle}
                </p>
              </div>

              {/* Action CTAs */}
              <div className="flex flex-wrap items-center gap-2.5 pt-1">
                <Link
                  href={currentSlide.primaryHref}
                  className="inline-flex items-center justify-center gap-2 rounded-xl bg-white px-5 py-2.5 text-[11px] sm:text-xs font-bold uppercase tracking-[0.16em] text-slate-950 shadow-sm transition hover:bg-slate-100"
                >
                  {currentSlide.primaryIcon}
                  <span>{currentSlide.primaryLabel}</span>
                </Link>

                {currentSlide.secondaryHref && currentSlide.secondaryLabel && (
                  <Link
                    href={currentSlide.secondaryHref}
                    className="inline-flex items-center justify-center gap-1.5 rounded-xl border border-white/30 bg-white/10 px-4 py-2.5 text-[11px] sm:text-xs font-semibold uppercase tracking-[0.16em] text-white backdrop-blur-md transition hover:bg-white/20 hover:border-white/50"
                  >
                    {currentSlide.secondaryIcon}
                    <span>{currentSlide.secondaryLabel}</span>
                  </Link>
                )}
              </div>
            </motion.div>
          </AnimatePresence>

          {/* Desktop Prev / Next Arrow Controls */}
          <div className="hidden sm:flex items-center gap-1.5 absolute right-0 bottom-1 z-20">
            <button
              type="button"
              onClick={goPrev}
              aria-label="Previous slide"
              className="flex h-8 w-8 items-center justify-center rounded-full border border-white/20 bg-white/10 text-white backdrop-blur-md transition hover:bg-white/20 hover:border-white/40 cursor-pointer"
            >
              <ChevronLeft className="h-4 w-4" />
            </button>
            <button
              type="button"
              onClick={goNext}
              aria-label="Next slide"
              className="flex h-8 w-8 items-center justify-center rounded-full border border-white/20 bg-white/10 text-white backdrop-blur-md transition hover:bg-white/20 hover:border-white/40 cursor-pointer"
            >
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>
        </div>

        {/* Bottom Pill / Dot Pagination Indicators */}
        <div
          className="flex items-center justify-center gap-2 pt-2"
          role="tablist"
          aria-label="Hero slide pagination"
        >
          {slides.map((slide, idx) => {
            const isActive = idx === activeIndex;
            return (
              <button
                key={slide.id}
                type="button"
                role="tab"
                aria-selected={isActive}
                aria-label={`Go to slide ${idx + 1}: ${slide.eyebrow}`}
                onClick={() => goToSlide(idx)}
                className={`h-2 rounded-full transition-all duration-300 cursor-pointer ${
                  isActive
                    ? "w-8 bg-amber-300 shadow-[0_0_10px_rgba(252,211,77,0.65)]"
                    : "w-2 bg-white/35 hover:bg-white/60"
                }`}
              />
            );
          })}
        </div>
      </div>
    </section>
  );
}
