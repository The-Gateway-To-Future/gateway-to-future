/**
 * Gateway To Future (GTF) — Smart Hören Shadowing & Cloze Dictation Engine
 *
 * Powers turn-by-turn synchronized transcript playback, A–B loop shadowing,
 * South Asian German phonetic trap diagnostics, and deterministic Lückendiktat
 * (Cloze Dictation) on top of existing `ScriptLine[]` dialogues without mutating
 * any source JSON or SHA-256 audio manifest bindings.
 */

import type { MistakeCode } from "@/lib/mistake-dna/taxonomy";
import type { ScriptLine } from "@/lib/types";

export interface TurnTimingWindow {
  index: number;
  speaker: string;
  text: string;
  startSec: number;
  endSec: number;
}

export interface ClozeTextSegment {
  kind: "text";
  text: string;
}

export interface ClozeBlankSegment {
  kind: "blank";
  id: string;
  answer: string;
  hintPrefix: string;
  mistakeCode: MistakeCode;
}

export type ClozeSegment = ClozeTextSegment | ClozeBlankSegment;

export interface ClozeTurn {
  index: number;
  speaker: string;
  rawText: string;
  segments: ClozeSegment[];
}

export interface PhoneticFocusTip {
  id: string;
  pattern: string;
  matchedWord: string;
  tipHinglish: string;
  mistakeCode: MistakeCode;
}

export interface ShadowingSimilarityResult {
  accuracyScore: number;
  pronunciationScore: number;
  fluencyScore: number;
  wordDiff: { word: string; matched: boolean }[];
  phoneticTips: PhoneticFocusTip[];
  mistakeCodes: MistakeCode[];
}

const TIME_OR_NUMBER_WORDS = new Set([
  "null",
  "eins",
  "ein",
  "eine",
  "zwei",
  "drei",
  "vier",
  "fünf",
  "sechs",
  "sieben",
  "acht",
  "neun",
  "zehn",
  "elf",
  "zwölf",
  "dreizehn",
  "vierzehn",
  "fünfzehn",
  "sechzehn",
  "siebzehn",
  "achtzehn",
  "neunzehn",
  "zwanzig",
  "dreißig",
  "vierzig",
  "fünfzig",
  "zweiundfünfzig",
  "fünfundvierzig",
  "uhr",
  "halb",
  "viertel",
  "montag",
  "dienstag",
  "mittwoch",
  "donnerstag",
  "freitag",
  "samstag",
  "sonntag",
  "heute",
  "morgen",
  "gestern",
  "euro",
  "prozent",
  "minuten",
  "stunden",
]);

const NEGATION_OR_QUALIFIER_WORDS = new Set([
  "nicht",
  "kein",
  "keine",
  "keinen",
  "keinem",
  "keiner",
  "nie",
  "niemand",
  "nichts",
  "nur",
  "erst",
  "schon",
  "noch",
  "leider",
  "doch",
  "kaum",
  "fast",
]);

const PREPOSITION_TRAP_WORDS = new Set([
  "nach",
  "zu",
  "zum",
  "zur",
  "in",
  "im",
  "ins",
  "aus",
  "bei",
  "beim",
  "mit",
  "für",
  "seit",
  "vor",
  "über",
  "auf",
  "an",
  "am",
  "ans",
  "durch",
  "ohne",
  "gegen",
]);

const STOPWORDS_SKIP = new Set([
  "ich",
  "du",
  "er",
  "sie",
  "es",
  "wir",
  "ihr",
  "und",
  "oder",
  "aber",
  "das",
  "ist",
  "sind",
  "ja",
  "ach",
  "ah",
  "oh",
  "hm",
  "herr",
  "frau",
]);

function spokenWeight(text: string): number {
  const clean = (text || "").trim();
  if (!clean) return 1;
  const punctuationPauses = (clean.match(/[.!?;:,–—-]/g) || []).length * 4;
  return Math.max(8, clean.length + punctuationPauses + 10);
}

/**
 * Estimates proportional `[startSec, endSec]` turn windows across an audio track.
 * Accounts for optional Prüfungsansage (`announcement`) spoken before turn 0.
 */
export function estimateTurnTimings(
  turns: ScriptLine[],
  totalDurationSec: number,
  announcement?: string,
): TurnTimingWindow[] {
  if (!Array.isArray(turns) || turns.length === 0) return [];
  const safeTotal = Number.isFinite(totalDurationSec) && totalDurationSec > 2 ? totalDurationSec : turns.length * 5;

  const announcementWeight = announcement && announcement.trim().length > 0
    ? spokenWeight(announcement)
    : 0;
  const turnWeights = turns.map((t) => spokenWeight(t.text));
  const sumTurnWeights = turnWeights.reduce((acc, w) => acc + w, 0);
  const totalWeight = Math.max(1, announcementWeight + sumTurnWeights);

  let cursorSec = (announcementWeight / totalWeight) * safeTotal;
  return turns.map((turn, idx) => {
    const spanSec = (turnWeights[idx] / totalWeight) * safeTotal;
    const startSec = Number(Math.max(0, cursorSec).toFixed(2));
    cursorSec += spanSec;
    const endSec = Number(
      Math.min(safeTotal, idx === turns.length - 1 ? safeTotal : cursorSec).toFixed(2),
    );
    return {
      index: idx,
      speaker: turn.speaker || `Sprecher ${idx + 1}`,
      text: turn.text || "",
      startSec,
      endSec: Math.max(startSec + 0.5, endSec),
    };
  });
}

