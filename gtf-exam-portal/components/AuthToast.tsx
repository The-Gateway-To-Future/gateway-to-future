"use client";

import React, { useEffect } from "react";
import { AlertCircle, CheckCircle2, ShieldAlert, X } from "lucide-react";

export type AuthToastTone = "success" | "warning" | "error";

export interface AuthToastState {
  id: number;
  title: string;
  message: string;
  tone: AuthToastTone;
}

interface AuthToastProps {
  toast: AuthToastState | null;
  onDismiss: () => void;
}

export function AuthToast({ toast, onDismiss }: AuthToastProps) {
  useEffect(() => {
    if (!toast) return;
    const timer = window.setTimeout(() => {
      onDismiss();
    }, 5500);
    return () => window.clearTimeout(timer);
  }, [toast, onDismiss]);

  if (!toast) return null;

  const icon =
    toast.tone === "success" ? (
      <CheckCircle2 className="h-4 w-4 text-emerald-400 shrink-0 mt-0.5" />
    ) : toast.tone === "warning" ? (
      <ShieldAlert className="h-4 w-4 text-amber-400 shrink-0 mt-0.5" />
    ) : (
      <AlertCircle className="h-4 w-4 text-zinc-200 shrink-0 mt-0.5" />
    );

  const ringClass =
    toast.tone === "success"
      ? "border-emerald-400/25"
      : toast.tone === "warning"
        ? "border-amber-400/25"
        : "border-white/20";

  return (
    <div
      role="status"
      aria-live="polite"
      className="fixed top-6 right-4 sm:right-6 z-[100] w-[calc(100vw-2rem)] max-w-sm"
    >
      <div
        className={`flex items-start gap-3 rounded-2xl border ${ringClass} bg-[#0D1017]/95 px-4 py-3.5 text-white shadow-[0_24px_60px_rgba(0,0,0,0.65)] backdrop-blur-xl`}
      >
        {icon}
        <div className="min-w-0 flex-1 space-y-0.5">
          <p className="text-xs font-semibold uppercase tracking-[0.14em] text-white">
            {toast.title}
          </p>
          <p className="text-xs leading-relaxed text-zinc-400">{toast.message}</p>
        </div>
        <button
          type="button"
          onClick={onDismiss}
          aria-label="Dismiss notification"
          className="rounded-lg p-1 text-zinc-500 transition hover:bg-white/5 hover:text-white shrink-0"
        >
          <X className="h-3.5 w-3.5" />
        </button>
      </div>
    </div>
  );
}
