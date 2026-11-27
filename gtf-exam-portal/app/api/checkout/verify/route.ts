import { createHmac, timingSafeEqual } from "crypto";
import { NextResponse } from "next/server";
import { upsertLocalStudent } from "@/lib/server/admin-auth";
import { getVerifiedSession } from "@/lib/server/auth-session";
import { grantProductUnlock } from "@/lib/server/catalog";
import {
  getDirectDeskContact,
  PAID_APPOINTMENT_COOKIE,
  signPaidAppointmentToken,
} from "@/lib/server/consultation-contact";
import { serverEnv } from "@/lib/server/env";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type CheckoutTierKey =
  | "single_module"
  | "level_bundle"
  | "studienkolleg_track"
  | "all_access_pass"
  | "consultation_session"
  | "ausbildung_os_pro"
  | "ausbildung_os_fast_track";

interface VerifyCheckoutBody {
  orderId?: string;
  paymentId?: string;
  signature?: string;
  productSlug?: string;
  tierKey?: CheckoutTierKey;
  userEmail?: string;
  studentName?: string;
  appointmentDetails?: {
    pathway?: string;
    preferredSlot?: string;
    notes?: string;
  };
}

const TIER_PRICES_INR: Record<CheckoutTierKey, number> = {
  single_module: 499,
  consultation_session: 1000,
  level_bundle: 1999,
  studienkolleg_track: 2999,
  all_access_pass: 4999,
  ausbildung_os_pro: 14999,
  ausbildung_os_fast_track: 45000,
};

const CONSULTATION_ELIGIBLE_TIERS = new Set<CheckoutTierKey>([
  "consultation_session",
  "all_access_pass",
  "ausbildung_os_fast_track",
]);

function safeCompareHex(a: string, b: string): boolean {
  const bufA = Buffer.from(a);
  const bufB = Buffer.from(b);
  if (bufA.length !== bufB.length) return false;
  return timingSafeEqual(bufA, bufB);
}

/**
 * Verifies a Razorpay checkout completion callback via:
 *  1. HMAC-SHA256 (`${orderId}|${paymentId}` signed with `RAZORPAY_KEY_SECRET`), AND
 *  2. Server-to-server Razorpay Order lookup (`GET /v1/orders/{orderId}`) verifying
 *     actual paid `amount` and reading canonical `tierKey`, `productSlug`, and `userEmail`
 *     from Razorpay's immutable `order.notes` (prevents ₹499 → ₹4,999 / ₹45,000 tier substitution).
 */
