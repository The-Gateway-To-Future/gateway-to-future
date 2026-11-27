import { NextResponse } from "next/server";
import { getAllMergedProducts, upsertLocalStudent } from "@/lib/server/admin-auth";
import { serverEnv } from "@/lib/server/env";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export type CheckoutCurrency = "INR";

interface AppointmentDetails {
  pathway?: string;
  preferredSlot?: string;
  notes?: string;
}

interface CreateCheckoutBody {
  productSlug?: string;
  currency?: CheckoutCurrency;
  tierKey?:
    | "single_module"
    | "level_bundle"
    | "studienkolleg_track"
    | "all_access_pass"
    | "consultation_session"
    | "ausbildung_os_pro"
    | "ausbildung_os_fast_track";
  userEmail?: string;
  studentName?: string;
  whatsappPhone?: string;
  appointmentDetails?: AppointmentDetails;
}

function detectPreferredCurrency(_req: Request): CheckoutCurrency {
  // STRICT CURRENCY RULE: Enable ONLY Indian Rupee (INR / ₹) pricing
  return "INR";
}

export async function GET(req: Request) {
  const detectedCurrency = detectPreferredCurrency(req);
  const razorpayKeyId = (
    process.env.RAZORPAY_KEY_ID ||
    process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID ||
    ""
  ).trim();
  const razorpayConfigured = Boolean(
    razorpayKeyId && (process.env.RAZORPAY_KEY_SECRET || "").trim(),
  );

  return NextResponse.json({
    currency: "INR",
    symbol: "₹",
    detectedCurrency,
    gateways: {
      razorpay: {
        currency: "INR",
        symbol: "₹",
        configured: razorpayConfigured,
        keyId: razorpayConfigured ? razorpayKeyId : "rzp_test_gtf_sandbox",
        methods: ["UPI (GPay / PhonePe / Paytm / BHIM)", "RuPay / Visa / Mastercard", "NetBanking"],
      },
      sbi_upi: {
        currency: "INR",
        symbol: "₹",
        beneficiary: "THE GATEWAY TO FUTURE",
        bankName: "State Bank of India (SBI)",
        accountNumber: "45246385485",
        ifsc: "SBIN0002405",
        upiId: "SBIBHIM.INSTANT73369512364751798@sbipay",
        methods: ["Direct SBI Instant UPI QR", "BHIM / PhonePe / Google Pay / Paytm"],
      },
    },
    tiers: {
      single_module: { amount: 499, formatted: "₹499", label: "Single Module / Exam Practice Pack" },
      level_bundle: { amount: 1999, formatted: "₹1,999", label: "Complete Level Bundle (Full A1, A2, B1, or B2)" },
      studienkolleg_track: { amount: 2999, formatted: "₹2,999", label: "Studienkolleg Complete Track (M, T, W, G Kurs)" },
      all_access_pass: { amount: 4999, formatted: "₹4,999", label: "Full Academy All-Access Pass" },
      consultation_session: { amount: 1000, formatted: "₹1,000", label: "1:1 Berlin & India Advisory Consultation" },
      ausbildung_os_pro: { amount: 14999, formatted: "₹14,999", label: "Ausbildung OS Pro Self-Serve" },
      ausbildung_os_fast_track: { amount: 45000, formatted: "₹45,000", label: "Ausbildung OS GTF Verified Fast-Track" },
    },
  });
}

