import type { ScriptLine } from "./types";
import hoerenLabScriptsJson from "@/data/hoeren-lab-scripts.json";

/**
 * ─────────────────────────────────────────────────────────────────────────────
 * HÖREN LAB SCRIPT REGISTRY — single source of truth for Core-Lab audio
 * ─────────────────────────────────────────────────────────────────────────────
 *
 * Every `exam_hoeren` Core Lab is bound to its audio STRICTLY by lab ID:
 *
 *   lab.id  ──►  data/hoeren-lab-scripts.json[lab.id]   (Hörtext / transcript)
 *           ──►  /audio/hoeren/labs/<lab.id>.mp3         (rendered from exactly that script)
 *
 * No shared/recycled MP3s, no array-index or level-number guessing.
 *  - `scripts/generate-hoeren-audio.py`  renders the MP3s from the same JSON and records a
 *    SHA-256 of every script in public/audio/hoeren/AUDIO_MANIFEST.json.
 *  - `scripts/verify-hoeren-audio.mjs`   fails if any lab/teil audioUrl, MP3 file or script
 *    hash drifts apart (e.g. a script is edited without re-rendering its audio).
 */

export interface HoerenLabScript {
  /** Spoken exam announcement (Prüfungsansage) rendered before the dialogue. */
  announcement: string;
  turns: ScriptLine[];
}

export const HOEREN_LAB_AUDIO_DIR = "/audio/hoeren/labs";

export function hoerenLabAudioUrl(labId: string): string {
  return `${HOEREN_LAB_AUDIO_DIR}/${labId}.mp3`;
}

export const HOEREN_LAB_SCRIPTS: Record<string, HoerenLabScript> =
  hoerenLabScriptsJson as unknown as Record<string, HoerenLabScript>;

/** Flat transcript text (speaker-labelled), used for the "Transkript" panel and audits. */
export function hoerenScriptToText(script: HoerenLabScript): string {
  return script.turns.map((t) => `${t.speaker}: ${t.text}`).join("\n");
}
