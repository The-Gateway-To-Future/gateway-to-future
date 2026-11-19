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
  backgroundImage?: string;
  backHref?: string;
  backLabel?: string;
  rightBadge?: React.ReactNode;
  children?: React.ReactNode;
}

export const HEADER_IMAGES = {
  a1: "/images/headers/a1-header.jpg",
  a2: "/images/headers/a2-header.jpg",
  b1: "/images/headers/b1-header.jpg",
  b2: "/images/headers/b2-header.jpg",
  studienkolleg: "/images/headers/studienkolleg-header.jpg",
  pflege: "/images/headers/pflege-header.jpg",
  hub: "/images/headers/berlin-hub-header.jpg",
} as const;

const HEADER_THEME_BG: Record<SubdivisionTheme, string> = {
  academy: HEADER_IMAGES.b1,
  studienkolleg: HEADER_IMAGES.studienkolleg,
  pflege: HEADER_IMAGES.pflege,
  hub: HEADER_IMAGES.hub,
  grammar: HEADER_IMAGES.b1,
  audio: HEADER_IMAGES.a2,
  exam: HEADER_IMAGES.b2,
};

export function resolveHeaderImage(levelOrTheme?: string): string {
  const key = (levelOrTheme || "").toLowerCase().trim();
  if (key === "a1") return HEADER_IMAGES.a1;
  if (key === "a2") return HEADER_IMAGES.a2;
  if (key === "b1") return HEADER_IMAGES.b1;
  if (key === "b2") return HEADER_IMAGES.b2;
  if (
    key === "studienkolleg" ||
    key === "t_kurs" ||
    key === "m_kurs" ||
    key === "w_kurs" ||
    key === "g_kurs"
  ) {
    return HEADER_IMAGES.studienkolleg;
  }
  if (
    key === "pflege" ||
    key === "fachsprache_medizin" ||
    key === "ausbildung_pflege" ||
    key.startsWith("ausbildung")
  ) {
    return HEADER_IMAGES.pflege;
  }
  if (key === "academy" || key === "grammar") {
    return HEADER_IMAGES.b1;
  }
  if (key === "audio") {
    return HEADER_IMAGES.a2;
  }
  if (key === "exam") {
    return HEADER_IMAGES.b2;
  }
  return HEADER_IMAGES.hub;
}

export function BreadcrumbHeader({
  breadcrumbs = [],
  eyebrow,
  title,
  subtitle,
  theme = "hub",
  backgroundImage,
  backHref,
  backLabel = "Back",
  rightBadge,
  children,
}: BreadcrumbHeaderProps) {
  const bgUrl =
    (backgroundImage && backgroundImage.trim()) ||
    (theme && HEADER_THEME_BG[theme]) ||
    HEADER_IMAGES.hub;
  const safeCrumbs = Array.isArray(breadcrumbs) ? breadcrumbs.filter(Boolean) : [];

  return (
    <section className="relative w-full overflow-hidden border-b border-slate-800/80 bg-slate-950 py-8 sm:py-12 px-4 sm:px-8 text-white">
      {/* Layer 1: Themed Photographic Background with Subtle Blur */}
      <div
        className="pointer-events-none absolute inset-0 bg-cover bg-center blur-[2px] scale-105 opacity-95"
        style={{ backgroundImage: `url('${bgUrl}')` }}
        aria-hidden="true"
      />

      {/* Layer 2: Rich Dark Gradient Overlay for Crisp White Contrast */}
      <div
        className="pointer-events-none absolute inset-0 bg-gradient-to-r from-slate-950/80 via-slate-900/65 to-slate-950/75"
        aria-hidden="true"
      />

      {/* Layer 3: Subtle Vertical Depth Vignette */}
      <div
        className="pointer-events-none absolute inset-0 bg-gradient-to-t from-slate-950/75 via-slate-950/15 to-slate-950/35"
        aria-hidden="true"
      />

      <div className="relative z-10 mx-auto max-w-6xl space-y-4 sm:space-y-5">
        {/* Top Row: Breadcrumb Trail & Optional Right Badge */}
        <div className="flex flex-wrap items-center justify-between gap-3">
          <nav
            aria-label="Breadcrumb"
            className="flex flex-wrap items-center gap-1.5 text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-200/85"
          >
            {backHref && (
              <Link
                href={backHref}
                className="mr-2 inline-flex items-center gap-1.5 rounded-full border border-white/25 bg-white/10 px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.16em] text-white backdrop-blur-md transition hover:border-white/40 hover:bg-white/20"
              >
                <ArrowLeft className="h-3 w-3 text-white" />
                <span>{backLabel}</span>
              </Link>
            )}

            {safeCrumbs.map((crumb, idx) => {
              const isLast = idx === safeCrumbs.length - 1;
              return (
                <span key={`${crumb.label}-${idx}`} className="inline-flex items-center gap-1.5 min-w-0">
                  {idx > 0 && (
                    <ChevronRight className="h-3 w-3 text-white/45 shrink-0" aria-hidden="true" />
                  )}
                  {crumb.href && !isLast ? (
                    <Link
                      href={crumb.href}
                      className="truncate max-w-[160px] sm:max-w-none text-slate-200/85 hover:text-white transition-colors"
                    >
                      {crumb.label}
                    </Link>
                  ) : (
                    <span
                      className={`truncate max-w-[200px] sm:max-w-none ${
                        isLast ? "text-white font-bold" : "text-slate-200/80"
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
        <div className="space-y-2">
          {eyebrow && (
            <p className="text-[11px] font-bold uppercase tracking-[0.22em] text-amber-300/95">
              {eyebrow}
            </p>
          )}
          <h1 className="text-2xl sm:text-4xl lg:text-[42px] font-bold tracking-tight leading-[1.12] text-white">
            {title}
          </h1>
          {subtitle && (
            <p className="max-w-2xl text-xs sm:text-sm md:text-base font-normal text-slate-100/90 leading-relaxed">
              {subtitle}
            </p>
          )}
        </div>

        {children && <div className="pt-1">{children}</div>}
      </div>
    </section>
  );
}
