"use client";

import React, { useState } from "react";
import Link from "next/link";
import { ArrowUpRight, Award, Mail, MapPin, Phone, ShieldCheck } from "lucide-react";
import { BRAND } from "@/lib/config";

interface CeoPortraitCardProps {
  compact?: boolean;
}

/**
 * Single executive portrait component showcasing Sarbjit Kour exclusively
 * as Founder & CEO, Gateway To Future.
 */
export function CeoPortraitCard({ compact = false }: CeoPortraitCardProps) {
  const [imgSrc, setImgSrc] = useState<string>("/sarbjit-ceo.jpg");

  const handleImageError = () => {
    if (imgSrc !== "/assets/images/sarbjit-ceo.jpg") {
      setImgSrc("/assets/images/sarbjit-ceo.jpg");
    }
  };

  if (compact) {
    return (
      <div className="rounded-2xl border border-slate-200 bg-white p-5 sm:p-6 shadow-sm flex flex-col sm:flex-row items-center sm:items-start gap-5">
        <div className="relative h-24 w-24 sm:h-28 sm:w-28 shrink-0 overflow-hidden rounded-2xl border border-slate-200 bg-slate-100 shadow-xs">
          <img
            src={imgSrc}
            onError={handleImageError}
            alt="Sarbjit Kour — Founder & CEO, Gateway To Future"
            className="h-full w-full object-cover object-top"
          />
        </div>
        <div className="flex-1 text-center sm:text-left space-y-2">
          <div className="inline-flex items-center gap-1.5 rounded-full border border-amber-300 bg-amber-50 px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-[0.16em] text-amber-900">
            <ShieldCheck className="h-3 w-3 text-amber-700" />
            <span>Executive Leadership</span>
          </div>
          <div>
            <h3 className="text-lg font-bold tracking-tight text-slate-900">
              {BRAND.founderName}
            </h3>
            <p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-600">
              {BRAND.founderTitle}
            </p>
          </div>
          <p className="text-xs leading-relaxed text-slate-600">
            Direct Berlin-based mentorship across German C1/B2 certification, healthcare &amp; academic relocation, and public university admissions from {BRAND.headquarters}.
          </p>
          <div className="flex flex-wrap items-center justify-center sm:justify-start gap-3 pt-1">
            <a
              href={BRAND.whatsappUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 rounded-xl bg-slate-900 px-3.5 py-2 text-[11px] font-semibold uppercase tracking-[0.14em] text-white hover:bg-slate-800 transition"
            >
              <Phone className="h-3 w-3" />
              <span>Berlin Desk</span>
            </a>
            <Link
              href="/about"
              className="inline-flex items-center gap-1 text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-700 hover:text-slate-950 transition"
            >
              <span>Leadership Profile</span>
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
        {/* Portrait Column */}
        <div className="lg:col-span-5 relative bg-slate-100 min-h-[340px] sm:min-h-[420px]">
          <img
            src={imgSrc}
            onError={handleImageError}
            alt="Sarbjit Kour — Founder & CEO, Gateway To Future"
            className="h-full w-full object-cover object-top"
          />
          <div className="pointer-events-none absolute inset-x-0 bottom-0 h-28 bg-gradient-to-t from-slate-950/75 via-slate-950/25 to-transparent lg:hidden" />
          <div className="absolute bottom-4 left-4 right-4 lg:hidden text-white">
            <p className="text-lg font-bold tracking-tight">{BRAND.founderName}</p>
            <p className="text-xs font-medium text-amber-200">{BRAND.founderTitle}</p>
          </div>
        </div>

        {/* Executive Bio & Credentials Column */}
        <div className="lg:col-span-7 p-6 sm:p-10 flex flex-col justify-between space-y-6">
          <div className="space-y-4">
            <div className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-700">
              <Award className="h-3.5 w-3.5 text-amber-600" />
              <span>Sole Executive Leadership · Berlin HQ</span>
            </div>

            <div className="space-y-1">
              <h3 className="text-2xl sm:text-3xl font-bold tracking-tight text-slate-900">
                {BRAND.founderName}
              </h3>
              <p className="text-sm font-semibold uppercase tracking-[0.14em] text-amber-700">
                {BRAND.founderTitle}
              </p>
            </div>

            <p className="text-sm leading-relaxed text-slate-600">
              Sarbjit Kour leads Gateway To Future from Berlin, Germany as Founder &amp; CEO. Fluent in German (C1), English (C1), Punjabi, and Hindi, she brings direct hands-on experience inside the German healthcare system, Pflegefachkraft training, and Berlin institutional administration to guide international candidates from initial language mastery through hospital placement, university admission, and post-arrival settlement.
            </p>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
              <div className="rounded-2xl border border-slate-200 bg-slate-50 p-3.5">
                <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-slate-500">
                  Academic &amp; Language Mastery
                </p>
                <p className="mt-1 text-xs font-semibold text-slate-900">
                  German C1 &amp; English C1 Master Coach · Goethe &amp; telc Methodology
                </p>
              </div>
              <div className="rounded-2xl border border-slate-200 bg-slate-50 p-3.5">
                <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-slate-500">
                  Berlin Healthcare &amp; Relocation
                </p>
                <p className="mt-1 text-xs font-semibold text-slate-900">
                  German Healthcare Operations, § 81a Mobility &amp; University Pathways
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
              <a
                href={BRAND.whatsappUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 rounded-xl bg-slate-900 px-5 py-2.5 text-xs font-semibold uppercase tracking-[0.16em] text-white hover:bg-slate-800 transition"
              >
                <Phone className="h-3.5 w-3.5" />
                <span>Direct Consultation</span>
              </a>
            </div>
          </div>
        </div>
      </div>
    </article>
  );
}
