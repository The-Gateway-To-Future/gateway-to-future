"use client";

import React, { useState } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import {
  BarChart3,
  BookOpen,
  Calculator,
  CheckCircle2,
  ChevronRight,
  GraduationCap,
  Headphones,
  Landmark,
  Layers,
  Lock,
  RotateCw,
  Stethoscope,
  Terminal,
  Zap,
} from "lucide-react";
import {
  STUDIENKOLLEG_FLASHCARDS,
  STUDIENKOLLEG_FORMULAS,
  STUDIENKOLLEG_PAST_PAPERS,
} from "@/lib/divisions-data";
import type { StudienkollegTrack } from "@/lib/types";
import type { PricingTierKey } from "@/lib/config";

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

export function StudienkollegHub({
  unlockedCourses = new Set(),
  initialTrack = "t_kurs",
  initialView = "formulas",
  onRequestAccess,
}: StudienkollegHubProps) {
  const [activeTrack, setActiveTrack] = useState<StudienkollegTrack>(initialTrack);
  const [activeView, setActiveView] = useState<StudienkollegView>(initialView);

  // Flashcards State
  const [selectedSubject, setSelectedSubject] = useState<string>("All");
  const [flippedCards, setFlippedCards] = useState<Record<string, boolean>>({});
  const [masteredCards, setMasteredCards] = useState<Record<string, boolean>>({});

  const trackMeta = {
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

  // Formula Engine State initialized to current track default formula
  const [selectedFormulaId, setSelectedFormulaId] = useState<string>(
    trackMeta[initialTrack].formulaId,
  );
  const [formulaInputs, setFormulaInputs] = useState<Record<string, number>>({});
  const [calculatedResult, setCalculatedResult] = useState<string | null>(null);

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

  const handleComputeFormula = () => {
    if (!currentFormula) return;
    if (currentFormula.id === "form-m-01") {
      const pks = formulaInputs.pKs ?? 4.76;
      const aMinus = formulaInputs.A_minus ?? 0.1;
      const ha = formulaInputs.HA ?? 0.1;
      if (ha <= 0 || aMinus <= 0) {
        setCalculatedResult("Error: Concentrations must be > 0");
        return;
      }
      const ph = pks + Math.log10(aMinus / ha);
      setCalculatedResult(
        `Calculated pH = ${ph.toFixed(2)} (Standard Buffer Condition)`,
      );
    } else if (currentFormula.id === "form-m-02") {
      const kAussen = formulaInputs.K_aussen ?? 4.5;
      const kInnen = formulaInputs.K_innen ?? 140;
      if (kAussen <= 0 || kInnen <= 0) {
        setCalculatedResult("Error: Ion concentrations must be > 0");
        return;
      }
      const eK = 61.5 * Math.log10(kAussen / kInnen);
      setCalculatedResult(`Equilibrium Potential E_K = ${eK.toFixed(1)} mV`);
    } else if (currentFormula.id === "form-t-01") {
      const m = formulaInputs.m ?? 2;
      const h = formulaInputs.h ?? 20;
      const g = 9.81;
      const ePot = m * g * h;
      const v = Math.sqrt((2 * ePot) / m);
      setCalculatedResult(
        `Potential Energy E_pot = ${ePot.toFixed(1)} J | Impact Velocity v = ${v.toFixed(2)} m/s`,
      );
    } else if (currentFormula.id === "form-t-02") {
      const f = formulaInputs.F ?? 250;
      const r = formulaInputs.r ?? 1.6;
      const alpha = formulaInputs.alpha ?? 90;
      const rad = (alpha * Math.PI) / 180;
      const torque = f * r * Math.sin(rad);
      setCalculatedResult(
        `Resulting Torque M = ${torque.toFixed(1)} N·m (Counter-torque needed: ${torque.toFixed(1)} N·m)`,
      );
    } else if (currentFormula.id === "form-w-01") {
      const p = formulaInputs.P ?? 50;
      const deltaP = formulaInputs.deltaP ?? 5;
      const q = formulaInputs.Q ?? 1000;
      const deltaQ = formulaInputs.deltaQ ?? -200;
      if (p === 0 || q === 0 || deltaP === 0) {
        setCalculatedResult("Error: P, Q, and deltaP must not be 0");
        return;
      }
      const relP = deltaP / p;
      const relQ = deltaQ / q;
      const eps = relQ / relP;
      setCalculatedResult(
        `Preiselastizität ε = ${eps.toFixed(2)} (${Math.abs(eps) > 1 ? "Preiselastisch" : "Unelastisch"})`,
      );
    } else if (currentFormula.id === "form-w-02") {
      const kFix = formulaInputs.K_fix ?? 50000;
      const p = formulaInputs.p ?? 120;
      const kVar = formulaInputs.k_var ?? 70;
      const db = p - kVar;
      if (db <= 0) {
        setCalculatedResult(
          "Error: Piece price p must be greater than unit variable costs k_var",
        );
        return;
      }
      const bep = kFix / db;
      setCalculatedResult(
        `Stückdeckungsbeitrag db = ${db.toFixed(2)} € | Break-Even Menge x_BEP = ${Math.ceil(bep)} Einheiten`,
      );
    } else if (currentFormula.id === "form-g-01") {
      setCalculatedResult(
        "FSP Quellenkritik: Formalia geprüft, Adressatenanalyse vollständig, historischer Kontext hergestellt.",
      );
    }
  };

  const showSyllabusToggle =
    initialView === "syllabus" || initialView === "past_papers";

  return (
    <div className="space-y-6 text-white">
      {/* Compact Obsidian Track & Quick-Exam Bar (No Marketing Hero) */}
      <div className="rounded-2xl border border-white/10 bg-[#0D1017] p-5 flex flex-col gap-4">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div className="space-y-1.5">
            <div className="flex flex-wrap items-center gap-2">
              <span className="inline-flex items-center gap-1.5 rounded-full border border-white/15 bg-[#121620] px-3 py-1 text-[11px] font-bold uppercase tracking-wider text-amber-300">
                {currentTrackMeta.name}
              </span>
              <span className="rounded-full border border-white/10 bg-[#07090E] px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider text-slate-400">
                Aufnahmeprüfung · FSP Standard
              </span>
            </div>
            <p className="text-xs text-slate-400 leading-relaxed">
              Target Unis:{" "}
              <strong className="text-slate-200">{currentTrackMeta.targetUnis}</strong>{" "}
              · Subjects:{" "}
              <span className="text-slate-300">{currentTrackMeta.subjects}</span>
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <Link
              href={`/exam/${activeTrack}/lesen`}
              className="inline-flex items-center gap-1.5 rounded-xl border border-white/15 bg-[#121620] px-3.5 py-2 text-xs font-bold text-slate-200 hover:border-white/35 hover:text-white transition"
            >
              <BookOpen className="h-3.5 w-3.5 text-amber-400" />
              <span>Aufnahmeprüfung</span>
            </Link>

            <Link
              href={`/exam/${activeTrack}/hoeren`}
              className="inline-flex items-center gap-1.5 rounded-xl border border-white/15 bg-[#121620] px-3.5 py-2 text-xs font-bold text-slate-200 hover:border-white/35 hover:text-white transition"
            >
              <Headphones className="h-3.5 w-3.5 text-sky-400" />
              <span>Hören Audio</span>
            </Link>

            {isTrackUnlocked ? (
              <span className="inline-flex items-center gap-1.5 rounded-xl border border-emerald-500/30 bg-emerald-500/15 px-3.5 py-2 text-xs font-bold text-emerald-300">
                <CheckCircle2 className="h-3.5 w-3.5" />
                <span>Track Unlocked</span>
              </span>
            ) : (
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
                className="inline-flex items-center gap-1.5 rounded-xl !bg-white !text-[#07090E] px-4 py-2 text-xs font-extrabold shadow hover:bg-slate-200 transition"
              >
                <Lock className="h-3.5 w-3.5" />
                <span>Unlock with GTF Pro</span>
              </button>
            )}
          </div>
        </div>

        {/* 4-Track Switcher with clean flex-wrap for mobile viewports */}
        <div className="flex flex-wrap items-center justify-between gap-3 pt-3 border-t border-white/10">
          <div className="flex flex-wrap gap-1.5 rounded-xl bg-[#07090E] p-1 border border-white/10">
            {(["t_kurs", "m_kurs", "w_kurs", "g_kurs"] as const).map((trk) => {
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
                    setCalculatedResult(null);
                  }}
                  className={`relative flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-bold transition select-none ${
                    isSelected
                      ? "!bg-white !text-[#07090E] shadow-sm"
                      : "text-slate-300 hover:bg-white/5 hover:text-white"
                  }`}
                >
                  <Icon
                    className={`h-3.5 w-3.5 ${
                      isSelected ? "text-[#07090E]" : "text-slate-400"
                    }`}
                  />
                  <span>{meta.short}</span>
                </button>
              );
            })}
          </div>

          {showSyllabusToggle && (
            <div className="flex flex-wrap gap-1.5 rounded-xl bg-[#07090E] p-1 border border-white/10">
              <button
                type="button"
                onClick={() => setActiveView("syllabus")}
                className={`inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-bold transition ${
                  activeView === "syllabus"
                    ? "!bg-white !text-[#07090E]"
                    : "text-slate-300 hover:text-white"
                }`}
              >
                <GraduationCap className="h-3.5 w-3.5" />
                <span>2-Semester Syllabus ({currentTrackMeta.semesters.length})</span>
              </button>
              <button
                type="button"
                onClick={() => setActiveView("past_papers")}
                className={`inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-bold transition ${
                  activeView === "past_papers"
                    ? "!bg-white !text-[#07090E]"
                    : "text-slate-300 hover:text-white"
                }`}
              >
                <BookOpen className="h-3.5 w-3.5" />
                <span>Past Papers ({filteredPastPapers.length})</span>
              </button>
            </div>
          )}
        </div>
      </div>

      {/* ── VIEW 1: INTERACTIVE FORMULA ENGINE ───────────────────────────────── */}
      {activeView === "formulas" && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Formula Selector Sidebar */}
          <div className="space-y-3">
            <div className="flex items-center gap-2 text-xs font-extrabold uppercase tracking-wider text-slate-400">
              <Calculator className="h-3.5 w-3.5 text-amber-400" />
              <span>Interactive Exam Formulas ({filteredFormulas.length})</span>
            </div>
            <div className="space-y-2">
              {(filteredFormulas || []).map((form) => {
                const isSelected = form.id === currentFormula.id;
                return (
                  <button
                    key={form.id}
                    type="button"
                    onClick={() => {
                      setSelectedFormulaId(form.id);
                      setCalculatedResult(null);
                      setFormulaInputs({});
                    }}
                    className={`w-full text-left rounded-2xl p-4 transition-all border ${
                      isSelected
                        ? "!bg-white !text-[#07090E] border-white shadow-md"
                        : "border-white/10 bg-[#0D1017] text-white hover:border-white/25"
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span
                        className={`text-[10px] font-extrabold uppercase tracking-wider ${
                          isSelected ? "text-slate-600" : "text-slate-400"
                        }`}
                      >
                        {form.subject}
                      </span>
                      <ChevronRight
                        className={`h-4 w-4 ${
                          isSelected ? "text-[#07090E]" : "text-slate-500"
                        }`}
                      />
                    </div>
                    <p
                      className={`mt-1 text-xs font-black ${
                        isSelected ? "text-[#07090E]" : "text-white"
                      }`}
                    >
                      {form.title}
                    </p>
                    <p
                      className={`mt-1 font-mono text-[11px] truncate ${
                        isSelected ? "text-slate-700" : "text-slate-400"
                      }`}
                    >
                      {form.latex}
                    </p>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Active Formula Calculator Console */}
          <div className="lg:col-span-2 rounded-2xl border border-white/10 bg-[#0D1017] p-6 space-y-6">
            <div>
              <div className="flex flex-wrap items-center justify-between gap-2">
                <span className="rounded-full border border-white/15 bg-[#121620] text-white px-3 py-0.5 text-xs font-extrabold">
                  {currentFormula.subject}
                </span>
                <span className="text-xs font-bold text-amber-300">
                  Studienkolleg Precision Engine
                </span>
              </div>
              <h3 className="mt-3 text-xl font-black text-white">
                {currentFormula.title}
              </h3>
              <p className="mt-1 text-xs text-slate-400">
                {currentFormula.explanationDe}
              </p>
            </div>

            {/* LaTeX Display Card */}
            <div className="rounded-2xl border border-amber-500/30 bg-[#121620] p-4 text-center font-mono text-sm md:text-base font-bold text-amber-300">
              {currentFormula.latex}
            </div>

            {/* Variables & Live Input Fields */}
            <div>
              <h4 className="text-xs font-extrabold uppercase tracking-wider text-slate-400 mb-3">
                Input Variables for Live Calculation
              </h4>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {(currentFormula?.variables || []).map((v) => {
                  const key = v.symbol.replace(/[^a-zA-Z0-9_]/g, "_");
                  return (
                    <div
                      key={v.symbol}
                      className="rounded-xl border border-white/10 bg-[#121620] p-3"
                    >
                      <div className="flex items-center justify-between mb-1.5">
                        <span className="text-xs font-black text-white">
                          Variable:{" "}
                          <span className="font-mono text-amber-300">{v.symbol}</span>
                        </span>
                        <span className="text-[10px] text-slate-400">[{v.unit}]</span>
                      </div>
                      <p className="text-[10px] text-slate-400 mb-2 truncate">
                        {v.description}
                      </p>
                      <input
                        type="number"
                        step="any"
                        placeholder={`e.g. ${currentFormula?.exampleCalculation?.inputs?.[key] ?? 1}`}
                        value={formulaInputs[key] ?? ""}
                        onChange={(e) => {
                          const val = parseFloat(e.target.value);
                          setFormulaInputs((prev) => ({
                            ...prev,
                            [key]: isNaN(val) ? 0 : val,
                          }));
                        }}
                        className="w-full rounded-lg border border-white/15 bg-[#07090E] px-3 py-1.5 text-xs font-bold text-white placeholder:text-slate-500 focus:border-white/40 focus:outline-none"
                      />
                    </div>
                  );
                })}
              </div>
            </div>

            <button
              type="button"
              onClick={handleComputeFormula}
              className="w-full rounded-xl !bg-white !text-[#07090E] py-3 text-xs font-extrabold shadow-md hover:bg-slate-200 transition flex items-center justify-center gap-2"
            >
              <Zap className="h-4 w-4 text-[#07090E]" />
              <span>Execute German Precision Calculation</span>
            </button>

            {calculatedResult && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="rounded-2xl border border-emerald-500/30 bg-emerald-500/10 p-4"
              >
                <div className="flex items-center gap-2 text-emerald-300 font-extrabold text-xs">
                  <CheckCircle2 className="h-4 w-4" />
                  <span>Verified Formula Engine Output:</span>
                </div>
                <p className="mt-1 text-sm font-black text-white font-mono">
                  {calculatedResult}
                </p>
              </motion.div>
            )}

            {/* Worked Example */}
            <div className="rounded-2xl border border-white/10 bg-[#121620] p-4 space-y-2">
              <p className="text-[11px] font-extrabold uppercase tracking-wider text-slate-400">
                Official Standard Solution Example:
              </p>
              <p className="text-xs font-black text-white">
                {currentFormula?.exampleCalculation?.result || "N/A"}
              </p>
              <div className="space-y-1 pt-1">
                {(currentFormula?.exampleCalculation?.steps || []).map((st, i) => (
                  <p key={i} className="text-[11px] text-slate-300 font-mono">
                    Step {i + 1}: {st}
                  </p>
                ))}
              </div>
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
              className="rounded-2xl border border-white/10 bg-[#0D1017] p-6 flex flex-col justify-between min-h-[220px]"
            >
              <div>
                <div className="flex items-center justify-between gap-3 mb-3">
                  <span className="flex h-8 w-8 items-center justify-center rounded-xl !bg-white !text-[#07090E] text-xs font-black">
                    {idx + 1}
                  </span>
                  <span className="text-[10px] font-extrabold uppercase tracking-wider text-slate-400">
                    Module {idx + 1}
                  </span>
                </div>
                <h3 className="text-sm font-black text-white leading-snug break-words">
                  {mod.sem}
                </h3>
                <p className="mt-2 text-xs text-slate-400 leading-relaxed">
                  {mod.desc}
                </p>
              </div>
              <div className="mt-4 pt-3 border-t border-white/10 flex items-center justify-between text-xs font-bold">
                {isTrackUnlocked ? (
                  <span className="text-emerald-400 font-bold inline-flex items-center gap-1">
                    <CheckCircle2 className="h-3.5 w-3.5" />
                    <span>Module Unlocked</span>
                  </span>
                ) : (
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
                    className="text-white hover:text-amber-300 transition inline-flex items-center gap-1.5 font-extrabold"
                  >
                    <Lock className="h-3.5 w-3.5" />
                    <span>Unlock with GTF Pro</span>
                    <ChevronRight className="h-3.5 w-3.5" />
                  </button>
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
              className="rounded-2xl border border-white/10 bg-[#0D1017] p-6 flex flex-col justify-between"
            >
              <div>
                <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
                  <span className="rounded-full border border-white/15 bg-[#121620] px-3 py-0.5 text-[10px] font-extrabold text-slate-200">
                    {paper.city} · {paper.year}
                  </span>
                  <span className="text-[11px] font-bold text-amber-300">
                    {paper.durationMinutes} Min · {paper.totalPoints} Pkt
                  </span>
                </div>

                <h3 className="text-base font-black text-white german-headline leading-snug">
                  {paper.university}
                </h3>
                <p className="mt-1 text-xs font-bold text-sky-400">
                  {paper.subject}
                </p>
                <p className="mt-2 text-xs text-slate-400 leading-relaxed german-reading">
                  {paper.overview}
                </p>

                <div className="mt-4 rounded-xl bg-[#121620] p-3.5 space-y-1.5 border border-white/10">
                  <p className="text-[10px] font-extrabold uppercase tracking-wider text-slate-400">
                    Tested Topics &amp; Standard:
                  </p>
                  {(Array.isArray(paper.keyTopics) ? paper.keyTopics : []).map((top, idx) => (
                    <p
                      key={idx}
                      className="text-[11px] text-slate-200 flex items-center gap-2 german-reading"
                    >
                      <span className="h-1.5 w-1.5 rounded-full bg-white shrink-0" />
                      <span>{top}</span>
                    </p>
                  ))}
                </div>
              </div>

              <div className="mt-6 pt-4 border-t border-white/10 flex flex-wrap items-center justify-between gap-2">
                <Link
                  href={`/exam/${activeTrack}/lesen`}
                  className="inline-flex items-center gap-1.5 rounded-xl border border-white/15 bg-[#121620] px-3.5 py-2 text-xs font-bold text-slate-200 hover:border-white/35 hover:text-white transition"
                >
                  <BookOpen className="h-3.5 w-3.5" />
                  <span>Take Simulation</span>
                </Link>

                {isTrackUnlocked ? (
                  <Link
                    href={`/exam/${activeTrack}/lesen`}
                    className="inline-flex items-center gap-1.5 rounded-xl bg-emerald-500/15 border border-emerald-500/30 px-3.5 py-2 text-xs font-bold text-emerald-300 hover:bg-emerald-500/25 transition"
                  >
                    <CheckCircle2 className="h-3.5 w-3.5" />
                    <span>Solutions Unlocked</span>
                  </Link>
                ) : (
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
                    className="inline-flex items-center gap-1.5 rounded-xl !bg-white !text-[#07090E] px-3.5 py-2 text-xs font-extrabold hover:bg-slate-200 transition"
                  >
                    <Lock className="h-3.5 w-3.5" />
                    <span>Unlock with GTF Pro</span>
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* ── VIEW 4: ACADEMIC FLASHCARDS ──────────────────────────────────────── */}
      {activeView === "flashcards" && (
        <div className="space-y-5">
          <div className="flex flex-wrap items-center gap-2">
            <span className="inline-flex items-center gap-1.5 text-xs font-bold text-slate-400 mr-1">
              <Layers className="h-3.5 w-3.5" /> Subject Filter:
            </span>
            <button
              type="button"
              onClick={() => setSelectedSubject("All")}
              className={`rounded-xl px-3 py-1.5 text-xs font-bold transition ${
                selectedSubject === "All"
                  ? "!bg-white !text-[#07090E]"
                  : "border border-white/10 bg-[#0D1017] text-slate-300 hover:text-white"
              }`}
            >
              All ({STUDIENKOLLEG_FLASHCARDS.filter((c) => c.track === activeTrack).length})
            </button>
            {(availableSubjects || []).map((sub) => (
              <button
                key={sub}
                type="button"
                onClick={() => setSelectedSubject(sub)}
                className={`rounded-xl px-3 py-1.5 text-xs font-bold transition ${
                  selectedSubject === sub
                    ? "!bg-white !text-[#07090E]"
                    : "border border-white/10 bg-[#0D1017] text-slate-300 hover:text-white"
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
                  className="group relative h-72 cursor-pointer perspective-1000 select-none"
                >
                  <motion.div
                    animate={{ rotateY: isFlipped ? 180 : 0 }}
                    transition={{ duration: 0.5, ease: "easeInOut" }}
                    className="relative h-full w-full rounded-2xl preserve-3d transition-shadow"
                  >
                    {/* FRONT SIDE */}
                    <div className="absolute inset-0 flex flex-col justify-between rounded-2xl border border-white/10 bg-[#0D1017] p-5 backface-hidden">
                      <div>
                        <div className="flex items-center justify-between">
                          <span className="rounded-md border border-white/10 bg-[#121620] px-2 py-0.5 text-[10px] font-bold text-slate-300 uppercase">
                            {card.subject}
                          </span>
                          <button
                            type="button"
                            onClick={(e) => toggleMastery(card.id, e)}
                            className={`rounded-full p-1 transition ${
                              isMastered
                                ? "text-emerald-400 bg-emerald-500/15"
                                : "text-slate-500 hover:text-white"
                            }`}
                            title={isMastered ? "Mastered" : "Mark as Mastered"}
                          >
                            <CheckCircle2 className="h-5 w-5" />
                          </button>
                        </div>

                        <div className="mt-4">
                          <p className="text-[11px] font-bold text-amber-400">
                            {card.category}
                          </p>
                          <h3 className="mt-1 text-lg font-black text-white">
                            {card.termDe}
                          </h3>
                          {card.pronunciationDe && (
                            <p className="text-[11px] text-slate-400 font-mono mt-0.5">
                              {card.pronunciationDe}
                            </p>
                          )}
                        </div>

                        <p className="mt-3 text-xs text-slate-300 line-clamp-3 leading-relaxed">
                          {card.definitionDe}
                        </p>
                      </div>

                      <div className="flex items-center justify-between border-t border-white/10 pt-3 text-[11px] text-slate-400">
                        <span>Tap to flip definition &amp; formula</span>
                        <RotateCw className="h-3.5 w-3.5 text-slate-400 group-hover:text-white transition-colors" />
                      </div>
                    </div>

                    {/* BACK SIDE */}
                    <div className="absolute inset-0 flex flex-col justify-between rounded-2xl border border-amber-500/30 bg-[#121620] p-5 rotate-y-180 backface-hidden">
                      <div>
                        <div className="flex items-center justify-between">
                          <span className="rounded-md border border-amber-500/30 bg-amber-500/15 px-2 py-0.5 text-[10px] font-black text-amber-300 uppercase">
                            Hinglish Key &amp; Formula
                          </span>
                          <span className="text-[10px] font-mono font-bold text-slate-400">
                            # {card.id}
                          </span>
                        </div>

                        {card.formulaOrExample && (
                          <div className="mt-3 rounded-xl border border-white/10 bg-[#07090E] p-2.5 font-mono text-xs font-bold text-amber-300">
                            {card.formulaOrExample}
                          </div>
                        )}

                        <div className="mt-3 rounded-xl border border-white/10 bg-[#07090E] p-2.5">
                          <p className="text-[10px] font-extrabold uppercase tracking-wider text-slate-400">
                            Mentor Tip (Hinglish):
                          </p>
                          <p className="mt-1 text-xs font-medium text-slate-200 leading-relaxed">
                            {card.contextHinglish}
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center justify-between border-t border-white/10 pt-3 text-[11px] text-slate-400">
                        <span>Tap to flip back</span>
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
