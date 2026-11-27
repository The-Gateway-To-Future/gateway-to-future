import { createHmac, timingSafeEqual } from "crypto";

/**
 * Server-only store & token gate for direct Berlin Desk phone/WhatsApp details.
 * Never import this file from client components.
 */
export const PAID_APPOINTMENT_COOKIE = "gtf_paid_appointment";

export const CONSULTATION_ELIGIBLE_SLUGS = new Set([
  "gtf-berlin-consultation",
  "gtf-all-access-pass",
  "studienkolleg-all-access",
  "ausbildung-os-pro",
  "ausbildung-os-fast-track",
]);

export interface DirectDeskContact {
  deskName: string;
  phoneDisplay: string;
  phoneE164: string;
  whatsappUrl: string;
  email: string;
  headquarters: string;
}

export interface PaidAppointmentPayload {
  bookingRef: string;
  email: string;
  fullName?: string;
  pathway?: string;
  preferredSlot?: string;
  tierKey: string;
  paidAt: string;
  exp: number;
}

export function getDirectDeskContact(): DirectDeskContact {
  const phoneDisplay = (process.env.GTF_DIRECT_PHONE || "+49 1522 8372894").trim();
  const phoneE164 = phoneDisplay.replace(/[^+\d]/g, "") || "+4915228372894";
  const digitsOnly = phoneE164.replace(/^\+/, "");
  const whatsappUrl = (
    process.env.GTF_DIRECT_WHATSAPP_URL || `https://wa.me/${digitsOnly}`
  ).trim();

  return {
    deskName: "Gateway To Future — Berlin & India Advisory Desk",
    phoneDisplay,
    phoneE164,
    whatsappUrl,
    email: "ashusharma@gatewaytofuture.com",
    headquarters: "Schönefelder Straße 2, GStU, 12355 Berlin, Germany",
  };
}

function getSigningSecret(): string {
  const configured = (
    process.env.SESSION_SIGNING_SECRET ||
    process.env.MEDIA_TOKEN_SECRET ||
    process.env.RAZORPAY_KEY_SECRET ||
    ""
  ).trim();
  if (configured) return configured;
  if (process.env.NODE_ENV === "production") {
    return "";
  }
  return "gtf-dev-only-appointment-signing-key";
}

function b64urlEncode(input: string | Buffer): string {
  return Buffer.from(input)
    .toString("base64")
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");
}

function b64urlDecode(input: string): string {
  const normalized = input.replace(/-/g, "+").replace(/_/g, "/");
  const padded = normalized + "=".repeat((4 - (normalized.length % 4)) % 4);
  return Buffer.from(padded, "base64").toString("utf8");
}

function signBody(encodedPayload: string): string {
  const secret = getSigningSecret();
  if (!secret) {
    throw new Error("SESSION_SIGNING_SECRET or MEDIA_TOKEN_SECRET must be set in production.");
  }
  return b64urlEncode(
    createHmac("sha256", secret).update(encodedPayload).digest(),
  );
}

export function signPaidAppointmentToken(
  data: Omit<PaidAppointmentPayload, "exp">,
  ttlSeconds = 60 * 60 * 24 * 30,
): string {
  const payload: PaidAppointmentPayload = {
    ...data,
    exp: Math.floor(Date.now() / 1000) + ttlSeconds,
  };
  const encoded = b64urlEncode(JSON.stringify(payload));
  const sig = signBody(encoded);
  return `${encoded}.${sig}`;
}

export function verifyPaidAppointmentToken(
  token: string | undefined | null,
): PaidAppointmentPayload | null {
  if (!token || !token.includes(".")) return null;
  if (!getSigningSecret()) return null;
  const parts = token.split(".");
  if (parts.length !== 2) return null;
  const [encoded, sig] = parts;
  if (!encoded || !sig) return null;

  const expected = signBody(encoded);
  const sigBuf = Buffer.from(sig);
  const expBuf = Buffer.from(expected);
  if (sigBuf.length !== expBuf.length || !timingSafeEqual(sigBuf, expBuf)) {
    return null;
  }

  try {
    const payload = JSON.parse(b64urlDecode(encoded)) as PaidAppointmentPayload;
    if (!payload || typeof payload.exp !== "number") return null;
    if (payload.exp < Math.floor(Date.now() / 1000)) return null;
    if (!payload.bookingRef || !payload.email) return null;
    return payload;
  } catch {
    return null;
  }
}
