"use client";

import React, { useState } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import {
  Activity,
  BookOpen,
  Briefcase,
  CheckCircle2,
  ChevronRight,
  ClipboardList,
  Headphones,
  HeartPulse,
  Hospital,
  Lock,
  Users,
} from "lucide-react";
import { CLINICAL_MODULES } from "@/lib/divisions-data";
import type { PricingTierKey } from "@/lib/config";
import { useIsNativeApp } from "@/lib/use-native-platform";

export type FachspracheView =
  | "isbar_trainer"
  | "dialogue"
  | "redemittel"
  | "ausbildung";

interface FachspracheMedizinHubProps {
  unlockedCourses?: Set<string>;
  initialView?: FachspracheView;
  onRequestAccess: (
    slug: string,
    title: string,
    track: string,
    defaultTier?: PricingTierKey,
  ) => void;
}

export function FachspracheMedizinHub({
  unlockedCourses = new Set(),
  initialView = "isbar_trainer",
  onRequestAccess,
}: FachspracheMedizinHubProps) {
  const { isNative, ready: nativeReady } = useIsNativeApp();
  const isFreeLaunch = process.env.NEXT_PUBLIC_FREE_LAUNCH_MODE === "true";
  const isUnlocked =
    isFreeLaunch ||
    unlockedCourses.has("fachsprache-pflege-ausbildung-suite") ||
    unlockedCourses.has("gtf-all-access-pass");

  const [selectedModuleId, setSelectedModuleId] = useState<string>("fsp-case-01-khk");
  const [activeView, setActiveView] = useState<FachspracheView>(initialView);

  // ISBAR Interactive Student Handover Form
  const [isbarStudent, setIsbarStudent] = useState({
    identification: "",
    situation: "",
    background: "",
    assessment: "",
    recommendation: "",
  });
  const [isbarSubmitted, setIsbarSubmitted] = useState(false);

  const currentModule =
    CLINICAL_MODULES.find((m) => m.id === selectedModuleId) || CLINICAL_MODULES[0];

  const handleSubmitIsbar = (e: React.FormEvent) => {
    e.preventDefault();
    setIsbarSubmitted(true);
  };

  const loadCaseSample = () => {
    setIsbarStudent({
      identification: currentModule.sampleHandover.identification,
      situation: currentModule.sampleHandover.situation,
      background: currentModule.sampleHandover.background,
      assessment: currentModule.sampleHandover.assessment,
      recommendation: currentModule.sampleHandover.recommendation,
    });
    setIsbarSubmitted(true);
  };

  const showDialogueToggle =
    initialView === "dialogue" || initialView === "redemittel";

  return (
    <div className="space-y-6 text-white">
      {/* Compact Clinical Top Bar (Obsidian Native, No Marketing Clutter) */}
      <div className="rounded-2xl border border-white/10 bg-[#0D1017] p-5 flex flex-col gap-4">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="flex flex-wrap items-center gap-2">
              <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-500/30 bg-emerald-500/15 px-3 py-1 text-[11px] font-bold text-emerald-300">
                <Hospital className="h-3.5 w-3.5" />
                <span>Clinical German &amp; FSP Pflege</span>
              </span>
              <span className="rounded-full border border-white/10 bg-slate-900 px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider text-zinc-400">
                German Hospital Standard
              </span>
            </div>
            <p className="text-xs text-zinc-400 max-w-2xl leading-relaxed">
              Fachsprachenprüfung Pflege, clinical anamnesis, ISBAR shift handover protocols &amp; § 81a hospital readiness.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2 shrink-0">
            <Link
              href="/exam/ausbildung_pflege/lesen"
              className="inline-flex items-center gap-1.5 rounded-xl border border-white/15 bg-white/[0.04] px-3.5 py-2 text-xs font-semibold text-zinc-200 hover:border-white/35 hover:text-white transition"
            >
              <BookOpen className="h-3.5 w-3.5 text-emerald-400" />
              <span>Practice Exam</span>
            </Link>

            <Link
              href="/exam/ausbildung_pflege/hoeren"
              className="inline-flex items-center gap-1.5 rounded-xl border border-white/15 bg-white/[0.04] px-3.5 py-2 text-xs font-semibold text-zinc-200 hover:border-white/35 hover:text-white transition"
            >
              <Headphones className="h-3.5 w-3.5 text-sky-400" />
              <span>Hören Audio</span>
            </Link>

            {isUnlocked ? (
              <span className="inline-flex items-center gap-1.5 rounded-xl border border-emerald-500/30 bg-emerald-500/15 px-3.5 py-2 text-xs font-bold text-emerald-300">
                <CheckCircle2 className="h-3.5 w-3.5" />
                <span>Clinical Suite Unlocked</span>
              </span>
            ) : nativeReady && !isNative ? (
              <button
                type="button"
                onClick={() =>
                  onRequestAccess(
                    "fachsprache-pflege-ausbildung-suite",
                    "Fachsprache Pflege & Dual Ausbildung Suite",
                    "Division 3: Fachsprache Pflege & Medizin",
                    "all_access_pass",
                  )
                }
                className="inline-flex items-center gap-1.5 rounded-xl !bg-white !text-[#07090E] px-4 py-2 text-xs font-extrabold shadow hover:opacity-90 transition"
              >
                <Lock className="h-3.5 w-3.5" />
                <span>Unlock with GTF Pro</span>
              </button>
            ) : (
              <span className="inline-flex items-center gap-1.5 rounded-xl border border-white/15 bg-white/10 px-3.5 py-2 text-xs font-semibold text-slate-200">
                <Lock className="h-3.5 w-3.5" />
                <span>Enrolled Students Only</span>
              </span>
            )}
          </div>
        </div>

        {/* Case Studies Selector */}
        <div className="flex flex-wrap items-center justify-between gap-3 pt-3 border-t border-white/10">
          <div className="flex flex-wrap gap-2">
            {(CLINICAL_MODULES || []).map((mod) => {
              const isSelected = mod.id === currentModule.id;
              return (
                <button
                  key={mod.id}
                  type="button"
                  onClick={() => {
                    setSelectedModuleId(mod.id);
                    setIsbarSubmitted(false);
                    setIsbarStudent({
                      identification: "",
                      situation: "",
                      background: "",
                      assessment: "",
                      recommendation: "",
                    });
                  }}
                  className={`flex items-center gap-2 rounded-xl px-3.5 py-2 text-xs font-bold transition-all border ${
                    isSelected
                      ? "!bg-white !text-[#07090E] border-white shadow-sm"
                      : "border-white/10 bg-[#121620] text-slate-300 hover:border-white/25 hover:text-white"
                  }`}
                >
                  <Activity
                    className={`h-3.5 w-3.5 ${
                      isSelected ? "text-[#07090E]" : "text-emerald-400"
                    }`}
                  />
                  <span>
                    {mod.title.split(":")[0]} ({mod.patientName})
                  </span>
                </button>
              );
            })}
          </div>

          {showDialogueToggle && (
            <div className="flex flex-wrap gap-1.5 rounded-xl bg-slate-900 p-1 border border-white/10">
              <button
                type="button"
                onClick={() => setActiveView("dialogue")}
                className={`inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-bold transition ${
                  activeView === "dialogue"
                    ? "!bg-white !text-[#07090E]"
                    : "text-slate-300 hover:text-white"
                }`}
              >
                <Users className="h-3.5 w-3.5" />
                <span>Ward Dialogues ({currentModule.dialogueScript.length})</span>
              </button>
              <button
                type="button"
                onClick={() => setActiveView("redemittel")}
                className={`inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-bold transition ${
                  activeView === "redemittel"
                    ? "!bg-white !text-[#07090E]"
                    : "text-slate-300 hover:text-white"
                }`}
              >
                <BookOpen className="h-3.5 w-3.5" />
                <span>Redemittel ({currentModule.redemittel.length})</span>
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Active Clinical Case Overview Card */}
      {activeView !== "ausbildung" && (
        <div className="rounded-2xl border border-white/10 bg-[#0D1017] p-6 space-y-6">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-white/10">
            <div>
              <span className="rounded-full border border-emerald-500/30 bg-emerald-500/15 px-3 py-0.5 text-[10px] font-black text-emerald-300 uppercase">
                Clinical Case File # {currentModule.id}
              </span>
              <h3 className="mt-2 text-xl font-black text-white">
                {currentModule.title}
              </h3>
              <p className="mt-1 text-xs font-bold text-rose-400 flex items-center gap-1.5">
                <HeartPulse className="h-3.5 w-3.5" />
                <span>Leitsymptom: {currentModule.chiefComplaint}</span>
              </p>
            </div>

            <div className="rounded-xl border border-white/10 bg-[#121620] p-3.5 min-w-[220px] text-xs">
              <p className="font-extrabold text-white">
                {currentModule.patientName}, {currentModule.patientAge} Jahre
              </p>
              <p className="text-[11px] text-slate-400 mt-0.5">
                Diagnose: {currentModule.diagnosis}
              </p>
              <div className="grid grid-cols-2 gap-1.5 mt-2 font-mono text-[10px] text-slate-300 pt-2 border-t border-white/10">
                <span>RR: {currentModule.vitalSigns.bloodPressure}</span>
                <span>HF: {currentModule.vitalSigns.heartRate}</span>
                <span>SpO2: {currentModule.vitalSigns.spo2}</span>
                <span>Temp: {currentModule.vitalSigns.temperature}</span>
              </div>
            </div>
          </div>

          {/* ── VIEW 1: ISBAR HANDOVER TRAINER ──────────────────────────────── */}
          {activeView === "isbar_trainer" && (
            <div className="space-y-5">
              <div className="rounded-2xl border border-amber-500/30 bg-amber-500/10 p-4 flex flex-wrap items-center justify-between gap-3">
                <div>
                  <p className="text-xs font-extrabold text-white flex items-center gap-1.5">
                    <ClipboardList className="h-4 w-4 text-amber-300" />
                    <span>Standardized Hospital Handover Protocol (ISBAR)</span>
                  </p>
                  <p className="text-[11px] text-amber-200/90 mt-0.5">
                    Identification • Situation • Background • Assessment • Recommendation
                  </p>
                </div>
                <button
                  type="button"
                  onClick={loadCaseSample}
                  className="shrink-0 rounded-xl !bg-white !text-[#07090E] px-3.5 py-2 text-xs font-extrabold shadow hover:bg-slate-200 transition"
                >
                  Load Model Solution
                </button>
              </div>

              <form onSubmit={handleSubmitIsbar} className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="rounded-2xl border border-white/10 bg-[#121620] p-4">
                    <label className="block text-xs font-black text-white mb-1">
                      [I] Identification (Patient &amp; Station)
                    </label>
                    <p className="text-[10px] text-slate-400 mb-2">
                      Name, Alter, Bett, zuständiges Team, Aufnahmedatum.
                    </p>
                    <textarea
                      rows={2}
                      value={isbarStudent.identification}
                      onChange={(e) =>
                        setIsbarStudent({
                          ...isbarStudent,
                          identification: e.target.value,
                        })
                      }
                      placeholder="z.B. Herr Walter Becker, 62 Jahre, Notaufnahme Vivantes..."
                      className="w-full rounded-xl border border-white/15 bg-slate-900 p-2.5 text-xs font-semibold text-white placeholder:text-slate-500 focus:border-white/40 focus:outline-none"
                    />
                  </div>

                  <div className="rounded-2xl border border-white/10 bg-[#121620] p-4">
                    <label className="block text-xs font-black text-white mb-1">
                      [S] Situation (Akutes Ereignis &amp; Leitsymptom)
                    </label>
                    <p className="text-[10px] text-slate-400 mb-2">
                      Was ist der Grund für den aktuellen Alarm / die Übergabe?
                    </p>
                    <textarea
                      rows={2}
                      value={isbarStudent.situation}
                      onChange={(e) =>
                        setIsbarStudent({
                          ...isbarStudent,
                          situation: e.target.value,
                        })
                      }
                      placeholder="z.B. Retrosternaler Druckschmerz seit 45 Minuten..."
                      className="w-full rounded-xl border border-white/15 bg-slate-900 p-2.5 text-xs font-semibold text-white placeholder:text-slate-500 focus:border-white/40 focus:outline-none"
                    />
                  </div>

                  <div className="rounded-2xl border border-white/10 bg-[#121620] p-4">
                    <label className="block text-xs font-black text-white mb-1">
                      [B] Background (Vorerkrankungen, Medikation, Allergien)
                    </label>
                    <p className="text-[10px] text-slate-400 mb-2">
                      Kardiovaskuläre Risikofaktoren, Dauermedikation, Relevantes.
                    </p>
                    <textarea
                      rows={2}
                      value={isbarStudent.background}
                      onChange={(e) =>
                        setIsbarStudent({
                          ...isbarStudent,
                          background: e.target.value,
                        })
                      }
                      placeholder="z.B. Arterielle Hypertonie unter Ramipril, Nikotinabusus..."
                      className="w-full rounded-xl border border-white/15 bg-slate-900 p-2.5 text-xs font-semibold text-white placeholder:text-slate-500 focus:border-white/40 focus:outline-none"
                    />
                  </div>

                  <div className="rounded-2xl border border-white/10 bg-[#121620] p-4">
                    <label className="block text-xs font-black text-white mb-1">
                      [A] Assessment (Vitalwerte, EKG, Befunde)
                    </label>
                    <p className="text-[10px] text-slate-400 mb-2">
                      Aktueller klinischer Zustand, EKG-Veränderungen, Labortests.
                    </p>
                    <textarea
                      rows={2}
                      value={isbarStudent.assessment}
                      onChange={(e) =>
                        setIsbarStudent({
                          ...isbarStudent,
                          assessment: e.target.value,
                        })
                      }
                      placeholder="z.B. ST-Hebungen in V1-V4, RR 165/95, Troponin positiv..."
                      className="w-full rounded-xl border border-white/15 bg-slate-900 p-2.5 text-xs font-semibold text-white placeholder:text-slate-500 focus:border-white/40 focus:outline-none"
                    />
                  </div>
                </div>

                <div className="rounded-2xl border border-white/10 bg-[#121620] p-4">
                  <label className="block text-xs font-black text-white mb-1">
                    [R] Recommendation (Dringliche Maßnahmen &amp; Weiteres Prozedere)
                  </label>
                  <p className="text-[10px] text-slate-400 mb-2">
                    Was muss sofort getan werden? Verlegung ins Herzkatheterlabor, Akutmedikation.
                  </p>
                  <textarea
                    rows={2}
                    value={isbarStudent.recommendation}
                    onChange={(e) =>
                      setIsbarStudent({
                        ...isbarStudent,
                        recommendation: e.target.value,
                      })
                    }
                    placeholder="z.B. Sofortige PCI im Herzkatheterlabor, ASS 250mg i.v., Heparin..."
                    className="w-full rounded-xl border border-white/15 bg-slate-900 p-2.5 text-xs font-semibold text-white placeholder:text-slate-500 focus:border-white/40 focus:outline-none"
                  />
                </div>

                <button
                  type="submit"
                  className="w-full rounded-xl !bg-white !text-[#07090E] py-3 text-xs font-extrabold shadow-md hover:bg-slate-200 transition"
                >
                  Validate Handover Against German Medical Standard
                </button>
              </form>

              {isbarSubmitted && (
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="rounded-2xl border border-emerald-500/30 bg-emerald-500/10 p-6 space-y-4"
                >
                  <div className="flex items-center gap-2 text-emerald-300 font-black text-sm">
                    <CheckCircle2 className="h-5 w-5" />
                    <span>
                      Official Hospital Model Handover (Charité / Vivantes Benchmark):
                    </span>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
                    <div className="rounded-xl bg-[#0D1017] p-3.5 border border-white/10">
                      <p className="font-extrabold text-emerald-300 mb-1">
                        [I] Identification:
                      </p>
                      <p className="text-slate-200">
                        {currentModule.sampleHandover.identification}
                      </p>
                    </div>

                    <div className="rounded-xl bg-[#0D1017] p-3.5 border border-white/10">
                      <p className="font-extrabold text-emerald-300 mb-1">
                        [S] Situation:
                      </p>
                      <p className="text-slate-200">
                        {currentModule.sampleHandover.situation}
                      </p>
                    </div>

                    <div className="rounded-xl bg-[#0D1017] p-3.5 border border-white/10">
                      <p className="font-extrabold text-emerald-300 mb-1">
                        [B] Background:
                      </p>
                      <p className="text-slate-200">
                        {currentModule.sampleHandover.background}
                      </p>
                    </div>

                    <div className="rounded-xl bg-[#0D1017] p-3.5 border border-white/10">
                      <p className="font-extrabold text-emerald-300 mb-1">
                        [A] Assessment:
                      </p>
                      <p className="text-slate-200">
                        {currentModule.sampleHandover.assessment}
                      </p>
                    </div>
                  </div>

                  <div className="rounded-xl bg-[#0D1017] p-3.5 border border-white/10 text-xs">
                    <p className="font-extrabold text-emerald-300 mb-1">
                      [R] Recommendation:
                    </p>
                    <p className="text-slate-200">
                      {currentModule.sampleHandover.recommendation}
                    </p>
                  </div>
                </motion.div>
              )}
            </div>
          )}

          {/* ── VIEW 2: CLINICAL WARD DIALOGUES ─────────────────────────────── */}
          {activeView === "dialogue" && (
            <div className="space-y-3">
              {(Array.isArray(currentModule?.dialogueScript) ? currentModule.dialogueScript : []).map((turn, idx) => {
                const isDoctor = turn.role === "Arzt";
                const isNurse = turn.role === "Pflegekraft";

                return (
                  <div
                    key={idx}
                    className={`rounded-2xl p-4 border transition-all ${
                      isDoctor
                        ? "border-sky-500/30 bg-sky-500/10 mr-2 sm:mr-10"
                        : isNurse
                          ? "border-emerald-500/30 bg-emerald-500/10 mr-2 sm:mr-10"
                          : "border-white/10 bg-[#121620] ml-2 sm:ml-10"
                    }`}
                  >
                    <div className="flex items-center justify-between mb-1.5">
                      <span
                        className={`text-[10px] font-extrabold uppercase tracking-wider px-2 py-0.5 rounded-md ${
                          isDoctor
                            ? "bg-sky-500/20 text-sky-300"
                            : isNurse
                              ? "bg-emerald-500/20 text-emerald-300"
                              : "bg-white/10 text-slate-200"
                        }`}
                      >
                        {turn.speaker} ({turn.role})
                      </span>
                      <span className="text-[10px] text-slate-400 font-mono">
                        Turn {idx + 1}
                      </span>
                    </div>
                    <p className="text-xs sm:text-sm font-medium text-white leading-relaxed german-reading">
                      {turn.german}
                    </p>
                    {turn.hinglishNote && (
                      <p className="mt-2 text-[11px] font-medium text-amber-200 bg-amber-500/10 rounded-lg p-2.5 border border-amber-500/25">
                        <span className="font-bold uppercase tracking-wider text-amber-300">
                          MENTOR NOTE ·{" "}
                        </span>
                        {turn.hinglishNote}
                      </p>
                    )}
                  </div>
                );
              })}
            </div>
          )}

          {/* ── VIEW 3: CLINICAL REDEMITTEL & PHRASES ───────────────────────── */}
          {activeView === "redemittel" && (
            <div className="space-y-3">
              <p className="text-xs font-semibold text-slate-400">
                Essential German medical phrases for clinical anamnesis and physician licensing exams (FSP):
              </p>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {(Array.isArray(currentModule?.redemittel) ? currentModule.redemittel : []).map((phrase, idx) => (
                  <div
                    key={idx}
                    className="rounded-2xl border border-white/10 bg-[#121620] p-4 hover:border-white/25 transition-colors"
                  >
                    <div className="flex items-start gap-2.5">
                      <div className="flex h-6 w-6 items-center justify-center rounded-lg !bg-white !text-[#07090E] text-[10px] font-black shrink-0 mt-0.5">
                        {idx + 1}
                      </div>
                      <div>
                        <p className="text-xs font-bold text-white leading-relaxed">
                          {phrase}
                        </p>
                        <p className="text-[10px] text-slate-400 mt-1">
                          Medical Register · Höfliche Anrede (Sie-Form)
                        </p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* ── VIEW 4: DUAL AUSBILDUNG TRACKS ─────────────────────────────────── */}
      {activeView === "ausbildung" && (
        <div className="space-y-4">
          <div className="rounded-2xl border border-emerald-500/30 bg-emerald-500/10 p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
            <div>
              <h4 className="text-sm font-black text-white flex items-center gap-2">
                <Briefcase className="h-4 w-4 text-emerald-400" />
                <span>
                  Direct Dual Vocational Training in Germany (€1,000 – €1,400/month stipend)
                </span>
              </h4>
              <p className="text-xs text-slate-300 mt-0.5">
                Full employer contract integration with German partner hospitals, nursing homes, and industrial corporations.
              </p>
            </div>
            <span className="rounded-xl border border-emerald-500/30 bg-emerald-500/20 text-emerald-300 px-3 py-1 text-xs font-extrabold shrink-0">
              Employer Verified Path
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5 items-stretch">
            {[
              { title: "Pflegefachmann / Pflegefachfrau", sector: "Healthcare", stipend: "€1.190 – €1.350 / Mt.", level: "B2 Pflege" },
              { title: "Fachinformatiker/in (Anwendungsentwicklung)", sector: "IT & Tech", stipend: "€1.050 – €1.200 / Mt.", level: "B2 Allgemein" },
              { title: "Fachinformatiker/in (Systemintegration)", sector: "IT Cloud/Network", stipend: "€1.050 – €1.200 / Mt.", level: "B2 Allgemein" },
              { title: "Kfz-Mechatroniker/in (Elektromobilität)", sector: "Automotive & MINT", stipend: "€950 – €1.150 / Mt.", level: "B1/B2" },
              { title: "Elektroniker/in für Energie- & Gebäudetechnik", sector: "Electrical Engineering", stipend: "€980 – €1.180 / Mt.", level: "B1/B2" },
              { title: "Mechatroniker/in für Automatisierung", sector: "Industry 4.0", stipend: "€1.020 – €1.220 / Mt.", level: "B2" },
              { title: "Kaufmann / Kauffrau für Büromanagement", sector: "Business Administration", stipend: "€950 – €1.100 / Mt.", level: "B2" },
              { title: "Industriekaufmann / Industriekauffrau", sector: "Corporate Supply Chain", stipend: "€1.000 – €1.180 / Mt.", level: "B2" },
              { title: "Hotelfachmann / Hotelfachfrau", sector: "Hospitality Berlin", stipend: "€950 – €1.100 / Mt.", level: "B1/B2" },
              { title: "Zahnmedizinische/r Fachangestellte/r (ZFA)", sector: "Dental Clinics", stipend: "€950 – €1.100 / Mt.", level: "B2" },
              { title: "Medizinische/r Fachangestellte/r (MFA)", sector: "Medical Practice", stipend: "€950 – €1.100 / Mt.", level: "B2" },
              { title: "GTF Bewerbungs-Masterclass (DIN 5008)", sector: "Career Preparation", stipend: "German Standard CV/Cover Letter", level: "A2–B2" },
            ].map((trk, idx) => (
              <div
                key={idx}
                className="rounded-2xl border border-white/10 bg-[#0D1017] p-5 flex flex-col justify-between min-h-[190px]"
              >
                <div className="flex-1 flex flex-col">
                  <div className="flex items-center justify-between gap-3 mb-3">
                    <span className="rounded-md border border-emerald-500/30 bg-emerald-500/15 text-emerald-300 px-2.5 py-0.5 text-[10px] font-bold">
                      {trk.sector}
                    </span>
                    <span className="text-[10px] font-bold text-slate-400">
                      {trk.level}
                    </span>
                  </div>
                  <h5 className="text-sm font-black text-white leading-snug">
                    {trk.title}
                  </h5>
                  <p className="mt-2 text-xs text-emerald-400 font-bold flex-1">
                    {trk.stipend}
                  </p>
                </div>
                <div className="mt-4 pt-3 border-t border-white/10 flex items-center justify-between">
                  <span className="text-[11px] text-slate-400">
                    Employer Verified
                  </span>
                  {isUnlocked ? (
                    <Link
                      href="/exam/ausbildung_pflege/lesen"
                      className="inline-flex items-center gap-1 text-xs font-bold text-emerald-400 hover:text-emerald-300 transition"
                    >
                      <span>Start Module</span>
                      <ChevronRight className="h-3.5 w-3.5" />
                    </Link>
                  ) : nativeReady && !isNative ? (
                    <button
                      type="button"
                      onClick={() =>
                        onRequestAccess(
                          `ausbildung-track-${idx + 1}`,
                          trk.title,
                          "Fachsprache Pflege & Dual Ausbildung",
                          "all_access_pass",
                        )
                      }
                      className="inline-flex items-center gap-1 text-xs font-bold text-white hover:text-amber-300 transition"
                    >
                      <Lock className="h-3 w-3" />
                      <span>Unlock with GTF Pro</span>
                      <ChevronRight className="h-3.5 w-3.5" />
                    </button>
                  ) : (
                    <span className="inline-flex items-center gap-1 text-xs font-semibold text-slate-300">
                      <Lock className="h-3 w-3" />
                      <span>Enrolled Access</span>
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
