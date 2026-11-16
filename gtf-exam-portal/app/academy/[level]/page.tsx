"use client";

import React, { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { Navbar } from "@/components/Navbar";
import { BreadcrumbHeader } from "@/components/BreadcrumbHeader";
import { SubdivisionCard } from "@/components/SubdivisionCard";
import { BottomNavigationBar } from "@/components/BottomNavigationBar";
import type { RoadmapWorkbookSummary } from "@/components/GuidedRoadmapTimeline";
import { useAuth } from "@/lib/auth-context";
import { getActiveUserEmail } from "@/lib/client-storage";
import { BRAND } from "@/lib/config";
import { getSubdivisionsForLevel } from "@/lib/subdivisions";

export default function AcademyLevelSubdivisionsPage() {
  const params = useParams<{ level: string }>();
  const rawLevel = decodeURIComponent(params?.level || "a1");

  const { user } = useAuth();
  const [workbooks, setWorkbooks] = useState<RoadmapWorkbookSummary[]>([]);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    let active = true;
    const email = user?.userEmail || getActiveUserEmail();
    fetch(`/api/catalog?email=${encodeURIComponent(email)}`)
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (!active) return;
        if (data && Array.isArray(data.workbooks)) {
          setWorkbooks(data.workbooks as RoadmapWorkbookSummary[]);
        }
        setLoaded(true);
      })
      .catch(() => {
        if (active) setLoaded(true);
      });
    return () => {
      active = false;
    };
  }, [user]);

  const { info, subdivisions, dynamicChapters } = useMemo(
    () => getSubdivisionsForLevel(rawLevel, workbooks),
    [rawLevel, workbooks],
  );

  return (
    <div className="min-h-screen flex flex-col bg-[#07090E] text-white">
      <Navbar activeDivision={info.divisionId} />

      <main className="flex-1 pb-24 lg:pb-12">
        <BreadcrumbHeader
          breadcrumbs={[
            { label: "Home", href: "/dashboard" },
            { label: info.divisionLabel, href: info.divisionHref },
            { label: info.label },
          ]}
          eyebrow={`LEVEL 03 · ${info.cefrTag.toUpperCase()} SUBDIVISIONS`}
          title={`${info.label} — Learning Subdivisions.`}
          subtitle={`${info.description} Open any subdivision folder below to focus on one module at a time.`}
          theme={info.theme}
          backHref={info.divisionHref}
          backLabel={info.divisionLabel}
        />

        {/* Core 4 Subdivision Folders */}
        <section className="mx-auto max-w-6xl px-4 sm:px-8 py-12 space-y-8">
          <div className="flex flex-wrap items-end justify-between gap-4 border-b border-white/10 pb-4">
            <div className="space-y-1">
              <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-white/50">
                01 / CORE MODULE FOLDERS
              </p>
              <h2 className="text-2xl sm:text-3xl font-light tracking-tight text-white">
                {info.label} Subdivision Index
              </h2>
            </div>
            <span className="text-[11px] font-medium uppercase tracking-[0.18em] text-white/45">
              4 Core Pillars
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {(Array.isArray(subdivisions) ? subdivisions : []).map((sub) => (
              <SubdivisionCard
                key={sub.slug}
                indexLabel={sub.indexLabel}
                title={sub.title}
                subtitle={sub.subtitle}
                href={sub.href}
                ctaLabel="Open Subdivision"
                theme={sub.theme}
                badge={sub.badge}
                metaItems={sub.metaItems}
              />
            ))}
          </div>
        </section>

        {/* Dynamic Textbook Chapters & Factory Dossiers */}
        <section className="mx-auto max-w-6xl px-4 sm:px-8 pb-12 space-y-8">
          <div className="flex flex-wrap items-end justify-between gap-4 border-b border-white/10 pb-4">
            <div className="space-y-1">
              <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-white/50">
                02 / DIGITAL TEXTBOOK ARCHIVE
              </p>
              <h2 className="text-2xl sm:text-3xl font-light tracking-tight text-white">
                {info.label} Chapters &amp; Factory Dossiers
              </h2>
            </div>
            <span className="text-[11px] font-medium uppercase tracking-[0.18em] text-white/45">
              {loaded ? `${dynamicChapters.length} Available` : "Syncing Catalog…"}
            </span>
          </div>

          {!loaded ? (
            <div className="rounded-2xl border border-white/10 bg-[#0D1017] p-8 text-sm text-white/55">
              Loading dynamic textbook chapters for {info.label}…
            </div>
          ) : dynamicChapters.length === 0 ? (
            <div className="rounded-2xl border border-white/10 bg-[#0D1017] p-8 text-sm text-white/60">
              All {info.label} interactive tools are organized inside the 4 subdivision folders above.
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {(Array.isArray(dynamicChapters) ? dynamicChapters : []).map((chap) => (
                <SubdivisionCard
                  key={chap.id}
                  indexLabel={chap.indexLabel}
                  title={chap.title}
                  subtitle={chap.subtitle}
                  href={chap.href}
                  ctaLabel={chap.ctaLabel}
                  theme={chap.theme}
                  badge={chap.badge}
                  metaItems={chap.metaItems}
                  aspectClassName="min-h-[230px]"
                />
              ))}
            </div>
          )}
        </section>
      </main>

      <footer className="border-t border-white/10 bg-[#07090E] py-10 pb-24 lg:pb-10 px-4 sm:px-8">
        <div className="mx-auto max-w-6xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 text-xs text-white/50">
          <p className="font-medium tracking-wide text-white/80">
            {BRAND.name} · {BRAND.headquarters}
          </p>
          <div className="flex flex-wrap items-center gap-6 font-medium uppercase tracking-[0.14em] text-[11px]">
            <Link href="/dashboard" className="hover:text-white transition">
              Hub
            </Link>
            <Link href={info.divisionHref} className="hover:text-white transition">
              {info.divisionLabel}
            </Link>
            <Link href="/pathways" className="hover:text-white transition">
              My Plan
            </Link>
          </div>
        </div>
      </footer>

      <BottomNavigationBar />
      
    </div>
  );
}
