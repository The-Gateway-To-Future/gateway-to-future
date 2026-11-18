"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import {
  ArrowLeft,
  BookOpen,
  CheckCircle2,
  Headphones,
  KeyRound,
  Loader2,
  Lock,
  RefreshCw,
  Search,
  ShieldAlert,
  ShieldCheck,
  Sparkles,
  Terminal,
  Users,
} from "lucide-react";

interface EmployeeStatus {
  id: string;
  name: string;
  role: string;
  domain: string;
  division: string;
  type: string;
  targetCount: number;
  completedCount: number;
  approvedCount: number;
  rejectedCount: number;
  pendingCount: number;
  progressPercent: number;
  status: "completed" | "active" | "queued" | "auditing" | "standby";
}

interface CompanyStatusData {
  ok: boolean;
  timestamp: string;
  institution: string;
  headquarters: string;
  founders: Array<{ name: string; title: string }>;
  cooOrchestrator: string;
  metrics: {
    totalTargetAssets: number;
    totalCompletedAssets: number;
    totalApprovedAssets: number;
    totalRejectedAssets: number;
    totalPendingQA: number;
    grandCompletionPercent: number;
    grandApprovalPercent: number;
    totalPdfs: number;
    totalMp3s: number;
    totalInteractive: number;
    totalMetaJson: number;
  };
  employees: EmployeeStatus[];
  rejectionLogs: Array<{
    filename: string;
    folder: string;
    worker: string;
    reason: string;
    quarantinedAt: string;
  }>;
  bugHunterStatus: {
    system_health: string;
    defects_count: number;
    last_audit: string;
    defect_log?: string[];
  };
}

const SESSION_PWD_KEY = "gtf_founder_admin_pwd";

