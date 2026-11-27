import { getFirebaseAdminFirestore } from "./firebase-admin";
import {
  applySm2Review,
  mergeMistakeOccurrence,
  type MistakeDnaRecord,
  type MistakeOccurrenceInput,
  type Sm2Quality,
} from "@/lib/mistake-dna/store";
import { isMistakeCode, type MistakeCode } from "@/lib/mistake-dna/taxonomy";

/**
 * Server-side Firestore Admin helper for `users/{uid}/mistake_dna/{errorKey}`.
 * Ensures Mistake-DNA records persist durably on every graded exam, Schreiben,
 * Sprechen, workbook, or SM-2 drill review — even for cookie-authenticated sessions.
 */
export async function listMistakeDnaAdmin(uid: string): Promise<MistakeDnaRecord[]> {
  if (!uid) return [];
  const db = await getFirebaseAdminFirestore();
  if (!db) return [];
  try {
    const snap = await db.collection("users").doc(uid).collection("mistake_dna").get();
    const records: MistakeDnaRecord[] = [];
    snap.forEach((docSnap) => {
      const d = docSnap.data() as Partial<MistakeDnaRecord>;
      if (d && isMistakeCode(d.errorKey)) {
        records.push({
          errorKey: d.errorKey,
          uid,
          occurrences: Number(d.occurrences || 0),
          streak: Number(d.streak || 0),
          repetitions: Number(d.repetitions || 0),
          easeFactor: Number(d.easeFactor || 2.5),
          intervalDays: Number(d.intervalDays || 0),
          nextReviewAt:
            typeof d.nextReviewAt === "string" ? d.nextReviewAt : new Date().toISOString(),
          lastSeenAt: typeof d.lastSeenAt === "string" ? d.lastSeenAt : new Date().toISOString(),
          lastSource: d.lastSource || "drill",
          recentSamples: Array.isArray(d.recentSamples) ? d.recentSamples.slice(0, 3) : [],
          mastered: Boolean(d.mastered),
          updatedAt: typeof d.updatedAt === "string" ? d.updatedAt : new Date().toISOString(),
        });
      }
    });
    return records;
  } catch (err) {
    console.warn("[GTF Mistake-DNA] Admin list warning:", err);
    return [];
  }
}

export async function recordMistakeOccurrencesAdmin(
  uid: string,
  occurrences: MistakeOccurrenceInput[],
): Promise<boolean> {
  if (!uid) return false;
  const valid = occurrences.filter((o) => isMistakeCode(o.errorKey));
  if (valid.length === 0) return true;

  const db = await getFirebaseAdminFirestore();
  if (!db) return false;

  try {
    const grouped = new Map<MistakeCode, MistakeOccurrenceInput[]>();
    for (const occ of valid) {
      const list = grouped.get(occ.errorKey) || [];
      list.push(occ);
      grouped.set(occ.errorKey, list);
    }

    const col = db.collection("users").doc(uid).collection("mistake_dna");
    const nowMs = Date.now();

    await Promise.all(
      Array.from(grouped.entries()).map(async ([errorKey, items]) => {
        const ref = col.doc(errorKey);
        const snap = await ref.get();
        let current = snap.exists ? (snap.data() as MistakeDnaRecord) : null;
        for (const item of items) {
          current = mergeMistakeOccurrence(current, uid, item, nowMs);
        }
        if (current) {
          await ref.set(current, { merge: true });
        }
      }),
    );
    return true;
  } catch (err) {
    console.warn("[GTF Mistake-DNA] Admin record warning:", err);
    return false;
  }
}

export async function applySm2ReviewAdmin(
  uid: string,
  errorKey: MistakeCode,
  quality: Sm2Quality,
): Promise<MistakeDnaRecord | null> {
  if (!uid || !isMistakeCode(errorKey)) return null;
  const db = await getFirebaseAdminFirestore();
  if (!db) return null;

  try {
    const ref = db.collection("users").doc(uid).collection("mistake_dna").doc(errorKey);
    const snap = await ref.get();
    const existing = snap.exists ? (snap.data() as MistakeDnaRecord) : null;
    const updated = applySm2Review(existing, { uid, errorKey, quality });
    await ref.set(updated, { merge: true });
    return updated;
  } catch (err) {
    console.warn("[GTF Mistake-DNA] Admin SM-2 review warning:", err);
    return null;
  }
}

/**
 * Deletes all `users/{uid}/mistake_dna/*` subcollection documents (GDPR Art. 17 erasure).
 */
export async function deleteAllMistakeDnaAdmin(uid: string): Promise<void> {
  if (!uid) return;
  const db = await getFirebaseAdminFirestore();
  if (!db) return;
  try {
    const snap = await db.collection("users").doc(uid).collection("mistake_dna").get();
    if (snap.empty) return;
    await Promise.all(snap.docs.map((d) => d.ref.delete()));
  } catch (err) {
    console.warn("[GTF Mistake-DNA] Admin delete warning:", err);
  }
}
