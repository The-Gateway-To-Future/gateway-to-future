import { createHmac, timingSafeEqual } from "crypto";
import { NextResponse } from "next/server";
import { upsertLocalStudent } from "@/lib/server/admin-auth";
import { grantProductUnlock } from "@/lib/server/catalog";
import {
  getDirectDeskContact,
  PAID_APPOINTMENT_COOKIE,
  signPaidAppointmentToken,
} from "@/lib/server/consultation-contact";
import { serverEnv } from "@/lib/server/env";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

interface VerifyCheckoutBody {
  orderId?: string;
  paymentId?: string;
  signature?: string;
  productSlug?: string;
  tierKey?:
    | "single_module"
    | "level_bundle"
    | "studienkolleg_track"
    | "all_access_pass"
    | "consultation_session";
  userEmail?: string;
  studentName?: string;
  appointmentDetails?: {
    pathway?: string;
    preferredSlot?: string;
    notes?: string;
  };
}

function safeCompareHex(a: string, b: string): boolean {
  const bufA = Buffer.from(a);
  const bufB = Buffer.from(b);
  if (bufA.length !== bufB.length) return false;
  return timingSafeEqual(bufA, bufB);
}

/**
 * Verifies a client-side Razorpay checkout completion callback via HMAC-SHA256
 * (`${orderId}|${paymentId}` signed with `RAZORPAY_KEY_SECRET`), grants the
 * candidate's entitlement, and issues a signed HttpOnly paid-appointment cookie
 * so direct Berlin Desk contact details can be unlocked.
 */
export async function POST(req: Request) {
  try {
    const body = (await req.json()) as VerifyCheckoutBody;
    const userEmail = (body.userEmail || "").toLowerCase().trim();
    const orderId = (body.orderId || "").trim();
    const paymentId = (body.paymentId || "").trim();
    const signature = (body.signature || "").trim();
    const requestedSlug = (body.productSlug || "").trim();
    const tierKey = body.tierKey || "all_access_pass";

    if (!userEmail || !userEmail.includes("@")) {
      return NextResponse.json(
        { error: "A verified candidate email is required to confirm booking or Pro access." },
        { status: 400 },
      );
    }

    if (!orderId) {
      return NextResponse.json({ error: "Missing `orderId`." }, { status: 400 });
    }

    const keySecret = (process.env.RAZORPAY_KEY_SECRET || "").trim();
    const isSandboxDevOrder =
      process.env.NODE_ENV !== "production" &&
      !keySecret &&
      orderId.startsWith("order_gtf_inr_");

    if (!isSandboxDevOrder) {
      if (!keySecret) {
        return NextResponse.json(
          { error: "Payment verification secret is not configured on the server." },
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
    }

    const studentName = (body.studentName || userEmail.split("@")[0] || "GTF Candidate").trim();

    await upsertLocalStudent({
      email: userEmail,
      fullName: studentName,
      phone: "+91 98765 43210",
      targetLevel: "b1",
    });

    const primarySlug =
      tierKey === "consultation_session"
        ? "gtf-berlin-consultation"
        : tierKey === "all_access_pass"
          ? "gtf-all-access-pass"
          : tierKey === "level_bundle"
            ? requestedSlug || "gtf-level-bundle"
            : requestedSlug || "studienkolleg-all-access";

    const amountPaid =
      tierKey === "consultation_session"
        ? 1000
        : tierKey === "all_access_pass"
          ? 4999
          : tierKey === "level_bundle"
            ? 1999
            : 2999;

    await grantProductUnlock({
      userEmail,
      productSlug: primarySlug,
      fullName: studentName,
      paymentProvider: isSandboxDevOrder ? "razorpay-sandbox" : "razorpay",
      paymentReference: paymentId || orderId,
      amountPaid,
      currency: "INR",
    });

    if (tierKey === "all_access_pass" && requestedSlug && requestedSlug !== "gtf-all-access-pass") {
      await grantProductUnlock({
        userEmail,
        productSlug: requestedSlug,
        fullName: studentName,
        paymentProvider: isSandboxDevOrder ? "razorpay-sandbox" : "razorpay",
        paymentReference: paymentId || orderId,
        amountPaid: 4999,
        currency: "INR",
      });
    }

    const bookingRef = paymentId || orderId;
    const paidAt = new Date().toISOString();
    const pathway = (body.appointmentDetails?.pathway || "Germany Pathway Advisory").trim();
    const preferredSlot = (body.appointmentDetails?.preferredSlot || "Scheduled Berlin/IST Slot").trim();

    const appointmentToken = signPaidAppointmentToken({
      bookingRef,
      email: userEmail,
      fullName: studentName,
      pathway,
      preferredSlot,
      tierKey,
      paidAt,
    });

    const targetRedirect =
      tierKey === "consultation_session"
        ? "/pricing?booked=1#consultation-booking"
        : "/profile?upgraded=1";

    const res = NextResponse.json({
      ok: true,
      tier: tierKey === "consultation_session" ? "Consultation" : "Pro",
      unlockedSlug: primarySlug,
      bookingRef,
      appointment: {
        email: userEmail,
        fullName: studentName,
        pathway,
        preferredSlot,
        paidAt,
      },
      directContact: getDirectDeskContact(),
      redirectUrl: targetRedirect,
    });

    res.cookies.set(PAID_APPOINTMENT_COOKIE, appointmentToken, {
      httpOnly: true,
      sameSite: "lax",
      secure: serverEnv.isProduction,
      path: "/",
      maxAge: 60 * 60 * 24 * 30,
    });

    return res;
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Failed to verify checkout payment." },
      { status: 500 },
    );
  }
}
