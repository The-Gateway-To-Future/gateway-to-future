#!/usr/bin/env node
/**
 * Sync exercise-bound Hören audio into Firestore (`workbooks` + `materials`).
 * Field-level merge only (audioUrl, hoerenTranscript, and for DaF audio workbooks the
 * audio-based questions). Every change is printed. Use --dry-run to preview.
 *
 *   node scripts/sync-hoeren-firestore.mjs [--dry-run]
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { cert, initializeApp } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";

const PORTAL = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const DRY = process.argv.includes("--dry-run");
const sa = JSON.parse(fs.readFileSync(path.join(PORTAL, "firebase-service-account.json"), "utf8"));
const db = getFirestore(initializeApp({ credential: cert(sa), projectId: sa.project_id }));

const coreLabs = JSON.parse(fs.readFileSync(path.join(PORTAL, "data", "all_core_labs.json"), "utf8"));
const catalog = JSON.parse(fs.readFileSync(path.join(PORTAL, "data", "catalog.json"), "utf8"));

const targets = new Map(); // docId -> patch
for (const lab of coreLabs) {
  targets.set(lab.id, { audioUrl: lab.audioUrl || "", hoerenTranscript: lab.hoerenTranscript || null });
}
for (const wb of catalog.workbooks || []) {
  if (!/^daf-audio-exams-daf-/.test(wb.id)) continue;
  targets.set(wb.id, {
    audioUrl: wb.audioUrl,
    hoerenTranscript: wb.hoerenTranscript || null,
    questions: wb.questions,
    questionCount: wb.questions.length,
  });
}

let changed = 0;
for (const col of ["workbooks", "materials"]) {
  for (const [id, patch] of targets) {
    const ref = db.collection(col).doc(id);
    const snap = await ref.get();
    if (!snap.exists) continue;
    const cur = snap.data();
    const diff = {};
    for (const [k, v] of Object.entries(patch)) {
      if (JSON.stringify(cur[k] ?? null) !== JSON.stringify(v ?? null)) diff[k] = v;
    }
    if (!Object.keys(diff).length) continue;
    changed++;
    console.log(`${DRY ? "[dry] " : ""}${col}/${id}: ` + Object.keys(diff).map((k) =>
      k === "audioUrl" ? `audioUrl ${cur.audioUrl || "(none)"} -> ${diff.audioUrl || "(none)"}` : k).join(", "));
    if (!DRY) await ref.set({ ...diff, updatedAt: new Date() }, { merge: true });
  }
}
console.log(`\n${DRY ? "Would update" : "Updated"} ${changed} Firestore doc(s).`);
