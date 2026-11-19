import Link from "next/link";
import {
  BookOpen,
  CheckCircle2,
  ChevronRight,
  ClipboardCheck,
  FileText,
  GraduationCap,
  Headphones,
  Layers,
  Mic,
  PenTool,
  Sigma,
  Stethoscope,
} from "lucide-react";
import type { SubdivisionTopicItem } from "@/lib/subdivisions";

export interface CompactTopicRowProps {
  topic: SubdivisionTopicItem;
  index: number;
  isCompleted?: boolean;
}

interface PillMeta {
  label: string;
  tone: "slate" | "sky" | "amber" | "emerald" | "indigo";
  hasAudioIcon?: boolean;
}

function extractIndexNumber(indexLabel: string): string | null {
  const match = indexLabel.match(/\b(\d{2})\b/);
  return match ? match[1] : null;
}

function hasAudioSignal(topic: SubdivisionTopicItem): boolean {
  const haystack = [
    topic.badge,
    topic.indexLabel,
    ...(topic.metaItems || []),
  ]
    .join(" ")
    .toLowerCase();

  return (
    topic.examSection === "hoeren" ||
    topic.theme === "audio" && (
      haystack.includes("audio") ||
      haystack.includes("mp3") ||
      haystack.includes("hören") ||
      haystack.includes("hoeren")
    ) ||
    haystack.includes("128 kbps") ||
    haystack.includes("studio audio") ||
    haystack.includes("audio +")
  );
}

function extractQuestionCount(topic: SubdivisionTopicItem): number | null {
  const sources = [topic.badge, ...(topic.metaItems || [])];
  for (const src of sources) {
    if (!src) continue;
    const match = src.match(/(\d+)\s*(tasks?|fragen|exercises?|aufgaben)/i);
    if (match) {
      const n = Number(match[1]);
      if (Number.isFinite(n) && n > 0) return n;
    }
  }
  return null;
}

function extractCardOrPageCount(topic: SubdivisionTopicItem): string | null {
  const sources = [topic.badge, ...(topic.metaItems || [])];
  for (const src of sources) {
    if (!src) continue;
    const cardsMatch = src.match(/(\d+)\s*cards?/i);
    if (cardsMatch) return `${cardsMatch[1]} Karten`;
    const pagesMatch = src.match(/(\d+)\s*pages?/i);
    if (pagesMatch) return `${pagesMatch[1]} Seiten`;
  }
  return null;
}

function derivePrimaryPill(topic: SubdivisionTopicItem, isCompleted?: boolean): PillMeta {
  if (isCompleted) {
    return { label: "Erledigt", tone: "emerald" };
  }

  const badgeUpper = (topic.badge || "").toUpperCase();
  if (badgeUpper.includes("COMING SOON")) {
    return { label: "Bald", tone: "slate" };
  }

  const audio = hasAudioSignal(topic);
  const qCount = extractQuestionCount(topic);

  if (qCount !== null) {
    return {
      label: `${qCount} Fragen`,
      tone: audio ? "sky" : topic.theme === "grammar" ? "amber" : "slate",
      hasAudioIcon: audio,
    };
  }

  if (topic.examSection === "hoeren" || audio) {
    return { label: "Audio", tone: "sky", hasAudioIcon: true };
  }
  if (topic.examSection === "lesen") {
    return { label: "Lesen", tone: "indigo" };
  }
  if (topic.examSection === "schreiben") {
    return { label: "Schreiben", tone: "amber" };
  }
  if (topic.examSection === "sprechen") {
    return { label: "Sprechen", tone: "emerald" };
  }

  const countLabel = extractCardOrPageCount(topic);
  if (countLabel) {
    return {
      label: countLabel,
      tone: topic.kind === "flashcard-deck" ? "indigo" : "slate",
    };
  }

  if (topic.kind === "flashcard-deck" || badgeUpper.includes("CORE DECK")) {
    return { label: "30 Karten", tone: "indigo" };
  }
  if (badgeUpper.includes("WORTSCHATZ")) {
    return { label: "Vokabeln", tone: "indigo" };
  }
  if (badgeUpper.includes("122 SÄULEN") || topic.theme === "grammar") {
    return { label: "Grammatik", tone: "amber" };
  }
  if (topic.kind === "pflege-tool") {
    return { label: "Klinik", tone: "emerald" };
  }
  if (topic.kind === "stk-tool") {
    return { label: "STK Lab", tone: "indigo" };
  }

  const trimmed = (topic.badge || "").trim();
  if (trimmed.length > 0 && trimmed.length <= 14) {
    return {
      label: trimmed.charAt(0) + trimmed.slice(1).toLowerCase(),
      tone: "slate",
    };
  }

  return { label: "Lektion", tone: "slate" };
}

