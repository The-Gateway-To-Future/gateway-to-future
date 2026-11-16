"use client";

import React, { useEffect } from "react";
import { AlertCircle, RotateCcw } from "lucide-react";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("[GTF Global Root Error]", error);
  }, [error]);

  return (
    <html lang="de" className="h-full bg-slate-50">
      <body className="min-h-screen flex items-center justify-center p-4 sm:p-6 bg-slate-50 text-slate-900 font-sans">
        <div className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-6 sm:p-8 text-center space-y-5 shadow-sm">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl border border-red-200 bg-red-50 text-red-600">
            <AlertCircle className="h-7 w-7" />
          </div>

          <div className="space-y-2">
            <span className="inline-block rounded-full border border-slate-200 bg-slate-100 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-700">
              Gateway to Future (GTF)
            </span>
            <h2 className="text-xl sm:text-2xl font-semibold tracking-tight text-slate-900">
              Something went wrong loading this content
            </h2>
            <p className="text-xs sm:text-sm text-slate-600 leading-relaxed">
              An application error occurred. Tap below to reload the session.
            </p>
          </div>

          <button
            type="button"
            onClick={() => reset()}
            className="w-full inline-flex items-center justify-center gap-2 rounded-xl bg-slate-900 px-6 py-3 text-xs font-semibold uppercase tracking-[0.16em] text-white hover:bg-slate-800 transition shadow-sm cursor-pointer"
          >
            <RotateCcw className="h-4 w-4" />
            <span>Try Again</span>
          </button>
        </div>
      </body>
    </html>
  );
}
