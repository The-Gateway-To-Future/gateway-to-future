"use client";

import Link from "next/link";
import { AlertTriangle, ArrowLeft, RotateCcw } from "lucide-react";

export default function ProfileError({
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50 px-4 py-12 text-slate-900">
      <div className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-6 sm:p-8 shadow-sm text-center space-y-5">
        <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl border border-amber-200 bg-amber-50 text-amber-700">
          <AlertTriangle className="h-6 w-6" />
        </div>
        <div className="space-y-1.5">
          <h1 className="text-lg font-bold text-slate-900">Unable to load Profile</h1>
          <p className="text-xs sm:text-sm text-slate-600 leading-relaxed">
            A temporary error occurred while loading your account settings. Please retry.
          </p>
        </div>
        <div className="flex flex-col sm:flex-row gap-2.5 justify-center">
          <button
            type="button"
            onClick={reset}
            className="inline-flex items-center justify-center gap-2 rounded-xl bg-slate-900 px-4 py-2.5 text-xs font-bold text-white hover:bg-slate-800 transition cursor-pointer"
          >
            <RotateCcw className="h-3.5 w-3.5" />
            <span>Retry</span>
          </button>
          <Link
            href="/dashboard"
            className="inline-flex items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-xs font-semibold text-slate-700 hover:bg-slate-50 transition"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            <span>Return to Hub</span>
          </Link>
        </div>
      </div>
    </div>
  );
}
