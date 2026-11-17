"use client";

import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import {
  AudioLines,
  Award,
  CheckCircle2,
  CloudUpload,
  Database,
  ExternalLink,
  Eye,
  FileUp,
  FolderGit2,
  HardDrive,
  KeyRound,
  LayoutDashboard,
  Loader2,
  Lock,
  LogOut,
  Play,
  RefreshCw,
  ShieldCheck,
  Sparkles,
  Unlock,
  Users,
  Volume2,
} from "lucide-react";
import { BRAND, LEVELS, type Level } from "@/lib/config";
import type { Product, ProductType } from "@/lib/types";

interface AudioTrackItem {
  filename: string;
  sizeBytes: number;
  createdAt: string;
  level: string;
  moduleType: "hoeren" | "sprechen" | "radio";
  driveSyncStatus: string;
  drivePath: string;
}

interface StudentExamAttempt {
  id: string;
  testId: string;
  level: string;
  lesenScore: number;
  hoerenScore: number;
  schreibenScore: number;
  sprechenScore: number;
  overallPercent: number;
  passed: boolean;
  createdAt: string;
}

interface AdminStudentItem {
  email: string;
  fullName: string;
  phone: string;
  targetLevel: Level;
  createdAt: string;
  unlockedPacks: Array<{
    slug: string;
    title: string;
    provider: string;
    unlockedAt: string;
  }>;
  examAttempts: StudentExamAttempt[];
}

interface AdminOverviewData {
  ok: boolean;
  integrations: {
    drive: boolean;
    supabase: boolean;
    ai: string;
    whisper: boolean;
  };
  vaultStatus: {
    mode: string;
    vaultRootName: string;
    mappedPathsCount: number;
  };
  products: Product[];
  audioFiles: AudioTrackItem[];
  students: AdminStudentItem[];
}

const SESSION_PWD_KEY = "gtf_founder_admin_pwd";