export function findActiveTurnIndex(
  windows: TurnTimingWindow[],
  currentTimeSec: number,
): number {
  if (!windows.length) return -1;
  if (currentTimeSec < windows[0].startSec) return -1;
  for (let i = 0; i < windows.length; i++) {
    const w = windows[i];
    if (currentTimeSec >= w.startSec && currentTimeSec <= w.endSec + 0.05) {
      return i;
    }
  }
  return windows.length - 1;
}

function classifyTrapToken(word: string): { priority: number; code: MistakeCode } | null {
  const low = word.toLowerCase();
  if (/^\d+$/.test(low) || TIME_OR_NUMBER_WORDS.has(low) || /(uhr|zig|zehn|hundert|tausend)$/.test(low)) {
    return { priority: 4, code: "HOEREN_TIME_TRAP" };
  }
  if (NEGATION_OR_QUALIFIER_WORDS.has(low)) {
    return { priority: 4, code: "HOEREN_NEGATION_DIST" };
  }
  if (PREPOSITION_TRAP_WORDS.has(low)) {
    return { priority: 3, code: "PREP_ZU_NACH_IN" };
  }
  if (/[äöüß]/.test(low) && low.length >= 4) {
    return { priority: 2, code: "PRONUNCIATION_UMLAUT_CH" };
  }
  if (!STOPWORDS_SKIP.has(low) && low.length >= 6) {
    return { priority: 1, code: "LESEN_SYNONYM_PARAPHRASE" };
  }
  return null;
}

/**
 * Deterministically converts dialogue turns into interactive Cloze Dictation (`Lückendiktat`) turns,
 * prioritizing numbers/times, negations/qualifiers, prepositions, and umlaut/content words.
 */
export function buildClozeDictationTurns(
  turns: ScriptLine[],
  difficulty: "standard" | "intensive" = "standard",
): ClozeTurn[] {
  const maxBlanksPerTurn = difficulty === "intensive" ? 3 : 2;
  let globalBlankCounter = 0;

  return (turns || []).map((turn, turnIdx) => {
    const raw = turn.text || "";
    const tokenMatches = [...raw.matchAll(/[A-Za-zÄÖÜäöüß0-9]+/g)];

    // Score candidate words, skipping single-letter spelling sequences (e.g. S - H - A - R - M - A)
    const candidates = tokenMatches
      .map((m, tokIdx) => {
        const word = m[0];
        const index = m.index ?? 0;
        if (word.length < 2) return null;
        const classified = classifyTrapToken(word);
        if (!classified) return null;
        return {
          tokIdx,
          word,
          start: index,
          end: index + word.length,
          priority: classified.priority,
          code: classified.code,
        };
      })
      .filter((c): c is NonNullable<typeof c> => Boolean(c));

    // Pick top N non-adjacent candidates deterministically
    const sortedByPriority = [...candidates].sort(
      (a, b) => b.priority - a.priority || b.word.length - a.word.length || a.start - b.start,
    );
    const chosen: typeof candidates = [];
    for (const cand of sortedByPriority) {
      if (chosen.length >= maxBlanksPerTurn) break;
      const adjacent = chosen.some((picked) => Math.abs(picked.tokIdx - cand.tokIdx) <= 1);
      if (!adjacent) {
        chosen.push(cand);
      }
    }
    chosen.sort((a, b) => a.start - b.start);

    const segments: ClozeSegment[] = [];
    let cursor = 0;
    for (const c of chosen) {
      if (c.start > cursor) {
        segments.push({ kind: "text", text: raw.slice(cursor, c.start) });
      }
      globalBlankCounter += 1;
      segments.push({
        kind: "blank",
        id: `cloze-${turnIdx}-${globalBlankCounter}`,
        answer: c.word,
        hintPrefix: c.word.slice(0, 1),
        mistakeCode: c.code,
      });
      cursor = c.end;
    }
    if (cursor < raw.length) {
      segments.push({ kind: "text", text: raw.slice(cursor) });
    }
    if (segments.length === 0) {
      segments.push({ kind: "text", text: raw });
    }

    return {
      index: turnIdx,
      speaker: turn.speaker || `Sprecher ${turnIdx + 1}`,
      rawText: raw,
      segments,
    };
  });
}

export function gradeClozeBlank(given: string, expected: string): boolean {
  const g = (given || "").trim().toLowerCase();
  const e = (expected || "").trim().toLowerCase();
  if (!g || !e) return false;
  return g === e;
}

