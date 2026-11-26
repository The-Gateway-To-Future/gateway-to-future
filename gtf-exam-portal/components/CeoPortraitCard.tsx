"use client";

import React from "react";
import Link from "next/link";
import { ArrowUpRight, Award, Building2, CalendarCheck2, Mail, MapPin, ShieldCheck } from "lucide-react";
import { BRAND } from "@/lib/config";
import { WebOnly } from "@/components/ReaderAppNotice";

interface CeoPortraitCardProps {
  compact?: boolean;
}

/**
 * Institutional Gateway To Future Advisory & Mentorship Desk card.
 * Keeps the exported symbol `CeoPortraitCard` (plus `AdvisoryDeskCard` alias)
 * while presenting neutral institutional branding and routing consultations
 * through the paid appointment booking flow.
 */
export function CeoPortraitCard({ compact = false }: CeoPortraitCardProps) {
  if (compact) {
    return (
      <div className="rounded-2xl border border-slate-200 bg-white p-5 sm:p-6 shadow-sm flex flex-col sm:flex-row items-center sm:items-start gap-5">
        <div className="relative h-24 w-24 sm:h-28 sm:w-28 shrink-0 overflow-hidden rounded-2xl border border-slate-200 bg-slate-900 shadow-xs flex items-center justify-center p-2">
          <img
            src="/gtf-logo.jpg"
            alt="Gateway To Future — Berlin & India Advisory Team"
            className="h-full w-full rounded-xl object-cover"
          />
        </div>
        <div className="flex-1 text-center sm:text-left space-y-2">
          <div className="inline-flex items-center gap-1.5 rounded-full border border-amber-300 bg-amber-50 px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-[0.16em] text-amber-900">
            <ShieldCheck className="h-3 w-3 text-amber-700" />
            <span>{BRAND.mentorshipDeskTitle}</span>
          </div>
          <div>
            <h3 className="text-lg font-bold tracking-tight text-slate-900">
              {BRAND.advisoryTeamName}
            </h3>
            <p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-600">
              {BRAND.advisoryTeamTitle}
            </p>
          </div>
          <p className="text-xs leading-relaxed text-slate-600">
            Structured Berlin &amp; India mentorship across German CEFR A1–C1 certification, healthcare &amp; academic relocation, and public university admissions from {BRAND.headquarters}.
          </p>
          <div className="flex flex-wrap items-center justify-center sm:justify-start gap-3 pt-1">
            <WebOnly
              nativeFallback={
                <Link
                  href="/about"
                  className="inline-flex items-center gap-1.5 rounded-xl bg-slate-900 px-3.5 py-2 text-[11px] font-semibold uppercase tracking-[0.14em] text-white hover:bg-slate-800 transition"
                >
                  <Building2 className="h-3.5 w-3.5" />
                  <span>About Advisory Team</span>
                </Link>
              }
            >
              <Link
                href="/pricing#consultation-booking"
                className="inline-flex items-center gap-1.5 rounded-xl bg-slate-900 px-3.5 py-2 text-[11px] font-semibold uppercase tracking-[0.14em] text-white hover:bg-slate-800 transition"
              >
                <CalendarCheck2 className="h-3.5 w-3.5" />
                <span>Book Paid Consultation</span>
              </Link>
            </WebOnly>
            <Link
              href="/about"
              className="inline-flex items-center gap-1 text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-700 hover:text-slate-950 transition"
            >
              <span>About GTF</span>
              <ArrowUpRight className="h-3.5 w-3.5" />
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <article className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">
      <div className="grid grid-cols-1 lg:grid-cols-12 items-stretch">
        {/* Institutional Emblem Column */}
        <div className="lg:col-span-5 relative bg-gradient-to-br from-slate-950 via-slate-900 to-[#0A3358] min-h-[300px] sm:min-h-[360px] p-8 flex flex-col justify-between text-white">
          <div className="inline-flex items-center gap-2 self-start rounded-full border border-white/15 bg-white/10 px-3 py-1 text-[10px] font-bold uppercase tracking-[0.18em] text-amber-200">
            <Building2 className="h-3.5 w-3.5" />
            <span>Berlin Headquarters</span>
          </div>

          <div className="flex flex-col items-center text-center space-y-4 my-6">
            <div className="h-24 w-24 overflow-hidden rounded-2xl border border-white/20 bg-white/10 p-1.5 shadow-lg">
              <img
                src="/gtf-logo.jpg"
                alt="Gateway To Future Institutional Crest"
                className="h-full w-full rounded-xl object-cover"
              />
            </div>
            <div className="space-y-1">
              <p className="text-xl font-bold tracking-tight">{BRAND.advisoryTeamName}</p>
              <p className="text-xs font-semibold uppercase tracking-[0.16em] text-amber-200">
                {BRAND.advisoryTeamTitle}
              </p>
            </div>
          </div>

          <div className="rounded-2xl border border-white/15 bg-white/5 px-4 py-3 text-[11px] text-slate-200 flex items-center gap-2.5">
            <MapPin className="h-4 w-4 text-amber-300 shrink-0" />
            <span>{BRAND.headquarters}, Germany</span>
          </div>
        </div>

        {/* Institutional Advisory Details Column */}
        <div className="lg:col-span-7 p-6 sm:p-10 flex flex-col justify-between space-y-6">
          <div className="space-y-4">
            <div className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-700">
              <Award className="h-3.5 w-3.5 text-amber-600" />
              <span>{BRAND.mentorshipDeskTitle} · Berlin HQ</span>
            </div>

            <div className="space-y-1">
              <h3 className="text-2xl sm:text-3xl font-bold tracking-tight text-slate-900">
                {BRAND.advisoryTeamName}
              </h3>
              <p className="text-sm font-semibold uppercase tracking-[0.14em] text-amber-700">
                {BRAND.advisoryTeamTitle}
              </p>
            </div>

            <p className="text-sm leading-relaxed text-slate-600">
              Gateway To Future coordinates German language mastery (CEFR A1–C1), Goethe/telc exam preparation, anabin &amp; APS credential checks, Studienkolleg/public university admissions, and healthcare Ausbildung guidance directly between Berlin and India. Direct Berlin Desk phone &amp; WhatsApp support is unlocked upon confirmed paid appointment booking.
            </p>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
              <div className="rounded-2xl border border-slate-200 bg-slate-50 p-3.5">
                <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-slate-500">
                  Academic &amp; Language Mastery
                </p>
                <p className="mt-1 text-xs font-semibold text-slate-900">
                  CEFR A1–C1 Curriculum · Goethe, telc &amp; TestDaF Methodology
                </p>
              </div>
              <div className="rounded-2xl border border-slate-200 bg-slate-50 p-3.5">
                <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-slate-500">
                  Berlin Healthcare &amp; Relocation
                </p>
                <p className="mt-1 text-xs font-semibold text-slate-900">
                  § 81a Mobility, Pflege Anerkennung &amp; Public University Pathways
                </p>
              </div>
            </div>
          </div>

          <div className="border-t border-slate-100 pt-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="space-y-1 text-xs text-slate-600">
              <div className="flex items-center gap-2">
                <MapPin className="h-3.5 w-3.5 text-slate-400 shrink-0" />
                <span>{BRAND.headquarters}</span>
              </div>
              <div className="flex items-center gap-2">
                <Mail className="h-3.5 w-3.5 text-slate-400 shrink-0" />
                <a
                  href={`mailto:${BRAND.supportEmail}`}
                  className="font-medium text-slate-800 hover:underline"
                >
                  {BRAND.supportEmail}
                </a>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2.5">
              <WebOnly
                nativeFallback={
                  <Link
                    href="/about"
                    className="inline-flex items-center gap-2 rounded-xl bg-slate-900 px-5 py-2.5 text-xs font-semibold uppercase tracking-[0.16em] text-white hover:bg-slate-800 transition"
                  >
                    <Building2 className="h-3.5 w-3.5" />
                    <span>About Advisory Team</span>
                  </Link>
                }
              >
                <Link
                  href="/pricing#consultation-booking"
                  className="inline-flex items-center gap-2 rounded-xl bg-slate-900 px-5 py-2.5 text-xs font-semibold uppercase tracking-[0.16em] text-white hover:bg-slate-800 transition"
                >
                  <CalendarCheck2 className="h-3.5 w-3.5" />
                  <span>Book Paid Consultation</span>
                </Link>
              </WebOnly>
            </div>
          </div>
        </div>
      </div>
    </article>
  );
}

export const AdvisoryDeskCard = CeoPortraitCard;
