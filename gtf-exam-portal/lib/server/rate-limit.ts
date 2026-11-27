import { createHmac, timingSafeEqual } from "crypto";
import { NextResponse } from "next/server";
import { getEdgeSessionSecret } from "./auth-edge";

interface Bucket {
  timestamps: number[];
}

const globalForRateLimit = globalThis as unknown as {
  __gtfRateLimitBuckets?: Map<string, Bucket>;
};

function getStore(): Map<string, Bucket> {
  if (!globalForRateLimit.__gtfRateLimitBuckets) {
    globalForRateLimit.__gtfRateLimitBuckets = new Map<string, Bucket>();
  }
  return globalForRateLimit.__gtfRateLimitBuckets;
}

export interface RateLimitResult {
  allowed: boolean;
  remaining: number;
  resetAt: number;
}

/**
 * Sliding-window in-memory rate limiter for serverless / Node API routes.
 * Bounds memory usage by pruning expired buckets when store exceeds 2,000 keys.
 */
export function checkRateLimit(
  key: string,
  options: { limit: number; windowMs: number },
): RateLimitResult {
  const store = getStore();
  const now = Date.now();
  const windowStart = now - options.windowMs;

  if (store.size > 2000) {
    for (const [k, b] of store.entries()) {
      const kept = b.timestamps.filter((t) => t > windowStart);
      if (kept.length === 0) store.delete(k);
      else b.timestamps = kept;
    }
  }

  const bucket = store.get(key) || { timestamps: [] };
  bucket.timestamps = bucket.timestamps.filter((t) => t > windowStart);

  if (bucket.timestamps.length >= options.limit) {
    const oldest = bucket.timestamps[0] || now;
    const resetAt = oldest + options.windowMs;
    store.set(key, bucket);
    return { allowed: false, remaining: 0, resetAt };
  }

  bucket.timestamps.push(now);
  store.set(key, bucket);
  return {
    allowed: true,
    remaining: Math.max(0, options.limit - bucket.timestamps.length),
    resetAt: now + options.windowMs,
  };
}

export function rateLimitExceededResponse(resetAt: number): NextResponse {
  const retryAfterSec = Math.max(1, Math.ceil((resetAt - Date.now()) / 1000));
  return NextResponse.json(
    {
      ok: false,
      error: "Rate limit exceeded. Please wait before submitting another evaluation request.",
      retryAfterSeconds: retryAfterSec,
    },
    {
      status: 429,
      headers: {
        "Retry-After": String(retryAfterSec),
      },
    },
  );
}

/**
 * Signs an AI evaluation result (`schreiben` or `sprechen`) with server HMAC-SHA256
 * so `/api/exam/score` can reject client-forged AI scores.
 */
export function signAiEvaluation(params: {
  kind: "schreiben" | "sprechen";
  uid: string;
  itemId: string;
  score: number;
  cefrEstimate: string;
  evaluatedAt: string;
}): string {
  const secret = getEdgeSessionSecret();
  if (!secret) return "";
  const canonical = `${params.kind}|${params.uid}|${params.itemId}|${Math.round(params.score)}|${params.cefrEstimate}|${params.evaluatedAt}`;
  return createHmac("sha256", secret).update(canonical).digest("base64url");
}

export function verifyAiEvaluationToken(params: {
  kind: "schreiben" | "sprechen";
  uid: string;
  itemId: string;
  score: number;
  cefrEstimate: string;
  evaluatedAt: string;
  evalToken?: string | null;
}): boolean {
  const provided = (params.evalToken || "").trim();
  if (!provided) return false;
  const expected = signAiEvaluation(params);
  if (!expected) return false;
  const a = Buffer.from(provided);
  const b = Buffer.from(expected);
  if (a.length !== b.length) return false;
  return timingSafeEqual(a, b);
}
