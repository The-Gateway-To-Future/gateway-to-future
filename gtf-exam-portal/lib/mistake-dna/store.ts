import {
  collection,
  doc,
  getDocs,
  setDoc,
} from "firebase/firestore";
import { getFirebaseAuth, getFirebaseFirestore } from "@/lib/firebase";
import {
  MISTAKE_AXES,
  MISTAKE_AXIS_META,
  MISTAKE_CODES,
  MISTAKE_TAXONOMY,
  isMistakeCode,
  type MistakeAxis,
  type MistakeCode,
  type RemediationDrillItem,
} from "./taxonomy";

export const MISTAKE_DNA_EVENT = "gtf:mistake-dna-updated";

export type MistakeSource =
  | "lesen"
  | "hoeren"
  | "schreiben"
  | "sprechen"
  | "workbook"
  | "drill";

export interface MistakeSample {
  prompt: string;
  wrong: string;
  right: string;
  at: string;
}

export interface MistakeDnaRecord {
  errorKey: MistakeCode;
  uid: string;
  occurrences: number;
  streak: number;
  repetitions: number;
  easeFactor: number;
  intervalDays: number;
  nextReviewAt: string;
  lastSeenAt: string;
  lastSource: MistakeSource;
  recentSamples: MistakeSample[];
  mastered: boolean;
  updatedAt: string;
}

export interface MistakeOccurrenceInput {
  errorKey: MistakeCode;
  source: MistakeSource;
  prompt?: string;
  wrong?: string;
  right?: string;
}

export interface DailyWeaknessCard {
  drill: RemediationDrillItem;
  record: MistakeDnaRecord | null;
  isDueNow: boolean;
  isCalibration: boolean;
  priorityScore: number;
  recentSample: MistakeSample | null;
}

export interface MistakeAxisScore {
  axis: MistakeAxis;
  label: string;
  shortLabel: string;
  labelDe: string;
  color: string;
  totalErrors: number;
  dueCount: number;
  /** 0–100 health score (100 = zero unresolved traps, lower = hotter weak spot). */
  healthScore: number;
}

export interface MistakeRadarSummary {
  totalTrackedPatterns: number;
  totalOccurrences: number;
  dueNowCount: number;
  masteredCount: number;
  axes: MistakeAxisScore[];
  topWeakSpots: MistakeDnaRecord[];
}

/** SM-2 quality scale: 1 = Again (missed), 3 = Hard, 4 = Good, 5 = Easy. */
export type Sm2Quality = 1 | 3 | 4 | 5;

const DAY_MS = 24 * 60 * 60 * 1000;
const STORAGE_PREFIX = "gtf_mistake_dna_v1_";

function clampStr(val: string | undefined | null, maxLen: number): string {
  return (val || "").replace(/\s+/g, " ").trim().slice(0, maxLen);
}

function defaultRecord(uid: string, errorKey: MistakeCode, source: MistakeSource, nowIso: string): MistakeDnaRecord {
  return {
    errorKey,
    uid,
    occurrences: 0,
    streak: 0,
    repetitions: 0,
    easeFactor: 2.5,
    intervalDays: 0,
    nextReviewAt: nowIso,
    lastSeenAt: nowIso,
    lastSource: source,
    recentSamples: [],
    mastered: false,
    updatedAt: nowIso,
  };
}

/**
 * Pure SM-2 spaced-remediation update function.
 * - Quality < 3 (missed): resets repetitions & streak, schedules immediate remediation, reduces easeFactor.
 * - Quality >= 3 (recalled): advances interval (1d -> 6d -> interval * EF) and updates easeFactor.
 */
