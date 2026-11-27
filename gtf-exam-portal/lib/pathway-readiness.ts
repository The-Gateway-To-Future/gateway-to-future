/**
 * Gateway To Future (GTF) — Unified Germany Pathway Readiness Score (0–100)
 * & Statutory Regulatory / Sperrkonto Action Engine
 *
 * Connects verified GTF Academy CEFR steps, Modelltest exam performance,
 * Mistake-DNA linguistic precision, and cloud-synced regulatory milestones
 * (§ 16b Studienkolleg/Uni, § 16a Dual Ausbildung, § 16d/§ 81a Pflege & Medizin)
 * into a single transparent 0–100 Readiness Engine.
 */

import type { StoredExamState } from "@/lib/client-storage";
import type { MistakeRadarSummary } from "@/lib/mistake-dna/store";

export type PathwayTrackId =
  | "studienkolleg_uni"
  | "ausbildung_dual"
  | "pflege_medizin";

export const PATHWAY_TRACK_STEP_MARKERS: Record<PathwayTrackId, string> = {
  studienkolleg_uni: "PATHWAY_TRACK_STUDIENKOLLEG_UNI",
  ausbildung_dual: "PATHWAY_TRACK_AUSBILDUNG_DUAL",
  pflege_medizin: "PATHWAY_TRACK_PFLEGE_MEDIZIN",
};

export interface PathwayMilestoneItem {
  id: string;
  /** Stored inside `user_progress.completedSteps` so it cloud-syncs under strict Firestore rules. */
  stepId: string;
  title: string;
  subtitle: string;
  authority: string;
  divisionCode: string;
  actionHref?: string;
  actionLabel?: string;
}

export interface PathwayTrackDefinition {
  id: PathwayTrackId;
  shortLabel: string;
  title: string;
  legalBasis: string;
  targetCefr: "B1" | "B2";
  summary: string;
  /** Monthly statutory coverage benchmark in EUR (2026 German federal standard). */
  monthlyBenchmarkEur: number;
  milestones: PathwayMilestoneItem[];
}

