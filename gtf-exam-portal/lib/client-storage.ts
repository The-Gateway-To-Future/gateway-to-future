import type {
  DivisionId,
  Level,
  SchreibenEvaluation,
  SectionKey,
  SprechenEvaluation,
  UserSessionState,
} from "./types";

const SESSION_TOKEN_KEY = "gtf_session_token";
const USER_PROFILE_KEY = "gtf_user_profile";
const ACTIVE_DIVISION_KEY = "gtf_active_division";

export type ExamMode = "practice" | "exam";
export const EXAM_MODE_EVENT = "gtf:exam-mode-changed";

export interface StoredExamState {
  level: Level;
  testId: string;
  startedAt: number;
  /** "practice" (Übungsmodus) vs "exam" (Prüfungsmodus — strict Goethe/telc/STK proctor). */
  examMode: ExamMode;
  /** Per-section authoritative wall-clock deadline timestamps (ms epoch) for Prüfungsmodus. */
  sectionDeadlines: Partial<Record<SectionKey, number>>;
  /** Server-signed HMAC tokens paired with sectionDeadlines to resist clock tampering. */
  sectionDeadlineTokens: Partial<Record<SectionKey, string>>;
  /** Sections that hit 00:00 in Prüfungsmodus and were auto-locked/submitted. */
  expiredSections: SectionKey[];
  lesenAnswers: Record<string, string>;
  hoerenAnswers: Record<string, string>;
  /** Tracks how many times each Hören Teil audio has been played (enforces 1x/2x Goethe/telc lock). */
  hoerenPlayCounts: Record<string, number>;
  schreibenDrafts: Record<string, string>;
  schreibenEvaluations: Record<string, SchreibenEvaluation>;
  sprechenEvaluations: Record<string, SprechenEvaluation>;
}

function examKey(level: string, email?: string, testId?: string): string {
  const safeEmail = (email || getActiveUserEmail() || "anonymous").replace(/[^a-z0-9]/gi, "_");
  const normLevel = level.toLowerCase();
  const defaultId = `gtf-${normLevel}-modelltest-1`;
  const cleanTestId = (testId || "").trim().toLowerCase();
  if (cleanTestId && cleanTestId !== defaultId) {
    const safeTest = cleanTestId.replace(/[^a-z0-9_-]/gi, "_");
    return `gtf_exam_state_${safeEmail}_${normLevel}_${safeTest}`;
  }
  return `gtf_exam_state_${safeEmail}_${normLevel}`;
}

/** Returns the email of the active authenticated user, or empty string if not logged in. */
export function getActiveUserEmail(): string {
  if (typeof window === "undefined") return "";
  const profile = getActiveUserProfile();
  if (profile?.userEmail) return profile.userEmail.toLowerCase().trim();
  const legacy = localStorage.getItem("gtf_portal_user_email");
  return legacy ? legacy.toLowerCase().trim() : "";
}

export function setActiveUserEmail(email: string): void {
  if (typeof window === "undefined") return;
  const clean = email.toLowerCase().trim();
  localStorage.setItem("gtf_portal_user_email", clean);
  const current = getActiveUserProfile();
  if (current) {
    saveActiveUserProfile({ ...current, userEmail: clean });
  }
}

export function getActiveSessionToken(): string {
  if (typeof window === "undefined") return "";
  return localStorage.getItem(SESSION_TOKEN_KEY) || "";
}

export function getActiveUserProfile(): UserSessionState | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(USER_PROFILE_KEY);
    if (!raw) return null;
    return JSON.parse(raw) as UserSessionState;
  } catch {
    return null;
  }
}

export function saveActiveUserProfile(profile: UserSessionState): void {
  if (typeof window === "undefined") return;
  localStorage.setItem(USER_PROFILE_KEY, JSON.stringify(profile));
  localStorage.setItem(SESSION_TOKEN_KEY, profile.sessionToken);
  localStorage.setItem("gtf_portal_user_email", profile.userEmail);
}

export function clearActiveSession(): void {
  if (typeof window === "undefined") return;
  localStorage.removeItem(SESSION_TOKEN_KEY);
  localStorage.removeItem(USER_PROFILE_KEY);
  localStorage.removeItem("gtf_portal_user_email");
}

export function getActiveDivision(): DivisionId {
  if (typeof window === "undefined") return "sprachakademie";
  const stored = localStorage.getItem(ACTIVE_DIVISION_KEY) as DivisionId | null;
  if (stored && ["sprachakademie", "studienkolleg", "fachsprache_medizin"].includes(stored)) {
    return stored;
  }
  return "sprachakademie";
}

export function setActiveDivision(division: DivisionId): void {
  if (typeof window === "undefined") return;
  localStorage.setItem(ACTIVE_DIVISION_KEY, division);
}

