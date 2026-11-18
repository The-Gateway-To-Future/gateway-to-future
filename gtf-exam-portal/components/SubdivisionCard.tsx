import Link from "next/link";
import { ArrowUpRight } from "lucide-react";

export type SubdivisionTheme =
  | "academy"
  | "studienkolleg"
  | "pflege"
  | "hub"
  | "grammar"
  | "audio"
  | "exam";

export interface SubdivisionCardProps {
  indexLabel: string;
  title: string;
  subtitle: string;
  href: string;
  ctaLabel?: string;
  theme?: SubdivisionTheme;
  badge?: string;
  metaItems?: string[];
  aspectClassName?: string;
}

const THEME_CONFIG: Record<
  SubdivisionTheme,
  { image: string; radial: string; accentLine: string }
> = {
  academy: {
    image: "/backgrounds/academy.jpg",
    radial:
      "radial-gradient(ellipse at 82% 18%, rgba(255, 209, 102, 0.14), transparent 58%)",
    accentLine: "group-hover:border-amber-200/35",
  },
  studienkolleg: {
    image: "/backgrounds/studienkolleg.jpg",
    radial:
      "radial-gradient(ellipse at 82% 18%, rgba(125, 211, 252, 0.16), transparent 58%)",
    accentLine: "group-hover:border-sky-300/35",
  },
  pflege: {
    image: "/backgrounds/pflege.jpg",
    radial:
      "radial-gradient(ellipse at 82% 18%, rgba(52, 211, 153, 0.16), transparent 58%)",
    accentLine: "group-hover:border-emerald-300/35",
  },
  hub: {
    image: "/backgrounds/hub.jpg",
    radial:
      "radial-gradient(ellipse at 82% 18%, rgba(255, 255, 255, 0.12), transparent 58%)",
    accentLine: "group-hover:border-white/30",
  },
  grammar: {
    image: "/backgrounds/grammar.jpg",
    radial:
      "radial-gradient(ellipse at 82% 18%, rgba(255, 209, 102, 0.12), transparent 58%)",
    accentLine: "group-hover:border-amber-200/35",
  },
  audio: {
    image: "/backgrounds/audio.jpg",
    radial:
      "radial-gradient(ellipse at 82% 18%, rgba(56, 189, 248, 0.16), transparent 58%)",
    accentLine: "group-hover:border-sky-300/35",
  },
  exam: {
    image: "/backgrounds/exam.jpg",
    radial:
      "radial-gradient(ellipse at 82% 18%, rgba(255, 255, 255, 0.14), transparent 58%)",
    accentLine: "group-hover:border-white/35",
  },
};

export function SubdivisionCard({
  indexLabel,
  title,
  subtitle,
  href,
  ctaLabel = "Open Folder",
  theme = "hub",
  badge,
  metaItems,
  aspectClassName,
}: SubdivisionCardProps) {
  const cfg = THEME_CONFIG[theme] || THEME_CONFIG.hub;
  const safeHref = href && href.trim() !== "" && href !== "#" ? href : "/academy";

  return (
    <Link
      href={safeHref}
      prefetch={true}
      className={`group relative z-20 cursor-pointer flex flex-col justify-between overflow-hidden rounded-2xl border border-white/10 bg-slate-900 p-6 sm:p-8 transition-all duration-500 hover:border-white/25 ${cfg.accentLine} ${
        aspectClassName || "min-h-[260px] sm:min-h-[290px]"
      }`}
    >
      {/* Layer 1: High-Res 3D Architectural / Topic Photography */}
      <div
        className="pointer-events-none absolute inset-0 bg-cover bg-center opacity-55 transition-transform duration-700 ease-out group-hover:scale-105"
        style={{ backgroundImage: `url('${cfg.image}')` }}
      />

      {/* Layer 2: Multi-layered 3D Perspective Mesh & Radial Lighting */}
      <div
        className="pointer-events-none absolute -inset-x-10 bottom-0 h-2/3 opacity-45 bmw-mesh-grid"
        aria-hidden="true"
      />
      <div
        className="pointer-events-none absolute inset-0 transition-opacity duration-500 opacity-85 group-hover:opacity-100"
        style={{ backgroundImage: cfg.radial }}
        aria-hidden="true"
      />

      {/* Layer 3: Dark Obsidian Glass Gradients for Razor-Sharp Typography */}
      <div
        className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/95 via-black/65 to-black/30"
        aria-hidden="true"
      />
      <div
        className="pointer-events-none absolute inset-0 bg-gradient-to-r from-black/85 via-black/45 to-transparent"
        aria-hidden="true"
      />

      {/* Foreground Top Bar */}
      <div className="relative z-10 flex items-start justify-between gap-3">
        <span className="text-[11px] font-semibold uppercase tracking-[0.22em] text-white/60">
          {indexLabel}
        </span>

        {badge && (
          <span className="shrink-0 rounded-full border border-white/15 bg-black/55 px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.16em] text-white/85 backdrop-blur-md">
            {badge}
          </span>
        )}
      </div>

      {/* Foreground Content Block */}
      <div className="relative z-10 mt-10 space-y-3">
        <h3 className="text-2xl sm:text-[28px] font-light tracking-tight leading-[1.15] text-white">
          {title}
        </h3>

        <p className="max-w-xl text-xs sm:text-sm text-white/70 leading-relaxed line-clamp-3">
          {subtitle}
        </p>

        {Array.isArray(metaItems) && metaItems.length > 0 && (
          <div className="flex flex-wrap items-center gap-2 pt-1">
            {metaItems.filter(Boolean).map((item) => (
              <span
                key={item}
                className="rounded-lg border border-white/10 bg-white/[0.05] px-2.5 py-0.5 text-[10px] font-medium uppercase tracking-[0.14em] text-white/70 backdrop-blur-sm"
              >
                {item}
              </span>
            ))}
          </div>
        )}

        <div className="pt-2 flex items-center justify-between border-t border-white/10">
          <span className="inline-flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.2em] text-white transition-transform duration-300 group-hover:translate-x-1">
            <span>{ctaLabel}</span>
            <ArrowUpRight className="h-3.5 w-3.5 text-white/80" />
          </span>

          <span className="h-1.5 w-1.5 rounded-full bg-white/30 transition-colors duration-300 group-hover:bg-white" />
        </div>
      </div>
    </Link>
  );
}