export default function FounderAdminPortalPage() {
  const [adminPassword, setAdminPassword] = useState("");
  const [authenticated, setAuthenticated] = useState(false);
  const [authError, setAuthError] = useState<string | null>(null);
  const [verifying, setVerifying] = useState(false);

  const [activeTab, setActiveTab] = useState<"uploader" | "audio" | "students">("uploader");
  const [overview, setOverview] = useState<AdminOverviewData | null>(null);
  const [loadingOverview, setLoadingOverview] = useState(false);
  const [toast, setToast] = useState<string | null>(null);

  // Tab 1: PDF & Exam Uploader state
  const [selectedPdf, setSelectedPdf] = useState<File | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [uploadLevel, setUploadLevel] = useState<Level>("b1");
  const [uploadType, setUploadType] = useState<ProductType>("mock_test");
  const [uploadTitle, setUploadTitle] = useState("");
  const [uploadDesc, setUploadDesc] = useState("");
  const [priceInr, setPriceInr] = useState("2499");
  const [priceEur, setPriceEur] = useState("29");
  const [publishingPdf, setPublishingPdf] = useState(false);
  const [publishLog, setPublishLog] = useState<string[]>([]);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  // Tab 2: Audio Factory Control state
  const [runningFactory, setRunningFactory] = useState(false);
  const [factoryLog, setFactoryLog] = useState<string | null>(null);
  const [pushingTrack, setPushingTrack] = useState<string | null>(null);

  // Tab 3: Students & Manual Unlock state
  const [manualEmail, setManualEmail] = useState("");
  const [manualName, setManualName] = useState("");
  const [manualPhone, setManualPhone] = useState("+91 ");
  const [manualSlug, setManualSlug] = useState("b1-pro-pack-5");
  const manualRef = "";
  const [unlockingStudentKey, setUnlockingStudentKey] = useState<string | null>(null);

  // Google Drive "A2 to B1" Auto-Sync state
  const [syncingDriveFolder, setSyncingDriveFolder] = useState(false);
  const [driveFolderLog, setDriveFolderLog] = useState<string | null>(null);
  const [driveFolderResult, setDriveFolderResult] = useState<{
    ok?: boolean;
    folderName?: string;
    mode?: string;
    discoveredFiles?: string[];
    processedA2Pdf?: string;
    pagesExtracted?: number;
    generatedAudio?: string[];
    interactiveExamId?: string;
    examTitle?: string;
    catalogUpdated?: boolean;
    timestamp?: string;
  } | null>(null);

  const showToast = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(null), 5000);
  };

  const fetchOverview = useCallback(async (pwd: string) => {
    setLoadingOverview(true);
    setAuthError(null);
    try {
      const res = await fetch("/api/admin/overview", {
        headers: { "x-admin-password": pwd },
      });
      if (res.status === 401) {
        setAuthenticated(false);
        setAuthError("Invalid ADMIN_SECRET_PASSWORD. Check your .env.local file.");
        sessionStorage.removeItem(SESSION_PWD_KEY);
        return false;
      }
      if (!res.ok) {
        setAuthError("Failed to load Founder Admin overview.");
        return false;
      }
      const data = (await res.json()) as AdminOverviewData;
      setOverview(data);
      setAuthenticated(true);
      sessionStorage.setItem(SESSION_PWD_KEY, pwd);
      return true;
    } catch {
      setAuthError("Network error while connecting to /api/admin/overview.");
      return false;
    } finally {
      setLoadingOverview(false);
    }
  }, []);

  useEffect(() => {
    const saved = sessionStorage.getItem(SESSION_PWD_KEY);
    if (saved) {
      setAdminPassword(saved);
      fetchOverview(saved);
    }
  }, [fetchOverview]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!adminPassword.trim()) return;
    setVerifying(true);
    await fetchOverview(adminPassword.trim());
    setVerifying(false);
  };

  const handleLogout = () => {
    sessionStorage.removeItem(SESSION_PWD_KEY);
    setAuthenticated(false);
    setOverview(null);
    setAdminPassword("");
  };

  // ── Tab 1: Upload PDF & Publish to 5TB Drive + Supabase ──────────────────
  const handlePublishPdf = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedPdf) {
      showToast("Please drag and drop or choose a raw A1/A2/B1/B2 PDF file first.");
      return;
    }

    setPublishingPdf(true);
    setPublishLog([
      `Uploading "${selectedPdf.name}" (${Math.round(selectedPdf.size / 1024)} KB) to /content-factory/raw_pdfs_input/...`,
      "Extracting German exercises & synthesizing 128kbps neural Hören/Sprechen MP3s...",
    ]);

    try {
      const formData = new FormData();
      formData.append("pdf", selectedPdf);
      formData.append("level", uploadLevel);
      formData.append("productType", uploadType);
      formData.append("priceInr", priceInr);
      formData.append("priceEur", priceEur);
      if (uploadTitle.trim()) formData.append("title", uploadTitle.trim());
      if (uploadDesc.trim()) formData.append("description", uploadDesc.trim());

      const res = await fetch("/api/admin/upload-pdf", {
        method: "POST",
        headers: { "x-admin-password": adminPassword },
        body: formData,
      });

      const data = await res.json();
      if (!res.ok) {
        setPublishLog([`❌ Error: ${data.error || "Upload failed"}`]);
        return;
      }

      setPublishLog(data.steps || ["✔ Published to 5TB Google Drive Vault & Supabase"]);
      showToast(`Published "${data.product?.title}" to 5TB Drive & Store!`);
      setSelectedPdf(null);
      setUploadTitle("");
      setUploadDesc("");
      await fetchOverview(adminPassword);
    } finally {
      setPublishingPdf(false);
    }
  };

  // ── Tab 2: Trigger run_factory.py & Push MP3s to 5TB Drive ───────────────
  const handleRunAudioFactory = async (
    mode: "--test-run" | "--convert-pdfs" | "--harvest-radio" | "--full-cycle",
  ) => {
    setRunningFactory(true);
    setFactoryLog(`Executing: python content-factory/run_factory.py ${mode} ...`);
    try {
      const res = await fetch("/api/admin/audio-factory", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-admin-password": adminPassword,
        },
        body: JSON.stringify({ action: "run_factory", mode }),
      });
      const data = await res.json();
      if (res.ok) {
        setFactoryLog(data.log || "Completed run_factory.py successfully.");
        showToast(
          `Audio Factory complete! ${data.generatedCount} MP3 track(s) ready in /content-factory/output_test/.`,
        );
        await fetchOverview(adminPassword);
      } else {
        setFactoryLog(`Error: ${data.error}`);
      }
    } finally {
      setRunningFactory(false);
    }
  };

  const handlePushMp3ToDrive = async (filename: string) => {
    setPushingTrack(filename);
    try {
      const res = await fetch("/api/admin/audio-factory", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-admin-password": adminPassword,
        },
        body: JSON.stringify({ action: "push_to_drive", filename }),
      });
      const data = await res.json();
      if (res.ok) {
        showToast(
          `Pushed ${data.pushedCount} track(s) to 5TB Google Drive Vault (/GTF_App_Vault/)!`,
        );
        await fetchOverview(adminPassword);
      }
    } finally {
      setPushingTrack(null);
    }
  };

  // ── Drive Ingestion: Sync 'A2 to B1' Drive Folder ────────────────────────
  const handleSyncA2ToB1Drive = async () => {
    setSyncingDriveFolder(true);
    setDriveFolderLog("Connecting to Google Drive API & scanning folder 'A2 to B1'...\nExtracting German exercises & synthesizing Hören/Sprechen MP3s...");
    try {
      const res = await fetch("/api/admin/sync-drive-folder", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-admin-password": adminPassword,
        },
        body: JSON.stringify({ folderName: "A2 to B1" }),
      });
      const data = await res.json();
      if (res.ok) {
        setDriveFolderResult(data.result || null);
        setDriveFolderLog(data.log || "Successfully synced and published!");
        showToast("✔ Synced 'A2 to B1' Drive folder & published live A2/B1 materials!");
        await fetchOverview(adminPassword);
      } else {
        setDriveFolderLog(`Error: ${data.error}\n${data.log || ""}`);
        showToast(`Drive Sync Error: ${data.error || "Sync failed"}`);
      }
    } catch (err) {
      setDriveFolderLog(`Network error: ${err instanceof Error ? err.message : String(err)}`);
    } finally {
      setSyncingDriveFolder(false);
    }
  };

  // ── Tab 3: 1-Click Manual Unlock & n8n WhatsApp Trigger ──────────────────
  const triggerManualUnlock = async (params: {
    email: string;
    fullName?: string;
    phone?: string;
    productSlug: string;
    paymentReference?: string;
  }) => {
    const key = `${params.email}:${params.productSlug}`;
    setUnlockingStudentKey(key);
    try {
      const res = await fetch("/api/admin/manual-unlock", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-admin-password": adminPassword,
        },
        body: JSON.stringify(params),
      });
      const data = await res.json();
      if (res.ok) {
        const waStatus = data.n8nWebhook?.triggered
          ? "n8n WhatsApp dispatched"
          : "Unlocked in DB (n8n webhook ready)";
        showToast(
          `Unlocked "${data.unlocked?.productTitle}" for ${params.email} (${waStatus})!`,
        );
        await fetchOverview(adminPassword);
      } else {
        showToast(`Error: ${data.error || "Unlock failed"}`);
      }
    } finally {
      setUnlockingStudentKey(null);
    }
  };

  // ── Password Gate Screen ─────────────────────────────────────────────────
  if (!authenticated) {
    return (
      <div className="min-h-screen flex flex-col justify-between bg-gradient-to-br from-slate-950 via-gtf-dark to-gtf-primary text-white">
        <header className="mx-auto flex w-full max-w-6xl items-center justify-between px-6 py-5">
          <Link href="/dashboard" className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gtf-gold font-extrabold text-gtf-ink">
              GTF
            </div>
            <div>
              <p className="text-sm font-extrabold">{BRAND.name} — Founder Admin</p>
              <p className="text-xs text-amber-300">{BRAND.tagline}</p>
            </div>
          </Link>
          <Link
            href="/dashboard"
            className="inline-flex items-center gap-1.5 rounded-xl bg-white/10 px-3.5 py-2 text-xs font-semibold text-white hover:bg-white/20"
          >
            <LayoutDashboard className="h-3.5 w-3.5" />
            <span>Back to Student Dashboard</span>
          </Link>
        </header>

        <main className="mx-auto w-full max-w-md px-4 py-12">
          <div className="rounded-3xl border border-white/15 bg-slate-900/85 p-7 shadow-2xl backdrop-blur-xl">
            <div className="inline-flex items-center gap-2 rounded-full bg-amber-400/15 px-3 py-1 text-xs font-bold text-gtf-gold">
              <ShieldCheck className="h-4 w-4" />
              <span>Berlin HQ Executive Control</span>
            </div>
            <h1 className="mt-3 text-2xl font-extrabold">Founder Admin Portal</h1>
            <p className="mt-1 text-xs text-slate-300">
              Protected by <code className="text-amber-300">ADMIN_SECRET_PASSWORD</code> in{" "}
              <code className="text-amber-300">.env.local</code>. Manage 5TB Google Drive
              uploads, 24/7 Audio Factory, and manual UPI/Bank student unlocks.
            </p>

            <form onSubmit={handleLogin} className="mt-6 space-y-4">
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-300">
                  Admin Secret Password
                </label>
                <div className="relative mt-1.5">
                  <Lock className="pointer-events-none absolute left-3.5 top-3 h-4 w-4 text-slate-400" />
                  <input
                    type="password"
                    value={adminPassword}
                    onChange={(e) => setAdminPassword(e.target.value)}
                    placeholder="Enter ADMIN_SECRET_PASSWORD..."
                    className="w-full rounded-xl border border-white/15 bg-slate-950/90 py-2.5 pl-10 pr-4 text-sm text-white placeholder-slate-500 focus:border-gtf-gold focus:outline-none"
                    required
                  />
                </div>
                <p className="mt-1.5 text-[11px] text-slate-400">
                  Default local password:{" "}
                  <button
                    type="button"
                    onClick={() => setAdminPassword("gtf-berlin-founder-2026")}
                    className="font-mono font-semibold text-amber-300 underline hover:text-amber-200"
                  >
                    gtf-berlin-founder-2026
                  </button>{" "}
                  (click to fill)
                </p>
              </div>

              {authError && (
                <div className="rounded-xl border border-rose-500/40 bg-rose-950/60 px-3.5 py-2.5 text-xs text-rose-200">
                  {authError}
                </div>
              )}

              <button
                type="submit"
                disabled={verifying}
                className="flex w-full items-center justify-center gap-2 rounded-xl bg-gtf-gold py-3 text-sm font-extrabold text-gtf-ink shadow-lg transition hover:bg-amber-300 disabled:opacity-60"
              >
                {verifying ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    <span>Verifying Berlin HQ Credentials…</span>
                  </>
                ) : (
                  <>
                    <KeyRound className="h-4 w-4" />
                    <span>Unlock Founder Admin Portal</span>
                  </>
                )}
              </button>
            </form>
          </div>
        </main>

        <footer className="py-5 text-center text-xs text-slate-400">
          {BRAND.name} ({BRAND.shortName}) · {BRAND.headquarters} · {BRAND.supportPhone}
        </footer>
      </div>
    );
  }

  const paidProducts = (overview?.products || []).filter((p) => !p.isFree);

  return (
    <div className="min-h-screen flex flex-col bg-slate-50">
      {/* Top Executive Bar */}
      <header className="sticky top-0 z-40 border-b border-slate-800 bg-gtf-dark text-white shadow-md">
        <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-3 px-4 py-3.5 sm:px-6">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gtf-gold font-extrabold text-gtf-ink">
              GTF
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-base font-extrabold">
                  Founder Admin Command Center
                </span>
                <span className="rounded-full bg-emerald-500/20 px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider text-emerald-300">
                  Ashutosh Sharma &amp; Sarbjit Kour
                </span>
              </div>
              <p className="text-xs text-amber-300">
                5TB Google Drive Vault · 24/7 Audio Factory · Dual INR/EUR Store &amp; n8n CRM
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <Link
              href="/admin/company-status"
              className="inline-flex items-center gap-1.5 rounded-xl border border-amber-400/60 bg-gradient-to-r from-amber-400 via-amber-500 to-amber-600 px-3.5 py-1.5 text-xs font-black text-slate-950 shadow-md hover:brightness-110 transition-all"
            >
              <ShieldCheck className="h-3.5 w-3.5 text-slate-950" />
              <span>👑 CEO Operations (16 EMP)</span>
            </Link>
            <button
              type="button"
              onClick={handleSyncA2ToB1Drive}
              disabled={syncingDriveFolder}
              className="inline-flex items-center gap-1.5 rounded-xl border border-emerald-400/50 bg-emerald-600/90 px-3.5 py-1.5 text-xs font-bold text-white shadow-sm hover:bg-emerald-500 disabled:opacity-50"
            >
              {syncingDriveFolder ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : (
                <CloudUpload className="h-3.5 w-3.5 text-emerald-200" />
              )}
              <span>Sync &apos;A2 to B1&apos; Drive</span>
            </button>
            <button
              type="button"
              onClick={() => fetchOverview(adminPassword)}
              disabled={loadingOverview}
              className="inline-flex items-center gap-1.5 rounded-xl bg-white/10 px-3 py-1.5 text-xs font-semibold text-white hover:bg-white/20"
            >
              <RefreshCw
                className={`h-3.5 w-3.5 ${loadingOverview ? "animate-spin" : ""}`}
              />
              <span>Refresh</span>
            </button>
            <Link
              href="/setup"
              className="inline-flex items-center gap-1.5 rounded-xl bg-gtf-gold px-3.5 py-1.5 text-xs font-bold text-gtf-ink hover:bg-amber-300"
            >
              <Sparkles className="h-3.5 w-3.5" />
              <span>Setup &amp; 5TB Vault</span>
            </Link>
            <Link
              href="/dashboard"
              className="inline-flex items-center gap-1.5 rounded-xl bg-gtf-secondary px-3.5 py-1.5 text-xs font-bold text-white hover:opacity-95"
            >
              <LayoutDashboard className="h-3.5 w-3.5" />
              <span>Student Dashboard</span>
            </Link>
            <Link
              href="/website-preview"
              className="inline-flex items-center gap-1.5 rounded-xl border border-sky-400/40 bg-sky-600/80 px-3.5 py-1.5 text-xs font-bold text-white hover:bg-sky-500"
            >
              <Eye className="h-3.5 w-3.5" />
              <span>Website Preview</span>
            </Link>
            <button
              type="button"
              onClick={handleLogout}
              className="inline-flex items-center gap-1 rounded-xl border border-white/15 bg-white/5 px-3 py-1.5 text-xs text-slate-200 hover:bg-white/10"
            >
              <LogOut className="h-3.5 w-3.5" />
              <span>Lock</span>
            </button>
          </div>
        </div>
      </header>

      {toast && (
        <div className="fixed bottom-5 right-5 z-50 flex items-center gap-2 rounded-xl bg-emerald-700 px-4 py-3 text-xs font-bold text-white shadow-xl">
          <CheckCircle2 className="h-4 w-4 shrink-0" />
          <span>{toast}</span>
        </div>
      )}

      <main className="mx-auto w-full max-w-7xl flex-1 space-y-6 px-4 py-6 sm:px-6">
        {/* Infrastructure Status Strip */}
        <section className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
            <div className="flex items-center justify-between text-xs font-semibold text-slate-500">
              <span>5TB Google Drive Vault</span>
              <HardDrive className="h-4 w-4 text-gtf-primary" />
            </div>
            <p className="mt-1.5 text-sm font-extrabold text-slate-900">
              {overview?.integrations.drive
                ? "Live Service Account"
                : "Staged (29 Vault Paths Ready)"}
            </p>
            <p className="text-[11px] text-slate-500">
              Root: /{overview?.vaultStatus.vaultRootName || "GTF_App_Vault"}
            </p>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
            <div className="flex items-center justify-between text-xs font-semibold text-slate-500">
              <span>Audio Factory Tracks</span>
              <AudioLines className="h-4 w-4 text-gtf-secondary" />
            </div>
            <p className="mt-1.5 text-sm font-extrabold text-slate-900">
              {overview?.audioFiles.length || 0} MP3 Tracks (128kbps)
            </p>
            <p className="text-[11px] text-slate-500">
              /content-factory/output_test/
            </p>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
            <div className="flex items-center justify-between text-xs font-semibold text-slate-500">
              <span>Catalog Products</span>
              <Database className="h-4 w-4 text-gtf-accent" />
            </div>
            <p className="mt-1.5 text-sm font-extrabold text-slate-900">
              {overview?.products.length || 0} Active Packs
            </p>
            <p className="text-[11px] text-slate-500">
              Dual Pricing: ₹ INR + € EUR
            </p>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
            <div className="flex items-center justify-between text-xs font-semibold text-slate-500">
              <span>Registered Students</span>
              <Users className="h-4 w-4 text-emerald-600" />
            </div>
            <p className="mt-1.5 text-sm font-extrabold text-slate-900">
              {overview?.students.length || 0} Candidates
            </p>
            <p className="text-[11px] text-slate-500">
              n8n WhatsApp + Google Sheet CRM
            </p>
          </div>
        </section>

        {/* Prominent Google Drive "A2 to B1" Auto-Sync Banner */}
        <section className="relative overflow-hidden rounded-2xl border-2 border-emerald-400/40 bg-gradient-to-r from-emerald-950 via-slate-900 to-gtf-primary p-6 text-white shadow-xl">
          <div className="absolute right-0 top-0 -mt-10 -mr-10 h-48 w-48 rounded-full bg-emerald-500/10 blur-2xl" />
          <div className="relative z-10 flex flex-col md:flex-row md:items-center md:justify-between gap-5">
            <div className="space-y-1.5 max-w-2xl">
              <div className="inline-flex items-center gap-2 rounded-full border border-emerald-400/30 bg-emerald-500/20 px-3 py-1 text-xs font-bold text-emerald-300">
                <CloudUpload className="h-3.5 w-3.5" />
                <span>Phase 6 Direct Cloud Harvester · Google Drive &quot;A2 to B1&quot;</span>
              </div>
              <h2 className="text-xl sm:text-2xl font-black tracking-tight text-white">
                Sync &quot;A2 to B1&quot; Drive Folder Auto-Ingestion
              </h2>
              <p className="text-xs sm:text-sm text-slate-300">
                Reads all German PDFs, worksheets, and exercises inside your Google Drive <code className="rounded bg-black/40 px-1.5 py-0.5 font-mono text-emerald-300">&quot;A2 to B1&quot;</code> folder, runs PyMuPDF text &amp; exercise extraction, auto-generates native German <code className="rounded bg-black/40 px-1.5 py-0.5 font-mono text-amber-300">Hören</code> &amp; <code className="rounded bg-black/40 px-1.5 py-0.5 font-mono text-amber-300">Sprechen</code> MP3s with Edge Neural TTS (Katja &amp; Conrad), and publishes interactive exams straight to your live Student Dashboard under the <span className="font-bold text-amber-300">A2</span> and <span className="font-bold text-amber-300">B1</span> tabs.
              </p>
            </div>

            <div className="shrink-0 flex flex-col gap-2">
              <button
                type="button"
                onClick={handleSyncA2ToB1Drive}
                disabled={syncingDriveFolder}
                className="inline-flex items-center justify-center gap-2.5 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-400 px-6 py-3.5 text-sm font-extrabold text-slate-950 shadow-lg shadow-emerald-500/20 transition hover:from-emerald-400 hover:to-teal-300 hover:shadow-emerald-500/30 active:scale-[0.98] disabled:opacity-60"
              >
                {syncingDriveFolder ? (
                  <>
                    <Loader2 className="h-5 w-5 animate-spin" />
                    <span>Syncing &quot;A2 to B1&quot; Drive Folder...</span>
                  </>
                ) : (
                  <>
                    <CloudUpload className="h-5 w-5" />
                    <span>Sync &quot;A2 to B1&quot; Drive Folder Now</span>
                  </>
                )}
              </button>
              <span className="text-center text-[11px] text-slate-400">
                One-Click Auto-Ingestion &bull; Zero Manual Copying
              </span>
            </div>
          </div>

          {/* Sync Progress / Output Terminal */}
          {driveFolderLog && (
            <div className="mt-5 rounded-xl border border-white/15 bg-black/60 p-4 backdrop-blur-md">
              <div className="flex items-center justify-between border-b border-white/10 pb-2 text-xs font-semibold text-slate-400">
                <span className="flex items-center gap-1.5">
                  <span className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse" />
                  Drive Folder Ingestion Progress &amp; Audit Log
                </span>
                {driveFolderResult?.processedA2Pdf && (
                  <span className="text-emerald-300 font-bold">
                    ✔ Published: {driveFolderResult.processedA2Pdf}
                  </span>
                )}
              </div>
              <pre className="mt-2.5 max-h-48 overflow-y-auto font-mono text-[11px] leading-relaxed text-emerald-200/90 whitespace-pre-wrap">
                {driveFolderLog}
              </pre>
            </div>
          )}
        </section>

        {/* 3 Main Tabs */}
        <div className="flex flex-wrap gap-2 border-b border-slate-200 pb-3">
          <button
            type="button"
            onClick={() => setActiveTab("uploader")}
            className={`inline-flex items-center gap-2 rounded-xl px-4 py-2.5 text-xs font-bold transition sm:text-sm ${
              activeTab === "uploader"
                ? "bg-gtf-primary text-white shadow-sm"
                : "border border-slate-200 bg-white text-slate-700 hover:bg-slate-100"
            }`}
          >
            <FileUp className="h-4 w-4" />
            <span>Tab 1: PDF &amp; Exam Uploader</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab("audio")}
            className={`inline-flex items-center gap-2 rounded-xl px-4 py-2.5 text-xs font-bold transition sm:text-sm ${
              activeTab === "audio"
                ? "bg-gtf-primary text-white shadow-sm"
                : "border border-slate-200 bg-white text-slate-700 hover:bg-slate-100"
            }`}
          >
            <Volume2 className="h-4 w-4" />
            <span>Tab 2: Audio Factory Control ({overview?.audioFiles.length || 0})</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab("students")}
            className={`inline-flex items-center gap-2 rounded-xl px-4 py-2.5 text-xs font-bold transition sm:text-sm ${
              activeTab === "students"
                ? "bg-gtf-primary text-white shadow-sm"
                : "border border-slate-200 bg-white text-slate-700 hover:bg-slate-100"
            }`}
          >
            <Users className="h-4 w-4" />
            <span>Tab 3: Students &amp; Manual Unlock ({overview?.students.length || 0})</span>
          </button>
        </div>

        {/* ═══════════════════════════════════════════════════════════════════
            TAB 1: PDF & EXAM UPLOADER
           ═══════════════════════════════════════════════════════════════════ */}
        {activeTab === "uploader" && (
          <div className="grid gap-6 lg:grid-cols-12">
            <form
              onSubmit={handlePublishPdf}
              className="lg:col-span-7 space-y-5 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm"
            >
              <div>
                <h2 className="text-lg font-extrabold text-slate-900">
                  Raw PDF to Interactive Exam &amp; Workbook Publisher
                </h2>
                <p className="text-xs text-slate-500">
                  Drop any raw A1, A2, B1, or B2 PDF below. Our backend automatically
                  extracts reading/grammar items, generates missing 128kbps Hören &amp;
                  Sprechen MP3s via <code className="font-mono">/content-factory</code>,
                  watermarks the PDF, uploads to the 5TB Google Drive Vault, and lists the
                  product in Supabase.
                </p>
              </div>

              {/* Drag and Drop Zone */}
              <div
                onDragOver={(e) => {
                  e.preventDefault();
                  setIsDragging(true);
                }}
                onDragLeave={() => setIsDragging(false)}
                onDrop={(e) => {
                  e.preventDefault();
                  setIsDragging(false);
                  const file = e.dataTransfer.files?.[0];
                  if (file && file.name.toLowerCase().endsWith(".pdf")) {
                    setSelectedPdf(file);
                  } else {
                    showToast("Please drop a valid .pdf file.");
                  }
                }}
                onClick={() => fileInputRef.current?.click()}
                className={`cursor-pointer rounded-2xl border-2 border-dashed p-8 text-center transition ${
                  isDragging
                    ? "border-gtf-primary bg-sky-50"
                    : selectedPdf
                      ? "border-emerald-500 bg-emerald-50/40"
                      : "border-slate-300 bg-slate-50 hover:border-gtf-primary"
                }`}
              >
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="application/pdf,.pdf"
                  className="hidden"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) setSelectedPdf(file);
                  }}
                />
                <CloudUpload className="mx-auto h-10 w-10 text-gtf-primary" />
                {selectedPdf ? (
                  <div className="mt-2">
                    <p className="text-sm font-extrabold text-emerald-800">
                      Selected: {selectedPdf.name}
                    </p>
                    <p className="text-xs text-emerald-600">
                      {(selectedPdf.size / 1024).toFixed(1)} KB · Click to replace PDF
                    </p>
                  </div>
                ) : (
                  <div className="mt-2">
                    <p className="text-sm font-bold text-slate-800">
                      Drag &amp; drop your raw A1 / A2 / B1 / B2 PDF here, or click to browse
                    </p>
                    <p className="mt-1 text-xs text-slate-500">
                      Supports Goethe / telc practice sheets, grammar workbooks, and mock papers
                    </p>
                  </div>
                )}
              </div>

              {/* Level & Product Type Selectors */}
              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label className="block text-xs font-bold uppercase text-slate-600">
                    CEFR Level (A1 – B2)
                  </label>
                  <select
                    value={uploadLevel}
                    onChange={(e) => setUploadLevel(e.target.value as Level)}
                    className="mt-1 w-full rounded-xl border border-slate-300 bg-white px-3.5 py-2.5 text-sm font-semibold text-slate-900 focus:border-gtf-primary focus:outline-none"
                  >
                    {LEVELS.map((lvl) => (
                      <option key={lvl} value={lvl}>
                        Level {lvl.toUpperCase()} (Goethe / telc {lvl.toUpperCase()})
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold uppercase text-slate-600">
                    Product Type
                  </label>
                  <select
                    value={uploadType}
                    onChange={(e) => setUploadType(e.target.value as ProductType)}
                    className="mt-1 w-full rounded-xl border border-slate-300 bg-white px-3.5 py-2.5 text-sm font-semibold text-slate-900 focus:border-gtf-primary focus:outline-none"
                  >
                    <option value="mock_test">Mock Test (Lesen + Hören + Schreiben + Sprechen)</option>
                    <option value="pdf_workbook">PDF Workbook (DRM Reader + Answer Sheet)</option>
                    <option value="sprechen_pass">Sprechen Pass (Whisper v3 + Llama-3 Pass)</option>
                  </select>
                </div>
              </div>

              {/* Prices in INR & EUR */}
              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label className="block text-xs font-bold uppercase text-slate-600">
                    Price in INR (₹ — Razorpay UPI/Cards)
                  </label>
                  <input
                    type="number"
                    min="0"
                    step="1"
                    value={priceInr}
                    onChange={(e) => setPriceInr(e.target.value)}
                    className="mt-1 w-full rounded-xl border border-slate-300 px-3.5 py-2.5 text-sm font-bold text-slate-900 focus:border-gtf-primary focus:outline-none"
                    required
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold uppercase text-slate-600">
                    Price in EUR (€ — Stripe Europe/Intl)
                  </label>
                  <input
                    type="number"
                    min="0"
                    step="0.5"
                    value={priceEur}
                    onChange={(e) => setPriceEur(e.target.value)}
                    className="mt-1 w-full rounded-xl border border-slate-300 px-3.5 py-2.5 text-sm font-bold text-slate-900 focus:border-gtf-primary focus:outline-none"
                    required
                  />
                </div>
              </div>

              {/* Optional Title & Description */}
              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label className="block text-xs font-bold uppercase text-slate-600">
                    Product Title (Optional)
                  </label>
                  <input
                    type="text"
                    value={uploadTitle}
                    onChange={(e) => setUploadTitle(e.target.value)}
                    placeholder="Auto-generated from PDF filename if blank"
                    className="mt-1 w-full rounded-xl border border-slate-300 px-3.5 py-2 text-xs text-slate-900 focus:border-gtf-primary focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold uppercase text-slate-600">
                    Short Description (Optional)
                  </label>
                  <input
                    type="text"
                    value={uploadDesc}
                    onChange={(e) => setUploadDesc(e.target.value)}
                    placeholder="e.g. 5 B2 Pflege Simulations + Audio"
                    className="mt-1 w-full rounded-xl border border-slate-300 px-3.5 py-2 text-xs text-slate-900 focus:border-gtf-primary focus:outline-none"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={publishingPdf}
                className="flex w-full items-center justify-center gap-2 rounded-xl bg-gtf-primary py-3.5 text-sm font-extrabold text-white shadow-lg transition hover:bg-gtf-dark disabled:opacity-60"
              >
                {publishingPdf ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    <span>Processing PDF, Synthesizing Audio &amp; Syncing to 5TB Drive…</span>
                  </>
                ) : (
                  <>
                    <Sparkles className="h-4 w-4 text-gtf-gold" />
                    <span>Generate &amp; Publish to 5TB Drive</span>
                  </>
                )}
              </button>

              {publishLog.length > 0 && (
                <div className="rounded-xl bg-slate-900 p-4 text-xs font-mono text-emerald-300 space-y-1.5">
                  <p className="text-[11px] font-bold uppercase tracking-wider text-amber-300">
                    Content Factory Pipeline Output:
                  </p>
                  {publishLog.map((line, i) => (
                    <p key={i}>• {line}</p>
                  ))}
                </div>
              )}
            </form>

            {/* Right Column: Live Published Store Catalog */}
            <div className="lg:col-span-5 space-y-4 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-base font-extrabold text-slate-900">
                    Published Store Catalog ({overview?.products.length || 0})
                  </h3>
                  <p className="text-xs text-slate-500">
                    Synced with Supabase <code className="font-mono">products</code> &amp;
                    5TB Drive Vault
                  </p>
                </div>
                <FolderGit2 className="h-5 w-5 text-gtf-primary" />
              </div>

              <div className="max-h-[540px] space-y-2.5 overflow-y-auto pr-1">
                {(overview?.products || []).map((prod) => (
                  <div
                    key={prod.slug}
                    className="rounded-xl border border-slate-200 bg-slate-50/70 p-3.5"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span className="rounded bg-gtf-primary/10 px-2 py-0.5 text-[10px] font-extrabold uppercase text-gtf-primary">
                        {(prod.level || prod.track || "ALL").toUpperCase()} · {prod.type.replace("_", " ")}
                      </span>
                      <span className="text-xs font-extrabold text-slate-900">
                        {prod.isFree ? "FREE DEMO" : `₹${prod.priceInr} / €${prod.priceEur}`}
                      </span>
                    </div>
                    <p className="mt-1.5 text-xs font-bold text-slate-900">{prod.title}</p>
                    <p className="mt-0.5 text-[11px] text-slate-500 line-clamp-2">
                      {prod.description}
                    </p>
                    <p className="mt-1 font-mono text-[10px] text-slate-400">
                      slug: {prod.slug}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* ═══════════════════════════════════════════════════════════════════
            TAB 2: AUDIO FACTORY CONTROL
           ═══════════════════════════════════════════════════════════════════ */}
        {activeTab === "audio" && (
          <div className="space-y-6">
            <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
              <div className="flex flex-wrap items-center justify-between gap-4">
                <div>
                  <h2 className="text-lg font-extrabold text-slate-900">
                    24/7 German Synthetic Voice &amp; Radio Factory Control
                  </h2>
                  <p className="text-xs text-slate-500">
                    Trigger <code className="font-mono">/content-factory/run_factory.py</code>{" "}
                    using Microsoft Edge Neural Voices (<code className="font-mono">de-DE-KatjaNeural</code>,{" "}
                    <code className="font-mono">de-DE-ConradNeural</code>,{" "}
                    <code className="font-mono">de-DE-KillianNeural</code>) at 128kbps CBR MP3,
                    audition tracks in your browser, and push approved tracks to the 5TB Google
                    Drive Vault.
                  </p>
                </div>

                <div className="flex flex-wrap items-center gap-2">
                  <button
                    type="button"
                    disabled={runningFactory}
                    onClick={() => handleRunAudioFactory("--test-run")}
                    className="inline-flex items-center gap-2 rounded-xl bg-gtf-primary px-4 py-2.5 text-xs font-extrabold text-white shadow hover:bg-gtf-dark disabled:opacity-60"
                  >
                    {runningFactory ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Play className="h-4 w-4 text-gtf-gold" />
                    )}
                    <span>Trigger run_factory.py (--test-run)</span>
                  </button>

                  <button
                    type="button"
                    disabled={runningFactory}
                    onClick={() => handleRunAudioFactory("--convert-pdfs")}
                    className="inline-flex items-center gap-1.5 rounded-xl border border-slate-300 bg-white px-3.5 py-2.5 text-xs font-bold text-slate-800 hover:bg-slate-50 disabled:opacity-60"
                  >
                    <span>Convert Drop-Folder PDFs</span>
                  </button>

                  <button
                    type="button"
                    disabled={runningFactory}
                    onClick={() => handleRunAudioFactory("--harvest-radio")}
                    className="inline-flex items-center gap-1.5 rounded-xl border border-slate-300 bg-white px-3.5 py-2.5 text-xs font-bold text-slate-800 hover:bg-slate-50 disabled:opacity-60"
                  >
                    <span>Harvest DW/DLF Radio</span>
                  </button>

                  <button
                    type="button"
                    disabled={pushingTrack === "ALL"}
                    onClick={() => handlePushMp3ToDrive("ALL")}
                    className="inline-flex items-center gap-1.5 rounded-xl bg-emerald-600 px-4 py-2.5 text-xs font-extrabold text-white shadow hover:bg-emerald-700 disabled:opacity-60"
                  >
                    <CloudUpload className="h-4 w-4" />
                    <span>
                      {pushingTrack === "ALL"
                        ? "Pushing All to 5TB Vault…"
                        : "Push All Approved to 5TB Drive"}
                    </span>
                  </button>
                </div>
              </div>

              {factoryLog && (
                <pre className="mt-4 max-h-48 overflow-auto rounded-xl bg-slate-950 p-4 font-mono text-[11px] text-emerald-300">
                  {factoryLog}
                </pre>
              )}
            </div>

            {/* Generated MP3s Table & Browser Audio Player */}
            <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
              <h3 className="text-base font-extrabold text-slate-900">
                Generated MP3 Tracks in <code className="font-mono">/content-factory/output_test/</code>
              </h3>
              <p className="text-xs text-slate-500">
                Listen directly in the browser before pushing approved tracks to{" "}
                <code className="font-mono">/GTF_App_Vault/&lt;LEVEL&gt;/Hoeren_Audio</code> or{" "}
                <code className="font-mono">Sprechen_Prompts</code>.
              </p>

              <div className="mt-4 space-y-3">
                {(overview?.audioFiles || []).length === 0 ? (
                  <p className="py-6 text-center text-xs text-slate-500">
                    No MP3 files found yet. Click &ldquo;Trigger run_factory.py&rdquo; above to
                    synthesize tracks now.
                  </p>
                ) : (
                  (overview?.audioFiles || []).map((track) => {
                    const streamUrl = `/api/admin/audio-factory?stream=${encodeURIComponent(
                      track.filename,
                    )}&adminPassword=${encodeURIComponent(adminPassword)}`;
                    const isSynced = track.driveSyncStatus !== "local_ready";
                    return (
                      <div
                        key={track.filename}
                        className="flex flex-wrap items-center justify-between gap-4 rounded-xl border border-slate-200 bg-slate-50/70 p-4"
                      >
                        <div className="min-w-[240px] flex-1 space-y-1">
                          <div className="flex flex-wrap items-center gap-2">
                            <span className="rounded bg-gtf-primary px-2 py-0.5 text-[10px] font-extrabold uppercase text-white">
                              {track.level}
                            </span>
                            <span className="rounded bg-slate-200 px-2 py-0.5 text-[10px] font-bold uppercase text-slate-800">
                              {track.moduleType}
                            </span>
                            <span className="text-xs font-extrabold text-slate-900">
                              {track.filename}
                            </span>
                            <span className="text-[11px] text-slate-500">
                              ({(track.sizeBytes / 1024).toFixed(1)} KB · 128kbps)
                            </span>
                          </div>
                          <p className="font-mono text-[11px] text-slate-500">
                            Target Vault Path: /{track.drivePath}
                          </p>
                        </div>

                        <div className="flex flex-wrap items-center gap-3">
                          <audio
                            controls
                            preload="none"
                            playsInline
                            src={streamUrl}
                            className="h-9 w-64 sm:w-72"
                            onError={(e) => console.warn("[Admin Audio] Playback error:", e)}
                          />

                          <button
                            type="button"
                            disabled={pushingTrack === track.filename}
                            onClick={() => handlePushMp3ToDrive(track.filename)}
                            className={`inline-flex items-center gap-1.5 rounded-xl px-3.5 py-2 text-xs font-bold transition ${
                              isSynced
                                ? "border border-emerald-300 bg-emerald-50 text-emerald-800 hover:bg-emerald-100"
                                : "bg-gtf-secondary text-white hover:opacity-95"
                            }`}
                          >
                            <CloudUpload className="h-3.5 w-3.5" />
                            <span>
                              {pushingTrack === track.filename
                                ? "Pushing…"
                                : isSynced
                                  ? "Synced to 5TB Vault (Re-push)"
                                  : "Push to 5TB Drive"}
                            </span>
                          </button>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          </div>
        )}

        {/* ═══════════════════════════════════════════════════════════════════
            TAB 3: STUDENTS & MANUAL UNLOCK
           ═══════════════════════════════════════════════════════════════════ */}
        {activeTab === "students" && (
          <div className="space-y-6">
            {/* Manual UPI / Bank Transfer Unlock Form */}
            <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div>
                  <h2 className="text-lg font-extrabold text-slate-900">
                    1-Click Manual Pack Unlock (Direct UPI / Bank Transfer)
                  </h2>
                  <p className="text-xs text-slate-500">
                    Instantly unlock any A1 / A2 / B1 / B2 Exam Pack or PDF Workbook for a
                    student&apos;s email &amp; phone, log to Supabase, and trigger the n8n
                    WhatsApp welcome message with their login credentials.
                  </p>
                </div>
              </div>

              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  triggerManualUnlock({
                    email: manualEmail,
                    fullName: manualName,
                    phone: manualPhone,
                    productSlug: manualSlug,
                    paymentReference: manualRef || `UPI-DIRECT-${Date.now()}`,
                  });
                }}
                className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-5"
              >
                <input
                  type="email"
                  required
                  value={manualEmail}
                  onChange={(e) => setManualEmail(e.target.value)}
                  placeholder="student@email.com"
                  className="rounded-xl border border-slate-300 px-3.5 py-2.5 text-xs font-semibold text-slate-900 focus:border-gtf-primary focus:outline-none"
                />
                <input
                  type="text"
                  value={manualName}
                  onChange={(e) => setManualName(e.target.value)}
                  placeholder="Student Full Name"
                  className="rounded-xl border border-slate-300 px-3.5 py-2.5 text-xs text-slate-900 focus:border-gtf-primary focus:outline-none"
                />
                <input
                  type="tel"
                  value={manualPhone}
                  onChange={(e) => setManualPhone(e.target.value)}
                  placeholder="WhatsApp (+91 / +49)"
                  className="rounded-xl border border-slate-300 px-3.5 py-2.5 text-xs text-slate-900 focus:border-gtf-primary focus:outline-none"
                />
                <select
                  value={manualSlug}
                  onChange={(e) => setManualSlug(e.target.value)}
                  className="rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-xs font-bold text-slate-900 focus:border-gtf-primary focus:outline-none"
                >
                  {paidProducts.map((p) => (
                    <option key={p.slug} value={p.slug}>
                      [{(p.level || p.track || "ALL").toUpperCase()}] {p.title} (₹{p.priceInr} / €{p.priceEur})
                    </option>
                  ))}
                </select>
                <button
                  type="submit"
                  disabled={Boolean(unlockingStudentKey)}
                  className="inline-flex items-center justify-center gap-1.5 rounded-xl bg-emerald-600 px-4 py-2.5 text-xs font-extrabold text-white shadow hover:bg-emerald-700 disabled:opacity-60"
                >
                  <Unlock className="h-4 w-4" />
                  <span>Unlock &amp; Send WhatsApp</span>
                </button>
              </form>
            </div>

            {/* Registered Students & Mock Test Scores Table */}
            <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
              <h3 className="text-base font-extrabold text-slate-900">
                Registered Students, Mock Test Scores &amp; Instant 1-Click Unlocks
              </h3>
              <p className="text-xs text-slate-500">
                Click any pack button on a student&apos;s row to unlock it immediately.
              </p>

              <div className="mt-4 space-y-4">
                {(overview?.students || []).map((stu) => {
                  const latestAttempt = stu.examAttempts[0];
                  const unlockedSlugs = new Set(stu.unlockedPacks.map((u) => u.slug));
                  return (
                    <div
                      key={stu.email}
                      className="rounded-2xl border border-slate-200 bg-slate-50/60 p-4"
                    >
                      <div className="flex flex-wrap items-start justify-between gap-4">
                        <div>
                          <div className="flex flex-wrap items-center gap-2">
                            <span className="rounded-md bg-gtf-primary px-2 py-0.5 text-[10px] font-extrabold uppercase text-white">
                              Target {stu.targetLevel.toUpperCase()}
                            </span>
                            <h4 className="text-sm font-extrabold text-slate-900">
                              {stu.fullName}
                            </h4>
                            <span className="text-xs font-semibold text-slate-600">
                              ({stu.email})
                            </span>
                            <span className="text-xs text-emerald-700 font-medium">
                              📱 {stu.phone}
                            </span>
                          </div>

                          {/* Unlocked Packs Badges */}
                          <div className="mt-2 flex flex-wrap items-center gap-1.5">
                            <span className="text-[11px] font-semibold text-slate-500">
                              Unlocked Packs:
                            </span>
                            {stu.unlockedPacks.length === 0 ? (
                              <span className="text-[11px] text-slate-400">
                                Free Demo Packs Only
                              </span>
                            ) : (
                              stu.unlockedPacks.map((up) => (
                                <span
                                  key={up.slug}
                                  className="inline-flex items-center gap-1 rounded-full bg-emerald-100 px-2.5 py-0.5 text-[11px] font-bold text-emerald-800"
                                >
                                  <CheckCircle2 className="h-3 w-3" />
                                  {up.slug}
                                </span>
                              ))
                            )}
                          </div>
                        </div>

                        {/* Latest Mock Exam Score Pill */}
                        {latestAttempt && (
                          <div className="flex flex-wrap items-center gap-2 rounded-xl border border-slate-200 bg-white px-3.5 py-2 shadow-sm">
                            <Award
                              className={`h-4 w-4 ${
                                latestAttempt.passed ? "text-emerald-600" : "text-amber-600"
                              }`}
                            />
                            <div className="text-xs">
                              <span className="font-bold text-slate-900">
                                {latestAttempt.level.toUpperCase()} Overall:{" "}
                                {latestAttempt.overallPercent}%
                              </span>
                              <span className="ml-2 text-[11px] text-slate-500">
                                (L: {latestAttempt.lesenScore}% · H: {latestAttempt.hoerenScore}% ·
                                Schr: {latestAttempt.schreibenScore}% · Spr:{" "}
                                {latestAttempt.sprechenScore}%)
                              </span>
                            </div>
                          </div>
                        )}
                      </div>

                      {/* 1-Click Quick Unlock Buttons for A2 / B1 / B2 Packs */}
                      <div className="mt-3 flex flex-wrap items-center gap-2 border-t border-slate-200/80 pt-3">
                        <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
                          1-Click Manual Unlock:
                        </span>
                        {[
                          { slug: "a2-pro-pack-5", label: "Unlock A2 Pack" },
                          { slug: "b1-pro-pack-5", label: "Unlock B1 Intensiv Pack" },
                          { slug: "b2-pflege-pack-5", label: "Unlock B2 Pflege Pack" },
                          { slug: "wb-a2-alltag-beruf", label: "Unlock A2 Workbook" },
                          { slug: "wb-b1-pruefungstraining", label: "Unlock B1 Workbook" },
                          { slug: "wb-b2-pflege-beruf", label: "Unlock B2 Workbook" },
                        ].map((btn) => {
                          const alreadyUnlocked = unlockedSlugs.has(btn.slug);
                          const busyKey = `${stu.email}:${btn.slug}`;
                          return (
                            <button
                              key={btn.slug}
                              type="button"
                              disabled={alreadyUnlocked || unlockingStudentKey === busyKey}
                              onClick={() =>
                                triggerManualUnlock({
                                  email: stu.email,
                                  fullName: stu.fullName,
                                  phone: stu.phone,
                                  productSlug: btn.slug,
                                })
                              }
                              className={`inline-flex items-center gap-1 rounded-lg px-2.5 py-1.5 text-xs font-bold transition ${
                                alreadyUnlocked
                                  ? "bg-emerald-100 text-emerald-800 cursor-default"
                                  : "bg-gtf-primary text-white hover:bg-gtf-dark"
                              }`}
                            >
                              {alreadyUnlocked ? (
                                <>
                                  <CheckCircle2 className="h-3 w-3" />
                                  <span>{btn.label.replace("Unlock ", "")} Active</span>
                                </>
                              ) : (
                                <>
                                  <Unlock className="h-3 w-3" />
                                  <span>
                                    {unlockingStudentKey === busyKey
                                      ? "Unlocking…"
                                      : `+ ${btn.label}`}
                                  </span>
                                </>
                              )}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        )}
      </main>

      <footer className="border-t border-slate-200 bg-white py-5 text-xs text-slate-600">
        <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-4 px-4 sm:px-6">
          <p className="font-bold text-slate-900">
            {BRAND.name} ({BRAND.shortName}) — {BRAND.headquarters}
          </p>
          <div className="flex items-center gap-4">
            <a
              href={BRAND.website}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 font-semibold text-gtf-primary hover:underline"
            >
              <span>{BRAND.website}</span>
              <ExternalLink className="h-3 w-3" />
            </a>
            <span>Support: {BRAND.supportPhone}</span>
          </div>
        </div>
      </footer>
    </div>
  );
}