export function loadExamState(level: Level, email?: string, testId?: string): StoredExamState {
  const resolvedTestId = (testId || "").trim() || `gtf-${level}-modelltest-1`;
  const fallback: StoredExamState = {
    level,
    testId: resolvedTestId,
    startedAt: Date.now(),
    examMode: "practice",
    sectionDeadlines: {},
    sectionDeadlineTokens: {},
    expiredSections: [],
    lesenAnswers: {},
    hoerenAnswers: {},
    hoerenPlayCounts: {},
    schreibenDrafts: {},
    schreibenEvaluations: {},
    sprechenEvaluations: {},
  };
  if (typeof window === "undefined") return fallback;
  const key = examKey(level, email, resolvedTestId);
  try {
    const raw = localStorage.getItem(key);
    if (!raw) {
      localStorage.setItem(key, JSON.stringify(fallback));
      return fallback;
    }
    const parsed = JSON.parse(raw) as Partial<StoredExamState>;
    return {
      ...fallback,
      ...parsed,
      testId: resolvedTestId,
      examMode: parsed.examMode === "exam" ? "exam" : "practice",
      sectionDeadlines: parsed.sectionDeadlines || {},
      sectionDeadlineTokens: parsed.sectionDeadlineTokens || {},
      expiredSections: Array.isArray(parsed.expiredSections) ? parsed.expiredSections : [],
      lesenAnswers: parsed.lesenAnswers || {},
      hoerenAnswers: parsed.hoerenAnswers || {},
      hoerenPlayCounts: parsed.hoerenPlayCounts || {},
      schreibenDrafts: parsed.schreibenDrafts || {},
      schreibenEvaluations: parsed.schreibenEvaluations || {},
      sprechenEvaluations: parsed.sprechenEvaluations || {},
    };
  } catch {
    return fallback;
  }
}

export function saveExamState(
  level: Level,
  updater: (prev: StoredExamState) => StoredExamState,
  email?: string,
  testId?: string,
): StoredExamState {
  const current = loadExamState(level, email, testId);
  const next = updater(current);
  if (typeof window !== "undefined") {
    localStorage.setItem(examKey(level, email, testId || next.testId), JSON.stringify(next));
  }
  return next;
}

export function setStoredExamMode(
  level: Level,
  mode: ExamMode,
  email?: string,
  testId?: string,
): StoredExamState {
  const next = saveExamState(
    level,
    (st) => ({
      ...st,
      examMode: mode,
      expiredSections: mode === "practice" ? [] : st.expiredSections,
    }),
    email,
    testId,
  );
  if (typeof window !== "undefined") {
    window.dispatchEvent(
      new CustomEvent(EXAM_MODE_EVENT, {
        detail: { level, testId: next.testId, mode },
      }),
    );
  }
  return next;
}

export function markExamSectionExpired(
  level: Level,
  section: SectionKey,
  email?: string,
  testId?: string,
): StoredExamState {
  return saveExamState(
    level,
    (st) => ({
      ...st,
      expiredSections: Array.from(new Set([...(st.expiredSections || []), section])),
    }),
    email,
    testId,
  );
}

export function resetExamSection(
  level: Level,
  section: "lesen" | "hoeren" | "schreiben" | "sprechen",
  email?: string,
  testId?: string,
): StoredExamState {
  return saveExamState(
    level,
    (st) => {
      const nextDeadlines = { ...(st.sectionDeadlines || {}) };
      const nextTokens = { ...(st.sectionDeadlineTokens || {}) };
      delete nextDeadlines[section];
      delete nextTokens[section];
      const nextExpired = (st.expiredSections || []).filter((s) => s !== section);
      const base = {
        ...st,
        sectionDeadlines: nextDeadlines,
        sectionDeadlineTokens: nextTokens,
        expiredSections: nextExpired,
      };
      if (section === "lesen") return { ...base, lesenAnswers: {} };
      if (section === "hoeren") return { ...base, hoerenAnswers: {}, hoerenPlayCounts: {} };
      if (section === "schreiben") return { ...base, schreibenDrafts: {}, schreibenEvaluations: {} };
      return { ...base, sprechenEvaluations: {} };
    },
    email,
    testId,
  );
}

export function resetExamState(level: Level, email?: string, testId?: string): StoredExamState {
  const resolvedTestId = (testId || "").trim() || `gtf-${level}-modelltest-1`;
  const prev = loadExamState(level, email, resolvedTestId);
  const fresh: StoredExamState = {
    level,
    testId: resolvedTestId,
    startedAt: Date.now(),
    examMode: prev.examMode || "practice",
    sectionDeadlines: {},
    sectionDeadlineTokens: {},
    expiredSections: [],
    lesenAnswers: {},
    hoerenAnswers: {},
    hoerenPlayCounts: {},
    schreibenDrafts: {},
    schreibenEvaluations: {},
    sprechenEvaluations: {},
  };
  if (typeof window !== "undefined") {
    localStorage.setItem(examKey(level, email, resolvedTestId), JSON.stringify(fresh));
  }
  return fresh;
}