export function applySm2Review(
  existing: MistakeDnaRecord | null,
  params: { uid: string; errorKey: MistakeCode; quality: Sm2Quality; nowMs?: number },
): MistakeDnaRecord {
  const nowMs = params.nowMs ?? Date.now();
  const nowIso = new Date(nowMs).toISOString();
  const base = existing || defaultRecord(params.uid, params.errorKey, "drill", nowIso);
  const q = params.quality;

  if (q < 3) {
    const nextEf = Math.max(1.3, Number((base.easeFactor - 0.2).toFixed(2)));
    return {
      ...base,
      uid: params.uid,
      occurrences: base.occurrences + 1,
      streak: 0,
      repetitions: 0,
      easeFactor: nextEf,
      intervalDays: 0,
      // Re-queue for review in 15 minutes (or immediately in next drill session)
      nextReviewAt: new Date(nowMs + 15 * 60 * 1000).toISOString(),
      lastSeenAt: nowIso,
      lastSource: "drill",
      mastered: false,
      updatedAt: nowIso,
    };
  }

  const nextReps = base.repetitions + 1;
  const nextStreak = base.streak + 1;
  const rawEf = base.easeFactor + (0.1 - (5 - q) * (0.08 + (5 - q) * 0.02));
  const nextEf = Math.max(1.3, Math.min(3.0, Number(rawEf.toFixed(2))));

  let nextIntervalDays: number;
  if (nextReps === 1) {
    nextIntervalDays = q === 3 ? 1 : q === 5 ? 3 : 1;
  } else if (nextReps === 2) {
    nextIntervalDays = q === 3 ? 4 : q === 5 ? 8 : 6;
  } else {
    const baseInterval = Math.max(1, base.intervalDays);
    const mult = q === 3 ? Math.max(1.2, nextEf * 0.8) : q === 5 ? nextEf * 1.15 : nextEf;
    nextIntervalDays = Math.min(180, Math.max(1, Math.round(baseInterval * mult)));
  }

  const mastered = nextStreak >= 3 && nextIntervalDays >= 6;

  return {
    ...base,
    uid: params.uid,
    streak: nextStreak,
    repetitions: nextReps,
    easeFactor: nextEf,
    intervalDays: nextIntervalDays,
    nextReviewAt: new Date(nowMs + nextIntervalDays * DAY_MS).toISOString(),
    lastSeenAt: nowIso,
    lastSource: "drill",
    mastered,
    updatedAt: nowIso,
  };
}

/**
 * Pure reducer that merges a newly observed mistake occurrence into an existing SM-2 record.
 */
export function mergeMistakeOccurrence(
  existing: MistakeDnaRecord | null,
  uid: string,
  input: MistakeOccurrenceInput,
  nowMs = Date.now(),
): MistakeDnaRecord {
  const nowIso = new Date(nowMs).toISOString();
  const base = existing || defaultRecord(uid, input.errorKey, input.source, nowIso);
  const sample: MistakeSample | null =
    input.prompt || input.wrong || input.right
      ? {
          prompt: clampStr(input.prompt, 180) || MISTAKE_TAXONOMY[input.errorKey].titleDe,
          wrong: clampStr(input.wrong, 140) || "—",
          right: clampStr(input.right, 140) || MISTAKE_TAXONOMY[input.errorKey].classicTrap.right,
          at: nowIso,
        }
      : null;

  const dedupedSamples = sample
    ? [
        sample,
        ...base.recentSamples.filter(
          (s) => !(s.prompt === sample.prompt && s.wrong === sample.wrong),
        ),
      ].slice(0, 3)
    : base.recentSamples.slice(0, 3);

  return {
    ...base,
    uid,
    occurrences: Math.min(10000, base.occurrences + 1),
    streak: 0,
    repetitions: 0,
    easeFactor: Math.max(1.3, Number((base.easeFactor - 0.15).toFixed(2))),
    intervalDays: 0,
    nextReviewAt: nowIso, // Immediately due for remediation!
    lastSeenAt: nowIso,
    lastSource: input.source,
    recentSamples: dedupedSamples,
    mastered: false,
    updatedAt: nowIso,
  };
}

function getLocalStorageKey(uid: string): string {
  return `${STORAGE_PREFIX}${uid || "guest"}`;
}

export function readLocalMistakeDna(uid: string): MistakeDnaRecord[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(getLocalStorageKey(uid));
    if (!raw) return [];
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return [];
    return parsed.filter((r): r is MistakeDnaRecord =>
      Boolean(r && typeof r === "object" && isMistakeCode((r as MistakeDnaRecord).errorKey)),
    );
  } catch {
    return [];
  }
}

function writeLocalMistakeDna(uid: string, records: MistakeDnaRecord[]): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(getLocalStorageKey(uid), JSON.stringify(records));
    window.dispatchEvent(
      new CustomEvent(MISTAKE_DNA_EVENT, { detail: { uid, records } }),
    );
  } catch {
    // ignore storage quota errors
  }
}

function mergeRecordMaps(a: MistakeDnaRecord[], b: MistakeDnaRecord[]): MistakeDnaRecord[] {
  const byKey = new Map<MistakeCode, MistakeDnaRecord>();
  for (const r of a) {
    if (isMistakeCode(r.errorKey)) byKey.set(r.errorKey, r);
  }
  for (const r of b) {
    if (!isMistakeCode(r.errorKey)) continue;
    const prev = byKey.get(r.errorKey);
    if (!prev || new Date(r.updatedAt).getTime() >= new Date(prev.updatedAt).getTime()) {
      byKey.set(r.errorKey, {
        ...r,
        occurrences: Math.max(prev?.occurrences || 0, r.occurrences),
      });
    }
  }
  return Array.from(byKey.values());
}

