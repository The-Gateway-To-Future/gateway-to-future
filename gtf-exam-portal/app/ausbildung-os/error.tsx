"use client";

import Link from "next/link";
import { AlertTriangle, ArrowLeft, RotateCcw } from "lucide-react";

export default function AusbildungOsError({
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <div className="min-h-screen flex items-center justify-center bg-[#051329] px-4 py-12 text-white">
      <div className="w-full max-w-md rounded-2xl border border-[#FFD166]/30 bg-[#0A1628] p-6 sm:p-8 shadow-xl text-center space-y-5">
        <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl border border-[#FFD166]/40 bg-[#FFD166]/10 text-[#FFD166]">
          <AlertTriangle className="h-6 w-6" />
        </div>
        <div className="space-y-1.5">
          <h1 className="text-lg font-bold text-white">Ausbildung OS Temporarily Interrupted</h1>
          <p className="text-xs sm:text-sm text-slate-300 leading-relaxed">
            Your checklist progress and local CV draft remain safe. Reload the workspace to continue.
          </p>
        </div>
        <div className="flex flex-col sm:flex-row gap-2.5 justify-center">
          <button
            type="button"
            onClick={reset}
            className="inline-flex items-center justify-center gap-2 rounded-xl bg-[#FFD166] px-4 py-2.5 text-xs font-extrabold text-[#0A1628] hover:bg-amber-300 transition cursor-pointer"
          >
            <RotateCcw className="h-3.5 w-3.5" />
            <span>Reload Ausbildung OS</span>
          </button>
          <Link
            href="/dashboard"
            className="inline-flex items-center justify-center gap-2 rounded-xl border border-white/15 bg-white/5 px-4 py-2.5 text-xs font-semibold text-white hover:bg-white/10 transition"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            <span>Return to Hub</span>
          </Link>
        </div>
      </div>
    </div>
  );
}
