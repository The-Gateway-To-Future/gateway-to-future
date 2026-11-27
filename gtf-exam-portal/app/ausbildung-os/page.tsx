"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { onAuthStateChanged, type User as FirebaseUser } from "firebase/auth";
import { doc, getDoc } from "firebase/firestore";
import {
  AlertTriangle,
  ArrowRight,
  Award,
  Briefcase,
  Check,
  CheckCircle2,
  ClipboardCheck,
  Database,
  ExternalLink,
  Eye,
  FileText,
  GraduationCap,
  Headphones,
  Loader2,
  ShieldCheck,
  Sparkles,
} from "lucide-react";
import { Navbar } from "@/components/Navbar";
import { BottomNavigationBar } from "@/components/BottomNavigationBar";
import { useAuth } from "@/lib/auth-context";
import { BRAND } from "@/lib/config";
import { ensureFirebaseLocalPersistence, getFirebaseFirestore } from "@/lib/firebase";
import {
  getUserProgressWithStatus,
  resolveProgressUid,
  sanitizeProgressUid,
  updateUserProgressWithStatus,
  USER_PROGRESS_EVENT,
  type UserProgress,
} from "@/lib/firebase/progress";
import {
  BewerbungsmappeBuilder,
  type BewerbungGermanLevel,
  type BewerbungTargetField,
} from "./BewerbungsmappeBuilder";
import { ApplicationTracker } from "./ApplicationTracker";
import { ProGateOverlay } from "./ProGateOverlay";

interface ChecklistDocumentItem {
  id: string;
  stepId: string;
  title: string;
  subtitle: string;
  tag: string;
  icon: typeof FileText;
}

const DOCUMENT_CHECKLIST: readonly ChecklistDocumentItem[] = [
  {
    id: "passport",
    stepId: "AUSBILDUNG_OS_DOC_PASSPORT",
    title: "Passport",
    subtitle: "Valid international passport ready for visa filing and employer onboarding.",
    tag: "Identity",
    icon: ShieldCheck,
  },
  {
    id: "school_10_12",
    stepId: "AUSBILDUNG_OS_DOC_SCHOOL_10_12",
    title: "10th/12th",
    subtitle: "10th & 12th academic marksheets and official passing certificates.",
    tag: "Academics",
    icon: GraduationCap,
  },
  {
    id: "language_b1_b2",
    stepId: "AUSBILDUNG_OS_DOC_LANGUAGE_B1_B2",
    title: "B1/B2",
    subtitle: "Recognized German language certificate (Goethe / telc B1 or B2).",
    tag: "Language",
    icon: Award,
  },
  {
    id: "anerkennung",
    stepId: "AUSBILDUNG_OS_DOC_ANERKENNUNG",
    title: "Anerkennung",
    subtitle: "Official credential recognition and equivalence assessment dossier.",
    tag: "Recognition",
    icon: FileText,
  },
] as const;

type GermanLevel = BewerbungGermanLevel;
const GERMAN_LEVELS: readonly GermanLevel[] = ["None", "A1", "A2", "B1", "B2"] as const;

type TargetField = BewerbungTargetField;
const TARGET_FIELDS: readonly TargetField[] = ["Nursing", "Hospitality", "IT", "Handwerk"] as const;

type RuleCategory = "All" | "Visa/CSP" | "Salary" | "Nursing" | "Hospitality";
const RULE_CATEGORIES: readonly RuleCategory[] = [
  "All",
  "Visa/CSP",
  "Salary",
  "Nursing",
  "Hospitality",
] as const;

interface AusbildungRuleCard {
  id: string;
  category: Exclude<RuleCategory, "All">;
  title: string;
  highlight: string;
  summary: string;
  authority: string;
  lastVerified: string;
  sourceUrl: string;
}