function canUseClientFirestoreForUid(uid: string): boolean {
  if (typeof window === "undefined" || !uid || uid === "guest") return false;
  try {
    const current = getFirebaseAuth().currentUser;
    return Boolean(current && current.uid === uid);
  } catch {
    return false;
  }
}

/**
 * Loads the authenticated user's Mistake-DNA records from Firestore (`users/{uid}/mistake_dna`),
 * falling back to `/api/mistake-dna` (for cookie sessions) and localStorage cache.
 */
export async function loadMistakeDna(uid: string): Promise<{
  records: MistakeDnaRecord[];
  syncedFromCloud: boolean;
}> {
  const local = readLocalMistakeDna(uid);
  if (typeof window === "undefined" || !uid || uid === "guest") {
    return { records: local, syncedFromCloud: false };
  }

  // 1. Direct authenticated Firebase Client SDK read (`users/{uid}/mistake_dna`)
  if (canUseClientFirestoreForUid(uid)) {
    try {
      const db = getFirebaseFirestore();
      const snap = await getDocs(collection(db, "users", uid, "mistake_dna"));
      const cloud: MistakeDnaRecord[] = [];
      snap.forEach((docSnap) => {
        const d = docSnap.data() as Partial<MistakeDnaRecord>;
        if (d && isMistakeCode(d.errorKey)) {
          cloud.push({
            errorKey: d.errorKey,
            uid,
            occurrences: Number(d.occurrences || 0),
            streak: Number(d.streak || 0),
            repetitions: Number(d.repetitions || 0),
            easeFactor: Number(d.easeFactor || 2.5),
            intervalDays: Number(d.intervalDays || 0),
            nextReviewAt: typeof d.nextReviewAt === "string" ? d.nextReviewAt : new Date().toISOString(),
            lastSeenAt: typeof d.lastSeenAt === "string" ? d.lastSeenAt : new Date().toISOString(),
            lastSource: (d.lastSource as MistakeSource) || "drill",
            recentSamples: Array.isArray(d.recentSamples) ? d.recentSamples.slice(0, 3) : [],
            mastered: Boolean(d.mastered),
            updatedAt: typeof d.updatedAt === "string" ? d.updatedAt : new Date().toISOString(),
          });
        }
      });
      const merged = mergeRecordMaps(local, cloud);
      writeLocalMistakeDna(uid, merged);
      return { records: merged, syncedFromCloud: true };
    } catch {
      // Fall through to server API
    }
  }

  // 2. Fallback: Server-authenticated `/api/mistake-dna` (Admin SDK via HttpOnly `gtf_session`)
  try {
    const res = await fetch("/api/mistake-dna", {
      cache: "no-store",
      credentials: "include",
    });
    if (res.ok) {
      const data = (await res.json()) as { records?: MistakeDnaRecord[] };
      if (Array.isArray(data.records)) {
        const merged = mergeRecordMaps(local, data.records);
        writeLocalMistakeDna(uid, merged);
        return { records: merged, syncedFromCloud: true };
      }
    }
  } catch {
    // Offline fallback
  }

  return { records: local, syncedFromCloud: false };
}

async function persistRecordToCloud(uid: string, record: MistakeDnaRecord): Promise<boolean> {
  if (canUseClientFirestoreForUid(uid)) {
    try {
      const db = getFirebaseFirestore();
      await setDoc(doc(db, "users", uid, "mistake_dna", record.errorKey), record, {
        merge: true,
      });
      return true;
    } catch {
      // Fall through to server endpoint
    }
  }
  return false;
}

/**
 * Records one or more mistake occurrences into local cache + Cloud Firestore (`users/{uid}/mistake_dna/{errorKey}`).
 */
