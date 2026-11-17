import Link from "next/link";
import { Navbar } from "@/components/Navbar";
import { BreadcrumbHeader } from "@/components/BreadcrumbHeader";
import { SubdivisionCard } from "@/components/SubdivisionCard";
import { BottomNavigationBar } from "@/components/BottomNavigationBar";
import { BRAND } from "@/lib/config";

export default function HomePage() {
  return (
    <div className="min-h-screen flex flex-col bg-[#07090E] text-white">
      <Navbar />

      <main className="flex-1 pb-24 lg:pb-12">
        <BreadcrumbHeader
          breadcrumbs={[{ label: "Home" }, { label: "GTF Ecosystem" }]}
          eyebrow="THE GATEWAY TO FUTURE · BERLIN ECOSYSTEM"
          title="Your Gateway to Germany."
          subtitle="An engineered learning architecture for German language mastery, public Studienkolleg admission, and clinical Pflege recognition — built in Berlin for precision, clarity, and career placement."
          theme="hub"
        >
          <div className="flex flex-wrap items-center gap-3 pt-2">
            <Link
              href="/dashboard"
              className="inline-flex items-center justify-center rounded-xl !bg-white px-7 py-3 text-xs font-semibold uppercase tracking-[0.18em] !text-[#07090E] transition hover:opacity-90"
            >
              Enter Student Hub
            </Link>
            <Link
              href="/login"
              className="inline-flex items-center justify-center rounded-xl border border-white/20 bg-white/[0.04] px-7 py-3 text-xs font-semibold uppercase tracking-[0.18em] text-white transition hover:border-white/40 hover:bg-white/[0.08]"
            >
              Log In
            </Link>
          </div>
        </BreadcrumbHeader>

        {/* Level 1: The 3 Core Divisions */}
        <section className="mx-auto max-w-6xl px-4 sm:px-8 py-12 sm:py-16 space-y-8">
          <div className="flex flex-wrap items-end justify-between gap-4 border-b border-white/10 pb-5">
            <div className="space-y-1.5">
              <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-white/50">
                LEVEL 01 · ENTERPRISE DIVISIONS
              </p>
              <h2 className="text-2xl sm:text-3xl font-light tracking-tight text-white">
                Select Your Preparation Division
              </h2>
            </div>
            <span className="text-[11px] font-medium uppercase tracking-[0.18em] text-white/45">
              3 Core Tracks · Drill-Down Architecture
            </span>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <SubdivisionCard
              indexLabel="01 · LANGUAGE ACADEMY"
              title="German Language Academy"
              subtitle="Master CEFR A1 through B2 German across structured vocabulary decks, 122 Säulen grammar pillars, Hören labs, and Goethe/telc Modelltests."
              href="/academy"
              ctaLabel="Open Academy"
              theme="academy"
              badge="CEFR A1 – B2"
              metaItems={["4 Levels", "122 Säulen", "Studio Audio"]}
            />

            <SubdivisionCard
              indexLabel="02 · UNIVERSITY BRIDGE"
              title="Studienkolleg Hub"
              subtitle="Prepare for public university Aufnahmeprüfungen and Feststellungsprüfung across T, M, W, and G-Kurs tracks with C-Tests and formula labs."
              href="/studienkolleg"
              ctaLabel="Open Studienkolleg"
              theme="studienkolleg"
              badge="T · M · W · G-KURS"
              metaItems={["Aufnahmeprüfung", "C-Tests", "Formulas"]}
            />

            <SubdivisionCard
              indexLabel="03 · CLINICAL HEALTHCARE"
              title="Fachsprache Pflege & Medizin"
              subtitle="Hospital-grade clinical communication, ISBAR shift handover training, and B1–B2 Anerkennung preparation for Berlin & German hospital networks."
              href="/pflege"
              ctaLabel="Open Pflege Hub"
              theme="pflege"
              badge="PFLEGE B1–B2 · FSP"
              metaItems={["ISBAR Simulator", "Ward Audio", "Anerkennung"]}
            />
          </div>
        </section>
      </main>

      <footer className="border-t border-white/10 bg-[#07090E] py-10 pb-24 lg:pb-10 px-4 sm:px-8">
        <div className="mx-auto max-w-6xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 text-xs text-white/50">
          <p className="font-medium tracking-wide text-white/80">
            {BRAND.name} · {BRAND.headquarters}
          </p>
          <div className="flex flex-wrap items-center gap-6 font-medium uppercase tracking-[0.14em] text-[11px]">
            <Link href="/academy" className="hover:text-white transition">
              Academy
            </Link>
            <Link href="/studienkolleg" className="hover:text-white transition">
              Studienkolleg
            </Link>
            <Link href="/pflege" className="hover:text-white transition">
              Pflege
            </Link>
            <Link href="/pathways" className="hover:text-white transition">
              My Plan
            </Link>
            <Link href="/login" className="hover:text-white transition">
              Log In
            </Link>
          </div>
        </div>
      </footer>

      <BottomNavigationBar />
      
    </div>
  );
}
