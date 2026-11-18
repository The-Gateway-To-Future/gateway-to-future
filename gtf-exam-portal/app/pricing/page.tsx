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
  X,
} from "lucide-react";
import { Navbar } from "@/components/Navbar";
import { BreadcrumbHeader } from "@/components/BreadcrumbHeader";
import { CeoPortraitCard } from "@/components/CeoPortraitCard";
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
  shortName: string;
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
    shortName: "Single Track",
    priceLabel: "€29",
    subPriceLabel: "₹2,499 / mo",
    billingCycle: "/ month",
    description:
      "Focused access to one chosen preparation track — Language Academy, Studienkolleg Hub, or Pflege & Medizin.",
    ctaLabel: "Select Single Division (€29/mo)",
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
    badge: "MOST POPULAR",
    name: "GTF All-Access Pro",
    shortName: "GTF Pro",
    priceLabel: "€50",
    subPriceLabel: "₹4,499 / mo",
    billingCycle: "/ month",
    description:
      "The complete Berlin preparation engine across every CEFR level, Studienkolleg Aufnahmeprüfung track, and hospital Anerkennung simulation.",
    highlighted: true,
    ctaLabel: "Subscribe to GTF Pro (€50/mo)",
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
    badge: "CEO MENTORSHIP",
    name: "Berlin Relocation & § 81a",
    shortName: "Relocation",
    priceLabel: "Custom",
    subPriceLabel: "Tuition & placement",
    billingCycle: "cohort",
    description:
      "End-to-end relocation guidance in Germany with Sarbjit Kour (Founder & CEO, Gateway To Future) — from language clearance to Berlin hospital or university placement.",
    ctaLabel: "Book Berlin Admissions",
    features: [
      "Everything included in GTF All-Access Pro",
      "anabin, APS & uni-assist dossier verification",
      "Sperrkonto setup & German embassy visa preparation",
      "Direct German hospital & Ausbildung employer placement",
    ],
  },
];

interface ComparisonBenefit {
  title: string;
  note?: string;
  singleType: "text" | "check" | "cross";
  singleValue?: string;
  proType: "text" | "check" | "cross";
  proValue?: string;
}