export async function recordMistakeOccurrences(
  uid: string,
  occurrences: MistakeOccurrenceInput[],
): Promise<{ records: MistakeDnaRecord[]; syncedToCloud: boolean }> {
  const valid = occurrences.filter((o) => isMistakeCode(o.errorKey));
  const current = readLocalMistakeDna(uid);
  if (valid.length === 0) {
    return { records: current, syncedToCloud: true };
  }

  const byKey = new Map<MistakeCode, MistakeDnaRecord>();
  for (const r of current) byKey.set(r.errorKey, r);

  const touchedKeys = new Set<MistakeCode>();
  const nowMs = Date.now();
  for (const occ of valid) {
    const updated = mergeMistakeOccurrence(byKey.get(occ.errorKey) || null, uid, occ, nowMs);
    byKey.set(occ.errorKey, updated);
    touchedKeys.add(occ.errorKey);
  }

  const nextRecords = Array.from(byKey.values());
  writeLocalMistakeDna(uid, nextRecords);

  if (!uid || uid === "guest") {
    return { records: nextRecords, syncedToCloud: false };
  }

  let synced = false;
  if (canUseClientFirestoreForUid(uid)) {
    const writes = Array.from(touchedKeys).map((k) =>
      persistRecordToCloud(uid, byKey.get(k)!),
    );
    const results = await Promise.all(writes);
    synced = results.every(Boolean);
  }

  if (!synced) {
    try {
      const res = await fetch("/api/mistake-dna", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "record", occurrences: valid }),
      });
      synced = res.ok;
    } catch {
      synced = false;
    }
  }

  return { records: nextRecords, syncedToCloud: synced };
}

/**
 * Submits an SM-2 drill review outcome (`1 | 3 | 4 | 5`) and persists to `users/{uid}/mistake_dna/{errorKey}`.
 */
export async function submitMistakeSm2Review(
  uid: string,
  errorKey: MistakeCode,
  quality: Sm2Quality,
): Promise<{ record: MistakeDnaRecord; records: MistakeDnaRecord[]; syncedToCloud: boolean }> {
  const current = readLocalMistakeDna(uid);
  const existing = current.find((r) => r.errorKey === errorKey) || null;
  const updated = applySm2Review(existing, { uid, errorKey, quality });

  const nextRecords = mergeRecordMaps(current, [updated]);
  writeLocalMistakeDna(uid, nextRecords);

  if (!uid || uid === "guest") {
    return { record: updated, records: nextRecords, syncedToCloud: false };
  }

  let synced = await persistRecordToCloud(uid, updated);
  if (!synced) {
    try {
      const res = await fetch("/api/mistake-dna", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "review", errorKey, quality }),
      });
      synced = res.ok;
    } catch {
      synced = false;
    }
  }

  return { record: updated, records: nextRecords, syncedToCloud: synced };
}

/**
 * Computes the 5-axis Mistake-DNA Radar health breakdown and top weak-spot clusters.
 */
export function computeMistakeRadar(
  records: MistakeDnaRecord[],
  nowMs = Date.now(),
): MistakeRadarSummary {
  const axisErrors: Record<MistakeAxis, number> = {
    cases_articles: 0,
    syntax_verbs: 0,
    prepositions_register: 0,
    listening_traps: 0,
    reading_vocab: 0,
  };
  const axisDue: Record<MistakeAxis, number> = {
    cases_articles: 0,
    syntax_verbs: 0,
    prepositions_register: 0,
    listening_traps: 0,
    reading_vocab: 0,
  };
  const axisUnresolvedWeight: Record<MistakeAxis, number> = {
    cases_articles: 0,
    syntax_verbs: 0,
    prepositions_register: 0,
    listening_traps: 0,
    reading_vocab: 0,
  };

  let totalOccurrences = 0;
  let dueNowCount = 0;
  let masteredCount = 0;

  for (const rec of records) {
    const meta = MISTAKE_TAXONOMY[rec.errorKey];
    if (!meta) continue;
    totalOccurrences += rec.occurrences;
    axisErrors[meta.axis] += rec.occurrences;
    const isDue = !rec.mastered && new Date(rec.nextReviewAt).getTime() <= nowMs;
    if (isDue) {
      dueNowCount += 1;
      axisDue[meta.axis] += 1;
    }
    if (rec.mastered) {
      masteredCount += 1;
    } else {
      // Unmastered mistakes pull down axis health; streaks gradually recover it
      const penalty = Math.max(8, rec.occurrences * 14 - rec.streak * 10);
      axisUnresolvedWeight[meta.axis] += penalty;
    }
  }

  const axes: MistakeAxisScore[] = MISTAKE_AXES.map((axis) => {
    const info = MISTAKE_AXIS_META[axis];
    const healthScore = Math.max(15, Math.min(100, Math.round(100 - axisUnresolvedWeight[axis])));
    return {
      axis,
      label: info.label,
      shortLabel: info.shortLabel,
      labelDe: info.labelDe,
      color: info.color,
      totalErrors: axisErrors[axis],
      dueCount: axisDue[axis],
      healthScore,
    };
  });

  const topWeakSpots = [...records]
    .sort((a, b) => {
      const aDue = !a.mastered && new Date(a.nextReviewAt).getTime() <= nowMs ? 1 : 0;
      const bDue = !b.mastered && new Date(b.nextReviewAt).getTime() <= nowMs ? 1 : 0;
      if (aDue !== bDue) return bDue - aDue;
      if (a.mastered !== b.mastered) return a.mastered ? 1 : -1;
      if (b.occurrences !== a.occurrences) return b.occurrences - a.occurrences;
      return a.easeFactor - b.easeFactor;
    })
    .slice(0, 6);

  return {
    totalTrackedPatterns: records.length,
    totalOccurrences,
    dueNowCount,
    masteredCount,
    axes,
    topWeakSpots,
  };
}

