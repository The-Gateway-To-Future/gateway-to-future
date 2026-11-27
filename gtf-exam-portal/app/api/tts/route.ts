import crypto from "crypto";
import fs from "fs";
import path from "path";
import { NextResponse } from "next/server";
import {
  auth as googleTtsAuth,
  texttospeech as createTtsClient,
} from "googleapis/build/src/apis/texttospeech";
import { requireVerifiedSession } from "@/lib/server/auth-session";
import { serverEnv } from "@/lib/server/env";
import { parseRange } from "@/lib/server/http-range";
import { checkRateLimit, rateLimitExceededResponse } from "@/lib/server/rate-limit";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const MAX_TEXT_LENGTH = 2000;
const MAX_CACHE_ENTRIES = 500;
const CACHE_CONTROL_IMMUTABLE = "public, max-age=31536000, immutable";

const globalForTts = globalThis as unknown as {
  __gtfTtsCache?: Map<string, Buffer>;
};

function getMemoryCache(): Map<string, Buffer> {
  if (!globalForTts.__gtfTtsCache) {
    globalForTts.__gtfTtsCache = new Map<string, Buffer>();
  }
  return globalForTts.__gtfTtsCache;
}

function setMemoryCache(key: string, buf: Buffer): void {
  const cache = getMemoryCache();
  if (cache.size >= MAX_CACHE_ENTRIES) {
    const oldestKey = cache.keys().next().value;
    if (oldestKey) cache.delete(oldestKey);
  }
  cache.set(key, buf);
}

async function synthesizeViaGoogleCloud(text: string): Promise<Buffer> {
  const hasServiceAccount = Boolean(
    serverEnv.googleClientEmail && serverEnv.googlePrivateKey,
  );

  const auth = hasServiceAccount
    ? new googleTtsAuth.JWT({
        email: serverEnv.googleClientEmail,
        key: serverEnv.googlePrivateKey,
        scopes: ["https://www.googleapis.com/auth/cloud-platform"],
      })
    : new googleTtsAuth.GoogleAuth({
        scopes: ["https://www.googleapis.com/auth/cloud-platform"],
        projectId:
          process.env.GOOGLE_CLOUD_PROJECT ||
          process.env.GCLOUD_PROJECT ||
          "gateway-to-future",
      });

  const tts = createTtsClient({ version: "v1", auth });
  const voiceCandidates = ["de-DE-Neural2-F", "de-DE-Journey-F"];

  let lastError: unknown;
  for (const voiceName of voiceCandidates) {
    try {
      const response = await tts.text.synthesize({
        requestBody: {
          input: { text },
          voice: {
            languageCode: "de-DE",
            name: voiceName,
          },
          audioConfig: {
            audioEncoding: "MP3",
            speakingRate: 0.92,
          },
        },
      });
      const audioContent = response.data.audioContent;
      if (audioContent) {
        return Buffer.from(audioContent, "base64");
      }
    } catch (err) {
      lastError = err;
    }
  }

  throw lastError instanceof Error
    ? lastError
    : new Error("Google Cloud TTS synthesis failed");
}

function buildAudioResponse(buf: Buffer, rangeHeader: string | null): Response {
  const parsed = parseRange(rangeHeader, buf.length);

  if (parsed === "unsatisfiable") {
    return new Response(null, {
      status: 416,
      headers: {
        "Content-Range": `bytes */${buf.length}`,
        "Cache-Control": CACHE_CONTROL_IMMUTABLE,
      },
    });
  }

  if (parsed) {
    const slice = buf.subarray(parsed.start, parsed.end + 1);
    return new Response(new Uint8Array(slice), {
      status: 206,
      headers: {
        "Content-Type": "audio/mpeg",
        "Accept-Ranges": "bytes",
        "Content-Range": `bytes ${parsed.start}-${parsed.end}/${buf.length}`,
        "Content-Length": String(slice.length),
        "Cache-Control": CACHE_CONTROL_IMMUTABLE,
        "X-Content-Type-Options": "nosniff",
      },
    });
  }

  return new Response(new Uint8Array(buf), {
    status: 200,
    headers: {
      "Content-Type": "audio/mpeg",
      "Accept-Ranges": "bytes",
      "Content-Length": String(buf.length),
      "Cache-Control": CACHE_CONTROL_IMMUTABLE,
      "X-Content-Type-Options": "nosniff",
    },
  });
}

