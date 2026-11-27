/**
 * Edge-Runtime-Safe Cryptographic Session Verification (Web Crypto HMAC-SHA256).
 * Safe to import from `middleware.ts` — uses zero Node.js built-ins.
 */

export const GTF_SESSION_COOKIE = "gtf_session";
export const GTF_LEGACY_SESSION_COOKIE = "gtf_student_session";

export interface EdgeSessionPayload {
  id: string;
  uid?: string;
  studentId?: string;
  name: string;
  email: string;
  phone: string;
  course: string;
  role: "student" | "admin";
  iat: number;
  exp: number;
}

export function getEdgeSessionSecret(): string {
  const configured = (
    process.env.SESSION_SIGNING_SECRET ||
    process.env.MEDIA_TOKEN_SECRET ||
    ""
  ).trim();
  if (configured) return configured;
  if (process.env.NODE_ENV === "production") {
    return "";
  }
  return "gtf-dev-only-local-session-secret";
}

function base64UrlToUint8Array(b64url: string): Uint8Array {
  const normalized = b64url.replace(/-/g, "+").replace(/_/g, "/");
  const padded = normalized.padEnd(normalized.length + ((4 - (normalized.length % 4)) % 4), "=");
  const binary = atob(padded);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes;
}

function decodeBase64UrlJson<T>(b64url: string): T | null {
  try {
    const bytes = base64UrlToUint8Array(b64url);
    const json = new TextDecoder().decode(bytes);
    return JSON.parse(json) as T;
  } catch {
    return null;
  }
}

/**
 * Cryptographically verifies an HMAC-SHA256 signed `gtf_session` JWT in Edge Middleware.
 * Rejects unsigned tokens, prefix spoofing (`gtf_sec_*`), malformed JWTs, and expired tokens.
 */
export async function verifySessionTokenEdge(
  token?: string | null,
): Promise<EdgeSessionPayload | null> {
  const clean = (token || "").trim();
  if (!clean) return null;

  const secret = getEdgeSessionSecret();
  if (!secret) return null;

  const parts = clean.split(".");
  if (parts.length !== 3) return null;

  const [encodedHeader, encodedPayload, encodedSignature] = parts;
  if (!encodedHeader || !encodedPayload || !encodedSignature) return null;

  const header = decodeBase64UrlJson<{ alg?: string; typ?: string }>(encodedHeader);
  if (!header || header.alg !== "HS256") return null;

  try {
    const encoder = new TextEncoder();
    const cryptoKey = await crypto.subtle.importKey(
      "raw",
      encoder.encode(secret),
      { name: "HMAC", hash: "SHA-256" },
      false,
      ["verify"],
    );

    const dataBytes = encoder.encode(`${encodedHeader}.${encodedPayload}`);
    const sigBytes = base64UrlToUint8Array(encodedSignature);
    const validSig = await crypto.subtle.verify(
      "HMAC",
      cryptoKey,
      sigBytes as BufferSource,
      dataBytes,
    );
    if (!validSig) return null;

    const payload = decodeBase64UrlJson<EdgeSessionPayload>(encodedPayload);
    if (!payload || typeof payload.exp !== "number" || typeof payload.email !== "string") {
      return null;
    }

    const nowSec = Math.floor(Date.now() / 1000);
    if (payload.exp <= nowSec) return null;
    if (!payload.email.includes("@")) return null;

    return payload;
  } catch {
    return null;
  }
}
