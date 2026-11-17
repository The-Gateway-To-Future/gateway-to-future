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

        // Configure Native Status Bar
        try {
          const { StatusBar, Style } = await import("@capacitor/status-bar");
          await StatusBar.setStyle({ style: Style.Dark });
          await StatusBar.setBackgroundColor({ color: "#0A1628" });
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
          const backHandler = await App.addListener("backButton", ({ canGoBack }) => {
            const path = window.location.pathname;
            // If in an active exam or workbook, allow navigating back within the app
            if (canGoBack && path !== "/dashboard" && path !== "/") {
              window.history.back();
            } else if (path === "/dashboard" || path === "/") {
              // At root/dashboard: minimize or prompt before exit
              App.exitApp();
            } else {
              window.history.back();
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
