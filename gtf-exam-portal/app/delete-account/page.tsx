import React from "react";
import Link from "next/link";
import { ArrowLeft, CheckCircle2, Mail, ShieldAlert, Trash2, UserX } from "lucide-react";
import { BRAND } from "@/lib/config";

export const metadata = {
  title: `Account & Data Deletion | ${BRAND.name}`,
  description: `How to permanently delete your ${BRAND.name} (com.gatewaytofuture.app) account and associated learning data in-app or via web request.`,
};

export default function DeleteAccountPage() {
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
            GDPR Art. 17 · Google Play Data Safety
          </span>
        </div>

        <div className="space-y-3">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-red-50 border border-red-200 text-red-800 text-xs font-semibold">
            <UserX className="w-3.5 h-3.5" />
            Account &amp; Personal Data Deletion
          </div>
          <h1 className="text-2xl sm:text-4xl font-extrabold tracking-tight text-slate-900">
            Delete Your {BRAND.name} Account
          </h1>
          <p className="text-slate-600 text-sm sm:text-base leading-relaxed">
            In compliance with Google Play User Data policies and EU GDPR Article 17 (Right to Erasure), users of{" "}
            <strong className="text-slate-900">{BRAND.name}</strong> (Android package{" "}
            <code className="font-mono text-xs bg-slate-100 px-1.5 py-0.5 rounded text-slate-800">
              com.gatewaytofuture.app
            </code>{" "}
            and web portal{" "}
            <code className="font-mono text-xs bg-slate-100 px-1.5 py-0.5 rounded text-slate-800">
              app.gatewaytofuture.com
            </code>
            ) can permanently delete their account and associated data at any time using either method below.
          </p>
        </div>

        {/* Method 1: Instant In-App Self-Service Deletion */}
        <section className="space-y-4 rounded-2xl border border-slate-200 bg-slate-50 p-5 sm:p-6">
          <div className="flex items-center gap-2.5">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-red-100 text-red-700 shrink-0">
              <Trash2 className="w-4 h-4" />
            </div>
            <h2 className="text-lg sm:text-xl font-bold text-slate-900">
              Option 1: Instant Self-Service Deletion (In-App or Web)
            </h2>
          </div>

          <ol className="list-decimal pl-5 space-y-2 text-sm text-slate-700 leading-relaxed">
            <li>
              Sign in to your account in the <strong>{BRAND.name}</strong> mobile app or at{" "}
              <Link href="/login" className="text-amber-700 font-semibold underline">
                app.gatewaytofuture.com/login
              </Link>
              .
            </li>
            <li>
              Open your <strong>Profile</strong> page (tap the <strong>Profile</strong> tab in the bottom navigation bar or top-right account menu).
            </li>
            <li>
              Scroll to the <strong>Account Deletion</strong> section and click <strong>Delete Account</strong>.
            </li>
            <li>
              Type <code>DELETE</code> in the confirmation modal and confirm. Your Firebase Authentication login, Firestore student profile, and synced progress are erased immediately and you are signed out automatically.
            </li>
          </ol>

          <div className="pt-2">
            <Link
              href="/profile"
              className="inline-flex items-center gap-2 rounded-xl bg-slate-900 px-5 py-2.5 text-xs font-semibold uppercase tracking-[0.14em] text-white hover:bg-slate-800 transition"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>Go to Profile to Delete Account</span>
            </Link>
          </div>
        </section>

        {/* Method 2: Email Deletion Request (No App Required) */}
        <section className="space-y-4 rounded-2xl border border-slate-200 bg-white p-5 sm:p-6">
          <div className="flex items-center gap-2.5">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-amber-100 text-amber-800 shrink-0">
              <Mail className="w-4 h-4" />
            </div>
            <h2 className="text-lg sm:text-xl font-bold text-slate-900">
              Option 2: Request Deletion by Email (Without Signing In)
            </h2>
          </div>

          <p className="text-sm text-slate-600 leading-relaxed">
            If you have already uninstalled the app or can no longer access your login, send an email directly from your registered email address to our Berlin privacy desk:
          </p>

          <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 text-xs sm:text-sm space-y-1.5 font-mono text-slate-800 break-words">
            <div>
              <strong className="text-amber-700">To:</strong>{" "}
              <a
                href={`mailto:${BRAND.supportEmail}?subject=${encodeURIComponent("Delete My Account")}&body=${encodeURIComponent("Hello Gateway To Future Privacy Team,\n\nPlease permanently delete my Gateway To Future account and all associated personal data registered under this email address.\n\nRegistered Email: \nFull Name: \n")}`}
                className="underline text-amber-800 font-semibold"
              >
                {BRAND.supportEmail}
              </a>
            </div>
            <div>
              <strong className="text-amber-700">Subject:</strong> Delete My Account
            </div>
            <div>
              <strong className="text-amber-700">Processing Time:</strong> Verified requests are permanently fulfilled within 48 hours.
            </div>
          </div>

          <div className="pt-1">
            <a
              href={`mailto:${BRAND.supportEmail}?subject=${encodeURIComponent("Delete My Account")}&body=${encodeURIComponent("Hello Gateway To Future Privacy Team,\n\nPlease permanently delete my Gateway To Future account and all associated personal data registered under this email address.\n\nRegistered Email: \nFull Name: \n")}`}
              className="inline-flex items-center gap-2 rounded-xl border border-slate-300 bg-slate-50 px-5 py-2.5 text-xs font-semibold uppercase tracking-[0.14em] text-slate-800 hover:bg-slate-100 transition"
            >
              <Mail className="w-3.5 h-3.5" />
              <span>Email {BRAND.supportEmail} to Delete Account</span>
            </a>
          </div>
        </section>

        {/* Scope of Data Deleted & Retention Disclosure */}
        <section className="space-y-3 text-slate-600 text-sm leading-relaxed border-t border-slate-200 pt-6">
          <h2 className="text-lg sm:text-xl font-bold text-slate-900">
            What Data Is Deleted vs. Retained
          </h2>
          <ul className="space-y-2">
            <li className="flex items-start gap-2.5">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
              <span>
                <strong className="text-slate-900">Permanently Deleted:</strong> Firebase Authentication credentials (email, UID, password hash), Firestore student &amp; user profiles (<code>students</code>, <code>users</code>), synced learning progress &amp; streaks (<code>user_progress</code>), active portal sessions, and stored course unlock records.
              </span>
            </li>
            <li className="flex items-start gap-2.5">
              <ShieldAlert className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
              <span>
                <strong className="text-slate-900">Statutory Retention Exceptions:</strong> Where invoices or statutory tax records were issued for offline/web tuition services, minimal accounting records may be retained strictly as mandated by German (§ 147 AO / § 257 HGB) or Indian tax law and are isolated from the learning platform.
              </span>
            </li>
          </ul>
        </section>

        <div className="border-t border-slate-200 pt-6 flex flex-wrap items-center justify-between gap-4 text-xs text-slate-500">
          <div>
            <strong className="text-slate-800">{BRAND.name}</strong> · {BRAND.founderName} ({BRAND.founderTitle}) · {BRAND.headquarters}, Germany
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
            <Link
              href="/impressum"
              className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-2 text-xs font-semibold uppercase tracking-[0.14em] text-slate-700 hover:bg-slate-100 transition"
            >
              Impressum
            </Link>
          </div>
        </div>
      </div>
    </main>
  );
}
