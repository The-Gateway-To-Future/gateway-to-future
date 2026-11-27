import Link from "next/link";
import { Ban, Sigma } from "lucide-react";
import { Navbar } from "@/components/Navbar";
import { BreadcrumbHeader, HEADER_IMAGES } from "@/components/BreadcrumbHeader";
import { SubdivisionCard } from "@/components/SubdivisionCard";
import { CompactTopicList } from "@/components/CompactTopicRow";
import { MathText } from "@/components/MathText";
import { BottomNavigationBar } from "@/components/BottomNavigationBar";
import { StudienkollegDrillsWorkspace } from "@/components/StudienkollegDrillsWorkspace";
import { BRAND, LEVEL_META } from "@/lib/config";
import type { SubdivisionTopicItem } from "@/lib/subdivisions";

const STK_TRACK_CARDS = [
  {
    key: "m_kurs" as const,
    indexLabel: "TRACK 01 · MEDIZIN & BIOLOGIE",
    badge: "M-KURS · MEDIZIN",
    metaItems: ["Biologie", "Chemie", "Mathematik & C-Test"],
  },
  {
    key: "t_kurs" as const,
    indexLabel: "TRACK 02 · TECHNIK & MINT",
    badge: "T-KURS · TECHNIK",
    metaItems: ["Mathematik", "Physik & Mechanik", "Deutsch C-Test"],
  },
  {
    key: "w_kurs" as const,
    indexLabel: "TRACK 03 · WIRTSCHAFT & BWL",
    badge: "W-KURS · WIRTSCHAFT",
    metaItems: ["VWL & BWL", "Wirtschaftsmathe", "Deutsch C-Test"],
  },
  {
    key: "g_kurs" as const,
    indexLabel: "TRACK 04 · GEISTESWISSENSCHAFTEN",
    badge: "G-KURS · HUMANITIES",
    metaItems: ["Geschichte", "Verfassung (GG)", "Literatur & C-Test"],
  },
];

const CORE_STK_PRACTICE_SETS: SubdivisionTopicItem[] = [
  {
    id: "wb-factory-stk-math-batch1",
    indexLabel: "SET 01 · MATHEMATIK",
    title: "Aufnahmeprüfung Mathematik — Analysis, Vektoren & Gleichungssysteme",
    subtitle: "8 prüfungsnahe Mathematik-Aufgaben (M- & T-Kurs) mit Schritt-für-Schritt-Musterlösungen ohne Taschenrechner.",
    badge: "8 TASKS",
    theme: "studienkolleg",
    href: "/academy/t_kurs/02-grammar/wb-factory-stk-math-batch1",
    ctaLabel: "Open Set",
    metaItems: ["8 Tasks", "Ohne Taschenrechner"],
    kind: "workbook",
    workbookId: "wb-factory-stk-math-batch1",
  },
  {
    id: "stk-math-ctest-kompakt-01",
    indexLabel: "SET 02 · KOMPAKT-TRAINING",
    title: "Studienkolleg C-Test & Fachmathematik — Kompakt-Training Set #1",
    subtitle: "TU-Berlin-Standard C-Test kombiniert mit Algebra, Logarithmen, Geraden & Exponentialwachstum.",
    badge: "6 TASKS",
    theme: "studienkolleg",
    href: "/academy/t_kurs/02-grammar/stk-math-ctest-kompakt-01",
    ctaLabel: "Open Set",
    metaItems: ["6 Tasks", "C-Test + Mathe"],
    kind: "workbook",
    workbookId: "stk-math-ctest-kompakt-01",
  },
  {
    id: "wb-factory-stk-ctest-batch1",
    indexLabel: "SET 03 · DEUTSCH C-TEST",
    title: "Aufnahmeprüfung Deutsch — Authentischer C-Test & Wissenschaftssprache",
    subtitle: "Akademischer Lückentext, Partizipialattribute & Nominalstil für M-, T-, W- und G-Kurs.",
    badge: "8 TASKS",
    theme: "grammar",
    href: "/academy/m_kurs/02-grammar/wb-factory-stk-ctest-batch1",
    ctaLabel: "Open C-Test",
    metaItems: ["8 Tasks", "Wissenschaftssprache"],
    kind: "workbook",
    workbookId: "wb-factory-stk-ctest-batch1",
  },
  {
    id: "stk-workspace",
    indexLabel: "SET 04 · FORMELSAMMLUNG",
    title: "Formelsammlung & Lösungsbeispiele (M · T · W · G-Kurs)",
    subtitle: "Geprüfte Kernformeln aus Mathematik, Physik, Chemie & VWL in Lehrbuch-Typografie mit Rechenbeispielen.",
    badge: "FORMELN",
    theme: "studienkolleg",
    href: "/academy/t_kurs/02-grammar/stk-workspace",
    ctaLabel: "Open Formelsammlung",
    metaItems: ["Lehrbuch-Formeln", "Musterlösungen"],
    kind: "stk-tool",
  },
  {
    id: "stk-syllabus",
    indexLabel: "SET 05 · ALTKLAUSUREN",
    title: "2-Semester-Lehrplan & Universitäts-Altklausuren (TU Berlin, KIT, LMU, FU)",
    subtitle: "Komplette Themenübersicht für Aufnahmeprüfung & Feststellungsprüfung (FSP) nach staatlichem Standard.",
    badge: "FSP ARCHIV",
    theme: "exam",
    href: "/academy/t_kurs/02-grammar/stk-syllabus",
    ctaLabel: "Open Archiv",
    metaItems: ["8 Altklausuren", "2-Semester-Plan"],
    kind: "stk-tool",
  },
];

