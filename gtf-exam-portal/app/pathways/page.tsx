"use client";

import Link from "next/link";
import { Navbar } from "@/components/Navbar";
import { BreadcrumbHeader, HEADER_IMAGES } from "@/components/BreadcrumbHeader";
import { SubdivisionCard, type SubdivisionTheme } from "@/components/SubdivisionCard";
import { BottomNavigationBar } from "@/components/BottomNavigationBar";
import { WebOnly } from "@/components/ReaderAppNotice";
import { BRAND } from "@/lib/config";

interface PlanStage {
  indexLabel: string;
  title: string;
  subtitle: string;
  href: string;
  ctaLabel: string;
  theme: SubdivisionTheme;
  imageUrl: string;
  badge: string;
  metaItems: string[];
}

const PLAN_STAGES: PlanStage[] = [
  {
    indexLabel: "STAGE 01 · A1 ANFÄNGER",
    title: "German A1 — Foundations",
    subtitle:
      "Master core greetings, sentence structure, everyday interactions, and Start Deutsch 1 exam format.",
    href: "/academy/a1",
    ctaLabel: "Open A1 Folder",
    theme: "academy",
    imageUrl: HEADER_IMAGES.a1,
    badge: "CEFR A1",
    metaItems: ["Vocabulary", "Grammar", "Modelltests"],
  },
  {
    indexLabel: "STAGE 02 · A2 GRUNDLAGEN",
    title: "German A2 — Routine & Workplace",
    subtitle:
      "Build past-tense fluency (Perfekt & Präteritum), workplace routines, and Berlin apartment communication.",
    href: "/academy/a2",
    ctaLabel: "Open A2 Folder",
    theme: "academy",
    imageUrl: HEADER_IMAGES.a2,
    badge: "CEFR A2",
    metaItems: ["Alltag & Beruf", "Hören Lab", "Goethe A2"],
  },
  {
    indexLabel: "STAGE 03 · B1 MITTELSTUFE",
    title: "German B1 — Visa & Ausbildung Gateway",
    subtitle:
      "Core milestone for Ausbildung contracts and German visa clearance across Goethe/telc B1 and DTZ modules.",
    href: "/academy/b1",
    ctaLabel: "Open B1 Folder",
    theme: "academy",
    imageUrl: HEADER_IMAGES.b1,
    badge: "ACTIVE TARGET",
    metaItems: ["Ausbildung Ready", "4 Subdivisions", "AI Sprechen"],
  },
  {
    indexLabel: "STAGE 04 · B2 GUTE MITTELSTUFE",
    title: "German B2 — 122 Säulen & Anerkennung",
    subtitle:
      "Master the 122 Säulen grammar architecture, complex reading comprehension, and professional recognition.",
    href: "/academy/b2",
    ctaLabel: "Open B2 Folder",
    theme: "grammar",
    imageUrl: HEADER_IMAGES.b2,
    badge: "122 SÄULEN",
    metaItems: ["Grammar Pillars", "B2 Hören", "telc B2"],
  },
  {
    indexLabel: "STAGE 05 · UNIVERSITY BRIDGE",
    title: "Studienkolleg Aufnahmeprüfung",
    subtitle:
      "Target T-Kurs, M-Kurs, W-Kurs, and G-Kurs public university entrance exams with C-Tests and formula suites.",
    href: "/studienkolleg",
    ctaLabel: "Open Studienkolleg",
    theme: "studienkolleg",
    imageUrl: HEADER_IMAGES.studienkolleg,
    badge: "T · M · W · G-KURS",
    metaItems: ["TU Berlin", "LMU Munich", "C-Test Archive"],
  },
  {
    indexLabel: "STAGE 06 · CLINICAL RECOGNITION",
    title: "Fachsprache Pflege & Hospital Placement",
    subtitle:
      "Start B2 Anerkennung & Fachsprache modules today; the dedicated ISBAR ward handover simulator and FSP hospital cases are rolling out next.",
    href: "/pflege",
    ctaLabel: "View Pflege Status",
    theme: "pflege",
    imageUrl: HEADER_IMAGES.pflege,
    badge: "B2 LIVE · ISBAR PREVIEW",
    metaItems: ["B2 Track Live", "ISBAR Coming Soon", "Charité / Vivantes"],
  },
];

