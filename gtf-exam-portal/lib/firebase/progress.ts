import { doc, getDoc, setDoc } from "firebase/firestore";
import { getActiveUserEmail } from "@/lib/client-storage";
import { getFirebaseAuth, getFirebaseFirestore } from "@/lib/firebase";

export interface UserProgress {
  uid: string;
  completedSteps: string[]; // e.g. ["A1-Step1", "A1-Step2"]
  masteredFlashcards: string[]; // array of card IDs
  lastLoginDate: string; // YYYY-MM-DD
  currentStreak: number;
}

export interface ProgressSyncResult {
  progress: UserProgress;
  syncedToCloud: boolean;
}

export const USER_PROGRESS_EVENT = "gtf-user-progress-updated";
const COLLECTION_NAME = "user_progress";
const LOCAL_STORAGE_PREFIX = "gtf_user_progress_";

function getLocalDateKey(offsetDays = 0): string {
  const d = new Date();
  if (offsetDays !== 0) {
    d.setDate(d.getDate() + offsetDays);
  }
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
}

export function sanitizeProgressUid(rawUid?: string | null): string {
  const trimmed = (rawUid || "").trim();
  if (!trimmed) return "gtf-guest-candidate";
  return trimmed.replace(/[\/#\?\s]+/g, "_");
}

/**
 * Resolves the canonical progress document ID.
 * ALWAYS prefers Firebase Auth `uid` (`request.auth.uid`) so Firestore security rules
 * (`request.auth.uid == uid`) authorize reads and writes cleanly across all pages
 * (Dashboard, Navbar, Academy, and Ausbildung OS).
 */
export function resolveProgressUid(
  user?: { firebaseUid?: string; studentId?: string; userEmail?: string } | null,
): string {
  if (user?.firebaseUid) {
    return sanitizeProgressUid(user.firebaseUid);
  }
  if (typeof window !== "undefined") {
    try {
      const fbUid = getFirebaseAuth().currentUser?.uid;
      if (fbUid) return sanitizeProgressUid(fbUid);
    } catch {
      // ignore if firebase not initialized yet
    }
  }
  const email = user?.userEmail || getActiveUserEmail();
  return sanitizeProgressUid(user?.studentId || email || "gtf-guest-candidate");
}

export function getStepId(trackKey: string, stepNumber: number): string {
  return `${(trackKey || "a1").trim().toUpperCase()}-Step${stepNumber}`;
}

function createDefaultProgress(uid: string): UserProgress {
  return {
    uid: sanitizeProgressUid(uid),
    completedSteps: [],
    masteredFlashcards: [],
    lastLoginDate: getLocalDateKey(0),
    currentStreak: 1,
  };
}

function sanitizeStepsList(steps: unknown): string[] {
  if (!Array.isArray(steps)) return [];
  // Never allow client-forged Pro entitlement markers inside completedSteps
  return Array.from(
    new Set(
      steps
        .filter((s): s is string => typeof s === "string" && s.trim().length > 0)
        .filter((s) => s !== "AUSBILDUNG_OS_PRO_UNLOCKED"),
    ),
  ).slice(0, 200);
}

function sanitizeFlashcardList(cards: unknown): string[] {
  if (!Array.isArray(cards)) return [];
  return Array.from(
    new Set(cards.filter((c): c is string => typeof c === "string" && c.trim().length > 0)),
  ).slice(0, 1000);
}

function readLocalProgress(uid: string): UserProgress | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(`${LOCAL_STORAGE_PREFIX}${sanitizeProgressUid(uid)}`);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Partial<UserProgress>;
    return {
      uid: sanitizeProgressUid(parsed.uid || uid),
      completedSteps: sanitizeStepsList(parsed.completedSteps),
      masteredFlashcards: sanitizeFlashcardList(parsed.masteredFlashcards),
      lastLoginDate:
        typeof parsed.lastLoginDate === "string" && parsed.lastLoginDate
          ? parsed.lastLoginDate
          : getLocalDateKey(0),
      currentStreak:
        typeof parsed.currentStreak === "number" && Number.isFinite(parsed.currentStreak)
          ? Math.max(1, parsed.currentStreak)
          : 1,
    };
  } catch {
    return null;
  }
}

/**
 * One-time migration from legacy `studentId`-keyed localStorage progress into the canonical Firebase `uid`.
 */
