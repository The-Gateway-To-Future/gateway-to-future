"use client";

import React, { Suspense, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import {
  ArrowRight,
  CalendarCheck2,
  Check,
  CheckCircle2,
  Copy,
  ExternalLink,
  Loader2,
  Lock,
  Mail,
  MapPin,
  Phone,
  ShieldCheck,
  Sparkles,
  X,
} from "lucide-react";
import { Navbar } from "@/components/Navbar";
import { BreadcrumbHeader, HEADER_IMAGES } from "@/components/BreadcrumbHeader";
import { CeoPortraitCard } from "@/components/CeoPortraitCard";
import { BottomNavigationBar } from "@/components/BottomNavigationBar";
import { ReaderAppNotice } from "@/components/ReaderAppNotice";
import { useAuth } from "@/lib/auth-context";
import { BRAND, GTF_BANK_DETAILS, INR_PRICING_TIERS } from "@/lib/config";
import { useIsNativeApp } from "@/lib/use-native-platform";

interface DirectDeskContact {
  deskName: string;
  phoneDisplay: string;
  phoneE164: string;
  whatsappUrl: string;
  email: string;
  headquarters: string;
}

interface ConfirmedDeskState {
  unlocked: boolean;
  source?: string;
  bookingRef?: string;
  appointment?: {
    email?: string;
    fullName?: string;
    pathway?: string;
    preferredSlot?: string;
    paidAt?: string;
  };
  contact?: DirectDeskContact | null;
}

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
  checkoutTierKey?: "level_bundle" | "studienkolleg_track" | "all_access_pass";
  features: string[];
}

