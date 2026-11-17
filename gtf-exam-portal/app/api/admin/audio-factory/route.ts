import { execFile } from "child_process";
import { promises as fs } from "fs";
import path from "path";
import { promisify } from "util";
import { NextResponse } from "next/server";
import { recordDriveSync, verifyAdminRequest } from "@/lib/server/admin-auth";

const execFileAsync = promisify(execFile);

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

async function findFactoryDir(): Promise<string> {
  const candidates = [
    path.join(process.cwd(), "..", "content-factory"),
    path.join(process.cwd(), "content-factory"),
  ];
  for (const dir of candidates) {
    try {
      await fs.access(path.join(dir, "run_factory.py"));
      return dir;
    } catch {
      // continue
    }
  }
  return candidates[0];
}

async function findMp3FilePath(filename: string): Promise<string | null> {
  const safeName = path.basename(filename);
  if (!safeName.toLowerCase().endsWith(".mp3")) return null;

  const candidates = [
    path.join(process.cwd(), "..", "content-factory", "output_test", safeName),
    path.join(process.cwd(), "content-factory", "output_test", safeName),
  ];
  for (const filePath of candidates) {
    try {
      await fs.access(filePath);
      return filePath;
    } catch {
      // try next
    }
  }
  return null;
}

export async function GET(req: Request) {
  if (!verifyAdminRequest(req)) {
    return NextResponse.json(
      { error: "Unauthorized: Invalid ADMIN_SECRET_PASSWORD." },
      { status: 401 },
    );
  }

  const { searchParams } = new URL(req.url);
  const streamFile = searchParams.get("stream");

  if (!streamFile) {
    return NextResponse.json({ error: "Missing ?stream=<filename.mp3>" }, { status: 400 });
  }

  const fullPath = await findMp3FilePath(streamFile);
  if (!fullPath) {
    return NextResponse.json({ error: `MP3 track "${streamFile}" not found.` }, { status: 404 });
  }

  const buf = await fs.readFile(fullPath);
  return new Response(new Uint8Array(buf), {
    status: 200,
    headers: {
      "Content-Type": "audio/mpeg",
      "Content-Length": String(buf.length),
      "Accept-Ranges": "bytes",
      "Cache-Control": "no-store",
    },
  });
}

export async function POST(req: Request) {
  if (!verifyAdminRequest(req)) {
    return NextResponse.json(
      { error: "Unauthorized: Invalid ADMIN_SECRET_PASSWORD." },
      { status: 401 },
    );
  }

  try {
    const body = (await req.json()) as {
      action?: "run_factory" | "push_to_drive";
      mode?: "--test-run" | "--convert-pdfs" | "--harvest-radio" | "--full-cycle";
      filename?: string;
    };

    const factoryDir = await findFactoryDir();
    const outputDir = path.join(factoryDir, "output_test");
    await fs.mkdir(outputDir, { recursive: true });

    if (body.action === "run_factory") {
      const flag = body.mode || "--test-run";
      const allowedFlags = new Set([
        "--test-run",
        "--convert-pdfs",
        "--harvest-radio",
        "--full-cycle",
        "--init-drive",
      ]);
      const safeFlag = allowedFlags.has(flag) ? flag : "--test-run";

      let logOutput = "";
      try {
        const { stdout, stderr } = await execFileAsync(
          "python",
          [path.join(factoryDir, "run_factory.py"), safeFlag],
          {
            cwd: factoryDir,
            timeout: 120000,
          },
        );
        logOutput = `${stdout}\n${stderr}`.trim();
      } catch (err) {
        logOutput = `Python execution log: ${
          err instanceof Error ? err.message : String(err)
        }`;
      }

      const files = (await fs.readdir(outputDir)).filter((f) =>
        f.toLowerCase().endsWith(".mp3"),
      );

      return NextResponse.json({
        ok: true,
        action: "run_factory",
        mode: safeFlag,
        generatedCount: files.length,
        files,
        log: logOutput.slice(-4000),
      });
    }

    if (body.action === "push_to_drive") {
      const targetName = body.filename || "ALL";
      const allMp3s = (await fs.readdir(outputDir)).filter((f) =>
        f.toLowerCase().endsWith(".mp3"),
      );
      const toPush =
        targetName === "ALL"
          ? allMp3s
          : allMp3s.filter((f) => f === path.basename(targetName));

      if (toPush.length === 0) {
        return NextResponse.json(
          { error: "No matching MP3 files found in /content-factory/output_test/." },
          { status: 404 },
        );
      }

      const pushed: Array<{ filename: string; drivePath: string; status: string }> = [];

      for (const mp3Name of toPush) {
        const lower = mp3Name.toLowerCase();
        const level =
          lower.includes("b2")
            ? "B2"
            : lower.includes("a2")
              ? "A2"
              : lower.includes("a1")
                ? "A1"
                : "B1";
        const subfolder = lower.includes("sprechen")
          ? "Sprechen_Prompts"
          : "Hoeren_Audio";
        const drivePath = `GTF_App_Vault/${level}/${subfolder}/${mp3Name}`;
        let syncStatus = "synced_to_5tb_vault";

        const fullMp3Path = path.join(outputDir, mp3Name);
        try {
          const pyUpload = `
import json, sys
sys.path.insert(0, ${JSON.stringify(factoryDir)})
from drive_initializer import upload_file_to_vault
res = upload_file_to_vault(
    local_file_path=${JSON.stringify(fullMp3Path)},
    level=${JSON.stringify(level)},
    subfolder=${JSON.stringify(subfolder)},
    remote_filename=${JSON.stringify(mp3Name)}
)
print("GTF_UPLOAD_RES:" + json.dumps(res))
`;
          const { stdout } = await execFileAsync("python", ["-c", pyUpload], {
            cwd: factoryDir,
            timeout: 30000,
          });
          const idx = stdout.indexOf("GTF_UPLOAD_RES:");
          if (idx !== -1) {
            const parsed = JSON.parse(stdout.slice(idx + "GTF_UPLOAD_RES:".length).trim());
            syncStatus =
              parsed.status === "created" || parsed.status === "updated"
                ? "live_drive_uploaded"
                : "staged_in_5tb_vault";
          }
        } catch {
          syncStatus = "staged_in_5tb_vault";
        }

        await recordDriveSync(mp3Name, {
          syncedAt: new Date().toISOString(),
          drivePath,
          status: syncStatus,
        });

        pushed.push({
          filename: mp3Name,
          drivePath,
          status: syncStatus,
        });
      }

      return NextResponse.json({
        ok: true,
        action: "push_to_drive",
        pushedCount: pushed.length,
        pushed,
      });
    }

    return NextResponse.json({ error: "Invalid action." }, { status: 400 });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Audio Factory action failed." },
      { status: 500 },
    );
  }
}
