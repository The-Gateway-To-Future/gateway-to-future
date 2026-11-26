import React from "react";
import Link from "next/link";
import { ArrowLeft, Building2, CalendarCheck2, Mail, MapPin, Scale, Shield } from "lucide-react";
import { BRAND } from "@/lib/config";

export const metadata = {
  title: `Impressum | ${BRAND.name}`,
  description: `Official Impressum (§ 5 DDG) for ${BRAND.name} (${BRAND.advisoryTeamTitle}) at ${BRAND.headquarters}, Germany.`,
};

export default function ImpressumPage() {
  return (
    <main className="min-h-screen bg-slate-50 text-slate-900 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-4xl mx-auto space-y-8 bg-white border border-slate-200 rounded-2xl p-5 sm:p-10 shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 pb-6">
          <Link
            href="/"
            className="inline-flex items-center gap-2 text-sm text-amber-700 hover:text-amber-800 font-medium transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to Home
          </Link>
          <span className="text-xs font-mono uppercase tracking-wider text-slate-500">
            § 5 DDG · § 18 Abs. 2 MStV
          </span>
        </div>

        <div className="space-y-3">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-amber-50 border border-amber-200 text-amber-800 text-xs font-semibold">
            <Scale className="w-3.5 h-3.5" />
            Legal Disclosure · Impressum
          </div>
          <h1 className="text-2xl sm:text-4xl font-extrabold tracking-tight text-slate-900">
            Impressum &amp; Legal Notice
          </h1>
          <p className="text-slate-600 text-sm sm:text-base">
            Official corporate and statutory contact notice for <strong className="text-slate-900">Gateway To Future</strong> (<strong className="text-slate-900">The Gateway to Future</strong>).
          </p>
        </div>

        <section className="space-y-3 text-slate-600 text-sm leading-relaxed border-t border-slate-200 pt-6">
          <h2 className="text-lg sm:text-xl font-bold text-slate-900 flex items-center gap-2">
            <Building2 className="w-5 h-5 text-amber-700" />
            1. Angaben gemäß § 5 DDG (Corporate &amp; Executive Entity)
          </h2>
          <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 text-xs sm:text-sm space-y-2 font-mono text-slate-800 break-words">
            <div><strong className="text-amber-700">Company / Brand:</strong> Gateway To Future (The Gateway to Future)</div>
            <div><strong className="text-amber-700">Advisory Team:</strong> {BRAND.name} — {BRAND.advisoryTeamTitle}</div>
            <div><strong className="text-amber-700">Berlin Headquarters:</strong> Schönefelder Straße 2, GStU, 12355 Berlin, Germany</div>
            <div><strong className="text-amber-700">Editorial Responsibility (§ 18 Abs. 2 MStV):</strong> Gateway To Future Editorial Desk, Schönefelder Straße 2, GStU, 12355 Berlin, Germany</div>
            <div><strong className="text-amber-700">India Registered Office:</strong> Mahant Building, Main Market Road, Laksar, Haridwar, Uttarakhand - 247663, India</div>
            <div><strong className="text-amber-700">GSTIN:</strong> 05AAOPR7336L3Z0 | <strong className="text-amber-700">PAN:</strong> AAOPR7336L</div>
          </div>
        </section>

        <section className="space-y-3 text-slate-600 text-sm leading-relaxed">
          <h2 className="text-lg sm:text-xl font-bold text-slate-900">2. Contact &amp; Advisory Channels</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
            <Link
              href="/pricing#consultation-booking"
              className="flex items-center gap-2.5 p-3.5 rounded-xl border border-slate-200 bg-slate-50 text-slate-800 hover:border-amber-300 transition"
            >
              <CalendarCheck2 className="w-4 h-4 text-amber-700 shrink-0" />
              <div>
                <div className="text-[11px] uppercase tracking-wider text-slate-500 font-semibold">Book Consultation / Advisory Desk</div>
                <div className="text-xs font-semibold text-slate-800">Direct phone &amp; WhatsApp line disclosed after confirmed paid appointment</div>
              </div>
            </Link>
            <a
              href={`mailto:${BRAND.supportEmail}`}
              className="flex items-center gap-2.5 p-3.5 rounded-xl border border-slate-200 bg-slate-50 text-slate-800 hover:border-amber-300 transition"
            >
              <Mail className="w-4 h-4 text-amber-700 shrink-0" />
              <div>
                <div className="text-[11px] uppercase tracking-wider text-slate-500 font-semibold">Email</div>
                <div className="font-mono font-semibold">{BRAND.supportEmail}</div>
              </div>
            </a>
          </div>
          <div className="flex items-center gap-2 text-xs text-slate-600 pt-1">
            <MapPin className="w-4 h-4 text-slate-500 shrink-0" />
            <span>Schönefelder Straße 2, GStU, 12355 Berlin, Germany · Websites: https://gatewaytofuture.com &amp; https://app.gatewaytofuture.com</span>
          </div>
        </section>

        <section className="space-y-3 text-slate-600 text-sm leading-relaxed border-t border-slate-200 pt-6">
          <h2 className="text-lg sm:text-xl font-bold text-slate-900">3. Liability, Copyright &amp; Dispute Resolution</h2>
          <p>
            <strong>Liability for Content &amp; Links:</strong> Gateway To Future curates educational content, curriculum preparation, and career advisory services with utmost care. External third-party websites linked from our platform remain the sole responsibility of their respective operators.
          </p>
          <p>
            <strong>Copyright (Urheberrecht):</strong> All proprietary German workbooks, exam simulators, flashcards, and brand materials published on Gateway To Future are protected under German and international copyright law.
          </p>
          <p>
            <strong>Consumer Dispute Resolution (§ 36 VSBG):</strong> Wir sind nicht bereit und nicht verpflichtet, an Streitbeilegungsverfahren vor einer Verbraucherschlichtungsstelle teilzunehmen. (We are neither willing nor obligated to participate in dispute settlement proceedings before a consumer arbitration board pursuant to § 36 VSBG.)
          </p>
          <p>
            <strong>Non-Affiliation Trademark Notice:</strong> All third-party exam boards and institutions (such as Goethe-Institut, telc, TestDaF, Charité, or Vivantes) are trademarks of their respective owners. Gateway To Future is an independent training and guidance provider.
          </p>
        </section>

        <div className="border-t border-slate-200 pt-6 flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-2 text-xs text-slate-500">
            <Shield className="w-4 h-4 text-amber-700" />
            <span>Related Legal Policies</span>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <Link
              href="/privacy"
              className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-2 text-xs font-semibold uppercase tracking-[0.14em] text-slate-700 hover:bg-slate-100 transition"
            >
              Privacy Policy
            </Link>
            <Link
              href="/terms"
              className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-2 text-xs font-semibold uppercase tracking-[0.14em] text-slate-700 hover:bg-slate-100 transition"
            >
              Terms of Service
            </Link>
          </div>
        </div>
      </div>
    </main>
  );
}
