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
import { getTopicsForSubdivision } from "@/lib/subdivisions";

export default function AcademySubdivisionTopicIndexPage() {
  const params = useParams<{ level: string; module: string }>();
  const rawLevel = decodeURIComponent(params?.level || "a1");
  const rawModule = decodeURIComponent(params?.module || "01-vocabulary");

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

  const { info, moduleMeta, topics } = useMemo(
    () => getTopicsForSubdivision(rawLevel, rawModule, workbooks),
    [rawLevel, rawModule, workbooks],
  );

  return (
    <div className="min-h-screen flex flex-col bg-slate-50 text-slate-900">
      <Navbar activeDivision={info.divisionId} />

      <main className="flex-1 pb-24 lg:pb-12">
        <BreadcrumbHeader
          breadcrumbs={[
            { label: "Home", href: "/dashboard" },
            { label: info.divisionLabel, href: info.divisionHref },
            { label: info.label, href: `/academy/${info.levelKey}` },
            { label: moduleMeta.title },
          ]}
          eyebrow={moduleMeta.eyebrow}
          title={moduleMeta.title}
          subtitle={moduleMeta.subtitle}
          theme={moduleMeta.theme}
          backHref={`/academy/${info.levelKey}`}
          backLabel={info.label}
        />

        <section className="mx-auto max-w-6xl px-4 sm:px-8 py-12 space-y-8">
          <div className="flex flex-wrap items-end justify-between gap-4 border-b border-slate-200 pb-4">
            <div className="space-y-1">
              <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-slate-500">
                LEVEL 04 · TOPIC &amp; EXERCISE INDEX
              </p>
              <h2 className="text-2xl sm:text-3xl font-light tracking-tight text-slate-900">
                Select One Focused Topic
              </h2>
            </div>
            <span className="text-[11px] font-medium uppercase tracking-[0.18em] text-slate-500">
              {loaded ? `${topics.length} Topic${topics.length === 1 ? "" : "s"}` : "Syncing…"}
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {(Array.isArray(topics) ? topics : []).map((topic) => (
              <SubdivisionCard
                key={topic.id}
                indexLabel={topic.indexLabel}
                title={topic.title}
                subtitle={topic.subtitle}
                href={topic.href}
                ctaLabel={topic.ctaLabel}
                theme={topic.theme}
                badge={topic.badge}
                metaItems={topic.metaItems}
              />
            ))}
          </div>
        </section>
      </main>

      <footer className="border-t border-slate-200 bg-white py-10 pb-24 lg:pb-10 px-4 sm:px-8">
        <div className="mx-auto max-w-6xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 text-xs text-slate-500">
          <p className="font-semibold tracking-wide text-slate-900">
            {BRAND.name} · {BRAND.headquarters}
          </p>
          <div className="flex flex-wrap items-center gap-6 font-semibold uppercase tracking-[0.14em] text-[11px]">
            <Link href={`/academy/${info.levelKey}`} className="text-slate-600 hover:text-slate-900 transition">
              {info.label} Subdivisions
            </Link>
            <Link href={info.divisionHref} className="text-slate-600 hover:text-slate-900 transition">
              {info.divisionLabel}
            </Link>
            <Link href="/dashboard" className="text-slate-600 hover:text-slate-900 transition">
              Hub
            </Link>
          </div>
        </div>
      </footer>

      <BottomNavigationBar />
      
    </div>
  );
}