function getToneClasses(tone: PillMeta["tone"]): string {
  switch (tone) {
    case "sky":
      return "border-sky-200/90 bg-sky-50 text-sky-800";
    case "amber":
      return "border-amber-200/90 bg-amber-50 text-amber-800";
    case "emerald":
      return "border-emerald-200/90 bg-emerald-50 text-emerald-800";
    case "indigo":
      return "border-indigo-200/90 bg-indigo-50 text-indigo-800";
    default:
      return "border-slate-200 bg-slate-100/80 text-slate-700";
  }
}

function getBadgeToneClasses(topic: SubdivisionTopicItem, isCompleted?: boolean): string {
  if (isCompleted) {
    return "border-emerald-200 bg-emerald-50 text-emerald-700";
  }
  if (hasAudioSignal(topic)) {
    return "border-sky-200/90 bg-sky-50 text-sky-700 group-hover:bg-sky-100/80";
  }
  switch (topic.theme) {
    case "grammar":
      return "border-amber-200/90 bg-amber-50 text-amber-800 group-hover:bg-amber-100/80";
    case "pflege":
      return "border-emerald-200/90 bg-emerald-50 text-emerald-700 group-hover:bg-emerald-100/80";
    case "studienkolleg":
      return "border-indigo-200/90 bg-indigo-50 text-indigo-700 group-hover:bg-indigo-100/80";
    case "exam":
      return "border-slate-300/90 bg-slate-100 text-slate-800 group-hover:bg-slate-200/70";
    case "audio":
      return "border-sky-200/90 bg-sky-50 text-sky-700 group-hover:bg-sky-100/80";
    default:
      return "border-slate-200 bg-slate-100/90 text-slate-700 group-hover:bg-slate-200/70";
  }
}

function renderTopicIcon(topic: SubdivisionTopicItem, isCompleted?: boolean) {
  if (isCompleted) {
    return <CheckCircle2 className="h-4 w-4 text-emerald-600" aria-hidden="true" />;
  }
  if (topic.examSection === "hoeren" || hasAudioSignal(topic)) {
    return <Headphones className="h-4 w-4" aria-hidden="true" />;
  }
  if (topic.examSection === "schreiben") {
    return <PenTool className="h-4 w-4" aria-hidden="true" />;
  }
  if (topic.examSection === "sprechen") {
    return <Mic className="h-4 w-4" aria-hidden="true" />;
  }
  if (topic.examSection === "lesen") {
    return <BookOpen className="h-4 w-4" aria-hidden="true" />;
  }
  if (topic.kind === "flashcard-deck" || topic.id.startsWith("vocab-")) {
    return <Layers className="h-4 w-4" aria-hidden="true" />;
  }
  if (topic.kind === "stk-tool") {
    return <Sigma className="h-4 w-4" aria-hidden="true" />;
  }
  if (topic.kind === "pflege-tool") {
    return <Stethoscope className="h-4 w-4" aria-hidden="true" />;
  }
  if (topic.theme === "grammar") {
    return <GraduationCap className="h-4 w-4" aria-hidden="true" />;
  }
  if (topic.theme === "exam") {
    return <ClipboardCheck className="h-4 w-4" aria-hidden="true" />;
  }
  return <FileText className="h-4 w-4" aria-hidden="true" />;
}