export const PATHWAY_TRACKS: Record<PathwayTrackId, PathwayTrackDefinition> = {
  studienkolleg_uni: {
    id: "studienkolleg_uni",
    shortLabel: "Studienkolleg & Uni (§ 16b)",
    title: "Public University & Studienkolleg Pathway",
    legalBasis: "§ 16b AufenthG · APS India & anabin",
    targetCefr: "B2",
    summary:
      "Direct admission route for Indian 12th-pass & degree students targeting TU Berlin, LMU, KIT, and state Studienkollegs (M/T/W/G-Kurs).",
    monthlyBenchmarkEur: 992, // €11,904 / year statutory student Sperrkonto
    milestones: [
      {
        id: "passport",
        stepId: "AUSBILDUNG_OS_DOC_PASSPORT",
        title: "Valid International Passport",
        subtitle: "At least 18 months remaining validity for visa & city registration.",
        authority: "Passport Seva / Embassy",
        divisionCode: "DIV-02",
      },
      {
        id: "school_anabin",
        stepId: "AUSBILDUNG_OS_DOC_SCHOOL_10_12",
        title: "Class 10th & 12th + anabin Verification",
        subtitle: "CBSE/ISC/State board marksheets checked against KMK anabin database.",
        authority: "anabin.kmk.org",
        divisionCode: "DIV-04",
      },
      {
        id: "aps_india",
        stepId: "PATHWAY_DOC_APS_INDIA",
        title: "APS India Verification Certificate",
        subtitle: "Mandatory Academic Evaluation Centre digital certificate for Indian applicants.",
        authority: "aps-india.de",
        divisionCode: "DIV-02",
      },
      {
        id: "goethe_telc_b1_b2",
        stepId: "AUSBILDUNG_OS_DOC_LANGUAGE_B1_B2",
        title: "Goethe / telc B1–B2 Language Certificate",
        subtitle: "Certified B1/B2 German required for Studienkolleg Einladung zur Aufnahmeprüfung.",
        authority: "Goethe / telc / TestDaF",
        divisionCode: "DIV-01",
        actionHref: "/exam/b1/lesen",
        actionLabel: "Take B1 Proctor Exam",
      },
      {
        id: "stk_ctest_math",
        stepId: "PATHWAY_DOC_STK_AUFNAHME_PREP",
        title: "Aufnahmeprüfung C-Test & Ohne-Taschenrechner Prep",
        subtitle: "60%+ score in authentic university C-Test and non-calculator math sprint.",
        authority: "TU Berlin / LMU / KIT Standard",
        divisionCode: "DIV-04",
        actionHref: "/studienkolleg",
        actionLabel: "Open C-Test & Math Lab",
      },
      {
        id: "uni_assist_vpd",
        stepId: "PATHWAY_DOC_UNI_ASSIST",
        title: "uni-assist VPD / Conditional Zulassung",
        subtitle: "Vorprüfungsdokumentation (VPD) and Studienkolleg entrance invitation.",
        authority: "uni-assist.de",
        divisionCode: "DIV-04",
      },
      {
        id: "sperrkonto_11904",
        stepId: "PATHWAY_DOC_SPERRKONTO",
        title: "Statutory Sperrkonto (€11,904 / Year)",
        subtitle: "Blocked account confirmation showing €992/month × 12 months coverage.",
        authority: "Auswärtiges Amt",
        divisionCode: "DIV-02",
      },
      {
        id: "csp_visa_16b",
        stepId: "PATHWAY_DOC_CSP_VISA",
        title: "TK/AOK Insurance & Digital CSP § 16b Visa Filing",
        subtitle: "Statutory student health insurance + online Consular Services Portal submission.",
        authority: "digital.diplo.de",
        divisionCode: "DIV-06",
      },
    ],
  },
  ausbildung_dual: {
    id: "ausbildung_dual",
    shortLabel: "Dual Ausbildung (§ 16a)",
    title: "Paid Dual Vocational Career Pathway",
    legalBasis: "§ 16a AufenthG · IHK / PflBG Stipend Contract",
    targetCefr: "B1",
    summary:
      "Earn €1,050–€1,653/month gross during 3-year state-accredited German Nursing, IT, Hospitality, or Technical dual vocational training.",
    monthlyBenchmarkEur: 1091, // § 16a AufenthG monthly livelihood benchmark
    milestones: [
      {
        id: "passport",
        stepId: "AUSBILDUNG_OS_DOC_PASSPORT",
        title: "Valid International Passport",
        subtitle: "Ready for employer contract issuance and CSP digital visa pre-check.",
        authority: "Passport Seva",
        divisionCode: "DIV-02",
      },
      {
        id: "school_10_12",
        stepId: "AUSBILDUNG_OS_DOC_SCHOOL_10_12",
        title: "10th & 12th Marksheets + Certified German Translation",
        subtitle: "Secondary school leaving certificates formatted for German chamber review.",
        authority: "State / CBSE Board",
        divisionCode: "DIV-02",
      },
      {
        id: "anerkennung_zeugnis",
        stepId: "AUSBILDUNG_OS_DOC_ANERKENNUNG",
        title: "School Equivalence (Zeugnisanerkennung)",
        subtitle: "State recognition office assessment required for Nursing & regulated tracks.",
        authority: "Zeugnisanerkennungsstelle",
        divisionCode: "DIV-03",
      },
      {
        id: "language_b1_b2",
        stepId: "AUSBILDUNG_OS_DOC_LANGUAGE_B1_B2",
        title: "Certified German B1 (or B2 for Nursing)",
        subtitle: "Goethe / telc B1 minimum for IHK tracks; B2 preferred for public hospital Pflege.",
        authority: "Goethe / telc",
        divisionCode: "DIV-01",
        actionHref: "/exam/b1/lesen",
        actionLabel: "Run B1 Exam",
      },
      {
        id: "din5008_dossier",
        stepId: "PATHWAY_DOC_DIN5008_CV",
        title: "DIN 5008 Lebenslauf & Anschreiben Dossier",
        subtitle: "ATS-compliant German CV and employer-tailored motivation letter.",
        authority: "DIN 5008 Standard",
        divisionCode: "DIV-05",
        actionHref: "/ausbildung-os",
        actionLabel: "Open Ausbildung OS",
      },
      {
        id: "ausbildungsvertrag",
        stepId: "PATHWAY_DOC_AUSBILDUNGSVERTRAG",
        title: "Signed Ausbildungsvertrag & Ausbildungsplan",
        subtitle: "Registered dual training contract with monthly gross tariff/stipend.",
        authority: "IHK / HWK / Hospital",
        divisionCode: "DIV-05",
      },
      {
        id: "ba_vorabzustimmung",
        stepId: "PATHWAY_DOC_BA_APPROVAL",
        title: "Federal Employment Agency (BA) Approval",
        subtitle: "Bundesagentur für Arbeit Vorabzustimmung / labour-market clearance.",
        authority: "Arbeitsagentur",
        divisionCode: "DIV-05",
      },
      {
        id: "csp_visa_16a",
        stepId: "PATHWAY_DOC_CSP_VISA",
        title: "Digital CSP § 16a Visa Filing & Livelihood Proof",
        subtitle: "Submitted on digital.diplo.de (€1,091/mo covered by stipend or gap Sperrkonto).",
        authority: "digital.diplo.de",
        divisionCode: "DIV-02",
      },
    ],
  },
  pflege_medizin: {
    id: "pflege_medizin",
    shortLabel: "Pflege & Medizin (§ 16d / § 81a)",
    title: "Healthcare & Nursing Anerkennung Pathway",
    legalBasis: "§ 16d / § 81a AufenthG · PflBG & LÄK",
    targetCefr: "B2",
    summary:
      "Credential recognition (Pflegefachkraft Anerkennung / Approbation), B2 Fachsprache, and fast-track placement in Berlin & German hospital networks.",
    monthlyBenchmarkEur: 1091,
    milestones: [
      {
        id: "passport",
        stepId: "AUSBILDUNG_OS_DOC_PASSPORT",
        title: "Valid International Passport",
        subtitle: "Required for state Landesamt recognition and § 81a power of attorney.",
        authority: "Passport Authority",
        divisionCode: "DIV-02",
      },
      {
        id: "degree_council",
        stepId: "PATHWAY_DOC_DEGREE_REG",
        title: "B.Sc. Nursing / GNM / MBBS + Good Standing Certificate",
        subtitle: "Degree transcripts, clinical hour logbook, and Nursing/Medical Council registration.",
        authority: "INC / NMC / State Council",
        divisionCode: "DIV-03",
      },
      {
        id: "defizitbescheid",
        stepId: "AUSBILDUNG_OS_DOC_ANERKENNUNG",
        title: "Defizitbescheid / Gleichwertigkeitsprüfung Application",
        subtitle: "Official state assessment of clinical/theoretical equivalence (LAGeSo / Landesamt).",
        authority: "LAGeSo Berlin / Landesamt",
        divisionCode: "DIV-03",
      },
      {
        id: "goethe_telc_b2",
        stepId: "AUSBILDUNG_OS_DOC_LANGUAGE_B1_B2",
        title: "Certified B2 German & Fachsprachenprüfung (FSP) Prep",
        subtitle: "Goethe/telc B2 Pflege + clinical patient handover & Anamnese communication.",
        authority: "telc B2 Pflege / LÄK",
        divisionCode: "DIV-03",
        actionHref: "/exam/b2/lesen",
        actionLabel: "Run B2 Exam",
      },
      {
        id: "hospital_contract",
        stepId: "PATHWAY_DOC_HOSPITAL_OFFER",
        title: "German Hospital / Klinikum Employment Offer",
        subtitle: "Conditional contract as Pflegefachkraft in Anerkennung / Assistenzarzt.",
        authority: "Hospital HR Partner",
        divisionCode: "DIV-05",
        actionHref: "/pflege",
        actionLabel: "Open Pflege Hub",
      },
      {
        id: "fasttrack_81a",
        stepId: "PATHWAY_DOC_FASTTRACK_81A",
        title: "§ 81a AufenthG Fast-Track Employer Pre-Approval",
        subtitle: "Accelerated Foreigners' Authority procedure cutting embassy wait times.",
        authority: "Ausländerbehörde",
        divisionCode: "DIV-02",
      },
      {
        id: "health_police",
        stepId: "PATHWAY_DOC_HEALTH_INS",
        title: "Medical Fitness Certificate, PCC & Statutory Insurance",
        subtitle: "Ärztliches Attest, Apostilled Police Clearance, and TK/AOK coverage.",
        authority: "German Statutory",
        divisionCode: "DIV-06",
      },
      {
        id: "csp_visa_16d",
        stepId: "PATHWAY_DOC_CSP_VISA",
        title: "Embassy § 16d / § 81a Visa & Berlin Settlement",
        subtitle: "Visa issuance, flight to Berlin, Anmeldung, and clinical onboarding.",
        authority: "German Mission",
        divisionCode: "DIV-06",
      },
    ],
  },
};

