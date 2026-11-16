"use client";

import React, { useEffect } from "react";
import Link from "next/link";
import { AlertCircle, RotateCcw, Home } from "lucide-react";
import { BRAND } from "@/lib/config";

export default function DashboardError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("[GTF Dashboard Error Boundary]", error);
  }, [error]);

  return (
    <div className="min-h-screen flex items-center justify-center p-4 sm:p-6 bg-slate-50 text-slate-900 font-sans">
      <div className="w-full max-w-lg rounded-2xl border border-slate-200 bg-white p-6 sm:p-8 text-center space-y-5 shadow-sm">
        <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl border border-slate-300 bg-slate-100 text-slate-800">
          <AlertCircle className="h-7 w-7" />
        </div>

        <div className="space-y-2">
          <span className="inline-block rounded-full border border-slate-200 bg-slate-100 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-700">
            {BRAND.shortName} · Student Command Hub
          </span>
          <h2 className="text-xl sm:text-2xl font-semibold tracking-tight text-slate-900">
            Something went wrong loading this content
          </h2>
          <p className="text-xs sm:text-sm text-slate-600 leading-relaxed">
            Ihr Dashboard konnte nicht vollständig synchronisiert werden. Bitte tippen Sie auf &bdquo;Try Again&ldquo;.
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
            className="inline-flex items-center justify-center gap-2 rounded-xl bg-slate-900 px-6 py-3 text-xs font-semibold uppercase tracking-[0.16em] text-white hover:bg-slate-800 transition shadow-sm cursor-pointer"
          >
            <RotateCcw className="h-4 w-4" />
            <span>Try Again</span>
          </button>

          <Link
            href="/"
            className="inline-flex items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-5 py-3 text-xs font-semibold uppercase tracking-[0.14em] text-slate-700 hover:bg-slate-50 transition shadow-xs"
          >
            <Home className="h-4 w-4" />
            <span>Home</span>
          </Link>
        </div>
      </div>
    </div>
  );
}
