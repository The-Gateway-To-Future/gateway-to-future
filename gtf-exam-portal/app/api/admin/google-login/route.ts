import { execFile } from "child_process";
import { promises as fs } from "fs";
import path from "path";
import { promisify } from "util";
import { NextResponse } from "next/server";
import { verifyAdminRequest } from "@/lib/server/admin-auth";

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

async function findScript(): Promise<{ scriptPath: string; workingDir: string }> {
  const candidates = [
    {
      scriptPath: path.join(process.cwd(), "..", "content-factory", "auto_drive_login.py"),
      workingDir: path.join(process.cwd(), "..", "content-factory"),
    },
    {
      scriptPath: path.join(process.cwd(), "content-factory", "auto_drive_login.py"),
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

export async function GET(req: Request) {
  if (!verifyAdminRequest(req)) {
    return NextResponse.json(
      { error: "Unauthorized: Invalid ADMIN_SECRET_PASSWORD." },
      { status: 401 },
    );
  }

  try {
    const pythonExe = await findPythonExe();
    const { scriptPath, workingDir } = await findScript();

    const { stdout } = await execFileAsync(pythonExe, [scriptPath, "--status", "--json"], {
      cwd: workingDir,
      timeout: 15000,
      env: { ...process.env, PYTHONIOENCODING: "utf-8" },
    });

    const jsonMatch = stdout.match(/\{[\s\S]*\}/);
    const parsed = jsonMatch ? JSON.parse(jsonMatch[0]) : { ok: true, raw: stdout };

    return NextResponse.json(parsed);
  } catch (err: unknown) {
    return NextResponse.json(
      { ok: false, error: err instanceof Error ? err.message : String(err) },
      { status: 500 },
    );
  }
}

export async function POST(req: Request) {
  if (!verifyAdminRequest(req)) {
    return NextResponse.json(
      { error: "Unauthorized: Invalid ADMIN_SECRET_PASSWORD." },
      { status: 401 },
    );
  }

  try {
    const body = (await req.json()) as { action?: "scan" | "oauth" };
    const action = body.action || "scan";

    const pythonExe = await findPythonExe();
    const { scriptPath, workingDir } = await findScript();

    const flag = action === "oauth" ? "--oauth" : "--scan";

    const { stdout, stderr } = await execFileAsync(pythonExe, [scriptPath, flag, "--json"], {
      cwd: workingDir,
      timeout: action === "oauth" ? 75000 : 20000,
      env: { ...process.env, PYTHONIOENCODING: "utf-8" },
    });

    const combined = `${stdout}\n${stderr}`;
    const jsonMatch = stdout.match(/\{[\s\S]*\}/);
    const result = jsonMatch ? JSON.parse(jsonMatch[0]) : { ok: true, output: combined };

    return NextResponse.json({
      ok: true,
      action,
      result,
      log: combined.slice(-4000),
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