export async function GET(req: Request) {
  const auth = await requireVerifiedSession(req);
  if (auth.response) return auth.response;

  const rl = checkRateLimit(`tts:${auth.session.uid}`, {
    limit: 120,
    windowMs: 60 * 60 * 1000,
  });
  if (!rl.allowed) return rateLimitExceededResponse(rl.resetAt);

  const { searchParams } = new URL(req.url);
  const rawText = searchParams.get("text") || "";
  const text = rawText.trim();

  if (!text) {
    return NextResponse.json(
      { error: "Missing ?text= query parameter" },
      { status: 400 },
    );
  }

  if (text.length > MAX_TEXT_LENGTH) {
    return NextResponse.json(
      { error: `Text exceeds maximum length (${MAX_TEXT_LENGTH} characters)` },
      { status: 400 },
    );
  }

  const hash = crypto.createHash("sha256").update(text, "utf8").digest("hex");
  const rangeHeader = req.headers.get("range");
  const cache = getMemoryCache();

  // 1. In-memory cache hit
  const memBuf = cache.get(hash);
  if (memBuf) {
    return buildAudioResponse(memBuf, rangeHeader);
  }

  // 2. Pre-synthesized static MP3 cache in public/audio/tts/<sha256>.mp3 (or canonical examiner sample in /audio/hoeren/)
  const CANONICAL_HOEREN_BY_HASH: Record<string, string> = {
    "2723d84925e8d414e68230958841c7d18e7e347e557a9940a3ec4766e2cc6a79": "a1_sprechen_examiner_sample.mp3",
    "9a26ef330b4fc99d1c026365f0ff72dac61eef56d5a8f4c84183ea981fb9fd2a": "gtf-a2-sprechen-prompt.mp3",
    "6b4683ebb7c8047866467007ec2836aebb0bc9f29874509362d72b3271521ef6": "b1_sprechen_examiner_sample.mp3",
    "da143fb1e302121e4981ba489ff98493224628e6115cbf61623ce9fa3ad9b40c": "b2_sprechen_examiner_sample.mp3",
  };
  const runtimeRoot = Reflect.apply(process.cwd, process, []) as string;
  const pubDir = path.join(runtimeRoot, "public");
  const canonicalHoerenFile = CANONICAL_HOEREN_BY_HASH[hash];
  const staticPath = canonicalHoerenFile
    ? path.join(pubDir, "audio", "hoeren", canonicalHoerenFile)
    : path.join(pubDir, "audio", "tts", `${hash}.mp3`);
  const staticCdnRel = canonicalHoerenFile
    ? `/audio/hoeren/${canonicalHoerenFile}`
    : `/audio/tts/${hash}.mp3`;
  try {
    if (fs.existsSync(staticPath)) {
      const fileBuf = fs.readFileSync(staticPath);
      if (fileBuf.length > 0) {
        setMemoryCache(hash, fileBuf);
        return buildAudioResponse(fileBuf, rangeHeader);
      }
    }
    const cdnRes = await fetch(new URL(staticCdnRel, req.url));
    if (cdnRes.ok) {
      const ab = await cdnRes.arrayBuffer();
      if (ab.byteLength > 0) {
        const fileBuf = Buffer.from(ab);
        setMemoryCache(hash, fileBuf);
        return buildAudioResponse(fileBuf, rangeHeader);
      }
    }
  } catch {
    // Fall through to live Google Cloud TTS synthesis
  }

  // 3. Live Google Cloud TTS (de-DE-Neural2-F / de-DE-Journey-F via ADC or SA)
  try {
    const mp3Buf = await synthesizeViaGoogleCloud(text);
    setMemoryCache(hash, mp3Buf);
    return buildAudioResponse(mp3Buf, rangeHeader);
  } catch (err) {
    console.warn("[gtf tts] Google Cloud TTS synthesis fallback to edge engine:", err);
    try {
      // Chunk cleanly at word/sentence boundaries (max 600 chars) instead of cutting mid-word at 300 chars
      const chunks: string[] = [];
      let remaining = text.slice(0, 600).trim();
      while (remaining.length > 0 && chunks.length < 4) {
        if (remaining.length <= 180) {
          chunks.push(remaining);
          break;
        }
        let splitIdx = remaining.lastIndexOf(". ", 180);
        if (splitIdx < 60) splitIdx = remaining.lastIndexOf(" ", 180);
        if (splitIdx < 40) splitIdx = 180;
        chunks.push(remaining.slice(0, splitIdx + 1).trim());
        remaining = remaining.slice(splitIdx + 1).trim();
      }

      const buffers: Buffer[] = [];
      for (const chunk of chunks) {
        const edgeUrl = `https://translate.google.com/translate_tts?ie=UTF-8&q=${encodeURIComponent(chunk)}&tl=de&client=tw-ob`;
        const edgeRes = await fetch(edgeUrl, {
          headers: {
            "User-Agent":
              "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
            Accept: "*/*",
          },
          signal: AbortSignal.timeout(8000),
        });
        if (edgeRes.ok) {
          const arrayBuf = await edgeRes.arrayBuffer();
          if (arrayBuf.byteLength > 0) {
            buffers.push(Buffer.from(arrayBuf));
          }
        }
      }
      if (buffers.length > 0) {
        const buf = Buffer.concat(buffers);
        setMemoryCache(hash, buf);
        return buildAudioResponse(buf, rangeHeader);
      }
    } catch (edgeErr) {
      console.error("[gtf tts] Edge audio synthesis failed:", edgeErr);
    }

    return NextResponse.json(
      { error: "Unable to synthesize German audio at this time." },
      { status: 503 },
    );
  }
}