export function detectPhoneticFocusPoints(targetText: string): PhoneticFocusTip[] {
  const tips: PhoneticFocusTip[] = [];
  const words = (targetText || "").match(/[A-Za-zÄÖÜäöüß]+/g) || [];

  const ichMatch = words.find((w) => /(?:[ieäöülnr]ch|^ch)/i.test(w) && !/^(ach|buch|auch|noch|doch|woche|kuchen|machen|suchen)/i.test(w));
  if (ichMatch) {
    tips.push({
      id: "ich-laut",
      pattern: "ch (Ich-Laut [ç])",
      matchedWord: ichMatch,
      tipHinglish: `'${ichMatch}' mein 'ch' ko English 'sh' ya throat 'kh' mat bolo — tongue tip neeche daanton ke peeche rakh kar soft hiss [ç] nikalo!`,
      mistakeCode: "PRONUNCIATION_UMLAUT_CH",
    });
  }

  const umlautMatch = words.find((w) => /[äöüÄÖÜ]/.test(w));
  if (umlautMatch) {
    tips.push({
      id: "umlaut",
      pattern: "Umlaut (ä / ö / ü)",
      matchedWord: umlautMatch,
      tipHinglish: `'${umlautMatch}' mein Umlaut hai: 'ü' ke liye 'ee' bolte hue lips गोल (round) karo; 'ö' ke liye 'ay' bolte hue lips round karo!`,
      mistakeCode: "PRONUNCIATION_UMLAUT_CH",
    });
  }

  const spStMatch = words.find((w) => /^(sp|st)[a-zäöü]/i.test(w));
  if (spStMatch) {
    tips.push({
      id: "sp-st",
      pattern: "Anlaut sp- / st- ([ʃp] / [ʃt])",
      matchedWord: spStMatch,
      tipHinglish: `Word ke start mein 'sp'/'st' hamesha 'schp'/'scht' bola jaata hai — '${spStMatch}' ko 'shp/sht' sound ke saath bolo!`,
      mistakeCode: "PRONUNCIATION_UMLAUT_CH",
    });
  }

  const wMatch = words.find((w) => /^w[a-zäöü]/i.test(w));
  if (wMatch && tips.length < 3) {
    tips.push({
      id: "w-v",
      pattern: "German W ([v])",
      matchedWord: wMatch,
      tipHinglish: `'${wMatch}' mein German 'W' English 'V' jaisa hota hai (upper teeth touching lower lip), गोल English 'W' nahi!`,
      mistakeCode: "PRONUNCIATION_UMLAUT_CH",
    });
  }

  return tips.slice(0, 3);
}

function normalizeSpokenTokens(text: string): string[] {
  return (text || "")
    .toLowerCase()
    .replace(/[.,!?;:"„“‚‘()[\]–—-]/g, " ")
    .split(/\s+/)
    .map((t) => t.trim())
    .filter((t) => t.length > 0);
}

/**
 * Deterministic token alignment & similarity scorer between a spoken shadowing transcript
 * and the target German dialogue sentence.
 */
export function scoreShadowingSimilarity(
  spokenTranscript: string,
  targetText: string,
): ShadowingSimilarityResult {
  const targetDisplayWords = (targetText || "")
    .trim()
    .split(/\s+/)
    .filter(Boolean);
  const spokenSet = new Set(normalizeSpokenTokens(spokenTranscript));
  const spokenTokens = normalizeSpokenTokens(spokenTranscript);

  let matchedCount = 0;
  const wordDiff = targetDisplayWords.map((rawWord) => {
    const clean = rawWord
      .toLowerCase()
      .replace(/[.,!?;:"„“‚‘()[\]–—-]/g, "");
    const matched = clean.length === 0 ? true : spokenSet.has(clean);
    if (matched) matchedCount += 1;
    return { word: rawWord, matched };
  });

  const totalWords = Math.max(1, targetDisplayWords.length);
  const recall = matchedCount / totalWords;
  const lengthRatio =
    spokenTokens.length === 0
      ? 0
      : Math.min(1, totalWords / Math.max(totalWords, spokenTokens.length));

  const accuracyScore = Math.round(recall * 100);
  const fluencyScore = Math.round((recall * 0.7 + lengthRatio * 0.3) * 100);
  const pronunciationScore = Math.round((accuracyScore * 0.8 + fluencyScore * 0.2));

  const phoneticTips = detectPhoneticFocusPoints(targetText);
  const mistakeCodes: MistakeCode[] = [];
  if (accuracyScore < 80) {
    if (phoneticTips.length > 0) {
      mistakeCodes.push("PRONUNCIATION_UMLAUT_CH");
    }
    const missedWords = wordDiff.filter((w) => !w.matched).map((w) => w.word);
    for (const mw of missedWords) {
      const trap = classifyTrapToken(mw.replace(/[^A-Za-zÄÖÜäöüß0-9]/g, ""));
      if (trap && !mistakeCodes.includes(trap.code)) {
        mistakeCodes.push(trap.code);
      }
    }
  }

  return {
    accuracyScore,
    pronunciationScore,
    fluencyScore,
    wordDiff,
    phoneticTips,
    mistakeCodes: mistakeCodes.slice(0, 3),
  };
}
