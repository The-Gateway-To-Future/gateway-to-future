"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  onAuthStateChanged,
  sendEmailVerification,
  signOut,
  type User as FirebaseUser,
} from "firebase/auth";
import {
  ArrowRight,
  BadgeCheck,
  CheckCircle2,
  Crown,
  Loader2,
  LogOut,
  Mail,
  RefreshCw,
  ShieldAlert,
  ShieldCheck,
  User as UserIcon,
} from "lucide-react";
import { Navbar } from "@/components/Navbar";
import { BottomNavigationBar } from "@/components/BottomNavigationBar";
import { AuthToast, type AuthToastState } from "@/components/AuthToast";
import { useAuth } from "@/lib/auth-context";
import { DIVISION_META } from "@/lib/config";
import { getFirebaseAuth } from "@/lib/firebase";
import type { CatalogItem, DivisionId } from "@/lib/types";

export default function ProfilePage() {
  const router = useRouter();
  const { user, isAuthenticated, isLoading, logout } = useAuth();

  const [fbUser, setFbUser] = useState<FirebaseUser | null>(null);
  const [fbReady, setFbReady] = useState(false);
  const [subscriptionTier, setSubscriptionTier] = useState<"Free Tier" | "Pro">("Free Tier");
  const [unlockedCount, setUnlockedCount] = useState(0);
  const [signingOut, setSigningOut] = useState(false);
  const [resendingEmail, setResendingEmail] = useState(false);
  const [refreshingVerification, setRefreshingVerification] = useState(false);
  const [toast, setToast] = useState<AuthToastState | null>(null);

  useEffect(() => {
    try {
      const auth = getFirebaseAuth();
      const unsub = onAuthStateChanged(auth, (current) => {
        setFbUser(current);
        setFbReady(true);
      });
      return () => unsub();
    } catch {
      setFbReady(true);
      return undefined;
    }
  }, []);

  useEffect(() => {
    const targetEmail = (fbUser?.email || user?.userEmail || "").trim().toLowerCase();
    if (!targetEmail) return;

    let active = true;
    fetch(`/api/catalog?email=${encodeURIComponent(targetEmail)}`, { cache: "no-store" })
      .then((res) => (res.ok ? res.json() : null))
      .then((data: { products?: CatalogItem[] } | null) => {
        if (!active || !data?.products) return;
        const paidUnlocks = data.products.filter((p) => p.unlocked && !p.isFree);
        const isFreeLaunch = process.env.NEXT_PUBLIC_FREE_LAUNCH_MODE === "true";
        const hasPro =
          !isFreeLaunch &&
          (paidUnlocks.some((p) => p.slug === "gtf-all-access-pass") || paidUnlocks.length > 0);
        setUnlockedCount(paidUnlocks.length);
        setSubscriptionTier(hasPro ? "Pro" : "Free Tier");
      })
      .catch(() => {
        // Default safely to Free Tier
      });

    return () => {
      active = false;
    };
  }, [fbUser?.email, user?.userEmail]);

  const handleSignOut = async () => {
    if (signingOut) return;
    setSigningOut(true);
    try {
      await signOut(getFirebaseAuth()).catch(() => {});
      await logout();
      router.replace("/login");
    } finally {
      setSigningOut(false);
    }
  };

  const handleSendVerification = async () => {
    if (!fbUser || resendingEmail) return;
    setResendingEmail(true);
    try {
      await sendEmailVerification(fbUser, {
        url: "https://app.gatewaytofuture.com/login",
        handleCodeInApp: true,
      });
      setToast({
        id: Date.now(),
        title: "Verification link sent",
        message: `Please check ${fbUser.email || "your inbox"} to confirm your email address.`,
        tone: "success",
      });
    } catch (err) {
      setToast({
        id: Date.now(),
        title: "Unable to send email",
        message: err instanceof Error ? err.message : "Please try again shortly.",
        tone: "error",
      });
    } finally {
      setResendingEmail(false);
    }
  };

  const handleRefreshStatus = async () => {
    if (!fbUser || refreshingVerification) return;
    setRefreshingVerification(true);
    try {
      await fbUser.reload();
      setFbUser(getFirebaseAuth().currentUser);
    } finally {
      setRefreshingVerification(false);
    }
  };

  const displayName =
    fbUser?.displayName ||
    user?.fullName ||
    (fbUser?.email || user?.userEmail || "GTF Candidate").split("@")[0];
  const displayEmail = fbUser?.email || user?.userEmail || "Not linked";
  const emailVerified = fbUser ? fbUser.emailVerified : Boolean(isAuthenticated);
  const divisionKey = (user?.course || "sprachakademie") as DivisionId;
  const divisionLabel = DIVISION_META[divisionKey]?.shortTitle || "German Language Academy";

  return (
    <div className="min-h-screen flex flex-col bg-slate-50 text-slate-900 pb-28 md:pb-12">
      <Navbar />
      <AuthToast toast={toast} onDismiss={() => setToast(null)} />

      <main className="mx-auto w-full max-w-4xl flex-1 px-4 sm:px-6 pt-8 sm:pt-12 space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 border-b border-white/10 pb-6">
          <div className="space-y-1.5">
            <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-zinc-500">
              GTF Account &amp; Security
            </p>
            <h1 className="text-3xl sm:text-4xl font-light tracking-tight text-white">
              Candidate Profile
            </h1>
          </div>

          {user?.studentId && (
            <span className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/[0.04] px-3.5 py-1.5 font-mono text-xs font-semibold text-zinc-200 w-fit">
              <BadgeCheck className="h-3.5 w-3.5 text-emerald-400" />
              <span>{user.studentId}</span>
            </span>
          )}
        </div>

        {isLoading && !fbReady ? (
          <div className="rounded-2xl border border-white/10 bg-[#0D1017] p-10 flex items-center justify-center gap-3 text-sm text-zinc-400">
            <Loader2 className="h-4 w-4 animate-spin text-zinc-300" />
            <span>Loading GTF profile…</span>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-12 gap-6">
            {/* Identity & Email Verification Card */}
            <section className="md:col-span-7 rounded-2xl border border-white/10 bg-[#0D1017] p-6 sm:p-7 space-y-6">
              <div className="flex items-center gap-4">
                <div className="flex h-14 w-14 items-center justify-center rounded-2xl !bg-white !text-[#07090E] text-xl font-bold shrink-0">
                  {displayName.charAt(0).toUpperCase()}
                </div>
                <div className="min-w-0">
                  <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-zinc-500">
                    Registered Candidate
                  </p>
                  <h2 className="text-xl font-medium text-white truncate">{displayName}</h2>
                  <p className="text-xs text-zinc-400 truncate mt-0.5">{divisionLabel}</p>
                </div>
              </div>

              <div className="space-y-3 pt-2 border-t border-white/10">
                <div className="flex items-center justify-between gap-3 rounded-xl border border-white/10 bg-slate-900 px-4 py-3">
                  <div className="flex items-center gap-2.5 min-w-0">
                    <UserIcon className="h-4 w-4 text-zinc-400 shrink-0" />
                    <div className="min-w-0">
                      <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-zinc-500">
                        Full Name
                      </p>
                      <p className="text-sm font-medium text-white truncate">{displayName}</p>
                    </div>
                  </div>
                </div>

                <div className="flex items-center justify-between gap-3 rounded-xl border border-white/10 bg-slate-900 px-4 py-3">
                  <div className="flex items-center gap-2.5 min-w-0">
                    <Mail className="h-4 w-4 text-zinc-400 shrink-0" />
                    <div className="min-w-0">
                      <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-zinc-500">
                        Email Address
                      </p>
                      <p className="text-sm font-medium text-white truncate">{displayEmail}</p>
                    </div>
                  </div>

                  {emailVerified ? (
                    <span className="inline-flex items-center gap-1 rounded-full border border-emerald-500/30 bg-emerald-500/10 px-2.5 py-1 text-[11px] font-semibold text-emerald-300 shrink-0">
                      <ShieldCheck className="h-3.5 w-3.5" />
                      <span>Verified</span>
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1 rounded-full border border-amber-500/30 bg-amber-500/10 px-2.5 py-1 text-[11px] font-semibold text-amber-300 shrink-0">
                      <ShieldAlert className="h-3.5 w-3.5" />
                      <span>Unverified</span>
                    </span>
                  )}
                </div>

                {fbUser && !fbUser.emailVerified && (
                  <div className="rounded-xl border border-amber-500/30 bg-amber-500/10 p-4 space-y-3">
                    <p className="text-xs text-amber-200 leading-relaxed">
                      Your email is not verified yet. Send an official Firebase verification link to unlock full portal synchronization.
                    </p>
                    <div className="flex flex-wrap items-center gap-2">
                      <button
                        type="button"
                        onClick={handleSendVerification}
                        disabled={resendingEmail}
                        className="inline-flex items-center gap-1.5 rounded-lg !bg-white !text-[#07090E] px-3 py-1.5 text-xs font-semibold hover:bg-zinc-200 transition disabled:opacity-50"
                      >
                        {resendingEmail ? (
                          <Loader2 className="h-3.5 w-3.5 animate-spin !text-[#07090E]" />
                        ) : (
                          <Mail className="h-3.5 w-3.5 !text-[#07090E]" />
                        )}
                        <span>Send Verification Link</span>
                      </button>
                      <button
                        type="button"
                        onClick={handleRefreshStatus}
                        disabled={refreshingVerification}
                        className="inline-flex items-center gap-1.5 rounded-lg border border-white/15 bg-white/[0.04] px-3 py-1.5 text-xs font-medium text-zinc-200 hover:border-white/30 transition"
                      >
                        <RefreshCw className={`h-3.5 w-3.5 ${refreshingVerification ? "animate-spin" : ""}`} />
                        <span>Refresh Status</span>
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </section>

            {/* Subscription Status & Sign Out Column */}
            <div className="md:col-span-5 space-y-6">
              {/* Subscription Status Card */}
              <section className="rounded-2xl border border-white/10 bg-[#0D1017] p-6 space-y-5">
                <div className="flex items-start justify-between gap-3">
                  <div className="space-y-1">
                    <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-zinc-500">
                      Subscription Status
                    </p>
                    <div className="flex items-center gap-2">
                      <h3 className="text-2xl font-light text-white">{subscriptionTier}</h3>
                      {subscriptionTier === "Pro" && (
                        <CheckCircle2 className="h-5 w-5 text-emerald-400" />
                      )}
                    </div>
                  </div>
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl border border-white/15 bg-white/[0.04]">
                    <Crown className={`h-5 w-5 ${subscriptionTier === "Pro" ? "text-amber-300" : "text-zinc-400"}`} />
                  </div>
                </div>

                <p className="text-xs leading-relaxed text-zinc-400">
                  {subscriptionTier === "Pro"
                    ? `Active GTF Pro entitlements detected (${unlockedCount} unlocked module${unlockedCount === 1 ? "" : "s"}).`
                    : "You are currently on the Free Tier with sample modules unlocked. Upgrade for unlimited AI Grading, 30+ German workbooks, Studienkolleg & Pflege trainers."}
                </p>

                <Link
                  href="/pricing"
                  className="w-full h-11 rounded-xl !bg-white !text-[#07090E] text-xs font-semibold uppercase tracking-[0.16em] inline-flex items-center justify-center gap-2 hover:bg-zinc-200 transition"
                >
                  <span>{subscriptionTier === "Pro" ? "Manage Membership" : "Upgrade to Pro (€50/mo)"}</span>
                  <ArrowRight className="h-3.5 w-3.5 !text-[#07090E]" />
                </Link>
              </section>

              {/* Sign Out Security Card */}
              <section className="rounded-2xl border border-red-500/20 bg-[#0D1017] p-6 space-y-4">
                <div className="space-y-1">
                  <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-red-400/90">
                    Session Control
                  </p>
                  <p className="text-xs text-zinc-400 leading-relaxed">
                    End your active GTF Portal and Firebase session on this device.
                  </p>
                </div>

                <button
                  type="button"
                  onClick={handleSignOut}
                  disabled={signingOut}
                  className="w-full h-12 rounded-xl border border-red-500/40 bg-red-500/15 text-xs font-bold uppercase tracking-[0.18em] text-red-200 inline-flex items-center justify-center gap-2 hover:bg-red-500/25 hover:border-red-400/70 transition disabled:opacity-50"
                >
                  {signingOut ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin text-red-200" />
                      <span>Signing Out…</span>
                    </>
                  ) : (
                    <>
                      <LogOut className="h-4 w-4 text-red-300" />
                      <span>Sign Out</span>
                    </>
                  )}
                </button>
              </section>
            </div>
          </div>
        )}
      </main>

      <BottomNavigationBar />
    </div>
  );
}
