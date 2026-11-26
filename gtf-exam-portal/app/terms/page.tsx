import React from "react";
import Link from "next/link";
import { FileText, ArrowLeft, Mail } from "lucide-react";

export const metadata = {
  title: "Terms of Service | Gateway To Future",
  description: "Terms and conditions of service for Gateway To Future.",
};

export default function TermsOfServicePage() {
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
            Effective Date: November 2026
          </span>
        </div>

        <div className="space-y-3">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-amber-50 border border-amber-200 text-amber-800 text-xs font-semibold">
            <FileText className="w-3.5 h-3.5" />
            Legal Agreement
          </div>
          <h1 className="text-2xl sm:text-4xl font-extrabold tracking-tight text-slate-900">
            Terms of Service
          </h1>
          <p className="text-slate-600 text-sm sm:text-base">
            Please review these Terms of Service carefully before utilizing the <strong className="text-slate-900">The Gateway to Future</strong> digital academy and native mobile applications.
          </p>
        </div>

        <section className="space-y-3 text-slate-600 text-sm leading-relaxed border-t border-slate-200 pt-6">
          <h2 className="text-lg sm:text-xl font-bold text-slate-900">1. Acceptance of Terms</h2>
          <p>
            By accessing or using the Gateway To Future applications, web services, or educational modules, you agree to be bound by these terms. If you do not agree to these terms, do not access or use our services.
          </p>
        </section>

        <section className="space-y-3 text-slate-600 text-sm leading-relaxed">
          <h2 className="text-lg sm:text-xl font-bold text-slate-900">2. Educational Services & Disclaimer</h2>
          <p>
            The Gateway to Future provides German language training (A1, A2, B1, B2), exam preparation tools (Goethe, telc, TestDaF), and career pathway guidance (Studienkolleg, Ausbildung, medical Anerkennung in Germany). While we provide high-fidelity preparation material and advisory services, final visa issuance, employment contracts, and university admission remain within the sole discretion of the German authorities, employers, and admissions bodies. All third-party exam boards and institutions are trademarks of their respective owners; Gateway To Future is an independent training and guidance provider.
          </p>
        </section>

        <section className="space-y-3 text-slate-600 text-sm leading-relaxed">
          <h2 className="text-lg sm:text-xl font-bold text-slate-900">3. Intellectual Property</h2>
          <p>
            All curricular materials, custom workbooks, flashcard databases, examination engines, software code, and brand trademarks ("The Gateway to Future", "GTF", "Creating Career Without Borders") are the intellectual property of The Gateway to Future. Unauthorized reproduction, distribution, or reverse-engineering is strictly prohibited.
          </p>
        </section>

        <section className="space-y-3 text-slate-600 text-sm leading-relaxed">
          <h2 className="text-lg sm:text-xl font-bold text-slate-900">4. User Conduct & Accounts</h2>
          <p>
            Users agree not to misuse the platform, attempt unauthorized access to restricted endpoints, or submit fraudulent documents during admissions processing. We reserve the right to suspend accounts violating these standards.
          </p>
        </section>

        <section className="space-y-3 text-slate-600 text-sm leading-relaxed">
          <h2 className="text-lg sm:text-xl font-bold text-slate-900">5. Governing Law &amp; Jurisdiction</h2>
          <p>
            These terms are governed by the laws of India and Germany applicable to corporate service agreements operated by <strong className="text-slate-900">The Gateway to Future (Berlin &amp; India Advisory Operations)</strong>.
          </p>
          <p className="text-xs text-slate-700 font-mono bg-slate-50 border border-slate-200 rounded-xl p-3">
            <strong>European Headquarters (Impressum):</strong> Schönefelder Straße 2, GStU, 12355 Berlin, Germany
          </p>
          <div className="pt-2">
            <a
              href="mailto:ashusharma@gatewaytofuture.com"
              className="inline-flex items-center gap-2 text-sm text-amber-700 hover:text-amber-800 font-medium"
            >
              <Mail className="w-4 h-4" />
              Contact Legal Team: ashusharma@gatewaytofuture.com
            </a>
          </div>
        </section>
      </div>
    </main>
  );
}
