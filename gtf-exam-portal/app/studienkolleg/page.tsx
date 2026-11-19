import Link from "next/link";
import { Navbar } from "@/components/Navbar";
import { BreadcrumbHeader, HEADER_IMAGES } from "@/components/BreadcrumbHeader";
import { SubdivisionCard } from "@/components/SubdivisionCard";
import { BottomNavigationBar } from "@/components/BottomNavigationBar";
import { BRAND, LEVEL_META } from "@/lib/config";

const STK_TRACK_CARDS = [
  {
    key: "t_kurs" as const,
    indexLabel: "TRACK 01 · ENGINEERING & TECH",
    badge: "COMING SOON · A1–B2 FOCUS",
    metaItems: ["Mathematik", "Physik", "Deutsch C-Test"],
  },
  {
    key: "m_kurs" as const,
    indexLabel: "TRACK 02 · MEDICINE & BIO",
    badge: "COMING SOON · A1–B2 FOCUS",
    metaItems: ["Biologie", "Chemie", "Deutsch C-Test"],
  },
  {
    key: "w_kurs" as const,
    indexLabel: "TRACK 03 · ECONOMICS & BUSINESS",
    badge: "COMING SOON · A1–B2 FOCUS",
    metaItems: ["VWL & BWL", "Wirtschaftsmathe", "Deutsch C-Test"],
  },
  {
    key: "g_kurs" as const,
    indexLabel: "TRACK 04 · HUMANITIES & LAW",
    badge: "COMING SOON · A1–B2 FOCUS",
    metaItems: ["Geschichte", "Verfassung", "Literatur"],
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
          subtitle="Structured preparation for German public university foundation colleges across T, M, W, and G-Kurs tracks — C-Tests, 1-year syllabus dossiers, and formula engines."
          theme="studienkolleg"
          backgroundImage={HEADER_IMAGES.studienkolleg}
          backHref="/dashboard"
          backLabel="Hub"
        />

        <section className="mx-auto max-w-6xl px-4 sm:px-8 py-12 space-y-8">
          <div className="rounded-2xl border border-amber-300 bg-amber-50 p-5 sm:p-6 text-slate-900 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 shadow-xs">
            <div className="space-y-1">
              <span className="text-[10px] font-bold uppercase tracking-widest text-amber-800">
                CURRICULUM NOTICE · A1–B2 PRIORITY
              </span>
              <p className="text-sm font-medium text-slate-800">
                Studienkolleg tracks are paused while focusing 100% on Goethe / telc CEFR A1, A2, B1, and B2 certification.
              </p>
            </div>
            <Link
              href="/academy"
              className="relative z-20 shrink-0 inline-flex items-center gap-2 rounded-xl bg-slate-900 px-5 py-2.5 text-xs font-semibold uppercase tracking-wider text-white hover:bg-slate-800 transition shadow-sm cursor-pointer"
            >
              Go to Language Academy
            </Link>
          </div>

          <div className="flex flex-wrap items-end justify-between gap-4 border-b border-slate-200 pb-4">
            <div className="space-y-1">
              <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-slate-500">
                LEVEL 02 · ACADEMIC TRACKS
              </p>
              <h2 className="text-2xl sm:text-3xl font-light tracking-tight text-slate-900">
                4 State Studienkolleg Tracks
              </h2>
            </div>
            <span className="text-[11px] font-medium uppercase tracking-[0.18em] text-slate-500">
              Aufnahmeprüfung · FSP
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {(STK_TRACK_CARDS || []).map((item) => {
              const meta = LEVEL_META[item.key];
              return (
                <SubdivisionCard
                  key={item.key}
                  indexLabel={item.indexLabel}
                  title={meta.label}
                  subtitle={`${meta.description}. Target Universities: ${meta.exams}.`}
                  href={`/academy/${item.key}`}
                  ctaLabel={`Open ${meta.label} Folder`}
                  theme="studienkolleg"
                  imageUrl={HEADER_IMAGES.studienkolleg}
                  badge={item.badge}
                  metaItems={item.metaItems}
                />
              );
            })}
          </div>
        </section>

        {/* Dedicated Interactive Formula & Past-Paper Suite */}
        <section className="mx-auto max-w-6xl px-4 sm:px-8 pb-12 space-y-6">
          <div className="border-b border-slate-200 pb-4">
            <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-slate-500">
              DEDICATED WORKSPACE
            </p>
            <h2 className="mt-1 text-xl sm:text-2xl font-light tracking-tight text-slate-900">
              Interactive Formula Engine &amp; Past-Paper Archive
            </h2>
          </div>

          <SubdivisionCard
            indexLabel="ALL TRACKS · INTERACTIVE LAB"
            title="Studienkolleg Formula Calculator & FSP Suite"
            subtitle="Launch the dedicated interactive calculator console, 2-semester syllabus map, and TU Berlin / LMU / KIT C-Test archive in a single distraction-free view."
            href="/academy/t_kurs/02-grammar/stk-workspace"
            ctaLabel="Launch Formula Suite"
            theme="studienkolleg"
            imageUrl={HEADER_IMAGES.studienkolleg}
            badge="FORMULA ENGINE"
            metaItems={["T · M · W · G Switcher", "Live Calculators", "Past Papers"]}
            aspectClassName="min-h-[220px]"
          />
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
