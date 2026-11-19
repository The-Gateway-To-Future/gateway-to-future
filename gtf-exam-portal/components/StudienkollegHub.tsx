"use client";

import React, { useState } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import {
  Ban,
  BarChart3,
  BookOpen,
  CheckCircle2,
  ChevronRight,
  FileText,
  GraduationCap,
  Headphones,
  Landmark,
  Layers,
  Lock,
  RotateCw,
  Sigma,
  Stethoscope,
  Terminal,
} from "lucide-react";
import { MathText } from "@/components/MathText";
import {
  STUDIENKOLLEG_FLASHCARDS,
  STUDIENKOLLEG_FORMULAS,
  STUDIENKOLLEG_PAST_PAPERS,
} from "@/lib/divisions-data";
import type { StudienkollegTrack } from "@/lib/types";
import type { PricingTierKey } from "@/lib/config";
import { useIsNativeApp } from "@/lib/use-native-platform";

export type StudienkollegView = "formulas" | "syllabus" | "past_papers" | "flashcards";

interface StudienkollegHubProps {
  unlockedCourses?: Set<string>;
  initialTrack?: StudienkollegTrack;
  initialView?: StudienkollegView;
  onRequestAccess: (
    slug: string,
    title: string,
    track: string,
    defaultTier?: PricingTierKey,
  ) => void;
}

const TRACK_ORDER: StudienkollegTrack[] = ["m_kurs", "t_kurs", "w_kurs", "g_kurs"];

