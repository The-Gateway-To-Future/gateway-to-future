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
import { ensureFirebaseLocalPersistence, getFirebaseAuth } from "./firebase";
import type { DeviceType, DivisionId, UserSessionState } from "./types";

export const GTF_AUTH_COOKIE_NAME = "gtf_auth_token";

/**
 * Legacy helper retained as a safe no-op for external imports.
 * Auth sessions are strictly managed via HttpOnly `gtf_session` cookies issued by `/api/auth/login`.
 */
export function setGtfAuthCookie(_token: string, _days = 30): void {
  // Intentionally do not persist session tokens in JS-readable document.cookie
}

/** Purges any legacy non-HttpOnly `gtf_auth_token` cookie left on older clients. */
export function clearGtfAuthCookie(): void {
  if (typeof document === "undefined") return;
  const secureAttr = window.location.protocol === "https:" ? "; Secure" : "";
  document.cookie = `${GTF_AUTH_COOKIE_NAME}=; path=/; max-age=0; expires=Thu, 01 Jan 1970 00:00:00 GMT; SameSite=Lax${secureAttr}`;
}

export function getGtfAuthCookie(): string {
  return "";
}

interface AuthContextType {
  user: UserSessionState | null;
  sessionToken: string;
  isAuthenticated: boolean;
  isLoading: boolean;
  sessionTerminatedReason: string | null;
  refreshSession: () => Promise<boolean>;
  login: (
    email: string,
    pass: string,
    deviceType?: DeviceType,
  ) => Promise<{ ok: boolean; error?: string }>;
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

function notifyServiceWorkerLogout() {
  if (typeof navigator !== "undefined" && navigator.serviceWorker?.controller) {
    try {
      navigator.serviceWorker.controller.postMessage({ type: "GTF_CLEAR_AUTH_CACHES" });
    } catch {
      // ignore
    }
  }
}

function buildFirebaseUserProfile(
  fbUser: FirebaseUser,
  serverUser?: {
    id?: string;
    uid?: string;
    studentId?: string;
    name?: string;
    phone?: string;
    course?: string;
    role?: string;
  } | null,
): UserSessionState {
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
    firebaseUid: fbUser.uid,
    studentId:
      serverUser?.studentId ||
      studentMeta?.studentId ||
      studentMeta?.id ||
      sameStoredUser?.studentId ||
      fallbackId,
    userEmail: email,
    fullName:
      serverUser?.name ||
      fbUser.displayName ||
      studentMeta?.name ||
      sameStoredUser?.fullName ||
      email.split("@")[0] ||
      "Candidate",
    phone: serverUser?.phone || studentMeta?.phone || sameStoredUser?.phone || "",
    phoneVerified: true,
    course: serverUser?.course || studentMeta?.course || sameStoredUser?.course || "sprachakademie",
    role: serverUser?.role || sameStoredUser?.role || "student",
    deviceType: "web",
    sessionToken: "cookie-session",
    isAuthenticated: true,
  };
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const router = useRouter();

  const [user, setUser] = useState<UserSessionState | null>(null);
  const [sessionToken, setSessionToken] = useState<string>("");
  const [isLoading, setIsLoading] = useState(true);
  const [sessionTerminatedReason, setSessionTerminatedReason] = useState<string | null>(null);

  const hydrateFromServerSession = useCallback(async (): Promise<boolean> => {
    try {
      const res = await fetch("/api/auth/me", {
        cache: "no-store",
        credentials: "include",
      });
      const data = await res.json().catch(() => ({ authenticated: false }));

      if (res.ok && data.authenticated && data.user) {
        const verifiedProfile: UserSessionState = {
          firebaseUid: data.user.uid || data.user.id,
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
          role: data.user.role || "student",
          deviceType: "web",
          sessionToken: "cookie-session",
          isAuthenticated: true,
        };

        saveActiveUserProfile(verifiedProfile);
        if (typeof window !== "undefined") {
          localStorage.setItem("gtf_student_user", JSON.stringify(data.user));
        }
        setUser(verifiedProfile);
        setSessionToken("cookie-session");
        return true;
      }
      return false;
    } catch {
      // Preserve local profile transiently if offline
      const cached = getActiveUserProfile();
      if (cached && cached.userEmail) {
        setUser(cached);
        setSessionToken(getActiveSessionToken() || "cookie-session");
        return true;
      }
      return false;
    }
  }, []);

  const syncFirebaseUserSession = useCallback(
    async (fbUser: FirebaseUser | null, forceRefresh = false): Promise<boolean> => {
      clearGtfAuthCookie();

      if (!fbUser) {
        // IMPORTANT: Do NOT wipe valid HttpOnly server sessions (e.g. legacy Supabase accounts)
        const hasServerSession = await hydrateFromServerSession();
        if (!hasServerSession) {
          clearAllClientAuthStorage();
          setUser(null);
          setSessionToken("");
        }
        return hasServerSession;
      }

      if (!fbUser.emailVerified) {
        clearAllClientAuthStorage();
        setUser(null);
        setSessionToken("");
        fetch("/api/auth/logout", { method: "POST", credentials: "include" }).catch(() => {});
        return false;
      }

      const idToken = await fbUser.getIdToken(forceRefresh);

      // Ensure the HttpOnly 30-day `gtf_session` cookie is present & synced with this verified Firebase user
      let serverUser: {
        id?: string;
        uid?: string;
        studentId?: string;
        name?: string;
        phone?: string;
        course?: string;
        role?: string;
      } | null = null;

      try {
        const meRes = await fetch("/api/auth/me", { cache: "no-store", credentials: "include" });
        const meData = await meRes.json().catch(() => null);
        const meEmail = String(meData?.user?.email || "").toLowerCase();
        const fbEmail = String(fbUser.email || "").toLowerCase();

        if (meRes.ok && meData?.authenticated && meEmail === fbEmail) {
          serverUser = meData.user;
        } else if (fbEmail) {
          // Transparently exchange fresh verified Firebase ID token for HttpOnly `gtf_session` cookie
          const loginRes = await fetch("/api/auth/login", {
            method: "POST",
            credentials: "include",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              email: fbEmail,
              firebaseIdToken: idToken,
              firebaseUid: fbUser.uid,
              name: fbUser.displayName || "",
              rememberMe: true,
            }),
          });
          const loginData = await loginRes.json().catch(() => null);
          if (loginRes.ok && loginData?.user) {
            serverUser = loginData.user;
          }
        }
      } catch {
        // Offline resilience: keep Firebase client profile locally
      }

