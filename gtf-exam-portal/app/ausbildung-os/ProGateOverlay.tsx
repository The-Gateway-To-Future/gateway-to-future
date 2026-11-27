"use client";

import React from "react";
import Link from "next/link";
import { ArrowRight, Check, Crown, FileText, Lock, Sparkles, Unlock } from "lucide-react";
import { ReaderAppNotice } from "@/components/ReaderAppNotice";
import { useIsNativeApp } from "@/lib/use-native-platform";

export interface ProGateOverlayProps {
  isProUnlocked: boolean;
  userEmail?: string;
  userName?: string;
  children: React.ReactNode;
}

function buildUnlockPricingHref(productSlug: string, tierLabel: string, priceLabel: string): string {
  const params = new URLSearchParams({
    product: productSlug,
    title: `Ausbildung OS (${tierLabel} — ${priceLabel})`,
  });
  return `/pricing?${params.toString()}#consultation-booking`;
}

export function ProGateOverlay({
  isProUnlocked,
  userEmail,
  children,
}: ProGateOverlayProps) {
  const { isNative, ready: nativeReady } = useIsNativeApp();

  if (isProUnlocked) {
    return (
      <div className="space-y-6">
        <div className="no-print ausbildung-print-hide rounded-2xl border border-emerald-400/35 bg-gradient-to-r from-emerald-500/15 via-[#0A1628] to-[#0D1017] px-4 py-3 flex flex-wrap items-center justify-between gap-2">
          <div className="inline-flex items-center gap-2 text-xs font-bold text-emerald-300">
            <Unlock className="h-4 w-4 text-emerald-400 shrink-0" />
            <span>Ausbildung OS Pro · Unlocked</span>
          </div>
          <span className="inline-flex items-center gap-1 rounded-full border border-[#FFD166]/40 bg-[#FFD166]/10 px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider text-[#FFD166]">
            <Crown className="h-3 w-3" />
            <span>Bewerbungsmappe PDF &amp; Tracker Active</span>
          </span>
        </div>

        {children}
      </div>
    );
  }

  return (
    <div className="no-print ausbildung-print-hide relative rounded-3xl border border-[#FFD166]/35 bg-[#0D1017]/95 p-5 sm:p-8 shadow-[0_28px_90px_rgba(0,0,0,0.75)] overflow-hidden space-y-6">
      {/* Top Lock Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-white/10 pb-5">
        <div className="space-y-2">
          <div className="inline-flex items-center gap-2 rounded-full border border-[#FFD166]/45 bg-[#FFD166]/15 px-3.5 py-1 text-[11px] font-bold uppercase tracking-[0.18em] text-[#FFD166]">
            <Crown className="h-3.5 w-3.5 text-[#FFD166]" />
            <span>Ausbildung OS Pro</span>
          </div>
          <h2 className="text-xl sm:text-2xl font-bold tracking-tight text-white">
            Unlock DIN Bewerbungsmappe Builder &amp; Application Tracker
          </h2>
          <p className="max-w-2xl text-xs sm:text-sm text-slate-300 leading-relaxed">
            Your Document Checklist, Reality Check, and Live 2026 Rules stay 100% free. Upgrade to Pro to export clean DIN 5008 Lebenslauf &amp; Anschreiben PDFs, track 14-day HR follow-ups, and practice all 12 German HR interview questions.
          </p>
        </div>

        <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl border border-[#FFD166]/40 bg-[#0A1628] text-[#FFD166] shadow-[0_0_24px_-6px_rgba(255,209,102,0.4)]">
          <Lock className="h-5 w-5" />
        </div>
      </div>

      {/* Static Non-Interactive Mock Preview (Never leaks locked Pro DOM) */}
      <div
        aria-hidden="true"
        className="relative rounded-2xl border border-white/10 overflow-hidden bg-[#051329]/85 p-5 sm:p-6 select-none"
      >
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 opacity-50 blur-[1.5px] pointer-events-none">
          <div className="rounded-xl border border-white/10 bg-[#0A1628] p-4 space-y-3">
            <div className="flex items-center gap-2 text-xs font-bold text-[#FFD166]">
              <FileText className="h-4 w-4" />
              <span>DIN 5008 Lebenslauf &amp; Anschreiben</span>
            </div>
            <div className="space-y-2">
              <div className="h-3 w-3/4 rounded bg-white/15" />
              <div className="h-2.5 w-full rounded bg-white/10" />
              <div className="h-2.5 w-5/6 rounded bg-white/10" />
              <div className="h-2.5 w-2/3 rounded bg-white/10" />
            </div>
          </div>
          <div className="rounded-xl border border-white/10 bg-[#0A1628] p-4 space-y-3">
            <div className="flex items-center justify-between text-xs font-bold text-emerald-300">
              <span>German Employer Pipeline</span>
              <span>14-Day Alerts</span>
            </div>
            <div className="space-y-2">
              <div className="h-7 w-full rounded-lg bg-white/10" />
              <div className="h-7 w-full rounded-lg bg-white/10" />
              <div className="h-7 w-4/5 rounded-lg bg-white/10" />
            </div>
          </div>
        </div>
        <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-[#0D1017] via-[#0D1017]/55 to-transparent flex items-end justify-center pb-4 px-4">
          <span className="inline-flex items-center gap-1.5 rounded-full border border-[#FFD166]/45 bg-[#051329]/95 px-4 py-1.5 text-[11px] font-bold uppercase tracking-[0.16em] text-[#FFD166] shadow-lg">
            <Lock className="h-3.5 w-3.5" />
            <span>
              {nativeReady && isNative
                ? "Ausbildung OS Pro · Enrolled Members Only"
                : "Pro Preview · Choose a Plan Below to Unlock"}
            </span>
          </span>
        </div>
      </div>

      {/* Native Android/iOS Reader App Compliance: NEVER display external payment links/prices in-app */}
      {nativeReady && isNative ? (
        <div className="rounded-2xl border border-white/15 bg-white text-slate-900 p-1">
          <ReaderAppNotice compact isAuthenticated={Boolean(userEmail)} />
        </div>
      ) : nativeReady ? (
        /* 2 Web-Only Tier Cards */
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Tier 1: Pro OS Self-Serve (₹14,999) */}
          <article className="rounded-2xl border border-white/15 bg-[#0A1628]/85 p-5 sm:p-6 flex flex-col justify-between gap-5">
            <div className="space-y-4">
              <div className="flex items-center justify-between gap-2">
                <span className="rounded-full border border-white/15 bg-white/5 px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-[0.14em] text-slate-300">
                  Self-Serve OS
                </span>
                <span className="text-[11px] font-semibold text-slate-400">Instant Access</span>
              </div>

              <div>
                <h3 className="text-lg font-bold text-white">Pro OS Self-Serve</h3>
                <div className="mt-1 flex items-baseline gap-2">
                  <span className="text-2xl sm:text-3xl font-extrabold text-[#FFD166]">
                    ₹14,999
                  </span>
                  <span className="text-xs text-slate-400">one-time unlock</span>
                </div>
              </div>

              <ul className="space-y-2 text-xs text-slate-300">
                <li className="flex items-start gap-2">
                  <Check className="h-4 w-4 text-[#FFD166] shrink-0 mt-0.5" />
                  <span>Unlimited DIN 5008 Lebenslauf &amp; field-tailored Anschreiben PDF exports</span>
                </li>
                <li className="flex items-start gap-2">
                  <Check className="h-4 w-4 text-[#FFD166] shrink-0 mt-0.5" />
                  <span>Application &amp; Interview CRUD Tracker with 14-day Follow-Up alerts</span>
                </li>
                <li className="flex items-start gap-2">
                  <Check className="h-4 w-4 text-[#FFD166] shrink-0 mt-0.5" />
                  <span>Top 12 German HR Interview Questions &amp; Hinglish answer playbook</span>
                </li>
                <li className="flex items-start gap-2">
                  <Check className="h-4 w-4 text-[#FFD166] shrink-0 mt-0.5" />
                  <span>Cloud-synced Document Readiness Checklist included</span>
                </li>
              </ul>
            </div>

            <Link
              href={buildUnlockPricingHref("ausbildung-os-pro", "Pro OS Self-Serve", "₹14,999")}
              className="w-full inline-flex items-center justify-center gap-2 rounded-xl border border-[#FFD166]/55 bg-[#FFD166]/10 px-4 py-3 text-xs font-extrabold uppercase tracking-[0.14em] text-[#FFD166] hover:bg-[#FFD166] hover:text-[#0A1628] transition-colors"
            >
              <span>Book &amp; Unlock via GTF Portal</span>
              <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          </article>

          {/* Tier 2: GTF Verified Fast-Track (₹45,000) */}
          <article className="rounded-2xl border border-[#FFD166]/65 bg-gradient-to-br from-[#FFD166]/15 via-[#0A1628] to-[#0D1017] p-5 sm:p-6 flex flex-col justify-between gap-5 shadow-[0_0_32px_-10px_rgba(255,209,102,0.35)]">
            <div className="space-y-4">
              <div className="flex items-center justify-between gap-2">
                <span className="inline-flex items-center gap-1 rounded-full border border-[#FFD166]/45 bg-[#FFD166]/20 px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-[0.14em] text-[#FFD166]">
                  <Sparkles className="h-3 w-3" />
                  <span>Berlin Mentorship</span>
                </span>
                <span className="text-[11px] font-semibold text-emerald-300">Fast-Track</span>
              </div>

              <div>
                <h3 className="text-lg font-bold text-white">GTF Verified Fast-Track</h3>
                <div className="mt-1 flex items-baseline gap-2">
                  <span className="text-2xl sm:text-3xl font-extrabold text-[#FFD166]">
                    ₹45,000
                  </span>
                  <span className="text-xs text-slate-300">full OS + Berlin HQ guidance</span>
                </div>
              </div>

              <ul className="space-y-2 text-xs text-slate-200">
                <li className="flex items-start gap-2">
                  <Check className="h-4 w-4 text-[#FFD166] shrink-0 mt-0.5" />
                  <span>Everything in Pro OS Self-Serve unlocked immediately</span>
                </li>
                <li className="flex items-start gap-2">
                  <Check className="h-4 w-4 text-[#FFD166] shrink-0 mt-0.5" />
                  <span>1-on-1 GTF Berlin audit of your Lebenslauf, Anschreiben &amp; Anerkennung</span>
                </li>
                <li className="flex items-start gap-2">
                  <Check className="h-4 w-4 text-[#FFD166] shrink-0 mt-0.5" />
                  <span>Live mock HR interviews tailored to German hospital &amp; IHK panels</span>
                </li>
                <li className="flex items-start gap-2">
                  <Check className="h-4 w-4 text-[#FFD166] shrink-0 mt-0.5" />
                  <span>Guided employer shortlisting &amp; § 16a CSP Visa dossier prep</span>
                </li>
              </ul>
            </div>

            <Link
              href={buildUnlockPricingHref(
                "ausbildung-os-fast-track",
                "GTF Verified Fast-Track",
                "₹45,000",
              )}
              className="w-full inline-flex items-center justify-center gap-2 rounded-xl bg-[#FFD166] px-4 py-3 text-xs font-extrabold uppercase tracking-[0.14em] text-[#0A1628] shadow-lg transition hover:bg-amber-300"
            >
              <span>Book &amp; Unlock via GTF Portal</span>
              <ArrowRight className="h-3.5 w-3.5 text-[#0A1628]" />
            </Link>
          </article>
        </div>
      ) : null}
    </div>
  );
}
