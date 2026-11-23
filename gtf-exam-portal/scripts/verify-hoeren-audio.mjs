#!/usr/bin/env node
/**
 * GTF Hören audio-binding verifier — fails (exit 1) on ANY audio ↔ exercise mismatch risk.
 *
 * Checks
 *  1. Core Labs: every `skill: "hoeren"` lab in lib/curriculum-labs.ts has a script in
 *     data/hoeren-lab-scripts.json, its audioUrl is exactly /audio/hoeren/labs/<id>.mp3,
 *     the MP3 exists, and AUDIO_MANIFEST.json holds the SHA-256 of the CURRENT script.
 *  2. Exam teile (data/gtf-*.json, data/question_banks/*.json, data/sample-*.json): each teil
 *     has an audioUrl whose MP3 exists; if it was rendered by our generator, its script hash
 *     must still match.
 *  3. No recycling: one MP3 may only be shared by exercises whose scripts are identical.
 *  4. Catalog workbooks (data/catalog.json) with audio: file exists and is not shared.
 *  5. Code guard: no level/index-based audio path synthesis (e.g. `${level}_hoeren_0${n}`).
 *
 *   node scripts/verify-hoeren-audio.mjs
 */
import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const PORTAL = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const PUB = path.join(PORTAL, "public");
const DATA = path.join(PORTAL, "data");
const manifestPath = path.join(PUB, "audio", "hoeren", "AUDIO_MANIFEST.json");
const manifest = fs.existsSync(manifestPath) ? JSON.parse(fs.readFileSync(manifestPath, "utf8")).files : {};

