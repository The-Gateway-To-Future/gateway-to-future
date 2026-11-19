"use client";

import { useEffect, useState } from "react";
import { Capacitor } from "@capacitor/core";

/**
 * Synchronously checks whether the current runtime is a native Capacitor
 * Android/iOS wrapper. Safe to call in browser environments (returns false on SSR).
 */
export function isNativeCapacitorApp(): boolean {
  if (typeof window === "undefined") return false;
  try {
    if (Capacitor.isNativePlatform()) {
      return true;
    }
    const winCap = (
      window as unknown as {
        Capacitor?: { isNativePlatform?: () => boolean };
      }
    ).Capacitor;
    if (typeof winCap?.isNativePlatform === "function" && winCap.isNativePlatform()) {
      return true;
    }
  } catch {
    // Web fallback
  }
  return false;
}

/**
 * React hook returning `{ isNative, ready }`.
 * Starts with `{ isNative: false, ready: false }` during SSR/hydration to avoid
 * mismatches, then resolves on mount via Capacitor.isNativePlatform().
 */
export function useIsNativeApp(): { isNative: boolean; ready: boolean } {
  const [state, setState] = useState<{ isNative: boolean; ready: boolean }>({
    isNative: false,
    ready: false,
  });

  useEffect(() => {
    setState({
      isNative: isNativeCapacitorApp(),
      ready: true,
    });
  }, []);

  return state;
}
