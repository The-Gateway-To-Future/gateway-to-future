"use client";

import React, { useEffect } from "react";
import Link from "next/link";
import { AlertCircle, RotateCcw, BookOpen, Home } from "lucide-react";
import { BRAND } from "@/lib/config";

export default function AcademyError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("[GTF Academy Error Boundary]", error);
  }, [error]);

  return (
    <div className="min-h-screen flex items-center justify-center p-4 sm:p-6 bg-slate-50 text-slate-900 font-sans">
      <div className="w-full max-w-lg rounded-2xl border border-slate-200 bg-white p-6 sm:p-8 text-center space-y-5 shadow-sm">
        <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl border border-amber-200 bg-amber-50 text-amber-700">
          <AlertCircle className="h-7 w-7" />
        </div>

        <div className="space-y-2">
          <span className="inline-block rounded-full border border-slate-200 bg-slate-100 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-700">
            {BRAND.shortName} German Academy · Module Notice
          </span>
          <h2 className="text-xl sm:text-2xl font-semibold tracking-tight text-slate-900">
            Something went wrong loading this content
          </h2>
          <p className="text-xs sm:text-sm text-slate-600 leading-relaxed">
            Das Lernmodul oder die Flashcard-Sammlung konnte nicht fehlerfrei gerendert werden. Bitte tippen Sie auf &bdquo;Try Again&ldquo; oder wählen Sie ein anderes Modul.
          </p>
        </div>

        {error?.message && (
          <div className="rounded-xl border border-slate-200 bg-slate-50 p-3 text-left">
            <p className="font-mono text-[11px] text-slate-600 break-words line-clamp-2">
              {error.message}
            </p>
            {error.digest && (
              <p className="font-mono text-[10px] text-slate-400 mt-1">
                Digest: {error.digest}
              </p>
            )}
          </div>
        )}

        <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
          <button
            type="button"
            onClick={() => reset()}
            className="relative z-20 inline-flex items-center justify-center gap-2 rounded-xl bg-slate-900 px-6 py-3 text-xs font-semibold uppercase tracking-[0.16em] text-white hover:bg-slate-800 transition shadow-sm cursor-pointer"
          >
            <RotateCcw className="h-4 w-4" />
            <span>Reload Module</span>
          </button>

          <Link
            href="/academy"
            className="relative z-20 inline-flex items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-5 py-3 text-xs font-semibold uppercase tracking-[0.14em] text-slate-700 hover:bg-slate-50 transition shadow-xs cursor-pointer"
          >
            <BookOpen className="h-4 w-4" />
            <span>Academy Hub</span>
          </Link>

          <Link
            href="/dashboard"
            className="relative z-20 inline-flex items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-5 py-3 text-xs font-semibold uppercase tracking-[0.14em] text-slate-700 hover:bg-slate-50 transition shadow-xs cursor-pointer"
          >
            <Home className="h-4 w-4" />
            <span>Dashboard</span>
          </Link>
        </div>
      </div>
    </div>
  );
}
