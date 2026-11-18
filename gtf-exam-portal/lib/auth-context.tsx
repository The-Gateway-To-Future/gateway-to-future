"use client";

import React, { createContext, useCallback, useContext, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { onIdTokenChanged, signOut, type User as FirebaseUser } from "firebase/auth";
import {
  clearActiveSession,
  getActiveSessionToken,
  getActiveUserProfile,
  saveActiveUserProfile,
} from "./client-storage";
import { ensureFirebaseLocalPersistence, getFirebaseAuth, pushSignupToN8nWebhook } from "./firebase";
import type { DeviceType, DivisionId, UserSessionState } from "./types";

export const GTF_AUTH_COOKIE_NAME = "gtf_auth_token";

export function setGtfAuthCookie(token: string, days = 30): void {
  if (typeof document === "undefined" || !token) return;
  const maxAge = Math.max(1, Math.floor(days * 86400));
  const secureAttr = window.location.protocol === "https:" ? "; Secure" : "";
  document.cookie = `${GTF_AUTH_COOKIE_NAME}=${encodeURIComponent(token)}; path=/; max-age=${maxAge}; SameSite=Lax${secureAttr}`;
}

export function clearGtfAuthCookie(): void {
  if (typeof document === "undefined") return;
  const secureAttr = window.location.protocol === "https:" ? "; Secure" : "";
  document.cookie = `${GTF_AUTH_COOKIE_NAME}=; path=/; max-age=0; expires=Thu, 01 Jan 1970 00:00:00 GMT; SameSite=Lax${secureAttr}`;
}

export function getGtfAuthCookie(): string {
  if (typeof document === "undefined") return "";
  const prefix = `${GTF_AUTH_COOKIE_NAME}=`;
  const parts = document.cookie.split(";");
  for (const part of parts) {
    const trimmed = part.trim();
    if (trimmed.startsWith(prefix)) {
      try {
        return decodeURIComponent(trimmed.slice(prefix.length));
      } catch {
        return trimmed.slice(prefix.length);
      }
    }
  }
  return "";
}

interface AuthContextType {
  user: UserSessionState | null;
  sessionToken: string;
  isAuthenticated: boolean;
  isLoading: boolean;
  sessionTerminatedReason: string | null;
  refreshSession: () => Promise<boolean>;
  login: (email: string, pass: string, deviceType?: DeviceType) => Promise<{ ok: boolean; error?: string }>;
  register: (data: {
    email: string;
    pass: string;
    fullName?: string;
    name?: string;
    phone: string;
    targetDivision?: DivisionId;
    targetCourse?: string;
    deviceType?: DeviceType;
  }) => Promise<{ ok: boolean; error?: string }>;
  logout: () => Promise<void>;
  verifyPhoneOtp: (otp: string) => Promise<{ ok: boolean; error?: string }>;
  dismissTerminationAlert: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

function clearAllClientAuthStorage() {
  clearActiveSession();
  if (typeof window !== "undefined") {
    localStorage.removeItem("gtf_student_user");
    localStorage.removeItem("gtf_student_token");
  }
}

function buildFirebaseUserProfile(fbUser: FirebaseUser, token: string): UserSessionState {
  const email = (fbUser.email || "").trim().toLowerCase();
  const stored = getActiveUserProfile();
  let studentMeta: { studentId?: string; id?: string; phone?: string; course?: string; name?: string } | null = null;

  if (typeof window !== "undefined") {
    try {
      const raw = localStorage.getItem("gtf_student_user");
      if (raw) {
        const parsed = JSON.parse(raw);
        if (!parsed.email || String(parsed.email).toLowerCase() === email) {
          studentMeta = parsed;
        }
      }
    } catch {
      // ignore storage parse issue
    }
  }

  const sameStoredUser = stored && stored.userEmail?.toLowerCase() === email ? stored : null;
  const fallbackId = `GTF-2026-${fbUser.uid.slice(-4).toUpperCase()}`;

  return {
    studentId: studentMeta?.studentId || studentMeta?.id || sameStoredUser?.studentId || fallbackId,
    userEmail: email,
    fullName:
      fbUser.displayName ||
      studentMeta?.name ||
      sameStoredUser?.fullName ||
      email.split("@")[0] ||
      "Candidate",
    phone: studentMeta?.phone || sameStoredUser?.phone || "",
    phoneVerified: true,
    course: studentMeta?.course || sameStoredUser?.course || "sprachakademie",
    deviceType: "web",
    sessionToken: token,
    isAuthenticated: true,
  };
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const router = useRouter();

  const [user, setUser] = useState<UserSessionState | null>(null);
  const [sessionToken, setSessionToken] = useState<string>("");
  const [isLoading, setIsLoading] = useState(true);
  const [sessionTerminatedReason, setSessionTerminatedReason] = useState<string | null>(null);

  const syncFirebaseUserSession = useCallback(
    async (fbUser: FirebaseUser | null, forceRefresh = false): Promise<boolean> => {
      if (!fbUser) {
        clearGtfAuthCookie();
        clearAllClientAuthStorage();
        setUser(null);
        setSessionToken("");
        return false;
      }

      if (!fbUser.emailVerified) {
        clearGtfAuthCookie();
        clearAllClientAuthStorage();
        setUser(null);
        setSessionToken("");
        fetch("/api/auth/logout", { method: "POST" }).catch(() => {});
        return false;
      }

      const idToken = await fbUser.getIdToken(forceRefresh);
      setGtfAuthCookie(idToken, 30);

      const profile = buildFirebaseUserProfile(fbUser, idToken);
      saveActiveUserProfile(profile);
      if (typeof window !== "undefined") {
        localStorage.setItem(
          "gtf_student_user",
          JSON.stringify({
            id: profile.studentId,
            studentId: profile.studentId,
            name: profile.fullName,
            email: profile.userEmail,
            phone: profile.phone,
            course: profile.course,
          }),
        );
        localStorage.setItem("gtf_student_token", idToken);
      }

      setUser(profile);
      setSessionToken(idToken);
      setSessionTerminatedReason(null);
      return true;
    },
    [],
  );

  const refreshSession = useCallback(async (): Promise<boolean> => {
    try {
      const auth = await ensureFirebaseLocalPersistence();
      if (typeof auth.authStateReady === "function") {
        await auth.authStateReady();
      }
      if (auth.currentUser) {
        return await syncFirebaseUserSession(auth.currentUser, false);
      }
    } catch {
      // Fallback below if Firebase runtime check threw transiently
    }

    const existingToken =
      getGtfAuthCookie() ||
      getActiveSessionToken() ||
      (typeof window !== "undefined" ? localStorage.getItem("gtf_student_token") || "" : "");

    try {
      const res = await fetch("/api/auth/me", { cache: "no-store" });
      const data = await res.json().catch(() => ({ authenticated: false }));

      if (res.ok && data.authenticated && data.user) {
        const verifiedProfile: UserSessionState = {
          studentId:
            data.user.studentId ||
            (data.user.id?.startsWith("GTF-")
              ? data.user.id
              : `GTF-2026-${data.user.id?.slice(-4)?.toUpperCase() || "0001"}`),
          userEmail: data.user.email,
          fullName: data.user.name || data.user.email.split("@")[0],
          phone: data.user.phone || "",
          phoneVerified: true,
          course: data.user.course || "sprachakademie",
          deviceType: "web",
          sessionToken: existingToken || "active",
          isAuthenticated: true,
        };

        saveActiveUserProfile(verifiedProfile);
        if (existingToken) {
          setGtfAuthCookie(existingToken, 30);
        }
        if (typeof window !== "undefined") {
          localStorage.setItem("gtf_student_user", JSON.stringify(data.user));
        }
        setUser(verifiedProfile);
        setSessionToken(existingToken || "active");
        return true;
      }
    } catch {
      // Preserve local profile if offline/transient network glitch
      return Boolean(getGtfAuthCookie() && getActiveUserProfile());
    }

    clearGtfAuthCookie();
    clearAllClientAuthStorage();
    setUser(null);
    setSessionToken("");
    return false;
  }, [syncFirebaseUserSession]);

  // Synchronize Firebase ID Token -> `gtf_auth_token` cookie on sign-in, restore, and auto-refresh
  useEffect(() => {
    let active = true;
    let unsubscribe: (() => void) | undefined;

    const storedProfile = getActiveUserProfile();
    const token =
      getGtfAuthCookie() ||
      getActiveSessionToken() ||
      (typeof window !== "undefined" ? localStorage.getItem("gtf_student_token") || "" : "");

    if (storedProfile && token) {
      setUser(storedProfile);
      setSessionToken(token);
    }

    ensureFirebaseLocalPersistence()
      .then((auth) => {
        if (!active) return;
        unsubscribe = onIdTokenChanged(auth, async (fbUser) => {
          if (!active) return;
          try {
            await syncFirebaseUserSession(fbUser, false);
          } finally {
            if (active) {
              setIsLoading(false);
            }
          }
        });
      })
      .catch(() => {
        if (active) {
          setIsLoading(false);
        }
      });

    return () => {
      active = false;
      if (unsubscribe) unsubscribe();
    };
  }, [syncFirebaseUserSession]);

  // Keep synced cookie fresh across long study sessions & iOS PWA background/foreground resumes
  useEffect(() => {
    const refreshActiveToken = async () => {
      try {
        const fbUser = getFirebaseAuth().currentUser;
        if (fbUser && fbUser.emailVerified) {
          const freshToken = await fbUser.getIdToken();
          setGtfAuthCookie(freshToken, 30);
          setSessionToken(freshToken);
        }
      } catch {
        // Ignore transient network errors when backgrounded
      }
    };

    const handleVisibilityChange = () => {
      if (document.visibilityState === "visible") {
        void refreshActiveToken();
      }
    };

    const interval = window.setInterval(() => {
      void refreshActiveToken();
    }, 10 * 60 * 1000);

    document.addEventListener("visibilitychange", handleVisibilityChange);
    return () => {
      window.clearInterval(interval);
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, []);

  const isAuthenticated = Boolean(user && sessionToken);

  const login = useCallback(
    async (email: string, pass: string, deviceType: DeviceType = "web") => {
      try {
        const res = await fetch("/api/auth/login", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ email, password: pass, deviceType }),
        });
        const data = await res.json();
        if (!res.ok || (!data.success && !data.ok)) {
          return { ok: false, error: data.error || "Login failed" };
        }

        const resolvedToken = data.token || data.sessionToken || "";
        if (resolvedToken) {
          setGtfAuthCookie(resolvedToken, 30);
        }
        if (typeof window !== "undefined") {
          localStorage.setItem("gtf_student_user", JSON.stringify(data.user));
          localStorage.setItem("gtf_student_token", resolvedToken);
        }

        const profile: UserSessionState = {
          studentId: data.user.studentId || data.user.id,
          userEmail: data.user.email,
          fullName: data.user.name || data.user.fullName || email.split("@")[0],
          phone: data.user.phone || "",
          phoneVerified: true,
          course: data.user.course || "sprachakademie",
          deviceType: data.deviceType || "web",
          sessionToken: resolvedToken,
          isAuthenticated: true,
        };

        saveActiveUserProfile(profile);
        setUser(profile);
        setSessionToken(resolvedToken);
        setSessionTerminatedReason(null);
        return { ok: true };
      } catch (err) {
        return { ok: false, error: err instanceof Error ? err.message : "Network error" };
      }
    },
    [],
  );

  const register = useCallback(
    async (params: {
      email: string;
      pass: string;
      fullName?: string;
      name?: string;
      phone: string;
      targetDivision?: DivisionId;
      targetCourse?: string;
      deviceType?: DeviceType;
    }) => {
      try {
        const studentName = params.fullName || params.name || "Student";
        const studentCourse = params.targetCourse || params.targetDivision || "sprachakademie";
        const res = await fetch("/api/auth/register", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            email: params.email,
            password: params.pass,
            name: studentName,
            fullName: studentName,
            phone: params.phone,
            targetCourse: studentCourse,
            targetDivision: studentCourse,
            deviceType: params.deviceType || "web",
          }),
        });
        const data = await res.json();
        if (!res.ok || !data.ok) {
          return { ok: false, error: data.error || "Registration failed" };
        }

        const validToken = data.token || data.sessionToken || "active";
        const validStudentId =
          data.user.studentId ||
          (data.user.id?.startsWith("GTF-")
            ? data.user.id
            : `GTF-2026-${data.user.id?.slice(-4)?.toUpperCase() || "0001"}`);
        const profile: UserSessionState = {
          studentId: validStudentId,
          userEmail: data.user.email,
          fullName: data.user.fullName || data.user.name || studentName,
          phone: data.user.phone,
          phoneVerified: true,
          course: studentCourse,
          deviceType: data.deviceType || "web",
          sessionToken: validToken,
          isAuthenticated: true,
        };

        saveActiveUserProfile(profile);
        setGtfAuthCookie(validToken, 30);
        if (typeof window !== "undefined") {
          localStorage.setItem("gtf_student_user", JSON.stringify(data.user));
          localStorage.setItem("gtf_student_token", validToken);
        }
        setUser(profile);
        setSessionToken(validToken);
        setSessionTerminatedReason(null);

        void pushSignupToN8nWebhook({
          studentId: validStudentId,
          fullName: profile.fullName,
          email: profile.userEmail,
          phone: profile.phone,
          course: profile.course,
        });

        return { ok: true };
      } catch (err) {
        return { ok: false, error: err instanceof Error ? err.message : "Network error" };
      }
    },
    [],
  );

  const logout = useCallback(async () => {
    clearGtfAuthCookie();
    clearAllClientAuthStorage();
    setUser(null);
    setSessionToken("");

    try {
      await signOut(getFirebaseAuth());
    } catch {
      // ignore if firebase session absent
    }

    try {
      await fetch("/api/auth/logout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sessionToken }),
      });
    } catch {
      // ignore
    }

    router.replace("/login");
    router.refresh();
  }, [sessionToken, router]);

  const verifyPhoneOtp = useCallback(
    async (otp: string) => {
      if (!sessionToken) return { ok: false, error: "No active session." };
      try {
        const res = await fetch("/api/auth/verify-phone", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ sessionToken, otp }),
        });
        const data = await res.json();
        if (!res.ok || !data.ok) {
          return { ok: false, error: data.error || "OTP verification failed." };
        }
        if (user) {
          const updated = { ...user, phoneVerified: true };
          saveActiveUserProfile(updated);
          setUser(updated);
        }
        return { ok: true };
      } catch (err) {
        return { ok: false, error: err instanceof Error ? err.message : "Network error" };
      }
    },
    [sessionToken, user],
  );

  const dismissTerminationAlert = useCallback(() => {
    setSessionTerminatedReason(null);
  }, []);

  return (
    <AuthContext.Provider
      value={{
        user,
        sessionToken,
        isAuthenticated,
        isLoading,
        sessionTerminatedReason,
        refreshSession,
        login,
        register,
        logout,
        verifyPhoneOtp,
        dismissTerminationAlert,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextType {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}