const AUSBILDUNG_RULES_2026: readonly AusbildungRuleCard[] = [
  {
    id: "visa-csp-16a",
    category: "Visa/CSP",
    title: "§ 16a AufenthG Visa & Digital CSP Pre-Check",
    highlight: "Digital Filing via digital.diplo.de",
    summary:
      "Vocational training visas (§ 16a AufenthG) are submitted online through the Federal Foreign Office Consular Services Portal for digital document pre-screening prior to your biometric appointment. Requires a signed Ausbildungsvertrag, training plan, and livelihood coverage (€1,091/mo Sperrkonto benchmark if stipend is below threshold).",
    authority: "Auswärtiges Amt · CSP",
    lastVerified: "Last Verified: Nov 2026",
    sourceUrl: "https://digital.diplo.de",
  },
  {
    id: "salary-bbig-2026",
    category: "Salary",
    title: "2026 Statutory Minimum Stipend (§ 17 BBiG)",
    highlight: "€724 – €1,014/mo Statutory Floor",
    summary:
      "For dual training contracts starting in 2026, federal law mandates at least €724/mo gross (Year 1), €854/mo (Year 2), €977/mo (Year 3), and €1,014/mo (Year 4). Tariff-bound employers (Tarifverträge) routinely pay €1,050–€1,650+/mo.",
    authority: "BMJ / BIBB · § 17 BBiG",
    lastVerified: "Last Verified: Nov 2026",
    sourceUrl: "https://www.gesetze-im-internet.de/bbig_2005/__17.html",
  },
  {
    id: "nursing-pflbg-2026",
    category: "Nursing",
    title: "Generalist Nursing (PflBG & TVAöD-Pflege 2026)",
    highlight: "€1,490 – €1,653/mo Public Tariff",
    summary:
      "3-year EU-recognized Pflegefachfrau/-mann curriculum (2,100h theory + 2,500h clinical rotations). Under TVAöD-Pflege (effective May 2026), public hospitals pay €1,490.69 (Year 1), €1,552.07 (Year 2), and €1,653.38 (Year 3) gross/month; requires school equivalence, medical fitness, and B2 (or B1 clinical bridge).",
    authority: "BMG · Pflegeberufegesetz",
    lastVerified: "Last Verified: Nov 2026",
    sourceUrl: "https://www.gesetze-im-internet.de/pflbg/",
  },
  {
    id: "hospitality-ihk-2026",
    category: "Hospitality",
    title: "IHK Dual Hospitality & Gastronomy Standards",
    highlight: "3-Year IHK Contract · B1 Required",
    summary:
      "Dual Hotelfachmann/-frau and gastronomy tracks combine paid hotel shifts with Berufsschule instruction under an IHK-registered Ausbildungsvertrag. Requires Federal Employment Agency (BA) approval and certified B1 German for guest-facing operations.",
    authority: "Make it in Germany · Federal Portal",
    lastVerified: "Last Verified: Nov 2026",
    sourceUrl: "https://www.make-it-in-germany.com/en/study-vocational-training/training-in-germany",
  },
] as const;

const REALITY_STORAGE_KEY = "gtf_ausbildung_os_reality_v1";
const DEV_PREVIEW_STORAGE_KEY = "gtf_ausbildung_os_dev_preview";

