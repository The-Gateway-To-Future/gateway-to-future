"use client";

import React, { Suspense, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import {
  ArrowRight,
  Check,
  CheckCircle2,
  Copy,
  ExternalLink,
  Loader2,
  ShieldCheck,
  Sparkles,
} from "lucide-react";
import { Navbar } from "@/components/Navbar";
import { BreadcrumbHeader } from "@/components/BreadcrumbHeader";
import { BottomNavigationBar } from "@/components/BottomNavigationBar";
import { useAuth } from "@/lib/auth-context";
import { BRAND, GTF_BANK_DETAILS } from "@/lib/config";

interface CheckoutSessionPreview {
  mode: "live" | "sandbox";
  tierName: string;
  priceEur: string;
  priceInr: string;
  orderId?: string;
  upiIntent?: string;
  productTitle?: string;
}

interface PricingTier {
  id: "single_division" | "gtf_pro" | "relocation_cohort";
  badge: string;
  name: string;
  priceLabel: string;
  subPriceLabel: string;
  billingCycle: string;
  description: string;
  highlighted?: boolean;
  ctaLabel: string;
  checkoutTierKey?: "studienkolleg_track" | "all_access_pass";
  features: string[];
}

const PRICING_TIERS: PricingTier[] = [
  {
    id: "single_division",
    badge: "TRACK ACCESS",
    name: "Single Division",
    priceLabel: "€29",
    subPriceLabel: "₹2,499 / month equivalent",
    billingCycle: "/ month",
    description:
      "Focused access to one chosen preparation track — Language Academy, Studienkolleg Hub, or Pflege & Medizin.",
    ctaLabel: "Select Single Division",
    checkoutTierKey: "studienkolleg_track",
    features: [
      "Complete workbooks & PDF reader for 1 division",
      "Native de-DE flashcard decks & studio audio",
      "Subdivision drills & interactive answer sheets",
      "Standard email & progress telemetry sync",
    ],
  },
  {
    id: "gtf_pro",
    badge: "RECOMMENDED · ALL-ACCESS",
    name: "GTF All-Access Pro",
    priceLabel: "€50",
    subPriceLabel: "₹4,499 / month equivalent",
    billingCycle: "/ month",
    description:
      "The complete Berlin preparation engine across every CEFR level, Studienkolleg Aufnahmeprüfung track, and hospital Anerkennung simulation.",
    highlighted: true,
    ctaLabel: "Subscribe to GTF Pro (€50 / mo)",
    checkoutTierKey: "all_access_pass",
    features: [
      "Unlimited Language Academy (A1, A2, B1, B2 & 122 Säulen)",
      "Studienkolleg T, M, W, G-Kurs Formula Engine & C-Tests",
      "Fachsprache Pflege ISBAR Simulator & ward audio",
      "Unlimited Goethe/telc Modelltests with AI Schreiben & Sprechen grading",
      "Verified candidate priority support from Berlin HQ",
    ],
  },
  {
    id: "relocation_cohort",
    badge: "FOUNDER MENTORSHIP",
    name: "Berlin Relocation & § 81a",
    priceLabel: "Custom",
    subPriceLabel: "Tuition & placement roadmap",
    billingCycle: "cohort",
    description:
      "End-to-end relocation guidance in Germany with Ashutosh Sharma & Sarbjit Kour — from language clearance to Berlin hospital or university placement.",
    ctaLabel: "Book Berlin Admissions",
    features: [
      "Everything included in GTF All-Access Pro",
      "anabin, APS & uni-assist dossier verification",
      "Sperrkonto setup & German embassy visa preparation",
      "Direct German hospital & Ausbildung employer placement",
    ],
  },
];

interface RazorpayHandlerResponse {
  razorpay_payment_id?: string;
  razorpay_order_id?: string;
  razorpay_signature?: string;
}

interface RazorpayWindow extends Window {
  Razorpay?: new (options: Record<string, unknown>) => { open: () => void };
}

function ensureRazorpayCheckoutScript(): Promise<boolean> {
  if (typeof window === "undefined") return Promise.resolve(false);
  const rzWindow = window as unknown as RazorpayWindow;
  if (typeof rzWindow.Razorpay === "function") {
    return Promise.resolve(true);
  }

  return new Promise((resolve) => {
    const existing = document.querySelector<HTMLScriptElement>(
      'script[src="https://checkout.razorpay.com/v1/checkout.js"]',
    );
    if (existing) {
      existing.addEventListener("load", () => resolve(true), { once: true });
      existing.addEventListener("error", () => resolve(false), { once: true });
      window.setTimeout(
        () => resolve(typeof (window as unknown as RazorpayWindow).Razorpay === "function"),
        2500,
      );
      return;
    }

    const script = document.createElement("script");
    script.src = "https://checkout.razorpay.com/v1/checkout.js";
    script.async = true;
    script.onload = () => resolve(true);
    script.onerror = () => resolve(false);
    document.body.appendChild(script);
  });
}

function PricingContentInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { user, isAuthenticated } = useAuth();

  const requestedProductSlug = searchParams.get("product") || "";
  const requestedTitle = searchParams.get("title") || "";

  const [fallbackProductSlug] = useState("gtf-all-access-pass");
  const [submittingTier, setSubmittingTier] = useState<string | null>(null);
  const [checkoutNotice, setCheckoutNotice] = useState<string | null>(null);
  const [checkoutPreview, setCheckoutPreview] = useState<CheckoutSessionPreview | null>(null);
  const [copiedUpi, setCopiedUpi] = useState(false);

  const activeSlug = useMemo(
    () => requestedProductSlug || fallbackProductSlug,
    [requestedProductSlug, fallbackProductSlug],
  );

  const handleCopyUpi = () => {
    navigator.clipboard.writeText(GTF_BANK_DETAILS.upiId);
    setCopiedUpi(true);
    window.setTimeout(() => setCopiedUpi(false), 2500);
  };

  const handleTierAction = async (tier: PricingTier) => {
    setCheckoutNotice(null);

    if (tier.id === "relocation_cohort") {
      const msg = encodeURIComponent(
        `Hallo GTF Berlin Admissions! I would like to apply for the Berlin Relocation & § 81a Mentorship Cohort.${
          user?.userEmail ? `\nRegistered Email: ${user.userEmail}` : ""
        }`,
      );
      window.open(`${BRAND.whatsappUrl}?text=${msg}`, "_blank", "noopener,noreferrer");
      return;
    }

    setSubmittingTier(tier.id);
    try {
      const res = await fetch("/api/checkout/create-session", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          productSlug: activeSlug,
          tierKey: tier.checkoutTierKey || "all_access_pass",
          currency: "INR",
          userEmail: user?.userEmail || "",
          studentName: user?.fullName || "GTF Candidate",
          whatsappPhone: user?.phone || "",
        }),
      });

      const session = await res.json().catch(() => null);
      if (!res.ok || !session) {
        setCheckoutPreview({
          mode: "sandbox",
          tierName: tier.name,
          priceEur: tier.priceLabel,
          priceInr: tier.subPriceLabel,
          productTitle: requestedTitle || "GTF All-Access Pro Membership",
        });
        return;
      }

      if (session.mode === "live" && session.keyId) {
        const scriptReady = await ensureRazorpayCheckoutScript();
        const rzWindow = window as unknown as RazorpayWindow;
        if (scriptReady && typeof rzWindow.Razorpay === "function") {
          const rzp = new rzWindow.Razorpay({
            key: session.keyId,
            amount: session.amountSubunits,
            currency: "INR",
            name: BRAND.name,
            description: `${tier.name} (${tier.priceLabel}/mo)`,
            order_id: session.orderId,
            prefill: {
              name: user?.fullName || "",
              email: user?.userEmail || "",
              contact: user?.phone || "",
            },
            theme: { color: "#07090E" },
            handler: async (response: RazorpayHandlerResponse) => {
              setCheckoutNotice("Verifying payment signature with GTF Berlin billing…");
              try {
                const verifyRes = await fetch("/api/checkout/verify", {
                  method: "POST",
                  headers: { "Content-Type": "application/json" },
                  body: JSON.stringify({
                    orderId: response.razorpay_order_id || session.orderId,
                    paymentId: response.razorpay_payment_id,
                    signature: response.razorpay_signature,
                    productSlug: activeSlug,
                    tierKey: tier.checkoutTierKey || "all_access_pass",
                    userEmail: user?.userEmail || "",
                    studentName: user?.fullName || "",
                  }),
                });

                const verifyData = (await verifyRes.json().catch(() => null)) as {
                  ok?: boolean;
                  error?: string;
                  redirectUrl?: string;
                } | null;

                if (verifyRes.ok && verifyData?.ok) {
                  setCheckoutNotice(
                    "GTF Pro Membership verified and unlocked. Redirecting to your Profile…",
                  );
                  router.push(verifyData.redirectUrl || "/profile?upgraded=1");
                } else {
                  setCheckoutNotice(
                    verifyData?.error ||
                      "Payment received. If your Pro badge does not appear within 60 seconds, contact Berlin Desk with your payment reference.",
                  );
                }
              } catch {
                setCheckoutNotice(
                  "Payment submitted. Verification is taking longer than expected — please refresh your Profile page shortly.",
                );
              }
            },
          });
          rzp.open();
          return;
        }
      }

      setCheckoutPreview({
        mode: "sandbox",
        tierName: tier.name,
        priceEur: tier.priceLabel,
        priceInr: `₹${Number(session.amount || 4999).toLocaleString("en-IN")}`,
        orderId: session.orderId,
        upiIntent: session.upi?.intentUrl,
        productTitle: requestedTitle || session.product?.title || "GTF All-Access Pro",
      });
    } catch {
      setCheckoutNotice("Unable to initialize checkout right now. Use Berlin Admissions Concierge below.");
    } finally {
      setSubmittingTier(null);
    }
  };

  return (
    <div className="min-h-screen flex flex-col bg-[#07090E] text-white">
      <Navbar />

      <main className="flex-1 pb-24 lg:pb-16">
        <BreadcrumbHeader
          breadcrumbs={[
            { label: "Home", href: isAuthenticated ? "/dashboard" : "/" },
            { label: "Membership & Pricing" },
          ]}
          eyebrow="GTF PRO MEMBERSHIP · BERLIN"
          title="Engineered for Mastery."
          subtitle={
            requestedTitle
              ? `Subscribe to GTF Pro (€50 / month) to unlock "${requestedTitle}" and every module across the Berlin ecosystem.`
              : "Transparent SaaS membership for serious Germany candidates — no hidden fees, no fragmented add-ons."
          }
          theme="hub"
          backHref={isAuthenticated ? "/dashboard" : "/"}
          backLabel={isAuthenticated ? "Hub" : "Home"}
        />

        <section className="mx-auto max-w-6xl px-4 sm:px-8 py-12 space-y-10">
          {!isAuthenticated && (
            <div className="rounded-2xl border border-white/10 bg-[#0D1017] p-5 sm:p-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="space-y-1">
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-white/55">
                  Verified Identity Required
                </p>
                <p className="text-sm text-white/80">
                  Sign in or verify your email first so your membership attaches permanently to your GTF ID.
                </p>
              </div>
              <div className="flex items-center gap-3 shrink-0">
                <Link
                  href="/login?next=%2Fpricing"
                  className="inline-flex items-center justify-center rounded-xl border border-white/20 bg-white/[0.04] px-5 py-2.5 text-xs font-semibold uppercase tracking-[0.16em] text-white hover:border-white/40 transition"
                >
                  Sign In
                </Link>
                <Link
                  href="/register"
                  className="inline-flex items-center justify-center rounded-xl !bg-white px-5 py-2.5 text-xs font-semibold uppercase tracking-[0.16em] !text-[#07090E] hover:opacity-90 transition"
                >
                  Create Account
                </Link>
              </div>
            </div>
          )}

          {checkoutNotice && (
            <div className="rounded-2xl border border-emerald-400/25 bg-emerald-500/10 p-5 text-sm text-emerald-200 flex items-start gap-3">
              <CheckCircle2 className="h-5 w-5 text-emerald-400 shrink-0 mt-0.5" />
              <p>{checkoutNotice}</p>
            </div>
          )}

          {/* 3 Membership Tier Cards */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-stretch">
            {PRICING_TIERS.map((tier) => (
              <div
                key={tier.id}
                className={`rounded-2xl border p-7 sm:p-8 flex flex-col justify-between transition ${
                  tier.highlighted
                    ? "border-white/35 bg-[#0D1017] shadow-[0_24px_80px_rgba(0,0,0,0.65)]"
                    : "border-white/10 bg-[#0D1017]/80"
                }`}
              >
                <div className="space-y-6">
                  <div className="flex items-center justify-between gap-2">
                    <span
                      className={`rounded-full px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.18em] ${
                        tier.highlighted
                          ? "!bg-white !text-[#07090E]"
                          : "border border-white/15 bg-white/[0.04] text-white/75"
                      }`}
                    >
                      {tier.badge}
                    </span>
                    {tier.highlighted && <Sparkles className="h-4 w-4 text-white/80" />}
                  </div>

                  <div className="space-y-2">
                    <h2 className="text-xl font-medium tracking-tight text-white">
                      {tier.name}
                    </h2>
                    <div className="flex items-baseline gap-2">
                      <span className="text-4xl font-light tracking-tight text-white">
                        {tier.priceLabel}
                      </span>
                      <span className="text-xs uppercase tracking-[0.16em] text-white/50">
                        {tier.billingCycle}
                      </span>
                    </div>
                    <p className="text-xs text-white/50">{tier.subPriceLabel}</p>
                  </div>

                  <p className="text-sm leading-relaxed text-white/70">
                    {tier.description}
                  </p>

                  <ul className="space-y-3 border-t border-white/10 pt-5 text-xs text-white/80">
                    {tier.features.map((feat) => (
                      <li key={feat} className="flex items-start gap-2.5">
                        <Check className="h-4 w-4 text-emerald-400 shrink-0 mt-0.5" />
                        <span>{feat}</span>
                      </li>
                    ))}
                  </ul>
                </div>

                <div className="pt-8">
                  <button
                    type="button"
                    disabled={submittingTier === tier.id}
                    onClick={() => handleTierAction(tier)}
                    className={`w-full h-12 rounded-xl text-xs font-semibold uppercase tracking-[0.16em] inline-flex items-center justify-center gap-2 transition disabled:opacity-50 ${
                      tier.highlighted
                        ? "!bg-white !text-[#07090E] hover:opacity-90"
                        : "border border-white/20 bg-white/[0.05] text-white hover:border-white/40 hover:bg-white/[0.08]"
                    }`}
                  >
                    {submittingTier === tier.id ? (
                      <>
                        <Loader2 className="h-4 w-4 animate-spin" />
                        <span>Preparing Session</span>
                      </>
                    ) : (
                      <>
                        <span>{tier.ctaLabel}</span>
                        <ArrowRight className="h-4 w-4" />
                      </>
                    )}
                  </button>
                </div>
              </div>
            ))}
          </div>

          {/* Inline Payment / Concierge Verification Panel (No Popups, No Demo Bypass) */}
          {checkoutPreview && (
            <div className="rounded-2xl border border-white/15 bg-[#0D1017] p-6 sm:p-8 space-y-6">
              <div className="flex flex-wrap items-start justify-between gap-4 border-b border-white/10 pb-5">
                <div className="space-y-1">
                  <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-emerald-400">
                    GTF Berlin Instant SEPA / UPI Activation · {checkoutPreview.orderId || "GTF-DIRECT"}
                  </p>
                  <h3 className="text-2xl font-light text-white">
                    {checkoutPreview.tierName} · {checkoutPreview.priceEur}/mo
                  </h3>
                  <p className="text-xs text-white/60">
                    Entitlement Target: {checkoutPreview.productTitle} · {checkoutPreview.priceInr} INR equivalent
                  </p>
                </div>
                <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-400/25 bg-emerald-500/10 px-3 py-1 text-[11px] font-semibold text-emerald-300">
                  <ShieldCheck className="h-3.5 w-3.5" />
                  <span>Webhook-Verified Fulfillment</span>
                </span>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="rounded-xl border border-white/10 bg-[#07090E] p-5 space-y-3">
                  <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-white/50">
                    Direct Bank / Instant UPI (India &amp; International)
                  </p>
                  <p className="text-xs text-white/75 leading-relaxed">
                    Remit {checkoutPreview.priceEur} ({checkoutPreview.priceInr}) to official account{" "}
                    <span className="font-mono text-white">
                      {GTF_BANK_DETAILS.beneficiary} ({GTF_BANK_DETAILS.bankName} · A/C {GTF_BANK_DETAILS.accountNumber})
                    </span>
                    . Access is granted automatically after server payment verification.
                  </p>
                  <div className="flex items-center justify-between gap-2 rounded-xl border border-white/10 bg-white/[0.03] px-3.5 py-2.5 text-xs">
                    <span className="font-mono text-white/85 truncate">
                      {GTF_BANK_DETAILS.upiId}
                    </span>
                    <button
                      type="button"
                      onClick={handleCopyUpi}
                      className="inline-flex items-center gap-1.5 rounded-lg border border-white/15 bg-white/[0.06] px-2.5 py-1 text-[11px] font-semibold text-white hover:border-white/30 shrink-0"
                    >
                      <Copy className="h-3 w-3" />
                      <span>{copiedUpi ? "Copied" : "Copy UPI"}</span>
                    </button>
                  </div>
                </div>

                <div className="rounded-xl border border-white/10 bg-[#07090E] p-5 flex flex-col justify-between space-y-4">
                  <div className="space-y-1.5">
                    <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-white/50">
                      Berlin Admissions Concierge
                    </p>
                    <p className="text-xs text-white/75 leading-relaxed">
                      Send your payment confirmation or request a SEPA / Stripe invoice for European billing directly with our Berlin desk.
                    </p>
                  </div>
                  <a
                    href={`${BRAND.whatsappUrl}?text=${encodeURIComponent(
                      `Hallo GTF Berlin! I want to activate ${checkoutPreview.tierName} (${checkoutPreview.priceEur}/mo) for ${
                        user?.userEmail || "my account"
                      }. Ref: ${checkoutPreview.orderId || "PRICING"}`,
                    )}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center justify-center gap-2 rounded-xl !bg-white px-5 py-3 text-xs font-semibold uppercase tracking-[0.16em] !text-[#07090E] hover:opacity-90 transition"
                  >
                    <span>Confirm Activation with Berlin Desk</span>
                    <ExternalLink className="h-3.5 w-3.5" />
                  </a>
                </div>
              </div>
            </div>
          )}
        </section>
      </main>

      <BottomNavigationBar />
    </div>
  );
}

export default function PricingPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-[#07090E] flex items-center justify-center">
          <Loader2 className="h-5 w-5 animate-spin text-white/50" />
        </div>
      }
    >
      <PricingContentInner />
    </Suspense>
  );
}
