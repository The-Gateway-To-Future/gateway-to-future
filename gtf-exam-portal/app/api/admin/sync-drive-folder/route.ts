import { execFile } from "child_process";
import { promises as fs } from "fs";
import path from "path";
import { promisify } from "util";
import { NextResponse } from "next/server";
import { recordDriveSync, verifyAdminRequest } from "@/lib/server/admin-auth";

const execFileAsync = promisify(execFile);

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

async function findPythonExe(): Promise<string> {
  const candidates = [
    path.join(process.cwd(), "..", "content-factory", ".venv", "Scripts", "python.exe"),
    path.join(process.cwd(), "content-factory", ".venv", "Scripts", "python.exe"),
    path.join(process.cwd(), "..", "content-factory", ".venv", "bin", "python"),
    path.join(process.cwd(), "content-factory", ".venv", "bin", "python"),
  ];

  for (const exe of candidates) {
    try {
      await fs.access(exe);
      return exe;
    } catch {
      // try next candidate
    }
  }

  return process.platform === "win32" ? "python" : "python3";
}

async function findSyncScript(): Promise<{ scriptPath: string; workingDir: string }> {
  const candidates = [
    {
      scriptPath: path.join(process.cwd(), "..", "content-factory", "sync_a2_to_b1_drive.py"),
      workingDir: path.join(process.cwd(), "..", "content-factory"),
    },
    {
      scriptPath: path.join(process.cwd(), "content-factory", "sync_a2_to_b1_drive.py"),
      workingDir: path.join(process.cwd(), "content-factory"),
    },
  ];

  for (const c of candidates) {
    try {
      await fs.access(c.scriptPath);
      return c;
    } catch {
      // continue
    }
  }

  return candidates[0];
}

export async function POST(req: Request) {
  if (!verifyAdminRequest(req)) {
    return NextResponse.json(
      { error: "Unauthorized: Invalid ADMIN_SECRET_PASSWORD." },
      { status: 401 },
    );
  }

  try {
    let body: { folderName?: string; folderId?: string; skipAudio?: boolean } = {};
    try {
      body = (await req.json()) as typeof body;
    } catch {
      // Empty body is fine
    }

    const pythonExe = await findPythonExe();
    const { scriptPath, workingDir } = await findSyncScript();

    const args = [scriptPath, "--json"];
    if (body.folderName) {
      args.push("--folder-name", body.folderName);
    }
    if (body.folderId) {
      args.push("--folder-id", body.folderId);
    }
    if (body.skipAudio) {
      args.push("--no-audio");
    }

    let stdoutOutput = "";
    let stderrOutput = "";
    let exitCode = 0;

    try {
      const result = await execFileAsync(pythonExe, args, {
        cwd: workingDir,
        timeout: 180000,
        env: {
          ...process.env,
          PYTHONIOENCODING: "utf-8",
        },
      });
      stdoutOutput = result.stdout;
      stderrOutput = result.stderr;
    } catch (err: unknown) {
      exitCode = 1;
      const errorObj = err as { stdout?: string; stderr?: string; message?: string };
      stdoutOutput = errorObj.stdout || "";
      stderrOutput = errorObj.stderr || errorObj.message || String(err);
    }

    const combinedLog = `${stdoutOutput}\n${stderrOutput}`.trim();

    // Parse JSON block from stdout
    let parsedResult: Record<string, unknown> | null = null;
    const jsonMatch = stdoutOutput.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      try {
        parsedResult = JSON.parse(jsonMatch[0]) as Record<string, unknown>;
      } catch {
        // ignore parse error
      }
    }

    if (exitCode !== 0 && !parsedResult?.ok) {
      return NextResponse.json(
        {
          ok: false,
          error: "Failed to execute sync_a2_to_b1_drive.py",
          log: combinedLog.slice(-5000),
        },
        { status: 500 },
      );
    }

    // Record drive sync event
    await recordDriveSync("A2 to B1 Sync", {
      syncedAt: new Date().toISOString(),
      drivePath: "GTF_App_Vault/A2/",
      status: "synced",
    });

    return NextResponse.json({
      ok: true,
      message: "Google Drive folder 'A2 to B1' successfully synced and published!",
      result: parsedResult,
      log: combinedLog.slice(-5000),
      timestamp: new Date().toISOString(),
    });
  } catch (err: unknown) {
    return NextResponse.json(
      {
        ok: false,
        error: err instanceof Error ? err.message : String(err),
      },
      { status: 500 },
    );
  }
}
