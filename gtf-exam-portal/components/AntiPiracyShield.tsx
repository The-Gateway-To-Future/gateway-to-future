"use client";

import { useEffect, useState, useCallback } from "react";
import { ShieldAlert, Lock } from "lucide-react";
import { BRAND } from "@/lib/config";
import { getActiveUserEmail } from "@/lib/client-storage";

interface AntiPiracyShieldProps {
  userEmail?: string;
  resourceTitle?: string;
  enableWatermark?: boolean;
}

export function AntiPiracyShield({
  userEmail,
  resourceTitle,
  enableWatermark = true,
}: AntiPiracyShieldProps) {
  const [email, setEmail] = useState<string>(userEmail || "");
  const [showToast, setShowToast] = useState(false);
  const [toastMessage, setToastMessage] = useState<string>("");
  const [sessionStamp, setSessionStamp] = useState<string>("GTF-SESSION");
  const [dateStamp, setDateStamp] = useState<string>("");

  useEffect(() => {
    setSessionStamp(`GTF-${Date.now().toString(36).toUpperCase()}`);
    setDateStamp(new Date().toLocaleDateString("de-DE"));
  }, []);

  useEffect(() => {
    if (!email) {
      setEmail(getActiveUserEmail());
    }
  }, [email]);

  const triggerSecurityAlert = useCallback((msg: string) => {
    setToastMessage(msg);
    setShowToast(true);
    const timer = window.setTimeout(() => setShowToast(false), 2600);
    return () => window.clearTimeout(timer);
  }, []);

  // Block context menu (Right-click) outside editable inputs so Android/iOS Schreiben editing works cleanly
  useEffect(() => {
    const handleContextMenu = (e: MouseEvent) => {
      const target = e.target as HTMLElement | null;
      const isEditable =
        target &&
        (target.tagName === "INPUT" ||
          target.tagName === "TEXTAREA" ||
          target.getAttribute("contenteditable") === "true" ||
          Boolean(target.closest("input, textarea, [contenteditable='true']")));
      if (isEditable) return;

      e.preventDefault();
      e.stopPropagation();
      triggerSecurityAlert("🔒 Right-click and copying are disabled on Gateway To Future materials.");
    };

    const handleKeyDown = (e: KeyboardEvent) => {
      const isMac = typeof navigator !== "undefined" && navigator.platform.toUpperCase().indexOf("MAC") >= 0;
      const cmdOrCtrl = isMac ? e.metaKey : e.ctrlKey;
      const key = e.key.toLowerCase();

      // Check if target is an interactive user input/textarea where typing is allowed
      const target = e.target as HTMLElement | null;
      const isInput =
        target &&
        (target.tagName === "INPUT" ||
          target.tagName === "TEXTAREA" ||
          target.getAttribute("contenteditable") === "true");

      // 1. Block Print: Ctrl+P / Cmd+P
      if (cmdOrCtrl && key === "p") {
        e.preventDefault();
        e.stopPropagation();
        triggerSecurityAlert("⚠️ Printing is strictly blocked to protect proprietary GTF courseware.");
        return;
      }

      // 2. Block Save Page As: Ctrl+S / Cmd+S
      if (cmdOrCtrl && key === "s") {
        e.preventDefault();
        e.stopPropagation();
        triggerSecurityAlert("⚠️ Saving offline copies of this document is prohibited.");
        return;
      }

      // 3. Block View Source: Ctrl+U / Cmd+U
      if (cmdOrCtrl && key === "u") {
        e.preventDefault();
        e.stopPropagation();
        triggerSecurityAlert("🔒 Source code inspection is disabled.");
        return;
      }

      // 4. Block Developer Tools: F12 or Ctrl+Shift+I / Cmd+Option+I / Cmd+Option+J
      if (
        key === "f12" ||
        (cmdOrCtrl && e.shiftKey && (key === "i" || key === "j" || key === "c"))
      ) {
        e.preventDefault();
        e.stopPropagation();
        triggerSecurityAlert("🔒 Developer inspection tools are restricted on exam content.");
        return;
      }

      // 5. Block Select All outside inputs: Ctrl+A / Cmd+A
      if (cmdOrCtrl && key === "a" && !isInput) {
        e.preventDefault();
        e.stopPropagation();
        return;
      }

      // 6. Block Copy outside inputs: Ctrl+C / Cmd+C
      if (cmdOrCtrl && key === "c" && !isInput) {
        e.preventDefault();
        e.stopPropagation();
        triggerSecurityAlert("🔒 Text copying is disabled to protect intellectual property.");
        return;
      }
    };

    window.addEventListener("contextmenu", handleContextMenu, { capture: true });
    window.addEventListener("keydown", handleKeyDown, { capture: true });

    return () => {
      window.removeEventListener("contextmenu", handleContextMenu, { capture: true });
      window.removeEventListener("keydown", handleKeyDown, { capture: true });
    };
  }, [triggerSecurityAlert]);

  const displayEmail = email || "student@gatewaytofuture.com";
  const watermarkText = `THE GATEWAY TO FUTURE (GTF) • LICENSED TO ${displayEmail.toUpperCase()} • DO NOT DISTRIBUTE`;

  return (
    <>
      {/* Floating anti-piracy violation warning toast */}
      {showToast && (
        <div
          role="alert"
          className="fixed top-6 left-1/2 -translate-x-1/2 z-[9999] flex w-[calc(100vw-2rem)] max-w-md items-center gap-3 rounded-2xl border border-amber-200 bg-white px-4 py-3 text-xs sm:text-sm font-medium text-slate-900 shadow-lg backdrop-blur-md transition-all duration-300"
        >
          <ShieldAlert className="h-5 w-5 text-amber-600 shrink-0" />
          <span className="leading-snug">{toastMessage}</span>
        </div>
      )}

      {/* Dynamic Repeating Diagonal User-Email Watermark Overlay (below sticky headers) */}
      {enableWatermark && (
        <div
          className="pointer-events-none fixed inset-0 z-20 overflow-hidden select-none opacity-[0.055] dark:opacity-[0.08]"
          aria-hidden="true"
        >
          <svg className="h-full w-full" xmlns="http://www.w3.org/2000/svg">
            <defs>
              <pattern
                id="gtf-dynamic-watermark"
                width="480"
                height="220"
                patternUnits="userSpaceOnUse"
                patternTransform="rotate(-25)"
              >
                <text
                  x="20"
                  y="50"
                  fill="#0F4C81"
                  fontSize="12.5"
                  fontWeight="bold"
                  fontFamily="sans-serif"
                  letterSpacing="1"
                >
                  {watermarkText}
                </text>
                <text
                  x="140"
                  y="150"
                  fill="#2A9D8F"
                  fontSize="11"
                  fontWeight="bold"
                  fontFamily="sans-serif"
                  letterSpacing="1"
                >
                  {BRAND.name} • BERLIN{dateStamp ? ` • ${dateStamp}` : ""}
                </text>
              </pattern>
            </defs>
            <rect width="100%" height="100%" fill="url(#gtf-dynamic-watermark)" />
          </svg>
        </div>
      )}

      {/* Print-Only Anti-Piracy Blocker Notice (Shown when browser print dialog is triggered) */}
      <div id="print-piracy-warning" aria-hidden="true">
        <div className="max-w-xl rounded-2xl border-4 border-red-600 bg-red-50 p-8 text-center text-slate-900">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-red-600 text-white">
            <Lock className="h-8 w-8" />
          </div>
          <h1 className="text-2xl font-black uppercase tracking-tight text-red-700">
            Proprietary GTF Educational Material
          </h1>
          <p className="mt-2 text-sm font-bold uppercase tracking-wider text-slate-700">
            Printing & Digital Redistribution Strictly Prohibited
          </p>
          <div className="mt-6 rounded-lg border border-red-200 bg-white p-4 text-xs text-slate-600">
            <p>
              This workbook and examination material are protected under German Copyright Law (Urheberrechtsgesetz § 106 UrhG)
              and International Intellectual Property Treaties.
            </p>
            <p className="mt-2 font-mono font-semibold text-slate-900">
              Digitally Licensed to: {displayEmail}
            </p>
            {resourceTitle && (
              <p className="font-mono text-slate-700">Document: {resourceTitle}</p>
            )}
            <p className="mt-1 text-[11px] text-slate-500">
              Session ID: {sessionStamp} • Berlin, Germany
            </p>
          </div>
          <p className="mt-4 text-xs font-medium text-slate-500">
            © The Gateway to Future (GTF) Berlin • www.gatewaytofuture.com
          </p>
        </div>
      </div>
    </>
  );
}
