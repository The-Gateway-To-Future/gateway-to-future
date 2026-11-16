"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { motion } from "framer-motion";
import {
  Compass,
  GraduationCap,
  Hospital,
  LogOut,
  Phone,
  Terminal,
  User,
} from "lucide-react";
import { BRAND, DIVISIONS, DIVISION_META } from "@/lib/config";
import { useAuth } from "@/lib/auth-context";
import { setActiveDivision } from "@/lib/client-storage";
import {
  getUserProgress,
  resolveProgressUid,
  USER_PROGRESS_EVENT,
  type UserProgress,
} from "@/lib/firebase/progress";
import { PwaRegistrar } from "./PwaRegistrar";
import type { DivisionId } from "@/lib/types";
import { useEffect, useState } from "react";

interface NavbarProps {
  activeDivision?: DivisionId;
  onSelectDivision?: (div: DivisionId) => void;
  onEmailChange?: (newEmail: string) => void;
}

export function Navbar({
  activeDivision,
  onSelectDivision,
}: NavbarProps) {
  const rawPathname = usePathname();
  const pathname = rawPathname || "";
  const router = useRouter();
  const { user, isAuthenticated, logout } = useAuth();
  const [progress, setProgress] = useState<UserProgress | null>(null);

  const progressUid = resolveProgressUid(user);

  useEffect(() => {
    let mounted = true;
    getUserProgress(progressUid).then((prog) => {
      if (mounted) setProgress(prog);
    });

    const onProgressUpdate = (ev: Event) => {
      const detail = (ev as CustomEvent<UserProgress>).detail;
      if (detail && detail.uid === progressUid) {
        setProgress(detail);
      }
    };
    window.addEventListener(USER_PROGRESS_EVENT, onProgressUpdate);
    return () => {
      mounted = false;
      window.removeEventListener(USER_PROGRESS_EVENT, onProgressUpdate);
    };
  }, [progressUid]);

  // Hide in active exam session (Focus Mode)
  if (pathname.includes("/exam/") && !pathname.endsWith("/result")) {
    return null;
  }

  const handleDivisionClick = (divId: DivisionId) => {
    setActiveDivision(divId);
    onSelectDivision?.(divId);
    const targetRoute: Record<DivisionId, string> = {
      sprachakademie: "/academy",
      studienkolleg: "/studienkolleg",
      fachsprache_medizin: "/pflege",
    };
    router.push(targetRoute[divId]);
  };

  const resolvedDivision: DivisionId | null =
    activeDivision ??
    (pathname.startsWith("/academy") || pathname.startsWith("/workbooks")
      ? "sprachakademie"
      : pathname.startsWith("/studienkolleg")
        ? "studienkolleg"
        : pathname.startsWith("/pflege")
          ? "fachsprache_medizin"
          : null);

  const isPlanActive = pathname === "/pathways" || pathname.startsWith("/pathways/");
  const isPricingActive = pathname === "/pricing" || pathname.startsWith("/pricing/");
  const isProfileActive = pathname === "/profile" || pathname.startsWith("/profile/");

  const divisionIcons: Record<DivisionId, typeof GraduationCap> = {
    sprachakademie: GraduationCap,
    studienkolleg: Terminal,
    fachsprache_medizin: Hospital,
  };

  const divisionShortLabels: Record<DivisionId, string> = {
    sprachakademie: "Academy",
    studienkolleg: "Studienkolleg",
    fachsprache_medizin: "Pflege",
  };

  const streakFormatted = String(progress?.currentStreak ?? 1).padStart(2, "0");

  return (
    <header
      className="sticky top-0 z-40 w-full border-b border-white/10 bg-[#07090E]/95 transition-colors pt-[env(safe-area-inset-top)]"
      style={{ WebkitBackdropFilter: "blur(10px)", backdropFilter: "blur(10px)" }}
    >
      <div className="mx-auto flex w-full max-w-7xl items-center justify-between gap-2 px-3 sm:px-6 py-2.5 sm:py-3 overflow-hidden">
        {/* Brand Logo & Compact Tagline */}
        <Link
          href={isAuthenticated ? "/dashboard" : "/"}
          className="flex items-center gap-2.5 group focus:outline-none select-none min-w-0"
        >
          <img
            src="/gtf_logo.jpg"
            alt="Gateway to Future"
            className="h-8 w-8 sm:h-10 sm:w-10 rounded-lg border border-white/10 object-cover shrink-0 transition duration-300 group-hover:border-white/30"
          />
          <div className="flex flex-col min-w-0">
            <span className="text-xs sm:text-sm font-semibold tracking-[0.14em] uppercase text-white truncate">
              <span className="sm:hidden">GTF</span>
              <span className="hidden sm:inline">GATEWAY TO FUTURE</span>
            </span>
            <span className="text-[10px] tracking-[0.18em] uppercase text-white/45 hidden lg:block truncate">
              {BRAND.tagline}
            </span>
          </div>
        </Link>

        {/* 3-Division Pill Switcher (Desktop >= lg) */}
        <div className="hidden lg:flex items-center gap-1 rounded-2xl bg-white/[0.04] p-1 border border-white/10 shrink-0">
          {DIVISIONS.map((divId) => {
            const Icon = divisionIcons[divId];
            const isSelected = resolvedDivision === divId;

            return (
              <button
                key={divId}
                type="button"
                onClick={() => handleDivisionClick(divId)}
                title={DIVISION_META[divId].shortTitle}
                className={`relative flex items-center gap-1.5 rounded-xl px-3.5 py-1.5 text-xs font-semibold tracking-wide transition-colors select-none ${
                  isSelected
                    ? "!text-[#07090E]"
                    : "text-white/65 hover:text-white hover:bg-white/[0.04]"
                }`}
              >
                {isSelected && (
                  <motion.div
                    layoutId="active-division-pill-navbar"
                    className="absolute inset-0 rounded-xl !bg-white shadow-xs"
                    transition={{ type: "spring", stiffness: 450, damping: 32 }}
                  />
                )}
                <span className="relative z-10 flex items-center gap-1.5">
                  <Icon
                    className={`h-3.5 w-3.5 ${
                      isSelected ? "!text-[#07090E]" : "text-white/50"
                    }`}
                  />
                  <span>{divisionShortLabels[divId]}</span>
                </span>
              </button>
            );
          })}
        </div>

        {/* Right Action Controls & Auth Profile */}
        <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
          {isAuthenticated && (
            <>
              {/* Monochrome BMW-style Streak Pill */}
              <div
                className="inline-flex items-center gap-1.5 rounded-full border border-white/15 bg-white/[0.04] px-2.5 sm:px-3 py-1 text-[10px] sm:text-[11px] font-semibold uppercase tracking-[0.18em] text-white/85 shrink-0"
                title={`Daily Learning Streak · Last active: ${progress?.lastLoginDate || "Today"}`}
              >
                <svg
                  className="h-2.5 w-2.5 text-emerald-400 shrink-0"
                  viewBox="0 0 10 10"
                  fill="none"
                  aria-hidden="true"
                >
                  <circle cx="5" cy="5" r="3.5" stroke="currentColor" strokeWidth="1.5" />
                  <circle cx="5" cy="5" r="1.5" fill="currentColor" />
                </svg>
                <span className="whitespace-nowrap">STREAK · {streakFormatted}D</span>
              </div>

              {/* Dedicated My Plan / Roadmap Link */}
              <Link
                href="/pathways"
                className={`hidden sm:inline-flex items-center gap-1.5 rounded-xl border px-3 py-1.5 text-[11px] font-medium uppercase tracking-[0.14em] transition shrink-0 ${
                  isPlanActive
                    ? "border-white/40 bg-white/[0.12] text-white"
                    : "border-white/10 bg-white/[0.03] text-white/75 hover:text-white hover:border-white/25"
                }`}
                title="View My Plan & Career Roadmap"
              >
                <Compass className="h-3.5 w-3.5 text-white/60 shrink-0" />
                <span>My Plan</span>
              </Link>
            </>
          )}

          {/* Dedicated Pricing Link */}
          <Link
            href="/pricing"
            className={`hidden sm:inline-flex items-center gap-1.5 rounded-xl border px-3 py-1.5 text-[11px] font-medium uppercase tracking-[0.14em] transition shrink-0 ${
              isPricingActive
                ? "border-white/40 bg-white/[0.12] text-white"
                : "border-white/10 bg-white/[0.03] text-white/75 hover:text-white hover:border-white/25"
            }`}
            title="Membership & Pricing"
          >
            <span>Pricing</span>
          </Link>

          {/* Official Berlin WhatsApp Helpline */}
          <a
            href={BRAND.whatsappUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center justify-center h-8 w-8 sm:h-auto sm:w-auto sm:px-3 sm:py-1.5 rounded-xl border border-white/10 bg-white/[0.04] text-[11px] font-medium uppercase tracking-[0.14em] text-white/80 hover:text-white hover:border-white/25 transition shrink-0"
            title="Official GTF Berlin WhatsApp Helpline"
          >
            <Phone className="h-3.5 w-3.5 shrink-0" />
            <span className="hidden md:inline ml-1.5">Helpline</span>
          </a>

          {/* Auth Pill */}
          {isAuthenticated && user ? (
            <div
              className={`inline-flex items-center gap-1.5 rounded-xl border px-2 py-1 sm:px-2.5 text-xs shrink-0 transition ${
                isProfileActive
                  ? "border-white/40 bg-white/[0.12]"
                  : "border-white/15 bg-white/[0.05]"
              }`}
            >
              <Link
                href="/profile"
                className="inline-flex items-center gap-1.5 rounded-lg hover:opacity-85 transition focus:outline-none"
                title="Open Profile & Subscription"
              >
                <div className="flex h-6 w-6 items-center justify-center rounded-full !bg-white text-[10px] font-bold !text-[#07090E] shrink-0">
                  {(user.fullName || user.userEmail || "S").charAt(0).toUpperCase()}
                </div>
                <div className="hidden sm:flex flex-col text-left max-w-[100px]">
                  <span className="truncate font-semibold text-white leading-tight text-xs">
                    {(user.fullName || user.userEmail?.split("@")[0] || "Student").split(" ")[0]}
                  </span>
                  {user.studentId && (
                    <span className="text-[9px] font-medium text-white/55 tracking-wider truncate">
                      {user.studentId}
                    </span>
                  )}
                </div>
              </Link>
              <button
                type="button"
                onClick={logout}
                className="text-white/50 hover:text-red-400 transition ml-0.5 p-0.5 rounded-md hover:bg-white/5"
                title="Log out"
              >
                <LogOut className="h-3.5 w-3.5" />
              </button>
            </div>
          ) : (
            <Link
              href="/login"
              className="inline-flex items-center justify-center gap-1.5 rounded-xl border border-white/15 !bg-white px-2.5 sm:px-3.5 py-1.5 text-xs font-semibold tracking-wide !text-[#07090E] hover:opacity-90 transition whitespace-nowrap shrink-0"
            >
              <User className="h-3.5 w-3.5 !text-[#07090E]" />
              <span>Log In</span>
            </Link>
          )}

          <div className="hidden md:block shrink-0">
            <PwaRegistrar />
          </div>
        </div>
      </div>
    </header>
  );
}
