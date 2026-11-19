import React from "react";
import Link from "next/link";
import { Shield, ArrowLeft, Mail, MapPin } from "lucide-react";

export const metadata = {
  title: "Privacy Policy | Gateway To Future",
  description: "Official Privacy Policy for Gateway To Future mobile app and web platform.",
};

export default function PrivacyPolicyPage() {
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
            <Shield className="w-3.5 h-3.5" />
            GDPR & Store Guidelines Compliant
          </div>
          <h1 className="text-2xl sm:text-4xl font-extrabold tracking-tight text-slate-900">
            Privacy Policy
          </h1>
          <p className="text-slate-600 text-sm sm:text-base">
            This Privacy Policy explains how <strong className="text-slate-900">The Gateway to Future</strong> ("GTF", "we", "our", or "us") collects, uses, and safeguards your information when you use our web platform and native mobile applications (iOS and Android: <code className="text-amber-700 font-semibold">com.gatewaytofuture.app</code>).
          </p>
        </div>

        <section className="space-y-3 text-slate-600 text-sm leading-relaxed border-t border-slate-200 pt-6">
          <h2 className="text-lg sm:text-xl font-bold text-slate-900">1. Corporate & Legal Entity Details</h2>
          <p>
            The data controller responsible for your personal information is:
          </p>
          <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 text-xs sm:text-sm space-y-1.5 font-mono text-slate-800 break-words">
            <div><strong className="text-amber-700">Legal Entity:</strong> The Gateway to Future</div>
            <div><strong className="text-amber-700">Founder &amp; CEO:</strong> Sarbjit Kour (Founder &amp; CEO, Gateway To Future)</div>
            <div><strong className="text-amber-700">GSTIN:</strong> 05AAOPR7336L3Z0 | <strong className="text-amber-700">PAN:</strong> AAOPR7336L</div>
            <div><strong className="text-amber-700">India Registered Office:</strong> Mahant Building, Main Market Road, Laksar, Haridwar, Uttarakhand - 247663, India</div>
            <div><strong className="text-amber-700">European HQ:</strong> Schönefelder Straße 2, GStU, 12355 Berlin, Germany</div>
            <div><strong className="text-amber-700">Official Website:</strong> https://www.gatewaytofuture.com</div>
            <div><strong className="text-amber-700">Support Email:</strong> info@gatewaytofuture.com</div>
            <div><strong className="text-amber-700">Support Phone:</strong> +49 176 60720947 / +49 1522 8372894</div>
          </div>
        </section>

        <section className="space-y-3 text-slate-600 text-sm leading-relaxed">
          <h2 className="text-lg sm:text-xl font-bold text-slate-900">2. Information We Collect</h2>
          <ul className="list-disc pl-5 space-y-2 text-slate-600">
            <li><strong className="text-slate-900">Account Credentials:</strong> Name, email address, and authentication tokens via Firebase Auth (Google Sign-In and email/password).</li>
            <li><strong className="text-slate-900">Academic & Learning Progress:</strong> Flashcard mastery scores, exam answers, workbook submissions, and CEFR level proficiency (A1, A2, B1, B2).</li>
            <li><strong className="text-slate-900">Microphone & Audio Data:</strong> Audio permissions are requested exclusively to power AI German speaking practice (Sprechen modules). Voice input is processed in real time to assess pronunciation and grammar; audio recordings are not sold or transferred to third-party advertisers.</li>
            <li><strong className="text-slate-900">Device & Usage Diagnostics:</strong> Crash logs, app performance telemetry, and device operating system version to ensure app reliability.</li>
          </ul>
        </section>

        <section className="space-y-3 text-slate-600 text-sm leading-relaxed">
          <h2 className="text-lg sm:text-xl font-bold text-slate-900">3. How We Use Your Data</h2>
          <p>
            Your information is used strictly to provide educational services, evaluate German language proficiency exams, facilitate career pathway advisement (Studienkolleg, Ausbildung, medical Anerkennung), and maintain platform security. We never sell, rent, or trade your personal data.
          </p>
        </section>

        <section className="space-y-3 text-slate-600 text-sm leading-relaxed">
          <h2 className="text-lg sm:text-xl font-bold text-slate-900">4. GDPR & User Data Rights</h2>
          <p>
            Under the EU General Data Protection Regulation (GDPR) and Indian IT Acts, you have full control over your data:
          </p>
          <ul className="list-disc pl-5 space-y-1.5 text-slate-600">
            <li>Right to access the personal information we hold about you.</li>
            <li>Right to request rectification of inaccurate data.</li>
            <li>Right to request complete deletion of your account and associated records (Right to be Forgotten).</li>
          </ul>
        </section>

        <section className="space-y-3 text-slate-600 text-sm leading-relaxed">
          <h2 className="text-lg sm:text-xl font-bold text-slate-900">5. Account & Data Deletion (App Store Compliance)</h2>
          <p>
            In compliance with Apple App Store Guideline 5.1.1(v) and Google Play User Data policies, users can request instant deletion of their account, study history, and profile data at any time:
          </p>
          <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 text-xs sm:text-sm text-slate-800 space-y-2">
            <p>
              1. <strong>In-App:</strong> Navigate to your <em>Profile</em> screen and click <em>Delete Account</em> for instant permanent erasure.
            </p>
            <p>
              2. <strong>Web Deletion Portal:</strong> Visit{" "}
              <Link href="/delete-account" className="text-amber-700 font-medium underline">
                https://app.gatewaytofuture.com/delete-account
              </Link>{" "}
              at any time (no login required to view instructions or initiate a request).
            </p>
            <p>
              3. <strong>By Email:</strong> Send an email from your registered address to <a href="mailto:info@gatewaytofuture.com" className="text-amber-700 font-medium underline">info@gatewaytofuture.com</a> with the subject line <code>"Delete My Account"</code>. All associated records will be purged within 48 hours.
            </p>
          </div>
        </section>

        <section className="space-y-3 text-slate-600 text-sm leading-relaxed">
          <h2 className="text-lg sm:text-xl font-bold text-slate-900">6. Contact Us</h2>
          <p className="text-slate-600">
            For privacy inquiries, data requests, or regulatory questions, reach out to our Data Privacy Officer under the direction of Sarbjit Kour (Founder &amp; CEO, Gateway To Future):
          </p>
          <div className="flex flex-col sm:flex-row gap-4 pt-2">
            <a
              href="mailto:info@gatewaytofuture.com"
              className="inline-flex items-center gap-2 text-sm text-amber-700 hover:text-amber-800 font-medium"
            >
              <Mail className="w-4 h-4" />
              info@gatewaytofuture.com
            </a>
            <span className="inline-flex items-center gap-2 text-sm text-slate-600">
              <MapPin className="w-4 h-4 text-slate-500" />
              Schönefelder Straße 2, GStU, 12355 Berlin, Germany
            </span>
          </div>
        </section>
      </div>
    </main>
  );
}
