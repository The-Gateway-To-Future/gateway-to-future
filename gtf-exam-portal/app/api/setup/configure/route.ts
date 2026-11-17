import { NextResponse } from "next/server";
import fs from "fs";
import path from "path";
import {
  executeDriveInitializer,
  isKeyConfigured,
  maskSecret,
  normalizeDriveFolderId,
  normalizePrivateKey,
  parseEnvFile,
  runAllProbes,
  updateEnvFiles,
} from "@/lib/server/setup-probes";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function isProduction(): boolean {
  return process.env.NODE_ENV === "production";
}

function resolveLocalPaths() {
  const portalDir = path.resolve(process.cwd());
  const rootDir = path.resolve(portalDir, "..");
  const envPath = fs.existsSync(path.join(portalDir, ".env.local"))
    ? path.join(portalDir, ".env.local")
    : path.join(rootDir, ".env.local");

  const schemaCandidates = [
    path.join(portalDir, "schema.sql"),
    path.join(rootDir, "schema.sql"),
    path.join(portalDir, "gtf-exam-portal", "schema.sql"),
  ];
  const schemaPath = schemaCandidates.find((p) => fs.existsSync(p));

  const folderMapCandidates = [
    path.join(rootDir, "content-factory", "folder_map.json"),
    path.join(portalDir, "content-factory", "folder_map.json"),
  ];
  const folderMapPath = folderMapCandidates.find((p) => fs.existsSync(p));

  const audioCheckPaths = [
    path.join(rootDir, "content-factory", "output_test", "b1_hoeren_dialogue_sample.mp3"),
    path.join(portalDir, "content-factory", "output_test", "b1_hoeren_dialogue_sample.mp3"),
  ];
  const hasAudio = audioCheckPaths.some((p) => fs.existsSync(p));

  return { envPath, schemaPath, folderMapPath, hasAudio };
}

export async function GET() {
  if (isProduction()) {
    return NextResponse.json(
      { error: "Visual setup wizard is strictly disabled in production environments." },
      { status: 403 },
    );
  }

  const { envPath, schemaPath, folderMapPath, hasAudio } = resolveLocalPaths();
  const envMap = parseEnvFile(envPath);

  // Read schema.sql content
  let schemaContent = "-- schema.sql not found";
  if (schemaPath && fs.existsSync(schemaPath)) {
    try {
      schemaContent = fs.readFileSync(schemaPath, "utf8");
    } catch {
      schemaContent = "-- Error reading schema.sql";
    }
  }

  // Read folder_map.json
  let vaultStatus = {
    mode: "offline_template_pending_credentials",
    vaultRootName: "GTF_App_Vault",
    mappedPathsCount: 0,
    generatedAt: "",
  };
  if (folderMapPath && fs.existsSync(folderMapPath)) {
    try {
      const fmap = JSON.parse(fs.readFileSync(folderMapPath, "utf8"));
      vaultStatus = {
        mode: fmap.mode || "offline_template_pending_credentials",
        vaultRootName: fmap.vaultRootName || "GTF_App_Vault",
        mappedPathsCount: Object.keys(fmap.paths || {}).length,
        generatedAt: fmap.generatedAt || "",
      };
    } catch {
      // ignore
    }
  }

  const clientEmail = envMap.get("GOOGLE_CLIENT_EMAIL") || process.env.GOOGLE_CLIENT_EMAIL || "";
  const privateKey = envMap.get("GOOGLE_PRIVATE_KEY") || process.env.GOOGLE_PRIVATE_KEY || "";
  const rootFolderId =
    envMap.get("GOOGLE_DRIVE_ROOT_FOLDER_ID") || process.env.GOOGLE_DRIVE_ROOT_FOLDER_ID || "";
  const groqKey = envMap.get("GROQ_API_KEY") || process.env.GROQ_API_KEY || "";
  const geminiKey = envMap.get("GEMINI_API_KEY") || process.env.GEMINI_API_KEY || "";
  const supabaseUrl =
    envMap.get("NEXT_PUBLIC_SUPABASE_URL") || process.env.NEXT_PUBLIC_SUPABASE_URL || "";
  const supabaseAnonKey =
    envMap.get("NEXT_PUBLIC_SUPABASE_ANON_KEY") || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "";
  const supabaseServiceKey =
    envMap.get("SUPABASE_SERVICE_ROLE_KEY") || process.env.SUPABASE_SERVICE_ROLE_KEY || "";
  const adminPassword =
    envMap.get("ADMIN_SECRET_PASSWORD") || process.env.ADMIN_SECRET_PASSWORD || "gtf-berlin-founder-2026";

  const probes = await runAllProbes({
    clientEmail,
    privateKey,
    driveRootFolderId: rootFolderId,
    groqApiKey: groqKey,
    geminiApiKey: geminiKey,
    supabaseUrl,
    supabaseServiceRoleKey: supabaseServiceKey,
  });

  return NextResponse.json({
    ok: true,
    isProduction: false,
    config: {
      googleClientEmail: clientEmail,
      googleDriveRootFolderId: rootFolderId,
      hasPrivateKey: isKeyConfigured(privateKey),
      groqApiKeyMasked: maskSecret(groqKey),
      geminiApiKeyMasked: maskSecret(geminiKey),
      supabaseUrl,
      supabaseAnonKeyMasked: maskSecret(supabaseAnonKey),
      supabaseServiceRoleKeyMasked: maskSecret(supabaseServiceKey),
      adminSecretPassword: adminPassword,
    },
    probes,
    vaultStatus,
    hasAudio,
    schemaSql: schemaContent,
  });
}

