"use client";

import React from "react";
import { ArrowDownRight, Sparkles } from "lucide-react";

export interface OnboardingValueProp {
  title: string;
  description: string;
  stepTag: string;
}

interface OnboardingHeroProps {
  badge: string;
  title: string;
  subtitle: string;
  valueProps: [OnboardingValueProp, OnboardingValueProp, OnboardingValueProp];
  ctaLabel?: string;
  targetElementId?: string;
  onStartJourney?: () => void;
}

export function OnboardingHero({
  badge,
  title,
  subtitle,
  valueProps,
  ctaLabel = "Start Your Journey",
  targetElementId,
  onStartJourney,
}: OnboardingHeroProps) {
  const handleStart = () => {
    if (onStartJourney) {
      onStartJourney();
    }
    if (targetElementId && typeof document !== "undefined") {
      const el = document.getElementById(targetElementId);
      if (el) {
        el.scrollIntoView({ behavior: "smooth", block: "start" });
      }
    }
  };

  return (
    <section className="rounded-3xl border border-[#134074]/30 bg-gradient-to-br from-[#0A1628] via-[#134074] to-[#0A1628] p-6 sm:p-8 text-white shadow-xl space-y-6">
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
        <div className="space-y-3 max-w-2xl">
          <div className="inline-flex items-center gap-1.5 rounded-full bg-[#FFD166]/15 border border-[#FFD166]/40 px-3.5 py-1 text-[11px] font-black uppercase tracking-wider text-[#FFD166]">
            <Sparkles className="h-3.5 w-3.5" />
            <span>{badge}</span>
          </div>

          <h2 className="text-2xl sm:text-3xl font-black tracking-tight text-white leading-tight break-words hyphens-auto">
            {title}
          </h2>

          <p className="text-sm text-sky-100/90 leading-relaxed break-words">
            {subtitle}
          </p>
        </div>

        <div className="shrink-0">
          <button
            type="button"
            onClick={handleStart}
            className="w-full sm:w-auto inline-flex items-center justify-center gap-2 rounded-2xl bg-[#FFD166] px-6 py-3.5 text-sm font-black text-[#0A1628] shadow-lg hover:bg-amber-300 transition active:scale-[0.98]"
          >
            <span>{ctaLabel}</span>
            <ArrowDownRight className="h-4 w-4" />
          </button>
        </div>
      </div>

      {/* 3 Value Prop Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 sm:gap-6 items-stretch">
        {valueProps.map((prop, idx) => (
          <div
            key={idx}
            className="rounded-2xl border border-white/15 bg-white/10 backdrop-blur-sm p-5 flex flex-col justify-between min-h-[130px] h-auto"
          >
            <div>
              <span className="inline-block rounded-lg bg-[#FFD166]/20 px-2.5 py-0.5 text-[10px] font-black uppercase tracking-wider text-[#FFD166]">
                {prop.stepTag}
              </span>
              <h3 className="mt-2.5 text-base font-black text-white leading-snug break-words hyphens-auto">
                {prop.title}
              </h3>
              <p className="mt-2 text-xs text-sky-100/85 leading-relaxed break-words">
                {prop.description}
              </p>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
