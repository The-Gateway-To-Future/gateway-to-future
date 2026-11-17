import crypto from "crypto";
import fs from "fs";
import path from "path";
import { NextResponse } from "next/server";
import { google } from "googleapis";
import { serverEnv } from "@/lib/server/env";
import { parseRange } from "@/lib/server/http-range";

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
    ? new google.auth.JWT({
        email: serverEnv.googleClientEmail,
        key: serverEnv.googlePrivateKey,
        scopes: ["https://www.googleapis.com/auth/cloud-platform"],
      })
    : new google.auth.GoogleAuth({
        scopes: ["https://www.googleapis.com/auth/cloud-platform"],
        projectId:
          process.env.GOOGLE_CLOUD_PROJECT ||
          process.env.GCLOUD_PROJECT ||
          "gateway-to-future",
      });

  const tts = google.texttospeech({ version: "v1", auth });
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

  // 2. Pre-synthesized static MP3 cache in public/audio/tts/<sha256>.mp3
  const staticPath = path.join(
    process.cwd(),
    "public",
    "audio",
    "tts",
    `${hash}.mp3`,
  );
  try {
    if (fs.existsSync(staticPath)) {
      const fileBuf = fs.readFileSync(staticPath);
      if (fileBuf.length > 0) {
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
      const cleanSnippet = text.slice(0, 300);
      const edgeUrl = `https://translate.google.com/translate_tts?ie=UTF-8&q=${encodeURIComponent(cleanSnippet)}&tl=de&client=tw-ob`;
      const edgeRes = await fetch(edgeUrl, {
        headers: {
          "User-Agent":
            "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
          Accept: "*/*",
        },
      });
      if (edgeRes.ok) {
        const arrayBuf = await edgeRes.arrayBuffer();
        const buf = Buffer.from(arrayBuf);
        if (buf.length > 0) {
          setMemoryCache(hash, buf);
          return buildAudioResponse(buf, rangeHeader);
        }
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