export async function POST(req: Request) {
  if (isProduction()) {
    return NextResponse.json(
      { error: "Visual setup wizard is strictly disabled in production environments." },
      { status: 403 },
    );
  }

  try {
    const body = await req.json();
    const updates: Record<string, string> = {};

    if (typeof body.googleClientEmail === "string") {
      updates.GOOGLE_CLIENT_EMAIL = body.googleClientEmail.trim();
    }

    if (typeof body.googlePrivateKey === "string" && body.googlePrivateKey.trim()) {
      const normalized = normalizePrivateKey(body.googlePrivateKey);
      if (normalized) {
        updates.GOOGLE_PRIVATE_KEY = normalized;
      }
    }

    if (typeof body.googleDriveRootFolderId === "string") {
      const normalizedFolderId = normalizeDriveFolderId(body.googleDriveRootFolderId);
      if (normalizedFolderId) {
        updates.GOOGLE_DRIVE_ROOT_FOLDER_ID = normalizedFolderId;
      }
    }

    if (typeof body.groqApiKey === "string" && body.groqApiKey.trim()) {
      updates.GROQ_API_KEY = body.groqApiKey.trim();
    }

    if (typeof body.geminiApiKey === "string" && body.geminiApiKey.trim()) {
      updates.GEMINI_API_KEY = body.geminiApiKey.trim();
    }

    if (typeof body.supabaseUrl === "string") {
      updates.NEXT_PUBLIC_SUPABASE_URL = body.supabaseUrl.trim();
    }

    if (typeof body.supabaseAnonKey === "string" && body.supabaseAnonKey.trim()) {
      updates.NEXT_PUBLIC_SUPABASE_ANON_KEY = body.supabaseAnonKey.trim();
    }

    if (typeof body.supabaseServiceRoleKey === "string" && body.supabaseServiceRoleKey.trim()) {
      updates.SUPABASE_SERVICE_ROLE_KEY = body.supabaseServiceRoleKey.trim();
    }

    if (typeof body.adminSecretPassword === "string" && body.adminSecretPassword.trim()) {
      updates.ADMIN_SECRET_PASSWORD = body.adminSecretPassword.trim();
    }

    // Write updates to .env.local
    if (Object.keys(updates).length > 0) {
      updateEnvFiles(updates);
    }

    // Trigger drive initializer
    let driveInitResult = { success: true, output: "Vault initializer scheduled." };
    if (body.runDriveInit !== false) {
      driveInitResult = await executeDriveInitializer();
    }

    // Re-check probes with updated keys
    const probes = await runAllProbes({
      clientEmail: updates.GOOGLE_CLIENT_EMAIL || process.env.GOOGLE_CLIENT_EMAIL,
      privateKey: updates.GOOGLE_PRIVATE_KEY || process.env.GOOGLE_PRIVATE_KEY,
      driveRootFolderId:
        updates.GOOGLE_DRIVE_ROOT_FOLDER_ID || process.env.GOOGLE_DRIVE_ROOT_FOLDER_ID,
      groqApiKey: updates.GROQ_API_KEY || process.env.GROQ_API_KEY,
      geminiApiKey: updates.GEMINI_API_KEY || process.env.GEMINI_API_KEY,
      supabaseUrl: updates.NEXT_PUBLIC_SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL,
      supabaseServiceRoleKey:
        updates.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY,
    });

    const { folderMapPath } = resolveLocalPaths();
    let vaultStatus = {
      mode: "offline_template_pending_credentials",
      vaultRootName: "GTF_App_Vault",
      mappedPathsCount: 0,
    };
    if (folderMapPath && fs.existsSync(folderMapPath)) {
      try {
        const fmap = JSON.parse(fs.readFileSync(folderMapPath, "utf8"));
        vaultStatus = {
          mode: fmap.mode || "offline_template_pending_credentials",
          vaultRootName: fmap.vaultRootName || "GTF_App_Vault",
          mappedPathsCount: Object.keys(fmap.paths || {}).length,
        };
      } catch {
        // ignore
      }
    }

    return NextResponse.json({
      ok: true,
      message: "Configuration successfully saved and vault synchronized!",
      probes,
      vaultStatus,
      driveInitResult,
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Failed to save configuration";
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}