export function StudienkollegHub({
  unlockedCourses = new Set(),
  initialTrack = "t_kurs",
  initialView = "formulas",
  onRequestAccess,
}: StudienkollegHubProps) {
  const { isNative, ready: nativeReady } = useIsNativeApp();
  const [activeTrack, setActiveTrack] = useState<StudienkollegTrack>(initialTrack);
  const [activeView, setActiveView] = useState<StudienkollegView>(initialView);

  // Flashcards State
  const [selectedSubject, setSelectedSubject] = useState<string>("All");
  const [flippedCards, setFlippedCards] = useState<Record<string, boolean>>({});
  const [masteredCards, setMasteredCards] = useState<Record<string, boolean>>({});

  const trackMeta = {
    m_kurs: {
      name: "M-Kurs (Medizin, Biologie & Pharmazie)",
      short: "M-Kurs",
      icon: Stethoscope,
      subjects:
        "Zellbiologie, Organische/Anorganische Chemie, Medizinische Physik & Mathematik",
      targetUnis:
        "Charité Berlin, LMU München, Heidelberg, Halle-Wittenberg, Leipzig",
      formulaId: "form-m-01",
      semesters: [
        {
          sem: "Aufnahmeprüfung",
          desc: "Stöchiometrie, Säure-Base, Zellbiologie, Genetik & Medizin C-Test",
        },
        {
          sem: "Semester 1",
          desc: "Biomembranen, Enzymkinetik, Thermodynamik, MWG & Puffer",
        },
        {
          sem: "Semester 2",
          desc: "Zellatmung, Neurobiologie, Immunologie, Organische Stoffklassen & Biometrie",
        },
        {
          sem: "FSP Examen",
          desc: "Feststellungsprüfung Biologie & Chemie mit Musterlösungen",
        },
      ],
    },
    t_kurs: {
      name: "T-Kurs (Technik & Ingenieurwesen)",
      short: "T-Kurs",
      icon: Terminal,
      subjects: "Höhere Mathematik, Physik, Technische Mechanik & Deutsch",
      targetUnis: "TU Berlin, KIT Karlsruhe, TU München, TU Darmstadt, RWTH Aachen",
      formulaId: "form-t-01",
      semesters: [
        {
          sem: "Aufnahmeprüfung",
          desc: "Algebra, Trigonometrie, Vektoren, Kinematik & MINT C-Test",
        },
        {
          sem: "Semester 1",
          desc: "Differential- & Integralrechnung, Newtonsche Mechanik, Schwingungen & E-Lehre",
        },
        {
          sem: "Semester 2",
          desc: "Lineare DGL, Mehrdimensionale Analysis, Elektromagnetismus & Wellenoptik",
        },
        {
          sem: "FSP Examen",
          desc: "Feststellungsprüfung Mathematik & Physik mit Musterlösungen",
        },
      ],
    },
    w_kurs: {
      name: "W-Kurs (Wirtschaftswissenschaften, VWL & BWL)",
      short: "W-Kurs",
      icon: BarChart3,
      subjects:
        "Volkswirtschaftslehre (VWL), Betriebswirtschaftslehre (BWL) & Wirtschaftsmathematik",
      targetUnis:
        "Goethe-Uni Frankfurt, Uni zu Köln, LMU München, Uni Leipzig, Uni Hamburg",
      formulaId: "form-w-01",
      semesters: [
        {
          sem: "Aufnahmeprüfung",
          desc: "Lineare Optimierung, Prozent/Zins, Gleichungssysteme & Wirtschaftsdeutsch",
        },
        {
          sem: "Semester 1",
          desc: "Mikroökonomie (Marktformen), Makroökonomie (VGR/BIP), Bilanzierung & GuV",
        },
        {
          sem: "Semester 2",
          desc: "Außenwirtschaft, EZB-Geldpolitik, KLR, Investitionsrechnung & Sozialpolitik",
        },
        {
          sem: "FSP Examen",
          desc: "Feststellungsprüfung VWL, BWL & Mathematik mit Musterlösungen",
        },
      ],
    },
    g_kurs: {
      name: "G-Kurs (Geisteswissenschaften, Geschichte & Sozialkunde)",
      short: "G-Kurs",
      icon: Landmark,
      subjects:
        "Deutsche Geschichte, Sozialkunde/Politik, Literaturgeschichte & Textanalyse",
      targetUnis:
        "FU Berlin, Uni Heidelberg, Uni Marburg, Uni Hamburg, Uni Mainz",
      formulaId: "form-g-01",
      semesters: [
        {
          sem: "Aufnahmeprüfung",
          desc: "Textproduktion, Quelleninterpretation, Grundgesetz & Geisteswissenschaft C-Test",
        },
        {
          sem: "Semester 1",
          desc: "Weimarer Republik, NS-Herrschaft, Potsdamer Konferenz & Gründung BRD/DDR",
        },
        {
          sem: "Semester 2",
          desc: "Mauerbau & Kalter Krieg, Friedliche Revolution 1989, Einheit & Literaturgeschichte",
        },
        {
          sem: "FSP Examen",
          desc: "Feststellungsprüfung Geschichte & Deutsche Literatur mit Musterlösungen",
        },
      ],
    },
  };

  const [selectedFormulaId, setSelectedFormulaId] = useState<string>(
    trackMeta[initialTrack].formulaId,
  );

  const isFreeLaunch = process.env.NEXT_PUBLIC_FREE_LAUNCH_MODE === "true";
  const isTrackUnlocked =
    isFreeLaunch ||
    unlockedCourses.has("studienkolleg-all-access") ||
    unlockedCourses.has(`studienkolleg-${activeTrack}-crash`) ||
    unlockedCourses.has("gtf-all-access-pass");

  const filteredFlashcards = STUDIENKOLLEG_FLASHCARDS.filter((card) => {
    if (card.track !== activeTrack) return false;
    if (selectedSubject !== "All" && card.subject !== selectedSubject) return false;
    return true;
  });

  const availableSubjects = Array.from(
    new Set(
      STUDIENKOLLEG_FLASHCARDS.filter((c) => c.track === activeTrack).map(
        (c) => c.subject,
      ),
    ),
  );

  const filteredFormulas = STUDIENKOLLEG_FORMULAS.filter(
    (f) => f.track === activeTrack,
  );
  const currentFormula =
    filteredFormulas.find((f) => f.id === selectedFormulaId) ||
    filteredFormulas[0] ||
    STUDIENKOLLEG_FORMULAS[0];

  const filteredPastPapers = STUDIENKOLLEG_PAST_PAPERS.filter(
    (p) => p.track === activeTrack,
  );

  const currentTrackMeta = trackMeta[activeTrack];

  const toggleFlip = (id: string) => {
    setFlippedCards((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  const toggleMastery = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setMasteredCards((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  return (
    <div className="space-y-6 text-slate-900">
      {/* Unified Light Academic Control Bar (Language Academy Aesthetic) */}
      <div className="rounded-2xl border border-slate-200 bg-white p-5 sm:p-6 shadow-xs flex flex-col gap-4">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div className="space-y-2 min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <span className="inline-flex items-center gap-1.5 rounded-full border border-indigo-200 bg-indigo-50 px-3 py-1 text-[11px] font-semibold uppercase tracking-wider text-indigo-800">
                {currentTrackMeta.name}
              </span>
              <span className="inline-flex items-center gap-1.5 rounded-full border border-slate-200 bg-slate-100 px-3 py-1 text-[11px] font-semibold text-slate-700">
                <Ban className="h-3 w-3 text-slate-500 shrink-0" aria-hidden="true" />
                <span>Prüfungsmodus: Ohne Taschenrechner</span>
              </span>
            </div>
            <p className="text-xs text-slate-600 leading-relaxed">
              Target Unis:{" "}
              <strong className="text-slate-900">{currentTrackMeta.targetUnis}</strong>{" "}
              · Fächer:{" "}
              <span className="text-slate-700">{currentTrackMeta.subjects}</span>
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2 shrink-0">
            <Link
              href={`/exam/${activeTrack}/lesen`}
              className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-2 text-xs font-semibold text-slate-800 hover:border-slate-300 hover:bg-slate-100 transition"
            >
              <BookOpen className="h-3.5 w-3.5 text-indigo-600" />
              <span>Aufnahmeprüfung</span>
            </Link>

            <Link
              href={`/exam/${activeTrack}/hoeren`}
              className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-2 text-xs font-semibold text-slate-800 hover:border-slate-300 hover:bg-slate-100 transition"
            >
              <Headphones className="h-3.5 w-3.5 text-sky-600" />
              <span>Hören Audio</span>
            </Link>

            {isTrackUnlocked ? (
              <span className="inline-flex items-center gap-1.5 rounded-xl border border-emerald-200 bg-emerald-50 px-3.5 py-2 text-xs font-semibold text-emerald-800">
                <CheckCircle2 className="h-3.5 w-3.5" />
                <span>Track Unlocked</span>
              </span>
            ) : nativeReady && !isNative ? (
              <button
                type="button"
                onClick={() =>
                  onRequestAccess(
                    `studienkolleg-${activeTrack}-crash`,
                    `${currentTrackMeta.name} Complete Track`,
                    "Division 2: Studienkolleg Hub",
                    "all_access_pass",
                  )
                }
                className="inline-flex items-center gap-1.5 rounded-xl bg-slate-900 text-white px-4 py-2 text-xs font-semibold shadow-xs hover:bg-slate-800 transition cursor-pointer"
              >
                <Lock className="h-3.5 w-3.5" />
                <span>Unlock with GTF Pro</span>
              </button>
            ) : (
              <span className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-slate-100 px-3.5 py-2 text-xs font-semibold text-slate-700">
                <Lock className="h-3.5 w-3.5" />
                <span>Enrolled Students Only</span>
              </span>
            )}
          </div>
        </div>

        {/* Track Switcher + View Tabs (Responsive flex-wrap, 0px overflow on 375px) */}
        <div className="flex flex-wrap items-center justify-between gap-3 pt-3 border-t border-slate-100">
          <div className="flex flex-wrap gap-1.5 rounded-xl bg-slate-100/90 p-1 border border-slate-200/80">
            {TRACK_ORDER.map((trk) => {
              const meta = trackMeta[trk];
              const Icon = meta.icon;
              const isSelected = activeTrack === trk;
              return (
                <button
                  key={trk}
                  type="button"
                  onClick={() => {
                    setActiveTrack(trk);
                    setSelectedSubject("All");
                    setSelectedFormulaId(meta.formulaId);
                  }}
                  className={`relative flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold transition select-none cursor-pointer ${
                    isSelected
                      ? "bg-slate-900 text-white shadow-xs"
                      : "text-slate-600 hover:bg-white hover:text-slate-900"
                  }`}
                >
                  <Icon
                    className={`h-3.5 w-3.5 ${
                      isSelected ? "text-white" : "text-slate-500"
                    }`}
                  />
                  <span>{meta.short}</span>
                </button>
              );
            })}
          </div>

          <div className="flex flex-wrap gap-1.5 rounded-xl bg-slate-100/90 p-1 border border-slate-200/80">
            {(
              [
                { id: "formulas", label: "Formelsammlung", icon: Sigma },
                { id: "syllabus", label: "2-Semester-Plan", icon: GraduationCap },
                {
                  id: "past_papers",
                  label: `Altklausuren (${filteredPastPapers.length})`,
                  icon: FileText,
                },
                { id: "flashcards", label: "Fach-Karten", icon: Layers },
              ] as const
            ).map((tab) => {
              const Icon = tab.icon;
              const active = activeView === tab.id;
              return (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setActiveView(tab.id)}
                  className={`inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold transition cursor-pointer ${
                    active
                      ? "bg-slate-900 text-white shadow-xs"
                      : "text-slate-600 hover:bg-white hover:text-slate-900"
                  }`}
                >
                  <Icon className="h-3.5 w-3.5" />
                  <span>{tab.label}</span>
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* ── VIEW 1: TEXTBOOK FORMULA REFERENCE (KATEX, NO CALCULATOR) ────────── */}
      {activeView === "formulas" && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Formula Selector List */}
          <div className="space-y-3">
            <div className="flex items-center justify-between text-xs font-semibold uppercase tracking-wider text-slate-500">
              <span className="inline-flex items-center gap-1.5">
                <Sigma className="h-3.5 w-3.5 text-indigo-600" />
                <span>Formelsammlung ({filteredFormulas.length})</span>
              </span>
            </div>

            <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-xs divide-y divide-slate-100">
              {(filteredFormulas || []).map((form) => {
                const isSelected = form.id === currentFormula.id;
                return (
                  <button
                    key={form.id}
                    type="button"
                    onClick={() => setSelectedFormulaId(form.id)}
                    className={`w-full text-left p-4 transition cursor-pointer ${
                      isSelected
                        ? "bg-slate-900 text-white"
                        : "bg-white text-slate-900 hover:bg-slate-50"
                    }`}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span
                        className={`text-[10px] font-semibold uppercase tracking-wider ${
                          isSelected ? "text-slate-300" : "text-slate-500"
                        }`}
                      >
                        {form.subject}
                      </span>
                      <ChevronRight
                        className={`h-4 w-4 shrink-0 ${
                          isSelected ? "text-white" : "text-slate-400"
                        }`}
                      />
                    </div>
                    <p
                      className={`mt-1 text-sm font-semibold leading-snug ${
                        isSelected ? "text-white" : "text-slate-900"
                      }`}
                    >
                      {form.title}
                    </p>
                    <div
                      className={`mt-2 overflow-x-auto text-xs ${
                        isSelected ? "text-indigo-200" : "text-slate-600"
                      }`}
                    >
                      <MathText text={form.latex} inlineMath />
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Active Textbook Formula Card & Step-by-Step Worked Example */}
          <div className="lg:col-span-2 rounded-2xl border border-slate-200 bg-white p-5 sm:p-7 shadow-xs space-y-6 min-w-0">
            <div className="space-y-2 border-b border-slate-100 pb-4">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <span className="rounded-full border border-indigo-200 bg-indigo-50 text-indigo-800 px-3 py-0.5 text-[11px] font-semibold">
                  {currentFormula.subject}
                </span>
                <span className="inline-flex items-center gap-1.5 rounded-full border border-slate-200 bg-slate-50 px-2.5 py-0.5 text-[11px] font-medium text-slate-600">
                  <Ban className="h-3 w-3 text-slate-400" aria-hidden="true" />
                  <span>Prüfungsmodus: Ohne Taschenrechner</span>
                </span>
              </div>
              <h3 className="text-xl font-bold tracking-tight text-slate-900">
                {currentFormula.title}
              </h3>
              <p className="text-sm text-slate-600 leading-relaxed german-reading">
                <MathText text={currentFormula.explanationDe} />
              </p>
            </div>

            {/* Textbook Display Equation Box (Overflow-safe on 375px–430px) */}
            <div className="rounded-2xl border border-slate-200 bg-slate-50/90 px-4 py-5 text-slate-950 overflow-x-auto">
              <MathText text={currentFormula.latex} display />
            </div>

            {/* Variable Legend (Textbook Definition Table) */}
            <div className="space-y-3">
              <h4 className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">
                Größen &amp; Einheiten (Legende)
              </h4>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {(currentFormula?.variables || []).map((v) => (
                  <div
                    key={v.symbol}
                    className="rounded-xl border border-slate-200 bg-slate-50/70 p-3.5 space-y-1 min-w-0"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-sm font-bold text-slate-900">
                        <MathText text={v.symbol} />
                      </span>
                      <span className="rounded-md border border-slate-200 bg-white px-2 py-0.5 text-[11px] font-medium text-slate-600 shrink-0">
                        <MathText text={v.unit} />
                      </span>
                    </div>
                    <p className="text-xs text-slate-600 leading-snug">
                      <MathText text={v.description} />
                    </p>
                  </div>
                ))}
              </div>
            </div>

            {/* Step-by-Step Worked Example */}
            <div className="rounded-2xl border border-emerald-200/80 bg-emerald-50/50 p-4 sm:p-5 space-y-3">
              <div className="flex flex-wrap items-center justify-between gap-2 border-b border-emerald-200/60 pb-2.5">
                <span className="text-[11px] font-bold uppercase tracking-[0.16em] text-emerald-800">
                  Musterlösung · Rechenbeispiel
                </span>
                <span className="text-xs sm:text-sm font-bold text-slate-900">
                  <MathText text={currentFormula?.exampleCalculation?.result || ""} />
                </span>
              </div>
              <ol className="space-y-2 text-xs sm:text-sm text-slate-800 leading-relaxed">
                {(currentFormula?.exampleCalculation?.steps || []).map((st, i) => (
                  <li key={i} className="flex items-start gap-2.5">
                    <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-emerald-700 text-[10px] font-bold text-white">
                      {i + 1}
                    </span>
                    <div className="min-w-0 overflow-x-auto">
                      <MathText text={st} />
                    </div>
                  </li>
                ))}
              </ol>
            </div>
          </div>
        </div>
      )}

      {/* ── VIEW 2: 2-SEMESTER SYLLABUS ROADMAP ──────────────────────────────── */}
      {activeView === "syllabus" && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5 items-stretch">
          {(currentTrackMeta?.semesters || []).map((mod, idx) => (
            <div
              key={idx}
              className="rounded-2xl border border-slate-200 bg-white p-5 sm:p-6 shadow-xs flex flex-col justify-between min-h-[210px]"
            >
              <div>
                <div className="flex items-center justify-between gap-3 mb-3">
                  <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-slate-900 text-white text-xs font-bold">
                    {idx + 1}
                  </span>
                  <span className="text-[10px] font-semibold uppercase tracking-wider text-slate-500">
                    Phase 0{idx + 1}
                  </span>
                </div>
                <h3 className="text-base font-bold text-slate-900 leading-snug break-words">
                  {mod.sem}
                </h3>
                <p className="mt-2 text-xs text-slate-600 leading-relaxed">
                  {mod.desc}
                </p>
              </div>
              <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-xs font-semibold">
                {isTrackUnlocked ? (
                  <span className="text-emerald-700 inline-flex items-center gap-1">
                    <CheckCircle2 className="h-3.5 w-3.5" />
                    <span>Module Unlocked</span>
                  </span>
                ) : nativeReady && !isNative ? (
                  <button
                    type="button"
                    onClick={() =>
                      onRequestAccess(
                        `studienkolleg-${activeTrack}-mod-${idx + 1}`,
                        `${currentTrackMeta.short} — ${mod.sem}`,
                        currentTrackMeta.name,
                        "all_access_pass",
                      )
                    }
                    className="text-slate-900 hover:text-indigo-700 transition inline-flex items-center gap-1.5 font-semibold cursor-pointer"
                  >
                    <Lock className="h-3.5 w-3.5" />
                    <span>Unlock with GTF Pro</span>
                    <ChevronRight className="h-3.5 w-3.5" />
                  </button>
                ) : (
                  <span className="text-slate-600 inline-flex items-center gap-1.5 font-medium">
                    <Lock className="h-3.5 w-3.5" />
                    <span>Enrolled Access</span>
                  </span>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* ── VIEW 3: UNIVERSITY PAST PAPERS ARCHIVE ────────────────────────────── */}
      {activeView === "past_papers" && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-stretch">
          {(filteredPastPapers || []).map((paper) => (
            <div
              key={paper.id}
              className="rounded-2xl border border-slate-200 bg-white p-5 sm:p-6 shadow-xs flex flex-col justify-between"
            >
              <div>
                <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
                  <span className="rounded-full border border-slate-200 bg-slate-100 px-3 py-0.5 text-[11px] font-semibold text-slate-700">
                    {paper.city} · {paper.year}
                  </span>
                  <span className="text-[11px] font-semibold text-indigo-700">
                    {paper.durationMinutes} Min · {paper.totalPoints} Pkt
                  </span>
                </div>

                <h3 className="text-base font-bold text-slate-900 german-headline leading-snug">
                  {paper.university}
                </h3>
                <p className="mt-1 text-xs font-semibold text-indigo-700">
                  {paper.subject}
                </p>
                <p className="mt-2 text-xs text-slate-600 leading-relaxed german-reading">
                  {paper.overview}
                </p>

                <div className="mt-4 rounded-xl bg-slate-50 p-3.5 space-y-1.5 border border-slate-200/80">
                  <p className="text-[10px] font-bold uppercase tracking-wider text-slate-500">
                    Geprüfte Themen &amp; Standard:
                  </p>
                  {(Array.isArray(paper.keyTopics) ? paper.keyTopics : []).map((top, idx) => (
                    <p
                      key={idx}
                      className="text-xs text-slate-700 flex items-start gap-2 german-reading"
                    >
                      <span className="mt-1.5 h-1.5 w-1.5 rounded-full bg-indigo-500 shrink-0" />
                      <span>
                        <MathText text={top} />
                      </span>
                    </p>
                  ))}
                </div>
              </div>

              <div className="mt-6 pt-4 border-t border-slate-100 flex flex-wrap items-center justify-between gap-2">
                <Link
                  href={`/exam/${activeTrack}/lesen`}
                  className="inline-flex items-center gap-1.5 rounded-xl bg-slate-900 text-white px-4 py-2 text-xs font-semibold hover:bg-slate-800 transition shadow-xs"
                >
                  <BookOpen className="h-3.5 w-3.5" />
                  <span>Simulation starten</span>
                </Link>

                {isTrackUnlocked ? (
                  <Link
                    href={`/exam/${activeTrack}/lesen`}
                    className="inline-flex items-center gap-1.5 rounded-xl bg-emerald-50 border border-emerald-200 px-3.5 py-2 text-xs font-semibold text-emerald-800 hover:bg-emerald-100 transition"
                  >
                    <CheckCircle2 className="h-3.5 w-3.5" />
                    <span>Lösungen frei</span>
                  </Link>
                ) : nativeReady && !isNative ? (
                  <button
                    type="button"
                    onClick={() =>
                      onRequestAccess(
                        `stk-${activeTrack}-paper-${paper.id}`,
                        `${paper.university} (${paper.subject})`,
                        currentTrackMeta.name,
                        "all_access_pass",
                      )
                    }
                    className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-slate-50 text-slate-800 px-3.5 py-2 text-xs font-semibold hover:bg-slate-100 transition cursor-pointer"
                  >
                    <Lock className="h-3.5 w-3.5" />
                    <span>Unlock with GTF Pro</span>
                  </button>
                ) : (
                  <span className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-2 text-xs font-medium text-slate-600">
                    <Lock className="h-3.5 w-3.5" />
                    <span>Enrolled Access</span>
                  </span>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* ── VIEW 4: ACADEMIC FLASHCARDS (LIGHT TEXTBOOK CARDS + KATEX) ────────── */}
      {activeView === "flashcards" && (
        <div className="space-y-5">
          <div className="flex flex-wrap items-center gap-2">
            <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-500 mr-1">
              <Layers className="h-3.5 w-3.5" /> Fach-Filter:
            </span>
            <button
              type="button"
              onClick={() => setSelectedSubject("All")}
              className={`rounded-xl px-3 py-1.5 text-xs font-semibold transition cursor-pointer ${
                selectedSubject === "All"
                  ? "bg-slate-900 text-white shadow-xs"
                  : "border border-slate-200 bg-white text-slate-700 hover:bg-slate-100"
              }`}
            >
              Alle ({STUDIENKOLLEG_FLASHCARDS.filter((c) => c.track === activeTrack).length})
            </button>
            {(availableSubjects || []).map((sub) => (
              <button
                key={sub}
                type="button"
                onClick={() => setSelectedSubject(sub)}
                className={`rounded-xl px-3 py-1.5 text-xs font-semibold transition cursor-pointer ${
                  selectedSubject === sub
                    ? "bg-slate-900 text-white shadow-xs"
                    : "border border-slate-200 bg-white text-slate-700 hover:bg-slate-100"
                }`}
              >
                {sub}
              </button>
            ))}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {(Array.isArray(filteredFlashcards) ? filteredFlashcards : []).map((card) => {
              if (!card) return null;
              const isFlipped = Boolean(flippedCards[card.id]);
              const isMastered = Boolean(masteredCards[card.id]);

              return (
                <div
                  key={card.id}
                  onClick={() => toggleFlip(card.id)}
                  className="group relative h-80 cursor-pointer perspective-1000 select-none"
                >
                  <motion.div
                    animate={{ rotateY: isFlipped ? 180 : 0 }}
                    transition={{ duration: 0.45, ease: "easeInOut" }}
                    className="relative h-full w-full rounded-2xl preserve-3d transition-shadow"
                  >
                    {/* FRONT SIDE */}
                    <div className="absolute inset-0 flex flex-col justify-between rounded-2xl border border-slate-200 bg-white p-5 shadow-xs backface-hidden">
                      <div className="min-w-0">
                        <div className="flex items-center justify-between">
                          <span className="rounded-md border border-slate-200 bg-slate-50 px-2 py-0.5 text-[10px] font-semibold text-slate-700 uppercase">
                            {card.subject}
                          </span>
                          <button
                            type="button"
                            onClick={(e) => toggleMastery(card.id, e)}
                            className={`rounded-full p-1 transition cursor-pointer ${
                              isMastered
                                ? "text-emerald-600 bg-emerald-50"
                                : "text-slate-400 hover:text-slate-800"
                            }`}
                            title={isMastered ? "Mastered" : "Mark as Mastered"}
                          >
                            <CheckCircle2 className="h-5 w-5" />
                          </button>
                        </div>

                        <div className="mt-3.5">
                          <p className="text-[11px] font-semibold text-indigo-700">
                            {card.category}
                          </p>
                          <h3 className="mt-1 text-base font-bold text-slate-900 leading-snug">
                            {card.termDe}
                          </h3>
                          {card.pronunciationDe && (
                            <p className="text-[11px] text-slate-500 font-mono mt-0.5">
                              {card.pronunciationDe}
                            </p>
                          )}
                        </div>

                        <p className="mt-3 text-xs text-slate-600 line-clamp-4 leading-relaxed">
                          <MathText text={card.definitionDe} />
                        </p>
                      </div>

                      <div className="flex items-center justify-between border-t border-slate-100 pt-3 text-[11px] text-slate-500">
                        <span>Antippen für Formel &amp; Erklärung</span>
                        <RotateCw className="h-3.5 w-3.5 text-slate-400 group-hover:text-slate-800 transition-colors" />
                      </div>
                    </div>

                    {/* BACK SIDE */}
                    <div className="absolute inset-0 flex flex-col justify-between rounded-2xl border border-indigo-200 bg-indigo-50/40 p-5 shadow-xs rotate-y-180 backface-hidden">
                      <div className="min-w-0">
                        <div className="flex items-center justify-between">
                          <span className="rounded-md border border-indigo-200 bg-white px-2 py-0.5 text-[10px] font-bold text-indigo-800 uppercase">
                            Formel &amp; Merkhilfe
                          </span>
                          <span className="text-[10px] font-mono font-semibold text-slate-500">
                            # {card.id}
                          </span>
                        </div>

                        {card.formulaOrExample && (
                          <div className="mt-3 rounded-xl border border-indigo-200/80 bg-white p-3 text-xs text-slate-900 overflow-x-auto">
                            <MathText text={card.formulaOrExample} />
                          </div>
                        )}

                        <div className="mt-3 rounded-xl border border-slate-200 bg-white p-3">
                          <p className="text-[10px] font-bold uppercase tracking-wider text-slate-500">
                            Mentor-Tipp:
                          </p>
                          <p className="mt-1 text-xs text-slate-700 leading-relaxed">
                            <MathText text={card.contextHinglish} />
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center justify-between border-t border-indigo-200/60 pt-3 text-[11px] text-slate-500">
                        <span>Zurück zur Vorderseite</span>
                        <RotateCw className="h-3.5 w-3.5" />
                      </div>
                    </div>
                  </motion.div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