export interface PathwayNextAction {
  id: string;
  priorityBadge: string;
  title: string;
  reason: string;
  href: string;
  ctaLabel: string;
  impactPoints: number;
}

export interface PathwayReadinessBreakdown {
  track: PathwayTrackDefinition;
  totalScore: number; // 0–100
  readinessBand:
    | "Visa-Filing Ready"
    | "Final Mile Preparation"
    | "Active Foundation Building"
    | "Early Onboarding";
  pillars: {
    cefrAndExams: { score: number; max: 40; detail: string };
    linguisticPrecision: { score: number; max: 15; detail: string };
    regulatoryDossier: { score: number; max: 30; completed: number; total: number; detail: string };
    trackSpecialization: { score: number; max: 15; detail: string };
  };
  nextActions: PathwayNextAction[];
}

export interface SperrkontoCalculationResult {
  monthlyBenchmarkEur: number;
  annualRequiredEur: number;
  monthlyCoveredByStipendEur: number;
  monthlyShortfallEur: number;
  requiredBlockedTopUpEur: number;
  netGapAfterSavingsEur: number;
  estimatedGapInr: number;
  fullyCovered: boolean;
  summaryNote: string;
}

export function resolveActivePathwayTrack(
  completedSteps: string[],
  userCourse?: string,
): PathwayTrackId {
  const set = new Set(completedSteps || []);
  if (set.has(PATHWAY_TRACK_STEP_MARKERS.pflege_medizin)) return "pflege_medizin";
  if (set.has(PATHWAY_TRACK_STEP_MARKERS.ausbildung_dual)) return "ausbildung_dual";
  if (set.has(PATHWAY_TRACK_STEP_MARKERS.studienkolleg_uni)) return "studienkolleg_uni";

  const course = (userCourse || "").toLowerCase();
  if (course.includes("pflege") || course.includes("medizin") || course.includes("fsp")) {
    return "pflege_medizin";
  }
  if (course.includes("ausbildung")) {
    return "ausbildung_dual";
  }
  if (course.includes("stk") || course.includes("studienkolleg") || course.includes("_kurs")) {
    return "studienkolleg_uni";
  }
  return "studienkolleg_uni";
}

