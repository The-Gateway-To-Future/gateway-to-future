#!/usr/bin/env node
/**
 * GTF Hören data repair — re-binds every mismatched Hören exercise to the audio that was
 * rendered from ITS OWN script, and aligns transcripts with what the recordings actually say.
 *
 * Idempotent: safe to run repeatedly.
 *   node scripts/repair-hoeren-bindings.mjs
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const PORTAL = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const DATA = path.join(PORTAL, "data");
const QUEUE = path.join(PORTAL, "..", "content-factory", "syllabi", "daf_audio_exams_queue.json");
const COURSE_TTS = path.join(PORTAL, "..", "content-factory", "generate_course_audio_tts.py");

const readJson = (p) => JSON.parse(fs.readFileSync(p, "utf8"));
const writeJson = (p, j) => fs.writeFileSync(p, JSON.stringify(j, null, 2) + "\n", "utf8");
const log = (...a) => console.log(...a);

// ── 1. Modelltest 2 (A1/A2/B1/B2): teile were pointing at recycled daf_* / a2_hoeren_0x tracks
//       whose content contradicts the questions. Bind to the per-teil renders.
for (const f of ["gtf-a1-modelltest-2.json", "gtf-a2-modelltest-2.json", "gtf-b1-modelltest-2.json", "gtf-b2-modelltest-2.json"]) {
  const p = path.join(DATA, f);
  const test = readJson(p);
  for (const teil of test.sections.hoeren.teile) {
    const rel = `exams/${test.id}/${teil.id}.mp3`;
    const url = `/audio/hoeren/${rel}`;
    if (teil.audioUrl !== url) log(`[MT2] ${f}#${teil.id}: ${teil.audioUrl} -> ${url}`);
    teil.audioUrl = url;
    teil.audio = { localFile: rel };
  }
  writeJson(p, test);
}

// ── 2. question_banks/daf_a1.json carries the Modelltest-1 scripts but pointed at daf_a1_hoeren_0x
//       (Hauptbahnhof Gleis 16 / Bäckerei). Re-bind to the Modelltest-1 renders of the same script.
{
  const p = path.join(DATA, "question_banks", "daf_a1.json");
  const qb = readJson(p);
  const map = { "hoeren-1": "a1_hoeren_01.mp3", "hoeren-2": "a1_hoeren_02.mp3" };
  for (const teil of qb.sections.hoeren.teile) {
    const file = map[teil.id];
    if (!file) continue;
    const url = `/audio/hoeren/${file}`;
    if (teil.audioUrl !== url) log(`[daf_a1.json] ${teil.id}: ${teil.audioUrl} -> ${url}`);
    teil.audioUrl = url;
    teil.audio = { ...(teil.audio || {}), localFile: file };
    delete teil.audio.drivePath;
  }
  writeJson(p, qb);
}

// ── 3. Studienkolleg + Ausbildung Pflege: audio is correct, but the shown transcript was an
//       abbreviated paraphrase. Replace with the exact spoken text from the TTS manifest.
{
  const py = fs.readFileSync(COURSE_TTS, "utf8");
  const spoken = {};
  for (const m of py.matchAll(/"filename":\s*"([^"]+)"[\s\S]*?"text":\s*\(([\s\S]*?)\)\s*\n\s*\}/g)) {
    spoken[m[1]] = [...m[2].matchAll(/"((?:[^"\\]|\\.)*)"/g)].map((x) => x[1]).join("").replace(/\s+/g, " ").trim();
  }
  const files = [
    "gtf-g_kurs-modelltest-1.json", "gtf-m_kurs-modelltest-1.json", "gtf-t_kurs-modelltest-1.json", "gtf-w_kurs-modelltest-1.json",
    "gtf-ausbildung-modelltest-1.json", "gtf-ausbildung_pflege-modelltest-1.json",
    "question_banks/stk_g_kurs.json", "question_banks/stk_m_kurs.json", "question_banks/stk_t_kurs.json", "question_banks/stk_w_kurs.json",
    "question_banks/ausbildung_pflege.json",
  ];
  for (const f of files) {
    const p = path.join(DATA, f);
    const test = readJson(p);
    for (const teil of test.sections.hoeren.teile) {
      const file = path.basename(teil.audioUrl || "");
      const text = spoken[file];
      if (!text) { log(`[STK/Pflege] WARN no spoken text for ${f}#${teil.id} (${file})`); continue; }
      const speaker = teil.script?.[0]?.speaker || "Sprecher";
      const voice = teil.script?.[0]?.voice || "female";
      const before = (teil.script || []).map((s) => s.text).join(" ");
      if (before !== text) log(`[STK/Pflege] ${f}#${teil.id}: transcript aligned to ${file}`);
      teil.script = [{ speaker, voice, text }];
    }
    writeJson(p, test);
  }
}

// ── 4. catalog.json DaF audio workbooks: questions were generic grammar placeholders unrelated to
//       the recording, and daf-a1-hoeren-03 played a1_hoeren_01 (Bahnhof) instead of its own
//       Neukölln flat viewing. Bind audio + prepend the queue's audio-based Hörverstehen tasks.
{
  const p = path.join(DATA, "catalog.json");
  const catalog = readJson(p);
  const queueRaw = readJson(QUEUE);
  const queue = Array.isArray(queueRaw) ? queueRaw : Object.values(queueRaw).find(Array.isArray);
  for (const wb of catalog.workbooks || []) {
    const m = wb.id.match(/^daf-audio-exams-(daf-[ab][12]-hoeren-\d{2})$/);
    if (!m) continue;
    const queueId = m[1].replace(/-/g, "_");
    const item = queue.find((x) => x.id === queueId);
    if (!item) { log(`[catalog] WARN no queue item for ${wb.id}`); continue; }
    const url = `/audio/hoeren/${queueId}.mp3`;
    if (wb.audioUrl !== url) log(`[catalog] ${wb.id}: ${wb.audioUrl} -> ${url}`);
    wb.audioUrl = url;
    wb.skill = "hoeren";
    wb.contentType = "exam_hoeren";
    wb.hoerenTranscript = item.dialogue.map((d) => ({ speaker: d.speaker, voice: d.voice || "female", text: d.text }));

    const hv = (item.questions || []).map((q, i) => {
      const isRF = q.type === "richtig_falsch";
      const prompt = isRF ? `${q.statement} (Richtig oder Falsch?)` : q.question;
      const options = isRF
        ? [{ id: "a", text: "Richtig" }, { id: "b", text: "Falsch" }]
        : Object.entries(q.options || {}).map(([k, v]) => ({ id: k.toLowerCase(), text: String(v) }));
      const answer = isRF ? (String(q.correct_answer).toLowerCase().startsWith("r") ? "a" : "b") : String(q.correct_answer).toLowerCase();
      return { id: `hv_${i + 1}`, page: 1, label: `Hörverstehen ${i + 1}`, prompt, type: "mcq", options, answer, explanation: q.explanation || "" };
    });
    const rest = (wb.questions || []).filter((q) => !String(q.id).startsWith("hv_"));
    wb.questions = [...hv, ...rest];
    wb.questionCount = wb.questions.length;
  }
  writeJson(p, catalog);
}

log("\nRepair complete.");
