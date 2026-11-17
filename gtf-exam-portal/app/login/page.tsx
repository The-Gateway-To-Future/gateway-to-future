"use client";

import React, { Suspense, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import {
  applyActionCode,
  sendEmailVerification,
  sendPasswordResetEmail,
  signInWithEmailAndPassword,
  signOut,
  type User as FirebaseUser,
} from "firebase/auth";
import { ArrowRight, CheckCircle2, Eye, EyeOff, Loader2, MailCheck, RefreshCw } from "lucide-react";
import { AuthToast, type AuthToastState } from "@/components/AuthToast";
import { clearGtfAuthCookie, setGtfAuthCookie, useAuth } from "@/lib/auth-context";
import { mapFirebaseAuthError } from "@/lib/auth-errors";
import { clearActiveSession, saveActiveUserProfile } from "@/lib/client-storage";
import { BRAND } from "@/lib/config";
import { ensureFirebaseLocalPersistence, getFirebaseAuth } from "@/lib/firebase";
import type { UserSessionState } from "@/lib/types";

const EMAIL_ACTION_CODE_SETTINGS = {
  url: "https://app.gatewaytofuture.com/login",
  handleCodeInApp: true,
};

function resolveSafeNextPath(rawNext: string | null): string {
  if (!rawNext || !rawNext.startsWith("/") || rawNext.startsWith("//")) {
    return "/dashboard";
  }
  if (rawNext.startsWith("/login") || rawNext.startsWith("/register")) {
    return "/dashboard";
  }
  return rawNext;
}

function LoginScreenInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { refreshSession } = useAuth();

  const nextPath = useMemo(() => resolveSafeNextPath(searchParams.get("next")), [searchParams]);
  const initialEmail = useMemo(() => searchParams.get("email") || "", [searchParams]);
  const oobCode = useMemo(() => searchParams.get("oobCode") || "", [searchParams]);
  const actionMode = useMemo(() => searchParams.get("mode") || "", [searchParams]);

  const handledOobRef = useRef<string | null>(null);
  const [email, setEmail] = useState(initialEmail);
  const [password, setPassword] = useState("");
  const [rememberMe, setRememberMe] = useState(true);
  const [showPassword, setShowPassword] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [resending, setResending] = useState(false);
  const [checkingVerification, setCheckingVerification] = useState(false);
  const [resendCooldown, setResendCooldown] = useState(0);
  const [unverifiedUser, setUnverifiedUser] = useState<FirebaseUser | null>(null);
  const [resettingPassword, setResettingPassword] = useState(false);
  const [toast, setToast] = useState<AuthToastState | null>(null);

  const pushToast = (title: string, message: string, tone: AuthToastState["tone"]) => {
    setToast({ id: Date.now(), title, message, tone });
  };

  useEffect(() => {
    if (initialEmail && !email) {
      setEmail(initialEmail);
    }
  }, [initialEmail, email]);

  useEffect(() => {
    if (resendCooldown <= 0) return;
    const timer = window.setInterval(() => {
      setResendCooldown((prev) => (prev > 0 ? prev - 1 : 0));
    }, 1000);
    return () => window.clearInterval(timer);
  }, [resendCooldown]);

  const persistClientSession = async (
    data: {
      user?: {
        id?: string;
        studentId?: string;
        email?: string;
        name?: string;
        phone?: string;
        course?: string;
      };
      token?: string;
      sessionToken?: string;
    },
    fallbackEmail: string,
    fallbackName = "",
  ) => {
    const token = data.token || data.sessionToken || "";
    const resolvedEmail = data.user?.email || fallbackEmail;
    const profile: UserSessionState = {
      studentId: data.user?.studentId || data.user?.id,
      userEmail: resolvedEmail,
      fullName: data.user?.name || fallbackName || resolvedEmail.split("@")[0],
      phone: data.user?.phone || "",
      phoneVerified: true,
      course: data.user?.course || "sprachakademie",
      deviceType: "web",
      sessionToken: token,
      isAuthenticated: true,
    };

    if (token) {
      setGtfAuthCookie(token, rememberMe ? 30 : 30);
    }
    saveActiveUserProfile(profile);
    if (typeof window !== "undefined") {
      localStorage.setItem("gtf_student_user", JSON.stringify(data.user));
      localStorage.setItem("gtf_student_token", token);
    }

    await refreshSession();
    router.push(nextPath);
    router.refresh();
  };

  const completeVerifiedSession = async (fbUser: FirebaseUser, rawPassword?: string) => {
    // Force a fresh Firebase ID token and write the synced middleware cookie immediately
    const idToken = await fbUser.getIdToken(true);
    setGtfAuthCookie(idToken, rememberMe ? 30 : 30);

    const verifiedEmail = (fbUser.email || email).trim().toLowerCase();
    let apiUser: {
      id?: string;
      studentId?: string;
      email?: string;
      name?: string;
      phone?: string;
      course?: string;
    } | null = null;

    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: verifiedEmail,
          password: rawPassword || "",
          firebaseIdToken: idToken,
          firebaseUid: fbUser.uid,
          firebaseVerified: true,
          name: fbUser.displayName || "",
        }),
      });
      const data = await res.json().catch(() => null);
      if (res.ok && data && (data.success || data.ok) && data.user) {
        apiUser = data.user;
      }
    } catch {
      // Non-blocking: Firebase verified token + synced cookie already grant portal access
    }

    const fallbackId = `GTF-2026-${fbUser.uid.slice(-4).toUpperCase()}`;
    const resolvedUser = apiUser || {
      id: fbUser.uid,
      studentId: fallbackId,
      email: verifiedEmail,
      name: fbUser.displayName || verifiedEmail.split("@")[0],
      phone: "",
      course: "sprachakademie",
    };

    await persistClientSession(
      {
        user: resolvedUser,
        token: idToken,
      },
      verifiedEmail,
      fbUser.displayName || "",
    );
  };

  useEffect(() => {
    if (!oobCode || (actionMode && actionMode !== "verifyEmail")) return;
    if (handledOobRef.current === oobCode) return;
    handledOobRef.current = oobCode;

    let active = true;
    (async () => {
      try {
        const auth = await ensureFirebaseLocalPersistence();
        await applyActionCode(auth, oobCode);
        if (!active) return;

        await auth.currentUser?.reload();
        if (auth.currentUser?.emailVerified) {
          await completeVerifiedSession(auth.currentUser, password);
          return;
        }

        pushToast(
          "Email verified",
          "Your email has been confirmed. Sign in below to access your dashboard.",
          "success",
        );
        router.replace("/login");
      } catch (err) {
        if (!active) return;
        const mapped = mapFirebaseAuthError(err);
        pushToast(mapped.title, mapped.message, mapped.tone);
      }
    })();

    return () => {
      active = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [oobCode, actionMode]);

  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanEmail = email.trim();

    if (!cleanEmail || !cleanEmail.includes("@")) {
      pushToast("Invalid email", "Enter the email address registered with your GTF account.", "warning");
      return;
    }
    if (!password) {
      pushToast("Password required", "Enter your account password to continue.", "warning");
      return;
    }

    setSubmitting(true);
    try {
      const auth = await ensureFirebaseLocalPersistence();
      let fbAuthError: unknown = null;

      try {
        const credential = await signInWithEmailAndPassword(auth, cleanEmail, password);
        await credential.user.reload();

        if (!credential.user.emailVerified) {
          clearGtfAuthCookie();
          clearActiveSession();
          if (typeof window !== "undefined") {
            localStorage.removeItem("gtf_student_user");
            localStorage.removeItem("gtf_student_token");
          }
          await fetch("/api/auth/logout", { method: "POST" }).catch(() => {});
          setUnverifiedUser(credential.user);
          pushToast(
            "Email verification required",
            "Your email is not verified. Please check your inbox or use the resend verification link.",
            "warning",
          );
          return;
        }

        await completeVerifiedSession(credential.user, password);
        return;
      } catch (err) {
        fbAuthError = err;
      }

      const code = ((fbAuthError as { code?: string })?.code || "").toLowerCase();
      const supportsLegacyFallback =
        code === "auth/user-not-found" ||
        code === "auth/invalid-credential" ||
        code === "auth/invalid-login-credentials" ||
        code === "auth/configuration-not-found" ||
        code === "auth/operation-not-allowed" ||
        code === "auth/admin-restricted-operation";

      // Fallback to existing backend/Supabase account credentials for pre-migration users
      if (supportsLegacyFallback) {
        const legacyRes = await fetch("/api/auth/login", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            email: cleanEmail.toLowerCase(),
            password,
          }),
        });
        const legacyData = await legacyRes.json().catch(() => ({}));
        if (legacyRes.ok && (legacyData.success || legacyData.ok) && legacyData.user) {
          await persistClientSession(legacyData, cleanEmail.toLowerCase());
          return;
        }
        if (
          code === "auth/configuration-not-found" ||
          code === "auth/operation-not-allowed" ||
          code === "auth/admin-restricted-operation"
        ) {
          pushToast(
            "Sign-in failed",
            legacyData.error || "Invalid email or password.",
            "error",
          );
          return;
        }
      }

      const mapped = mapFirebaseAuthError(fbAuthError);
      pushToast(mapped.title, mapped.message, mapped.tone);
    } catch (err) {
      const mapped = mapFirebaseAuthError(err);
      pushToast(mapped.title, mapped.message, mapped.tone);
    } finally {
      setSubmitting(false);
    }
  };

  const handleResendVerification = async () => {
    const auth = await ensureFirebaseLocalPersistence();
    const targetUser = auth.currentUser || unverifiedUser;
    if (!targetUser || resending || resendCooldown > 0) return;

    setResending(true);
    try {
      await sendEmailVerification(targetUser, EMAIL_ACTION_CODE_SETTINGS);
      setResendCooldown(30);
      pushToast(
        "Verification link sent",
        `We dispatched a fresh official verification email to ${targetUser.email || email}.`,
        "success",
      );
    } catch (err) {
      const mapped = mapFirebaseAuthError(err);
      pushToast(mapped.title, mapped.message, mapped.tone);
    } finally {
      setResending(false);
    }
  };

  const handleRecheckVerification = async () => {
    const auth = await ensureFirebaseLocalPersistence();
    setCheckingVerification(true);
    try {
      await auth.currentUser?.reload();
      let reloaded = auth.currentUser;
      if (!reloaded && unverifiedUser) {
        await unverifiedUser.reload();
        reloaded = auth.currentUser || unverifiedUser;
      }

      if (!reloaded) {
        pushToast("Session not found", "Please sign in with your email and password again.", "warning");
        setUnverifiedUser(null);
        return;
      }

      if (!reloaded.emailVerified) {
        pushToast(
          "Still awaiting verification",
          "Click the verification link sent to your email first, then tap this button again.",
          "warning",
        );
        return;
      }

      const idToken = await reloaded.getIdToken(true);
      setGtfAuthCookie(idToken, rememberMe ? 30 : 30);
      await completeVerifiedSession(reloaded, password);
    } catch (err) {
      const mapped = mapFirebaseAuthError(err);
      pushToast(mapped.title, mapped.message, mapped.tone);
    } finally {
      setCheckingVerification(false);
    }
  };

  const handleForgotPassword = async () => {
    const cleanEmail = email.trim();
    if (!cleanEmail || !cleanEmail.includes("@")) {
      pushToast(
        "Email required",
        "Enter your registered email address in the field above to receive a password reset link.",
        "warning",
      );
      return;
    }

    setResettingPassword(true);
    try {
      const auth = await ensureFirebaseLocalPersistence();
      await sendPasswordResetEmail(auth, cleanEmail, EMAIL_ACTION_CODE_SETTINGS);
      pushToast(
        "Reset link sent",
        `We have sent a secure password reset link to ${cleanEmail}. Please check your inbox.`,
        "success",
      );
    } catch (err) {
      const mapped = mapFirebaseAuthError(err);
      pushToast(mapped.title, mapped.message, mapped.tone);
    } finally {
      setResettingPassword(false);
    }
  };

  const handleSwitchAccount = async () => {
    try {
      await signOut(getFirebaseAuth());
    } catch {
      // ignore
    }
    setUnverifiedUser(null);
    setPassword("");
  };

  return (
    <div className="relative min-h-screen bg-[#07090E] text-white flex flex-col justify-between overflow-x-hidden">
      <AuthToast toast={toast} onDismiss={() => setToast(null)} />

      {/* Architectural Obsidian Lighting */}
      <div className="pointer-events-none fixed inset-0 bmw-mesh-grid opacity-30" />
      <div className="pointer-events-none fixed inset-x-0 top-0 h-[420px] bg-[radial-gradient(ellipse_at_top,rgba(255,255,255,0.08),transparent_65%)]" />

      {/* Minimalist Top Bar */}
      <header className="relative z-10 w-full max-w-6xl mx-auto px-6 sm:px-10 pt-8 pb-4 flex items-center justify-between">
        <Link href="/" className="flex items-center gap-3 group">
          <div className="h-8 w-8 rounded-xl border border-white/15 bg-white/[0.04] flex items-center justify-center text-xs font-bold tracking-[0.2em] text-white transition group-hover:border-white/35">
            G
          </div>
          <span className="text-xs font-semibold uppercase tracking-[0.26em] text-zinc-300 group-hover:text-white transition">
            {BRAND.shortName}
          </span>
        </Link>

        <Link
          href="/register"
          className="text-xs font-medium uppercase tracking-[0.18em] text-zinc-400 hover:text-white transition"
        >
          Create Account
        </Link>
      </header>

      {/* Focused Center Stage */}
      <main className="relative z-10 flex-1 flex items-center justify-center px-6 py-12 sm:py-16">
        <div className="w-full max-w-[420px]">
          {unverifiedUser ? (
            <div className="rounded-2xl border border-white/10 bg-[#0D1017]/85 p-8 sm:p-10 backdrop-blur-2xl shadow-[0_30px_90px_rgba(0,0,0,0.65)] space-y-7">
              <div className="space-y-4">
                <div className="inline-flex h-11 w-11 items-center justify-center rounded-xl border border-amber-400/25 bg-amber-400/10 text-amber-300">
                  <MailCheck className="h-5 w-5" />
                </div>
                <div className="space-y-2">
                  <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-zinc-500">
                    Verification Required
                  </p>
                  <h1 className="text-2xl sm:text-3xl font-light tracking-tight text-white">
                    Verify Your Email
                  </h1>
                </div>
                <div className="rounded-xl border border-amber-400/30 bg-amber-500/10 p-4 text-xs sm:text-sm leading-relaxed text-amber-200">
                  Your email is not verified. Please check your inbox or{" "}
                  <button
                    type="button"
                    onClick={handleResendVerification}
                    disabled={resending || resendCooldown > 0}
                    className="font-semibold text-white underline underline-offset-4 hover:text-amber-100 disabled:opacity-50"
                  >
                    {resending
                      ? "sending verification link..."
                      : resendCooldown > 0
                        ? `click here again in ${resendCooldown}s`
                        : "click here to resend the verification link"}
                  </button>
                  {" "}for{" "}
                  <span className="font-medium text-white">
                    {unverifiedUser.email || email}
                  </span>
                  .
                </div>
              </div>

              <div className="space-y-3 pt-1">
                <button
                  type="button"
                  onClick={handleRecheckVerification}
                  disabled={checkingVerification}
                  className="w-full h-12 rounded-xl !bg-white !text-[#07090E] text-xs font-semibold uppercase tracking-[0.18em] inline-flex items-center justify-center gap-2 transition hover:opacity-90 disabled:opacity-50"
                >
                  {checkingVerification ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin !text-[#07090E]" />
                      <span>Checking Status</span>
                    </>
                  ) : (
                    <>
                      <CheckCircle2 className="h-4 w-4 !text-[#07090E]" />
                      <span>I have verified my email -&gt;</span>
                    </>
                  )}
                </button>

                <button
                  type="button"
                  onClick={handleResendVerification}
                  disabled={resending || resendCooldown > 0}
                  className="w-full h-12 rounded-xl border border-white/15 bg-white/[0.03] text-xs font-medium uppercase tracking-[0.16em] text-zinc-200 inline-flex items-center justify-center gap-2 transition hover:border-white/30 hover:bg-white/[0.06] disabled:opacity-50"
                >
                  {resending ? (
                    <>
                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                      <span>Sending Link</span>
                    </>
                  ) : resendCooldown > 0 ? (
                    <span>Resend Available in {resendCooldown}s</span>
                  ) : (
                    <>
                      <RefreshCw className="h-3.5 w-3.5" />
                      <span>Resend Verification Email</span>
                    </>
                  )}
                </button>
              </div>

              <div className="pt-2 border-t border-white/10 flex items-center justify-between text-xs">
                <button
                  type="button"
                  onClick={handleSwitchAccount}
                  className="text-zinc-400 hover:text-white transition"
                >
                  Use another account
                </button>
                <span className="text-zinc-600 uppercase tracking-[0.16em]">GTF Auth</span>
              </div>
            </div>
          ) : (
            <div className="space-y-8">
              <div className="space-y-2.5 text-center sm:text-left">
                <p className="text-[11px] font-semibold uppercase tracking-[0.26em] text-zinc-500">
                  GTF Identity
                </p>
                <h1 className="text-3xl sm:text-4xl font-light tracking-tight text-white">
                  Sign in
                </h1>
              </div>

              <form
                onSubmit={handleSignIn}
                className="rounded-2xl border border-white/10 bg-[#0D1017]/80 p-7 sm:p-9 backdrop-blur-2xl shadow-[0_30px_90px_rgba(0,0,0,0.65)] space-y-6"
                noValidate
              >
                <div className="space-y-4">
                  <div className="space-y-2">
                    <label
                      htmlFor="login-email"
                      className="block text-[11px] font-medium uppercase tracking-[0.18em] text-zinc-400"
                    >
                      Email
                    </label>
                    <input
                      id="login-email"
                      type="email"
                      autoComplete="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="name@example.com"
                      className="w-full h-12 rounded-xl border border-white/15 bg-[#07090E] px-4 text-sm text-white placeholder:text-zinc-600 outline-none transition focus:border-white/60"
                    />
                  </div>

                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <label
                        htmlFor="login-password"
                        className="block text-[11px] font-medium uppercase tracking-[0.18em] text-zinc-400"
                      >
                        Password
                      </label>
                      <button
                        type="button"
                        onClick={handleForgotPassword}
                        disabled={resettingPassword}
                        className="text-[11px] font-medium text-zinc-400 hover:text-white transition focus:outline-none disabled:opacity-50"
                      >
                        {resettingPassword ? "Sending link…" : "Forgot password?"}
                      </button>
                    </div>
                    <div className="relative">
                      <input
                        id="login-password"
                        type={showPassword ? "text" : "password"}
                        autoComplete="current-password"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        placeholder="Enter password"
                        className="w-full h-12 rounded-xl border border-white/15 bg-[#07090E] pl-4 pr-11 text-sm text-white placeholder:text-zinc-600 outline-none transition focus:border-white/60"
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword((v) => !v)}
                        aria-label={showPassword ? "Hide password" : "Show password"}
                        className="absolute right-3 top-1/2 -translate-y-1/2 p-1.5 text-zinc-500 hover:text-zinc-200 transition"
                      >
                        {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                      </button>
                    </div>
                  </div>
                </div>

                <div className="flex items-center justify-between pt-0.5">
                  <label
                    htmlFor="remember-me"
                    className="inline-flex items-center gap-2.5 cursor-pointer select-none group"
                  >
                    <input
                      id="remember-me"
                      type="checkbox"
                      checked={rememberMe}
                      onChange={(e) => setRememberMe(e.target.checked)}
                      className="h-4 w-4 rounded border border-white/25 bg-[#07090E] text-white accent-white focus:ring-0"
                    />
                    <span className="text-xs text-zinc-300 group-hover:text-white transition">
                      Remember me
                    </span>
                  </label>
                  <span className="text-[10px] uppercase tracking-[0.16em] text-zinc-500">
                    30-day session persistence
                  </span>
                </div>

                <button
                  type="submit"
                  disabled={submitting}
                  className="w-full h-12 rounded-xl !bg-white !text-[#07090E] text-xs font-semibold uppercase tracking-[0.2em] inline-flex items-center justify-center gap-2 transition hover:opacity-90 disabled:opacity-50"
                >
                  {submitting ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin !text-[#07090E]" />
                      <span>Authenticating</span>
                    </>
                  ) : (
                    <>
                      <span>Continue</span>
                      <ArrowRight className="h-4 w-4 !text-[#07090E]" />
                    </>
                  )}
                </button>
              </form>

              <p className="text-center text-xs text-zinc-500">
                New to {BRAND.shortName}?{" "}
                <Link
                  href="/register"
                  className="text-zinc-200 font-medium hover:text-white underline underline-offset-4 transition"
                >
                  Create an account
                </Link>
              </p>
            </div>
          )}
        </div>
      </main>

      {/* Quiet Executive Footer */}
      <footer className="relative z-10 w-full max-w-6xl mx-auto px-6 sm:px-10 py-6 flex flex-col sm:flex-row items-center justify-between gap-2 text-[11px] uppercase tracking-[0.2em] text-zinc-600">
        <span>{BRAND.name}</span>
        <span>Berlin · Verified Access</span>
      </footer>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-[#07090E] flex items-center justify-center">
          <Loader2 className="h-5 w-5 animate-spin text-zinc-500" />
        </div>
      }
    >
      <LoginScreenInner />
    </Suspense>
  );
}