export function applyTrackSelectionToSteps(
  completedSteps: string[],
  nextTrack: PathwayTrackId,
): string[] {
  const markers = new Set(Object.values(PATHWAY_TRACK_STEP_MARKERS));
  const cleaned = (completedSteps || []).filter((s) => !markers.has(s));
  return [...cleaned, PATHWAY_TRACK_STEP_MARKERS[nextTrack]];
}

function summarizeExamActivity(
  examStates: Partial<Record<"a1" | "a2" | "b1" | "b2", StoredExamState | null>>,
): { attemptedLevels: string[]; evalAvgPercent: number; totalAnsweredObjective: number } {
  const attemptedLevels: string[] = [];
  let totalAnsweredObjective = 0;
  const aiScores: number[] = [];

  for (const lvl of ["a1", "a2", "b1", "b2"] as const) {
    const st = examStates[lvl];
    if (!st) continue;
    const lesenCount = Object.keys(st.lesenAnswers || {}).length;
    const hoerenCount = Object.keys(st.hoerenAnswers || {}).length;
    const schrEvals = Object.values(st.schreibenEvaluations || {});
    const sprEvals = Object.values(st.sprechenEvaluations || {});

    if (lesenCount + hoerenCount > 0 || schrEvals.length > 0 || sprEvals.length > 0) {
      attemptedLevels.push(lvl.toUpperCase());
    }
    totalAnsweredObjective += lesenCount + hoerenCount;
    for (const ev of schrEvals) {
      if (typeof ev?.score === "number") aiScores.push(ev.score);
    }
    for (const ev of sprEvals) {
      if (typeof ev?.score === "number") aiScores.push(ev.score);
    }
  }

  const evalAvgPercent =
    aiScores.length > 0
      ? Math.round(aiScores.reduce((a, b) => a + b, 0) / aiScores.length)
      : 0;

  return { attemptedLevels, evalAvgPercent, totalAnsweredObjective };
}

