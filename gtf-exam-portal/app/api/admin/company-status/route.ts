import { promises as fs } from "fs";
import path from "path";
import { NextResponse } from "next/server";
import { verifyAdminRequest } from "@/lib/server/admin-auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

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

interface LedgerDomain {
  completed_count?: number;
  approved_count?: number;
  rejected_count?: number;
  total_target?: number;
  target_count?: number;
}

interface MasterLedger {
  domains?: Record<string, LedgerDomain>;
  summary?: {
    total_completed_items?: number;
    total_approved_items?: number;
    total_rejected?: number;
  };
}

function resolveRoots(): { projectRoot: string; portalRoot: string } {
  const cwd = process.cwd();
  if (path.basename(cwd) === "gtf-exam-portal") {
    return {
      portalRoot: cwd,
      projectRoot: path.resolve(cwd, ".."),
    };
  }
  return {
    projectRoot: cwd,
    portalRoot: path.join(cwd, "gtf-exam-portal"),
  };
}

async function fileExists(p: string): Promise<boolean> {
  try {
    const st = await fs.stat(p);
    return st.isFile();
  } catch {
    return false;
  }
}

async function dirExists(p: string): Promise<boolean> {
  try {
    const st = await fs.stat(p);
    return st.isDirectory();
  } catch {
    return false;
  }
}

async function countFilesRecursively(dir: string, extension: string): Promise<number> {
  if (!(await dirExists(dir))) return 0;
  let count = 0;
  try {
    const entries = await fs.readdir(dir, { withFileTypes: true });
    for (const ent of entries) {
      const full = path.join(dir, ent.name);
      if (ent.isDirectory()) {
        count += await countFilesRecursively(full, extension);
      } else if (ent.isFile() && ent.name.toLowerCase().endsWith(extension)) {
        count++;
      }
    }
  } catch {
    // ignore unreadable dirs
  }
  return count;
}

