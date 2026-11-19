"use client";

import { useEffect, useState } from "react";
import { Download, Smartphone, X, Share } from "lucide-react";
import { BRAND } from "@/lib/config";
import { isNativeCapacitorApp } from "@/lib/use-native-platform";

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

const ACTIVE_SW_CACHE = "gtf-exam-portal-v4-quizlet-light";

export function PwaRegistrar() {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [showIosGuide, setShowIosGuide] = useState(false);
  const [installed, setInstalled] = useState(false);
  const [isNative, setIsNative] = useState(true);

  useEffect(() => {
    if (typeof window === "undefined") return;

    const native = isNativeCapacitorApp();
    setIsNative(native);

    if ("caches" in window) {
      window.caches
        .keys()
        .then((keys) =>
          Promise.all(
            keys
              .filter((k) => k !== ACTIVE_SW_CACHE)
              .map((k) => window.caches.delete(k)),
          ),
        )
        .catch(() => undefined);
    }

    if ("serviceWorker" in navigator) {
      navigator.serviceWorker
        .register("/sw.js?v=v4-quizlet-light", { updateViaCache: "none" })
        .then((reg) => reg.update().catch(() => undefined))
        .catch((err) => {
          console.warn("[gtf] Service worker registration skipped:", err);
        });
    }

    if (native || window.matchMedia("(display-mode: standalone)").matches) {
      setInstalled(true);
    }

    const onBeforeInstall = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
    };

    window.addEventListener("beforeinstallprompt", onBeforeInstall);
    return () => window.removeEventListener("beforeinstallprompt", onBeforeInstall);
  }, []);

  if (installed || isNative) return null;

  const handleInstallClick = async () => {
    if (deferredPrompt) {
      await deferredPrompt.prompt();
      const choice = await deferredPrompt.userChoice;
      if (choice.outcome === "accepted") {
        setInstalled(true);
      }
      setDeferredPrompt(null);
      return;
    }
    setShowIosGuide(true);
  };

  return (
    <>
      <button
        type="button"
        onClick={handleInstallClick}
        className="inline-flex items-center gap-1.5 rounded-lg bg-gtf-gold px-3 py-1.5 text-xs font-semibold text-gtf-ink shadow-sm transition hover:bg-amber-300"
        title="Install GTF Exam Portal on iPhone, Android or Desktop"
      >
        <Download className="h-3.5 w-3.5" />
        <span>Install App</span>
      </button>

      {showIosGuide && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-2xl bg-white p-6 text-slate-900 shadow-2xl">
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-2.5">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gtf-primary text-white">
                  <Smartphone className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900">
                    Install {BRAND.appName}
                  </h3>
                  <p className="text-xs text-slate-500">
                    Standalone Home Screen App (iPhone &amp; Android)
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowIosGuide(false)}
                className="rounded-lg p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-600"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="mt-4 space-y-3 text-sm text-slate-700">
              <div className="rounded-xl border border-slate-200 bg-slate-50 p-3.5">
                <p className="font-semibold text-gtf-primary">iPhone / iPad (Safari):</p>
                <ol className="mt-1.5 list-inside list-decimal space-y-1 text-xs text-slate-600">
                  <li>
                    Tap the <strong>Share</strong> icon{" "}
                    <Share className="inline h-3.5 w-3.5 text-gtf-primary" /> in Safari&apos;s toolbar.
                  </li>
                  <li>
                    Scroll down and tap <strong>&ldquo;Add to Home Screen&rdquo;</strong>.
                  </li>
                  <li>
                    Tap <strong>Add</strong> to launch <strong>{BRAND.appName}</strong> full-screen.
                  </li>
                </ol>
              </div>

              <div className="rounded-xl border border-slate-200 bg-slate-50 p-3.5">
                <p className="font-semibold text-gtf-secondary">Android (Chrome) / Desktop:</p>
                <ol className="mt-1.5 list-inside list-decimal space-y-1 text-xs text-slate-600">
                  <li>Tap the browser menu (⋮) in the top-right corner.</li>
                  <li>
                    Select <strong>&ldquo;Install app&rdquo;</strong> or{" "}
                    <strong>&ldquo;Add to Home screen&rdquo;</strong>.
                  </li>
                </ol>
              </div>
            </div>

            <div className="mt-5 flex justify-end">
              <button
                type="button"
                onClick={() => setShowIosGuide(false)}
                className="rounded-xl bg-gtf-primary px-4 py-2 text-xs font-semibold text-white hover:bg-gtf-dark"
              >
                Got it
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
