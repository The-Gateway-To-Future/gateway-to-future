"use client";

import Link from "next/link";
import { useEffect, useState, useCallback } from "react";
import {
  AlertTriangle,
  ArrowRight,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  Clipboard,
  ClipboardCheck,
  Cloud,
  Cpu,
  Database,
  ExternalLink,
  FileCode2,
  FolderSync,
  Lock,
  RefreshCw,
  Save,
  ShieldCheck,
  Sparkles,
  UploadCloud,
  XCircle,
} from "lucide-react";
import { BRAND } from "@/lib/config";

interface ProbeResult {
  ok: boolean;
  status: "live" | "offline";
  detail?: string;
  reason?: string;
}

interface SetupData {
  ok: boolean;
  isProduction: boolean;
  config: {
    googleClientEmail: string;
    googleDriveRootFolderId: string;
    hasPrivateKey: boolean;
    groqApiKeyMasked: string;
    geminiApiKeyMasked: string;
    supabaseUrl: string;
    supabaseAnonKeyMasked: string;
    supabaseServiceRoleKeyMasked: string;
    adminSecretPassword: string;
  };
  probes: {
    drive: ProbeResult;
    groq: ProbeResult;
    gemini: ProbeResult;
    supabase: ProbeResult;
  };
  vaultStatus: {
    mode: string;
    vaultRootName: string;
    mappedPathsCount: number;
    generatedAt?: string;
  };
  hasAudio: boolean;
  schemaSql: string;
}