      const profile = buildFirebaseUserProfile(fbUser, serverUser);
      saveActiveUserProfile(profile);
      if (typeof window !== "undefined") {
        localStorage.setItem(
          "gtf_student_user",
          JSON.stringify({
            id: profile.firebaseUid || profile.studentId,
            uid: profile.firebaseUid,
            studentId: profile.studentId,
            name: profile.fullName,
            email: profile.userEmail,
            phone: profile.phone,
            course: profile.course,
            role: profile.role,
          }),
        );
      }

      setUser(profile);
      setSessionToken("cookie-session");
      setSessionTerminatedReason(null);
      return true;
    },
    [hydrateFromServerSession],
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
      // Fallback to server cookie check below
    }

    const ok = await hydrateFromServerSession();
    if (!ok) {
      clearGtfAuthCookie();
      clearAllClientAuthStorage();
      setUser(null);
      setSessionToken("");
    }
    return ok;
  }, [syncFirebaseUserSession, hydrateFromServerSession]);

  // Synchronize Firebase Auth + HttpOnly server session on mount and token rotation
  useEffect(() => {
    let active = true;
    let unsubscribe: (() => void) | undefined;

    const storedProfile = getActiveUserProfile();
    if (storedProfile && storedProfile.userEmail) {
      setUser(storedProfile);
      setSessionToken("cookie-session");
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
      .catch(async () => {
        if (!active) return;
        await hydrateFromServerSession();
        if (active) setIsLoading(false);
      });

    return () => {
      active = false;
      if (unsubscribe) unsubscribe();
    };
  }, [syncFirebaseUserSession, hydrateFromServerSession]);

  // Keep Firebase client ID token fresh for Firestore SDK reads/writes across long sessions
  useEffect(() => {
    const refreshActiveToken = async () => {
      try {
        const fbUser = getFirebaseAuth().currentUser;
        if (fbUser && fbUser.emailVerified) {
          await fbUser.getIdToken();
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
          credentials: "include",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ email, password: pass, deviceType }),
        });
        const data = await res.json();
        if (!res.ok || (!data.success && !data.ok)) {
          return { ok: false, error: data.error || "Login failed" };
        }

        if (typeof window !== "undefined") {
          localStorage.setItem("gtf_student_user", JSON.stringify(data.user));
        }

        const profile: UserSessionState = {
          firebaseUid: data.user.uid || data.user.id,
          studentId: data.user.studentId || data.user.id,
          userEmail: data.user.email,
          fullName: data.user.name || data.user.fullName || email.split("@")[0],
          phone: data.user.phone || "",
          phoneVerified: true,
          course: data.user.course || "sprachakademie",
          role: data.user.role || "student",
          deviceType: data.deviceType || "web",
          sessionToken: "cookie-session",
          isAuthenticated: true,
        };

        saveActiveUserProfile(profile);
        setUser(profile);
        setSessionToken("cookie-session");
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
          credentials: "include",
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

        if (data.verificationRequired) {
          return { ok: true };
        }

        const validStudentId =
          data.user.studentId ||
          (data.user.id?.startsWith("GTF-")
            ? data.user.id
            : `GTF-2026-${data.user.id?.slice(-4)?.toUpperCase() || "0001"}`);
        const profile: UserSessionState = {
          firebaseUid: data.user.uid || data.user.id,
          studentId: validStudentId,
          userEmail: data.user.email,
          fullName: data.user.fullName || data.user.name || studentName,
          phone: data.user.phone,
          phoneVerified: true,
          course: studentCourse,
          role: data.user.role || "student",
          deviceType: data.deviceType || "web",
          sessionToken: "cookie-session",
          isAuthenticated: true,
        };

        saveActiveUserProfile(profile);
        if (typeof window !== "undefined") {
          localStorage.setItem("gtf_student_user", JSON.stringify(data.user));
        }
        setUser(profile);
        setSessionToken("cookie-session");
        setSessionTerminatedReason(null);
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
    notifyServiceWorkerLogout();
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
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({}),
      });
    } catch {
      // ignore
    }

    router.replace("/login");
    router.refresh();
  }, [router]);

  const verifyPhoneOtp = useCallback(async (otp: string) => {
    try {
      const res = await fetch("/api/auth/verify-phone", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ otp }),
      });
      const data = await res.json();
      if (!res.ok || !data.ok) {
        return { ok: false, error: data.error || "OTP verification failed." };
      }
      return { ok: true };
    } catch (err) {
      return { ok: false, error: err instanceof Error ? err.message : "Network error" };
    }
  }, []);

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
