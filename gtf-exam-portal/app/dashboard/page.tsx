"use client";

import React, { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { Navbar } from "@/components/Navbar";
import { HEADER_IMAGES } from "@/components/BreadcrumbHeader";
import {
  StudentHubHeroSlider,
  type ActiveCefrLevel,
} from "@/components/StudentHubHeroSlider";
import { SubdivisionCard } from "@/components/SubdivisionCard";
import { BottomNavigationBar } from "@/components/BottomNavigationBar";
import { useAuth } from "@/lib/auth-context";
import { BRAND } from "@/lib/config";
import {
  getUserProgress,
  resolveProgressUid,
  USER_PROGRESS_EVENT,
  type UserProgress,
} from "@/lib/firebase/progress";

function resolveActiveCefrLevel(
  course?: string,
  completedSteps?: string[],
): ActiveCefrLevel {
  const normCourse = (course || "").trim().toLowerCase();
  if (normCourse === "a1" || normCourse === "a2" || normCourse === "b1" || normCourse === "b2") {
    return normCourse;
  }

  if (Array.isArray(completedSteps) && completedSteps.length > 0) {
    const joined = completedSteps.join(" ").toLowerCase();
    if (joined.includes("b2-")) return "b2";
    if (joined.includes("b1-")) return "b1";
    if (joined.includes("a2-")) return "a2";
    if (joined.includes("a1-")) return "a1";
  }

  return "b1";
}

export default function DashboardHubPage() {
  const { user, isAuthenticated } = useAuth();
  const [progress, setProgress] = useState<UserProgress | null>(null);

  const progressUid = resolveProgressUid(user);
  const studentDisplayName =
    user?.fullName?.split(" ")[0] ||
    user?.userEmail?.split("@")[0] ||
    "Candidate";

  useEffect(() => {
    let active = true;
    getUserProgress(progressUid).then((data) => {
      if (active) setProgress(data);
    });

    const onUpdate = (ev: Event) => {
      const detail = (ev as CustomEvent<UserProgress>).detail;
      if (detail && detail.uid === progressUid) {
        setProgress(detail);
      }
    };

    window.addEventListener(USER_PROGRESS_EVENT, onUpdate);
    return () => {
      active = false;
      window.removeEventListener(USER_PROGRESS_EVENT, onUpdate);
    };
  }, [progressUid]);

  const activeCefrLevel = useMemo(
    () => resolveActiveCefrLevel(user?.course, progress?.completedSteps),
    [user?.course, progress?.completedSteps],
  );

  return (
    <div className="min-h-screen flex flex-col bg-slate-50 text-slate-900">
      <Navbar />

      <main className="flex-1 pb-24 lg:pb-12">
        <StudentHubHeroSlider
          studentDisplayName={studentDisplayName}
          streakCount={progress?.currentStreak ?? 1}
          completedStepsCount={progress?.completedSteps?.length ?? 0}
          masteredCardsCount={progress?.masteredFlashcards?.length ?? 0}
          activeLevel={activeCefrLevel}
          isAuthenticated={isAuthenticated}
        />

        {/* Level 1: The 3 Core Divisions */}
        <section className="mx-auto max-w-6xl px-4 sm:px-8 py-7 sm:py-10 space-y-6 sm:space-y-8">
          <div className="flex flex-wrap items-end justify-between gap-4 border-b border-slate-200 pb-4">
            <div className="space-y-1">
              <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-slate-500">
                01 / CORE DIVISIONS
              </p>
              <h2 className="text-2xl sm:text-3xl font-light tracking-tight text-slate-900">
                Choose Your Division
              </h2>
            </div>
            <span className="text-[11px] font-medium uppercase tracking-[0.18em] text-slate-500">
              One Workspace at a Time
            </span>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <SubdivisionCard
              indexLabel="01 · LANGUAGE"
              title="German Language Academy"
              subtitle="Master A1 through B2 German with focused flashcard decks, 122 Säulen grammar dossiers, studio Hören labs, and Goethe/telc Modelltests."
              href="/academy"
              ctaLabel="Open Academy"
              theme="academy"
              imageUrl={HEADER_IMAGES.b1}
              badge="CEFR A1 – B2"
              metaItems={["4 Levels", "4 Subdivisions Each"]}
            />

            <SubdivisionCard
              indexLabel="02 · ACADEMICS"
              title="Studienkolleg Hub"
              subtitle="Academic foundation college tracks paused while focusing 100% on Core German CEFR A1, A2, B1, and B2 mastery."
              href="/studienkolleg"
              ctaLabel="Preview Track"
              theme="studienkolleg"
              imageUrl={HEADER_IMAGES.studienkolleg}
              badge="COMING SOON · A1–B2 FOCUS"
              metaItems={["Coming Soon", "A1–B2 Priority"]}
            />

            <SubdivisionCard
              indexLabel="03 · HEALTHCARE"
              title="Fachsprache Pflege & Medizin"
              subtitle="Clinical hospital modules paused while prioritizing Core German CEFR A1–B2 Goethe/telc certification."
              href="/pflege"
              ctaLabel="Preview Track"
              theme="pflege"
              imageUrl={HEADER_IMAGES.pflege}
              badge="COMING SOON · A1–B2 FOCUS"
              metaItems={["Coming Soon", "A1–B2 Priority"]}
            />
          </div>
        </section>

        {/* Secondary Navigation Cards: Dedicated Plan & Quick Resume */}
        <section className="mx-auto max-w-6xl px-4 sm:px-8 pb-12 space-y-6">
          <div className="border-b border-slate-200 pb-4">
            <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-slate-500">
              02 / DIRECT NAVIGATION
            </p>
            <h2 className="mt-1 text-xl sm:text-2xl font-light tracking-tight text-slate-900">
              Guided Pathways &amp; Active Track
            </h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <SubdivisionCard
              indexLabel="MY PLAN · ROADMAP"
              title="My Plan & Career Roadmap"
              subtitle="Inspect each milestone from A1 Foundations through Studienkolleg, University Admission, and Berlin Hospital Settlement."
              href="/pathways"
              ctaLabel="Open My Plan"
              theme="hub"
              imageUrl={HEADER_IMAGES.hub}
              badge="8 MILESTONES"
              aspectClassName="min-h-[220px]"
            />

            <SubdivisionCard
              indexLabel="RECOMMENDED · B1"
              title="Resume Track: B1 Mittelstufe"
              subtitle="Continue directly into the B1 subdivision folder grid — Vocabulary, 122 Säulen Grammar, Hören & Lesen Lab, and Official Modelltests."
              href="/academy/b1"
              ctaLabel="Open B1 Folder"
              theme="academy"
              imageUrl={HEADER_IMAGES.b1}
              badge="VISA & AUSBILDUNG"
              aspectClassName="min-h-[220px]"
            />
          </div>
        </section>
      </main>

      <footer className="border-t border-slate-200 bg-white py-10 pb-24 lg:pb-10 px-4 sm:px-8">
        <div className="mx-auto max-w-6xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 text-xs text-slate-500">
          <div className="space-y-1">
            <p className="font-semibold tracking-wide text-slate-900">
              {BRAND.name} · {BRAND.headquarters}
            </p>
            <p className="text-[11px] text-slate-600">
              {BRAND.name} — {BRAND.advisoryTeamTitle} · {BRAND.supportEmail}
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-6 font-semibold uppercase tracking-[0.14em] text-[11px]">
            <Link href="/" className="text-slate-600 hover:text-slate-900 transition">
              Home
            </Link>
            <Link href="/about" className="text-slate-600 hover:text-slate-900 transition">
              About
            </Link>
            <Link href="/academy" className="text-slate-600 hover:text-slate-900 transition">
              Academy
            </Link>
            <Link href="/studienkolleg" className="text-slate-600 hover:text-slate-900 transition">
              Studienkolleg
            </Link>
            <Link href="/pflege" className="text-slate-600 hover:text-slate-900 transition">
              Pflege
            </Link>
            <Link href="/pathways" className="text-slate-600 hover:text-slate-900 transition">
              My Plan
            </Link>
          </div>
        </div>
      </footer>

      <BottomNavigationBar />
    </div>
  );
}