export function computePathwayReadiness(params: {
  trackId: PathwayTrackId;
  completedSteps: string[];
  masteredFlashcardsCount: number;
  currentStreak: number;
  mistakeRadar?: MistakeRadarSummary | null;
  examStates?: Partial<Record<"a1" | "a2" | "b1" | "b2", StoredExamState | null>>;
}): PathwayReadinessBreakdown {
  const track = PATHWAY_TRACKS[params.trackId] || PATHWAY_TRACKS.studienkolleg_uni;
  const stepSet = new Set(params.completedSteps || []);

  // 1. Pillar 1: CEFR & Exam Readiness (0–40 pts)
  const cefrStepPrefixes = ["A1-Step", "A2-Step", "B1-Step", "B2-Step"];
  const completedCefrSteps = (params.completedSteps || []).filter((s) =>
    cefrStepPrefixes.some((pref) => s.startsWith(pref)),
  ).length; // up to 12 core steps across A1–B2

  const stepPoints = Math.min(18, Math.round((completedCefrSteps / 12) * 18));
  const vocabPoints = Math.min(10, Math.round((Math.min(150, params.masteredFlashcardsCount) / 150) * 10));

  const examInfo = summarizeExamActivity(params.examStates || {});
  const objectiveExamPts = Math.min(6, Math.round((Math.min(30, examInfo.totalAnsweredObjective) / 30) * 6));
  const aiExamPts = examInfo.evalAvgPercent > 0 ? Math.min(6, Math.round((examInfo.evalAvgPercent / 100) * 6)) : 0;

  const cefrScore = Math.min(40, stepPoints + vocabPoints + objectiveExamPts + aiExamPts);

  // 2. Pillar 2: Linguistic Precision / Mistake-DNA (0–15 pts)
  let precisionScore = 6; // neutral starting baseline before calibration
  let precisionDetail = "Run a 5-min Mistake-DNA calibration drill to unlock full precision points.";
  if (params.mistakeRadar && params.mistakeRadar.totalTrackedPatterns > 0) {
    const avgAxisHealth =
      params.mistakeRadar.axes.reduce((acc, a) => acc + a.healthScore, 0) /
      Math.max(1, params.mistakeRadar.axes.length);
    const masteryBonus = Math.min(4, params.mistakeRadar.masteredCount * 2);
    const duePenalty = Math.min(5, params.mistakeRadar.dueNowCount);
    precisionScore = Math.max(
      2,
      Math.min(15, Math.round((avgAxisHealth / 100) * 12) + masteryBonus - duePenalty),
    );
    precisionDetail = `${params.mistakeRadar.masteredCount} traps mastered · ${params.mistakeRadar.dueNowCount} due for spaced review.`;
  }

  // 3. Pillar 3: Regulatory & Document Dossier (0–30 pts)
  const completedDocs = track.milestones.filter((m) => stepSet.has(m.stepId)).length;
  const totalDocs = track.milestones.length;
  const dossierScore = Math.min(30, Math.round((completedDocs / Math.max(1, totalDocs)) * 30));

  // 4. Pillar 4: Track Specialization & Consistency (0–15 pts)
  const stkSteps = (params.completedSteps || []).filter((s) =>
    /^(M_KURS|T_KURS|W_KURS|G_KURS)-Step/i.test(s),
  ).length;
  const b2Steps = (params.completedSteps || []).filter((s) => s.startsWith("B2-Step")).length;
  const streakPts = Math.min(5, Math.max(1, params.currentStreak));

  let specCore = 0;
  let specDetail = "";
  if (track.id === "studienkolleg_uni") {
    const hasCtestMilestone = stepSet.has("PATHWAY_DOC_STK_AUFNAHME_PREP") ? 5 : 0;
    specCore = Math.min(10, stkSteps * 3 + hasCtestMilestone);
    specDetail = `${stkSteps} Studienkolleg track steps + ${streakPts}d active streak.`;
  } else if (track.id === "ausbildung_dual") {
    const hasCv = stepSet.has("PATHWAY_DOC_DIN5008_CV") ? 5 : 0;
    const hasB1 = (params.completedSteps || []).filter((s) => s.startsWith("B1-Step")).length * 2;
    specCore = Math.min(10, hasCv + hasB1);
    specDetail = `DIN 5008 dossier & B1 workplace readiness + ${streakPts}d streak.`;
  } else {
    const hasFsp = stepSet.has("AUSBILDUNG_OS_DOC_LANGUAGE_B1_B2") ? 4 : 0;
    specCore = Math.min(10, b2Steps * 2 + hasFsp);
    specDetail = `${b2Steps} B2 Fachsprache steps + ${streakPts}d clinical prep streak.`;
  }
  const specScore = Math.min(15, specCore + streakPts);

  const totalScore = Math.max(
    0,
    Math.min(100, cefrScore + precisionScore + dossierScore + specScore),
  );

  const readinessBand: PathwayReadinessBreakdown["readinessBand"] =
    totalScore >= 85
      ? "Visa-Filing Ready"
      : totalScore >= 65
        ? "Final Mile Preparation"
        : totalScore >= 35
          ? "Active Foundation Building"
          : "Early Onboarding";

  // Build Top 3 Prioritized Next Actions
  const nextActions: PathwayNextAction[] = [];

  if (params.mistakeRadar && params.mistakeRadar.dueNowCount > 0) {
    nextActions.push({
      id: "clear-mistake-dna",
      priorityBadge: "HIGH LEVERAGE · 5 MIN",
      title: `Clear ${params.mistakeRadar.dueNowCount} Due Mistake-DNA Weak Spots`,
      reason: "Spaced error remediation stops recurring kasus, word-order & Hören exam traps.",
      href: "/mistake-dna",
      ctaLabel: "Start 5-Min Drill",
      impactPoints: 5,
    });
  }

  if (examInfo.totalAnsweredObjective < 10) {
    const recLevel = track.targetCefr.toLowerCase();
    nextActions.push({
      id: "run-proctor-exam",
      priorityBadge: `PRÜFUNGSMODUS · ${track.targetCefr}`,
      title: `Complete a Proctored ${track.targetCefr} Modelltest`,
      reason: `Verify real Goethe/telc module pass gates (≥60% per skill) for ${track.shortLabel}.`,
      href: `/exam/${recLevel}/lesen`,
      ctaLabel: `Open ${track.targetCefr} Proctor Exam`,
      impactPoints: 10,
    });
  }

  if (track.id === "studienkolleg_uni" && !stepSet.has("PATHWAY_DOC_STK_AUFNAHME_PREP")) {
    nextActions.push({
      id: "stk-ctest-sprint",
      priorityBadge: "AUFNAHMEPRÜFUNG",
      title: "Train TU Berlin / LMU C-Test & Ohne-Taschenrechner Sprint",
      reason: "Half-word C-Tests and non-calculator math decide Studienkolleg seat allocation.",
      href: "/studienkolleg",
      ctaLabel: "Launch STK Proctor Lab",
      impactPoints: 8,
    });
  }

  const firstMissingDoc = track.milestones.find((m) => !stepSet.has(m.stepId));
  if (firstMissingDoc) {
    nextActions.push({
      id: `doc-${firstMissingDoc.id}`,
      priorityBadge: `${firstMissingDoc.divisionCode} · DOSSIER`,
      title: `Complete Milestone: ${firstMissingDoc.title}`,
      reason: `${firstMissingDoc.subtitle} (${firstMissingDoc.authority})`,
      href: firstMissingDoc.actionHref || (track.id === "ausbildung_dual" ? "/ausbildung-os" : "/pathways#dossier-checklist"),
      ctaLabel: firstMissingDoc.actionLabel || "Review Milestone",
      impactPoints: 4,
    });
  }

  if (nextActions.length < 3) {
    nextActions.push({
      id: "hoeren-shadowing",
      priorityBadge: "ACTIVE LISTENING",
      title: `Practice ${track.targetCefr} Hören Shadowing & Cloze Dictation`,
      reason: "Sharpen spoken rhythm, time/number trap recognition, and German pronunciation.",
      href: `/academy/${track.targetCefr.toLowerCase()}/03-hoeren-lesen`,
      ctaLabel: "Open Hören Labs",
      impactPoints: 5,
    });
  }

  return {
    track,
    totalScore,
    readinessBand,
    pillars: {
      cefrAndExams: {
        score: cefrScore,
        max: 40,
        detail: `${completedCefrSteps}/12 Academy steps · ${params.masteredFlashcardsCount} cards${examInfo.attemptedLevels.length ? ` · Exams: ${examInfo.attemptedLevels.join(", ")}` : ""}`,
      },
      linguisticPrecision: {
        score: precisionScore,
        max: 15,
        detail: precisionDetail,
      },
      regulatoryDossier: {
        score: dossierScore,
        max: 30,
        completed: completedDocs,
        total: totalDocs,
        detail: `${completedDocs}/${totalDocs} verified ${track.legalBasis.split("·")[0].trim()} milestones ready`,
      },
      trackSpecialization: {
        score: specScore,
        max: 15,
        detail: specDetail,
      },
    },
    nextActions: nextActions.slice(0, 3),
  };
}