const errors = [];
const ok = [];
const fail = (m) => errors.push(m);
const fileFor = (url) => path.join(PUB, ...url.replace(/^\//, "").split("/"));
const norm = (s) => String(s || "").replace(/\s+/g, " ").trim();

/** Must stay byte-identical to script_hash() in scripts/generate-hoeren-audio.py */
function scriptHash(announcement, turns) {
  const canon = JSON.stringify({
    announcement: String(announcement || "").trim(),
    turns: turns.map((t) => [String(t.speaker).trim(), String(t.text).trim()]),
  });
  return crypto.createHash("sha256").update(canon, "utf8").digest("hex");
}

const usage = new Map(); // audioUrl -> [{ owner, text }]
const use = (url, owner, text) => {
  if (!usage.has(url)) usage.set(url, []);
  usage.get(url).push({ owner, text: norm(text) });
};

// ── 1. Core Labs ────────────────────────────────────────────────────────────
const labScripts = JSON.parse(fs.readFileSync(path.join(DATA, "hoeren-lab-scripts.json"), "utf8"));
const labsSrc = fs.readFileSync(path.join(PORTAL, "lib", "curriculum-labs.ts"), "utf8");
const blocks = [...labsSrc.matchAll(/id: "((?:a1|a2|b1|b2)-lab-[a-z0-9-]+)",[\s\S]*?audioUrl: "([^"]*)",\s*skill: "(\w+)"/g)];
const hoerenLabIds = new Set();
for (const [, id, audioUrl, skill] of blocks) {
  if (skill !== "hoeren") continue;
  hoerenLabIds.add(id);
  const expected = `/audio/hoeren/labs/${id}.mp3`;
  const script = labScripts[id];
  if (!script) { fail(`LAB ${id}: no script in data/hoeren-lab-scripts.json`); continue; }
  if (audioUrl !== expected) fail(`LAB ${id}: audioUrl "${audioUrl}" ≠ "${expected}"`);
  if (!fs.existsSync(fileFor(expected))) { fail(`LAB ${id}: missing ${expected}`); continue; }
  const h = scriptHash(script.announcement, script.turns);
  if (manifest[expected]?.scriptSha256 !== h) fail(`LAB ${id}: audio is stale/unknown for current script (re-run generate-hoeren-audio.py --labs ${id})`);
  else ok.push(`LAB  ${id}`);
  use(expected, `lab:${id}`, script.turns.map((t) => t.text).join(" "));
}
for (const id of Object.keys(labScripts)) {
  if (!hoerenLabIds.has(id)) fail(`SCRIPT ${id}: registered script has no matching Hören lab`);
}

// ── 2. Exam teile ───────────────────────────────────────────────────────────
const examFiles = [
  ...fs.readdirSync(DATA).filter((f) => /^(gtf-|sample-).*\.json$/.test(f)).map((f) => path.join(DATA, f)),
  ...fs.readdirSync(path.join(DATA, "question_banks")).filter((f) => f.endsWith(".json")).map((f) => path.join(DATA, "question_banks", f)),
];
for (const f of examFiles) {
  let test;
  try { test = JSON.parse(fs.readFileSync(f, "utf8")); } catch { continue; }
  const teile = test?.sections?.hoeren?.teile;
  if (!Array.isArray(teile)) continue;
  const rel = path.relative(DATA, f).replace(/\\/g, "/");
  for (const teil of teile) {
    const owner = `exam:${rel}#${teil.id}`;
    if (!teil.audioUrl) { fail(`${owner}: no audioUrl`); continue; }
    if (!fs.existsSync(fileFor(teil.audioUrl))) { fail(`${owner}: missing file ${teil.audioUrl}`); continue; }
    const m = manifest[teil.audioUrl];
    if (m && m.source.startsWith("exam:")) {
      const ann = `${test.title || test.id}. ${teil.title || ""}. ${teil.instructions || ""}`.trim();
      if (m.scriptSha256 !== scriptHash(ann, teil.script || [])) fail(`${owner}: rendered audio no longer matches its script`);
    }
    if (teil.audio?.localFile) {
      const lf = teil.audio.localFile.replace(/\\/g, "/");
      if (!teil.audioUrl.endsWith("/" + lf) && !teil.audioUrl.endsWith(lf)) fail(`${owner}: audio.localFile "${lf}" ≠ audioUrl "${teil.audioUrl}"`);
    }
    use(teil.audioUrl, owner, (teil.script || []).map((s) => s.text).join(" "));
    ok.push(`TEIL ${rel}#${teil.id}`);
  }
}

// ── 4. Catalog workbooks ────────────────────────────────────────────────────
const catalog = JSON.parse(fs.readFileSync(path.join(DATA, "catalog.json"), "utf8"));
for (const wb of catalog.workbooks || []) {
  if (!wb.audioUrl) continue;
  if (!fs.existsSync(fileFor(wb.audioUrl))) { fail(`WB ${wb.id}: missing file ${wb.audioUrl}`); continue; }
  use(wb.audioUrl, `wb:${wb.id}`, wb.hoerenTranscript ? wb.hoerenTranscript.map((t) => t.text).join(" ") : `__wb:${wb.id}`);
  ok.push(`WB   ${wb.id}`);
}

// ── 3. Recycling check ──────────────────────────────────────────────────────
for (const [url, owners] of usage) {
  const distinct = new Set(owners.map((o) => o.text));
  if (owners.length > 1 && distinct.size > 1) {
    fail(`SHARED AUDIO ${url} is used by exercises with DIFFERENT scripts: ${owners.map((o) => o.owner).join(", ")}`);
  }
}

// ── 5. Code guard ───────────────────────────────────────────────────────────
const guardRe = /audio\/hoeren\/\$\{[^}]+\}_hoeren_|_hoeren_0?\$\{|daf_\$\{[^}]+\}_hoeren_/;
const walk = (d) => fs.readdirSync(d, { withFileTypes: true }).flatMap((e) =>
  e.isDirectory() ? walk(path.join(d, e.name)) : /\.(tsx?|mjs)$/.test(e.name) ? [path.join(d, e.name)] : []);
for (const dir of ["app", "components", "lib"]) {
  for (const f of walk(path.join(PORTAL, dir))) {
    fs.readFileSync(f, "utf8").split(/\r?\n/).forEach((line, i) => {
      if (guardRe.test(line)) fail(`CODE ${path.relative(PORTAL, f)}:${i + 1}: positional audio path synthesis → ${line.trim()}`);
    });
  }
}

console.log(`Verified ${ok.length} bindings.`);
if (errors.length) {
  console.error(`\n✖ ${errors.length} Hören audio binding problem(s):\n - ` + errors.join("\n - "));
  process.exit(1);
}
console.log("✔ Every Hören exercise is bound to the audio rendered from its own script.");