export async function POST(req: Request) {
  try {
    const body = (await req.json()) as CreateCheckoutBody;
    const productSlug = (body.productSlug || "").trim();
    if (!productSlug) {
      return NextResponse.json({ error: "Missing `productSlug`." }, { status: 400 });
    }

    const allProducts = await getAllMergedProducts();
    const product = allProducts.find(
      (p) => p.slug === productSlug || p.resourceId === productSlug,
    );

    if (!product) {
      return NextResponse.json(
        { error: `Product "${productSlug}" not found in GTF catalog.` },
        { status: 404 },
      );
    }

    // STRICT CURRENCY RULE: Enable ONLY Indian Rupee (INR / ₹) pricing.
    const currency: CheckoutCurrency = "INR";

    const userEmail = (body.userEmail || serverEnv.demoUserEmail).toLowerCase().trim();
    const studentName = (body.studentName || userEmail.split("@")[0] || "GTF Student").trim();
    const whatsappPhone = (body.whatsappPhone || "+91 98765 43210").trim();

    await upsertLocalStudent({
      email: userEmail,
      fullName: studentName,
      phone: whatsappPhone,
      targetLevel: product.level || "b1",
    });

    // Determine canonical tier price in INR
    let priceInr = Number(product.priceInr || 499);
    if (body.tierKey === "single_module") priceInr = 499;
    else if (body.tierKey === "level_bundle") priceInr = 1999;
    else if (body.tierKey === "studienkolleg_track") priceInr = 2999;
    else if (body.tierKey === "all_access_pass") priceInr = 4999;
    else if (body.tierKey === "consultation_session") priceInr = 1000;
    else if (body.tierKey === "ausbildung_os_pro" || product.slug === "ausbildung-os-pro")
      priceInr = 14999;
    else if (
      body.tierKey === "ausbildung_os_fast_track" ||
      product.slug === "ausbildung-os-fast-track"
    )
      priceInr = 45000;
    else if (!priceInr || priceInr <= 0) priceInr = 499;

    const resolvedTierKey =
      body.tierKey ||
      (product.slug === "ausbildung-os-pro"
        ? "ausbildung_os_pro"
        : product.slug === "ausbildung-os-fast-track"
          ? "ausbildung_os_fast_track"
          : product.slug === "gtf-berlin-consultation"
            ? "consultation_session"
            : "all_access_pass");

    const amountPaise = Math.max(100, Math.round(priceInr * 100));
    const keyId = (
      process.env.RAZORPAY_KEY_ID ||
      process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID ||
      ""
    ).trim();
    const keySecret = (process.env.RAZORPAY_KEY_SECRET || "").trim();

    const upiInfo = {
      beneficiary: "THE GATEWAY TO FUTURE",
      bankName: "State Bank of India (SBI)",
      accountNumber: "45246385485",
      ifsc: "SBIN0002405",
      merchantId: "SB580381",
      upiId: "SBIBHIM.INSTANT73369512364751798@sbipay",
      intentUrl: `upi://pay?pa=SBIBHIM.INSTANT73369512364751798@sbipay&pn=THE%20GATEWAY%20TO%20FUTURE&mc=580381&cu=INR&am=${priceInr}&tn=${encodeURIComponent(`GTF ${product.title.slice(0, 30)}`)}`,
    };

    if (keyId && keySecret && !keyId.includes("...")) {
      try {
        const authHeader = Buffer.from(`${keyId}:${keySecret}`).toString("base64");
        const receipt = `gtf_${product.slug.slice(0, 18)}_${Date.now().toString(36)}`;
        const rzpRes = await fetch("https://api.razorpay.com/v1/orders", {
          method: "POST",
          headers: {
            Authorization: `Basic ${authHeader}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            amount: amountPaise,
            currency: "INR",
            receipt,
            notes: {
              userEmail,
              studentName,
              whatsappPhone,
              productSlug: product.slug,
              productTitle: product.title,
              tierKey: resolvedTierKey,
              expectedAmountPaise: String(amountPaise),
              pathway: (body.appointmentDetails?.pathway || "").trim(),
              preferredSlot: (body.appointmentDetails?.preferredSlot || "").trim(),
            },
          }),
        });

        if (rzpRes.ok) {
          const order = (await rzpRes.json()) as { id: string; amount: number; currency: string };
          return NextResponse.json({
            ok: true,
            provider: "razorpay",
            mode: "live",
            currency: "INR",
            symbol: "₹",
            amount: priceInr,
            amountSubunits: order.amount,
            orderId: order.id,
            keyId,
            upi: upiInfo,
            product: {
              slug: product.slug,
              divisionId: product.divisionId || "sprachakademie",
              title: product.title,
              level: product.level || "b1",
              type: product.type,
            },
            customer: {
              email: userEmail,
              name: studentName,
              phone: whatsappPhone,
            },
          });
        }
      } catch (err) {
        console.warn("[gtf] Razorpay live order creation fallback to sandbox:", err);
      }
    }

    // Direct / Sandbox Instant Checkout Session for INR
    const sandboxOrderId = `order_gtf_inr_${Date.now().toString(36)}`;
    return NextResponse.json({
      ok: true,
      provider: "razorpay",
      mode: "sandbox",
      currency: "INR",
      symbol: "₹",
      amount: priceInr,
      amountSubunits: amountPaise,
      orderId: sandboxOrderId,
      keyId: keyId || "rzp_test_gtf_sandbox",
      upi: upiInfo,
      product: {
        slug: product.slug,
        divisionId: product.divisionId || "sprachakademie",
        title: product.title,
        level: product.level || "b1",
        type: product.type,
      },
      customer: {
        email: userEmail,
        name: studentName,
        phone: whatsappPhone,
      },
    });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Failed to create checkout session." },
      { status: 500 },
    );
  }
}
