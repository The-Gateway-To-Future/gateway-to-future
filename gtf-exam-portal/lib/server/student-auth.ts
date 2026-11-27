import { createHmac, randomBytes, scryptSync, timingSafeEqual } from "crypto";
import { getEdgeSessionSecret } from "./auth-edge";

export interface LocalAuthStudent {
  id: string;
  uid?: string;
  studentId?: string;
  name: string;
  email: string;
  phone: string;
  course: string;
  role: "student" | "admin";
  passwordHash: string;
  createdAt: string;
  updatedAt: string;
}

export interface StudentSessionPayload {
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

function requireSessionSecret(): string {
  const secret = getEdgeSessionSecret();
  if (!secret) {
    throw new Error(
      "SESSION_SIGNING_SECRET (or MEDIA_TOKEN_SECRET) must be configured in production.",
    );
  }
  return secret;
}

export function normalizeEmail(email: string): string {
  return (email || "").trim().toLowerCase();
}

/**
 * Salted scrypt password hash (`scrypt$<16-byte-hex-salt>$<64-byte-hex-key>`).
 */
export function hashPassword(password: string): string {
  const salt = randomBytes(16).toString("hex");
  const derived = scryptSync(password.trim(), salt, 64).toString("hex");
  return `scrypt$${salt}$${derived}`;
}

export function verifyPassword(password: string, storedHash: string): boolean {
  if (!password || !storedHash) return false;

  if (storedHash.startsWith("scrypt$")) {
    const parts = storedHash.split("$");
    if (parts.length !== 3) return false;
    const [, salt, expectedHex] = parts;
    if (!salt || !expectedHex) return false;
    try {
      const derived = scryptSync(password.trim(), salt, 64);
      const expected = Buffer.from(expectedHex, "hex");
      if (derived.length !== expected.length) return false;
      return timingSafeEqual(derived, expected);
    } catch {
      return false;
    }
  }

  return false;
}

function base64UrlEncode(str: string): string {
  return Buffer.from(str, "utf8").toString("base64url");
}

function base64UrlDecode(str: string): string {
  return Buffer.from(str, "base64url").toString("utf8");
}

/**
 * Creates an HMAC-SHA256 signed stateless session JWT encoding
 * { id, uid, studentId, name, email, phone, course, role, iat, exp }
 */
export function signStudentSessionToken(
  user: {
    id: string;
    uid?: string;
    studentId?: string;
    name: string;
    email: string;
    phone: string;
    course: string;
    role?: "student" | "admin";
  },
  expiresInDays = 30,
): string {
  const secret = requireSessionSecret();
  const header = { alg: "HS256", typ: "JWT" };
  const iat = Math.floor(Date.now() / 1000);
  const exp = iat + Math.max(300, Math.floor(60 * 60 * 24 * expiresInDays));
  const rawUid = (user.uid || user.id || "").trim();
  const studentIdentifier =
    user.studentId ||
    (user.id?.startsWith("GTF-")
      ? user.id
      : `GTF-2026-${(rawUid || "0001").slice(-4).toUpperCase()}`);

  const fullPayload: StudentSessionPayload = {
    id: user.id,
    uid: rawUid,
    studentId: studentIdentifier,
    name: user.name,
    email: normalizeEmail(user.email),
    phone: user.phone,
    course: user.course || "sprachakademie",
    role: user.role || "student",
    iat,
    exp,
  };

  const encodedHeader = base64UrlEncode(JSON.stringify(header));
  const encodedPayload = base64UrlEncode(JSON.stringify(fullPayload));
  const dataToSign = `${encodedHeader}.${encodedPayload}`;
  const signature = createHmac("sha256", secret).update(dataToSign).digest("base64url");

  return `${dataToSign}.${signature}`;
}

/**
 * Validates and decodes the HMAC-SHA256 signed student session token.
 */
export function verifyStudentSessionToken(token?: string | null): StudentSessionPayload | null {
  if (!token) return null;
  const secret = getEdgeSessionSecret();
  if (!secret) return null;

  const parts = token.split(".");
  if (parts.length !== 3) return null;

  const [encodedHeader, encodedPayload, signature] = parts;
  if (!encodedHeader || !encodedPayload || !signature) return null;

  try {
    const header = JSON.parse(base64UrlDecode(encodedHeader)) as { alg?: string };
    if (header.alg !== "HS256") return null;
  } catch {
    return null;
  }

  const dataToSign = `${encodedHeader}.${encodedPayload}`;
  const expectedSig = createHmac("sha256", secret).update(dataToSign).digest("base64url");

  const bufSig = Buffer.from(signature);
  const bufExpected = Buffer.from(expectedSig);
  if (bufSig.length !== bufExpected.length || !timingSafeEqual(bufSig, bufExpected)) {
    return null;
  }

  try {
    const payload = JSON.parse(base64UrlDecode(encodedPayload)) as StudentSessionPayload;
    const now = Math.floor(Date.now() / 1000);
    if (typeof payload.exp !== "number" || payload.exp <= now) {
      return null;
    }
    if (typeof payload.email !== "string" || !payload.email.includes("@")) {
      return null;
    }
    return payload;
  } catch {
    return null;
  }
}

// In-memory student cache for dev / serverless fallback (never overwrites existing emails)
const memoryStudentStore = new Map<string, LocalAuthStudent>();

export async function saveLocalStudent(student: LocalAuthStudent): Promise<void> {
  const normEmail = normalizeEmail(student.email);
  memoryStudentStore.set(normEmail, student);
}

export async function getLocalStudent(email: string): Promise<LocalAuthStudent | null> {
  const norm = normalizeEmail(email);
  return memoryStudentStore.get(norm) || null;
}

/**
 * Asynchronous welcome & lead notification webhook to process.env.N8N_WEBHOOK_URL.
 * Only called server-side once per verified registration.
 */
export function triggerStudentWelcomeWebhook(params: {
  studentId?: string;
  name: string;
  email: string;
  phone: string;
  course: string;
}): void {
  const webhookUrl = (process.env.N8N_WEBHOOK_URL || "").trim();
  if (!webhookUrl) return;

  try {
    fetch(webhookUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-GTF-Source": "gtf-exam-portal",
      },
      body: JSON.stringify({
        event: "student_registered",
        studentId: params.studentId || "",
        fullName: params.name,
        name: params.name,
        email: params.email,
        phone: params.phone,
        course: params.course || "A1",
        portal_url: "https://app.gatewaytofuture.com/dashboard",
        timestamp: new Date().toISOString(),
      }),
      signal: AbortSignal.timeout(5000),
    }).catch((err) => {
      console.warn("[gtf-webhook] n8n welcome webhook dispatch notice:", err?.message || err);
    });
  } catch {
    // Silently ignore webhook dispatch failures so registration never blocks
  }
}
