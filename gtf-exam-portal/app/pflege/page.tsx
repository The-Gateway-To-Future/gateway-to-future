import Link from "next/link";
import { Navbar } from "@/components/Navbar";
import { BreadcrumbHeader } from "@/components/BreadcrumbHeader";
import { SubdivisionCard } from "@/components/SubdivisionCard";
import { BottomNavigationBar } from "@/components/BottomNavigationBar";
import { BRAND } from "@/lib/config";

export default function PflegePage() {
  return (
    <div className="min-h-screen flex flex-col bg-slate-50 text-slate-900">
      <Navbar activeDivision="fachsprache_medizin" />

      <main className="flex-1 pb-24 lg:pb-12">
        <BreadcrumbHeader
          breadcrumbs={[
            { label: "Home", href: "/dashboard" },
            { label: "Pflege & Medizin" },
          ]}
          eyebrow="DIVISION 03 · FACHSPRACHE PFLEGE & MEDIZIN"
          title="Clinical German & Anerkennung."
          subtitle="Choose your clinical pathway below for ward dialogues, ISBAR shift handovers, hospital vocabulary decks, and Fachsprachenprüfung simulations."
          theme="pflege"
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
                Clinical hospital modules are paused while prioritizing Core German CEFR A1, A2, B1, and B2 certification.
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
                LEVEL 02 · CLINICAL TRACKS
              </p>
              <h2 className="text-2xl sm:text-3xl font-light tracking-tight text-slate-900">
                Healthcare &amp; Dual Ausbildung Pathways
              </h2>
            </div>
            <span className="text-[11px] font-medium uppercase tracking-[0.18em] text-slate-500">
              Charité · Vivantes · LÄK
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <SubdivisionCard
              indexLabel="TRACK 01 · PFLEGE B1–B2"
              title="Pflege B1–B2 Clinical Track"
              subtitle="Specialized subdivision folder for international nurses and generalistische Pflegeausbildung."
              href="/academy/ausbildung_pflege"
              ctaLabel="Preview Track"
              theme="pflege"
              badge="COMING SOON · A1–B2 FOCUS"
              metaItems={["Coming Soon", "A1–B2 Priority"]}
            />

            <SubdivisionCard
              indexLabel="TRACK 02 · B2 FACHSPRACHE"
              title="B2 Anerkennung & Fachsprache"
              subtitle="B2 medical communication, Tarifvertrag & labor law reading labs, 122 Säulen grammar mastery, and state recognition preparation."
              href="/academy/b2"
              ctaLabel="Open B2 Subdivisions"
              theme="pflege"
              badge="APPROBATION · FSP"
              metaItems={["B2 Grammar", "Clinical Audio", "telc B2"]}
            />
          </div>
        </section>

        {/* Dedicated Clinical ISBAR Simulator */}
        <section className="mx-auto max-w-6xl px-4 sm:px-8 pb-12 space-y-6">
          <div className="border-b border-slate-200 pb-4">
            <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-slate-500">
              DEDICATED SIMULATOR
            </p>
            <h2 className="mt-1 text-xl sm:text-2xl font-light tracking-tight text-slate-900">
              Interactive Clinical Dialogue &amp; ISBAR Handover Lab
            </h2>
          </div>

          <SubdivisionCard
            indexLabel="CLINICAL LAB · WARD TRAINING"
            title="ISBAR Handover & Patientenaufnahme Simulator"
            subtitle="Open the standalone clinical workspace for real hospital case dialogues (KHK, Appendizitis, Apoplex), structured ISBAR reporting, and clinical Redemittel."
            href="/academy/ausbildung_pflege/03-hoeren-lesen/pflege-clinical-hub"
            ctaLabel="Launch Clinical Lab"
            theme="pflege"
            badge="ISBAR TRAINER"
            metaItems={["Case Dialogues", "Handover Form", "Redemittel"]}
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
            <Link href="/studienkolleg" className="text-slate-600 hover:text-slate-900 transition">
              Studienkolleg
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
