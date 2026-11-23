import fs from "fs";
import path from "path";
import { NextResponse } from "next/server";
import { Readable } from "stream";
import { getDriveFileMeta, resolveDriveRef, streamDriveFile } from "@/lib/server/drive";
import { isDriveConfigured } from "@/lib/server/env";
import { PROTECTED_MEDIA_HEADERS, parseRange } from "@/lib/server/http-range";
import { verifyMediaToken } from "@/lib/server/media-token";
import { getOfflineDemoAudioBuffer } from "@/lib/server/wav-synth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function nodeStreamToWeb(stream: Readable): ReadableStream<Uint8Array> {
  return new ReadableStream<Uint8Array>({
    start(controller) {
      stream.on("data", (chunk: Buffer | Uint8Array) => {
        controller.enqueue(chunk instanceof Uint8Array ? chunk : new Uint8Array(chunk));
      });
      stream.on("end", () => controller.close());
      stream.on("error", (err) => controller.error(err));
    },
    cancel() {
      stream.destroy();
    },
  });
}

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const token = searchParams.get("token");
  const payload = verifyMediaToken(token, "audio");

  if (!payload) {
    return NextResponse.json(
      { error: "Invalid or expired audio stream token. Raw Drive file IDs are never accepted." },
      { status: 403 },
    );
  }

  const rangeHeader = req.headers.get("range");
  const src = payload.s;

  // 1. Live Google Drive Service Account streaming (with HTTP Range 206 support)
  if (isDriveConfigured() && (src.driveFileId || src.drivePath)) {
    try {
      const fileId = await resolveDriveRef(src);
      const meta = await getDriveFileMeta(fileId);
      const parsed = parseRange(rangeHeader, meta.size);

      if (parsed === "unsatisfiable") {
        return new Response(null, {
          status: 416,
          headers: {
            ...PROTECTED_MEDIA_HEADERS,
            "Content-Range": `bytes */${meta.size}`,
          },
        });
      }

      if (parsed) {
        const nodeStream = await streamDriveFile(fileId, parsed);
        const chunkLength = parsed.end - parsed.start + 1;
        return new Response(nodeStreamToWeb(nodeStream), {
          status: 206,
          headers: {
            ...PROTECTED_MEDIA_HEADERS,
            "Content-Type": meta.mimeType || "audio/mpeg",
            "Accept-Ranges": "bytes",
            "Content-Range": `bytes ${parsed.start}-${parsed.end}/${meta.size}`,
            "Content-Length": String(chunkLength),
          },
        });
      }

      const nodeStream = await streamDriveFile(fileId);
      return new Response(nodeStreamToWeb(nodeStream), {
        status: 200,
        headers: {
          ...PROTECTED_MEDIA_HEADERS,
          "Content-Type": meta.mimeType || "audio/mpeg",
          "Accept-Ranges": "bytes",
          "Content-Length": String(meta.size),
        },
      });
    } catch (err) {
      console.warn("[gtf] Drive audio stream fallback to offline synth:", err);
    }
  }

  // 2. Physical local MP3 or static CDN check (canonical /audio/hoeren/ and /audio/tts/)
  const candidateFilenames = [
    src.localFile,
    src.drivePath ? src.drivePath.split("/").pop() : "",
  ].filter(Boolean) as string[];

  const runtimeRoot = Reflect.apply(process.cwd, process, []) as string;
  const pubDir = path.join(runtimeRoot, "public");
  const cfDir = path.join(path.dirname(runtimeRoot), "content-factory");

  let localMp3Buf: Buffer | null = null;
  for (const filename of candidateFilenames) {
    // Support exercise-bound sub-paths (e.g. "exams/gtf-a1-modelltest-2/a1m2-hoeren-1.mp3",
    // "labs/a2-lab-01-wegbeschreibung.mp3") so identical teil ids in different tests can
    // never resolve to the same flat file name. Path traversal is rejected.
    const relPath = filename
      .replace(/\\/g, "/")
      .replace(/^\/?(public\/)?audio\/hoeren\//, "")
      .replace(/^\/+/, "");
    if (!relPath || relPath.startsWith("synth:") || relPath.split("/").includes("..")) continue;
    const cleanName = path.basename(relPath);
    const hasSubdir = relPath.includes("/");
    const searchDirs = hasSubdir
      ? [path.join(pubDir, "audio", "hoeren", ...relPath.split("/"))]
      : [
          path.join(pubDir, "audio", "hoeren", cleanName),
          path.join(pubDir, "audio", "tts", cleanName),
          path.join(cfDir, "output_test", cleanName),
        ];
    for (const p of searchDirs) {
      try {
        if (fs.existsSync(p)) {
          localMp3Buf = fs.readFileSync(p);
          break;
        }
      } catch {
        // continue
      }
    }
    if (localMp3Buf) break;

    // On Vercel Serverless (where public/** is excluded from Lambda bundle and served by static CDN)
    const cdnCandidates = hasSubdir
      ? [`/audio/hoeren/${relPath.split("/").map(encodeURIComponent).join("/")}`]
      : [`/audio/hoeren/${encodeURIComponent(cleanName)}`, `/audio/tts/${encodeURIComponent(cleanName)}`];
    for (const cdnRel of cdnCandidates) {
      try {
        const cdnRes = await fetch(new URL(cdnRel, req.url));
        if (cdnRes.ok) {
          const ab = await cdnRes.arrayBuffer();
          if (ab.byteLength > 0) {
            localMp3Buf = Buffer.from(ab);
            break;
          }
        }
      } catch {
        // continue
      }
    }
    if (localMp3Buf) break;
  }

  if (localMp3Buf) {
    const parsed = parseRange(rangeHeader, localMp3Buf.length);
    if (parsed === "unsatisfiable") {
      return new Response(null, {
        status: 416,
        headers: {
          ...PROTECTED_MEDIA_HEADERS,
          "Content-Range": `bytes */${localMp3Buf.length}`,
        },
      });
    }

    if (parsed) {
      const slice = localMp3Buf.subarray(parsed.start, parsed.end + 1);
      return new Response(new Uint8Array(slice), {
        status: 206,
        headers: {
          ...PROTECTED_MEDIA_HEADERS,
          "Content-Type": "audio/mpeg",
          "Accept-Ranges": "bytes",
          "Content-Range": `bytes ${parsed.start}-${parsed.end}/${localMp3Buf.length}`,
          "Content-Length": String(slice.length),
        },
      });
    }

    return new Response(new Uint8Array(localMp3Buf), {
      status: 200,
      headers: {
        ...PROTECTED_MEDIA_HEADERS,
        "Content-Type": "audio/mpeg",
        "Accept-Ranges": "bytes",
        "Content-Length": String(localMp3Buf.length),
      },
    });
  }

  // 3. Offline demo audio buffer (also honours HTTP 206 Range requests)
  const buf = getOfflineDemoAudioBuffer(src.localFile || src.drivePath || "gtf-demo", 14);
  const parsed = parseRange(rangeHeader, buf.length);

  if (parsed === "unsatisfiable") {
    return new Response(null, {
      status: 416,
      headers: {
        ...PROTECTED_MEDIA_HEADERS,
        "Content-Range": `bytes */${buf.length}`,
      },
    });
  }

  if (parsed) {
    const slice = buf.subarray(parsed.start, parsed.end + 1);
    return new Response(new Uint8Array(slice), {
      status: 206,
      headers: {
        ...PROTECTED_MEDIA_HEADERS,
        "Content-Type": "audio/wav",
        "Accept-Ranges": "bytes",
        "Content-Range": `bytes ${parsed.start}-${parsed.end}/${buf.length}`,
        "Content-Length": String(slice.length),
      },
    });
  }

  return new Response(new Uint8Array(buf), {
    status: 200,
    headers: {
      ...PROTECTED_MEDIA_HEADERS,
      "Content-Type": "audio/wav",
      "Accept-Ranges": "bytes",
      "Content-Length": String(buf.length),
    },
  });
}