const COMPARISON_BENEFITS: ComparisonBenefit[] = [
  {
    title: "CEFR A1–B2 Core Vocabulary & Grammar Flashcards (30/deck)",
    note: "High-yield vocabulary decks & 122 Säulen grammar Dossiers",
    singleType: "text",
    singleValue: "Basic",
    proType: "text",
    proValue: "Full All-Levels",
  },
  {
    title: "Goethe & telc Interactive Hören / Lesen Labs (40 Labs)",
    note: "Studio German audio with synchronized interactive answer sheets",
    singleType: "cross",
    proType: "check",
  },
  {
    title: "Official Exam Simulations & Modelltests (Timed)",
    note: "Goethe & telc standard timed exam room with instant scoring",
    singleType: "cross",
    proType: "check",
  },
  {
    title: "AI Speaking & Pronunciation Studio (DE-DE)",
    note: "Native Berlin de-DE phonetic grading & accent feedback",
    singleType: "text",
    singleValue: "Limited",
    proType: "text",
    proValue: "Unlimited",
  },
  {
    title: "Studienkolleg (M/T/W/G-Kurs) & Pflege Modules",
    note: "Foundation college formula suites, past papers & clinical ISBAR",
    singleType: "cross",
    proType: "check",
  },
  {
    title: "Hindi + Roman Hinglish + English Explanations",
    note: "Triple-language pedagogical clarity for complex German grammar",
    singleType: "check",
    proType: "check",
  },
  {
    title: "Direct Berlin HQ / WhatsApp Priority Mentor Support",
    note: "Priority admissions guidance with Sarbjit Kour & Berlin desk",
    singleType: "cross",
    proType: "check",
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
  const [selectedPlanId, setSelectedPlanId] = useState<"single_division" | "gtf_pro">("gtf_pro");
  const [submittingTier, setSubmittingTier] = useState<string | null>(null);
  const [checkoutNotice, setCheckoutNotice] = useState<string | null>(null);
  const [checkoutPreview, setCheckoutPreview] = useState<CheckoutSessionPreview | null>(null);
  const [copiedUpi, setCopiedUpi] = useState(false);

  const activeSlug = useMemo(
    () => requestedProductSlug || fallbackProductSlug,
    [requestedProductSlug, fallbackProductSlug],
  );

  const selectedTier = useMemo(
    () => PRICING_TIERS.find((t) => t.id === selectedPlanId) || PRICING_TIERS[1],
    [selectedPlanId],
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

  const renderCellIcon = (type: "text" | "check" | "cross", value?: string, isHighlighted?: boolean) => {
    if (type === "check") {
      return (
        <span className="inline-flex h-6 w-6 sm:h-7 sm:w-7 items-center justify-center rounded-full bg-emerald-50 border border-emerald-200 text-emerald-700 shadow-2xs">
          <Check className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-emerald-600 stroke-[3]" />
        </span>
      );
    }
    if (type === "cross") {
      return (
        <span className="inline-flex h-6 w-6 sm:h-7 sm:w-7 items-center justify-center rounded-full bg-slate-100 border border-slate-200 text-slate-400">
          <X className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-slate-400 stroke-[2.5]" />
        </span>
      );
    }
    return (
      <span
        className={`inline-block rounded-md px-1.5 sm:px-2.5 py-0.5 text-[9px] sm:text-xs font-bold leading-tight text-center ${
          isHighlighted
            ? "bg-emerald-50 text-emerald-950 border border-emerald-300"
            : "bg-slate-100 text-slate-800 border border-slate-200"
        }`}
      >
        {value}
      </span>
    );
  };

  return (
    <div className="min-h-screen flex flex-col bg-slate-50 text-slate-900">
      <Navbar />

      <main className="flex-1 pb-32 lg:pb-36">
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
              : "Transparent SaaS membership for serious Germany candidates — compare features below and choose your plan."
          }
          theme="hub"
          backHref={isAuthenticated ? "/dashboard" : "/"}
          backLabel={isAuthenticated ? "Hub" : "Home"}
        />

        <section className="mx-auto max-w-5xl px-3 sm:px-6 py-8 sm:py-12 space-y-8 sm:space-y-10">
          {!isAuthenticated && (
            <div className="rounded-2xl border border-slate-200 bg-white p-5 sm:p-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-xs">
              <div className="space-y-1">
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
                  Verified Identity Required
                </p>
                <p className="text-sm text-slate-700">
                  Sign in or verify your email first so your membership attaches permanently to your GTF ID.
                </p>
              </div>
              <div className="flex items-center gap-3 shrink-0">
                <Link
                  href="/login?next=%2Fpricing"
                  className="inline-flex items-center justify-center rounded-xl border border-slate-300 bg-white px-5 py-2.5 text-xs font-semibold uppercase tracking-[0.16em] text-slate-800 hover:bg-slate-50 hover:border-slate-400 transition shadow-xs"
                >
                  Sign In
                </Link>
                <Link
                  href="/register"
                  className="inline-flex items-center justify-center rounded-xl bg-slate-900 px-5 py-2.5 text-xs font-semibold uppercase tracking-[0.16em] text-white hover:bg-slate-800 transition shadow-sm"
                >
                  Create Account
                </Link>
              </div>
            </div>
          )}

          {checkoutNotice && (
            <div className="rounded-2xl border border-emerald-300 bg-emerald-50 p-5 text-sm text-emerald-900 flex items-start gap-3 shadow-xs">
              <CheckCircle2 className="h-5 w-5 text-emerald-600 shrink-0 mt-0.5" />
              <p>{checkoutNotice}</p>
            </div>
          )}

          {/* Unified Comparison Matrix (Disney+ Hotstar Style) */}
          <div className="rounded-2xl sm:rounded-3xl border border-slate-200 bg-white shadow-sm overflow-hidden">
            {/* Matrix Header Banner */}
            <div className="border-b border-slate-200 bg-slate-50/80 px-4 sm:px-6 py-4 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div>
                <p className="text-[11px] font-bold uppercase tracking-[0.2em] text-slate-500">
                  Side-by-Side Benefit Comparison
                </p>
                <h2 className="text-lg sm:text-xl font-bold text-slate-900">
                  Select Your Preparation Level
                </h2>
              </div>
              <span className="text-[11px] text-slate-500 font-medium">
                Tap a plan column to select
              </span>
            </div>

            {/* Sticky Plan Headers Row */}
            <div className="sticky top-[56px] sm:top-[64px] z-20 border-b border-slate-200 bg-white/95 backdrop-blur-md">
              <div className="grid grid-cols-12 items-stretch">
                {/* Feature Column Label */}
                <div className="col-span-6 sm:col-span-6 p-3 sm:p-5 flex flex-col justify-end">
                  <span className="text-[10px] sm:text-xs font-bold uppercase tracking-[0.18em] text-slate-400">
                    Platform Benefits
                  </span>
                </div>

                {/* Plan 1 Column Header: Single Division */}
                <button
                  type="button"
                  onClick={() => setSelectedPlanId("single_division")}
                  className={`col-span-3 sm:col-span-3 p-2.5 sm:p-4 text-center flex flex-col items-center justify-between transition cursor-pointer border-l border-slate-200 ${
                    selectedPlanId === "single_division"
                      ? "bg-slate-100/90 ring-2 ring-inset ring-slate-900"
                      : "hover:bg-slate-50/80"
                  }`}
                >
                  <div className="w-full flex flex-col items-center gap-1">
                    <span className="rounded-full bg-slate-200/80 px-2 py-0.5 text-[9px] font-bold uppercase tracking-wider text-slate-700">
                      Single
                    </span>
                    <h3 className="text-xs sm:text-sm font-bold text-slate-900 leading-tight">
                      Single Track
                    </h3>
                  </div>

                  <div className="mt-2 text-center">
                    <div className="text-base sm:text-2xl font-black text-slate-900">
                      €29
                    </div>
                    <div className="text-[9px] sm:text-[11px] text-slate-500 leading-tight">
                      ₹2,499 / mo
                    </div>
                  </div>

                  <div className="mt-2.5">
                    <span
                      className={`inline-flex items-center justify-center h-4 w-4 rounded-full border ${
                        selectedPlanId === "single_division"
                          ? "border-slate-900 bg-slate-900 text-white"
                          : "border-slate-300 bg-white"
                      }`}
                    >
                      {selectedPlanId === "single_division" && (
                        <span className="h-1.5 w-1.5 rounded-full bg-white" />
                      )}
                    </span>
                  </div>
                </button>

                {/* Plan 2 Column Header: GTF Pro (Most Popular) */}
                <button
                  type="button"
                  onClick={() => setSelectedPlanId("gtf_pro")}
                  className={`col-span-3 sm:col-span-3 p-2.5 sm:p-4 text-center flex flex-col items-center justify-between transition cursor-pointer border-l border-slate-200 relative ${
                    selectedPlanId === "gtf_pro"
                      ? "bg-emerald-50/70 ring-2 ring-inset ring-emerald-600"
                      : "hover:bg-slate-50/80"
                  }`}
                >
                  <div className="w-full flex flex-col items-center gap-1">
                    <span className="inline-flex items-center gap-1 rounded-full bg-emerald-600 px-2 py-0.5 text-[9px] font-extrabold uppercase tracking-wider text-white shadow-xs">
                      <Sparkles className="h-2.5 w-2.5" />
                      <span>Popular</span>
                    </span>
                    <h3 className="text-xs sm:text-sm font-bold text-slate-900 leading-tight">
                      GTF Pro
                    </h3>
                  </div>

                  <div className="mt-2 text-center">
                    <div className="text-base sm:text-2xl font-black text-slate-900">
                      €50
                    </div>
                    <div className="text-[9px] sm:text-[11px] text-emerald-800 font-semibold leading-tight">
                      ₹4,499 / mo
                    </div>
                  </div>

                  <div className="mt-2.5">
                    <span
                      className={`inline-flex items-center justify-center h-4 w-4 rounded-full border ${
                        selectedPlanId === "gtf_pro"
                          ? "border-emerald-600 bg-emerald-600 text-white"
                          : "border-slate-300 bg-white"
                      }`}
                    >
                      {selectedPlanId === "gtf_pro" && (
                        <Check className="h-2.5 w-2.5 text-white stroke-[3]" />
                      )}
                    </span>
                  </div>
                </button>
              </div>
            </div>

            {/* Matrix Body Rows */}
            <div className="divide-y divide-slate-100">
              {COMPARISON_BENEFITS.map((benefit, idx) => (
                <div
                  key={idx}
                  className="grid grid-cols-12 items-stretch hover:bg-slate-50/40 transition-colors"
                >
                  {/* Left Column: Feature Title & Note */}
                  <div className="col-span-6 sm:col-span-6 p-3 sm:p-4 flex flex-col justify-center">
                    <p className="text-xs sm:text-sm font-semibold text-slate-900 leading-snug">
                      {benefit.title}
                    </p>
                    {benefit.note && (
                      <p className="text-[10px] sm:text-xs text-slate-500 mt-0.5 hidden sm:block">
                        {benefit.note}
                      </p>
                    )}
                  </div>

                  {/* Single Track Cell */}
                  <div
                    onClick={() => setSelectedPlanId("single_division")}
                    className={`col-span-3 sm:col-span-3 p-2 sm:p-4 flex items-center justify-center border-l border-slate-200 transition-colors cursor-pointer ${
                      selectedPlanId === "single_division" ? "bg-slate-100/40" : ""
                    }`}
                  >
                    {renderCellIcon(
                      benefit.singleType,
                      benefit.singleValue,
                      selectedPlanId === "single_division",
                    )}
                  </div>

                  {/* GTF Pro Cell */}
                  <div
                    onClick={() => setSelectedPlanId("gtf_pro")}
                    className={`col-span-3 sm:col-span-3 p-2 sm:p-4 flex items-center justify-center border-l border-slate-200 transition-colors cursor-pointer ${
                      selectedPlanId === "gtf_pro" ? "bg-emerald-50/30" : ""
                    }`}
                  >
                    {renderCellIcon(
                      benefit.proType,
                      benefit.proValue,
                      selectedPlanId === "gtf_pro",
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Relocation Cohort VIP Mentorship Card */}
          <div className="rounded-2xl border border-amber-300 bg-gradient-to-br from-amber-50/70 via-white to-amber-50/40 p-5 sm:p-7 space-y-4 shadow-xs">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="space-y-1.5">
                <div className="flex items-center gap-2">
                  <span className="rounded-full bg-amber-100 border border-amber-300 px-3 py-0.5 text-[10px] font-bold uppercase tracking-wider text-amber-900">
                    CEO MENTORSHIP &amp; PLACEMENT
                  </span>
                  <span className="text-xs font-bold text-amber-800">
                    Limited 2026/27 Cohort
                  </span>
                </div>
                <h3 className="text-lg sm:text-2xl font-bold tracking-tight text-slate-900">
                  Berlin Relocation &amp; § 81a Fast-Track Cohort
                </h3>
                <p className="text-xs sm:text-sm text-slate-600 max-w-2xl leading-relaxed">
                  End-to-end relocation guidance in Germany with Sarbjit Kour (Founder &amp; CEO, Gateway To Future) — from anabin &amp; APS credential validation to Sperrkonto setup, German embassy visa filing, and direct placement into Berlin hospital or university networks.
                </p>
              </div>
              <button
                type="button"
                onClick={() => handleTierAction(PRICING_TIERS[2])}
                className="shrink-0 h-11 px-5 rounded-xl border border-amber-400 bg-amber-400/20 hover:bg-amber-400/30 text-amber-950 font-bold text-xs uppercase tracking-[0.14em] inline-flex items-center gap-2 transition cursor-pointer"
              >
                <span>Book Berlin Admissions</span>
                <ExternalLink className="h-3.5 w-3.5" />
              </button>
            </div>
          </div>

          {/* Inline Payment / Concierge Verification Panel */}
          {checkoutPreview && (
            <div className="rounded-2xl border border-emerald-300 bg-white p-6 sm:p-8 space-y-6 shadow-sm">
              <div className="flex flex-wrap items-start justify-between gap-4 border-b border-slate-100 pb-5">
                <div className="space-y-1">
                  <p className="text-[11px] font-bold uppercase tracking-[0.22em] text-emerald-700">
                    GTF Berlin Instant SEPA / UPI Activation · {checkoutPreview.orderId || "GTF-DIRECT"}
                  </p>
                  <h3 className="text-2xl font-bold text-slate-900">
                    {checkoutPreview.tierName} · {checkoutPreview.priceEur}/mo
                  </h3>
                  <p className="text-xs text-slate-600">
                    Target Entitlement: {checkoutPreview.productTitle} · {checkoutPreview.priceInr} INR equivalent
                  </p>
                </div>
                <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-300 bg-emerald-50 px-3 py-1 text-[11px] font-semibold text-emerald-800">
                  <ShieldCheck className="h-3.5 w-3.5" />
                  <span>Webhook-Verified Fulfillment</span>
                </span>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="rounded-xl border border-slate-200 bg-slate-50 p-5 space-y-3">
                  <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-slate-500">
                    Direct Bank / Instant UPI (India &amp; International)
                  </p>
                  <p className="text-xs text-slate-700 leading-relaxed">
                    Remit {checkoutPreview.priceEur} ({checkoutPreview.priceInr}) to official account{" "}
                    <span className="font-mono font-bold text-slate-900">
                      {GTF_BANK_DETAILS.beneficiary} ({GTF_BANK_DETAILS.bankName} · A/C {GTF_BANK_DETAILS.accountNumber})
                    </span>
                    . Access is granted automatically after server payment verification.
                  </p>
                  <div className="flex items-center justify-between gap-2 rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-xs shadow-xs">
                    <span className="font-mono text-slate-900 truncate font-semibold">
                      {GTF_BANK_DETAILS.upiId}
                    </span>
                    <button
                      type="button"
                      onClick={handleCopyUpi}
                      className="inline-flex items-center gap-1.5 rounded-lg border border-slate-300 bg-white px-2.5 py-1 text-[11px] font-semibold text-slate-800 hover:bg-slate-50 shrink-0"
                    >
                      <Copy className="h-3 w-3" />
                      <span>{copiedUpi ? "Copied" : "Copy UPI"}</span>
                    </button>
                  </div>
                </div>

                <div className="rounded-xl border border-slate-200 bg-slate-50 p-5 flex flex-col justify-between space-y-4">
                  <div className="space-y-1.5">
                    <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-slate-500">
                      Berlin Admissions Concierge
                    </p>
                    <p className="text-xs text-slate-700 leading-relaxed">
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
                    className="inline-flex items-center justify-center gap-2 rounded-xl bg-slate-900 px-5 py-3 text-xs font-semibold uppercase tracking-[0.16em] text-white hover:bg-slate-800 transition shadow-sm"
                  >
                    <span>Confirm Activation with Berlin Desk</span>
                    <ExternalLink className="h-3.5 w-3.5" />
                  </a>
                </div>
              </div>
            </div>
          )}

          {/* Direct CEO Mentorship Showcase */}
          <div className="space-y-3 pt-2">
            <p className="text-[11px] font-bold uppercase tracking-[0.2em] text-slate-500">
              EXECUTIVE LEADERSHIP &amp; MENTORSHIP
            </p>
            <CeoPortraitCard compact />
          </div>
        </section>
      </main>

      {/* Prominent Sticky CTA Bar at Bottom (Single Action) */}
      <aside aria-label="Selected plan checkout action" className="fixed bottom-[58px] lg:bottom-0 inset-x-0 z-45 border-t border-slate-200 bg-white/95 backdrop-blur-xl px-4 py-3 sm:py-4 shadow-[0_-8px_25px_rgba(0,0,0,0.08)] pb-safe">
        <div className="mx-auto max-w-5xl flex items-center justify-between gap-3 sm:gap-6">
          <div className="min-w-0">
            <p className="text-[10px] sm:text-xs font-bold uppercase tracking-wider text-slate-500 truncate">
              Selected: <span className="text-slate-900 font-extrabold">{selectedTier.name}</span>
            </p>
            <p className="text-sm sm:text-base font-black text-slate-900 truncate">
              {selectedTier.priceLabel}{" "}
              <span className="text-xs font-normal text-slate-500">
                ({selectedTier.subPriceLabel})
              </span>
            </p>
          </div>

          <button
            type="button"
            disabled={submittingTier === selectedTier.id}
            onClick={() => handleTierAction(selectedTier)}
            className="h-11 sm:h-12 px-4 sm:px-8 rounded-xl bg-slate-900 text-white text-xs sm:text-sm font-bold uppercase tracking-[0.14em] inline-flex items-center justify-center gap-2 hover:bg-slate-800 transition shadow-md disabled:opacity-50 shrink-0 cursor-pointer"
          >
            {submittingTier === selectedTier.id ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin text-white" />
                <span className="hidden sm:inline">Preparing Checkout…</span>
              </>
            ) : (
              <>
                <span>Continue with {selectedTier.name} →</span>
                <ArrowRight className="h-4 w-4" />
              </>
            )}
          </button>
        </div>
      </aside>

      <BottomNavigationBar />
    </div>
  );
}

export default function PricingPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-slate-50 flex items-center justify-center">
          <Loader2 className="h-5 w-5 animate-spin text-slate-500" />
        </div>
      }
    >
      <PricingContentInner />
    </Suspense>
  );
}