export function CompactTopicRow({ topic, index, isCompleted = false }: CompactTopicRowProps) {
  const safeHref =
    topic.href && topic.href.trim() !== "" && topic.href !== "#"
      ? topic.href
      : "/academy";

  const idxNum = extractIndexNumber(topic.indexLabel || "");
  const isSimulator =
    topic.kind === "exam-simulator" && !idxNum;
  const displayNumber = idxNum || (!isSimulator ? String(index + 1).padStart(2, "0") : null);
  const pill = derivePrimaryPill(topic, isCompleted);
  const badgeClasses = getBadgeToneClasses(topic, isCompleted);

  return (
    <Link
      href={safeHref}
      prefetch={true}
      className="group relative z-20 flex items-center gap-3 px-3 sm:px-4 py-2.5 sm:py-3 transition-colors duration-150 hover:bg-slate-50 active:bg-slate-100/90 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-slate-900"
    >
      {/* Left: Compact Lab Number or Semantic Icon Badge */}
      <div
        className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border transition-colors ${badgeClasses}`}
      >
        {isCompleted ? (
          <CheckCircle2 className="h-4 w-4 text-emerald-600" aria-hidden="true" />
        ) : displayNumber ? (
          <span className="font-mono text-xs font-bold tracking-tight tabular-nums">
            {displayNumber}
          </span>
        ) : (
          renderTopicIcon(topic, isCompleted)
        )}
      </div>

      {/* Center: Crisp Title + 1-Line Subtle Subtitle */}
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-1.5 min-w-0">
          <h3 className="truncate text-[13.5px] sm:text-sm font-semibold tracking-tight text-slate-900 leading-snug group-hover:text-slate-950">
            {topic.title}
          </h3>
        </div>
        <p className="mt-0.5 truncate text-[11.5px] sm:text-xs text-slate-500 leading-snug">
          {topic.subtitle}
        </p>
      </div>

      {/* Right: Compact Pill Badge(s) + Subtle Chevron */}
      <div className="flex shrink-0 items-center gap-1.5 sm:gap-2">
        {pill.hasAudioIcon && pill.label !== "Audio" && (
          <span
            className="inline-flex items-center gap-1 rounded-full border border-sky-200/90 bg-sky-50 px-2 py-0.5 text-[10px] font-semibold text-sky-700"
            title="Includes Studio Audio"
          >
            <Headphones className="h-2.5 w-2.5 shrink-0" aria-hidden="true" />
            <span className="hidden sm:inline">Audio</span>
          </span>
        )}

        <span
          className={`inline-flex items-center gap-1 whitespace-nowrap rounded-full border px-2.5 py-0.5 text-[10px] sm:text-[11px] font-semibold tracking-tight ${getToneClasses(
            pill.tone,
          )}`}
        >
          {pill.hasAudioIcon && pill.label === "Audio" && (
            <Headphones className="h-2.5 w-2.5 shrink-0" aria-hidden="true" />
          )}
          {isCompleted && (
            <CheckCircle2 className="h-2.5 w-2.5 shrink-0" aria-hidden="true" />
          )}
          <span>{pill.label}</span>
        </span>

        <ChevronRight
          className="h-4 w-4 shrink-0 text-slate-400 transition-transform duration-150 group-hover:translate-x-0.5 group-hover:text-slate-700"
          aria-hidden="true"
        />
      </div>
    </Link>
  );
}

export interface CompactTopicListProps {
  topics: SubdivisionTopicItem[];
  completedIds?: ReadonlySet<string>;
}

export function CompactTopicList({ topics, completedIds }: CompactTopicListProps) {
  const safeTopics = Array.isArray(topics) ? topics : [];

  return (
    <div className="overflow-hidden rounded-2xl border border-slate-200/90 bg-white shadow-xs divide-y divide-slate-100">
      {safeTopics.map((topic, index) => (
        <CompactTopicRow
          key={topic.id}
          topic={topic}
          index={index}
          isCompleted={Boolean(completedIds?.has(topic.id))}
        />
      ))}
    </div>
  );
}
