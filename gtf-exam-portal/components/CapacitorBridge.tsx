"use client";

import { useEffect } from "react";

export function CapacitorBridge() {
  useEffect(() => {
    if (typeof window === "undefined") return;

    let cleanupBackButton: (() => void) | undefined;

    async function initNativeBridge() {
      try {
        const { Capacitor } = await import("@capacitor/core");
        if (!Capacitor.isNativePlatform()) {
          return;
        }

        // Configure Native Status Bar to match capacitor.config.ts light palette (no dark flash)
        try {
          const { StatusBar, Style } = await import("@capacitor/status-bar");
          await StatusBar.setStyle({ style: Style.Light });
          await StatusBar.setBackgroundColor({ color: "#f8fafc" });
          await StatusBar.setOverlaysWebView({ overlay: false });
        } catch (e) {
          console.warn("[Capacitor] StatusBar config skipped:", e);
        }

        // Hide Native Splash Screen smoothly
        try {
          const { SplashScreen } = await import("@capacitor/splash-screen");
          await SplashScreen.hide({ fadeOutDuration: 300 });
        } catch (e) {
          console.warn("[Capacitor] SplashScreen hide skipped:", e);
        }

        // Android Hardware Back-Button Handling
        try {
          const { App } = await import("@capacitor/app");
          const minimizeSafely = () => {
            void App.minimizeApp().catch(() => {
              App.exitApp();
            });
          };

          const backHandler = await App.addListener("backButton", ({ canGoBack }) => {
            const path = window.location.pathname || "/";
            const isActiveExamRoom =
              path.startsWith("/exam/") && !path.endsWith("/result");

            if (isActiveExamRoom) {
              const confirmed = window.confirm(
                "Exit this active exam section? Your answers are saved locally on this device so you can resume later.",
              );
              if (!confirmed) return;
              if (canGoBack) {
                window.history.back();
              } else {
                window.location.assign("/dashboard");
              }
              return;
            }

            // On primary root destinations or login, minimize cleanly instead of
            // looping back into /login or force-killing the activity.
            if (path === "/dashboard" || path === "/" || path === "/login") {
              minimizeSafely();
              return;
            }

            if (canGoBack) {
              window.history.back();
            } else {
              window.location.assign("/dashboard");
            }
          });

          cleanupBackButton = () => {
            backHandler.remove();
          };
        } catch (e) {
          console.warn("[Capacitor] BackButton listener skipped:", e);
        }
      } catch (err) {
        console.warn("[Capacitor] Bridge initialization skipped (web mode):", err);
      }
    }

    initNativeBridge();

    return () => {
      if (cleanupBackButton) {
        cleanupBackButton();
      }
    };
  }, []);

  return null;
}
