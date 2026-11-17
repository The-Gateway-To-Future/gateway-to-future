import { createHmac, timingSafeEqual } from "crypto";
import { NextResponse } from "next/server";
import { upsertLocalStudent } from "@/lib/server/admin-auth";
import { grantProductUnlock } from "@/lib/server/catalog";
import { serverEnv } from "@/lib/server/env";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

interface VerifyCheckoutBody {
  orderId?: string;
  paymentId?: string;
  signature?: string;
  productSlug?: string;
  tierKey?: "single_module" | "level_bundle" | "studienkolleg_track" | "all_access_pass";
  userEmail?: string;
  studentName?: string;
}

function safeCompareHex(a: string, b: string): boolean {
  const bufA = Buffer.from(a);
  const bufB = Buffer.from(b);
  if (bufA.length !== bufB.length) return false;
  return timingSafeEqual(bufA, bufB);
}

/**
 * Verifies a client-side Razorpay checkout completion callback via HMAC-SHA256
 * (`${orderId}|${paymentId}` signed with `RAZORPAY_KEY_SECRET`) and immediately
 * grants the candidate's Pro or track entitlement.
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
        { error: "A verified candidate email is required to activate Pro access." },
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
      tierKey === "all_access_pass"
        ? "gtf-all-access-pass"
        : requestedSlug || "studienkolleg-all-access";

    await grantProductUnlock({
      userEmail,
      productSlug: primarySlug,
      fullName: studentName,
      paymentProvider: isSandboxDevOrder ? "razorpay-sandbox" : "razorpay",
      paymentReference: paymentId || orderId,
      amountPaid: tierKey === "all_access_pass" ? 4999 : 2999,
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

    const targetRedirect =
      requestedSlug && requestedSlug !== "gtf-all-access-pass"
        ? "/profile?upgraded=1"
        : "/profile?upgraded=1";

    return NextResponse.json({
      ok: true,
      tier: "Pro",
      unlockedSlug: primarySlug,
      redirectUrl: serverEnv.isProduction ? targetRedirect : targetRedirect,
    });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Failed to verify checkout payment." },
      { status: 500 },
    );
  }
}
