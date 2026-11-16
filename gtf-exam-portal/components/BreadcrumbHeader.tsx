import Link from "next/link";
import { ArrowLeft, ChevronRight } from "lucide-react";
import type { SubdivisionTheme } from "./SubdivisionCard";

export interface BreadcrumbItem {
  label: string;
  href?: string;
}

export interface BreadcrumbHeaderProps {
  breadcrumbs: BreadcrumbItem[];
  eyebrow?: string;
  title: string;
  subtitle?: string;
  theme?: SubdivisionTheme;
  backHref?: string;
  backLabel?: string;
  rightBadge?: React.ReactNode;
  children?: React.ReactNode;
}

const HEADER_THEME_BG: Record<SubdivisionTheme, string> = {
  academy: "/backgrounds/academy.jpg",
  studienkolleg: "/backgrounds/studienkolleg.jpg",
  pflege: "/backgrounds/pflege.jpg",
  hub: "/backgrounds/hub.jpg",
  grammar: "/backgrounds/grammar.jpg",
  audio: "/backgrounds/audio.jpg",
  exam: "/backgrounds/exam.jpg",
};

export function BreadcrumbHeader({
  breadcrumbs = [],
  eyebrow,
  title,
  subtitle,
  theme = "hub",
  backHref,
  backLabel = "Back",
  rightBadge,
  children,
}: BreadcrumbHeaderProps) {
  const bgUrl = (theme && HEADER_THEME_BG[theme]) || HEADER_THEME_BG.hub;
  const safeCrumbs = Array.isArray(breadcrumbs) ? breadcrumbs.filter(Boolean) : [];

  return (
    <section className="relative w-full overflow-hidden border-b border-white/10 bg-[#07090E] py-12 sm:py-16 px-4 sm:px-8">
      {/* Ambient 3D Architectural Background */}
      <div
        className="pointer-events-none absolute inset-0 bg-cover bg-center opacity-35"
        style={{ backgroundImage: `url('${bgUrl}')` }}
        aria-hidden="true"
      />
      <div
        className="pointer-events-none absolute -inset-x-12 bottom-0 h-3/4 opacity-35 bmw-mesh-grid"
        aria-hidden="true"
      />
      <div
        className="pointer-events-none absolute inset-0 bg-gradient-to-t from-[#07090E] via-[#07090E]/80 to-[#07090E]/55"
        aria-hidden="true"
      />
      <div
        className="pointer-events-none absolute inset-0 bg-gradient-to-r from-[#07090E]/90 via-[#07090E]/55 to-transparent"
        aria-hidden="true"
      />

      <div className="relative z-10 mx-auto max-w-6xl space-y-6">
        {/* Top Row: Breadcrumb Trail & Optional Right Badge */}
        <div className="flex flex-wrap items-center justify-between gap-3">
          <nav
            aria-label="Breadcrumb"
            className="flex flex-wrap items-center gap-1.5 text-[11px] font-medium uppercase tracking-[0.16em] text-white/55"
          >
            {backHref && (
              <Link
                href={backHref}
                className="mr-2 inline-flex items-center gap-1.5 rounded-full border border-white/15 bg-white/[0.04] px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.16em] text-white/85 transition hover:border-white/30 hover:bg-white/[0.08]"
              >
                <ArrowLeft className="h-3 w-3" />
                <span>{backLabel}</span>
              </Link>
            )}

            {safeCrumbs.map((crumb, idx) => {
              const isLast = idx === safeCrumbs.length - 1;
              return (
                <span key={`${crumb.label}-${idx}`} className="inline-flex items-center gap-1.5 min-w-0">
                  {idx > 0 && (
                    <ChevronRight className="h-3 w-3 text-white/30 shrink-0" aria-hidden="true" />
                  )}
                  {crumb.href && !isLast ? (
                    <Link
                      href={crumb.href}
                      className="truncate max-w-[160px] sm:max-w-none hover:text-white transition-colors"
                    >
                      {crumb.label}
                    </Link>
                  ) : (
                    <span
                      className={`truncate max-w-[200px] sm:max-w-none ${
                        isLast ? "text-white font-semibold" : "text-white/55"
                      }`}
                    >
                      {crumb.label}
                    </span>
                  )}
                </span>
              );
            })}
          </nav>

          {rightBadge && <div className="shrink-0">{rightBadge}</div>}
        </div>

        {/* Eyebrow, Headline & Subtitle */}
        <div className="space-y-3">
          {eyebrow && (
            <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-white/55">
              {eyebrow}
            </p>
          )}
          <h1 className="text-3xl sm:text-5xl font-light tracking-tight leading-[1.1] text-white">
            {title}
          </h1>
          {subtitle && (
            <p className="max-w-2xl text-sm sm:text-base font-normal text-white/65 leading-relaxed">
              {subtitle}
            </p>
          )}
        </div>

        {children && <div className="pt-2">{children}</div>}
      </div>
    </section>
  );
}