const PRICING_TIERS: PricingTier[] = [
  {
    id: "single_division",
    badge: "SINGLE LEVEL",
    name: "CEFR Level Bundle",
    shortName: "Level Bundle",
    priceLabel: INR_PRICING_TIERS.level_bundle.formatted,
    subPriceLabel: "Full A1, A2, B1, or B2",
    billingCycle: "one-time",
    description:
      "Focused active access to one complete CEFR German level (A1, A2, B1, or B2) inside the German Language Academy.",
    ctaLabel: `Select Level Bundle (${INR_PRICING_TIERS.level_bundle.formatted})`,
    checkoutTierKey: "level_bundle",
    features: [
      "Complete original GTF workbooks & PDF reader for 1 CEFR level",
      "Native de-DE flashcard decks & studio audio",
      "Grammar drills & interactive answer sheets",
      "Standard email & progress telemetry sync",
    ],
  },
  {
    id: "gtf_pro",
    badge: "MOST POPULAR",
    name: "GTF All-Access Pro",
    shortName: "GTF Pro",
    priceLabel: INR_PRICING_TIERS.all_access_pass.formatted,
    subPriceLabel: "Complete A1–B2 Academy",
    billingCycle: "all-access",
    description:
      "Complete active access to all CEFR A1–B2 German Language Academy levels, timed Goethe/telc Modelltests, and AI grading — with Studienkolleg & Pflege included when launched (Early Access).",
    highlighted: true,
    ctaLabel: `Unlock GTF Pro (${INR_PRICING_TIERS.all_access_pass.formatted})`,
    checkoutTierKey: "all_access_pass",
    features: [
      "Unlimited German Language Academy (A1, A2, B1, B2 & 122 Säulen)",
      "40 interactive Hören/Lesen labs & timed Goethe/telc Modelltests",
      "AI Schreiben & Sprechen evaluation studio (de-DE)",
      "Studienkolleg & Fachsprache Pflege: Included when launched (Early Access)",
      "Verified student priority support from Berlin HQ",
    ],
  },
  {
    id: "relocation_cohort",
    badge: "ADVISORY MENTORSHIP",
    name: "Berlin Relocation & § 81a",
    shortName: "Relocation",
    priceLabel: INR_PRICING_TIERS.consultation_session.formatted,
    subPriceLabel: "1:1 Paid Appointment",
    billingCycle: "appointment",
    description:
      "Personalized Berlin-based guidance from the Gateway To Future Berlin & India Advisory Team — covering German language strategy, anabin/APS checks, and application preparation.",
    ctaLabel: "Book Paid Consultation",
    features: [
      "1:1 strategy mapping with Gateway To Future Berlin & India Advisory Team",
      "anabin, APS & uni-assist dossier verification checklists",
      "Sperrkonto checklist & German embassy interview preparation",
      "Direct Berlin Desk phone & WhatsApp unlocked upon confirmed booking",
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
    note: "High-yield vocabulary decks & 122 Säulen original GTF grammar dossiers",
    singleType: "text",
    singleValue: "1 Level",
    proType: "text",
    proValue: "All A1–B2",
  },
  {
    title: "Goethe & telc Interactive Hören / Lesen Labs (40 Labs)",
    note: "Studio German audio with synchronized interactive answer sheets",
    singleType: "cross",
    proType: "check",
  },
  {
    title: "Timed Goethe & telc Style Modelltests",
    note: "Exam-mode practice room with instant scoring and review",
    singleType: "cross",
    proType: "check",
  },
  {
    title: "AI Speaking & Pronunciation Studio (DE-DE)",
    note: "German phonetic & grammar feedback on submitted practice",
    singleType: "text",
    singleValue: "Limited",
    proType: "text",
    proValue: "Unlimited",
  },
  {
    title: "Studienkolleg (M/T/W/G-Kurs) & Pflege Modules",
    note: "Included when launched (Early Access) — active focus is CEFR A1–B2 Academy",
    singleType: "cross",
    proType: "text",
    proValue: "Early Access",
  },
  {
    title: "Hindi + Roman Hinglish + English Explanations",
    note: "Triple-language pedagogical clarity for complex German grammar",
    singleType: "check",
    proType: "check",
  },
  {
    title: "Direct Berlin Advisory Desk Support",
    note: "Priority admissions guidance with the Gateway To Future Mentorship Desk (direct phone disclosed upon confirmed booking)",
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
  const { isNative, ready: nativeReady } = useIsNativeApp();

  const requestedProductSlug = searchParams.get("product") || "";
  const requestedTitle = searchParams.get("title") || "";

  const [fallbackProductSlug] = useState("gtf-all-access-pass");
  const [selectedPlanId, setSelectedPlanId] = useState<"single_division" | "gtf_pro">("gtf_pro");
  const [submittingTier, setSubmittingTier] = useState<string | null>(null);
  const [checkoutNotice, setCheckoutNotice] = useState<string | null>(null);
  const [checkoutPreview, setCheckoutPreview] = useState<CheckoutSessionPreview | null>(null);
  const [copiedUpi, setCopiedUpi] = useState(false);

  // Paid-Appointment Gate & Consultation Booking State
  const [confirmedDesk, setConfirmedDesk] = useState<ConfirmedDeskState | null>(null);
  const [bookingName, setBookingName] = useState("");
  const [bookingEmail, setBookingEmail] = useState("");
  const [bookingPhone, setBookingPhone] = useState("");
  const [bookingPathway, setBookingPathway] = useState("German Language (A1–C1) & Goethe/telc");
  const [bookingSlot, setBookingSlot] = useState("9:00 PM IST (5:30 PM CET)");
  const [bookingNotes, setBookingNotes] = useState("");
  const [bookingSubmitting, setBookingSubmitting] = useState(false);
  const [bookingSandboxPreview, setBookingSandboxPreview] = useState<CheckoutSessionPreview | null>(null);
  const [utrReference, setUtrReference] = useState("");
  const [utrSubmitting, setUtrSubmitting] = useState(false);
  const [bookingFeedback, setBookingFeedback] = useState<string | null>(null);

  useEffect(() => {
    if (user?.fullName && !bookingName) {
      setBookingName(user.fullName);
    }
    if (user?.userEmail && !bookingEmail) {
      setBookingEmail(user.userEmail);
    }
    if (user?.phone && !bookingPhone) {
      setBookingPhone(user.phone);
    }
  }, [user?.fullName, user?.userEmail, user?.phone, bookingName, bookingEmail, bookingPhone]);

  useEffect(() => {
    let active = true;
    const headers: Record<string, string> = {};
    if (user?.sessionToken) {
      headers.Authorization = `Bearer ${user.sessionToken}`;
    }
    fetch("/api/appointments/contact", {
      cache: "no-store",
      credentials: "include",
      headers,
    })
      .then((res) => (res.ok ? res.json() : null))
      .then((data: ConfirmedDeskState | null) => {
        if (active && data) {
          setConfirmedDesk(data);
        }
      })
      .catch(() => {
        // Remains locked until confirmed
      });
    return () => {
      active = false;
    };
  }, [user?.sessionToken, user?.userEmail]);

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
      document.getElementById("consultation-booking")?.scrollIntoView({ behavior: "smooth" });
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
          priceInr: tier.priceLabel,
          productTitle: requestedTitle || tier.name,
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
            description: `${tier.name} (${tier.priceLabel})`,
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
                      `Payment received. If your Pro badge does not appear within 60 seconds, email ${BRAND.supportEmail} with your payment reference.`,
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
      setCheckoutNotice("Unable to initialize checkout right now. Use the Advisory Consultation & Billing section below.");
    } finally {
      setSubmittingTier(null);
    }
  };

  const handleBookPaidConsultation = async (e: React.FormEvent) => {
    e.preventDefault();
    setBookingFeedback(null);

    const cleanName = bookingName.trim();
    const cleanEmail = bookingEmail.trim().toLowerCase();
    const cleanPhone = bookingPhone.trim();

    if (!cleanName || !cleanEmail.includes("@") || !cleanPhone) {
      setBookingFeedback("Please provide your full name, valid email address, and phone/WhatsApp number.");
      return;
    }

    setBookingSubmitting(true);
    try {
      const res = await fetch("/api/checkout/create-session", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          productSlug: "gtf-berlin-consultation",
          tierKey: "consultation_session",
          currency: "INR",
          userEmail: cleanEmail,
          studentName: cleanName,
          whatsappPhone: cleanPhone,
          appointmentDetails: {
            pathway: bookingPathway,
            preferredSlot: bookingSlot,
            notes: bookingNotes,
          },
        }),
      });

      const session = await res.json().catch(() => null);
      if (!res.ok || !session) {
        setBookingSandboxPreview({
          mode: "sandbox",
          tierName: INR_PRICING_TIERS.consultation_session.title,
          priceEur: INR_PRICING_TIERS.consultation_session.formatted,
          priceInr: INR_PRICING_TIERS.consultation_session.formatted,
          productTitle: "1:1 Berlin & India Advisory Consultation",
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
            description: "1:1 Berlin & India Advisory Consultation (₹1,000)",
            order_id: session.orderId,
            prefill: {
              name: cleanName,
              email: cleanEmail,
              contact: cleanPhone,
            },
            theme: { color: "#07090E" },
            handler: async (response: RazorpayHandlerResponse) => {
              setBookingFeedback("Confirming appointment payment & unlocking direct Berlin Desk contact…");
              try {
                const verifyRes = await fetch("/api/checkout/verify", {
                  method: "POST",
                  headers: { "Content-Type": "application/json" },
                  credentials: "include",
                  body: JSON.stringify({
                    orderId: response.razorpay_order_id || session.orderId,
                    paymentId: response.razorpay_payment_id,
                    signature: response.razorpay_signature,
                    productSlug: "gtf-berlin-consultation",
                    tierKey: "consultation_session",
                    userEmail: cleanEmail,
                    studentName: cleanName,
                    appointmentDetails: {
                      pathway: bookingPathway,
                      preferredSlot: bookingSlot,
                      notes: bookingNotes,
                    },
                  }),
                });

                const verifyData = (await verifyRes.json().catch(() => null)) as {
                  ok?: boolean;
                  error?: string;
                  bookingRef?: string;
                  appointment?: ConfirmedDeskState["appointment"];
                  directContact?: DirectDeskContact;
                } | null;

                if (verifyRes.ok && verifyData?.ok && verifyData.directContact) {
                  setConfirmedDesk({
                    unlocked: true,
                    source: "paid_appointment",
                    bookingRef: verifyData.bookingRef,
                    appointment: verifyData.appointment,
                    contact: verifyData.directContact,
                  });
                  setBookingSandboxPreview(null);
                  setBookingFeedback("Appointment confirmed! Direct Berlin Desk contact details are now unlocked below.");
                } else {
                  setBookingFeedback(
                    verifyData?.error ||
                      `Payment received. Email your payment reference to ${BRAND.supportEmail} for immediate confirmation.`,
                  );
                }
              } catch {
                setBookingFeedback(
                  `Payment submitted. Email ${BRAND.supportEmail} if direct contact details do not unlock automatically.`,
                );
              }
            },
          });
          rzp.open();
          return;
        }
      }

      setBookingSandboxPreview({
        mode: "sandbox",
        tierName: INR_PRICING_TIERS.consultation_session.title,
        priceEur: INR_PRICING_TIERS.consultation_session.formatted,
        priceInr: `₹${Number(session.amount || 1000).toLocaleString("en-IN")}`,
        orderId: session.orderId,
        upiIntent: session.upi?.intentUrl,
        productTitle: "1:1 Berlin & India Advisory Consultation",
      });
    } catch {
      setBookingFeedback(`Unable to initialize booking payment. Please email ${BRAND.supportEmail}.`);
    } finally {
      setBookingSubmitting(false);
    }
  };

  const handleSubmitUtrVerification = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!utrReference.trim()) {
      setBookingFeedback("Please enter your UPI / Bank payment reference (UTR) to submit verification.");
      return;
    }
    setUtrSubmitting(true);
    setBookingFeedback(null);
    try {
      const res = await fetch("/api/enquiries", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: bookingName.trim() || user?.fullName || "GTF Candidate",
          email: bookingEmail.trim().toLowerCase() || user?.userEmail || "",
          whatsapp: bookingPhone.trim() || user?.phone || "Pending",
          track: bookingPathway,
          productSlug: "gtf-berlin-consultation",
          notes: `Paid Appointment Request (${bookingSlot}) | Order: ${bookingSandboxPreview?.orderId || "UPI-DIRECT"} | UTR/Ref: ${utrReference.trim()} | ${bookingNotes}`,
        }),
      });
      if (res.ok) {
        setBookingFeedback(
          `Payment reference ${utrReference.trim()} submitted. Once verified by our team, direct Berlin Desk contact details will be dispatched to ${bookingEmail.trim() || BRAND.supportEmail}.`,
        );
        setUtrReference("");
      } else {
        setBookingFeedback(`Could not submit reference automatically. Please email ${utrReference.trim()} to ${BRAND.supportEmail}.`);
      }
    } catch {
      setBookingFeedback(`Please email your payment reference to ${BRAND.supportEmail} for confirmation.`);
    } finally {
      setUtrSubmitting(false);
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

  if (!nativeReady) {
    return (
      <div className="min-h-screen flex flex-col bg-slate-50 text-slate-900">
        <Navbar />
        <main className="flex-1 flex items-center justify-center p-6">
          <Loader2 className="h-5 w-5 animate-spin text-slate-500" />
        </main>
        <BottomNavigationBar />
      </div>
    );
  }

  // Google Play & App Store Reader-App Mode: never expose external checkout, Razorpay,
  // UPI/bank transfers, or pricing CTAs inside native Capacitor Android/iOS builds.
  if (isNative) {
    return (
      <div className="min-h-screen flex flex-col bg-slate-50 text-slate-900">
        <Navbar />
        <main className="flex-1 pb-28 lg:pb-16">
          <BreadcrumbHeader
            breadcrumbs={[
              { label: "Home", href: isAuthenticated ? "/dashboard" : "/" },
              { label: "Enrolled Access" },
            ]}
            eyebrow="GATEWAY TO FUTURE · COMPANION PORTAL"
            title="Enrolled Student Portal."
            subtitle="Access your active German A1–B2 workbooks, flashcards, and exam simulations with your existing student credentials."
            theme="hub"
            backgroundImage={HEADER_IMAGES.b2}
            backHref={isAuthenticated ? "/dashboard" : "/"}
            backLabel={isAuthenticated ? "Hub" : "Home"}
          />
          <section className="mx-auto max-w-5xl px-4 sm:px-6 py-10 sm:py-14">
            <ReaderAppNotice isAuthenticated={isAuthenticated} />
          </section>
        </main>
        <BottomNavigationBar />
      </div>
    );
  }

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
              ? `Unlock "${requestedTitle}" and every active CEFR A1–B2 module with GTF All-Access Pro (${INR_PRICING_TIERS.all_access_pass.formatted}).`
              : "Transparent INR pricing aligned with our active CEFR A1–B2 German Language Academy — Studienkolleg & Pflege included when launched (Early Access)."
          }
          theme="hub"
          backgroundImage={HEADER_IMAGES.b2}
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
                      {PRICING_TIERS[0].shortName}
                    </h3>
                  </div>

                  <div className="mt-2 text-center">
                    <div className="text-base sm:text-2xl font-black text-slate-900">
                      {PRICING_TIERS[0].priceLabel}
                    </div>
                    <div className="text-[9px] sm:text-[11px] text-slate-500 leading-tight">
                      {PRICING_TIERS[0].subPriceLabel}
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
                      {PRICING_TIERS[1].shortName}
                    </h3>
                  </div>

                  <div className="mt-2 text-center">
                    <div className="text-base sm:text-2xl font-black text-slate-900">
                      {PRICING_TIERS[1].priceLabel}
                    </div>
                    <div className="text-[9px] sm:text-[11px] text-emerald-800 font-semibold leading-tight">
                      {PRICING_TIERS[1].subPriceLabel}
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

          {/* Relocation Cohort & Paid Consultation Booking Section */}
          <div id="consultation-booking" className="rounded-2xl border border-amber-300 bg-gradient-to-br from-amber-50/70 via-white to-amber-50/40 p-5 sm:p-7 space-y-6 shadow-xs scroll-mt-24">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-amber-200/70 pb-5">
              <div className="space-y-1.5">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="rounded-full bg-amber-100 border border-amber-300 px-3 py-0.5 text-[10px] font-bold uppercase tracking-wider text-amber-900">
                    ADVISORY MENTORSHIP &amp; PAID CONSULTATION
                  </span>
                  <span className="text-xs font-bold text-amber-800">
                    {INR_PRICING_TIERS.consultation_session.formatted} · Berlin &amp; India Advisory Team
                  </span>
                </div>
                <h3 className="text-lg sm:text-2xl font-bold tracking-tight text-slate-900">
                  1:1 Berlin &amp; India Advisory Consultation
                </h3>
                <p className="text-xs sm:text-sm text-slate-600 max-w-2xl leading-relaxed">
                  End-to-end pathway guidance with the Gateway To Future Berlin &amp; India Advisory Team — covering German CEFR strategy, anabin &amp; APS credential verification checklists, Sperrkonto guidance, German embassy interview prep, and structured hospital or university application coaching.
                </p>
              </div>
              <div className="shrink-0 rounded-xl border border-amber-300 bg-white px-4 py-2.5 text-center shadow-2xs">
                <p className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Consultation Fee</p>
                <p className="text-xl font-black text-slate-900">{INR_PRICING_TIERS.consultation_session.formatted}</p>
              </div>
            </div>

            {confirmedDesk?.unlocked && confirmedDesk.contact ? (
              <div className="rounded-2xl border border-emerald-300 bg-emerald-50/80 p-5 sm:p-6 space-y-5">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="space-y-1">
                    <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-600 px-3 py-1 text-[10px] font-bold uppercase tracking-[0.16em] text-white">
                      <CheckCircle2 className="h-3.5 w-3.5" />
                      <span>Appointment Confirmed · Direct Berlin Desk Unlocked</span>
                    </span>
                    <h4 className="text-lg font-bold text-slate-900 pt-1">
                      {confirmedDesk.contact.deskName}
                    </h4>
                    <p className="text-xs text-slate-700">
                      Booking Ref: <span className="font-mono font-bold">{confirmedDesk.bookingRef}</span>
                      {confirmedDesk.appointment?.preferredSlot ? ` · ${confirmedDesk.appointment.preferredSlot}` : ""}
                      {confirmedDesk.appointment?.pathway ? ` · ${confirmedDesk.appointment.pathway}` : ""}
                    </p>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                  <a
                    href={`tel:${confirmedDesk.contact.phoneE164}`}
                    className="flex items-center gap-3 rounded-xl border border-emerald-200 bg-white p-3.5 hover:border-emerald-400 transition"
                  >
                    <Phone className="h-4 w-4 text-emerald-700 shrink-0" />
                    <div>
                      <p className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Direct Phone Line</p>
                      <p className="font-mono font-bold text-slate-900">{confirmedDesk.contact.phoneDisplay}</p>
                    </div>
                  </a>

                  <a
                    href={confirmedDesk.contact.whatsappUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center justify-between gap-3 rounded-xl border border-emerald-200 bg-white p-3.5 hover:border-emerald-400 transition"
                  >
                    <div className="flex items-center gap-3">
                      <CalendarCheck2 className="h-4 w-4 text-emerald-700 shrink-0" />
                      <div>
                        <p className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Confirmed WhatsApp Desk</p>
                        <p className="font-semibold text-emerald-800">Open Direct WhatsApp</p>
                      </div>
                    </div>
                    <ExternalLink className="h-3.5 w-3.5 text-emerald-700 shrink-0" />
                  </a>

                  <a
                    href={`mailto:${confirmedDesk.contact.email}`}
                    className="flex items-center gap-3 rounded-xl border border-slate-200 bg-white p-3.5 hover:border-slate-300 transition"
                  >
                    <Mail className="h-4 w-4 text-slate-700 shrink-0" />
                    <div>
                      <p className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Official Email</p>
                      <p className="font-mono font-semibold text-slate-900">{confirmedDesk.contact.email}</p>
                    </div>
                  </a>

                  <div className="flex items-center gap-3 rounded-xl border border-slate-200 bg-white p-3.5">
                    <MapPin className="h-4 w-4 text-slate-700 shrink-0" />
                    <div>
                      <p className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Berlin Headquarters</p>
                      <p className="font-medium text-slate-800">{confirmedDesk.contact.headquarters}</p>
                    </div>
                  </div>
                </div>
              </div>
            ) : (
              <div className="space-y-5">
                <div className="rounded-xl border border-slate-200 bg-white/90 px-4 py-3 flex items-start gap-3 text-xs text-slate-700">
                  <Lock className="h-4 w-4 text-amber-700 shrink-0 mt-0.5" />
                  <p>
                    <strong>Paid-Appointment Contact Gate:</strong> Direct phone &amp; WhatsApp contact details for the Berlin Desk are disclosed immediately upon appointment booking and payment confirmation. For general enquiries beforehand, email{" "}
                    <a href={`mailto:${BRAND.supportEmail}`} className="font-semibold text-slate-900 underline">
                      {BRAND.supportEmail}
                    </a>.
                  </p>
                </div>

                {bookingFeedback && (
                  <div className="rounded-xl border border-emerald-300 bg-emerald-50 px-4 py-3 text-xs text-emerald-900 font-medium">
                    {bookingFeedback}
                  </div>
                )}

                <form onSubmit={handleBookPaidConsultation} className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label htmlFor="booking-name" className="block text-[11px] font-bold uppercase tracking-wider text-slate-700">
                      Full Name *
                    </label>
                    <input
                      id="booking-name"
                      type="text"
                      required
                      value={bookingName}
                      onChange={(e) => setBookingName(e.target.value)}
                      placeholder="Your full name"
                      className="w-full h-11 rounded-xl border border-slate-300 bg-white px-3.5 text-sm text-slate-900 outline-none focus:border-slate-900"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label htmlFor="booking-email" className="block text-[11px] font-bold uppercase tracking-wider text-slate-700">
                      Email Address *
                    </label>
                    <input
                      id="booking-email"
                      type="email"
                      required
                      value={bookingEmail}
                      onChange={(e) => setBookingEmail(e.target.value)}
                      placeholder="candidate@example.com"
                      className="w-full h-11 rounded-xl border border-slate-300 bg-white px-3.5 text-sm text-slate-900 outline-none focus:border-slate-900"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label htmlFor="booking-phone" className="block text-[11px] font-bold uppercase tracking-wider text-slate-700">
                      Your Phone / WhatsApp (for slot confirmation) *
                    </label>
                    <input
                      id="booking-phone"
                      type="tel"
                      required
                      value={bookingPhone}
                      onChange={(e) => setBookingPhone(e.target.value)}
                      placeholder="+91 98765 43210 / +49 ..."
                      className="w-full h-11 rounded-xl border border-slate-300 bg-white px-3.5 text-sm text-slate-900 outline-none focus:border-slate-900"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label htmlFor="booking-pathway" className="block text-[11px] font-bold uppercase tracking-wider text-slate-700">
                      Target Germany Pathway
                    </label>
                    <select
                      id="booking-pathway"
                      value={bookingPathway}
                      onChange={(e) => setBookingPathway(e.target.value)}
                      className="w-full h-11 rounded-xl border border-slate-300 bg-white px-3.5 text-sm text-slate-900 outline-none focus:border-slate-900"
                    >
                      <option value="German Language (A1–C1) & Goethe/telc">German Language (A1–C1) &amp; Goethe/telc</option>
                      <option value="Studienkolleg Prep (T/M/W/G Kurs)">Studienkolleg Prep (T/M/W/G Kurs)</option>
                      <option value="Public University Admission & APS">Public University Admission &amp; APS</option>
                      <option value="Ausbildung Vocational Placement">Ausbildung Vocational Placement</option>
                      <option value="Healthcare / Nursing Anerkennung (§ 81a)">Healthcare / Nursing Anerkennung (§ 81a)</option>
                    </select>
                  </div>

                  <div className="space-y-1.5">
                    <label htmlFor="booking-slot" className="block text-[11px] font-bold uppercase tracking-wider text-slate-700">
                      Preferred Time Slot
                    </label>
                    <select
                      id="booking-slot"
                      value={bookingSlot}
                      onChange={(e) => setBookingSlot(e.target.value)}
                      className="w-full h-11 rounded-xl border border-slate-300 bg-white px-3.5 text-sm text-slate-900 outline-none focus:border-slate-900"
                    >
                      <option value="6:00 PM IST (2:30 PM CET)">6:00 PM IST (2:30 PM CET)</option>
                      <option value="7:30 PM IST (4:00 PM CET)">7:30 PM IST (4:00 PM CET)</option>
                      <option value="9:00 PM IST (5:30 PM CET)">9:00 PM IST (5:30 PM CET)</option>
                    </select>
                  </div>

                  <div className="space-y-1.5">
                    <label htmlFor="booking-notes" className="block text-[11px] font-bold uppercase tracking-wider text-slate-700">
                      Academic Background / Notes
                    </label>
                    <input
                      id="booking-notes"
                      type="text"
                      value={bookingNotes}
                      onChange={(e) => setBookingNotes(e.target.value)}
                      placeholder="Current German level, qualification, target intake"
                      className="w-full h-11 rounded-xl border border-slate-300 bg-white px-3.5 text-sm text-slate-900 outline-none focus:border-slate-900"
                    />
                  </div>

                  <div className="sm:col-span-2 flex flex-wrap items-center justify-between gap-3 pt-1">
                    <p className="text-[11px] text-slate-600">
                      Direct Berlin Desk phone &amp; WhatsApp reveal immediately after verified Razorpay payment.
                    </p>
                    <button
                      type="submit"
                      disabled={bookingSubmitting}
                      className="h-11 px-6 rounded-xl bg-slate-900 text-white font-bold text-xs uppercase tracking-[0.14em] inline-flex items-center gap-2 hover:bg-slate-800 transition disabled:opacity-50 cursor-pointer"
                    >
                      {bookingSubmitting ? (
                        <>
                          <Loader2 className="h-4 w-4 animate-spin" />
                          <span>Initializing Payment…</span>
                        </>
                      ) : (
                        <>
                          <CalendarCheck2 className="h-4 w-4" />
                          <span>Pay {INR_PRICING_TIERS.consultation_session.formatted} &amp; Confirm Appointment</span>
                        </>
                      )}
                    </button>
                  </div>
                </form>

                {bookingSandboxPreview && (
                  <div className="rounded-2xl border border-emerald-300 bg-white p-5 space-y-4">
                    <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 pb-3">
                      <div>
                        <p className="text-[10px] font-bold uppercase tracking-wider text-emerald-700">
                          Consultation Payment · {bookingSandboxPreview.orderId || "GTF-APPT"}
                        </p>
                        <p className="text-base font-bold text-slate-900">
                          Complete {bookingSandboxPreview.priceInr} Payment via SBI UPI / Bank Transfer
                        </p>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
                      <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 space-y-2">
                        <p className="font-semibold text-slate-800">
                          Beneficiary: <span className="font-mono">{GTF_BANK_DETAILS.beneficiary}</span>
                        </p>
                        <p className="text-slate-600">
                          {GTF_BANK_DETAILS.bankName} · A/C <span className="font-mono font-semibold">{GTF_BANK_DETAILS.accountNumber}</span> · IFSC <span className="font-mono font-semibold">{GTF_BANK_DETAILS.ifsc}</span>
                        </p>
                        <div className="flex items-center justify-between gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2">
                          <span className="font-mono font-semibold text-slate-900 truncate">{GTF_BANK_DETAILS.upiId}</span>
                          <button
                            type="button"
                            onClick={handleCopyUpi}
                            className="inline-flex items-center gap-1 rounded-md border border-slate-300 px-2 py-1 text-[10px] font-semibold text-slate-800 hover:bg-slate-50 shrink-0"
                          >
                            <Copy className="h-3 w-3" />
                            <span>{copiedUpi ? "Copied" : "Copy UPI"}</span>
                          </button>
                        </div>
                      </div>

                      <form onSubmit={handleSubmitUtrVerification} className="rounded-xl border border-slate-200 bg-slate-50 p-4 space-y-2.5">
                        <label htmlFor="utr-ref-input" className="block text-[11px] font-bold uppercase tracking-wider text-slate-700">
                          Submit UPI / Bank Reference (UTR)
                        </label>
                        <div className="flex gap-2">
                          <input
                            id="utr-ref-input"
                            type="text"
                            value={utrReference}
                            onChange={(e) => setUtrReference(e.target.value)}
                            placeholder="Enter 12-digit UTR / Ref"
                            className="flex-1 h-10 rounded-lg border border-slate-300 bg-white px-3 text-xs text-slate-900 outline-none focus:border-slate-900"
                          />
                          <button
                            type="submit"
                            disabled={utrSubmitting}
                            className="h-10 px-4 rounded-lg bg-slate-900 text-white text-xs font-bold uppercase tracking-wider hover:bg-slate-800 disabled:opacity-50"
                          >
                            {utrSubmitting ? "Saving…" : "Submit"}
                          </button>
                        </div>
                        <p className="text-[11px] text-slate-600">
                          Or email receipt to{" "}
                          <a href={`mailto:${BRAND.supportEmail}?subject=${encodeURIComponent(`Consultation Payment Confirmation (${bookingSandboxPreview.orderId || "GTF"})`)}`} className="font-semibold underline text-slate-900">
                            {BRAND.supportEmail}
                          </a>
                          . Direct Berlin Desk contact is sent after confirmation.
                        </p>
                      </form>
                    </div>
                  </div>
                )}
              </div>
            )}
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
                    {checkoutPreview.tierName} · {checkoutPreview.priceInr}
                  </h3>
                  <p className="text-xs text-slate-600">
                    Target Entitlement: {checkoutPreview.productTitle} · {checkoutPreview.priceInr} INR
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
                    Remit {checkoutPreview.priceInr} to official account{" "}
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
                      Send your payment confirmation or request a SEPA / Stripe invoice for European billing via our official email desk. Direct Berlin Desk phone access unlocks automatically once payment is confirmed.
                    </p>
                  </div>
                  <a
                    href={`mailto:${BRAND.supportEmail}?subject=${encodeURIComponent(
                      `Activation Request: ${checkoutPreview.tierName} (${checkoutPreview.priceInr})`,
                    )}&body=${encodeURIComponent(
                      `Hallo Gateway To Future Team,\n\nI have completed/requested activation for ${checkoutPreview.tierName} (${checkoutPreview.priceInr}).\nAccount Email: ${user?.userEmail || ""}\nReference: ${checkoutPreview.orderId || "PRICING"}\n`,
                    )}`}
                    className="inline-flex items-center justify-center gap-2 rounded-xl bg-slate-900 px-5 py-3 text-xs font-semibold uppercase tracking-[0.16em] text-white hover:bg-slate-800 transition shadow-sm"
                  >
                    <Mail className="h-3.5 w-3.5" />
                    <span>Email {BRAND.supportEmail}</span>
                  </a>
                </div>
              </div>
            </div>
          )}

          {/* Institutional Mentorship Desk Showcase */}
          <div className="space-y-3 pt-2">
            <p className="text-[11px] font-bold uppercase tracking-[0.2em] text-slate-500">
              GATEWAY TO FUTURE MENTORSHIP DESK
            </p>
            <CeoPortraitCard compact />
          </div>

          <p className="text-[11px] text-slate-500 text-center leading-relaxed max-w-3xl mx-auto pt-2">
            All third-party exam boards and institutions (such as Goethe-Institut, telc, TestDaF, Charité, or Vivantes) are trademarks of their respective owners. Gateway To Future is an independent training and guidance provider.
          </p>
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
                <span>Continue with {selectedTier.name}</span>
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
