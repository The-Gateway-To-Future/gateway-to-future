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
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 4000);

    fetch(`/api/catalog?email=${encodeURIComponent(email)}`, {
      signal: controller.signal,
    })
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        clearTimeout(timeoutId);
        if (!active) return;
        if (data && Array.isArray(data.workbooks)) {
          setWorkbooks(data.workbooks as RoadmapWorkbookSummary[]);
        }
        setLoaded(true);
      })
      .catch(() => {
        clearTimeout(timeoutId);
        if (active) setLoaded(true);
      });
    return () => {
      active = false;
      clearTimeout(timeoutId);
      controller.abort();
    };
  }, [user]);

  const { info, subdivisions, dynamicChapters } = useMemo(
    () => getSubdivisionsForLevel(rawLevel, workbooks),
    [rawLevel, workbooks],
  );

  return (
    <div className="min-h-screen flex flex-col bg-slate-50 text-slate-900">
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
          <div className="flex flex-wrap items-end justify-between gap-4 border-b border-slate-200 pb-4">
            <div className="space-y-1">
              <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-slate-500">
                01 / CORE MODULE FOLDERS
              </p>
              <h2 className="text-2xl sm:text-3xl font-light tracking-tight text-slate-900">
                {info.label} Subdivision Index
              </h2>
            </div>
            <span className="text-[11px] font-medium uppercase tracking-[0.18em] text-slate-500">
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
          <div className="flex flex-wrap items-end justify-between gap-4 border-b border-slate-200 pb-4">
            <div className="space-y-1">
              <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-slate-500">
                02 / DIGITAL TEXTBOOK ARCHIVE
              </p>
              <h2 className="text-2xl sm:text-3xl font-light tracking-tight text-slate-900">
                {info.label} Chapters &amp; Factory Dossiers
              </h2>
            </div>
            <span className="text-[11px] font-medium uppercase tracking-[0.18em] text-slate-500">
              {loaded ? `${dynamicChapters.length} Available` : "Syncing Catalog…"}
            </span>
          </div>

          {!loaded ? (
            <div className="rounded-2xl border border-slate-200 bg-white p-8 text-sm text-slate-600 shadow-xs">
              Loading dynamic textbook chapters for {info.label}…
            </div>
          ) : dynamicChapters.length === 0 ? (
            <div className="rounded-2xl border border-slate-200 bg-white p-8 text-sm text-slate-600 shadow-xs">
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

      <footer className="border-t border-slate-200 bg-white py-10 pb-24 lg:pb-10 px-4 sm:px-8">
        <div className="mx-auto max-w-6xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 text-xs text-slate-500">
          <p className="font-semibold tracking-wide text-slate-900">
            {BRAND.name} · {BRAND.headquarters}
          </p>
          <div className="flex flex-wrap items-center gap-6 font-semibold uppercase tracking-[0.14em] text-[11px]">
            <Link href="/dashboard" className="text-slate-600 hover:text-slate-900 transition">
              Hub
            </Link>
            <Link href={info.divisionHref} className="text-slate-600 hover:text-slate-900 transition">
              {info.divisionLabel}
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
