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
  AlertTriangle,
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
  Trash2,
  User as UserIcon,
  X,
} from "lucide-react";
import { Navbar } from "@/components/Navbar";
import { BottomNavigationBar } from "@/components/BottomNavigationBar";
import { AuthToast, type AuthToastState } from "@/components/AuthToast";
import { ReaderAppNotice } from "@/components/ReaderAppNotice";
import { clearGtfAuthCookie, useAuth } from "@/lib/auth-context";
import { clearActiveSession } from "@/lib/client-storage";
import { DIVISION_META } from "@/lib/config";
import { getFirebaseAuth } from "@/lib/firebase";
import { useIsNativeApp } from "@/lib/use-native-platform";
import type { CatalogItem, DivisionId } from "@/lib/types";

export default function ProfilePage() {
  const router = useRouter();
  const { user, isAuthenticated, isLoading, logout } = useAuth();
  const { isNative, ready: nativeReady } = useIsNativeApp();

  const [fbUser, setFbUser] = useState<FirebaseUser | null>(null);
  const [fbReady, setFbReady] = useState(false);
  const [subscriptionTier, setSubscriptionTier] = useState<"Free Tier" | "Pro">("Free Tier");
  const [unlockedCount, setUnlockedCount] = useState(0);
  const [signingOut, setSigningOut] = useState(false);
  const [resendingEmail, setResendingEmail] = useState(false);
  const [refreshingVerification, setRefreshingVerification] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deleteConfirmText, setDeleteConfirmText] = useState("");
  const [deletingAccount, setDeletingAccount] = useState(false);
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

  const handleDeleteAccount = async () => {
    if (deletingAccount) return;
    if (deleteConfirmText.trim().toUpperCase() !== "DELETE") {
      setToast({
        id: Date.now(),
        title: "Confirmation required",
        message: 'Type "DELETE" in the confirmation field to permanently erase your account.',
        tone: "warning",
      });
      return;
    }

    setDeletingAccount(true);
    try {
      const auth = getFirebaseAuth();
      const activeFbUser = auth.currentUser || fbUser;
      let idToken = "";
      if (activeFbUser) {
        idToken = await activeFbUser.getIdToken(true);
      } else if (user?.sessionToken) {
        idToken = user.sessionToken;
      }

      if (!idToken) {
        setToast({
          id: Date.now(),
          title: "Re-authentication required",
          message: "Please sign out and sign back in to confirm permanent account deletion.",
          tone: "error",
        });
        return;
      }

      const res = await fetch("/api/auth/delete", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${idToken}`,
        },
        body: JSON.stringify({
          idToken,
          studentId: user?.studentId || "",
          confirm: true,
        }),
      });

      const data = (await res.json().catch(() => ({}))) as {
        ok?: boolean;
        success?: boolean;
        error?: string;
      };

      if (!res.ok || (!data.ok && !data.success)) {
        setToast({
          id: Date.now(),
          title: "Deletion failed",
          message:
            data.error ||
            "Unable to delete your account right now. Please sign in again or contact info@gatewaytofuture.com.",
          tone: "error",
        });
        return;
      }

      await signOut(auth).catch(() => {});
      clearGtfAuthCookie();
      clearActiveSession();
      if (typeof window !== "undefined") {
        localStorage.removeItem("gtf_student_user");
        localStorage.removeItem("gtf_student_token");
      }
      await logout().catch(() => {});
      setShowDeleteModal(false);
      router.replace("/login?deleted=1");
    } catch (err) {
      setToast({
        id: Date.now(),
        title: "Deletion error",
        message:
          err instanceof Error
            ? err.message
            : "An error occurred while deleting your account.",
        tone: "error",
      });
    } finally {
      setDeletingAccount(false);
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
        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 border-b border-slate-200 pb-6">
          <div className="space-y-1.5">
            <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-slate-500">
              GTF Account &amp; Security
            </p>
            <h1 className="text-3xl sm:text-4xl font-light tracking-tight text-slate-900">
              Candidate Profile
            </h1>
          </div>

          {user?.studentId && (
            <span className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-slate-100 px-3.5 py-1.5 font-mono text-xs font-semibold text-slate-800 w-fit shadow-xs">
              <BadgeCheck className="h-3.5 w-3.5 text-emerald-600" />
              <span>{user.studentId}</span>
            </span>
          )}
        </div>

        {isLoading && !fbReady ? (
          <div className="rounded-2xl border border-slate-200 bg-white p-10 flex items-center justify-center gap-3 text-sm text-slate-500 shadow-xs">
            <Loader2 className="h-4 w-4 animate-spin text-slate-600" />
            <span>Loading GTF profile…</span>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-12 gap-6">
            {/* Identity & Email Verification Card */}
            <section className="md:col-span-7 rounded-2xl border border-slate-200 bg-white p-6 sm:p-7 space-y-6 shadow-xs">
              <div className="flex items-center gap-4">
                <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-slate-900 text-white text-xl font-bold shrink-0 shadow-xs">
                  {displayName.charAt(0).toUpperCase()}
                </div>
                <div className="min-w-0">
                  <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">
                    Registered Candidate
                  </p>
                  <h2 className="text-xl font-semibold text-slate-900 truncate">{displayName}</h2>
                  <p className="text-xs text-slate-600 truncate mt-0.5">{divisionLabel}</p>
                </div>
              </div>

              <div className="space-y-3 pt-2 border-t border-slate-100">
                <div className="flex items-center justify-between gap-3 rounded-xl border border-slate-200 bg-slate-50 px-4 py-3">
                  <div className="flex items-center gap-2.5 min-w-0">
                    <UserIcon className="h-4 w-4 text-slate-400 shrink-0" />
                    <div className="min-w-0">
                      <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-slate-500">
                        Full Name
                      </p>
                      <p className="text-sm font-medium text-slate-900 truncate">{displayName}</p>
                    </div>
                  </div>
                </div>

                <div className="flex items-center justify-between gap-3 rounded-xl border border-slate-200 bg-slate-50 px-4 py-3">
                  <div className="flex items-center gap-2.5 min-w-0">
                    <Mail className="h-4 w-4 text-slate-400 shrink-0" />
                    <div className="min-w-0">
                      <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-slate-500">
                        Email Address
                      </p>
                      <p className="text-sm font-medium text-slate-900 truncate">{displayEmail}</p>
                    </div>
                  </div>

                  {emailVerified ? (
                    <span className="inline-flex items-center gap-1 rounded-full border border-emerald-300 bg-emerald-50 px-2.5 py-1 text-[11px] font-semibold text-emerald-800 shrink-0">
                      <ShieldCheck className="h-3.5 w-3.5 text-emerald-600" />
                      <span>Verified</span>
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1 rounded-full border border-amber-300 bg-amber-50 px-2.5 py-1 text-[11px] font-semibold text-amber-800 shrink-0">
                      <ShieldAlert className="h-3.5 w-3.5 text-amber-600" />
                      <span>Unverified</span>
                    </span>
                  )}
                </div>

                {fbUser && !fbUser.emailVerified && (
                  <div className="rounded-xl border border-amber-300 bg-amber-50 p-4 space-y-3">
                    <p className="text-xs text-amber-900 leading-relaxed font-medium">
                      Your email is not verified yet. Send an official Firebase verification link to unlock full portal synchronization.
                    </p>
                    <div className="flex flex-wrap items-center gap-2">
                      <button
                        type="button"
                        onClick={handleSendVerification}
                        disabled={resendingEmail}
                        className="inline-flex items-center gap-1.5 rounded-lg bg-slate-900 text-white px-3 py-1.5 text-xs font-semibold hover:bg-slate-800 transition disabled:opacity-50"
                      >
                        {resendingEmail ? (
                          <Loader2 className="h-3.5 w-3.5 animate-spin text-white" />
                        ) : (
                          <Mail className="h-3.5 w-3.5 text-white" />
                        )}
                        <span>Send Verification Link</span>
                      </button>
                      <button
                        type="button"
                        onClick={handleRefreshStatus}
                        disabled={refreshingVerification}
                        className="inline-flex items-center gap-1.5 rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50 transition"
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
              <section className="rounded-2xl border border-slate-200 bg-white p-6 space-y-5 shadow-xs">
                <div className="flex items-start justify-between gap-3">
                  <div className="space-y-1">
                    <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">
                      Subscription Status
                    </p>
                    <div className="flex items-center gap-2">
                      <h3 className="text-2xl font-semibold text-slate-900">{subscriptionTier}</h3>
                      {subscriptionTier === "Pro" && (
                        <CheckCircle2 className="h-5 w-5 text-emerald-600" />
                      )}
                    </div>
                  </div>
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl border border-slate-200 bg-slate-50">
                    <Crown className={`h-5 w-5 ${subscriptionTier === "Pro" ? "text-amber-500" : "text-slate-400"}`} />
                  </div>
                </div>

                {nativeReady && isNative ? (
                  <ReaderAppNotice compact isAuthenticated={isAuthenticated} />
                ) : nativeReady ? (
                  <>
                    <p className="text-xs leading-relaxed text-slate-600">
                      {subscriptionTier === "Pro"
                        ? `Active GTF Pro entitlements detected (${unlockedCount} unlocked module${unlockedCount === 1 ? "" : "s"}).`
                        : "You are currently on the Free Tier with sample modules unlocked. Upgrade for unlimited AI Grading, CEFR A1–B2 workbooks, Goethe/telc Modelltests, and Early Access to Studienkolleg & Pflege when launched."}
                    </p>

                    <Link
                      href="/pricing"
                      className="w-full h-11 rounded-xl bg-slate-900 text-white text-xs font-semibold uppercase tracking-[0.16em] inline-flex items-center justify-center gap-2 hover:bg-slate-800 transition shadow-xs"
                    >
                      <span>{subscriptionTier === "Pro" ? "Manage Membership" : "Upgrade to Pro (₹4,999)"}</span>
                      <ArrowRight className="h-3.5 w-3.5 text-white" />
                    </Link>
                  </>
                ) : null}
              </section>

              {/* Sign Out Security Card */}
              <section className="rounded-2xl border border-slate-200 bg-white p-6 space-y-4 shadow-xs">
                <div className="space-y-1">
                  <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-600">
                    Session Control
                  </p>
                  <p className="text-xs text-slate-600 leading-relaxed">
                    End your active GTF Portal and Firebase session on this device.
                  </p>
                </div>

                <button
                  type="button"
                  onClick={handleSignOut}
                  disabled={signingOut}
                  className="w-full h-12 rounded-xl border border-slate-300 bg-slate-50 text-xs font-bold uppercase tracking-[0.18em] text-slate-800 inline-flex items-center justify-center gap-2 hover:bg-slate-100 hover:border-slate-400 transition disabled:opacity-50"
                >
                  {signingOut ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin text-slate-700" />
                      <span>Signing Out…</span>
                    </>
                  ) : (
                    <>
                      <LogOut className="h-4 w-4 text-slate-600" />
                      <span>Sign Out</span>
                    </>
                  )}
                </button>
              </section>

              {/* Permanent Account Deletion Card (Google Play & GDPR Art. 17 Compliance) */}
              <section className="rounded-2xl border border-red-200 bg-white p-6 space-y-4 shadow-xs">
                <div className="space-y-1">
                  <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-red-600">
                    Account Deletion
                  </p>
                  <p className="text-xs text-slate-600 leading-relaxed">
                    Permanently delete your Gateway To Future login, Firestore profile, and synced study progress. This action cannot be undone.
                  </p>
                </div>

                <button
                  type="button"
                  onClick={() => {
                    setDeleteConfirmText("");
                    setShowDeleteModal(true);
                  }}
                  className="w-full h-12 rounded-xl border border-red-300 bg-red-50 text-xs font-bold uppercase tracking-[0.18em] text-red-700 inline-flex items-center justify-center gap-2 hover:bg-red-100 hover:border-red-400 transition cursor-pointer"
                >
                  <Trash2 className="h-4 w-4 text-red-600" />
                  <span>Delete Account</span>
                </button>
              </section>
            </div>
          </div>
        )}
      </main>

      {/* Account Deletion Confirmation Modal */}
      {showDeleteModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 p-4 backdrop-blur-xs"
          role="dialog"
          aria-modal="true"
          aria-labelledby="delete-account-modal-title"
        >
          <div className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-6 sm:p-7 space-y-5 shadow-2xl">
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-red-50 border border-red-200 text-red-600 shrink-0">
                  <AlertTriangle className="h-5 w-5" />
                </div>
                <div>
                  <h2
                    id="delete-account-modal-title"
                    className="text-base sm:text-lg font-bold text-slate-900"
                  >
                    Delete Account Permanently?
                  </h2>
                  <p className="text-xs text-slate-500">This action is irreversible.</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => !deletingAccount && setShowDeleteModal(false)}
                disabled={deletingAccount}
                aria-label="Close modal"
                className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-700 transition"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="rounded-xl border border-red-200 bg-red-50/70 p-4 text-xs text-red-900 space-y-1.5 leading-relaxed">
              <p className="font-semibold">
                The following data for <span className="font-mono">{displayEmail}</span> will be permanently erased:
              </p>
              <ul className="list-disc pl-4 space-y-1">
                <li>Your Firebase Authentication login credentials</li>
                <li>Your student profile records in Cloud Firestore</li>
                <li>Your synced flashcard streaks &amp; learning progress</li>
              </ul>
            </div>

            <div className="space-y-2">
              <label
                htmlFor="confirm-delete-input"
                className="block text-[11px] font-bold uppercase tracking-[0.14em] text-slate-700"
              >
                Type <span className="font-mono text-red-700">DELETE</span> to confirm
              </label>
              <input
                id="confirm-delete-input"
                type="text"
                value={deleteConfirmText}
                onChange={(e) => setDeleteConfirmText(e.target.value)}
                placeholder="DELETE"
                disabled={deletingAccount}
                autoComplete="off"
                className="w-full h-11 rounded-xl border border-slate-300 bg-white px-3.5 text-sm font-mono text-slate-900 outline-none focus:border-red-500 focus:ring-2 focus:ring-red-100"
              />
            </div>

            <div className="flex flex-col-reverse sm:flex-row items-center justify-end gap-2.5 pt-1">
              <button
                type="button"
                onClick={() => setShowDeleteModal(false)}
                disabled={deletingAccount}
                className="w-full sm:w-auto h-11 px-5 rounded-xl border border-slate-300 bg-white text-xs font-semibold uppercase tracking-[0.14em] text-slate-700 hover:bg-slate-50 transition"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleDeleteAccount}
                disabled={deletingAccount || deleteConfirmText.trim().toUpperCase() !== "DELETE"}
                className="w-full sm:w-auto h-11 px-5 rounded-xl bg-red-600 text-xs font-bold uppercase tracking-[0.14em] text-white inline-flex items-center justify-center gap-2 hover:bg-red-700 transition disabled:opacity-50 cursor-pointer"
              >
                {deletingAccount ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin text-white" />
                    <span>Deleting Account…</span>
                  </>
                ) : (
                  <>
                    <Trash2 className="h-4 w-4 text-white" />
                    <span>Confirm Permanent Delete</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      <BottomNavigationBar />
    </div>
  );
}