export async function POST(req: Request) {
  try {
    const body = (await req.json()) as VerifyCheckoutBody;
    const session = await getVerifiedSession(req);
    const orderId = (body.orderId || "").trim();
    const paymentId = (body.paymentId || "").trim();
    const signature = (body.signature || "").trim();

    if (!orderId) {
      return NextResponse.json({ error: "Missing `orderId`." }, { status: 400 });
    }

    const keyId = (
      process.env.RAZORPAY_KEY_ID ||
      process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID ||
      ""
    ).trim();
    const keySecret = (process.env.RAZORPAY_KEY_SECRET || "").trim();
    const isSandboxDevOrder =
      process.env.NODE_ENV !== "production" &&
      !keySecret &&
      orderId.startsWith("order_gtf_inr_");

    let resolvedEmail = (session?.email || body.userEmail || "").toLowerCase().trim();
    let resolvedName = (
      session?.name ||
      body.studentName ||
      resolvedEmail.split("@")[0] ||
      "GTF Candidate"
    ).trim();
    let resolvedTierKey: CheckoutTierKey =
      body.tierKey && body.tierKey in TIER_PRICES_INR ? body.tierKey : "single_module";
    let resolvedSlug = (body.productSlug || "").trim();
    let verifiedAmountInr = TIER_PRICES_INR[resolvedTierKey];

    if (!isSandboxDevOrder) {
      if (!keySecret || !keyId) {
        return NextResponse.json(
          { error: "Payment verification credentials are not configured on the server." },
          { status: 503 },
        );
      }
      if (!paymentId || !signature) {
        return NextResponse.json(
          { error: "Missing Razorpay paymentId or HMAC signature." },
          { status: 400 },
        );
      }

      const expectedSignature = createHmac("sha256", keySecret)
        .update(`${orderId}|${paymentId}`)
        .digest("hex");

      if (!safeCompareHex(signature, expectedSignature)) {
        return NextResponse.json(
          { error: "Invalid payment signature. Entitlement was not granted." },
          { status: 401 },
        );
      }

      // Server-to-server verification against Razorpay Orders API (prevents tier/amount spoofing)
      const authHeader = Buffer.from(`${keyId}:${keySecret}`).toString("base64");
      const orderRes = await fetch(
        `https://api.razorpay.com/v1/orders/${encodeURIComponent(orderId)}`,
        {
          headers: { Authorization: `Basic ${authHeader}` },
          signal: AbortSignal.timeout(8000),
        },
      );
      if (!orderRes.ok) {
        return NextResponse.json(
          { error: "Unable to verify Razorpay order record with payment gateway." },
          { status: 502 },
        );
      }

      const rzpOrder = (await orderRes.json()) as {
        id?: string;
        amount?: number;
        amount_paid?: number;
        currency?: string;
        status?: string;
        notes?: Record<string, string>;
      };

      if (rzpOrder.status !== "paid" && (rzpOrder.amount_paid || 0) < (rzpOrder.amount || 1)) {
        return NextResponse.json(
          { error: "Payment has not been captured by Razorpay yet." },
          { status: 402 },
        );
      }

      const notes = rzpOrder.notes || {};
      const orderTier = notes.tierKey as CheckoutTierKey | undefined;
      if (orderTier && orderTier in TIER_PRICES_INR) {
        resolvedTierKey = orderTier;
      }
      if (notes.productSlug) {
        resolvedSlug = notes.productSlug.trim();
      }
      if (notes.userEmail && notes.userEmail.includes("@")) {
        resolvedEmail = notes.userEmail.toLowerCase().trim();
      }
      if (notes.studentName) {
        resolvedName = notes.studentName.trim();
      }

      const minRequiredPaise = TIER_PRICES_INR[resolvedTierKey] * 100;
      const actualPaidPaise = Math.max(rzpOrder.amount_paid || 0, rzpOrder.amount || 0);
      if (actualPaidPaise < minRequiredPaise) {
        return NextResponse.json(
          {
            error:
              "Paid amount does not match the requested tier price. Entitlement was not granted.",
          },
          { status: 402 },
        );
      }
      verifiedAmountInr = Math.round(actualPaidPaise / 100);
    }

    if (!resolvedEmail || !resolvedEmail.includes("@")) {
      return NextResponse.json(
        { error: "A verified candidate email is required to confirm booking or Pro access." },
        { status: 400 },
      );
    }

    await upsertLocalStudent({
      email: resolvedEmail,
      fullName: resolvedName,
      phone: session?.phone || "+91 98765 43210",
      targetLevel: "b1",
    });

    const primarySlug =
      resolvedTierKey === "consultation_session"
        ? "gtf-berlin-consultation"
        : resolvedTierKey === "ausbildung_os_pro"
          ? "ausbildung-os-pro"
          : resolvedTierKey === "ausbildung_os_fast_track"
            ? "ausbildung-os-fast-track"
            : resolvedTierKey === "all_access_pass"
              ? "gtf-all-access-pass"
              : resolvedTierKey === "level_bundle"
                ? resolvedSlug || "gtf-level-bundle"
                : resolvedSlug || "studienkolleg-all-access";

    await grantProductUnlock({
      userEmail: resolvedEmail,
      uid: session?.uid,
      productSlug: primarySlug,
      fullName: resolvedName,
      paymentProvider: isSandboxDevOrder ? "razorpay-sandbox" : "razorpay",
      paymentReference: paymentId || orderId,
      amountPaid: verifiedAmountInr,
      currency: "INR",
    });

    if (
      resolvedTierKey === "all_access_pass" &&
      resolvedSlug &&
      resolvedSlug !== "gtf-all-access-pass" &&
      resolvedSlug !== "ausbildung-os-pro" &&
      resolvedSlug !== "ausbildung-os-fast-track"
    ) {
      await grantProductUnlock({
        userEmail: resolvedEmail,
        uid: session?.uid,
        productSlug: resolvedSlug,
        fullName: resolvedName,
        paymentProvider: isSandboxDevOrder ? "razorpay-sandbox" : "razorpay",
        paymentReference: paymentId || orderId,
        amountPaid: verifiedAmountInr,
        currency: "INR",
      });
    }

    const bookingRef = paymentId || orderId;
    const paidAt = new Date().toISOString();
    const pathway = (body.appointmentDetails?.pathway || "Germany Pathway Advisory").trim();
    const preferredSlot = (
      body.appointmentDetails?.preferredSlot || "Scheduled Berlin/IST Slot"
    ).trim();

    const grantsDirectDeskContact = CONSULTATION_ELIGIBLE_TIERS.has(resolvedTierKey);
    const targetRedirect =
      resolvedTierKey === "consultation_session"
        ? "/pricing?booked=1#consultation-booking"
        : resolvedTierKey === "ausbildung_os_pro" ||
            resolvedTierKey === "ausbildung_os_fast_track"
          ? "/ausbildung-os?upgraded=1"
          : "/profile?upgraded=1";

    const res = NextResponse.json({
      ok: true,
      tier: resolvedTierKey === "consultation_session" ? "Consultation" : "Pro",
      unlockedSlug: primarySlug,
      bookingRef,
      appointment: {
        email: resolvedEmail,
        fullName: resolvedName,
        pathway,
        preferredSlot,
        paidAt,
      },
      directContact: grantsDirectDeskContact ? getDirectDeskContact() : null,
      redirectUrl: targetRedirect,
    });

    if (grantsDirectDeskContact) {
      const appointmentToken = signPaidAppointmentToken({
        bookingRef,
        email: resolvedEmail,
        fullName: resolvedName,
        pathway,
        preferredSlot,
        tierKey: resolvedTierKey,
        paidAt,
      });

      res.cookies.set(PAID_APPOINTMENT_COOKIE, appointmentToken, {
        httpOnly: true,
        sameSite: "lax",
        secure: serverEnv.isProduction,
        path: "/",
        maxAge: 60 * 60 * 24 * 30,
      });
    }

    return res;
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Failed to verify checkout payment." },
      { status: 500 },
    );
  }
}
