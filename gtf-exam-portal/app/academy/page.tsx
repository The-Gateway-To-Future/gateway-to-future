import Link from "next/link";
import { Navbar } from "@/components/Navbar";
import { BreadcrumbHeader } from "@/components/BreadcrumbHeader";
import { SubdivisionCard } from "@/components/SubdivisionCard";
import { BottomNavigationBar } from "@/components/BottomNavigationBar";
import { BRAND, CEFR_LEVELS, LEVEL_META, type CefrLevel } from "@/lib/config";

const LEVEL_CARDS: {
  level: CefrLevel;
  indexLabel: string;
  badge: string;
  metaItems: string[];
}[] = [
  {
    level: "a1",
    indexLabel: "LEVEL 01 · ANFÄNGER",
    badge: "START DEUTSCH 1",
    metaItems: ["4 Subdivisions", "Foundations", "Audio Lab"],
  },
  {
    level: "a2",
    indexLabel: "LEVEL 02 · GRUNDLAGEN",
    badge: "ELEMENTAR A2",
    metaItems: ["4 Subdivisions", "Alltag & Beruf", "Modelltests"],
  },
  {
    level: "b1",
    indexLabel: "LEVEL 03 · MITTELSTUFE",
    badge: "VISA & AUSBILDUNG",
    metaItems: ["4 Subdivisions", "Goethe / telc B1", "AI Sprechen"],
  },
  {
    level: "b2",
    indexLabel: "LEVEL 04 · GUTE MITTELSTUFE",
    badge: "122 SÄULEN · B2",
    metaItems: ["4 Subdivisions", "122 Säulen Grammar", "Professional B2"],
  },
];

export default function AcademyPage() {
  return (
    <div className="min-h-screen flex flex-col bg-slate-50 text-slate-900">
      <Navbar activeDivision="sprachakademie" />

      <main className="flex-1 pb-24 lg:pb-12">
        <BreadcrumbHeader
          breadcrumbs={[
            { label: "Home", href: "/dashboard" },
            { label: "Language Academy" },
          ]}
          eyebrow="DIVISION 01 · GERMAN LANGUAGE ACADEMY"
          title="Select Your CEFR Level."
          subtitle="Drill down into your target German level to access structured Vocabulary Decks, 122 Säulen Grammar Pillars, Hören & Lesen Labs, and Official Modelltests."
          theme="academy"
          backHref="/dashboard"
          backLabel="Hub"
        />

        <section className="mx-auto max-w-6xl px-4 sm:px-8 py-12 space-y-8">
          <div className="flex flex-wrap items-end justify-between gap-4 border-b border-slate-200 pb-4">
            <div className="space-y-1">
              <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-slate-500">
                LEVEL 02 · CEFR TRACK SELECTION
              </p>
              <h2 className="text-2xl sm:text-3xl font-bold tracking-tight text-slate-900">
                {CEFR_LEVELS.length} Certified Language Levels
              </h2>
            </div>
            <span className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">
              Goethe · telc · DTZ
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {(LEVEL_CARDS || []).map((item) => {
              const meta = LEVEL_META[item.level];
              return (
                <SubdivisionCard
                  key={item.level}
                  indexLabel={item.indexLabel}
                  title={`German ${meta.label} — ${meta.cefr}`}
                  subtitle={`${meta.description}. Exam alignment: ${meta.exams}.`}
                  href={`/academy/${item.level}`}
                  ctaLabel={`Open ${meta.label} Subdivisions`}
                  theme="academy"
                  badge={item.badge}
                  metaItems={item.metaItems}
                />
              );
            })}
          </div>
        </section>
      </main>

      <footer className="border-t border-slate-200 bg-white py-10 pb-24 lg:pb-10 px-4 sm:px-8">
        <div className="mx-auto max-w-6xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 text-xs text-slate-500">
          <p className="font-semibold tracking-wide text-slate-900">
            {BRAND.name} · {BRAND.headquarters}
          </p>
          <div className="flex flex-wrap items-center gap-6 font-semibold uppercase tracking-[0.14em] text-[11px]">
            <Link href="/dashboard" className="text-slate-600 hover:text-slate-900 transition">
              Hub
            </Link>
            <Link href="/studienkolleg" className="text-slate-600 hover:text-slate-900 transition">
              Studienkolleg
            </Link>
            <Link href="/pflege" className="text-slate-600 hover:text-slate-900 transition">
              Pflege
            </Link>
            <Link href="/pathways" className="text-slate-600 hover:text-slate-900 transition">
              My Plan
            </Link>
          </div>
        </div>
      </footer>

      <BottomNavigationBar />
      
    </div>
  );
}
