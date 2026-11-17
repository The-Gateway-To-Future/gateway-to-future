import React from "react";
import Link from "next/link";
import { FileText, ArrowLeft, Mail } from "lucide-react";

export const metadata = {
  title: "Terms of Service | Gateway To Future",
  description: "Terms and conditions of service for Gateway To Future.",
};

export default function TermsOfServicePage() {
  return (
    <main className="min-h-screen bg-slate-950 text-slate-100 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-4xl mx-auto space-y-8 bg-slate-900/90 border border-slate-800 rounded-2xl p-6 sm:p-10 shadow-2xl backdrop-blur-sm">
        <div className="flex items-center justify-between border-b border-slate-800 pb-6">
          <Link
            href="/"
            className="inline-flex items-center gap-2 text-sm text-amber-400 hover:text-amber-300 transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to Home
          </Link>
          <span className="text-xs font-mono uppercase tracking-wider text-slate-400">
            Effective Date: November 2026
          </span>
        </div>

        <div className="space-y-3">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-amber-500/10 border border-amber-500/20 text-amber-400 text-xs font-semibold">
            <FileText className="w-3.5 h-3.5" />
            Legal Agreement
          </div>
          <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-white">
            Terms of Service
          </h1>
          <p className="text-slate-400 text-sm sm:text-base">
            Please review these Terms of Service carefully before utilizing the <strong className="text-slate-200">The Gateway to Future</strong> digital academy and native mobile applications.
          </p>
        </div>

        <section className="space-y-3 text-slate-300 text-sm leading-relaxed border-t border-slate-800/80 pt-6">
          <h2 className="text-xl font-bold text-white">1. Acceptance of Terms</h2>
          <p>
            By accessing or using the Gateway To Future applications, web services, or educational modules, you agree to be bound by these terms. If you do not agree to these terms, do not access or use our services.
          </p>
        </section>

        <section className="space-y-3 text-slate-300 text-sm leading-relaxed">
          <h2 className="text-xl font-bold text-white">2. Educational Services & Disclaimer</h2>
          <p>
            The Gateway to Future provides German language training (A1, A2, B1, B2), exam preparation tools (Goethe, telc, TestDaF), and career pathway guidance (Studienkolleg, Ausbildung, medical Anerkennung in Germany). While we provide high-fidelity preparation material and advisory services, final visa issuance and university admission remain within the sole discretion of the German Embassy and admissions bodies.
          </p>
        </section>

        <section className="space-y-3 text-slate-300 text-sm leading-relaxed">
          <h2 className="text-xl font-bold text-white">3. Intellectual Property</h2>
          <p>
            All curricular materials, custom workbooks, flashcard databases, examination engines, software code, and brand trademarks ("The Gateway to Future", "GTF", "Creating Career Without Borders") are the intellectual property of The Gateway to Future. Unauthorized reproduction, distribution, or reverse-engineering is strictly prohibited.
          </p>
        </section>

        <section className="space-y-3 text-slate-300 text-sm leading-relaxed">
          <h2 className="text-xl font-bold text-white">4. User Conduct & Accounts</h2>
          <p>
            Users agree not to misuse the platform, attempt unauthorized access to restricted endpoints, or submit fraudulent documents during admissions processing. We reserve the right to suspend accounts violating these standards.
          </p>
        </section>

        <section className="space-y-3 text-slate-300 text-sm leading-relaxed">
          <h2 className="text-xl font-bold text-white">5. Governing Law & Jurisdiction</h2>
          <p>
            These terms are governed by the laws of India and Germany applicable to corporate service agreements.
          </p>
          <div className="pt-2">
            <a
              href="mailto:ashusharma@gatewaytofuture.com"
              className="inline-flex items-center gap-2 text-sm text-amber-400 hover:text-amber-300 font-medium"
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