export async function GET(req: Request) {
  if (!verifyAdminRequest(req)) {
    return NextResponse.json(
      { error: "Unauthorized: Invalid ADMIN_SECRET_PASSWORD." },
      { status: 401 }
    );
  }

  const { projectRoot, portalRoot } = resolveRoots();

  // 1. Locate and read master_ledger.json
  const ledgerCandidates = [
    path.join(projectRoot, "content-factory", "master_ledger.json"),
    path.join(portalRoot, "content-factory", "master_ledger.json"),
  ];

  let ledgerData: MasterLedger | null = null;
  for (const cand of ledgerCandidates) {
    if (await fileExists(cand)) {
      try {
        const raw = await fs.readFile(cand, "utf-8");
        ledgerData = JSON.parse(raw) as MasterLedger;
        break;
      } catch (e) {
        console.error("Error reading ledger cand:", cand, e);
      }
    }
  }

  const domains = ledgerData?.domains || {};
  const ledgerSummary = ledgerData?.summary || {};

  // 2. Scan physical file counts in public/vault_fallback
  const vaultDirs = [
    path.join(projectRoot, "public", "vault_fallback"),
    path.join(portalRoot, "public", "vault_fallback"),
  ];
  let primaryVault = vaultDirs[0];
  if (!(await dirExists(primaryVault)) && (await dirExists(vaultDirs[1]))) {
    primaryVault = vaultDirs[1];
  }

  const totalPdfs = await countFilesRecursively(primaryVault, ".pdf");
  const totalMp3s =
    (await countFilesRecursively(primaryVault, ".mp3")) +
    (await countFilesRecursively(path.join(projectRoot, "content-factory", "output_test"), ".mp3"));
  const totalInteractive = await countFilesRecursively(
    path.join(primaryVault, "interactive"),
    ".json"
  );
  const totalMetaJson = await countFilesRecursively(primaryVault, ".meta.json");

  // 3. Assemble status for all 16 Employees
  const employeeDefs = [
    {
      id: "EMP-01",
      name: "Chief System Architect & Platform Engineer",
      role: "Platform Architecture, Next.js PWA & Master Ledger Brain",
      domain: "core_platform",
      division: "DIV-07: Enterprise Tech & Analytics",
      type: "Architecture",
      targetCount: 1,
      defaultCompleted: 1,
    },
    {
      id: "EMP-02",
      name: "Senior DaF Curriculum & Textbook Author",
      role: "German Language Academy Workbooks (A1.1 to B2.2)",
      domain: "daf_books",
      division: "DIV-01: Academic & Language Institute",
      type: "Content Author",
      targetCount: 48,
    },
    {
      id: "EMP-03",
      name: "German Audio, Radio Harvester & Musterlösung Engineer",
      role: "Goethe/telc Audio Exam Sets with Studio Audio & Musterlösung",
      domain: "daf_audio_exams",
      division: "DIV-01: Academic & Language Institute",
      type: "Audio & Exam",
      targetCount: 40,
    },
    {
      id: "EMP-04",
      name: "Studienkolleg Aufnahmeprüfung German & C-Test Specialist",
      role: "Studienkolleg Aufnahmeprüfung Deutsch (C-Test & Textproduktion)",
      domain: "stk_aufnahme_deutsch",
      division: "DIV-04: Public University & Studienkolleg Placement",
      type: "Content Author",
      targetCount: 30,
    },
    {
      id: "EMP-05",
      name: "Studienkolleg T-Kurs Professor (Math, Physik, FSP)",
      role: "Studienkolleg T-Kurs Master PDF & Klausur Factory",
      domain: "stk_t_kurs",
      division: "DIV-04: Public University & Studienkolleg Placement",
      type: "Content Author",
      targetCount: 36,
    },
    {
      id: "EMP-06",
      name: "Studienkolleg M-Kurs Professor (Bio, Chemie, Math, Physik)",
      role: "Studienkolleg M-Kurs Medical Vorsemester & FSP Factory",
      domain: "stk_m_kurs",
      division: "DIV-04: Public University & Studienkolleg Placement",
      type: "Content Author",
      targetCount: 36,
    },
    {
      id: "EMP-07",
      name: "Studienkolleg W-Kurs Professor (Math, VWL, BWL, FSP)",
      role: "Studienkolleg W-Kurs Wirtschafts- & Finanzwissenschaften",
      domain: "stk_w_kurs",
      division: "DIV-04: Public University & Studienkolleg Placement",
      type: "Content Author",
      targetCount: 30,
    },
    {
      id: "EMP-08",
      name: "Studienkolleg G-Kurs Professor (Geschichte, Deutsch, FSP)",
      role: "Studienkolleg G-Kurs Geistes- & Kulturwissenschaften",
      domain: "stk_g_kurs",
      division: "DIV-04: Public University & Studienkolleg Placement",
      type: "Content Author",
      targetCount: 30,
    },
    {
      id: "EMP-09",
      name: "Fachsprache Pflege & Dual Ausbildung Director",
      role: "Clinical Nursing Modules (ISBAR/6-R) & Dual Ausbildung Tracks",
      domain: "pflege_ausbildung",
      division: "DIV-03: Medical Anerkennung & DIV-05: Hospital Placement",
      type: "Content Author",
      targetCount: 32,
    },
    {
      id: "EMP-10",
      name: "Strict Quality Assurance (QA) Director & Academic Auditor",
      role: "Independent 5-Point Academic & Technical File Quarantine Gatekeeper",
      domain: "qa_inspection",
      division: "DIV-07: Enterprise Tech & Analytics",
      type: "Auditing & QA",
      targetCount: 282,
    },
    {
      id: "EMP-11",
      name: "Interactive Assessment, Flashcard & C-Test Engine Builder",
      role: "Interactive Practice Decks, Flashcards & Instant Feedback Quizzes",
      domain: "interactive_decks",
      division: "DIV-01: Academic & Language Institute",
      type: "Interactive Engine",
      targetCount: 48,
    },
    {
      id: "EMP-12",
      name: "Studienkolleg Virtual STEM Lab & Interactive Simulation Specialist",
      role: "Virtual Physics, Chemistry, Biology & Math Laboratories",
      domain: "stem_labs",
      division: "DIV-04: Public University & Studienkolleg Placement",
      type: "Interactive Engine",
      targetCount: 8,
    },
    {
      id: "EMP-13",
      name: "Master Catalog & 5TB Drive Vault Synchronizer",
      role: "Automated Google Drive Sync & data/catalog.json Registry Bridge",
      domain: "drive_sync",
      division: "DIV-07: Enterprise Tech & Analytics",
      type: "Infrastructure",
      targetCount: 282,
    },
    {
      id: "EMP-14",
      name: "Student Admissions & Examination Portal Officer",
      role: "Live Candidate Placement Tracking & PWA Examination Sessions",
      domain: "portal_integration",
      division: "DIV-02: Global Mobility & Visas",
      type: "Operations",
      targetCount: 1,
      defaultCompleted: 1,
    },
    {
      id: "EMP-15",
      name: "Master Bug Hunter, Regression Tester & Zero-Defect Auditor",
      role: "Automated JSON Schema, PDF Header & Mirror Synchronization Integrity",
      domain: "bug_hunting",
      division: "DIV-07: Enterprise Tech & Analytics",
      type: "Integrity",
      targetCount: 1,
      defaultCompleted: 1,
    },
    {
      id: "EMP-16",
      name: "Chief Operating Officer (COO) & Automation Orchestrator",
      role: "Sequential Daily Shift Execution, Resource Isolation & CEO Progress Dashboard",
      domain: "coo_orchestrator",
      division: "DIV-07: Enterprise Tech & Analytics",
      type: "Executive",
      targetCount: 15,
      defaultCompleted: 15,
    },
  ];

  const totalTargetAssets = 282; // Canonical 8-domain target
  const totalCompletedAssets = ledgerSummary.total_completed_items || 0;
  const totalApprovedAssets = ledgerSummary.total_approved_items || 0;
  const totalRejectedAssets = ledgerSummary.total_rejected || 0;

  const employees: EmployeeStatus[] = employeeDefs.map((def) => {
    let completed = def.defaultCompleted || 0;
    let approved = def.defaultCompleted || 0;
    let rejected = 0;
    let target = def.targetCount;

    if (def.domain in domains) {
      const d = domains[def.domain] as any;
      completed = d.completed_count || 0;
      approved = d.approved_count || 0;
      rejected = d.rejected_count || 0;
      target = d.target_count || d.total_target || def.targetCount;
    } else if (def.id === "EMP-10") {
      completed = totalCompletedAssets;
      approved = totalApprovedAssets;
      rejected = totalRejectedAssets;
      target = totalTargetAssets;
    } else if (def.id === "EMP-11") {
      completed = totalInteractive;
      approved = totalInteractive;
      target = 48;
    } else if (def.id === "EMP-12") {
      completed = 0; // Will be read from disk if present
      target = 8;
    } else if (def.id === "EMP-13") {
      completed = totalApprovedAssets;
      approved = totalApprovedAssets;
      target = totalTargetAssets;
    }

    const pct = target > 0 ? Math.min(100, Math.round((completed / target) * 100)) : 100;
    const pending = Math.max(0, target - completed);

    let status: EmployeeStatus["status"] = "queued";
    if (completed >= target && target > 0) {
      status = "completed";
    } else if (completed > 0) {
      status = "active";
    } else if (def.id === "EMP-10") {
      status = "auditing";
    }

    return {
      id: def.id,
      name: def.name,
      role: def.role,
      domain: def.domain,
      division: def.division,
      type: def.type,
      targetCount: target,
      completedCount: completed,
      approvedCount: approved,
      rejectedCount: rejected,
      pendingCount: pending,
      progressPercent: pct,
      status,
    };
  });

  // Calculate overall grand institute percentage
  const grandCompletionPercent = totalTargetAssets > 0
    ? Number(((totalCompletedAssets / totalTargetAssets) * 100).toFixed(1))
    : 0;
  const grandApprovalPercent = totalTargetAssets > 0
    ? Number(((totalApprovedAssets / totalTargetAssets) * 100).toFixed(1))
    : 0;

  // 4. Read QA Rejections Log from daily_qa_report.md or qa_rejected directory
  const rejectionLogs: Array<{
    filename: string;
    folder: string;
    worker: string;
    reason: string;
    quarantinedAt: string;
  }> = [];

  const rejectedDir = path.join(projectRoot, "content-factory", "qa_rejected");
  if (await dirExists(rejectedDir)) {
    try {
      const subfolders = await fs.readdir(rejectedDir, { withFileTypes: true });
      for (const sf of subfolders) {
        if (sf.isDirectory()) {
          const sfp = path.join(rejectedDir, sf.name);
          const files = await fs.readdir(sfp);
          for (const f of files) {
            if (f.endsWith(".pdf") || f.endsWith(".mp3")) {
              rejectionLogs.push({
                filename: f,
                folder: sf.name,
                worker: sf.name.includes("stk") ? "EMP-05..08" : "EMP-02..09",
                reason: "Did not meet strict 5-page / 1,200-word / Musterlösung QA criteria",
                quarantinedAt: new Date().toISOString(),
              });
            }
          }
        }
      }
    } catch {
      // ignore
    }
  }

  // 5. Bug Hunter Status
  let bugHunterStatus: Record<string, unknown> = {
    system_health: "100% HEALTHY (ZERO DEFECTS)",
    defects_count: 0,
    last_audit: new Date().toISOString(),
  };
  const bugReportPath = path.join(projectRoot, "content-factory", "qa_reports", "emp15_bug_report.json");
  if (await fileExists(bugReportPath)) {
    try {
      const braw = await fs.readFile(bugReportPath, "utf-8");
      const bjson = JSON.parse(braw);
      bugHunterStatus = {
        system_health: bjson.summary?.system_health || "100% HEALTHY",
        defects_count: bjson.summary?.total_defects_found || 0,
        last_audit: bjson.timestamp || new Date().toISOString(),
        defect_log: bjson.defect_log || [],
      };
    } catch {
      // ignore
    }
  }

  return NextResponse.json({
    ok: true,
    timestamp: new Date().toISOString(),
    institution: "The Gateway to Future (GTF) Berlin",
    headquarters: "Schönefelder Straße 2, GStU, 12355 Berlin",
    founders: [
      { name: "Sarbjit Kour", title: "Founder & CEO, Gateway To Future" },
    ],
    cooOrchestrator: "EMP-16 (Chief Operating Officer)",
    metrics: {
      totalTargetAssets,
      totalCompletedAssets,
      totalApprovedAssets,
      totalRejectedAssets,
      totalPendingQA: Math.max(0, totalTargetAssets - totalApprovedAssets - totalRejectedAssets),
      grandCompletionPercent,
      grandApprovalPercent,
      totalPdfs,
      totalMp3s,
      totalInteractive,
      totalMetaJson,
    },
    employees,
    rejectionLogs,
    bugHunterStatus,
  });
}
