"use client";

import React from "react";
import Link from "next/link";
import { BookOpen, GraduationCap, ShieldCheck } from "lucide-react";
import { useIsNativeApp } from "@/lib/use-native-platform";

interface ReaderAppNoticeProps {
  compact?: boolean;
  isAuthenticated?: boolean;
}

/**
 * Google Play & App Store Reader-App Compliant Companion Notice.
 * Displayed inside native Capacitor builds (`Capacitor.isNativePlatform() === true`)
 * in place of pricing cards, upgrade CTAs, Razorpay/UPI flows, or external payment links.
 * Contains ZERO clickable external checkout URLs.
 */
export function ReaderAppNotice({
  compact = false,
  isAuthenticated = false,
}: ReaderAppNoticeProps) {
  if (compact) {
    return (
      <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 space-y-2 text-left">
        <div className="inline-flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-[0.16em] text-slate-600">
          <ShieldCheck className="h-3.5 w-3.5 text-emerald-600 shrink-0" />
          <span>Enrolled Student Companion Portal</span>
        </div>
        <p className="text-xs text-slate-700 leading-relaxed">
          Gateway To Future App is a companion learning portal for enrolled students. Log in with your existing account to access your courses.
        </p>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-2xl rounded-3xl border border-slate-200 bg-white p-7 sm:p-10 text-center space-y-6 shadow-sm">
      <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-slate-900 text-white shadow-xs">
        <GraduationCap className="h-7 w-7" />
      </div>

      <div className="space-y-2.5">
        <span className="inline-flex items-center gap-1.5 rounded-full border border-slate-200 bg-slate-100 px-3 py-1 text-[10px] font-bold uppercase tracking-[0.18em] text-slate-700">
          <ShieldCheck className="h-3.5 w-3.5 text-emerald-600" />
          <span>Companion Learning Portal</span>
        </span>
        <h2 className="text-2xl sm:text-3xl font-bold tracking-tight text-slate-900">
          Enrolled Student Access
        </h2>
        <p className="text-sm sm:text-base text-slate-600 leading-relaxed max-w-xl mx-auto">
          Gateway To Future App is a companion learning portal for enrolled students. Log in with your existing account to access your courses.
        </p>
      </div>

      <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
        {isAuthenticated ? (
          <Link
            href="/academy"
            className="inline-flex items-center justify-center gap-2 rounded-xl bg-slate-900 px-6 py-3 text-xs font-semibold uppercase tracking-[0.16em] text-white hover:bg-slate-800 transition shadow-sm"
          >
            <BookOpen className="h-4 w-4" />
            <span>Open Language Academy</span>
          </Link>
        ) : (
          <Link
            href="/login"
            className="inline-flex items-center justify-center gap-2 rounded-xl bg-slate-900 px-6 py-3 text-xs font-semibold uppercase tracking-[0.16em] text-white hover:bg-slate-800 transition shadow-sm"
          >
            <span>Log In to Your Account</span>
          </Link>
        )}
        <Link
          href={isAuthenticated ? "/dashboard" : "/"}
          className="inline-flex items-center justify-center rounded-xl border border-slate-300 bg-white px-5 py-3 text-xs font-semibold uppercase tracking-[0.14em] text-slate-700 hover:bg-slate-50 transition"
        >
          <span>{isAuthenticated ? "Back to Hub" : "Back to Home"}</span>
        </Link>
      </div>
    </div>
  );
}

/**
 * Renders children ONLY on non-native web browsers (`ready && !isNative`).
 * Useful inside Server Components to hide web-only `/pricing` links on Android/iOS.
 */
export function WebOnly({
  children,
  nativeFallback = null,
}: {
  children: React.ReactNode;
  nativeFallback?: React.ReactNode;
}) {
  const { isNative, ready } = useIsNativeApp();
  if (!ready) return null;
  if (isNative) return <>{nativeFallback}</>;
  return <>{children}</>;
}
