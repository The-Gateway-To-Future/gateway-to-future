import { NextResponse } from "next/server";
import {
  getAllMergedProducts,
  triggerN8nWhatsAppWebhook,
  upsertLocalStudent,
} from "@/lib/server/admin-auth";
import {
  getAllWorkbooks,
  getUnlockedProductSlugs,
  grantProductUnlock,
} from "@/lib/server/catalog";
import { integrationStatus, serverEnv } from "@/lib/server/env";
import type { CatalogItem } from "@/lib/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const email = (searchParams.get("email") || serverEnv.demoUserEmail).toLowerCase().trim();
  const isFreeLaunch = process.env.NEXT_PUBLIC_FREE_LAUNCH_MODE === "true";
  const unlocked = await getUnlockedProductSlugs(email);
  const mergedProducts = await getAllMergedProducts();

  const products: CatalogItem[] = mergedProducts.map((p) => ({
    ...p,
    priceEur: 0,
    priceInr: isFreeLaunch ? 0 : (p.isFree ? 0 : (p.priceInr || 499)),
    unlocked: isFreeLaunch || p.isFree || unlocked.has(p.slug),
  }));

  const workbooks = getAllWorkbooks().map((wb) => ({
    id: wb.id,
    title: wb.title,
    subtitle: wb.subtitle,
    level: wb.level,
    divisionId: (wb as unknown as { divisionId?: string }).divisionId || "sprachakademie",
    track: (wb as unknown as { track?: string }).track,
    contentType: wb.contentType,
    module: wb.module,
    skill: wb.skill,
    audioUrl: wb.audioUrl
      ? wb.audioUrl.startsWith("/")
        ? wb.audioUrl
        : `/${wb.audioUrl}`
      : undefined,
    productSlug: wb.productSlug,
    isFree: isFreeLaunch || wb.isFree,
    priceEur: 0,
    priceInr: isFreeLaunch || wb.isFree ? 0 : 499,
    pages: wb.pages,
    coverColor: wb.coverColor,
    topics: wb.topics,
    questionCount: wb.questions?.length || 0,
    flashcards: wb.flashcards || [],
    unlocked: isFreeLaunch || wb.isFree || unlocked.has(wb.productSlug),
  }));

  return NextResponse.json({
    userEmail: email,
    integrations: integrationStatus(),
    products,
    workbooks,
  });
}

/**
 * Convenience endpoint for simulating an instant webhook unlock from the Dashboard UI
 * when testing locally without having to run curl manually.
 */
export async function POST(req: Request) {
  if (process.env.NODE_ENV === "production") {
    const adminSecret = (process.env.ADMIN_SECRET || "").trim();
    const headerSecret = (req.headers.get("x-admin-secret") || "").trim();
    if (!adminSecret || headerSecret !== adminSecret) {
      return NextResponse.json(
        {
          ok: false,
          error: "Direct demo unlock is disabled in production. Please subscribe at /pricing.",
        },
        { status: 403 },
      );
    }
  }

  const body = (await req.json()) as {
    userEmail?: string;
    productSlug?: string;
    studentName?: string;
    whatsappPhone?: string;
    paymentProvider?: string;
    currency?: string;
    amountPaid?: number;
  };
  const userEmail = (body.userEmail || serverEnv.demoUserEmail).toLowerCase().trim();
  const productSlug = (body.productSlug || "").trim();

  if (!productSlug) {
    return NextResponse.json({ error: "Missing productSlug" }, { status: 400 });
  }

  const allProducts = await getAllMergedProducts();
  const product = allProducts.find((p) => p.slug === productSlug || p.resourceId === productSlug);
  const studentName = (body.studentName || userEmail.split("@")[0] || "GTF Student").trim();
  const whatsappPhone = (body.whatsappPhone || "+91 98765 43210").trim();

  await upsertLocalStudent({
    email: userEmail,
    fullName: studentName,
    phone: whatsappPhone,
    targetLevel: product?.level || "b1",
  });

  const res = await grantProductUnlock({
    userEmail,
    productSlug: product?.slug || productSlug,
    fullName: studentName,
    paymentProvider: body.paymentProvider || "dashboard-demo-unlock",
    amountPaid: body.amountPaid ?? product?.priceInr ?? 0,
    currency: body.currency || "INR",
  });

  const appBaseUrl = (
    process.env.NEXT_PUBLIC_APP_URL ||
    new URL(req.url).origin ||
    "http://localhost:3000"
  ).replace(/\/+$/, "");

  const accessLink =
    product?.type === "pdf_workbook"
      ? `${appBaseUrl}/workbooks/${product.resourceId}?email=${encodeURIComponent(userEmail)}`
      : product?.divisionId === "studienkolleg"
      ? `${appBaseUrl}/dashboard?division=studienkolleg&email=${encodeURIComponent(userEmail)}`
      : product?.divisionId === "fachsprache_medizin"
      ? `${appBaseUrl}/dashboard?division=fachsprache_medizin&email=${encodeURIComponent(userEmail)}`
      : `${appBaseUrl}/exam/${product?.level || "b1"}/lesen?email=${encodeURIComponent(userEmail)}`;

  const n8nWebhook = await triggerN8nWhatsAppWebhook({
    student_name: studentName,
    email: userEmail,
    whatsapp_phone: whatsappPhone,
    product_title: product?.title || productSlug,
    product_slug: product?.slug || productSlug,
    access_link: accessLink,
    payment_provider: body.paymentProvider || "dashboard-demo-unlock",
    currency: body.currency || "INR",
    amount_paid: body.amountPaid ?? product?.priceInr ?? 0,
  });

  return NextResponse.json({ ok: true, ...res, n8nWebhook });
}