export default function SetupWizardPage() {
  const [data, setData] = useState<SetupData | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saveSuccessMsg, setSaveSuccessMsg] = useState<string | null>(null);
  const [saveErrorMsg, setSaveErrorMsg] = useState<string | null>(null);
  const [copiedSchema, setCopiedSchema] = useState(false);
  const [showSchemaPreview, setShowSchemaPreview] = useState(false);

  // Form fields
  const [clientEmail, setClientEmail] = useState("");
  const [privateKey, setPrivateKey] = useState("");
  const [jsonFileName, setJsonFileName] = useState<string | null>(null);
  const [driveFolderInput, setDriveFolderInput] = useState("");
  const [groqKey, setGroqKey] = useState("");
  const [geminiKey, setGeminiKey] = useState("");
  const [supabaseUrl, setSupabaseUrl] = useState("");
  const [supabaseAnonKey, setSupabaseAnonKey] = useState("");
  const [supabaseServiceKey, setSupabaseServiceKey] = useState("");
  const [adminPassword, setAdminPassword] = useState("");
  const [dragActive, setDragActive] = useState(false);

  const fetchStatus = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/setup/configure");
      if (res.ok) {
        const json: SetupData = await res.json();
        setData(json);
        if (json.config) {
          setClientEmail(json.config.googleClientEmail || "");
          setDriveFolderInput(json.config.googleDriveRootFolderId || "");
          setSupabaseUrl(json.config.supabaseUrl || "");
          setAdminPassword(json.config.adminSecretPassword || "gtf-berlin-founder-2026");
        }
      }
    } catch (err) {
      console.error("Failed to load setup status:", err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchStatus();
  }, [fetchStatus]);

  // Clean and parse Google Drive folder input on change
  const handleDriveFolderChange = (val: string) => {
    setDriveFolderInput(val);
  };

  // Drag and Drop Service Account JSON parser
  const handleJsonDrop = (files: FileList | null) => {
    if (!files || files.length === 0) return;
    const file = files[0];
    if (!file.name.endsWith(".json")) {
      alert("Please drop a valid Google Cloud Service Account .json file.");
      return;
    }

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const raw = e.target?.result as string;
        const parsed = JSON.parse(raw);

        if (parsed.client_email && parsed.private_key) {
          setClientEmail(parsed.client_email);
          setPrivateKey(parsed.private_key);
          setJsonFileName(`${file.name} (${parsed.project_id || "GCP Service Account"})`);
          setSaveSuccessMsg(`Loaded Service Account for "${parsed.client_email}"`);
        } else {
          alert("JSON does not contain client_email or private_key fields.");
        }
      } catch {
        alert("Failed to parse JSON file. Please ensure it is valid.");
      }
    };
    reader.readAsText(file);
  };

  // Copy SQL Schema to clipboard
  const handleCopySchema = async () => {
    if (!data?.schemaSql) return;
    try {
      await navigator.clipboard.writeText(data.schemaSql);
      setCopiedSchema(true);
      setTimeout(() => setCopiedSchema(false), 3000);
    } catch {
      // fallback
      const ta = document.createElement("textarea");
      ta.value = data.schemaSql;
      document.body.appendChild(ta);
      ta.select();
      document.execCommand("copy");
      document.body.removeChild(ta);
      setCopiedSchema(true);
      setTimeout(() => setCopiedSchema(false), 3000);
    }
  };

  // Save configuration and trigger Vault initialization
  const handleSaveAndInitialize = async () => {
    setSaving(true);
    setSaveSuccessMsg(null);
    setSaveErrorMsg(null);

    try {
      const payload: Record<string, string | boolean> = {
        runDriveInit: true,
      };

      if (clientEmail.trim()) payload.googleClientEmail = clientEmail.trim();
      if (privateKey.trim()) payload.googlePrivateKey = privateKey.trim();
      if (driveFolderInput.trim()) payload.googleDriveRootFolderId = driveFolderInput.trim();
      if (groqKey.trim()) payload.groqApiKey = groqKey.trim();
      if (geminiKey.trim()) payload.geminiApiKey = geminiKey.trim();
      if (supabaseUrl.trim()) payload.supabaseUrl = supabaseUrl.trim();
      if (supabaseAnonKey.trim()) payload.supabaseAnonKey = supabaseAnonKey.trim();
      if (supabaseServiceKey.trim()) payload.supabaseServiceRoleKey = supabaseServiceKey.trim();
      if (adminPassword.trim()) payload.adminSecretPassword = adminPassword.trim();

      const res = await fetch("/api/setup/configure", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const result = await res.json();
      if (!res.ok || !result.ok) {
        throw new Error(result.error || "Failed to save configuration");
      }

      setSaveSuccessMsg("Settings saved to .env.local! 5TB Vault verified.");
      // Refresh status to get fresh probes
      await fetchStatus();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Error saving configuration";
      setSaveErrorMsg(msg);
    } finally {
      setSaving(false);
    }
  };

  if (!loading && data?.isProduction) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-900 px-4 text-white">
        <div className="max-w-md rounded-2xl border border-red-500/30 bg-red-950/40 p-8 text-center shadow-2xl backdrop-blur-md">
          <AlertTriangle className="mx-auto h-12 w-12 text-red-400" />
          <h1 className="mt-4 text-2xl font-bold">Setup Disabled in Production</h1>
          <p className="mt-2 text-sm text-slate-300">
            For security, this setup engine is only accessible in local development environments.
          </p>
          <Link
            href="/dashboard"
            className="mt-6 inline-flex items-center gap-2 rounded-xl bg-slate-800 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-slate-700"
          >
            Go to Dashboard <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-950 via-slate-900 to-slate-950 text-slate-100">
      {/* Top Header */}
      <header className="sticky top-0 z-40 border-b border-slate-800/80 bg-slate-950/90 backdrop-blur-md">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-3.5 sm:px-6">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-gtf-gold to-amber-500 font-extrabold text-slate-950 shadow-md">
              <Sparkles className="h-5 w-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-base font-extrabold tracking-tight text-white">
                  {BRAND.name}
                </span>
                <span className="rounded-full bg-emerald-500/20 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-emerald-300">
                  Visual Setup & Vault Engine
                </span>
              </div>
              <p className="text-xs font-medium text-amber-300/90">
                Zero-Friction Local Activation Wizard
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 sm:gap-3">
            <Link
              href="/dashboard"
              className="rounded-lg bg-slate-800/80 px-3.5 py-1.5 text-xs font-semibold text-slate-200 transition hover:bg-slate-700 hover:text-white"
            >
              Student Dashboard
            </Link>
            <Link
              href="/admin"
              className="rounded-lg bg-amber-500/20 px-3.5 py-1.5 text-xs font-semibold text-amber-300 transition hover:bg-amber-500/30"
            >
              Founder Admin
            </Link>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        {/* Banner / Title */}
        <div className="mb-8 rounded-2xl border border-slate-800 bg-gradient-to-r from-slate-900 via-slate-900/90 to-slate-950 p-6 shadow-xl sm:p-8">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <span className="inline-flex items-center gap-1.5 rounded-full bg-amber-400/10 px-3 py-1 text-xs font-semibold text-amber-400">
                <ShieldCheck className="h-3.5 w-3.5" /> Berlin Scalability Protocol
              </span>
              <h1 className="mt-2 text-2xl font-extrabold tracking-tight text-white sm:text-3xl">
                Visual Cloud & Environment Configurator
              </h1>
              <p className="mt-1.5 max-w-2xl text-sm text-slate-400">
                Configure your 5TB Google Drive Vault, Groq/Gemini AI keys, and Supabase database
                without ever formatting <code className="rounded bg-slate-800 px-1.5 py-0.5 text-amber-300">.env.local</code> manually.
              </p>
            </div>

            <button
              onClick={fetchStatus}
              disabled={loading}
              className="inline-flex items-center gap-2 self-start rounded-xl border border-slate-700 bg-slate-800/90 px-4 py-2.5 text-xs font-semibold text-slate-200 transition hover:bg-slate-700 active:scale-95"
            >
              <RefreshCw className={`h-3.5 w-3.5 ${loading ? "animate-spin" : ""}`} />
              Refresh Cloud Probes
            </button>
          </div>

          {/* Quick Real-Time Status Cards */}
          <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-4 sm:gap-4">
            {/* Drive Probe */}
            <div
              className={`rounded-xl border p-3.5 transition ${
                data?.probes.drive.ok
                  ? "border-emerald-500/30 bg-emerald-950/20"
                  : "border-slate-800 bg-slate-900/60"
              }`}
            >
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-slate-400">5TB Drive Vault</span>
                {data?.probes.drive.ok ? (
                  <CheckCircle2 className="h-4 w-4 text-emerald-400" />
                ) : (
                  <Cloud className="h-4 w-4 text-slate-500" />
                )}
              </div>
              <p
                className={`mt-1.5 text-sm font-bold ${
                  data?.probes.drive.ok ? "text-emerald-400" : "text-amber-400/90"
                }`}
              >
                {data?.probes.drive.ok ? "Live Connected" : "Pending Keys"}
              </p>
              <p className="mt-0.5 truncate text-[11px] text-slate-400">
                {data?.vaultStatus?.mappedPathsCount || 29} paths mapped
              </p>
            </div>

            {/* Groq AI Probe */}
            <div
              className={`rounded-xl border p-3.5 transition ${
                data?.probes.groq.ok
                  ? "border-emerald-500/30 bg-emerald-950/20"
                  : "border-slate-800 bg-slate-900/60"
              }`}
            >
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-slate-400">Groq AI (Whisper/Llama)</span>
                {data?.probes.groq.ok ? (
                  <CheckCircle2 className="h-4 w-4 text-emerald-400" />
                ) : (
                  <Cpu className="h-4 w-4 text-slate-500" />
                )}
              </div>
              <p
                className={`mt-1.5 text-sm font-bold ${
                  data?.probes.groq.ok ? "text-emerald-400" : "text-slate-400"
                }`}
              >
                {data?.probes.groq.ok ? "Live & Ready" : "Offline Heuristic"}
              </p>
              <p className="mt-0.5 truncate text-[11px] text-slate-400">
                {data?.probes.groq.ok ? "Whisper v3 active" : "Auto-evaluation mode"}
              </p>
            </div>

            {/* Gemini AI Probe */}
            <div
              className={`rounded-xl border p-3.5 transition ${
                data?.probes.gemini.ok
                  ? "border-emerald-500/30 bg-emerald-950/20"
                  : "border-slate-800 bg-slate-900/60"
              }`}
            >
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-slate-400">Gemini 2.5 Flash</span>
                {data?.probes.gemini.ok ? (
                  <CheckCircle2 className="h-4 w-4 text-emerald-400" />
                ) : (
                  <Sparkles className="h-4 w-4 text-slate-500" />
                )}
              </div>
              <p
                className={`mt-1.5 text-sm font-bold ${
                  data?.probes.gemini.ok ? "text-emerald-400" : "text-slate-400"
                }`}
              >
                {data?.probes.gemini.ok ? "Live Connected" : "Fallback Mode"}
              </p>
              <p className="mt-0.5 truncate text-[11px] text-slate-400">
                {data?.probes.gemini.ok ? "Multimodal engine" : "Rules engine active"}
              </p>
            </div>

            {/* Supabase DB Probe */}
            <div
              className={`rounded-xl border p-3.5 transition ${
                data?.probes.supabase.ok
                  ? "border-emerald-500/30 bg-emerald-950/20"
                  : "border-slate-800 bg-slate-900/60"
              }`}
            >
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-slate-400">Supabase DB</span>
                {data?.probes.supabase.ok ? (
                  <CheckCircle2 className="h-4 w-4 text-emerald-400" />
                ) : (
                  <Database className="h-4 w-4 text-slate-500" />
                )}
              </div>
              <p
                className={`mt-1.5 text-sm font-bold ${
                  data?.probes.supabase.ok ? "text-emerald-400" : "text-amber-400/90"
                }`}
              >
                {data?.probes.supabase.ok ? "PostgreSQL Live" : ".local-store JSON"}
              </p>
              <p className="mt-0.5 truncate text-[11px] text-slate-400">
                {data?.probes.supabase.ok ? "RLS enabled" : "Zero-crash offline mode"}
              </p>
            </div>
          </div>
        </div>

        {/* Success / Error Banners */}
        {saveSuccessMsg && (
          <div className="mb-6 flex items-center gap-3 rounded-xl border border-emerald-500/30 bg-emerald-950/40 p-4 text-emerald-300 shadow-md">
            <CheckCircle2 className="h-5 w-5 flex-shrink-0 text-emerald-400" />
            <p className="text-sm font-medium">{saveSuccessMsg}</p>
          </div>
        )}

        {saveErrorMsg && (
          <div className="mb-6 flex items-center gap-3 rounded-xl border border-red-500/30 bg-red-950/40 p-4 text-red-300 shadow-md">
            <XCircle className="h-5 w-5 flex-shrink-0 text-red-400" />
            <p className="text-sm font-medium">{saveErrorMsg}</p>
          </div>
        )}

        <div className="grid grid-cols-1 gap-8 lg:grid-cols-12">
          {/* Main Configuration Forms (8 Cols) */}
          <div className="space-y-6 lg:col-span-8">
            {/* SECTION 1: Google Cloud Service Account & 5TB Drive Vault */}
            <div className="rounded-2xl border border-slate-800 bg-slate-900/80 p-6 shadow-lg backdrop-blur-sm sm:p-7">
              <div className="flex items-center gap-3">
                <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-blue-500/20 text-blue-400">
                  <Cloud className="h-5 w-5" />
                </div>
                <div>
                  <h2 className="text-lg font-bold text-white">
                    1. 5TB Google Drive Vault & Service Account
                  </h2>
                  <p className="text-xs text-slate-400">
                    Stream encrypted German listening audio & secure workbooks without quota limits.
                  </p>
                </div>
              </div>

              {/* Drag-and-Drop Zone */}
              <div className="mt-5">
                <label className="mb-2 block text-xs font-semibold uppercase tracking-wider text-slate-300">
                  Drag & Drop Service Account Key JSON
                </label>
                <div
                  onDragOver={(e) => {
                    e.preventDefault();
                    setDragActive(true);
                  }}
                  onDragLeave={() => setDragActive(false)}
                  onDrop={(e) => {
                    e.preventDefault();
                    setDragActive(false);
                    handleJsonDrop(e.dataTransfer.files);
                  }}
                  className={`relative flex flex-col items-center justify-center rounded-xl border-2 border-dashed p-6 text-center transition ${
                    dragActive
                      ? "border-amber-400 bg-amber-400/10"
                      : "border-slate-700 bg-slate-950/50 hover:border-slate-600"
                  }`}
                >
                  <UploadCloud className="h-9 w-9 text-slate-400" />
                  <p className="mt-2 text-sm font-medium text-slate-200">
                    Drop your Google Service Account <code className="text-amber-300">.json</code> file here
                  </p>
                  <p className="mt-1 text-xs text-slate-400">
                    Auto-escapes private keys and newlines with zero formatting headaches.
                  </p>
                  <input
                    type="file"
                    accept=".json"
                    onChange={(e) => handleJsonDrop(e.target.files)}
                    className="absolute inset-0 cursor-pointer opacity-0"
                  />
                  {jsonFileName && (
                    <div className="mt-3 inline-flex items-center gap-2 rounded-lg bg-emerald-500/20 px-3 py-1 text-xs font-semibold text-emerald-300">
                      <CheckCircle2 className="h-3.5 w-3.5" />
                      Loaded: {jsonFileName}
                    </div>
                  )}
                </div>
              </div>

              {/* Service Account Email & Root Folder */}
              <div className="mt-5 grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div>
                  <label className="mb-1.5 block text-xs font-semibold text-slate-300">
                    GOOGLE_CLIENT_EMAIL
                  </label>
                  <input
                    type="email"
                    value={clientEmail}
                    onChange={(e) => setClientEmail(e.target.value)}
                    placeholder="gtf-vault@project.iam.gserviceaccount.com"
                    className="w-full rounded-xl border border-slate-700 bg-slate-950 px-3.5 py-2.5 text-xs font-mono text-slate-200 placeholder-slate-600 focus:border-amber-400 focus:outline-none focus:ring-1 focus:ring-amber-400"
                  />
                </div>

                <div>
                  <label className="mb-1.5 flex items-center justify-between text-xs font-semibold text-slate-300">
                    <span>GOOGLE_DRIVE_ROOT_FOLDER_ID</span>
                    <span className="text-[11px] font-normal text-amber-400">URL or raw ID</span>
                  </label>
                  <input
                    type="text"
                    value={driveFolderInput}
                    onChange={(e) => handleDriveFolderChange(e.target.value)}
                    placeholder="https://drive.google.com/drive/folders/1aBcDeF... or raw ID"
                    className="w-full rounded-xl border border-slate-700 bg-slate-950 px-3.5 py-2.5 text-xs font-mono text-slate-200 placeholder-slate-600 focus:border-amber-400 focus:outline-none focus:ring-1 focus:ring-amber-400"
                  />
                </div>
              </div>

              {/* Optional Manual Private Key override */}
              <div className="mt-4">
                <details className="text-xs text-slate-400">
                  <summary className="cursor-pointer font-medium hover:text-slate-300">
                    {data?.config.hasPrivateKey
                      ? "✔ Google RSA Private Key is configured (click to inspect/replace)"
                      : "Paste Google Private Key manually (optional)"}
                  </summary>
                  <div className="mt-2.5">
                    <textarea
                      rows={3}
                      value={privateKey}
                      onChange={(e) => setPrivateKey(e.target.value)}
                      placeholder="-----BEGIN PRIVATE KEY-----\nMIIEvgIBADANBgkqhkiG9w0BAQEFAASCBKgwgg..."
                      className="w-full rounded-xl border border-slate-700 bg-slate-950 p-3 font-mono text-xs text-slate-200 placeholder-slate-600 focus:border-amber-400 focus:outline-none"
                    />
                  </div>
                </details>
              </div>
            </div>

            {/* SECTION 2: AI Evaluation Engines (Groq + Gemini) */}
            <div className="rounded-2xl border border-slate-800 bg-slate-900/80 p-6 shadow-lg backdrop-blur-sm sm:p-7">
              <div className="flex items-center gap-3">
                <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-amber-500/20 text-amber-400">
                  <Cpu className="h-5 w-5" />
                </div>
                <div>
                  <h2 className="text-lg font-bold text-white">
                    2. Free / Low-Cost AI Evaluation Engines
                  </h2>
                  <p className="text-xs text-slate-400">
                    Powers instant Goethe/telc Schreiben grading and Whisper-large-v3 speech evaluation.
                  </p>
                </div>
              </div>

              <div className="mt-5 grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div>
                  <label className="mb-1.5 flex items-center justify-between text-xs font-semibold text-slate-300">
                    <span>GROQ_API_KEY</span>
                    <a
                      href="https://console.groq.com/keys"
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex items-center gap-1 text-[11px] text-amber-400 hover:underline"
                    >
                      Get Free Key <ExternalLink className="h-3 w-3" />
                    </a>
                  </label>
                  <input
                    type="password"
                    value={groqKey}
                    onChange={(e) => setGroqKey(e.target.value)}
                    placeholder={data?.config.groqApiKeyMasked || "gsk_..."}
                    className="w-full rounded-xl border border-slate-700 bg-slate-950 px-3.5 py-2.5 text-xs font-mono text-slate-200 placeholder-slate-600 focus:border-amber-400 focus:outline-none"
                  />
                  <p className="mt-1 text-[11px] text-slate-400">
                    Llama-3.3-70B (Writing) + Whisper-large-v3 (Speaking)
                  </p>
                </div>

                <div>
                  <label className="mb-1.5 flex items-center justify-between text-xs font-semibold text-slate-300">
                    <span>GEMINI_API_KEY</span>
                    <a
                      href="https://aistudio.google.com/app/apikey"
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex items-center gap-1 text-[11px] text-amber-400 hover:underline"
                    >
                      Get Free Key <ExternalLink className="h-3 w-3" />
                    </a>
                  </label>
                  <input
                    type="password"
                    value={geminiKey}
                    onChange={(e) => setGeminiKey(e.target.value)}
                    placeholder={data?.config.geminiApiKeyMasked || "AIzaSy..."}
                    className="w-full rounded-xl border border-slate-700 bg-slate-950 px-3.5 py-2.5 text-xs font-mono text-slate-200 placeholder-slate-600 focus:border-amber-400 focus:outline-none"
                  />
                  <p className="mt-1 text-[11px] text-slate-400">
                    Gemini 2.5 Flash for PDF processing & multi-agent evaluation
                  </p>
                </div>
              </div>
            </div>

            {/* SECTION 3: Supabase Database & Auth */}
            <div className="rounded-2xl border border-slate-800 bg-slate-900/80 p-6 shadow-lg backdrop-blur-sm sm:p-7">
              <div className="flex items-center gap-3">
                <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-emerald-500/20 text-emerald-400">
                  <Database className="h-5 w-5" />
                </div>
                <div>
                  <h2 className="text-lg font-bold text-white">
                    3. Supabase PostgreSQL & Auth Credentials
                  </h2>
                  <p className="text-xs text-slate-400">
                    Persistent database for users, exam attempts, and unlocked packages.
                  </p>
                </div>
              </div>

              <div className="mt-5 space-y-4">
                <div>
                  <label className="mb-1.5 block text-xs font-semibold text-slate-300">
                    NEXT_PUBLIC_SUPABASE_URL
                  </label>
                  <input
                    type="text"
                    value={supabaseUrl}
                    onChange={(e) => setSupabaseUrl(e.target.value)}
                    placeholder="https://xyzcompany.supabase.co"
                    className="w-full rounded-xl border border-slate-700 bg-slate-950 px-3.5 py-2.5 text-xs font-mono text-slate-200 placeholder-slate-600 focus:border-amber-400 focus:outline-none"
                  />
                </div>

                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <div>
                    <label className="mb-1.5 block text-xs font-semibold text-slate-300">
                      NEXT_PUBLIC_SUPABASE_ANON_KEY
                    </label>
                    <input
                      type="password"
                      value={supabaseAnonKey}
                      onChange={(e) => setSupabaseAnonKey(e.target.value)}
                      placeholder={data?.config.supabaseAnonKeyMasked || "eyJhbGciOiJIUzI1NiIsInR5cCI6..."}
                      className="w-full rounded-xl border border-slate-700 bg-slate-950 px-3.5 py-2.5 text-xs font-mono text-slate-200 placeholder-slate-600 focus:border-amber-400 focus:outline-none"
                    />
                  </div>

                  <div>
                    <label className="mb-1.5 block text-xs font-semibold text-slate-300">
                      SUPABASE_SERVICE_ROLE_KEY
                    </label>
                    <input
                      type="password"
                      value={supabaseServiceKey}
                      onChange={(e) => setSupabaseServiceKey(e.target.value)}
                      placeholder={data?.config.supabaseServiceRoleKeyMasked || "eyJhbGciOiJIUzI1NiIsInR5cCI6..."}
                      className="w-full rounded-xl border border-slate-700 bg-slate-950 px-3.5 py-2.5 text-xs font-mono text-slate-200 placeholder-slate-600 focus:border-amber-400 focus:outline-none"
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* SECTION 4: Founder Admin Password */}
            <div className="rounded-2xl border border-slate-800 bg-slate-900/80 p-6 shadow-lg backdrop-blur-sm sm:p-7">
              <div className="flex items-center gap-3">
                <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-purple-500/20 text-purple-400">
                  <Lock className="h-5 w-5" />
                </div>
                <div>
                  <h2 className="text-lg font-bold text-white">
                    4. Founder Admin Portal Password
                  </h2>
                  <p className="text-xs text-slate-400">
                    Protects the <code className="text-amber-300">/admin</code> dashboard and manual student unlock endpoints.
                  </p>
                </div>
              </div>

              <div className="mt-5">
                <label className="mb-1.5 block text-xs font-semibold text-slate-300">
                  ADMIN_SECRET_PASSWORD
                </label>
                <input
                  type="text"
                  value={adminPassword}
                  onChange={(e) => setAdminPassword(e.target.value)}
                  placeholder="gtf-berlin-founder-2026"
                  className="w-full max-w-md rounded-xl border border-slate-700 bg-slate-950 px-3.5 py-2.5 text-xs font-mono text-slate-200 placeholder-slate-600 focus:border-amber-400 focus:outline-none"
                />
              </div>
            </div>

            {/* ACTION BUTTON */}
            <div className="pt-2">
              <button
                onClick={handleSaveAndInitialize}
                disabled={saving}
                className="flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-gtf-gold via-amber-400 to-amber-500 py-3.5 text-sm font-extrabold text-slate-950 shadow-lg transition hover:brightness-105 active:scale-[0.99] disabled:opacity-50"
              >
                {saving ? (
                  <>
                    <RefreshCw className="h-4 w-4 animate-spin" />
                    Saving Keys & Initializing 5TB Vault...
                  </>
                ) : (
                  <>
                    <Save className="h-4 w-4" />
                    Save Keys & Initialize 5TB Vault
                  </>
                )}
              </button>
              <p className="mt-2 text-center text-xs text-slate-400">
                Writes safely to <code className="text-amber-300">.env.local</code> and runs <code className="text-amber-300">drive_initializer.py</code>.
              </p>
            </div>
          </div>

          {/* Right Sidebar: One-Click SQL Copier + Vault Status (4 Cols) */}
          <div className="space-y-6 lg:col-span-4">
            {/* ONE-CLICK SQL COPIER */}
            <div className="rounded-2xl border border-slate-800 bg-slate-900/90 p-6 shadow-xl backdrop-blur-md">
              <div className="flex items-center gap-2.5 text-white">
                <FileCode2 className="h-5 w-5 text-emerald-400" />
                <h3 className="font-bold">One-Click Supabase SQL</h3>
              </div>
              <p className="mt-1 text-xs text-slate-400">
                Copies the entire database schema (users, products, purchases, exam attempts + RLS rules)
                ready to run in Supabase SQL Editor.
              </p>

              <button
                onClick={handleCopySchema}
                className={`mt-4 flex w-full items-center justify-center gap-2 rounded-xl py-3 text-xs font-bold transition active:scale-95 ${
                  copiedSchema
                    ? "bg-emerald-500 text-slate-950 shadow-lg shadow-emerald-500/25"
                    : "bg-slate-800 text-white hover:bg-slate-700"
                }`}
              >
                {copiedSchema ? (
                  <>
                    <ClipboardCheck className="h-4 w-4" />
                    Copied schema.sql to Clipboard!
                  </>
                ) : (
                  <>
                    <Clipboard className="h-4 w-4 text-emerald-400" />
                    Copy Supabase SQL Schema
                  </>
                )}
              </button>

              <div className="mt-4">
                <button
                  onClick={() => setShowSchemaPreview(!showSchemaPreview)}
                  className="flex w-full items-center justify-between text-xs font-semibold text-slate-400 hover:text-slate-300"
                >
                  <span>Preview SQL Schema</span>
                  {showSchemaPreview ? (
                    <ChevronUp className="h-3.5 w-3.5" />
                  ) : (
                    <ChevronDown className="h-3.5 w-3.5" />
                  )}
                </button>

                {showSchemaPreview && (
                  <pre className="mt-2.5 max-h-64 overflow-x-auto rounded-lg border border-slate-800 bg-slate-950 p-3 text-[10px] font-mono text-slate-300">
                    {data?.schemaSql || "Loading schema..."}
                  </pre>
                )}
              </div>
            </div>

            {/* Vault Folder Structure Guide */}
            <div className="rounded-2xl border border-slate-800 bg-slate-900/90 p-6 shadow-xl">
              <div className="flex items-center gap-2 text-white">
                <FolderSync className="h-5 w-5 text-amber-400" />
                <h3 className="font-bold">5TB Vault Hierarchy</h3>
              </div>
              <p className="mt-1 text-xs text-slate-400">
                Created automatically in your Google Drive by <code className="text-amber-300">drive_initializer.py</code>:
              </p>

              <div className="mt-3.5 rounded-xl border border-slate-800 bg-slate-950 p-3 text-[11px] font-mono text-slate-300">
                <p className="text-amber-400 font-bold">/GTF_App_Vault/</p>
                <p className="pl-3 text-slate-400">├── A1/ (Lesen, Hoeren, Schreiben, Sprechen...)</p>
                <p className="pl-3 text-slate-400">├── A2/ ...</p>
                <p className="pl-3 text-emerald-400 font-semibold">├── B1/ (Active Sample linked)</p>
                <p className="pl-3 text-slate-400">└── B2/ (Pflege & Anerkennung)</p>
              </div>

              <div className="mt-4 rounded-xl border border-slate-800 bg-slate-950/60 p-3 text-xs text-slate-300">
                <span className="font-semibold text-amber-400">Generated Sample Audio:</span>
                <p className="mt-1 text-[11px] text-slate-400">
                  {data?.hasAudio
                    ? "🟢 Physical 128kbps German MP3 files verified in output_test!"
                    : "🟡 Sample audio pending generation."}
                </p>
              </div>
            </div>

            {/* Quick Links */}
            <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-5 text-xs text-slate-400">
              <h4 className="font-semibold text-slate-300">Quick Navigation</h4>
              <ul className="mt-2 space-y-1.5">
                <li>
                  <Link href="/dashboard" className="text-amber-400 hover:underline">
                    → Student Mock Exam Dashboard
                  </Link>
                </li>
                <li>
                  <Link href="/exam/b1/hoeren" className="text-amber-400 hover:underline">
                    → B1 Hören Audio Player
                  </Link>
                </li>
                <li>
                  <Link href="/admin" className="text-amber-400 hover:underline">
                    → Founder Admin Control Room
                  </Link>
                </li>
              </ul>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