export default function CEOCompanyStatusPage() {
  const [adminPassword, setAdminPassword] = useState("");
  const [authenticated, setAuthenticated] = useState(false);
  const [authError, setAuthError] = useState<string | null>(null);
  const [verifying, setVerifying] = useState(false);

  const [data, setData] = useState<CompanyStatusData | null>(null);
  const [loading, setLoading] = useState(false);
  const [filterType, setFilterType] = useState<"all" | "content" | "interactive" | "core">("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [activeTab, setActiveTab] = useState<"overview" | "employees" | "qa_rejections" | "cli_orchestrator">("overview");

  const fetchStatus = useCallback(async (pwd: string) => {
    setLoading(true);
    setAuthError(null);
    try {
      const res = await fetch("/api/admin/company-status", {
        headers: { "x-admin-password": pwd },
      });
      if (res.status === 401) {
        setAuthenticated(false);
        setAuthError("Ungültiges CEO-Passwort. Bitte prüfen Sie ADMIN_SECRET_PASSWORD.");
        sessionStorage.removeItem(SESSION_PWD_KEY);
        return false;
      }
      if (!res.ok) {
        setAuthError("Fehler beim Abrufen der Unternehmensdaten.");
        return false;
      }
      const json = (await res.json()) as CompanyStatusData;
      setData(json);
      setAuthenticated(true);
      sessionStorage.setItem(SESSION_PWD_KEY, pwd);
      return true;
    } catch {
      setAuthError("Netzwerkfehler: Verbindung zum GTF-Server fehlgeschlagen.");
      return false;
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const savedPwd = sessionStorage.getItem(SESSION_PWD_KEY);
    if (savedPwd) {
      setAdminPassword(savedPwd);
      fetchStatus(savedPwd);
    }
  }, [fetchStatus]);

  const handleLoginSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!adminPassword.trim()) return;
    setVerifying(true);
    await fetchStatus(adminPassword.trim());
    setVerifying(false);
  };

  // Filter employees
  const filteredEmployees = (data?.employees || []).filter((emp) => {
    const matchesSearch =
      emp.id.toLowerCase().includes(searchQuery.toLowerCase()) ||
      emp.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      emp.role.toLowerCase().includes(searchQuery.toLowerCase()) ||
      emp.division.toLowerCase().includes(searchQuery.toLowerCase());

    if (!matchesSearch) return false;

    if (filterType === "content") {
      return ["EMP-02", "EMP-03", "EMP-04", "EMP-05", "EMP-06", "EMP-07", "EMP-08", "EMP-09"].includes(emp.id);
    }
    if (filterType === "interactive") {
      return ["EMP-11", "EMP-12"].includes(emp.id);
    }
    if (filterType === "core") {
      return ["EMP-01", "EMP-10", "EMP-13", "EMP-14", "EMP-15", "EMP-16"].includes(emp.id);
    }
    return true;
  });

  // Password Lock Screen
  if (!authenticated) {
    return (
      <div className="min-h-screen bg-slate-900 text-white flex items-center justify-center p-4">
        <div className="w-full max-w-md bg-slate-900 border border-amber-500/30 rounded-2xl p-8 shadow-2xl shadow-amber-950/20">
          <div className="flex flex-col items-center text-center mb-6">
            <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-amber-500/20 to-indigo-500/20 border border-amber-500/40 flex items-center justify-center mb-4">
              <Lock className="w-8 h-8 text-amber-400" />
            </div>
            <span className="text-xs uppercase tracking-widest text-amber-400 font-bold mb-1">
              Top Secret • Founder Access Only
            </span>
            <h1 className="text-2xl font-black text-white tracking-tight">
              GTF CEO Progress Tracker
            </h1>
            <p className="text-xs text-slate-400 mt-2">
              EMP-16 COO Operations Center for Sarbjit Kour (Founder &amp; CEO, Gateway To Future).
            </p>
          </div>

          <form onSubmit={handleLoginSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-2">
                Founder Secret Password
              </label>
              <div className="relative">
                <input
                  type="password"
                  value={adminPassword}
                  onChange={(e) => setAdminPassword(e.target.value)}
                  placeholder="Passwort eingeben..."
                  className="w-full bg-slate-900 border border-slate-800 rounded-xl px-4 py-3 pl-11 text-sm text-white placeholder-slate-600 focus:outline-none focus:border-amber-500 transition-colors"
                  autoFocus
                />
                <KeyRound className="w-4 h-4 text-slate-500 absolute left-4 top-3.5" />
              </div>
            </div>

            {authError && (
              <div className="p-3 bg-red-950/50 border border-red-500/30 rounded-xl text-xs text-red-300">
                {authError}
              </div>
            )}

            <button
              type="submit"
              disabled={verifying}
              className="w-full bg-gradient-to-r from-amber-600 to-amber-500 hover:from-amber-500 hover:to-amber-400 text-white font-bold py-3 rounded-xl text-sm transition-all shadow-lg shadow-amber-600/30 flex items-center justify-center gap-2 disabled:opacity-50"
            >
              {verifying ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Verifiziere Identität...
                </>
              ) : (
                <>
                  <Lock className="w-4 h-4" />
                  CEO Dashboard Entsperren
                </>
              )}
            </button>
          </form>

          <div className="mt-6 pt-6 border-t border-slate-800/80 text-center">
            <Link
              href="/admin"
              className="inline-flex items-center gap-2 text-xs text-slate-400 hover:text-slate-200 transition-colors"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              Zurück zum Standard-Admin-Portal
            </Link>
          </div>
        </div>
      </div>
    );
  }

  const metrics = data?.metrics || {
    totalTargetAssets: 282,
    totalCompletedAssets: 0,
    totalApprovedAssets: 0,
    totalRejectedAssets: 0,
    totalPendingQA: 282,
    grandCompletionPercent: 0,
    grandApprovalPercent: 0,
    totalPdfs: 0,
    totalMp3s: 0,
    totalInteractive: 0,
    totalMetaJson: 0,
  };

  return (
    <div className="min-h-screen bg-slate-900 text-slate-100 selection:bg-amber-500 selection:text-white">
      {/* Top Banner Navigation */}
      <header className="sticky top-0 z-40 bg-slate-900/90 backdrop-blur-md border-b border-slate-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3.5 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link
              href="/admin"
              className="p-2 rounded-xl bg-slate-800/80 hover:bg-slate-700 text-slate-300 transition-colors"
              title="Zurück zum Admin-Portal"
            >
              <ArrowLeft className="w-4 h-4" />
            </Link>
            <div>
              <div className="flex items-center gap-2">
                <span className="px-2 py-0.5 rounded text-[10px] font-black tracking-wider uppercase bg-amber-500/20 text-amber-400 border border-amber-500/30">
                  EMP-16 COO
                </span>
                <h1 className="text-base sm:text-lg font-black tracking-tight text-white flex items-center gap-2">
                  Gateway To Future <span className="text-amber-400 font-mono text-sm">• Berlin HQ</span>
                </h1>
              </div>
              <p className="text-[11px] text-slate-400 hidden sm:block">
                Virtual Corporate Operations &amp; CEO Master Progress Tracker (16 Employees)
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 sm:gap-3">
            <button
              onClick={() => fetchStatus(adminPassword)}
              disabled={loading}
              className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-xs font-semibold text-slate-200 border border-slate-700 flex items-center gap-2 transition-colors disabled:opacity-50"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin text-amber-400" : ""}`} />
              <span className="hidden sm:inline">Aktualisieren</span>
            </button>
            <div className="h-4 w-px bg-slate-800" />
            <div className="text-right hidden md:block">
              <div className="text-xs font-bold text-slate-200">Sarbjit Kour</div>
              <div className="text-[10px] text-emerald-400 font-mono">Founder &amp; CEO · Gateway To Future</div>
            </div>
          </div>
        </div>
      </header>

      {/* Main Body */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
        {/* HERO: Grand Institute Completion Card */}
        <section className="relative overflow-hidden bg-gradient-to-br from-slate-900 via-indigo-950/40 to-slate-900 border border-slate-800 rounded-3xl p-6 sm:p-8 shadow-2xl">
          <div className="absolute top-0 right-0 -mt-12 -mr-12 w-96 h-96 bg-amber-500/10 rounded-full blur-3xl pointer-events-none" />
          <div className="relative z-10 grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
            <div className="lg:col-span-8 space-y-4">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-xs font-bold">
                <ShieldCheck className="w-4 h-4" />
                Zero-Defect Enterprise Content Factory
              </div>
              <h2 className="text-2xl sm:text-4xl font-black text-white tracking-tight leading-tight">
                Institute Completion Toward 100% Target
              </h2>
              <p className="text-sm text-slate-300 max-w-2xl leading-relaxed">
                Autonomous orchestration across 8 academic faculties, 282 core textbooks, audio exam
                suites, and interactive STEM labs for Indian students, doctors, and nurses relocating to Germany.
              </p>

              {/* Progress Bar Container */}
              <div className="space-y-2 pt-2">
                <div className="flex justify-between text-xs font-bold">
                  <span className="text-slate-300">Curriculum Asset Generation</span>
                  <span className="text-amber-400 font-mono text-sm">
                    {metrics.grandCompletionPercent}% ({metrics.totalCompletedAssets} / {metrics.totalTargetAssets})
                  </span>
                </div>
                <div className="h-4 w-full bg-slate-900 border border-slate-800 rounded-full overflow-hidden p-0.5">
                  <div
                    className="h-full bg-gradient-to-r from-amber-500 via-emerald-400 to-cyan-400 rounded-full transition-all duration-1000 shadow-lg shadow-amber-500/30"
                    style={{ width: `${Math.max(2, metrics.grandCompletionPercent)}%` }}
                  />
                </div>
              </div>

              {/* QA Approval Sub-bar */}
              <div className="space-y-1 pt-1">
                <div className="flex justify-between text-[11px] text-slate-400 font-medium">
                  <span>EMP-10 QA Accreditation Rate</span>
                  <span className="text-emerald-400 font-mono">
                    {metrics.grandApprovalPercent}% Approved ({metrics.totalApprovedAssets} / {metrics.totalTargetAssets})
                  </span>
                </div>
                <div className="h-2 w-full bg-slate-900 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-emerald-500 rounded-full transition-all duration-1000"
                    style={{ width: `${metrics.grandApprovalPercent}%` }}
                  />
                </div>
              </div>
            </div>

            {/* Right KPI Card */}
            <div className="lg:col-span-4 bg-slate-900/70 border border-slate-800 rounded-2xl p-6 space-y-4">
              <div className="text-xs uppercase tracking-wider text-slate-400 font-bold">
                Live Inventory Status
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="bg-slate-900/80 border border-slate-800 p-3 rounded-xl">
                  <div className="flex items-center gap-2 text-slate-400 text-xs mb-1">
                    <BookOpen className="w-3.5 h-3.5 text-blue-400" />
                    <span>Master PDFs</span>
                  </div>
                  <div className="text-xl font-black text-white font-mono">{metrics.totalPdfs}</div>
                </div>
                <div className="bg-slate-900/80 border border-slate-800 p-3 rounded-xl">
                  <div className="flex items-center gap-2 text-slate-400 text-xs mb-1">
                    <Headphones className="w-3.5 h-3.5 text-amber-400" />
                    <span>Studio MP3s</span>
                  </div>
                  <div className="text-xl font-black text-white font-mono">{metrics.totalMp3s}</div>
                </div>
                <div className="bg-slate-900/80 border border-slate-800 p-3 rounded-xl">
                  <div className="flex items-center gap-2 text-slate-400 text-xs mb-1">
                    <Sparkles className="w-3.5 h-3.5 text-cyan-400" />
                    <span>Interactive Decks</span>
                  </div>
                  <div className="text-xl font-black text-white font-mono">{metrics.totalInteractive}</div>
                </div>
                <div className="bg-slate-900/80 border border-slate-800 p-3 rounded-xl">
                  <div className="flex items-center gap-2 text-slate-400 text-xs mb-1">
                    <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
                    <span>QA Approved</span>
                  </div>
                  <div className="text-xl font-black text-emerald-400 font-mono">{metrics.totalApprovedAssets}</div>
                </div>
              </div>
              <div className="pt-2 border-t border-slate-800/80 flex items-center justify-between text-xs">
                <span className="text-slate-400">System Health:</span>
                <span className="text-emerald-400 font-bold flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                  {data?.bugHunterStatus.system_health || "100% HEALTHY"}
                </span>
              </div>
            </div>
          </div>
        </section>

        {/* Tab Controls */}
        <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-800 pb-4">
          <div className="flex items-center gap-2">
            <button
              onClick={() => setActiveTab("overview")}
              className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 ${
                activeTab === "overview"
                  ? "bg-amber-500 text-slate-950 shadow-lg shadow-amber-500/20"
                  : "bg-slate-900 text-slate-400 hover:text-white"
              }`}
            >
              <Users className="w-4 h-4" />
              16 Employee Directory
            </button>
            <button
              onClick={() => setActiveTab("qa_rejections")}
              className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 ${
                activeTab === "qa_rejections"
                  ? "bg-amber-500 text-slate-950 shadow-lg shadow-amber-500/20"
                  : "bg-slate-900 text-slate-400 hover:text-white"
              }`}
            >
              <ShieldAlert className="w-4 h-4" />
              QA Quarantine Log ({data?.rejectionLogs.length || 0})
            </button>
            <button
              onClick={() => setActiveTab("cli_orchestrator")}
              className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 ${
                activeTab === "cli_orchestrator"
                  ? "bg-amber-500 text-slate-950 shadow-lg shadow-amber-500/20"
                  : "bg-slate-900 text-slate-400 hover:text-white"
              }`}
            >
              <Terminal className="w-4 h-4" />
              COO Shift CLI Guide
            </button>
          </div>

          {activeTab === "overview" && (
            <div className="flex items-center gap-3">
              <div className="relative">
                <input
                  type="text"
                  placeholder="Mitarbeiter suchen..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="bg-slate-900 border border-slate-800 rounded-xl px-3 py-1.5 pl-9 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-amber-500"
                />
                <Search className="w-3.5 h-3.5 text-slate-500 absolute left-3 top-2.5" />
              </div>
              <div className="flex rounded-xl bg-slate-900 border border-slate-800 p-0.5 text-xs">
                <button
                  onClick={() => setFilterType("all")}
                  className={`px-2.5 py-1 rounded-lg font-medium transition-colors ${
                    filterType === "all" ? "bg-slate-800 text-white" : "text-slate-400 hover:text-white"
                  }`}
                >
                  Alle
                </button>
                <button
                  onClick={() => setFilterType("content")}
                  className={`px-2.5 py-1 rounded-lg font-medium transition-colors ${
                    filterType === "content" ? "bg-slate-800 text-white" : "text-slate-400 hover:text-white"
                  }`}
                >
                  Autoren
                </button>
                <button
                  onClick={() => setFilterType("interactive")}
                  className={`px-2.5 py-1 rounded-lg font-medium transition-colors ${
                    filterType === "interactive" ? "bg-slate-800 text-white" : "text-slate-400 hover:text-white"
                  }`}
                >
                  Interactive
                </button>
                <button
                  onClick={() => setFilterType("core")}
                  className={`px-2.5 py-1 rounded-lg font-medium transition-colors ${
                    filterType === "core" ? "bg-slate-800 text-white" : "text-slate-400 hover:text-white"
                  }`}
                >
                  Führung/QA
                </button>
              </div>
            </div>
          )}
        </div>

        {/* TAB 1: 16 EMPLOYEES GRID */}
        {activeTab === "overview" && (
          <section className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {filteredEmployees.map((emp) => {
              const is100 = emp.progressPercent >= 100;
              return (
                <div
                  key={emp.id}
                  className={`relative bg-slate-900/80 border rounded-2xl p-5 flex flex-col justify-between transition-all hover:border-slate-700 ${
                    is100 ? "border-emerald-500/30" : "border-slate-800"
                  }`}
                >
                  <div>
                    {/* Header: ID, Type & Status */}
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-2">
                        <span className="px-2.5 py-1 rounded-lg text-xs font-black font-mono bg-slate-800 text-amber-400 border border-slate-700">
                          {emp.id}
                        </span>
                        <span className="text-[10px] text-slate-400 font-semibold uppercase tracking-wider">
                          {emp.type}
                        </span>
                      </div>
                      <span
                        className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider ${
                          is100
                            ? "bg-emerald-500/20 text-emerald-400 border border-emerald-500/30"
                            : emp.completedCount > 0
                            ? "bg-cyan-500/20 text-cyan-400 border border-cyan-500/30"
                            : "bg-slate-800 text-slate-400 border border-slate-700"
                        }`}
                      >
                        {is100 ? "100% Complete" : emp.completedCount > 0 ? "Active Shift" : "Standby"}
                      </span>
                    </div>

                    {/* Role & Name */}
                    <h3 className="text-sm font-bold text-white tracking-tight mb-1">{emp.name}</h3>
                    <p className="text-xs text-slate-400 line-clamp-2 mb-3">{emp.role}</p>
                    <div className="text-[10px] text-slate-500 mb-4">{emp.division}</div>
                  </div>

                  {/* Quota Progress Bar */}
                  <div className="space-y-2 pt-3 border-t border-slate-800/80">
                    <div className="flex justify-between text-xs">
                      <span className="text-slate-400 font-medium">Department Quota:</span>
                      <span className="font-mono text-white font-bold">
                        {emp.completedCount} / {emp.targetCount} ({emp.progressPercent}%)
                      </span>
                    </div>
                    <div className="h-2 w-full bg-slate-900 rounded-full overflow-hidden">
                      <div
                        className={`h-full rounded-full transition-all duration-700 ${
                          is100
                            ? "bg-emerald-400"
                            : emp.completedCount > 0
                            ? "bg-gradient-to-r from-amber-500 to-cyan-400"
                            : "bg-slate-700"
                        }`}
                        style={{ width: `${Math.max(2, emp.progressPercent)}%` }}
                      />
                    </div>
                    <div className="flex justify-between text-[10px] text-slate-500">
                      <span>Approved: {emp.approvedCount}</span>
                      <span>Pending: {emp.pendingCount}</span>
                    </div>
                  </div>
                </div>
              );
            })}
          </section>
        )}

        {/* TAB 2: QA REJECTION LOGS */}
        {activeTab === "qa_rejections" && (
          <section className="bg-slate-900/80 border border-slate-800 rounded-3xl p-6 sm:p-8 space-y-6">
            <div className="flex items-center justify-between border-b border-slate-800 pb-4">
              <div>
                <h3 className="text-lg font-black text-white flex items-center gap-2">
                  <ShieldAlert className="w-5 h-5 text-red-400" />
                  EMP-10 Strict Quality Assurance Quarantine Logs
                </h3>
                <p className="text-xs text-slate-400 mt-1">
                  Files isolated in <code>content-factory/qa_rejected/</code> that failed the 5-point academic audit.
                </p>
              </div>
              <span className="px-3 py-1 rounded-full text-xs font-bold bg-red-950/60 border border-red-500/30 text-red-400">
                {data?.rejectionLogs.length || 0} Quarantined Files
              </span>
            </div>

            {(!data?.rejectionLogs || data.rejectionLogs.length === 0) ? (
              <div className="text-center py-12 space-y-3">
                <CheckCircle2 className="w-12 h-12 text-emerald-400 mx-auto" />
                <h4 className="text-sm font-bold text-white">Keine Beanstandungen in der Quarantäne</h4>
                <p className="text-xs text-slate-400 max-w-md mx-auto">
                  Alle derzeit im System erfassten PDFs und MP3s erfüllen die geforderten Qualitätsstandards.
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                {data.rejectionLogs.map((rej, idx) => (
                  <div
                    key={idx}
                    className="p-4 rounded-xl bg-slate-900 border border-red-500/20 flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                  >
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-xs font-black font-mono text-red-400">{rej.worker}</span>
                        <span className="text-xs text-slate-400">• Ordner: {rej.folder}</span>
                      </div>
                      <div className="text-sm font-bold text-white font-mono">{rej.filename}</div>
                      <p className="text-xs text-red-300/80 mt-1">{rej.reason}</p>
                    </div>
                    <span className="text-[10px] text-slate-500 font-mono whitespace-nowrap">
                      {new Date(rej.quarantinedAt).toLocaleDateString()}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </section>
        )}

        {/* TAB 3: CLI ORCHESTRATOR GUIDE */}
        {activeTab === "cli_orchestrator" && (
          <section className="bg-slate-900/80 border border-slate-800 rounded-3xl p-6 sm:p-8 space-y-6">
            <div className="border-b border-slate-800 pb-4">
              <h3 className="text-lg font-black text-white flex items-center gap-2">
                <Terminal className="w-5 h-5 text-amber-400" />
                EMP-16 COO Automation Orchestrator — Founder CLI Guide
              </h3>
              <p className="text-xs text-slate-400 mt-1">
                The Master Orchestration CLI connects all 15 employee engines into an automated daily shift.
              </p>
            </div>

            <div className="space-y-4">
              <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 space-y-2">
                <div className="text-xs font-bold text-amber-400">1. Run Full Daily Company Operations Shift:</div>
                <pre className="p-3 bg-slate-900 rounded-xl font-mono text-xs text-emerald-400 overflow-x-auto">
                  python content-factory/run_daily_company.py --daily-shift
                </pre>
                <p className="text-xs text-slate-400">
                  Sequentially generates 2 assets per active employee, auto-skips any department that reached 100%,
                  runs EMP-10 QA Inspection, and synchronizes to Google Drive and bug-audits.
                </p>
              </div>

              <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 space-y-2">
                <div className="text-xs font-bold text-amber-400">2. Inspect Master CEO Dashboard in Terminal:</div>
                <pre className="p-3 bg-slate-900 rounded-xl font-mono text-xs text-emerald-400 overflow-x-auto">
                  python content-factory/run_daily_company.py --status
                </pre>
                <p className="text-xs text-slate-400">
                  Displays ANSI terminal progress bars, total generated master assets, and QA approval metrics.
                </p>
              </div>

              <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 space-y-2">
                <div className="text-xs font-bold text-amber-400">3. Execute Shift with Custom Quota:</div>
                <pre className="p-3 bg-slate-900 rounded-xl font-mono text-xs text-emerald-400 overflow-x-auto">
                  python content-factory/run_daily_company.py --daily-shift --limit 5
                </pre>
              </div>
            </div>
          </section>
        )}
      </main>
    </div>
  );
}
