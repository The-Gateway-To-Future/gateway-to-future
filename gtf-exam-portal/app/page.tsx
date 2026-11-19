import Link from "next/link";
import { Navbar } from "@/components/Navbar";
import { BreadcrumbHeader, HEADER_IMAGES } from "@/components/BreadcrumbHeader";
import { SubdivisionCard } from "@/components/SubdivisionCard";
import { CeoPortraitCard } from "@/components/CeoPortraitCard";
import { BottomNavigationBar } from "@/components/BottomNavigationBar";
import { BRAND } from "@/lib/config";

export default function HomePage() {
  return (
    <div className="min-h-screen flex flex-col bg-slate-50 text-slate-900">
      <Navbar />

      <main className="flex-1 pb-24 lg:pb-12">
        <BreadcrumbHeader
          breadcrumbs={[{ label: "Home" }, { label: "GTF Ecosystem" }]}
          eyebrow="THE GATEWAY TO FUTURE · BERLIN ECOSYSTEM"
          title="Your Gateway to Germany."
          subtitle="An engineered learning architecture for German language mastery, public Studienkolleg admission, and clinical Pflege recognition — built in Berlin for precision, clarity, and career placement."
          theme="hub"
          backgroundImage={HEADER_IMAGES.hub}
        >
          <div className="flex flex-wrap items-center gap-3 pt-2">
            <Link
              href="/dashboard"
              className="inline-flex items-center justify-center rounded-xl bg-white px-7 py-3 text-xs font-semibold uppercase tracking-[0.18em] text-slate-950 shadow-sm hover:bg-slate-100 transition"
            >
              Enter Student Hub
            </Link>
            <Link
              href="/login"
              className="inline-flex items-center justify-center rounded-xl border border-white/30 bg-white/10 px-7 py-3 text-xs font-semibold uppercase tracking-[0.18em] text-white backdrop-blur-md transition hover:bg-white/20 hover:border-white/45"
            >
              Log In
            </Link>
          </div>
        </BreadcrumbHeader>

        {/* Level 1: The 3 Core Divisions */}
        <section className="mx-auto max-w-6xl px-4 sm:px-8 py-12 sm:py-16 space-y-8">
          <div className="flex flex-wrap items-end justify-between gap-4 border-b border-slate-200 pb-5">
            <div className="space-y-1.5">
              <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-slate-500">
                LEVEL 01 · ENTERPRISE DIVISIONS
              </p>
              <h2 className="text-2xl sm:text-3xl font-light tracking-tight text-slate-900">
                Select Your Preparation Division
              </h2>
            </div>
            <span className="text-[11px] font-medium uppercase tracking-[0.18em] text-slate-500">
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
              imageUrl={HEADER_IMAGES.b1}
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
              imageUrl={HEADER_IMAGES.studienkolleg}
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
              imageUrl={HEADER_IMAGES.pflege}
              badge="PFLEGE B1–B2 · FSP"
              metaItems={["ISBAR Simulator", "Ward Audio", "Anerkennung"]}
            />
          </div>
        </section>

        {/* Level 2: Executive Leadership & About Us */}
        <section className="mx-auto max-w-6xl px-4 sm:px-8 pb-12 sm:pb-16 space-y-6">
          <div className="flex flex-wrap items-end justify-between gap-4 border-b border-slate-200 pb-4">
            <div className="space-y-1">
              <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-slate-500">
                EXECUTIVE LEADERSHIP · ABOUT US
              </p>
              <h2 className="text-2xl sm:text-3xl font-light tracking-tight text-slate-900">
                Led Exclusively from Berlin
              </h2>
            </div>
            <Link
              href="/about"
              className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-700 hover:text-slate-950 transition"
            >
              About Gateway To Future →
            </Link>
          </div>

          <CeoPortraitCard />
        </section>
      </main>

      <footer className="border-t border-slate-200 bg-white py-10 pb-24 lg:pb-10 px-4 sm:px-8">
        <div className="mx-auto max-w-6xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 text-xs text-slate-500">
          <div className="space-y-1">
            <p className="font-semibold tracking-wide text-slate-900">
              {BRAND.name} · {BRAND.headquarters}
            </p>
            <p className="text-[11px] text-slate-600">
              Led by {BRAND.founderName} — {BRAND.founderTitle}
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-6 font-semibold uppercase tracking-[0.14em] text-[11px]">
            <Link href="/about" className="text-slate-600 hover:text-slate-900 transition">
              About
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
            <Link href="/pricing" className="text-slate-600 hover:text-slate-900 transition">
              Pricing
            </Link>
            <Link href="/impressum" className="text-slate-600 hover:text-slate-900 transition">
              Impressum
            </Link>
            <Link href="/privacy" className="text-slate-600 hover:text-slate-900 transition">
              Privacy
            </Link>
            <Link href="/terms" className="text-slate-600 hover:text-slate-900 transition">
              Terms
            </Link>
          </div>
        </div>
      </footer>

      <BottomNavigationBar />
      
    </div>
  );
}
