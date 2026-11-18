"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  createUserWithEmailAndPassword,
  sendEmailVerification,
  updateProfile,
  type User as FirebaseUser,
} from "firebase/auth";
import { ArrowRight, CheckCircle2, Eye, EyeOff, Loader2, MailCheck, RefreshCw } from "lucide-react";
import { AuthToast, type AuthToastState } from "@/components/AuthToast";
import { clearGtfAuthCookie, setGtfAuthCookie, useAuth } from "@/lib/auth-context";
import { mapFirebaseAuthError } from "@/lib/auth-errors";
import { saveActiveUserProfile } from "@/lib/client-storage";
import { BRAND } from "@/lib/config";
import {
  ensureFirebaseLocalPersistence,
  getFirebaseAuth,
  pushSignupToN8nWebhook,
} from "@/lib/firebase";

const EMAIL_ACTION_CODE_SETTINGS = {
  url: "https://app.gatewaytofuture.com/login",
  handleCodeInApp: true,
};

export default function RegisterPage() {
  const router = useRouter();
  const { refreshSession } = useAuth();

  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [resending, setResending] = useState(false);
  const [checkingVerification, setCheckingVerification] = useState(false);
  const [resendCooldown, setResendCooldown] = useState(0);
  const [verificationSentTo, setVerificationSentTo] = useState("");
  const [registeredUser, setRegisteredUser] = useState<FirebaseUser | null>(null);
  const [toast, setToast] = useState<AuthToastState | null>(null);

  const pushToast = (title: string, message: string, tone: AuthToastState["tone"]) => {
    setToast({ id: Date.now(), title, message, tone });
  };

  useEffect(() => {
    if (resendCooldown <= 0) return;
    const timer = window.setInterval(() => {
      setResendCooldown((prev) => (prev > 0 ? prev - 1 : 0));
    }, 1000);
    return () => window.clearInterval(timer);
  }, [resendCooldown]);

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanName = fullName.trim();
    const cleanEmail = email.trim();

    if (!cleanName) {
      pushToast("Name required", "Enter your full legal name to register.", "warning");
      return;
    }
    if (!cleanEmail || !cleanEmail.includes("@")) {
      pushToast("Invalid email", "Enter a valid email address to receive your verification link.", "warning");
      return;
    }
    if (password.length < 6) {
      pushToast("Password too short", "Use at least 6 characters to secure your GTF account.", "warning");
      return;
    }

    setSubmitting(true);
    try {
      const auth = await ensureFirebaseLocalPersistence();

      try {
        const credential = await createUserWithEmailAndPassword(auth, cleanEmail, password);

        await updateProfile(credential.user, {
          displayName: cleanName,
        });

        // Mandatory immediately upon registration
        await sendEmailVerification(credential.user, EMAIL_ACTION_CODE_SETTINGS);
        clearGtfAuthCookie();

        const studentId = `GTF-2026-${credential.user.uid.slice(-4).toUpperCase()}`;
        const cleanPhone = phone.trim();

        // Persist candidate record without issuing active session until verified login
        fetch("/api/auth/register", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            studentId,
            name: cleanName,
            fullName: cleanName,
            email: cleanEmail,
            phone: cleanPhone,
            password,
            course: "sprachakademie",
            requireEmailVerification: true,
          }),
        }).catch(() => {});

        // Push new user data directly to GTF n8n WhatsApp webhook (non-blocking)
        void pushSignupToN8nWebhook({
          studentId,
          fullName: cleanName,
          email: cleanEmail,
          phone: cleanPhone,
          course: "A1",
          uid: credential.user.uid,
        });

        fetch("/api/auth/welcome", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            studentId,
            email: cleanEmail,
            name: cleanName,
            phone: cleanPhone,
            uid: credential.user.uid,
          }),
        }).catch(() => {});

        setRegisteredUser(credential.user);
        setVerificationSentTo(cleanEmail);
        setResendCooldown(30);
        return;
      } catch (fbErr) {
        const code = ((fbErr as { code?: string })?.code || "").toLowerCase();
        const shouldUseBackendFallback =
          code === "auth/configuration-not-found" ||
          code === "auth/operation-not-allowed" ||
          code === "auth/admin-restricted-operation";

        if (!shouldUseBackendFallback) {
          throw fbErr;
        }

        const cleanPhone = phone.trim();
        const res = await fetch("/api/auth/register", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            name: cleanName,
            fullName: cleanName,
            email: cleanEmail.toLowerCase(),
            phone: cleanPhone,
            password,
            course: "sprachakademie",
            requireEmailVerification: false,
          }),
        });
        const data = await res.json().catch(() => ({}));

        if (res.ok && (data.success || data.ok) && data.user) {
          const fallbackStudentId = data.user.studentId || data.user.id || "";
          void pushSignupToN8nWebhook({
            studentId: fallbackStudentId,
            fullName: cleanName,
            email: cleanEmail.toLowerCase(),
            phone: cleanPhone || data.user.phone || "",
            course: data.user.course || "A1",
            uid: data.user.id || data.user.studentId,
          });

          fetch("/api/auth/welcome", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              studentId: fallbackStudentId,
              email: cleanEmail.toLowerCase(),
              name: cleanName,
              phone: cleanPhone || data.user.phone || "",
              uid: data.user.id || data.user.studentId,
            }),
          }).catch(() => {});

          const sessionToken = data.token || data.sessionToken || "";
          if (sessionToken) {
            setGtfAuthCookie(sessionToken, 30);
          }
          if (typeof window !== "undefined") {
            localStorage.setItem("gtf_student_user", JSON.stringify(data.user));
            if (sessionToken) {
              localStorage.setItem("gtf_student_token", sessionToken);
            }
          }

          saveActiveUserProfile({
            studentId: data.user.studentId || data.user.id,
            userEmail: cleanEmail.toLowerCase(),
            fullName: data.user.name || data.user.fullName || cleanName,
            phone: data.user.phone || "",
            phoneVerified: true,
            course: data.user.course || "sprachakademie",
            deviceType: "web",
            sessionToken,
            isAuthenticated: true,
          });

          await refreshSession();
          router.push("/dashboard");
          router.refresh();
          return;
        }

        pushToast(
          "Registration failed",
          data.error || "Unable to complete account registration. Please try again.",
          "error",
        );
      }
    } catch (err) {
      const mapped = mapFirebaseAuthError(err);
      pushToast(mapped.title, mapped.message, mapped.tone);
    } finally {
      setSubmitting(false);
    }
  };

  const handleResend = async () => {
    const auth = getFirebaseAuth();
    const targetUser = registeredUser || auth.currentUser;
    if (!targetUser || resending || resendCooldown > 0) return;

    setResending(true);
    try {
      await sendEmailVerification(targetUser, EMAIL_ACTION_CODE_SETTINGS);
      setResendCooldown(30);
      pushToast(
        "Verification link sent",
        `A fresh verification link has been sent to ${verificationSentTo}.`,
        "success",
      );
    } catch (err) {
      const mapped = mapFirebaseAuthError(err);
      pushToast(mapped.title, mapped.message, mapped.tone);
    } finally {
      setResending(false);
    }
  };

  const handleCheckVerified = async () => {
    const auth = await ensureFirebaseLocalPersistence();
    await auth.currentUser?.reload().catch(() => {});
    const targetUser = auth.currentUser || registeredUser;
    if (!targetUser) {
      router.push(`/login?email=${encodeURIComponent(verificationSentTo)}`);
      return;
    }

    setCheckingVerification(true);
    try {
      await targetUser.reload();
      const reloaded = auth.currentUser || targetUser;
      if (!reloaded.emailVerified) {
        pushToast(
          "Still awaiting verification",
          "Please click the verification link in your email first, then tap this button again.",
          "warning",
        );
        return;
      }

      const idToken = await reloaded.getIdToken(true);
      setGtfAuthCookie(idToken, 30);
      saveActiveUserProfile({
        studentId: `GTF-2026-${reloaded.uid.slice(-4).toUpperCase()}`,
        userEmail: (reloaded.email || verificationSentTo).trim().toLowerCase(),
        fullName: reloaded.displayName || fullName.trim() || verificationSentTo.split("@")[0],
        phone: phone.trim(),
        phoneVerified: true,
        course: "sprachakademie",
        deviceType: "web",
        sessionToken: idToken,
        isAuthenticated: true,
      });
      if (typeof window !== "undefined") {
        localStorage.setItem("gtf_student_token", idToken);
      }
      await refreshSession();
      router.push("/dashboard");
      router.refresh();
    } catch (err) {
      const mapped = mapFirebaseAuthError(err);
      pushToast(mapped.title, mapped.message, mapped.tone);
    } finally {
      setCheckingVerification(false);
    }
  };

  return (
    <div className="relative min-h-screen bg-slate-900 text-white flex flex-col justify-between overflow-x-hidden">
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
          href="/login"
          className="text-xs font-medium uppercase tracking-[0.18em] text-zinc-400 hover:text-white transition"
        >
          Sign In
        </Link>
      </header>

      {/* Focused Center Stage */}
      <main className="relative z-10 flex-1 flex items-center justify-center px-6 py-12 sm:py-16">
        <div className="w-full max-w-[420px]">
          {verificationSentTo ? (
            <div className="rounded-2xl border border-white/10 bg-[#0D1017]/85 p-8 sm:p-10 backdrop-blur-2xl shadow-[0_30px_90px_rgba(0,0,0,0.65)] space-y-7">
              <div className="space-y-4">
                <div className="inline-flex h-11 w-11 items-center justify-center rounded-xl border border-emerald-400/25 bg-emerald-400/10 text-emerald-300">
                  <MailCheck className="h-5 w-5" />
                </div>
                <div className="space-y-2">
                  <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-zinc-500">
                    Account Created
                  </p>
                  <h1 className="text-2xl sm:text-3xl font-light tracking-tight text-white">
                    Verify Your Email.
                  </h1>
                </div>
                <p className="text-sm leading-relaxed text-zinc-400">
                  We&apos;ve sent an official verification link to{" "}
                  <span className="font-medium text-white">{verificationSentTo}</span>.
                </p>
                <p className="text-xs leading-relaxed text-zinc-500">
                  Open the verification email to activate your GTF candidate credentials, then tap below to enter your portal.
                </p>
              </div>

              <div className="space-y-3 pt-1">
                <button
                  type="button"
                  onClick={handleCheckVerified}
                  disabled={checkingVerification}
                  className="w-full h-12 rounded-xl !bg-white !text-[#07090E] text-xs font-semibold uppercase tracking-[0.18em] inline-flex items-center justify-center gap-2 transition hover:opacity-90 disabled:opacity-50"
                >
                  {checkingVerification ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin !text-[#07090E]" />
                      <span>Reloading Account Status</span>
                    </>
                  ) : (
                    <>
                      <CheckCircle2 className="h-4 w-4 !text-[#07090E]" />
                      <span>I have verified my email -&gt;</span>
                    </>
                  )}
                </button>

                <Link
                  href={`/login?email=${encodeURIComponent(verificationSentTo)}`}
                  className="w-full h-12 rounded-xl border border-white/15 bg-white/[0.03] text-xs font-medium uppercase tracking-[0.16em] text-zinc-200 inline-flex items-center justify-center gap-2 transition hover:border-white/30 hover:bg-white/[0.06]"
                >
                  <span>Proceed to Sign In</span>
                  <ArrowRight className="h-4 w-4" />
                </Link>

                <button
                  type="button"
                  onClick={handleResend}
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
                      <span>Resend Verification Link</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          ) : (
            <div className="space-y-8">
              <div className="space-y-2.5 text-center sm:text-left">
                <p className="text-[11px] font-semibold uppercase tracking-[0.26em] text-zinc-500">
                  GTF Identity
                </p>
                <h1 className="text-3xl sm:text-4xl font-light tracking-tight text-white">
                  Create account
                </h1>
              </div>

              <form
                onSubmit={handleRegister}
                className="rounded-2xl border border-white/10 bg-[#0D1017]/80 p-7 sm:p-9 backdrop-blur-2xl shadow-[0_30px_90px_rgba(0,0,0,0.65)] space-y-6"
                noValidate
              >
                <div className="space-y-4">
                  <div className="space-y-2">
                    <label
                      htmlFor="register-name"
                      className="block text-[11px] font-medium uppercase tracking-[0.18em] text-zinc-400"
                    >
                      Full Name
                    </label>
                    <input
                      id="register-name"
                      type="text"
                      autoComplete="name"
                      value={fullName}
                      onChange={(e) => setFullName(e.target.value)}
                      placeholder="First and last name"
                      className="w-full h-12 rounded-xl border border-white/15 bg-slate-900 px-4 text-sm text-white placeholder:text-zinc-600 outline-none transition focus:border-white/60"
                    />
                  </div>

                  <div className="space-y-2">
                    <label
                      htmlFor="register-email"
                      className="block text-[11px] font-medium uppercase tracking-[0.18em] text-zinc-400"
                    >
                      Email
                    </label>
                    <input
                      id="register-email"
                      type="email"
                      autoComplete="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="name@example.com"
                      className="w-full h-12 rounded-xl border border-white/15 bg-slate-900 px-4 text-sm text-white placeholder:text-zinc-600 outline-none transition focus:border-white/60"
                    />
                  </div>

                  <div className="space-y-2">
                    <label
                      htmlFor="register-phone"
                      className="block text-[11px] font-medium uppercase tracking-[0.18em] text-zinc-400"
                    >
                      WhatsApp / Phone <span className="text-zinc-500 lowercase">(optional)</span>
                    </label>
                    <input
                      id="register-phone"
                      type="tel"
                      autoComplete="tel"
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      placeholder="+49 152 28372894 / +91 98..."
                      className="w-full h-12 rounded-xl border border-white/15 bg-slate-900 px-4 text-sm text-white placeholder:text-zinc-600 outline-none transition focus:border-white/60"
                    />
                  </div>

                  <div className="space-y-2">
                    <label
                      htmlFor="register-password"
                      className="block text-[11px] font-medium uppercase tracking-[0.18em] text-zinc-400"
                    >
                      Password
                    </label>
                    <div className="relative">
                      <input
                        id="register-password"
                        type={showPassword ? "text" : "password"}
                        autoComplete="new-password"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        placeholder="Minimum 6 characters"
                        className="w-full h-12 rounded-xl border border-white/15 bg-slate-900 pl-4 pr-11 text-sm text-white placeholder:text-zinc-600 outline-none transition focus:border-white/60"
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

                <button
                  type="submit"
                  disabled={submitting}
                  className="w-full h-12 rounded-xl !bg-white !text-[#07090E] text-xs font-semibold uppercase tracking-[0.2em] inline-flex items-center justify-center gap-2 transition hover:opacity-90 disabled:opacity-50"
                >
                  {submitting ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin !text-[#07090E]" />
                      <span>Creating Account</span>
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
                Already verified?{" "}
                <Link
                  href="/login"
                  className="text-zinc-200 font-medium hover:text-white underline underline-offset-4 transition"
                >
                  Sign in
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
