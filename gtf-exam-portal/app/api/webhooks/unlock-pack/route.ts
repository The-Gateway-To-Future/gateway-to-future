import { createHmac, timingSafeEqual } from "crypto";
import { NextResponse } from "next/server";
import {
  getAllMergedProducts,
  triggerN8nWhatsAppWebhook,
  upsertLocalStudent,
} from "@/lib/server/admin-auth";
import { grantProductUnlock } from "@/lib/server/catalog";
import { serverEnv } from "@/lib/server/env";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function safeCompare(a: string, b: string): boolean {
  const bufA = Buffer.from(a);
  const bufB = Buffer.from(b);
  if (bufA.length !== bufB.length) return false;
  return timingSafeEqual(bufA, bufB);
}

function verifyStripeSignature(rawBody: string, header: string, secret: string): boolean {
  if (!secret || !header) return false;
  const parts = Object.fromEntries(
    header.split(",").map((kv) => {
      const [k, v] = kv.trim().split("=");
      return [k, v || ""];
    }),
  );
  const timestamp = parts.t;
  const sig = parts.v1;
  if (!timestamp || !sig) return false;
  const expected = createHmac("sha256", secret)
    .update(`${timestamp}.${rawBody}`)
    .digest("hex");
  return safeCompare(sig, expected);
}

interface UnlockWebhookPayload {
  email?: string;
  userEmail?: string;
  productSlug?: string;
  packId?: string;
  fullName?: string;
  studentName?: string;
  whatsappPhone?: string;
  phone?: string;
  paymentProvider?: string;
  paymentReference?: string;
  amountPaid?: number;
  currency?: string;
  secret?: string;
  // Native Razorpay webhook envelope
  event?: string;
  payload?: {
    payment?: {
      entity?: {
        id?: string;
        amount?: number;
        currency?: string;
        email?: string;
        contact?: string;
        notes?: Record<string, string>;
      };
    };
  };
  // Native Stripe webhook envelope
  type?: string;
  data?: {
    object?: {
      id?: string;
      customer_email?: string;
      amount_total?: number;
      currency?: string;
      metadata?: Record<string, string>;
    };
  };
}

