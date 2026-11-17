"use client";

import Link from "next/link";
import { Navbar } from "@/components/Navbar";
import { BreadcrumbHeader } from "@/components/BreadcrumbHeader";
import { SubdivisionCard, type SubdivisionTheme } from "@/components/SubdivisionCard";
import { BottomNavigationBar } from "@/components/BottomNavigationBar";
import { BRAND } from "@/lib/config";

interface PlanStage {
  indexLabel: string;
  title: string;
  subtitle: string;
  href: string;
  ctaLabel: string;
  theme: SubdivisionTheme;
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
    badge: "T · M · W · G-KURS",
    metaItems: ["TU Berlin", "LMU Munich", "C-Test Archive"],
  },
  {
    indexLabel: "STAGE 06 · CLINICAL RECOGNITION",
    title: "Fachsprache Pflege & Hospital Placement",
    subtitle:
      "Prepare for hospital ward handovers (ISBAR), Patientenaufnahme, and nursing or physician Anerkennung.",
    href: "/pflege",
    ctaLabel: "Open Pflege Hub",
    theme: "pflege",
    badge: "HOSPITAL CAREERS",
    metaItems: ["ISBAR Protocol", "FSP Cases", "Charité / Vivantes"],
  },
];

export default function PathwaysPlanPage() {
  return (
    <div className="min-h-screen flex flex-col bg-[#07090E] text-white">
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
          backHref="/dashboard"
          backLabel="Hub"
        />

        <section className="mx-auto max-w-6xl px-4 sm:px-8 py-12 space-y-8">
          <div className="flex flex-wrap items-end justify-between gap-4 border-b border-white/10 pb-4">
            <div className="space-y-1">
              <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-white/50">
                ROADMAP MILESTONES
              </p>
              <h2 className="text-2xl sm:text-3xl font-light tracking-tight text-white">
                6 Sequential Stages to Germany
              </h2>
            </div>
            <a
              href={BRAND.whatsappUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 rounded-xl border border-white/15 bg-white/[0.04] px-4 py-2 text-[11px] font-semibold uppercase tracking-[0.16em] text-white/85 hover:border-white/30 transition"
            >
              <span>Consult Founder Mentorship</span>
            </a>
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
                badge={stage.badge}
                metaItems={stage.metaItems}
              />
            ))}
          </div>
        </section>
      </main>

      <footer className="border-t border-white/10 bg-[#07090E] py-10 pb-24 lg:pb-10 px-4 sm:px-8">
        <div className="mx-auto max-w-6xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 text-xs text-white/50">
          <p className="font-medium tracking-wide text-white/80">
            {BRAND.name} · {BRAND.headquarters}
          </p>
          <div className="flex flex-wrap items-center gap-6 font-medium uppercase tracking-[0.14em] text-[11px]">
            <Link href="/dashboard" className="hover:text-white transition">
              Hub
            </Link>
            <Link href="/academy" className="hover:text-white transition">
              Academy
            </Link>
            <Link href="/studienkolleg" className="hover:text-white transition">
              Studienkolleg
            </Link>
            <Link href="/pflege" className="hover:text-white transition">
              Pflege
            </Link>
          </div>
        </div>
      </footer>

      <BottomNavigationBar />
      
    </div>
  );
}