export default function AusbildungOsPage() {
  const { user, isAuthenticated, isLoading: authLoading } = useAuth();

  const [fbUid, setFbUid] = useState<string | null>(null);
  const [fbReady, setFbReady] = useState(false);
  const [completedSteps, setCompletedSteps] = useState<string[]>([]);
  const [loadingChecklist, setLoadingChecklist] = useState(true);
  const [syncState, setSyncState] = useState<"synced" | "saving" | "local">("synced");
  const [savingStepId, setSavingStepId] = useState<string | null>(null);

  const [selectedLevel, setSelectedLevel] = useState<GermanLevel>("None");
  const [selectedField, setSelectedField] = useState<TargetField>("Nursing");
  const [realityHydrated, setRealityHydrated] = useState(false);
  const [activeRuleCategory, setActiveRuleCategory] = useState<RuleCategory>("All");

  const [isAdminClaim, setIsAdminClaim] = useState(false);
  const [firestoreAusbildungPro, setFirestoreAusbildungPro] = useState(false);
  const [catalogHasPro, setCatalogHasPro] = useState(false);
  const [devPreviewMode, setDevPreviewMode] = useState<"free" | "pro" | null>(null);

  const latestStepsRef = useRef<string[]>([]);
  const saveQueueRef = useRef<Promise<void>>(Promise.resolve());

  useEffect(() => {
    if (process.env.NODE_ENV !== "development") return;
    try {
      const savedPreview = sessionStorage.getItem(DEV_PREVIEW_STORAGE_KEY);
      if (savedPreview === "free" || savedPreview === "pro") {
        setDevPreviewMode(savedPreview);
      }
    } catch {
      // ignore sessionStorage errors
    }
  }, []);

  useEffect(() => {
    const email = (user?.userEmail || "").trim().toLowerCase();
    if (!email) {
      setCatalogHasPro(false);
      return;
    }

    let active = true;
    fetch("/api/catalog", { cache: "no-store", credentials: "include" })
      .then((res) => (res.ok ? res.json() : null))
      .then(
        (
          data: {
            ausbildungProUnlocked?: boolean;
            products?: Array<{ slug?: string; unlocked?: boolean }>;
          } | null,
        ) => {
          if (!active || !data) return;
          if (typeof data.ausbildungProUnlocked === "boolean") {
            setCatalogHasPro(data.ausbildungProUnlocked);
            return;
          }
          const unlocked = Array.isArray(data.products)
            ? data.products.some(
                (p) =>
                  p.unlocked &&
                  (p.slug === "ausbildung-os-pro" || p.slug === "ausbildung-os-fast-track"),
              )
            : false;
          setCatalogHasPro(unlocked);
        },
      )
      .catch(() => {
        // fallback cleanly to default lock state
      });

    return () => {
      active = false;
    };
  }, [user?.userEmail]);

  useEffect(() => {
    try {
      const saved = localStorage.getItem(REALITY_STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved) as { level?: GermanLevel; field?: TargetField };
        if (parsed.level && (GERMAN_LEVELS as readonly string[]).includes(parsed.level)) {
          setSelectedLevel(parsed.level);
        }
        if (parsed.field && (TARGET_FIELDS as readonly string[]).includes(parsed.field)) {
          setSelectedField(parsed.field);
        }
      }
    } catch {
      // ignore localStorage read errors
    } finally {
      setRealityHydrated(true);
    }
  }, []);

  useEffect(() => {
    if (!realityHydrated) return;
    try {
      localStorage.setItem(
        REALITY_STORAGE_KEY,
        JSON.stringify({ level: selectedLevel, field: selectedField }),
      );
    } catch {
      // ignore localStorage write errors
    }
  }, [selectedLevel, selectedField, realityHydrated]);

  useEffect(() => {
    let active = true;
    let unsubscribe: (() => void) | undefined;

    const syncAuthClaims = async (current: FirebaseUser | null) => {
      if (!current) {
        if (active) setIsAdminClaim(false);
        return;
      }
      try {
        const tokenResult = await current.getIdTokenResult();
        if (active) {
          setIsAdminClaim(
            Boolean(tokenResult?.claims?.admin === true || tokenResult?.claims?.role === "admin"),
          );
        }
      } catch {
        if (active) setIsAdminClaim(false);
      }
    };

    ensureFirebaseLocalPersistence()
      .then(async (auth) => {
        if (!active) return;
        if (typeof auth.authStateReady === "function") {
          await auth.authStateReady();
        }
        if (!active) return;
        setFbUid(auth.currentUser?.uid || null);
        setFbReady(true);
        void syncAuthClaims(auth.currentUser);
        unsubscribe = onAuthStateChanged(auth, (current) => {
          if (!active) return;
          setFbUid(current?.uid || null);
          setFbReady(true);
          void syncAuthClaims(current);
        });
      })
      .catch(() => {
        if (active) setFbReady(true);
      });

    return () => {
      active = false;
      if (unsubscribe) unsubscribe();
    };
  }, []);

  useEffect(() => {
    if (!fbReady || authLoading || !fbUid) {
      setFirestoreAusbildungPro(false);
      return;
    }

    let active = true;
    const db = getFirebaseFirestore();
    const entitlementRef = doc(db, "entitlements", sanitizeProgressUid(fbUid));

    Promise.race([
      getDoc(entitlementRef)
        .then((snap) => {
          if (!snap.exists()) return false;
          const d = snap.data() as { ausbildungPro?: boolean; unlockedSlugs?: unknown };
          if (d?.ausbildungPro === true) return true;
          return (
            Array.isArray(d?.unlockedSlugs) &&
            (d.unlockedSlugs.includes("ausbildung-os-pro") ||
              d.unlockedSlugs.includes("ausbildung-os-fast-track"))
          );
        })
        .catch(() => false),
      new Promise<boolean>((resolve) => setTimeout(() => resolve(false), 4000)),
    ])
      .then((hasPro) => {
        if (active) setFirestoreAusbildungPro(Boolean(hasPro));
      })
      .catch(() => {
        if (active) setFirestoreAusbildungPro(false);
      });

    return () => {
      active = false;
    };
  }, [fbReady, authLoading, fbUid]);

  const effectiveUid = useMemo(() => {
    if (fbUid) return sanitizeProgressUid(fbUid);
    return resolveProgressUid(user);
  }, [fbUid, user]);

  useEffect(() => {
    if (!fbReady || authLoading) return;
    let active = true;
    setLoadingChecklist(true);

    getUserProgressWithStatus(effectiveUid)
      .then(({ progress: prog, syncedToCloud }) => {
        if (!active) return;
        const steps = Array.isArray(prog.completedSteps) ? prog.completedSteps : [];
        latestStepsRef.current = steps;
        setCompletedSteps(steps);
        setSyncState(syncedToCloud ? "synced" : "local");
      })
      .catch(() => {
        if (active) setSyncState("local");
      })
      .finally(() => {
        if (active) setLoadingChecklist(false);
      });

    const onProgressUpdate = (ev: Event) => {
      const detail = (ev as CustomEvent<UserProgress>).detail;
      if (detail && detail.uid === effectiveUid) {
        const steps = Array.isArray(detail.completedSteps) ? detail.completedSteps : [];
        latestStepsRef.current = steps;
        setCompletedSteps(steps);
      }
    };

    window.addEventListener(USER_PROGRESS_EVENT, onProgressUpdate);
    return () => {
      active = false;
      window.removeEventListener(USER_PROGRESS_EVENT, onProgressUpdate);
    };
  }, [effectiveUid, fbReady, authLoading]);

  const handleToggleDocument = (stepId: string) => {
    if (loadingChecklist) return;

    const currentSteps = latestStepsRef.current;
    const isCurrentlyChecked = currentSteps.includes(stepId);
    const nextSteps = isCurrentlyChecked
      ? currentSteps.filter((id) => id !== stepId)
      : Array.from(new Set([...currentSteps, stepId]));

    latestStepsRef.current = nextSteps;
    setCompletedSteps(nextSteps);
    setSavingStepId(stepId);
    setSyncState("saving");

    saveQueueRef.current = saveQueueRef.current
      .then(async () => {
        const { syncedToCloud } = await updateUserProgressWithStatus(effectiveUid, {
          completedSteps: nextSteps,
        });
        setSyncState(syncedToCloud ? "synced" : "local");
      })
      .catch(() => {
        setSyncState("local");
      })
      .finally(() => {
        setSavingStepId((prev) => (prev === stepId ? null : prev));
      });
  };

  const completedSet = useMemo(() => new Set(completedSteps), [completedSteps]);
  const readyCount = useMemo(
    () => DOCUMENT_CHECKLIST.filter((item) => completedSet.has(item.stepId)).length,
    [completedSet],
  );
  const totalCount = DOCUMENT_CHECKLIST.length;
  const readinessPercent = Math.round((readyCount / totalCount) * 100);
  const isApplyReady = selectedLevel === "B1" || selectedLevel === "B2";

  const filteredRules = useMemo(
    () =>
      activeRuleCategory === "All"
        ? AUSBILDUNG_RULES_2026
        : AUSBILDUNG_RULES_2026.filter((rule) => rule.category === activeRuleCategory),
    [activeRuleCategory],
  );

  const isAdminUser = isAdminClaim || user?.role === "admin";
  const isSignedInUser = Boolean(fbUid || isAuthenticated);
  const showDevPreviewToggle = process.env.NODE_ENV === "development" || isAdminUser;
  const hasRealPro =
    isAdminUser || (isSignedInUser && (firestoreAusbildungPro || catalogHasPro));
  const isProUnlocked =
    showDevPreviewToggle && devPreviewMode !== null ? devPreviewMode === "pro" : hasRealPro;

  const handleToggleDevPreview = () => {
    const nextMode: "free" | "pro" = isProUnlocked ? "free" : "pro";
    setDevPreviewMode(nextMode);
    try {
      sessionStorage.setItem(DEV_PREVIEW_STORAGE_KEY, nextMode);
    } catch {
      // ignore sessionStorage errors
    }
  };

  return (
    <div
      id="ausbildung-os-page"
      className="relative min-h-screen flex flex-col bg-[#051329] text-white overflow-x-hidden"
    >
      <Navbar />

      {/* Ambient Dark-Gold Backdrop */}
      <div
        className="no-print ausbildung-print-hide pointer-events-none fixed inset-0 bmw-mesh-grid opacity-20"
        aria-hidden="true"
      />
      <div
        className="no-print ausbildung-print-hide pointer-events-none fixed inset-x-0 top-0 h-[440px] bg-[radial-gradient(ellipse_at_top,rgba(255,209,102,0.14),transparent_65%)]"
        aria-hidden="true"
      />

      <main id="ausbildung-os-main" className="relative z-10 flex-1 pb-28 lg:pb-16">
        <div
          id="ausbildung-os-container"
          className="mx-auto max-w-4xl px-4 sm:px-6 pt-8 sm:pt-12 space-y-6"
        >
          {/* Dark-Gold Header Card */}
          <section className="no-print ausbildung-print-hide relative overflow-hidden rounded-3xl border border-[#FFD166]/25 bg-gradient-to-br from-[#0A1628] via-[#0F2747] to-[#0D1017] p-6 sm:p-8 shadow-[0_24px_70px_rgba(0,0,0,0.55)]">
            <div
              className="pointer-events-none absolute -top-20 -right-16 h-64 w-64 rounded-full bg-[#FFD166]/10 blur-3xl"
              aria-hidden="true"
            />

            <div className="relative z-10 flex flex-col sm:flex-row sm:items-start justify-between gap-4">
              <div className="space-y-2.5">
                <div className="inline-flex items-center gap-2 rounded-full border border-[#FFD166]/35 bg-[#FFD166]/10 px-3.5 py-1 text-[11px] font-bold uppercase tracking-[0.2em] text-[#FFD166]">
                  <Sparkles className="h-3.5 w-3.5 text-[#FFD166]" />
                  <span>Ausbildung OS · Isolated Module</span>
                </div>

                <h1 className="text-2xl sm:text-4xl font-bold tracking-tight text-white">
                  Document Readiness Checklist
                </h1>

                <p className="max-w-xl text-xs sm:text-sm text-slate-300 leading-relaxed">
                  Verify your core German Ausbildung dossier documents below. Every check is synced directly to your Cloud Firestore profile.
                </p>
              </div>

              {/* Firestore Sync Indicator */}
              <div className="shrink-0 flex flex-col items-start sm:items-end gap-2">
                <span className="inline-flex items-center gap-1.5 rounded-full border border-[#FFD166]/30 bg-[#07090E]/70 px-3 py-1.5 text-[11px] font-semibold text-[#FFD166]">
                  {syncState === "saving" ? (
                    <>
                      <Loader2 className="h-3.5 w-3.5 animate-spin text-[#FFD166]" />
                      <span>Saving to Firestore…</span>
                    </>
                  ) : syncState === "synced" ? (
                    <>
                      <Database className="h-3.5 w-3.5 text-emerald-400" />
                      <span className="text-emerald-300">Firestore Synced</span>
                    </>
                  ) : (
                    <>
                      <Database className="h-3.5 w-3.5 text-amber-300" />
                      <span className="text-amber-200">Saved Locally</span>
                    </>
                  )}
                </span>

                {!isAuthenticated && (
                  <Link
                    href="/login?next=%2Fausbildung-os"
                    className="text-[11px] font-semibold text-[#FFD166]/90 hover:text-[#FFD166] underline underline-offset-4 transition"
                  >
                    Sign in to sync across devices
                  </Link>
                )}

                {showDevPreviewToggle && (
                  <button
                    type="button"
                    onClick={handleToggleDevPreview}
                    className="inline-flex items-center gap-1.5 rounded-full border border-[#FFD166]/45 bg-[#0A1628]/90 px-3 py-1 text-[10px] font-bold uppercase tracking-wider text-[#FFD166] hover:bg-[#FFD166] hover:text-[#0A1628] transition-colors cursor-pointer"
                  >
                    <Eye className="h-3 w-3" />
                    <span>
                      Dev Preview: Free / Pro ({isProUnlocked ? "PRO" : "FREE"})
                    </span>
                  </button>
                )}
              </div>
            </div>

            {/* Readiness Progress Bar */}
            <div className="relative z-10 mt-6 pt-5 border-t border-white/10 space-y-2.5">
              <div className="flex items-center justify-between text-xs font-bold">
                <span className="uppercase tracking-[0.16em] text-slate-300">
                  Dossier Readiness Progress
                </span>
                <span className="font-mono text-sm text-[#FFD166]">
                  {readyCount} / {totalCount} Ready ({readinessPercent}%)
                </span>
              </div>
              <div className="h-3 w-full overflow-hidden rounded-full border border-[#FFD166]/20 bg-[#07090E]/90 p-0.5">
                <div
                  className="h-full rounded-full bg-gradient-to-r from-[#B45309] via-[#F59E0B] to-[#FFD166] transition-all duration-500 shadow-[0_0_16px_rgba(255,209,102,0.4)]"
                  style={{ width: `${Math.max(readinessPercent, 4)}%` }}
                />
              </div>
            </div>
          </section>

          {/* Checklist Card */}
          <section className="no-print ausbildung-print-hide rounded-3xl border border-white/10 bg-[#0D1017]/90 p-5 sm:p-7 backdrop-blur-xl shadow-[0_24px_80px_rgba(0,0,0,0.6)] space-y-4">
            <div className="flex items-center justify-between border-b border-white/10 pb-3.5">
              <div className="flex items-center gap-2.5">
                <div className="flex h-9 w-9 items-center justify-center rounded-xl border border-[#FFD166]/35 bg-[#FFD166]/10 text-[#FFD166]">
                  <ClipboardCheck className="h-5 w-5" />
                </div>
                <div>
                  <h2 className="text-base sm:text-lg font-bold text-white">
                    Required Documents
                  </h2>
                  <p className="text-[11px] text-slate-400">
                    Tap any document to toggle readiness status
                  </p>
                </div>
              </div>

              {readyCount === totalCount && !loadingChecklist && (
                <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-400/40 bg-emerald-500/15 px-3 py-1 text-[11px] font-bold uppercase tracking-wider text-emerald-300">
                  <CheckCircle2 className="h-3.5 w-3.5" />
                  <span>All 4 Ready</span>
                </span>
              )}
            </div>

            {loadingChecklist ? (
              <div className="flex items-center justify-center gap-3 py-12 text-sm text-slate-300">
                <Loader2 className="h-5 w-5 animate-spin text-[#FFD166]" />
                <span>Loading checklist from Firestore…</span>
              </div>
            ) : (
              <div className="space-y-3">
                {DOCUMENT_CHECKLIST.map((item, idx) => {
                  const isChecked = completedSet.has(item.stepId);
                  const isSavingThis = savingStepId === item.stepId;
                  const Icon = item.icon;

                  return (
                    <button
                      key={item.id}
                      type="button"
                      role="checkbox"
                      aria-checked={isChecked}
                      onClick={() => handleToggleDocument(item.stepId)}
                      className={`group w-full text-left flex items-center justify-between gap-4 rounded-2xl border p-4 sm:p-5 transition-all duration-200 cursor-pointer ${
                        isChecked
                          ? "border-[#FFD166]/60 bg-gradient-to-r from-[#FFD166]/15 via-[#0A1628] to-[#0D1017] shadow-[0_0_24px_-6px_rgba(255,209,102,0.28)]"
                          : "border-white/10 bg-[#0A1628]/70 hover:border-[#FFD166]/35 hover:bg-[#0A1628]"
                      }`}
                    >
                      <div className="flex items-start sm:items-center gap-3.5 sm:gap-4 min-w-0">
                        {/* Custom Gold Checkbox */}
                        <span
                          className={`mt-0.5 sm:mt-0 flex h-6 w-6 shrink-0 items-center justify-center rounded-lg border transition-colors ${
                            isChecked
                              ? "border-[#FFD166] bg-[#FFD166] text-[#0A1628] shadow-sm"
                              : "border-[#FFD166]/40 bg-[#051329] text-transparent group-hover:border-[#FFD166]"
                          }`}
                        >
                          {isSavingThis ? (
                            <Loader2 className="h-3.5 w-3.5 animate-spin text-[#0A1628]" />
                          ) : (
                            <Check className="h-4 w-4 stroke-[3]" />
                          )}
                        </span>

                        <div className="min-w-0 space-y-1">
                          <div className="flex flex-wrap items-center gap-2">
                            <span className="text-[10px] font-mono font-bold uppercase tracking-[0.16em] text-[#FFD166]/80">
                              0{idx + 1} · {item.tag}
                            </span>
                          </div>
                          <p
                            className={`text-sm sm:text-base font-bold tracking-tight transition-colors ${
                              isChecked ? "text-[#FFD166]" : "text-white"
                            }`}
                          >
                            {item.title}
                          </p>
                          <p className="text-xs text-slate-400 leading-relaxed">
                            {item.subtitle}
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center gap-2.5 shrink-0">
                        <span
                          className={`hidden sm:inline-flex items-center rounded-full border px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-[0.14em] ${
                            isChecked
                              ? "border-[#FFD166]/45 bg-[#FFD166]/15 text-[#FFD166]"
                              : "border-white/10 bg-white/5 text-slate-400"
                          }`}
                        >
                          {isChecked ? "Ready" : "Pending"}
                        </span>
                        <div
                          className={`flex h-9 w-9 items-center justify-center rounded-xl border transition-colors ${
                            isChecked
                              ? "border-[#FFD166]/40 bg-[#FFD166]/15 text-[#FFD166]"
                              : "border-white/10 bg-white/[0.04] text-slate-400 group-hover:text-[#FFD166]"
                          }`}
                        >
                          <Icon className="h-4 w-4" />
                        </div>
                      </div>
                    </button>
                  );
                })}
              </div>
            )}
          </section>

          {/* Language & Field Reality Check Card */}
          <section className="no-print ausbildung-print-hide rounded-3xl border border-white/10 bg-[#0D1017]/90 p-5 sm:p-7 backdrop-blur-xl shadow-[0_24px_80px_rgba(0,0,0,0.6)] space-y-5">
            <div className="flex flex-wrap items-start justify-between gap-3 border-b border-white/10 pb-4">
              <div className="flex items-center gap-2.5">
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-[#FFD166]/35 bg-[#FFD166]/10 text-[#FFD166]">
                  <Briefcase className="h-5 w-5" />
                </div>
                <div>
                  <h2 className="text-base sm:text-lg font-bold text-white">
                    Language &amp; Field Reality Check
                  </h2>
                  <p className="text-[11px] text-slate-400">
                    Select your current CEFR German level and target Ausbildung sector
                  </p>
                </div>
              </div>

              {isApplyReady && (
                <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-400/45 bg-emerald-500/15 px-3.5 py-1 text-xs font-bold uppercase tracking-wider text-emerald-300">
                  <CheckCircle2 className="h-3.5 w-3.5 text-emerald-400" />
                  <span>Apply-Ready</span>
                </span>
              )}
            </div>

            <div className="space-y-4">
              <div className="space-y-2">
                <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-slate-300">
                  Current German Level
                </p>
                <div className="grid grid-cols-5 gap-2">
                  {GERMAN_LEVELS.map((level) => {
                    const active = selectedLevel === level;
                    return (
                      <button
                        key={level}
                        type="button"
                        aria-pressed={active}
                        onClick={() => setSelectedLevel(level)}
                        className={`rounded-xl border py-2.5 px-2 text-xs sm:text-sm transition-all cursor-pointer ${
                          active
                            ? "border-[#FFD166] bg-[#FFD166] text-[#0A1628] font-extrabold shadow-[0_0_18px_-4px_rgba(255,209,102,0.55)]"
                            : "border-white/10 bg-[#0A1628]/75 text-slate-300 font-semibold hover:border-[#FFD166]/40 hover:text-white"
                        }`}
                      >
                        {level}
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="space-y-2">
                <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-slate-300">
                  Target Ausbildung Field
                </p>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                  {TARGET_FIELDS.map((field) => {
                    const active = selectedField === field;
                    return (
                      <button
                        key={field}
                        type="button"
                        aria-pressed={active}
                        onClick={() => setSelectedField(field)}
                        className={`rounded-xl border py-2.5 px-3 text-xs sm:text-sm transition-all cursor-pointer ${
                          active
                            ? "border-[#FFD166]/70 bg-gradient-to-r from-[#FFD166]/20 via-[#0A1628] to-[#0D1017] text-[#FFD166] font-bold shadow-[0_0_18px_-6px_rgba(255,209,102,0.35)]"
                            : "border-white/10 bg-[#0A1628]/75 text-slate-300 font-semibold hover:border-[#FFD166]/40 hover:text-white"
                        }`}
                      >
                        {field}
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>

            {!isApplyReady ? (
              <div className="rounded-2xl border border-[#FFD166]/55 bg-gradient-to-br from-[#FFD166]/15 via-[#0A1628] to-[#07090E] p-5 shadow-[0_0_28px_-8px_rgba(255,209,102,0.35)] flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="flex items-start gap-3.5 min-w-0">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-[#FFD166]/45 bg-[#FFD166]/15 text-[#FFD166]">
                    <AlertTriangle className="h-5 w-5" />
                  </div>
                  <div className="space-y-1 min-w-0">
                    <p className="text-sm sm:text-base font-bold text-[#FFD166]">
                      Minimum B1/B2 required for German HR
                    </p>
                    <p className="text-xs text-slate-300 leading-relaxed">
                      With current level{" "}
                      <span className="font-semibold text-white">{selectedLevel}</span>, German{" "}
                      <span className="font-semibold text-white">{selectedField}</span> employers,
                      IHK chambers, and § 16a visa officers require certified B1 (and B2 for most
                      clinical Nursing hospitals) before issuing an Ausbildungsvertrag.
                    </p>
                  </div>
                </div>

                <Link
                  href="/academy"
                  className="shrink-0 inline-flex items-center justify-center gap-2 rounded-xl bg-[#FFD166] px-4 py-3 text-xs font-extrabold uppercase tracking-[0.14em] text-[#0A1628] shadow-lg transition hover:bg-amber-300"
                >
                  <Headphones className="h-4 w-4 text-[#0A1628]" />
                  <span>German Courses &amp; Audio Labs</span>
                  <ArrowRight className="h-3.5 w-3.5 text-[#0A1628]" />
                </Link>
              </div>
            ) : (
              <div className="rounded-2xl border border-emerald-400/40 bg-gradient-to-r from-emerald-500/15 via-[#0A1628] to-[#0D1017] p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="space-y-1.5 min-w-0">
                  <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-400/50 bg-emerald-500/20 px-3 py-0.5 text-[11px] font-bold uppercase tracking-wider text-emerald-300">
                    <CheckCircle2 className="h-3.5 w-3.5 text-emerald-400" />
                    <span>Apply-Ready</span>
                  </span>
                  <p className="text-xs sm:text-sm text-slate-200 leading-relaxed">
                    Your <span className="font-bold text-white">{selectedLevel}</span> German level
                    meets the baseline German HR screening threshold for{" "}
                    <span className="font-bold text-[#FFD166]">{selectedField}</span> interviews.
                    {selectedField === "Nursing" && selectedLevel === "B1"
                      ? " Note: Completing B2 Pflege further unlocks direct public hospital tariffs."
                      : ""}
                  </p>
                </div>

                <Link
                  href="/academy"
                  className="shrink-0 inline-flex items-center justify-center gap-2 rounded-xl border border-emerald-400/40 bg-emerald-500/15 px-4 py-2.5 text-xs font-bold uppercase tracking-[0.12em] text-emerald-200 hover:bg-emerald-500/25 transition"
                >
                  <span>Keep Training</span>
                  <ArrowRight className="h-3.5 w-3.5" />
                </Link>
              </div>
            )}
          </section>

          {/* Live Germany Ausbildung Rules (2026) Section */}
          <section className="no-print ausbildung-print-hide rounded-3xl border border-white/10 bg-[#0D1017]/90 p-5 sm:p-7 backdrop-blur-xl shadow-[0_24px_80px_rgba(0,0,0,0.6)] space-y-5">
            <div className="space-y-1">
              <p className="text-[11px] font-bold uppercase tracking-[0.2em] text-[#FFD166]">
                Statutory Reference · 2026
              </p>
              <h2 className="text-lg sm:text-xl font-bold text-white">
                Live Germany Ausbildung Rules (2026)
              </h2>
              <p className="text-xs text-slate-400">
                Federal regulations verified against official German government and statutory portals
              </p>
            </div>

            {/* Category Filter Tabs */}
            <div
              role="tablist"
              aria-label="Ausbildung rule categories"
              className="flex flex-wrap items-center gap-2 border-b border-white/10 pb-4"
            >
              {RULE_CATEGORIES.map((category) => {
                const active = activeRuleCategory === category;
                return (
                  <button
                    key={category}
                    type="button"
                    role="tab"
                    aria-selected={active}
                    onClick={() => setActiveRuleCategory(category)}
                    className={`rounded-xl border px-3.5 py-1.5 text-xs transition-all cursor-pointer ${
                      active
                        ? "border-[#FFD166] bg-[#FFD166] text-[#0A1628] font-extrabold shadow-xs"
                        : "border-white/10 bg-[#0A1628]/75 text-slate-300 font-semibold hover:border-[#FFD166]/40 hover:text-[#FFD166]"
                    }`}
                  >
                    {category}
                  </button>
                );
              })}
            </div>

            {/* Rule Cards Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {filteredRules.map((rule) => (
                <article
                  key={rule.id}
                  className="rounded-2xl border border-white/10 bg-[#0A1628]/75 p-5 flex flex-col justify-between gap-4 hover:border-[#FFD166]/40 transition-colors"
                >
                  <div className="space-y-3">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <span className="rounded-full border border-[#FFD166]/35 bg-[#FFD166]/10 px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-[0.14em] text-[#FFD166]">
                        {rule.category}
                      </span>
                      <span className="inline-flex items-center gap-1 rounded-full border border-emerald-400/30 bg-emerald-500/10 px-2.5 py-0.5 text-[10px] font-semibold text-emerald-300">
                        <ShieldCheck className="h-3 w-3 text-emerald-400" />
                        <span>{rule.lastVerified}</span>
                      </span>
                    </div>

                    <div className="space-y-1.5">
                      <h3 className="text-base font-bold text-white leading-snug">
                        {rule.title}
                      </h3>
                      <p className="text-xs font-mono font-bold text-[#FFD166]">
                        {rule.highlight}
                      </p>
                      <p className="text-xs text-slate-300 leading-relaxed">
                        {rule.summary}
                      </p>
                    </div>
                  </div>

                  <div className="pt-3 border-t border-white/10 flex items-center justify-between gap-3">
                    <span className="text-[11px] font-medium text-slate-400 truncate">
                      {rule.authority}
                    </span>
                    <a
                      href={rule.sourceUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="shrink-0 inline-flex items-center gap-1.5 rounded-xl border border-[#FFD166]/40 bg-[#FFD166]/10 px-3 py-1.5 text-[11px] font-bold uppercase tracking-[0.12em] text-[#FFD166] hover:bg-[#FFD166] hover:text-[#0A1628] transition-colors"
                    >
                      <span>Official Source</span>
                      <ExternalLink className="h-3.5 w-3.5" />
                    </a>
                  </div>
                </article>
              ))}
            </div>
          </section>

          {/* Pro Tier Gate: Bewerbungsmappe Builder + Application & Interview Tracker */}
          <ProGateOverlay
            isProUnlocked={isProUnlocked}
            userEmail={user?.userEmail}
            userName={user?.fullName}
          >
            <BewerbungsmappeBuilder
              germanLevel={selectedLevel}
              targetField={selectedField}
              defaultFullName={user?.fullName || ""}
              defaultEmail={user?.userEmail || ""}
              defaultPhone={user?.phone || ""}
              isLocked={!isProUnlocked}
            />
            <ApplicationTracker defaultTargetField={selectedField} />
          </ProGateOverlay>
        </div>
      </main>

      <footer className="no-print ausbildung-print-hide relative z-10 border-t border-white/10 bg-[#07090E]/90 py-6 pb-24 lg:pb-6 px-4 sm:px-8">
        <div className="mx-auto max-w-4xl flex flex-col sm:flex-row items-center justify-between gap-2 text-xs text-slate-400">
          <span className="font-semibold text-white">
            {BRAND.name} · Ausbildung OS
          </span>
          <span className="text-[11px] text-[#FFD166]/80">
            Berlin HQ · Stored in Cloud Firestore
          </span>
        </div>
      </footer>

      <BottomNavigationBar />
    </div>
  );
}
