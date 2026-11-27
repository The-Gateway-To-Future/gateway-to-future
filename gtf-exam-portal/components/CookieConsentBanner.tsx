"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Shield } from "lucide-react";
import { useIsNativeApp } from "@/lib/use-native-platform";

const STORAGE_KEY = "gtf_cookie_consent_v1";
const DEFAULT_GA_ID = "G-CFB6FD052Q";

type ConsentState = "accepted" | "essential" | null;

declare global {
  interface Window {
    dataLayer?: unknown[];
    gtag?: (...args: unknown[]) => void;
  }
}

function injectGoogleAnalytics(gaId: string) {
  if (typeof window === "undefined" || !gaId) return;
  if (document.getElementById("gtf-ga4-script")) return;

  window.dataLayer = window.dataLayer || [];
  window.gtag = function gtag(...args: unknown[]) {
    window.dataLayer?.push(args);
  };
  window.gtag("js", new Date());
  window.gtag("config", gaId, { anonymize_ip: true });

  const script = document.createElement("script");
  script.id = "gtf-ga4-script";
  script.async = true;
  script.src = `https://www.googletagmanager.com/gtag/js?id=${encodeURIComponent(gaId)}`;
  document.head.appendChild(script);
}

export function CookieConsentBanner() {
  const pathname = usePathname() || "";
  const gaId = process.env.NEXT_PUBLIC_GA_ID || DEFAULT_GA_ID;
  const { isNative, ready: nativeReady } = useIsNativeApp();
  const [visible, setVisible] = useState(false);

  const hasBottomNav =
    !pathname.startsWith("/login") &&
    !pathname.startsWith("/register") &&
    !(pathname.includes("/exam/") && !pathname.endsWith("/result")) &&
    pathname !== "/";

  useEffect(() => {
    if (!nativeReady) return;
    // Native Android/iOS companion app does not load web GA4 tracking
    if (isNative) {
      setVisible(false);
      return;
    }

    let saved: ConsentState = null;
    try {
      const raw = window.localStorage.getItem(STORAGE_KEY);
      if (raw === "accepted" || raw === "essential") saved = raw;
    } catch {
      saved = null;
    }

    if (saved === "accepted") {
      injectGoogleAnalytics(gaId);
      setVisible(false);
    } else if (saved === "essential") {
      setVisible(false);
    } else {
      setVisible(true);
    }

    const handleReopen = () => setVisible(true);
    window.addEventListener("gtf:open-cookie-settings", handleReopen);
    return () => {
      window.removeEventListener("gtf:open-cookie-settings", handleReopen);
    };
  }, [gaId, isNative, nativeReady]);

  const handleChoice = (choice: "accepted" | "essential") => {
    try {
      window.localStorage.setItem(STORAGE_KEY, choice);
    } catch {
      // Ignore storage restrictions
    }
    if (choice === "accepted") {
      injectGoogleAnalytics(gaId);
    }
    setVisible(false);
  };

  if (!visible || isNative) return null;

  return (
    <aside
      role="dialog"
      aria-label="Cookie and Analytics Preferences"
      className={`fixed inset-x-3 ${
        hasBottomNav
          ? "bottom-[calc(4.75rem+env(safe-area-inset-bottom))] lg:bottom-4"
          : "bottom-[max(1rem,env(safe-area-inset-bottom))]"
      } z-50 mx-auto max-w-2xl rounded-2xl border border-slate-700/80 bg-slate-900/95 px-4 py-3.5 text-slate-100 shadow-2xl backdrop-blur-md`}
    >
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3.5">
        <div className="space-y-1 text-xs leading-relaxed text-slate-200">
          <div className="flex items-center gap-1.5 font-semibold text-white">
            <Shield className="h-3.5 w-3.5 text-sky-400 shrink-0" />
            <span>Cookie &amp; Privacy Preferences (GDPR / TDDDG § 25)</span>
          </div>
          <p className="text-slate-300">
            We use essential storage for login and study progress, plus optional Google Analytics (GA4) only if you accept.{" "}
            <Link href="/privacy" className="text-sky-300 underline hover:text-sky-200">
              Privacy Policy
            </Link>{" "}
            ·{" "}
            <Link href="/impressum" className="text-sky-300 underline hover:text-sky-200">
              Impressum
            </Link>
          </p>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <button
            type="button"
            onClick={() => handleChoice("essential")}
            className="flex-1 sm:flex-none rounded-xl border border-slate-500 bg-transparent px-3.5 py-2 text-xs font-semibold text-white hover:bg-slate-800 transition cursor-pointer whitespace-nowrap"
          >
            Essential Only
          </button>
          <button
            type="button"
            onClick={() => handleChoice("accepted")}
            className="flex-1 sm:flex-none rounded-xl bg-sky-600 px-3.5 py-2 text-xs font-semibold text-white hover:bg-sky-500 transition cursor-pointer whitespace-nowrap"
          >
            Accept Analytics
          </button>
        </div>
      </div>
    </aside>
  );
}