const CALIBRATION_DEFAULTS: MistakeCode[] = [
  "WORD_ORDER_WEIL",
  "CASE_DAT_WECHSEL",
  "PERFEKT_HABEN_SEIN",
  "PREP_ZU_NACH_IN",
  "GENDER_RULE_UNG_HEIT",
  "HOEREN_TIME_TRAP",
];

/**
 * Generates a daily 5-minute "Kill Your Weaknesses" dynamic review deck (~6–8 drills)
 * prioritized by SM-2 due status, error frequency, and ease factor.
 */
export function buildDailyWeaknessDeck(
  records: MistakeDnaRecord[],
  maxCards = 8,
  nowMs = Date.now(),
  focusCode?: MistakeCode | null,
): DailyWeaknessCard[] {
  const deck: DailyWeaknessCard[] = [];
  const usedDrillIds = new Set<string>();

  // If the student clicked a specific weak spot from the Radar, put its drills first
  if (focusCode && MISTAKE_TAXONOMY[focusCode]) {
    const rec = records.find((r) => r.errorKey === focusCode) || null;
    for (const drill of MISTAKE_TAXONOMY[focusCode].remediationDrills) {
      if (deck.length >= maxCards) break;
      usedDrillIds.add(drill.id);
      deck.push({
        drill,
        record: rec,
        isDueNow: rec ? new Date(rec.nextReviewAt).getTime() <= nowMs : true,
        isCalibration: !rec,
        priorityScore: 999,
        recentSample: rec?.recentSamples?.[0] || null,
      });
    }
  }

  // Score and rank recorded mistakes by SM-2 urgency + frequency
  const ranked = [...records]
    .filter((r) => Boolean(MISTAKE_TAXONOMY[r.errorKey]))
    .map((r) => {
      const isDueNow = new Date(r.nextReviewAt).getTime() <= nowMs;
      const priorityScore =
        (isDueNow && !r.mastered ? 120 : 0) +
        Math.min(100, r.occurrences * 15) +
        (r.mastered ? -70 : 35) +
        Math.round((3.0 - r.easeFactor) * 25);
      return { record: r, isDueNow, priorityScore };
    })
    .sort((a, b) => b.priorityScore - a.priorityScore);

  // Pull up to 2 drills per top weak cluster so the 5-minute deck hits multiple weak patterns
  for (const item of ranked) {
    if (deck.length >= maxCards) break;
    const entry = MISTAKE_TAXONOMY[item.record.errorKey];
    const perCluster = ranked.length <= 2 ? 3 : 2;
    let addedForCluster = 0;
    for (const drill of entry.remediationDrills) {
      if (deck.length >= maxCards || addedForCluster >= perCluster) break;
      if (usedDrillIds.has(drill.id)) continue;
      usedDrillIds.add(drill.id);
      addedForCluster += 1;
      deck.push({
        drill,
        record: item.record,
        isDueNow: item.isDueNow,
        isCalibration: false,
        priorityScore: item.priorityScore,
        recentSample: item.record.recentSamples[0] || null,
      });
    }
  }

  // If new student (or fewer than 6 cards), pad with Indian-learner Calibration Traps
  const targetMin = Math.min(maxCards, 6);
  if (deck.length < targetMin) {
    const calibrationPool = [...CALIBRATION_DEFAULTS, ...MISTAKE_CODES];
    for (const code of calibrationPool) {
      if (deck.length >= targetMin) break;
      const entry = MISTAKE_TAXONOMY[code];
      const nextDrill = entry.remediationDrills.find((d) => !usedDrillIds.has(d.id));
      if (!nextDrill) continue;
      usedDrillIds.add(nextDrill.id);
      const existingRec = records.find((r) => r.errorKey === code) || null;
      deck.push({
        drill: nextDrill,
        record: existingRec,
        isDueNow: true,
        isCalibration: !existingRec,
        priorityScore: 10,
        recentSample: existingRec?.recentSamples?.[0] || null,
      });
    }
  }

  return deck;
}