/**
 * Statutory 2026 Sperrkonto & § 16a Stipend Livelihood Gap Calculator.
 * - `studienkolleg_uni` (§ 16b): €992/mo × 12 = €11,904/yr blocked account requirement.
 * - `ausbildung_dual` / `pflege_medizin` (§ 16a / § 16d): €1,091/mo benchmark offset by gross monthly contract stipend.
 */
export function computeSperrkontoGap(params: {
  trackId: PathwayTrackId;
  monthlyStipendEur?: number;
  currentSavingsEur?: number;
  eurToInrRate?: number;
}): SperrkontoCalculationResult {
  const track = PATHWAY_TRACKS[params.trackId] || PATHWAY_TRACKS.studienkolleg_uni;
  const benchmark = track.monthlyBenchmarkEur;
  const rate =
    typeof params.eurToInrRate === "number" && params.eurToInrRate > 0
      ? params.eurToInrRate
      : 92; // conservative reference rate (₹92 / €1)
  const savings = Math.max(0, Math.round(Number(params.currentSavingsEur) || 0));

  const stipend =
    track.id === "studienkolleg_uni"
      ? 0
      : Math.max(0, Math.round(Number(params.monthlyStipendEur) || 0));

  const monthlyShortfallEur = Math.max(0, benchmark - stipend);
  const requiredBlockedTopUpEur = monthlyShortfallEur * 12;
  const netGapAfterSavingsEur = Math.max(0, requiredBlockedTopUpEur - savings);
  const estimatedGapInr = Math.round(netGapAfterSavingsEur * rate);
  const fullyCovered = netGapAfterSavingsEur === 0;

  let summaryNote = "";
  if (track.id === "studienkolleg_uni") {
    summaryNote = fullyCovered
      ? "Full €11,904/yr (§ 16b AufenthG) Sperrkonto requirement is covered by your liquid savings."
      : `You need €${netGapAfterSavingsEur.toLocaleString("en-IN")} more to reach the statutory €11,904/yr (§ 16b) student Sperrkonto threshold.`;
  } else if (monthlyShortfallEur === 0) {
    summaryNote = `Your €${stipend.toLocaleString("en-IN")}/mo contract exceeds the €${benchmark}/mo federal threshold — €0 Sperrkonto required!`;
  } else {
    summaryNote = `Stipend leaves a €${monthlyShortfallEur}/mo gap vs €${benchmark}/mo benchmark → €${requiredBlockedTopUpEur.toLocaleString("en-IN")} 12-month Sperrkonto top-up needed.`;
  }

  return {
    monthlyBenchmarkEur: benchmark,
    annualRequiredEur: benchmark * 12,
    monthlyCoveredByStipendEur: Math.min(benchmark, stipend),
    monthlyShortfallEur,
    requiredBlockedTopUpEur,
    netGapAfterSavingsEur,
    estimatedGapInr,
    fullyCovered,
    summaryNote,
  };
}