function readLocalWithLegacyMigration(canonicalUid: string): UserProgress | null {
  const direct = readLocalProgress(canonicalUid);
  if (typeof window === "undefined") return direct;

  const legacyStudentId = `GTF-2026-${canonicalUid.slice(-4).toUpperCase()}`;
  if (legacyStudentId === canonicalUid) return direct;

  const legacy = readLocalProgress(legacyStudentId);
  if (!legacy) return direct;

  const merged: UserProgress = {
    uid: sanitizeProgressUid(canonicalUid),
    completedSteps: sanitizeStepsList([
      ...(direct?.completedSteps || []),
      ...legacy.completedSteps,
    ]),
    masteredFlashcards: sanitizeFlashcardList([
      ...(direct?.masteredFlashcards || []),
      ...legacy.masteredFlashcards,
    ]),
    lastLoginDate: direct?.lastLoginDate || legacy.lastLoginDate || getLocalDateKey(0),
    currentStreak: Math.max(direct?.currentStreak || 1, legacy.currentStreak || 1),
  };
  writeLocalProgress(merged);
  try {
    localStorage.removeItem(`${LOCAL_STORAGE_PREFIX}${sanitizeProgressUid(legacyStudentId)}`);
  } catch {
    // ignore
  }
  return merged;
}

function writeLocalProgress(progress: UserProgress): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(
      `${LOCAL_STORAGE_PREFIX}${sanitizeProgressUid(progress.uid)}`,
      JSON.stringify(progress),
    );
  } catch {
    // ignore storage quota errors
  }
}

function emitProgressUpdated(progress: UserProgress): void {
  if (typeof window === "undefined") return;
  try {
    window.dispatchEvent(
      new CustomEvent<UserProgress>(USER_PROGRESS_EVENT, { detail: progress }),
    );
  } catch {
    // ignore
  }
}

function canSyncWithFirestore(safeUid: string): boolean {
  if (typeof window === "undefined") return false;
  if (!safeUid || safeUid === "gtf-guest-candidate") return false;
  try {
    const fbUser = getFirebaseAuth().currentUser;
    return Boolean(fbUser && fbUser.uid === safeUid);
  } catch {
    return false;
  }
}

function normalizeAndAdvanceStreak(
  base: Partial<UserProgress>,
  uid: string,
): {
  progress: UserProgress;
  streakChanged: boolean;
} {
  const today = getLocalDateKey(0);
  const yesterday = getLocalDateKey(-1);
  const safeUid = sanitizeProgressUid(uid);
  const prevDate = typeof base.lastLoginDate === "string" ? base.lastLoginDate : "";
  const prevStreak =
    typeof base.currentStreak === "number" && Number.isFinite(base.currentStreak)
      ? Math.max(1, base.currentStreak)
      : 1;

  let currentStreak = prevStreak;
  let lastLoginDate = today;
  let streakChanged = false;

  if (!prevDate) {
    currentStreak = 1;
    lastLoginDate = today;
    streakChanged = true;
  } else if (prevDate === today) {
    currentStreak = prevStreak;
    lastLoginDate = today;
  } else if (prevDate === yesterday) {
    currentStreak = prevStreak + 1;
    lastLoginDate = today;
    streakChanged = true;
  } else if (prevDate < yesterday) {
    currentStreak = 1;
    lastLoginDate = today;
    streakChanged = true;
  } else {
    lastLoginDate = prevDate;
  }

  return {
    progress: {
      uid: safeUid,
      completedSteps: sanitizeStepsList(base.completedSteps),
      masteredFlashcards: sanitizeFlashcardList(base.masteredFlashcards),
      lastLoginDate,
      currentStreak,
    },
    streakChanged,
  };
}