export default function PathwaysPlanPage() {
  return (
    <div className="min-h-screen flex flex-col bg-slate-50 text-slate-900">
      <Navbar />

      <main className="flex-1 pb-24 lg:pb-12">
        <BreadcrumbHeader
          breadcrumbs={[
            { label: "Home", href: "/dashboard" },
            { label: "My Plan" },
          ]}
          eyebrow="MY PLAN · GUIDED PROGRESSION"
          title="Your Germany Roadmap."
          subtitle="Every milestone navigates cleanly to its own dedicated folder — from A1 fundamentals to Studienkolleg admission and German hospital careers."
          theme="hub"
          backgroundImage={HEADER_IMAGES.hub}
          backHref="/dashboard"
          backLabel="Hub"
        />

        <section className="mx-auto max-w-6xl px-4 sm:px-8 py-12 space-y-8">
          <div className="flex flex-wrap items-end justify-between gap-4 border-b border-slate-200 pb-4">
            <div className="space-y-1">
              <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-slate-500">
                ROADMAP MILESTONES
              </p>
              <h2 className="text-2xl sm:text-3xl font-light tracking-tight text-slate-900">
                6 Sequential Stages to Germany
              </h2>
            </div>
            <WebOnly
              nativeFallback={
                <Link
                  href="/about"
                  className="inline-flex items-center gap-2 rounded-xl border border-slate-300 bg-white px-4 py-2 text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-800 shadow-sm hover:border-slate-400 transition"
                >
                  <span>Advisory Team Info</span>
                </Link>
              }
            >
              <Link
                href="/pricing#consultation-booking"
                className="inline-flex items-center gap-2 rounded-xl border border-slate-300 bg-white px-4 py-2 text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-800 shadow-sm hover:border-slate-400 transition"
              >
                <span>Book Paid Consultation</span>
              </Link>
            </WebOnly>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {(PLAN_STAGES || []).map((stage) => (
              <SubdivisionCard
                key={stage.indexLabel}
                indexLabel={stage.indexLabel}
                title={stage.title}
                subtitle={stage.subtitle}
                href={stage.href}
                ctaLabel={stage.ctaLabel}
                theme={stage.theme}
                imageUrl={stage.imageUrl}
                badge={stage.badge}
                metaItems={stage.metaItems}
              />
            ))}
          </div>
        </section>
      </main>

      <footer className="border-t border-slate-200 bg-white py-10 pb-24 lg:pb-10 px-4 sm:px-8">
        <div className="mx-auto max-w-6xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 text-xs text-slate-500">
          <div className="space-y-1">
            <p className="font-semibold tracking-wide text-slate-900">
              {BRAND.name} · {BRAND.headquarters}
            </p>
            <p className="text-[11px] text-slate-600">
              {BRAND.name} — {BRAND.advisoryTeamTitle} · {BRAND.supportEmail}
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-6 font-semibold uppercase tracking-[0.14em] text-[11px]">
            <Link href="/about" className="text-slate-600 hover:text-slate-900 transition">
              About
            </Link>
            <Link href="/dashboard" className="text-slate-600 hover:text-slate-900 transition">
              Hub
            </Link>
            <Link href="/academy" className="text-slate-600 hover:text-slate-900 transition">
              Academy
            </Link>
            <Link href="/studienkolleg" className="text-slate-600 hover:text-slate-900 transition">
              Studienkolleg
            </Link>
            <Link href="/pflege" className="text-slate-600 hover:text-slate-900 transition">
              Pflege
            </Link>
          </div>
        </div>
      </footer>

      <BottomNavigationBar />
      
    </div>
  );
}