export async function POST(req: Request) {
  const expectedSecret = serverEnv.unlockWebhookSecret;
  const razorpayWebhookSecret = (
    process.env.RAZORPAY_WEBHOOK_SECRET ||
    process.env.RAZORPAY_KEY_SECRET ||
    ""
  ).trim();
  const stripeWebhookSecret = (process.env.STRIPE_WEBHOOK_SECRET || "").trim();

  const rawBody = await req.text();
  let body: UnlockWebhookPayload;
  try {
    body = JSON.parse(rawBody) as UnlockWebhookPayload;
  } catch {
    return NextResponse.json({ error: "Invalid JSON payload." }, { status: 400 });
  }

  // 1. Verify webhook authenticity across GTF secret, Razorpay HMAC, Stripe HMAC, or checkout callback
  const headerSecret =
    req.headers.get("x-gtf-webhook-secret") ||
    req.headers.get("authorization")?.replace(/^Bearer\s+/i, "") ||
    body.secret ||
    "";

  const gtfSignature = req.headers.get("x-gtf-signature");
  const razorpaySignature = req.headers.get("x-razorpay-signature");
  const stripeSignature = req.headers.get("stripe-signature");

  let authorized = false;

  if (expectedSecret && headerSecret && safeCompare(headerSecret.trim(), expectedSecret)) {
    authorized = true;
  } else if (expectedSecret && gtfSignature) {
    const computed = `sha256=${createHmac("sha256", expectedSecret).update(rawBody).digest("hex")}`;
    if (safeCompare(gtfSignature.trim(), computed)) {
      authorized = true;
    }
  } else if (razorpaySignature && razorpayWebhookSecret) {
    const computed = createHmac("sha256", razorpayWebhookSecret).update(rawBody).digest("hex");
    if (safeCompare(razorpaySignature.trim(), computed)) {
      authorized = true;
    }
  } else if (stripeSignature && stripeWebhookSecret) {
    if (verifyStripeSignature(rawBody, stripeSignature, stripeWebhookSecret)) {
      authorized = true;
    }
  } else if (
    !serverEnv.isProduction &&
    (body.paymentProvider === "razorpay" || body.paymentProvider === "stripe")
  ) {
    // Allow sandbox checkout completion on localhost when production secrets are not yet set
    authorized = true;
  }

  if (!authorized) {
    return NextResponse.json(
      { error: "Unauthorized webhook request: invalid secret token or HMAC signature." },
      { status: 401 },
    );
  }

  // 2. Extract fields from either direct GTF payload, Razorpay webhook event, or Stripe webhook event
  let userEmail = (body.userEmail || body.email || "").toLowerCase().trim();
  let productSlug = (body.productSlug || body.packId || "").trim();
  let studentName = (body.studentName || body.fullName || "").trim();
  let whatsappPhone = (body.whatsappPhone || body.phone || "").trim();
  let paymentProvider = body.paymentProvider || "n8n-webhook";
  let paymentReference = body.paymentReference;
  let amountPaid = body.amountPaid;
  let currency = (body.currency || "EUR").toUpperCase();

  // Handle native Razorpay event (payment.captured / order.paid)
  if (body.event && body.payload?.payment?.entity) {
    const entity = body.payload.payment.entity;
    const notes = entity.notes || {};
    userEmail = (notes.userEmail || entity.email || userEmail).toLowerCase().trim();
    productSlug = (notes.productSlug || productSlug).trim();
    studentName = (notes.studentName || studentName).trim();
    whatsappPhone = (notes.whatsappPhone || entity.contact || whatsappPhone).trim();
    paymentProvider = "razorpay";
    paymentReference = entity.id || paymentReference;
    amountPaid = entity.amount ? entity.amount / 100 : amountPaid;
    currency = (entity.currency || "INR").toUpperCase();
  }

  // Handle native Stripe event (checkout.session.completed)
  if (body.type === "checkout.session.completed" && body.data?.object) {
    const session = body.data.object;
    const meta = session.metadata || {};
    userEmail = (meta.userEmail || session.customer_email || userEmail).toLowerCase().trim();
    productSlug = (meta.productSlug || productSlug).trim();
    studentName = (meta.studentName || studentName).trim();
    whatsappPhone = (meta.whatsappPhone || whatsappPhone).trim();
    paymentProvider = "stripe";
    paymentReference = session.id || paymentReference;
    amountPaid = session.amount_total ? session.amount_total / 100 : amountPaid;
    currency = (session.currency || "EUR").toUpperCase();
  }

  if (!userEmail || !userEmail.includes("@")) {
    return NextResponse.json(
      { error: "Missing or invalid `userEmail` (or `email`) in webhook payload." },
      { status: 400 },
    );
  }

  if (!productSlug) {
    return NextResponse.json(
      { error: "Missing `productSlug` (or `packId`) in webhook payload." },
      { status: 400 },
    );
  }

  const allProducts = await getAllMergedProducts();
  const knownProduct = allProducts.find(
    (p) => p.slug === productSlug || p.resourceId === productSlug,
  );
  const canonicalSlug = knownProduct ? knownProduct.slug : productSlug;
  const productTitle = knownProduct?.title || canonicalSlug;
  const finalStudentName = studentName || userEmail.split("@")[0] || "GTF Student";
  const finalWhatsappPhone = whatsappPhone || "+91 98765 43210";

  // 3. Upsert Student & Unlock Pack in Supabase `user_purchases` + local store
  await upsertLocalStudent({
    email: userEmail,
    fullName: finalStudentName,
    phone: finalWhatsappPhone,
    targetLevel: knownProduct?.level || "b1",
  });

  const result = await grantProductUnlock({
    userEmail,
    productSlug: canonicalSlug,
    fullName: finalStudentName,
    paymentProvider,
    paymentReference,
    amountPaid,
    currency,
  });

  // 4. Trigger Outgoing Webhook to N8N_WEBHOOK_URL with { student_name, email, whatsapp_phone, product_title, access_link }
  const appBaseUrl = (
    process.env.NEXT_PUBLIC_APP_URL ||
    new URL(req.url).origin ||
    "http://localhost:3000"
  ).replace(/\/+$/, "");

  const accessLink =
    knownProduct?.type === "pdf_workbook"
      ? `${appBaseUrl}/workbooks/${knownProduct.resourceId}?email=${encodeURIComponent(userEmail)}`
      : knownProduct?.divisionId === "studienkolleg"
      ? `${appBaseUrl}/dashboard?division=studienkolleg&email=${encodeURIComponent(userEmail)}`
      : knownProduct?.divisionId === "fachsprache_medizin"
      ? `${appBaseUrl}/dashboard?division=fachsprache_medizin&email=${encodeURIComponent(userEmail)}`
      : `${appBaseUrl}/exam/${knownProduct?.level || "b1"}/lesen?email=${encodeURIComponent(userEmail)}`;

  const n8nResult = await triggerN8nWhatsAppWebhook({
    student_name: finalStudentName,
    email: userEmail,
    whatsapp_phone: finalWhatsappPhone,
    product_title: productTitle,
    product_slug: canonicalSlug,
    access_link: accessLink,
    payment_provider: paymentProvider,
    payment_reference: paymentReference,
    currency,
    amount_paid: amountPaid,
  });

  return NextResponse.json({
    ok: true,
    unlocked: {
      userEmail,
      studentName: finalStudentName,
      whatsappPhone: finalWhatsappPhone,
      productSlug: canonicalSlug,
      productTitle,
      accessLink,
      persistedTo: result.persistedTo,
      unlockedAt: result.record.unlockedAt,
    },
    n8nWebhook: n8nResult,
  });
}
