import React from "react";
import Link from "next/link";
import { Compass, Home } from "lucide-react";
import { Navbar } from "@/components/Navbar";
import { BottomNavigationBar } from "@/components/BottomNavigationBar";
import { BRAND } from "@/lib/config";

export default function NotFoundPage() {
  return (
    <div className="min-h-screen flex flex-col bg-slate-50 text-slate-900 pb-24 lg:pb-0">
      <Navbar />

      <main className="flex-1 flex items-center justify-center px-4 py-16">
        <div className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-7 sm:p-10 text-center space-y-6 shadow-sm">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl border border-slate-200 bg-slate-100 text-slate-800">
            <Compass className="h-7 w-7" />
          </div>

          <div className="space-y-2">
            <span className="inline-block rounded-full border border-slate-200 bg-slate-100 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-700">
              {BRAND.shortName} · 404
            </span>
            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-slate-900">
              Page Not Found
            </h1>
            <p className="text-xs sm:text-sm text-slate-600 leading-relaxed">
              The module or page you requested could not be found. Return to the Student Hub to continue your German preparation.
            </p>
          </div>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-1">
            <Link
              href="/dashboard"
              className="w-full sm:w-auto inline-flex items-center justify-center gap-2 rounded-xl bg-slate-900 px-6 py-3 text-xs font-semibold uppercase tracking-[0.16em] text-white hover:bg-slate-800 transition shadow-sm"
            >
              <Home className="h-4 w-4" />
              <span>Back to Hub</span>
            </Link>
            <Link
              href="/"
              className="w-full sm:w-auto inline-flex items-center justify-center gap-2 rounded-xl border border-slate-300 bg-white px-5 py-3 text-xs font-semibold uppercase tracking-[0.14em] text-slate-700 hover:bg-slate-50 transition"
            >
              <span>Home</span>
            </Link>
          </div>
        </div>
      </main>

      <BottomNavigationBar />
    </div>
  );
}
