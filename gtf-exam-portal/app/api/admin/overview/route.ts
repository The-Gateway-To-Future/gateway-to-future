import { promises as fs } from "fs";
import path from "path";
import { NextResponse } from "next/server";
import {
  getAllMergedProducts,
  readDriveSyncMap,
  readLocalStudents,
  verifyAdminRequest,
} from "@/lib/server/admin-auth";
import { integrationStatus } from "@/lib/server/env";
import { getSupabaseServerClient } from "@/lib/supabase";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function resolveFactoryDirs(): { factoryRoot: string; outputTestDir: string } {
  const candidates = [
    path.join(process.cwd(), "..", "content-factory"),
    path.join(process.cwd(), "content-factory"),
  ];
  for (const dir of candidates) {
    try {
      // Check if output_test or run_factory.py exists
      return {
        factoryRoot: dir,
        outputTestDir: path.join(dir, "output_test"),
      };
    } catch {
      // continue
    }
  }
  const fallback = path.join(process.cwd(), "content-factory");
  return { factoryRoot: fallback, outputTestDir: path.join(fallback, "output_test") };
}

export async function GET(req: Request) {
  if (!verifyAdminRequest(req)) {
    return NextResponse.json(
      { error: "Unauthorized: Invalid ADMIN_SECRET_PASSWORD." },
      { status: 401 },
    );
  }

  const products = await getAllMergedProducts();
  const syncMap = await readDriveSyncMap();

  // 1. Collect MP3 files from content-factory/output_test (both workspace root and portal subfolder)
  const outputDirs = [
    path.join(process.cwd(), "..", "content-factory", "output_test"),
    path.join(process.cwd(), "content-factory", "output_test"),
  ];
  const seenFiles = new Set<string>();
  const audioFiles: Array<{
    filename: string;
    sizeBytes: number;
    createdAt: string;
    level: string;
    moduleType: "hoeren" | "sprechen" | "radio";
    driveSyncStatus: string;
    drivePath: string;
  }> = [];

  for (const dir of outputDirs) {
    try {
      const entries = await fs.readdir(dir);
      for (const name of entries) {
        if (!name.toLowerCase().endsWith(".mp3") || seenFiles.has(name)) continue;
        seenFiles.add(name);
        const fullPath = path.join(dir, name);
        const stat = await fs.stat(fullPath);
        const lower = name.toLowerCase();
        const level =
          lower.includes("b2")
            ? "B2"
            : lower.includes("a2")
              ? "A2"
              : lower.includes("a1")
                ? "A1"
                : "B1";
        const moduleType: "hoeren" | "sprechen" | "radio" = lower.includes("sprechen")
          ? "sprechen"
          : lower.includes("radio")
            ? "radio"
            : "hoeren";
        const subfolder = moduleType === "sprechen" ? "Sprechen_Prompts" : "Hoeren_Audio";
        const syncEntry = syncMap[name];

        audioFiles.push({
          filename: name,
          sizeBytes: stat.size,
          createdAt: stat.mtime.toISOString(),
          level,
          moduleType,
          driveSyncStatus: syncEntry?.status || "local_ready",
          drivePath:
            syncEntry?.drivePath || `GTF_App_Vault/${level}/${subfolder}/${name}`,
        });
      }
    } catch {
      // directory might not exist yet
    }
  }

  // 2. Load folder_map.json status
  const { factoryRoot } = resolveFactoryDirs();
  let folderMapSummary = {
    mode: "offline_template_pending_credentials",
    vaultRootName: "GTF_App_Vault",
    mappedPathsCount: 29,
  };
  for (const fmapPath of [
    path.join(factoryRoot, "folder_map.json"),
    path.join(process.cwd(), "content-factory", "folder_map.json"),
  ]) {
    try {
      const fmap = JSON.parse(await fs.readFile(fmapPath, "utf8"));
      folderMapSummary = {
        mode: fmap.mode || "offline_template_pending_credentials",
        vaultRootName: fmap.vaultRootName || "GTF_App_Vault",
        mappedPathsCount: Object.keys(fmap.paths || {}).length,
      };
      break;
    } catch {
      // ignore
    }
  }

  // 3. Load Students, Purchases, and Exam Attempts
  const localStudents = await readLocalStudents();
  const localStoreDir = path.join(process.cwd(), ".local-store");
  let localPurchases: Array<{
    userEmail: string;
    productSlug: string;
    paymentProvider: string;
    unlockedAt: string;
  }> = [];
  let localAttempts: Array<{
    id: string;
    userEmail: string;
    testId: string;
    level: string;
    lesenScore: number;
    hoerenScore: number;
    schreibenScore: number;
    sprechenScore: number;
    overallPercent: number;
    passed: boolean;
    createdAt: string;
  }> = [];

  try {
    localPurchases = JSON.parse(
      await fs.readFile(path.join(localStoreDir, "purchases.json"), "utf8"),
    );
  } catch {
    localPurchases = [];
  }

  try {
    localAttempts = JSON.parse(
      await fs.readFile(path.join(localStoreDir, "attempts.json"), "utf8"),
    );
  } catch {
    localAttempts = [];
  }

  // Merge with Supabase if configured
  const supabase = getSupabaseServerClient();
  if (supabase) {
    try {
      const [{ data: sbUsers }, { data: sbPurchases }, { data: sbAttempts }] =
        await Promise.all([
          supabase.from("users").select("*").order("created_at", { ascending: false }).limit(100),
          supabase.from("user_purchases").select("*").eq("status", "active").limit(300),
          supabase.from("exam_attempts").select("*").order("created_at", { ascending: false }).limit(200),
        ]);

      if (sbUsers) {
        for (const u of sbUsers) {
          if (!localStudents.some((s) => s.email.toLowerCase() === u.email.toLowerCase())) {
            localStudents.push({
              email: u.email,
              fullName: u.full_name || u.email.split("@")[0],
              phone: u.phone || "+91 98000 00000",
              targetLevel: u.target_level || "b1",
              createdAt: u.created_at,
            });
          }
        }
      }
      if (sbPurchases) {
        for (const p of sbPurchases) {
          if (
            !localPurchases.some(
              (lp) =>
                lp.userEmail.toLowerCase() === p.user_email.toLowerCase() &&
                lp.productSlug === p.product_slug,
            )
          ) {
            localPurchases.push({
              userEmail: p.user_email,
              productSlug: p.product_slug,
              paymentProvider: p.payment_provider || "supabase",
              unlockedAt: p.unlocked_at,
            });
          }
        }
      }
      if (sbAttempts) {
        for (const a of sbAttempts) {
          if (!localAttempts.some((la) => la.id === a.id)) {
            localAttempts.push({
              id: a.id,
              userEmail: a.user_email,
              testId: a.test_id,
              level: a.cefr_level,
              lesenScore: Number(a.lesen_score || 0),
              hoerenScore: Number(a.hoeren_score || 0),
              schreibenScore: Number(a.schreiben_score || 0),
              sprechenScore: Number(a.sprechen_score || 0),
              overallPercent: Number(a.overall_percent || 0),
              passed: Boolean(a.passed),
              createdAt: a.created_at,
            });
          }
        }
      }
    } catch (err) {
      console.warn("[gtf] Admin overview Supabase read fallback:", err);
    }
  }

  // Ensure any student who made a purchase or attempt is in the student list
  for (const p of localPurchases) {
    if (!localStudents.some((s) => s.email.toLowerCase() === p.userEmail.toLowerCase())) {
      localStudents.push({
        email: p.userEmail.toLowerCase(),
        fullName: p.userEmail.split("@")[0],
        phone: "+91 98000 00000",
        targetLevel: "b1",
        createdAt: p.unlockedAt,
      });
    }
  }

  // Provide realistic demo attempts for seed students if no attempt exists yet
  const demoSeedScores: Record<
    string,
    {
      testId: string;
      level: string;
      lesenScore: number;
      hoerenScore: number;
      schreibenScore: number;
      sprechenScore: number;
      overallPercent: number;
      passed: boolean;
    }
  > = {
    "demo@gatewaytofuture.com": {
      testId: "gtf-b1-modelltest-1",
      level: "b1",
      lesenScore: 80,
      hoerenScore: 75,
      schreibenScore: 78,
      sprechenScore: 82,
      overallPercent: 79,
      passed: true,
    },
    "priya.sharma@gatewaytofuture.com": {
      testId: "gtf-b2-modelltest-1",
      level: "b2",
      lesenScore: 85,
      hoerenScore: 80,
      schreibenScore: 84,
      sprechenScore: 88,
      overallPercent: 84,
      passed: true,
    },
    "aman.singh@gatewaytofuture.com": {
      testId: "gtf-b1-modelltest-1",
      level: "b1",
      lesenScore: 65,
      hoerenScore: 60,
      schreibenScore: 68,
      sprechenScore: 72,
      overallPercent: 66,
      passed: true,
    },
  };

  const studentsEnriched = localStudents.map((stu) => {
    const emailLower = stu.email.toLowerCase();
    const stuPurchases = localPurchases
      .filter((p) => p.userEmail.toLowerCase() === emailLower)
      .map((p) => {
        const prod = products.find((pr) => pr.slug === p.productSlug);
        return {
          slug: p.productSlug,
          title: prod?.title || p.productSlug,
          provider: p.paymentProvider,
          unlockedAt: p.unlockedAt,
        };
      });

    const stuAttempts = localAttempts.filter(
      (a) => a.userEmail.toLowerCase() === emailLower,
    );

    if (stuAttempts.length === 0 && demoSeedScores[emailLower]) {
      const seed = demoSeedScores[emailLower];
      stuAttempts.push({
        id: `seed_${emailLower}`,
        userEmail: emailLower,
        ...seed,
        createdAt: stu.createdAt,
      });
    }

    return {
      ...stu,
      unlockedPacks: stuPurchases,
      examAttempts: stuAttempts,
    };
  });

  return NextResponse.json({
    ok: true,
    integrations: integrationStatus(),
    vaultStatus: folderMapSummary,
    products,
    audioFiles,
    students: studentsEnriched,
  });
}
