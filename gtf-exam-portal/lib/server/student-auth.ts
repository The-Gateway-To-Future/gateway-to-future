import { createHmac, timingSafeEqual, randomUUID } from "crypto";

export interface LocalAuthStudent {
  id: string;
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
  studentId?: string;
  name: string;
  email: string;
  phone: string;
  course: string;
  role: "student" | "admin";
  iat: number;
  exp: number;
}

const AUTH_SECRET = (
  process.env.MEDIA_TOKEN_SECRET ||
  process.env.ADMIN_SECRET_PASSWORD ||
  "gtf-master-secret"
).trim();

export function normalizeEmail(email: string): string {
  return (email || "").trim().toLowerCase();
}

export function hashPassword(password: string): string {
  return createHmac("sha256", AUTH_SECRET).update(password.trim()).digest("hex");
}

export function verifyPassword(password: string, hash: string): boolean {
  if (!password || !hash) return false;
  const computed = hashPassword(password);
  const bufA = Buffer.from(computed);
  const bufB = Buffer.from(hash);
  if (bufA.length !== bufB.length) return false;
  return timingSafeEqual(bufA, bufB);
}

function base64UrlEncode(str: string): string {
  return Buffer.from(str, "utf8").toString("base64url");
}

function base64UrlDecode(str: string): string {
  return Buffer.from(str, "base64url").toString("utf8");
}

/**
 * Creates an HMAC-SHA256 signed stateless session token encoding
 * { id, name, email, phone, course, role: "student", iat, exp }
 */
export function signStudentSessionToken(
  user: {
    id: string;
    studentId?: string;
    name: string;
    email: string;
    phone: string;
    course: string;
    role?: "student" | "admin";
  },
  expiresInDays = 30,
): string {
  const header = { alg: "HS256", typ: "JWT" };
  const iat = Math.floor(Date.now() / 1000);
  const exp = iat + 60 * 60 * 24 * expiresInDays;
  const studentIdentifier = user.studentId || (user.id?.startsWith("GTF-") ? user.id : `GTF-2026-${user.id.slice(-4).toUpperCase()}`);
  const fullPayload: StudentSessionPayload = {
    id: user.id,
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
  const signature = createHmac("sha256", AUTH_SECRET).update(dataToSign).digest("base64url");

  return `${dataToSign}.${signature}`;
}

/**
 * Validates and decodes the HMAC-SHA256 signed student session token.
 */
export function verifyStudentSessionToken(token?: string | null): StudentSessionPayload | null {
  if (!token) return null;
  const parts = token.split(".");
  if (parts.length !== 3) return null;

  const [encodedHeader, encodedPayload, signature] = parts;
  const dataToSign = `${encodedHeader}.${encodedPayload}`;
  const expectedSig = createHmac("sha256", AUTH_SECRET).update(dataToSign).digest("base64url");

  const bufSig = Buffer.from(signature);
  const bufExpected = Buffer.from(expectedSig);
  if (bufSig.length !== bufExpected.length || !timingSafeEqual(bufSig, bufExpected)) {
    return null;
  }

  try {
    const payload = JSON.parse(base64UrlDecode(encodedPayload)) as StudentSessionPayload;
    const now = Math.floor(Date.now() / 1000);
    if (payload.exp && payload.exp < now) {
      return null;
    }
    return payload;
  } catch {
    return null;
  }
}

// In-memory student cache for serverless execution (zero disk write crashes)
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
 * Asynchronous welcome & lead notification webhook to process.env.N8N_WEBHOOK_URL
 * (defaults to https://n8n.gatewaytofuture.com/webhook/firebase-auth-signup).
 * Non-blocking: fired in the background without delaying registration response.
 */
export function triggerStudentWelcomeWebhook(params: {
  studentId?: string;
  name: string;
  email: string;
  phone: string;
  course: string;
}): void {
  const webhookUrl =
    (process.env.N8N_WEBHOOK_URL || "").trim() ||
    "https://n8n.gatewaytofuture.com/webhook/firebase-auth-signup";

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