export default function StudienkollegPage() {
  return (
    <div className="min-h-screen flex flex-col bg-slate-50 text-slate-900">
      <Navbar activeDivision="studienkolleg" />

      <main className="flex-1 pb-24 lg:pb-12">
        <BreadcrumbHeader
          breadcrumbs={[
            { label: "Home", href: "/dashboard" },
            { label: "Studienkolleg Hub" },
          ]}
          eyebrow="DIVISION 02 · STUDIENKOLLEG HUB"
          title="Select Your Aufnahmeprüfung Track."
          subtitle="Structured preparation for German public university foundation colleges across M-, T-, W-, and G-Kurs tracks — textbook formulas, C-Tests, and FSP archives."
          theme="studienkolleg"
          backgroundImage={HEADER_IMAGES.studienkolleg}
          backHref="/dashboard"
          backLabel="Hub"
          rightBadge={
            <span className="inline-flex items-center gap-1.5 rounded-full border border-white/25 bg-white/10 px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.14em] text-white backdrop-blur-md">
              <Ban className="h-3 w-3 text-amber-300 shrink-0" aria-hidden="true" />
              <span>Prüfungsmodus: Ohne Taschenrechner</span>
            </span>
          }
        />

        {/* Level 2: 4 Core Studienkolleg Track Cards (Matching Language Academy 1:1) */}
        <section className="mx-auto max-w-6xl px-4 sm:px-8 py-12 space-y-8">
          <div className="flex flex-wrap items-end justify-between gap-4 border-b border-slate-200 pb-4">
            <div className="space-y-1">
              <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-slate-500">
                LEVEL 02 · ACADEMIC TRACK SELECTION
              </p>
              <h2 className="text-2xl sm:text-3xl font-bold tracking-tight text-slate-900">
                4 State Studienkolleg Tracks
              </h2>
            </div>
            <span className="inline-flex items-center gap-1.5 rounded-full border border-slate-200 bg-white px-3 py-1 text-[11px] font-semibold text-slate-700 shadow-2xs">
              <Ban className="h-3 w-3 text-slate-500 shrink-0" aria-hidden="true" />
              <span>Prüfungsmodus: Ohne Taschenrechner</span>
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {STK_TRACK_CARDS.map((item) => {
              const meta = LEVEL_META[item.key];
              return (
                <SubdivisionCard
                  key={item.key}
                  indexLabel={item.indexLabel}
                  title={`${meta.label} — ${meta.cefr}`}
                  subtitle={`${meta.description}. Target Universities: ${meta.exams}.`}
                  href={`/academy/${item.key}`}
                  ctaLabel={`Open ${meta.label} Subdivisions`}
                  theme="studienkolleg"
                  imageUrl={HEADER_IMAGES.studienkolleg}
                  badge={item.badge}
                  metaItems={item.metaItems}
                />
              );
            })}
          </div>
        </section>

        {/* Core Practice Sets, C-Tests & Textbook Formula Reference (CompactTopicList) */}
        <section className="mx-auto max-w-6xl px-4 sm:px-8 pb-12 space-y-6">
          <div className="flex flex-wrap items-end justify-between gap-3 border-b border-slate-200 pb-3.5">
            <div className="space-y-0.5">
              <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-slate-500">
                KERNMODULE · C-TESTS &amp; FACHMATHEMATIK
              </p>
              <h2 className="text-xl sm:text-2xl font-semibold tracking-tight text-slate-900">
                Direct Practice Sets &amp; Formelsammlung
              </h2>
            </div>
            <span className="rounded-full border border-slate-200 bg-white px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-600 shadow-2xs">
              {CORE_STK_PRACTICE_SETS.length} Modules
            </span>
          </div>

          <CompactTopicList topics={CORE_STK_PRACTICE_SETS} />

          {/* Clean Textbook Formula Preview Bar (KaTeX) */}
          <div className="rounded-2xl border border-slate-200 bg-white p-5 sm:p-6 shadow-xs space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 pb-3">
              <span className="inline-flex items-center gap-1.5 text-xs font-semibold uppercase tracking-[0.16em] text-slate-700">
                <Sigma className="h-4 w-4 text-indigo-600" />
                <span>Lehrbuch-Formelsammlung (KaTeX)</span>
              </span>
              <Link
                href="/academy/t_kurs/02-grammar/stk-workspace"
                className="text-xs font-semibold text-indigo-700 hover:text-indigo-900 transition"
              >
                Alle Formeln öffnen →
              </Link>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="rounded-xl border border-slate-200/80 bg-slate-50/70 p-4 space-y-1 min-w-0">
                <p className="text-[10px] font-bold uppercase tracking-wider text-slate-500">
                  T-Kurs · Energieerhaltung
                </p>
                <MathText
                  text="E_{\text{gesamt}} = \frac{1}{2}mv^2 + mgh = \text{konstant}"
                  display
                />
              </div>
              <div className="rounded-xl border border-slate-200/80 bg-slate-50/70 p-4 space-y-1 min-w-0">
                <p className="text-[10px] font-bold uppercase tracking-wider text-slate-500">
                  M-Kurs · Henderson-Hasselbalch
                </p>
                <MathText
                  text="\text{pH} = \text{p}K_s + \lg\left(\frac{[\text{A}^-]}{[\text{HA}]}\right)"
                  display
                />
              </div>
            </div>
          </div>
        </section>

        {/* Interactive Proctor Lab: C-Test Half-Word Trainer & Ohne-Taschenrechner Math Sprint */}
        <StudienkollegDrillsWorkspace />
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
            <Link href="/academy" className="text-slate-600 hover:text-slate-900 transition">
              Academy
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