export async function getUserProgressWithStatus(uid: string): Promise<ProgressSyncResult> {
  const safeUid = sanitizeProgressUid(uid);
  if (typeof window === "undefined") {
    return { progress: createDefaultProgress(safeUid), syncedToCloud: false };
  }

  const localCached = readLocalWithLegacyMigration(safeUid);

  // Skip Firestore network round-trip if not signed in as this exact Firebase UID (prevents guaranteed 403s)
  if (!canSyncWithFirestore(safeUid)) {
    const { progress } = normalizeAndAdvanceStreak(
      localCached || createDefaultProgress(safeUid),
      safeUid,
    );
    writeLocalProgress(progress);
    emitProgressUpdated(progress);
    return { progress, syncedToCloud: false };
  }

  try {
    const db = getFirebaseFirestore();
    const ref = doc(db, COLLECTION_NAME, safeUid);
    const timeoutPromise = new Promise<never>((_, reject) =>
      setTimeout(() => reject(new Error("getUserProgress timeout after 4000ms")), 4000),
    );
    const snap = await Promise.race([getDoc(ref), timeoutPromise]);

    if (snap.exists()) {
      const remoteData = snap.data() as Partial<UserProgress>;
      const mergedBase: Partial<UserProgress> = {
        uid: safeUid,
        completedSteps: [
          ...(Array.isArray(remoteData.completedSteps) ? remoteData.completedSteps : []),
          ...(localCached?.completedSteps || []),
        ],
        masteredFlashcards: [
          ...(Array.isArray(remoteData.masteredFlashcards)
            ? remoteData.masteredFlashcards
            : []),
          ...(localCached?.masteredFlashcards || []),
        ],
        lastLoginDate: remoteData.lastLoginDate || localCached?.lastLoginDate,
        currentStreak: Math.max(
          remoteData.currentStreak || 1,
          localCached?.currentStreak || 1,
        ),
      };
      const { progress, streakChanged } = normalizeAndAdvanceStreak(mergedBase, safeUid);
      writeLocalProgress(progress);

      const localHadExtra =
        (localCached?.completedSteps || []).some(
          (s) => !(remoteData.completedSteps || []).includes(s),
        ) ||
        (localCached?.masteredFlashcards || []).some(
          (c) => !(remoteData.masteredFlashcards || []).includes(c),
        );

      let syncedToCloud = true;
      if (streakChanged || localHadExtra) {
        try {
          await setDoc(ref, progress, { merge: true });
        } catch {
          syncedToCloud = false;
        }
      }

      emitProgressUpdated(progress);
      return { progress, syncedToCloud };
    }

    // Initialize new Firestore document on first authenticated login
    const { progress } = normalizeAndAdvanceStreak(
      localCached || createDefaultProgress(safeUid),
      safeUid,
    );
    writeLocalProgress(progress);
    let syncedToCloud = true;
    try {
      await setDoc(ref, progress, { merge: true });
    } catch {
      syncedToCloud = false;
    }
    emitProgressUpdated(progress);
    return { progress, syncedToCloud };
  } catch (err) {
    console.warn("[gtf progress] Firestore read fallback to local mirror:", err);
    const { progress } = normalizeAndAdvanceStreak(
      localCached || createDefaultProgress(safeUid),
      safeUid,
    );
    writeLocalProgress(progress);
    emitProgressUpdated(progress);
    return { progress, syncedToCloud: false };
  }
}

export async function getUserProgress(uid: string): Promise<UserProgress> {
  const { progress } = await getUserProgressWithStatus(uid);
  return progress;
}

export async function updateUserProgressWithStatus(
  uid: string,
  data: Partial<UserProgress>,
): Promise<ProgressSyncResult> {
  const safeUid = sanitizeProgressUid(uid);
  const existing = readLocalProgress(safeUid) || createDefaultProgress(safeUid);
  const today = getLocalDateKey(0);

  const nextCompleted =
    data.completedSteps !== undefined
      ? sanitizeStepsList(data.completedSteps)
      : existing.completedSteps;

  const nextMastered =
    data.masteredFlashcards !== undefined
      ? sanitizeFlashcardList(data.masteredFlashcards)
      : existing.masteredFlashcards;

  const { progress: streakNormalized } = normalizeAndAdvanceStreak(existing, safeUid);

  const nextProgress: UserProgress = {
    uid: safeUid,
    completedSteps: nextCompleted,
    masteredFlashcards: nextMastered,
    lastLoginDate: data.lastLoginDate || streakNormalized.lastLoginDate || today,
    currentStreak:
      typeof data.currentStreak === "number" && Number.isFinite(data.currentStreak)
        ? Math.max(1, data.currentStreak)
        : streakNormalized.currentStreak,
  };

  writeLocalProgress(nextProgress);
  emitProgressUpdated(nextProgress);

  let syncedToCloud = false;
  if (canSyncWithFirestore(safeUid)) {
    try {
      const db = getFirebaseFirestore();
      const ref = doc(db, COLLECTION_NAME, safeUid);
      await setDoc(ref, nextProgress, { merge: true });
      syncedToCloud = true;
    } catch (err) {
      console.warn("[gtf progress] Firestore write synced locally only:", err);
      syncedToCloud = false;
    }
  }

  return { progress: nextProgress, syncedToCloud };
}

export async function updateUserProgress(
  uid: string,
  data: Partial<UserProgress>,
): Promise<UserProgress> {
  const { progress } = await updateUserProgressWithStatus(uid, data);
  return progress;
}
