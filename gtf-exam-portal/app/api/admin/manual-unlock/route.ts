import { NextResponse } from "next/server";
import {
  getAllMergedProducts,
  triggerN8nWhatsAppWebhook,
  upsertLocalStudent,
  verifyAdminRequest,
} from "@/lib/server/admin-auth";
import { grantProductUnlock } from "@/lib/server/catalog";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

interface ManualUnlockBody {
  email?: string;
  phone?: string;
  fullName?: string;
  productSlug?: string;
  paymentReference?: string;
}

export async function POST(req: Request) {
  if (!verifyAdminRequest(req)) {
    return NextResponse.json(
      { error: "Unauthorized: Invalid ADMIN_SECRET_PASSWORD." },
      { status: 401 },
    );
  }

  try {
    const body = (await req.json()) as ManualUnlockBody;
    const email = (body.email || "").toLowerCase().trim();
    const productSlug = (body.productSlug || "").trim();
    const phone = (body.phone || "+91 98765 43210").trim();
    const fullName = (body.fullName || email.split("@")[0] || "GTF Student").trim();

    if (!email || !email.includes("@")) {
      return NextResponse.json(
        { error: "Please enter a valid student email address." },
        { status: 400 },
      );
    }
    if (!productSlug) {
      return NextResponse.json(
        { error: "Please select a product pack to unlock." },
        { status: 400 },
      );
    }

    const allProducts = await getAllMergedProducts();
    const product = allProducts.find(
      (p) => p.slug === productSlug || p.resourceId === productSlug,
    );
    const canonicalSlug = product ? product.slug : productSlug;
    const productTitle = product ? product.title : canonicalSlug;

    await upsertLocalStudent({
      email,
      fullName,
      phone,
      targetLevel: product?.level || "b1",
    });

    const unlockRes = await grantProductUnlock({
      userEmail: email,
      productSlug: canonicalSlug,
      fullName,
      paymentProvider: "founder-manual-upi-bank",
      paymentReference: body.paymentReference || `MANUAL-UPI-${Date.now()}`,
      amountPaid: product?.priceInr || 0,
      currency: "INR",
    });

    const appBaseUrl = (
      process.env.NEXT_PUBLIC_APP_URL ||
      new URL(req.url).origin ||
      "http://localhost:3000"
    ).replace(/\/+$/, "");

    const accessLink =
      product?.type === "pdf_workbook"
        ? `${appBaseUrl}/workbooks/${product.resourceId}?email=${encodeURIComponent(email)}`
        : `${appBaseUrl}/exam/${product?.level || "b1"}/lesen?email=${encodeURIComponent(email)}`;

    const n8nDispatch = await triggerN8nWhatsAppWebhook({
      student_name: fullName,
      email,
      whatsapp_phone: phone,
      product_title: productTitle,
      product_slug: canonicalSlug,
      access_link: accessLink,
      payment_provider: "founder-manual-upi-bank",
      payment_reference: body.paymentReference || `MANUAL-UPI-${Date.now()}`,
      currency: "INR",
      amount_paid: product?.priceInr || 0,
    });

    return NextResponse.json({
      ok: true,
      unlocked: {
        email,
        fullName,
        phone,
        productSlug: canonicalSlug,
        productTitle,
        accessLink,
        persistedTo: unlockRes.persistedTo,
        unlockedAt: unlockRes.record.unlockedAt,
      },
      n8nWebhook: n8nDispatch,
    });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Manual unlock failed." },
      { status: 500 },
    );
  }
}
