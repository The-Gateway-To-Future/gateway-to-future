import type { Metadata } from "next";
import Link from "next/link";
import { Building2, CheckCircle2, Globe2, Mail, MapPin, ShieldCheck } from "lucide-react";
import { Navbar } from "@/components/Navbar";
import { BreadcrumbHeader } from "@/components/BreadcrumbHeader";
import { CeoPortraitCard } from "@/components/CeoPortraitCard";
import { BottomNavigationBar } from "@/components/BottomNavigationBar";
import { BRAND } from "@/lib/config";

export const metadata: Metadata = {
  title: `About Us & Leadership | ${BRAND.name}`,
  description: `Led by ${BRAND.founderName} (${BRAND.founderTitle}). Berlin-based German Language Academy, Studienkolleg Hub, and Healthcare Relocation Institute.`,
  openGraph: {
    title: `About Us — ${BRAND.name}`,
    description: `${BRAND.founderName} (${BRAND.founderTitle}) leads ${BRAND.name} from Berlin, Germany.`,
    images: [{ url: "/public/images/ceo-sarbjit-kour.jpg", alt: `${BRAND.founderName} — ${BRAND.founderTitle}` }],
  },
};

export default function AboutPage() {
  return (
    <div className="min-h-screen flex flex-col bg-slate-50 text-slate-900">
      <Navbar />

      <main className="flex-1 pb-24 lg:pb-16">
        <BreadcrumbHeader
          breadcrumbs={[
            { label: "Home", href: "/" },
            { label: "About Us" },
          ]}
          eyebrow="ABOUT GATEWAY TO FUTURE · BERLIN HQ"
          title="Creating Career Without Borders."
          subtitle={`Guided exclusively by ${BRAND.founderName} (${BRAND.founderTitle}) — uniting structured German language mastery with authentic relocation and hospital placement in Germany.`}
          theme="hub"
          backHref="/"
          backLabel="Home"
        />

        <section className="mx-auto max-w-6xl px-4 sm:px-8 py-12 space-y-10">
          {/* Leadership Section */}
          <div className="space-y-4">
            <div className="border-b border-slate-200 pb-4">
              <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-slate-500">
                EXECUTIVE LEADERSHIP
              </p>
              <h2 className="mt-1 text-2xl sm:text-3xl font-light tracking-tight text-slate-900">
                {BRAND.founderName} — {BRAND.founderTitle}
              </h2>
            </div>

            <CeoPortraitCard />
          </div>

          {/* Mission & Pillars */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-xs space-y-3">
              <div className="inline-flex h-10 w-10 items-center justify-center rounded-xl bg-slate-100 text-slate-900">
                <Globe2 className="h-5 w-5" />
              </div>
              <h3 className="text-base font-bold text-slate-900">CEFR A1–C1 Language Mastery</h3>
              <p className="text-xs leading-relaxed text-slate-600">
                Structured curriculum engineered for Goethe-Zertifikat, telc, and TestDaF certification with 7 proprietary workbooks and live Berlin instruction.
              </p>
            </div>

            <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-xs space-y-3">
              <div className="inline-flex h-10 w-10 items-center justify-center rounded-xl bg-slate-100 text-slate-900">
                <Building2 className="h-5 w-5" />
              </div>
              <h3 className="text-base font-bold text-slate-900">Berlin Institutional Precision</h3>
              <p className="text-xs leading-relaxed text-slate-600">
                Zero agency guesswork across anabin database verification, APS certification, uni-assist university filing, Sperrkonto setup, and § 81a healthcare mobility.
              </p>
            </div>

            <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-xs space-y-3">
              <div className="inline-flex h-10 w-10 items-center justify-center rounded-xl bg-slate-100 text-slate-900">
                <ShieldCheck className="h-5 w-5" />
              </div>
              <h3 className="text-base font-bold text-slate-900">Direct CEO Accountability</h3>
              <p className="text-xs leading-relaxed text-slate-600">
                Every student pathway is overseen directly from our Berlin headquarters under the leadership of {BRAND.founderName}, {BRAND.founderTitle}.
              </p>
            </div>
          </div>

          {/* Headquarters & Compliance Card */}
          <div className="rounded-2xl border border-slate-200 bg-white p-6 sm:p-8 shadow-xs flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
            <div className="space-y-2">
              <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-slate-500">
                HEADQUARTERS &amp; GOVERNANCE
              </p>
              <h3 className="text-xl font-bold text-slate-900">The Gateway to Future (GTF)</h3>
              <div className="space-y-1 text-xs text-slate-600">
                <p className="flex items-center gap-2">
                  <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600 shrink-0" />
                  <span>Sole Executive Leadership: <strong>{BRAND.founderName}</strong> ({BRAND.founderTitle})</span>
                </p>
                <p className="flex items-center gap-2">
                  <MapPin className="h-3.5 w-3.5 text-slate-500 shrink-0" />
                  <span>{BRAND.headquarters}, Germany</span>
                </p>
                <p className="flex items-center gap-2">
                  <Mail className="h-3.5 w-3.5 text-slate-500 shrink-0" />
                  <a href={`mailto:${BRAND.supportEmail}`} className="underline hover:text-slate-900">
                    {BRAND.supportEmail}
                  </a>
                </p>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-3">
              <Link
                href="/privacy"
                className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-2.5 text-xs font-semibold uppercase tracking-[0.14em] text-slate-700 hover:bg-slate-100 transition"
              >
                Privacy Policy
              </Link>
              <Link
                href="/terms"
                className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-2.5 text-xs font-semibold uppercase tracking-[0.14em] text-slate-700 hover:bg-slate-100 transition"
              >
                Terms of Service
              </Link>
              <Link
                href="/pricing"
                className="rounded-xl bg-slate-900 px-5 py-2.5 text-xs font-semibold uppercase tracking-[0.14em] text-white hover:bg-slate-800 transition"
              >
                Explore Programs
              </Link>
            </div>
          </div>
        </section>
      </main>

      <footer className="border-t border-slate-200 bg-white py-10 pb-24 lg:pb-10 px-4 sm:px-8">
        <div className="mx-auto max-w-6xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 text-xs text-slate-500">
          <p className="font-semibold tracking-wide text-slate-900">
            {BRAND.name} · {BRAND.founderName} ({BRAND.founderTitle}) · {BRAND.headquarters}
          </p>
          <div className="flex flex-wrap items-center gap-6 font-semibold uppercase tracking-[0.14em] text-[11px]">
            <Link href="/" className="text-slate-600 hover:text-slate-900 transition">Home</Link>
            <Link href="/privacy" className="text-slate-600 hover:text-slate-900 transition">Privacy</Link>
            <Link href="/terms" className="text-slate-600 hover:text-slate-900 transition">Terms</Link>
          </div>
        </div>
      </footer>

      <BottomNavigationBar />
    </div>
  );
}
