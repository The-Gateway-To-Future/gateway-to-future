"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import {
  ArrowLeft,
  CheckCircle2,
  ExternalLink,
  Laptop,
  Loader2,
  RotateCcw,
  ShieldCheck,
  Smartphone,
  Sparkles,
  Tablet,
} from "lucide-react";

export default function WebsitePreviewPage() {
  const [viewport, setViewport] = useState<"desktop" | "tablet" | "mobile">("desktop");
  const [showPill, setShowPill] = useState(true);
  const [showFloating, setShowFloating] = useState(true);

  const [isAttached, setIsAttached] = useState(false);
  const [backupExists, setBackupExists] = useState(false);
  const [checkingStatus, setCheckingStatus] = useState(true);
  const [attaching, setAttaching] = useState(false);
  const [restoring, setRestoring] = useState(false);
  const [toast, setToast] = useState<string | null>(null);

  const showNotification = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(null), 5000);
  };

  const fetchStatus = async () => {
    try {
      const res = await fetch("/api/admin/attach-website-button");
      if (res.ok) {
        const data = await res.json();
        setIsAttached(Boolean(data.isAttached));
        setBackupExists(Boolean(data.backupExists));
      }
    } catch {
      // offline/dev
    } finally {
      setCheckingStatus(false);
    }
  };

  useEffect(() => {
    fetchStatus();
  }, []);

  const handleAttachButton = async () => {
    setAttaching(true);
    try {
      const res = await fetch("/api/admin/attach-website-button", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "attach" }),
      });
      const data = await res.json();
      if (res.ok) {
        setIsAttached(true);
        setBackupExists(true);
        showNotification(data.message || "Attached successfully with backup created!");
      } else {
        showNotification(`Error: ${data.error}`);
      }
    } catch (err: unknown) {
      showNotification(`Failed: ${err instanceof Error ? err.message : String(err)}`);
    } finally {
      setAttaching(false);
    }
  };

  const handleRestoreBackup = async () => {
    if (!confirm("Restore original index.html from index.backup.html?")) return;
    setRestoring(true);
    try {
      const res = await fetch("/api/admin/attach-website-button", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "restore" }),
      });
      const data = await res.json();
      if (res.ok) {
        setIsAttached(false);
        showNotification("Restored original index.html successfully!");
      } else {
        showNotification(`Restore failed: ${data.error}`);
      }
    } catch (err: unknown) {
      showNotification(`Restore error: ${err instanceof Error ? err.message : String(err)}`);
    } finally {
      setRestoring(false);
    }
  };

  const iframeSrc = `/api/admin/website-html?pill=${showPill}&floating=${showFloating}&v=${Date.now()}`;

  const viewportWidthClass =
    viewport === "mobile"
      ? "max-w-[400px]"
      : viewport === "tablet"
        ? "max-w-[820px]"
        : "w-full";

  return (
    <div className="min-h-screen flex flex-col bg-slate-900 text-white font-sans">
      {/* Top Interactive Control Bar */}
      <header className="sticky top-0 z-50 border-b border-slate-800 bg-slate-900/95 backdrop-blur-md px-4 py-3 shadow-lg">
        <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-3">
          {/* Brand & Title */}
          <div className="flex items-center gap-3">
            <Link
              href="/admin"
              className="inline-flex items-center gap-1.5 rounded-lg border border-slate-700 bg-slate-800 px-2.5 py-1.5 text-xs font-semibold text-slate-300 hover:bg-slate-700"
            >
              <ArrowLeft className="h-3.5 w-3.5" />
              <span>Admin</span>
            </Link>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-sm font-bold text-white">
                  Main Website Safe Integration Preview
                </span>
                <span className="rounded-full bg-emerald-500/20 px-2 py-0.5 text-[10px] font-bold text-emerald-300">
                  Zero CSS Conflict
                </span>
              </div>
              <p className="text-[11px] text-slate-400">
                Live simulated preview of <code className="text-amber-300 font-mono">www.gatewaytofuture.com</code> with Shadow DOM launcher
              </p>
            </div>
          </div>

          {/* Viewport & Toggle Controls */}
          <div className="flex flex-wrap items-center gap-2">
            {/* Viewport selector */}
            <div className="flex items-center rounded-xl border border-slate-700 bg-slate-800/80 p-0.5">
              <button
                type="button"
                onClick={() => setViewport("desktop")}
                className={`flex items-center gap-1 rounded-lg px-2.5 py-1 text-xs font-semibold transition ${
                  viewport === "desktop"
                    ? "bg-gtf-gold text-gtf-ink shadow"
                    : "text-slate-400 hover:text-white"
                }`}
              >
                <Laptop className="h-3.5 w-3.5" />
                <span className="hidden sm:inline">Desktop</span>
              </button>
              <button
                type="button"
                onClick={() => setViewport("tablet")}
                className={`flex items-center gap-1 rounded-lg px-2.5 py-1 text-xs font-semibold transition ${
                  viewport === "tablet"
                    ? "bg-gtf-gold text-gtf-ink shadow"
                    : "text-slate-400 hover:text-white"
                }`}
              >
                <Tablet className="h-3.5 w-3.5" />
                <span className="hidden sm:inline">Tablet</span>
              </button>
              <button
                type="button"
                onClick={() => setViewport("mobile")}
                className={`flex items-center gap-1 rounded-lg px-2.5 py-1 text-xs font-semibold transition ${
                  viewport === "mobile"
                    ? "bg-gtf-gold text-gtf-ink shadow"
                    : "text-slate-400 hover:text-white"
                }`}
              >
                <Smartphone className="h-3.5 w-3.5" />
                <span className="hidden sm:inline">Mobile</span>
              </button>
            </div>

            {/* Toggle options */}
            <label className="flex items-center gap-1.5 rounded-lg border border-slate-700 bg-slate-800 px-2.5 py-1 text-xs cursor-pointer text-slate-300">
              <input
                type="checkbox"
                checked={showPill}
                onChange={(e) => setShowPill(e.target.checked)}
                className="rounded accent-amber-400"
              />
              <span>Header Pill</span>
            </label>

            <label className="flex items-center gap-1.5 rounded-lg border border-slate-700 bg-slate-800 px-2.5 py-1 text-xs cursor-pointer text-slate-300">
              <input
                type="checkbox"
                checked={showFloating}
                onChange={(e) => setShowFloating(e.target.checked)}
                className="rounded accent-amber-400"
              />
              <span>Floating Badge</span>
            </label>

            {/* 1-Click Auto-Attach Button */}
            <button
              type="button"
              onClick={handleAttachButton}
              disabled={attaching || checkingStatus}
              className={`inline-flex items-center gap-1.5 rounded-xl px-3.5 py-1.5 text-xs font-extrabold shadow-md transition ${
                isAttached
                  ? "border border-emerald-400/40 bg-emerald-500/20 text-emerald-300"
                  : "bg-emerald-600 text-white hover:bg-emerald-500 active:scale-[0.98]"
              }`}
            >
              {attaching ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : isAttached ? (
                <ShieldCheck className="h-3.5 w-3.5 text-emerald-300" />
              ) : (
                <Sparkles className="h-3.5 w-3.5 text-emerald-200" />
              )}
              <span>
                {isAttached
                  ? "✔ Attached to index.html"
                  : "Auto-Attach Floating Button (With Backup)"}
              </span>
            </button>

            {backupExists && (
              <button
                type="button"
                onClick={handleRestoreBackup}
                disabled={restoring}
                className="inline-flex items-center gap-1 rounded-xl border border-rose-500/30 bg-rose-950/60 px-2.5 py-1.5 text-xs font-semibold text-rose-300 hover:bg-rose-900/60"
                title="Restore original index.html from backup"
              >
                <RotateCcw className="h-3 w-3" />
                <span>Restore</span>
              </button>
            )}

            <Link
              href="/dashboard"
              className="inline-flex items-center gap-1 rounded-xl bg-gtf-primary px-3 py-1.5 text-xs font-bold text-white hover:bg-sky-700"
            >
              <span>Portal</span>
              <ExternalLink className="h-3 w-3" />
            </Link>
          </div>
        </div>
      </header>

      {/* Toast Alert */}
      {toast && (
        <div className="fixed bottom-6 right-6 z-50 flex items-center gap-2 rounded-xl bg-emerald-600 px-4 py-3 text-xs font-bold text-white shadow-2xl">
          <CheckCircle2 className="h-4 w-4 shrink-0" />
          <span>{toast}</span>
        </div>
      )}

      {/* Main Preview Screen */}
      <main className="flex-1 flex flex-col items-center justify-start p-4 bg-slate-900">
        <div
          className={`flex-1 w-full ${viewportWidthClass} transition-all duration-300 rounded-2xl overflow-hidden border border-slate-700 shadow-2xl bg-white flex flex-col min-h-[calc(100vh-90px)]`}
        >
          {/* Simulated Browser Bar */}
          <div className="flex items-center justify-between border-b border-slate-200 bg-slate-100 px-4 py-2 text-xs text-slate-500 select-none">
            <div className="flex items-center gap-1.5">
              <span className="h-2.5 w-2.5 rounded-full bg-rose-400" />
              <span className="h-2.5 w-2.5 rounded-full bg-amber-400" />
              <span className="h-2.5 w-2.5 rounded-full bg-emerald-400" />
            </div>
            <div className="flex items-center gap-1.5 rounded-md bg-white px-4 py-1 text-[11px] font-mono text-slate-700 border border-slate-200 shadow-sm">
              <span className="text-emerald-600 font-bold">🔒</span>
              <span>https://www.gatewaytofuture.com</span>
            </div>
            <div className="text-[10px] text-slate-400">Preview Engine</div>
          </div>

          {/* Website Iframe */}
          <iframe
            src={iframeSrc}
            title="Gateway to Future Website Safe Preview"
            className="w-full flex-1 border-0"
            style={{ minHeight: "calc(100vh - 130px)" }}
          />
        </div>
      </main>
    </div>
  );
}
