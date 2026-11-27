"use client";

import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  CheckCircle2,
  Gauge,
  Headphones,
  Loader2,
  Mic,
  Pause,
  Play,
  Repeat,
  RotateCcw,
  Sparkles,
  Square,
  Volume2,
  XCircle,
} from "lucide-react";
import { useAuth } from "@/lib/auth-context";
import { resolveProgressUid } from "@/lib/firebase/progress";
import {
  buildClozeDictationTurns,
  detectPhoneticFocusPoints,
  estimateTurnTimings,
  findActiveTurnIndex,
  gradeClozeBlank,
  type ClozeBlankSegment,
  type PhoneticFocusTip,
} from "@/lib/hoeren-shadowing";
import { recordMistakeOccurrences } from "@/lib/mistake-dna/store";
import type { MistakeCode } from "@/lib/mistake-dna/taxonomy";
import type { ScriptLine } from "@/lib/types";

const SPEEDS = [0.75, 0.9, 1.0, 1.15] as const;
const UMLAUTS = ["ä", "ö", "ü", "ß"] as const;

interface ShadowingEvalResponse {
  ok: boolean;
  mode?: string;
  transcript: string;
  accuracyScore: number;
  pronunciationScore: number;
  fluencyScore: number;
  wordDiff: { word: string; matched: boolean }[];
  phoneticTips: PhoneticFocusTip[];
  aiCoachingTips?: string[];
  mistakeCodes: MistakeCode[];
  error?: string;
}

export interface HoerenShadowingStudioProps {
  audioSrc: string;
  turns: ScriptLine[];
  announcement?: string;
  levelHint?: string;
  title?: string;
  defaultCollapsed?: boolean;
}

export function HoerenShadowingStudio({
  audioSrc,
  turns,
  announcement,
  levelHint = "b1",
  title = "Smart Shadowing & Cloze Dictation Studio",
  defaultCollapsed = false,
}: HoerenShadowingStudioProps) {
  const { user } = useAuth();
  const uid = useMemo(() => resolveProgressUid(user), [user]);

  const [collapsed, setCollapsed] = useState(defaultCollapsed);
  const [studioTab, setStudioTab] = useState<"shadow" | "dictation">("shadow");
  const [playbackRate, setPlaybackRate] = useState<number>(1.0);
  const [durationSec, setDurationSec] = useState<number>(0);
  const [currentTimeSec, setCurrentTimeSec] = useState<number>(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [selectedTurnIdx, setSelectedTurnIdx] = useState<number>(0);
  const [loopTurn, setLoopTurn] = useState<boolean>(false);

  // Mic Recording & Shadowing Evaluation State
  const [isRecording, setIsRecording] = useState(false);
  const [recordedBlob, setRecordedBlob] = useState<Blob | null>(null);
  const [recordedUrl, setRecordedUrl] = useState<string>("");
  const [liveSpeechDraft, setLiveSpeechDraft] = useState<string>("");
  const [evaluatingShadow, setEvaluatingShadow] = useState(false);
  const [shadowResult, setShadowResult] = useState<ShadowingEvalResponse | null>(null);
  const [shadowError, setShadowError] = useState<string | null>(null);

  // Cloze Dictation State
  const [clozeDifficulty, setClozeDifficulty] = useState<"standard" | "intensive">("standard");
  const [clozeInputs, setClozeInputs] = useState<Record<string, string>>({});
  const [focusedBlankId, setFocusedBlankId] = useState<string | null>(null);
  const [clozeGraded, setClozeGraded] = useState(false);

  const audioRef = useRef<HTMLAudioElement | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const speechRecRef = useRef<{ stop: () => void } | null>(null);
  const chunksRef = useRef<BlobPart[]>([]);

  const turnWindows = useMemo(
    () => estimateTurnTimings(turns, durationSec, announcement),
    [turns, durationSec, announcement],
  );

  const syncedTurnIdx = useMemo(
    () => findActiveTurnIndex(turnWindows, currentTimeSec),
    [turnWindows, currentTimeSec],
  );

  const activeTurn = turns[selectedTurnIdx] || turns[0];
  const activePhoneticFocus = useMemo(
    () => (activeTurn ? detectPhoneticFocusPoints(activeTurn.text) : []),
    [activeTurn],
  );

  const clozeTurns = useMemo(
    () => buildClozeDictationTurns(turns, clozeDifficulty),
    [turns, clozeDifficulty],
  );

  const allClozeBlanks = useMemo(() => {
    const list: { turnIdx: number; blank: ClozeBlankSegment }[] = [];
    for (const ct of clozeTurns) {
      for (const seg of ct.segments) {
        if (seg.kind === "blank") {
          list.push({ turnIdx: ct.index, blank: seg });
        }
      }
    }
    return list;
  }, [clozeTurns]);

  // Reset per-track state when audioSrc changes
  useEffect(() => {
    setSelectedTurnIdx(0);
    setLoopTurn(false);
    setIsPlaying(false);
    setCurrentTimeSec(0);
    setDurationSec(0);
    setClozeInputs({});
    setClozeGraded(false);
    setShadowResult(null);
    setShadowError(null);
    setRecordedBlob(null);
    setRecordedUrl((prev) => {
      if (prev) URL.revokeObjectURL(prev);
      return "";
    });
  }, [audioSrc]);

  useEffect(() => {
    if (audioRef.current) {
      audioRef.current.playbackRate = playbackRate;
    }
  }, [playbackRate]);

  // Cleanup object URL and active recorder on unmount
  useEffect(() => {
    return () => {
      if (mediaRecorderRef.current && mediaRecorderRef.current.state !== "inactive") {
        mediaRecorderRef.current.stop();
      }
      speechRecRef.current?.stop();
    };
  }, []);

  const handleTimeUpdate = useCallback(() => {
    const el = audioRef.current;
    if (!el) return;
    const t = el.currentTime || 0;
    setCurrentTimeSec(t);

    if (loopTurn && turnWindows[selectedTurnIdx]) {
      const win = turnWindows[selectedTurnIdx];
      if (t >= win.endSec) {
        el.currentTime = win.startSec;
        void el.play().catch(() => {});
      }
    }
  }, [loopTurn, selectedTurnIdx, turnWindows]);

  const playSpecificTurn = (idx: number) => {
    setSelectedTurnIdx(idx);
    setShadowResult(null);
    setShadowError(null);
    const el = audioRef.current;
    const win = turnWindows[idx];
    if (!el || !win) return;
    el.playbackRate = playbackRate;
    el.currentTime = win.startSec;
    void el.play().catch(() => {});
  };

  const toggleMasterPlay = () => {
    const el = audioRef.current;
    if (!el) return;
    el.playbackRate = playbackRate;
    if (el.paused) {
      void el.play().catch(() => {});
    } else {
      el.pause();
    }
  };

  const startShadowRecording = async () => {
    setShadowError(null);
    setShadowResult(null);
    setLiveSpeechDraft("");

    if (typeof navigator === "undefined" || !navigator.mediaDevices?.getUserMedia) {
      setShadowError("Mikrofon wird in diesem Browser nicht unterstützt.");
      return;
    }

    try {
      // Pause source audio so mic captures student voice cleanly
      audioRef.current?.pause();
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      chunksRef.current = [];
      const mr = new MediaRecorder(stream);
      mediaRecorderRef.current = mr;

      mr.ondataavailable = (ev) => {
        if (ev.data && ev.data.size > 0) chunksRef.current.push(ev.data);
      };
      mr.onstop = () => {
        stream.getTracks().forEach((tr) => tr.stop());
        const blob = new Blob(chunksRef.current, { type: mr.mimeType || "audio/webm" });
        setRecordedBlob(blob);
        setRecordedUrl((prev) => {
          if (prev) URL.revokeObjectURL(prev);
          return URL.createObjectURL(blob);
        });
      };

      // Optional Web Speech live caption assist (Chrome / Android WebView)
      const w = window as unknown as {
        SpeechRecognition?: new () => {
          lang: string;
          interimResults: boolean;
          continuous: boolean;
          onresult: ((e: { results: ArrayLike<ArrayLike<{ transcript: string }>> }) => void) | null;
          onerror: (() => void) | null;
          start: () => void;
          stop: () => void;
        };
        webkitSpeechRecognition?: new () => {
          lang: string;
          interimResults: boolean;
          continuous: boolean;
          onresult: ((e: { results: ArrayLike<ArrayLike<{ transcript: string }>> }) => void) | null;
          onerror: (() => void) | null;
          start: () => void;
          stop: () => void;
        };
      };
      const SpeechCtor = w.SpeechRecognition || w.webkitSpeechRecognition;
      if (SpeechCtor) {
        try {
          const rec = new SpeechCtor();
          rec.lang = "de-DE";
          rec.interimResults = true;
          rec.continuous = true;
          rec.onresult = (ev) => {
            let text = "";
            for (let i = 0; i < ev.results.length; i++) {
              text += (ev.results[i]?.[0]?.transcript || "") + " ";
            }
            setLiveSpeechDraft(text.trim());
          };
          rec.onerror = () => {};
          rec.start();
          speechRecRef.current = rec;
        } catch {
          // ignore if speech recognition unsupported
        }
      }

      mr.start();
      setIsRecording(true);
    } catch {
      setShadowError(
        "Mikrofonzugriff verweigert. Bitte erlauben Sie das Mikrofon oder nutzen Sie die Texteingabe unten.",
      );
    }
  };

  const stopShadowRecording = () => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== "inactive") {
      mediaRecorderRef.current.stop();
    }
    speechRecRef.current?.stop();
    setIsRecording(false);
  };

  const evaluateShadowAttempt = async () => {
    if (!activeTurn) return;
    setEvaluatingShadow(true);
    setShadowError(null);

    try {
      const form = new FormData();
      form.set("targetText", activeTurn.text);
      form.set("level", levelHint);
      if (liveSpeechDraft.trim()) {
        form.set("clientTranscript", liveSpeechDraft.trim());
      }
      if (recordedBlob) {
        form.set("audio", recordedBlob, "shadowing.webm");
      }

      const res = await fetch("/api/ai/evaluate-shadowing", {
        method: "POST",
        credentials: "include",
        body: form,
      });
      const data = (await res.json()) as ShadowingEvalResponse;
      if (!res.ok || !data.ok) {
        setShadowError(
          data.error || "Aussprache-Analyse fehlgeschlagen. Bitte erneut aufnehmen.",
        );
        return;
      }

      setShadowResult(data);

      // Feed Mistake-DNA if phonetic/listening errors occurred
      if (uid && uid !== "gtf-guest-candidate" && Array.isArray(data.mistakeCodes) && data.mistakeCodes.length > 0) {
        void recordMistakeOccurrences(
          uid,
          data.mistakeCodes.map((code) => ({
            errorKey: code,
            source: "sprechen" as const,
            prompt: `Hören Shadowing (${activeTurn.speaker})`,
            wrong: data.transcript.slice(0, 140),
            right: activeTurn.text.slice(0, 140),
          })),
        );
      }
    } catch {
      setShadowError("Netzwerkfehler bei der Aussprache-Analyse. Bitte Verbindung prüfen.");
    } finally {
      setEvaluatingShadow(false);
    }
  };

  const clozeScore = useMemo(() => {
    let correct = 0;
    for (const item of allClozeBlanks) {
      if (gradeClozeBlank(clozeInputs[item.blank.id] || "", item.blank.answer)) {
        correct += 1;
      }
    }
    const total = allClozeBlanks.length;
    const percent = total > 0 ? Math.round((correct / total) * 100) : 0;
    return { correct, total, percent };
  }, [allClozeBlanks, clozeInputs]);

  const handleGradeCloze = () => {
    setClozeGraded(true);
    if (uid && uid !== "gtf-guest-candidate") {
      const missed = allClozeBlanks
        .filter((it) => !gradeClozeBlank(clozeInputs[it.blank.id] || "", it.blank.answer))
        .slice(0, 5)
        .map((it) => ({
          errorKey: it.blank.mistakeCode,
          source: "hoeren" as const,
          prompt: `Lückendiktat (${turns[it.turnIdx]?.speaker || "Dialog"})`,
          wrong: (clozeInputs[it.blank.id] || "___").trim() || "___",
          right: it.blank.answer,
        }));
      if (missed.length > 0) {
        void recordMistakeOccurrences(uid, missed);
      }
    }
  };

  const insertUmlautIntoBlank = (ch: string) => {
    if (!focusedBlankId) return;
    setClozeInputs((prev) => ({
      ...prev,
      [focusedBlankId]: (prev[focusedBlankId] || "") + ch,
    }));
  };

  if (!Array.isArray(turns) || turns.length === 0 || !audioSrc) {
    return null;
  }

  return (
    <div className="rounded-2xl border border-indigo-200/80 bg-white p-4 sm:p-5 shadow-sm space-y-4 text-slate-900">
      {/* Dedicated hidden studio audio element so we never interfere with parent exam player */}
      <audio
        ref={audioRef}
        src={audioSrc}
        preload="metadata"
        playsInline
        onLoadedMetadata={(e) => setDurationSec(e.currentTarget.duration || 0)}
        onTimeUpdate={handleTimeUpdate}
        onPlay={() => setIsPlaying(true)}
        onPause={() => setIsPlaying(false)}
        onEnded={() => setIsPlaying(false)}
        className="hidden"
      />

      {/* Studio Header */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 pb-3">
        <div className="flex items-center gap-2.5 min-w-0">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-indigo-50 border border-indigo-200 text-indigo-700 shrink-0">
            <Headphones className="h-4 w-4" />
          </div>
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-1.5">
              <span className="text-[10px] font-bold uppercase tracking-[0.18em] text-indigo-700">
                ÜBUNGSMODUS · ACTIVE LISTENING LAB
              </span>
              <span className="rounded-full border border-emerald-200 bg-emerald-50 px-2 py-0.5 text-[9px] font-bold uppercase tracking-wider text-emerald-700">
                Shadowing + Lückendiktat
              </span>
            </div>
            <h3 className="text-xs sm:text-sm font-bold text-slate-900 truncate">{title}</h3>
          </div>
        </div>

        <button
          type="button"
          onClick={() => setCollapsed((prev) => !prev)}
          className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-1.5 text-xs font-bold text-slate-700 hover:bg-slate-100 transition cursor-pointer"
        >
          {collapsed ? "Studio öffnen" : "Minimieren"}
        </button>
      </div>

      {!collapsed && (
        <>
          {/* Mode Tabs + Precision Speed & Loop Controls */}
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="inline-flex rounded-xl border border-slate-200 bg-slate-50 p-1">
              <button
                type="button"
                onClick={() => setStudioTab("shadow")}
                className={`rounded-lg px-3 py-1.5 text-xs font-bold transition cursor-pointer ${
                  studioTab === "shadow"
                    ? "bg-slate-900 text-white shadow-xs"
                    : "text-slate-600 hover:text-slate-900"
                }`}
              >
                1. Turn Shadowing
              </button>
              <button
                type="button"
                onClick={() => setStudioTab("dictation")}
                className={`rounded-lg px-3 py-1.5 text-xs font-bold transition cursor-pointer ${
                  studioTab === "dictation"
                    ? "bg-slate-900 text-white shadow-xs"
                    : "text-slate-600 hover:text-slate-900"
                }`}
              >
                2. Cloze Dictation ({allClozeBlanks.length})
              </button>
            </div>

            <div className="flex flex-wrap items-center gap-1.5">
              <button
                type="button"
                onClick={toggleMasterPlay}
                className="inline-flex items-center gap-1.5 rounded-xl bg-indigo-600 px-3 py-1.5 text-xs font-bold text-white hover:bg-indigo-700 transition cursor-pointer"
              >
                {isPlaying ? <Pause className="h-3.5 w-3.5" /> : <Play className="h-3.5 w-3.5" />}
                <span>{isPlaying ? "Pause" : "Play Dialog"}</span>
              </button>

              <button
                type="button"
                onClick={() => setLoopTurn((prev) => !prev)}
                className={`inline-flex items-center gap-1 rounded-xl border px-2.5 py-1.5 text-[11px] font-bold transition cursor-pointer ${
                  loopTurn
                    ? "border-amber-400 bg-amber-50 text-amber-900"
                    : "border-slate-200 bg-white text-slate-600 hover:bg-slate-50"
                }`}
                title="Ausgewählten Sprecher-Satz in Endlosschleife wiederholen"
              >
                <Repeat className="h-3.5 w-3.5" />
                <span>A–B Loop</span>
              </button>

              <div className="inline-flex items-center gap-1 rounded-xl border border-slate-200 bg-slate-50 px-2 py-1">
                <Gauge className="h-3 w-3 text-slate-500" />
                {SPEEDS.map((spd) => (
                  <button
                    key={spd}
                    type="button"
                    onClick={() => setPlaybackRate(spd)}
                    className={`rounded-md px-1.5 py-0.5 text-[10px] font-bold transition cursor-pointer ${
                      playbackRate === spd
                        ? "bg-slate-900 text-white"
                        : "text-slate-600 hover:text-slate-900"
                    }`}
                  >
                    {spd}x
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* ══════════════════ TAB 1: TURN-BY-TURN SHADOWING & MIC COACH ══════════════════ */}
          {studioTab === "shadow" && (
            <div className="space-y-4">
              <div className="max-h-72 overflow-y-auto space-y-2 pr-1">
                {turns.map((line, idx) => {
                  const isSelected = idx === selectedTurnIdx;
                  const isLivePlaying = isPlaying && idx === syncedTurnIdx;
                  return (
                    <div
                      key={`sh-turn-${idx}`}
                      onClick={() => playSpecificTurn(idx)}
                      role="button"
                      tabIndex={0}
                      onKeyDown={(e) => {
                        if (e.key === "Enter" || e.key === " ") {
                          e.preventDefault();
                          playSpecificTurn(idx);
                        }
                      }}
                      className={`rounded-xl border p-3 text-xs transition cursor-pointer ${
                        isLivePlaying
                          ? "border-indigo-500 bg-indigo-50/80 ring-1 ring-indigo-400"
                          : isSelected
                            ? "border-slate-900 bg-slate-50"
                            : "border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50/60"
                      }`}
                    >
                      <div className="flex items-center justify-between gap-2 mb-1">
                        <span className="font-bold uppercase tracking-wider text-[10px] text-indigo-700">
                          {line.speaker} · Turn {idx + 1}
                        </span>
                        <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-slate-500">
                          <Volume2 className="h-3 w-3 text-indigo-600" />
                          <span>{isLivePlaying ? "Spielt gerade…" : "Satz anhören"}</span>
                        </span>
                      </div>
                      <p className="text-slate-800 leading-relaxed font-medium german-reading">
                        {line.text}
                      </p>
                    </div>
                  );
                })}
              </div>

              {/* Selected Turn Shadowing Recorder & AI Phonetics Coach */}
              {activeTurn && (
                <div className="rounded-2xl border border-slate-200 bg-slate-50/90 p-4 space-y-3">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div>
                      <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500">
                        AKTIVER SHADOWING-SATZ (TURN {selectedTurnIdx + 1} · {activeTurn.speaker})
                      </span>
                      <p className="text-xs sm:text-sm font-bold text-slate-900 mt-0.5 german-reading">
                        „{activeTurn.text}“
                      </p>
                    </div>

                    <div className="flex flex-wrap items-center gap-2">
                      <button
                        type="button"
                        onClick={() => playSpecificTurn(selectedTurnIdx)}
                        className="inline-flex items-center gap-1.5 rounded-xl border border-slate-300 bg-white px-3 py-1.5 text-xs font-bold text-slate-800 hover:bg-slate-100 transition cursor-pointer"
                      >
                        <Volume2 className="h-3.5 w-3.5 text-indigo-600" />
                        <span>1. Vorhören</span>
                      </button>

                      {!isRecording ? (
                        <button
                          type="button"
                          onClick={startShadowRecording}
                          className="inline-flex items-center gap-1.5 rounded-xl bg-rose-600 px-3 py-1.5 text-xs font-bold text-white hover:bg-rose-700 transition cursor-pointer"
                        >
                          <Mic className="h-3.5 w-3.5" />
                          <span>2. Nachsprechen</span>
                        </button>
                      ) : (
                        <button
                          type="button"
                          onClick={stopShadowRecording}
                          className="inline-flex items-center gap-1.5 rounded-xl bg-slate-900 px-3 py-1.5 text-xs font-bold text-white animate-pulse cursor-pointer"
                        >
                          <Square className="h-3 w-3" />
                          <span>Stopp Aufnahme</span>
                        </button>
                      )}
                    </div>
                  </div>

                  {/* South Asian Phonetic Trap Pre-Briefing */}
                  {activePhoneticFocus.length > 0 && (
                    <div className="flex flex-wrap gap-1.5">
                      {activePhoneticFocus.map((tip) => (
                        <span
                          key={tip.id}
                          title={tip.tipHinglish}
                          className="inline-flex items-center gap-1 rounded-lg border border-amber-200 bg-amber-50 px-2.5 py-1 text-[11px] font-medium text-amber-900"
                        >
                          <Sparkles className="h-3 w-3 text-amber-600 shrink-0" />
                          <span>
                            <strong>{tip.pattern}:</strong> {tip.matchedWord}
                          </span>
                        </span>
                      ))}
                    </div>
                  )}

                  {/* Recorded Audio Preview + Optional Transcript Check + AI Button */}
                  {(recordedUrl || liveSpeechDraft) && (
                    <div className="rounded-xl border border-slate-200 bg-white p-3 space-y-2.5">
                      {recordedUrl && (
                        <div className="flex items-center gap-2">
                          <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 shrink-0">
                            Ihre Stimme:
                          </span>
                          <audio controls src={recordedUrl} className="h-8 w-full" />
                        </div>
                      )}

                      <input
                        type="text"
                        value={liveSpeechDraft}
                        onChange={(e) => setLiveSpeechDraft(e.target.value)}
                        placeholder="Optional: Gesprochener Text (wird bei Mikrofon-Aufnahme automatisch per KI erkannt)…"
                        className="w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-1.5 text-xs text-slate-800 focus:border-indigo-500 focus:outline-none"
                      />

                      <button
                        type="button"
                        disabled={evaluatingShadow}
                        onClick={evaluateShadowAttempt}
                        className="inline-flex items-center justify-center gap-1.5 rounded-xl bg-slate-900 px-4 py-2 text-xs font-bold text-white hover:bg-slate-800 disabled:opacity-50 transition cursor-pointer"
                      >
                        {evaluatingShadow ? (
                          <Loader2 className="h-3.5 w-3.5 animate-spin" />
                        ) : (
                          <Sparkles className="h-3.5 w-3.5 text-amber-300" />
                        )}
                        <span>
                          {evaluatingShadow
                            ? "Analysiere Aussprache…"
                            : "3. Aussprache & Worttreffer prüfen"}
                        </span>
                      </button>
                    </div>
                  )}

                  {shadowError && (
                    <p className="rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-xs font-semibold text-rose-700">
                      {shadowError}
                    </p>
                  )}

                  {shadowResult && (
                    <div className="rounded-xl border border-emerald-200 bg-white p-3.5 space-y-3">
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <span className="text-xs font-bold text-slate-900">
                          Erkannt: „{shadowResult.transcript}“
                        </span>
                        <div className="flex flex-wrap gap-1.5 text-[11px] font-bold">
                          <span className="rounded-lg bg-emerald-50 border border-emerald-200 px-2 py-0.5 text-emerald-800">
                            Worttreffer: {shadowResult.accuracyScore}%
                          </span>
                          <span className="rounded-lg bg-indigo-50 border border-indigo-200 px-2 py-0.5 text-indigo-800">
                            Aussprache: {shadowResult.pronunciationScore}%
                          </span>
                          <span className="rounded-lg bg-amber-50 border border-amber-200 px-2 py-0.5 text-amber-800">
                            Flüssigkeit: {shadowResult.fluencyScore}%
                          </span>
                        </div>
                      </div>

                      <div className="flex flex-wrap gap-1">
                        {shadowResult.wordDiff.map((w, i) => (
                          <span
                            key={`wd-${i}`}
                            className={`rounded-md px-2 py-0.5 text-xs font-semibold ${
                              w.matched
                                ? "bg-emerald-50 text-emerald-800 border border-emerald-200"
                                : "bg-rose-50 text-rose-700 border border-rose-200 line-through"
                            }`}
                          >
                            {w.word}
                          </span>
                        ))}
                      </div>

                      {Array.isArray(shadowResult.aiCoachingTips) &&
                        shadowResult.aiCoachingTips.length > 0 && (
                          <div className="rounded-lg border border-amber-200 bg-amber-50/70 p-2.5 space-y-1">
                            <span className="text-[10px] font-bold uppercase tracking-wider text-amber-800">
                              Aussprache-Coaching (Hinglish + Deutsch)
                            </span>
                            {shadowResult.aiCoachingTips.map((tip, idx) => (
                              <p key={`tip-${idx}`} className="text-xs text-amber-950 leading-relaxed">
                                • {tip}
                              </p>
                            ))}
                          </div>
                        )}
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {/* ══════════════════ TAB 2: SMART CLOZE DICTATION (LÜCKENDIKTAT) ══════════════════ */}
          {studioTab === "dictation" && (
            <div className="space-y-4">
              <div className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2">
                <div className="flex items-center gap-2">
                  <span className="text-[11px] font-bold text-slate-700">Lücken-Dichte:</span>
                  {(["standard", "intensive"] as const).map((d) => (
                    <button
                      key={d}
                      type="button"
                      onClick={() => {
                        setClozeDifficulty(d);
                        setClozeInputs({});
                        setClozeGraded(false);
                      }}
                      className={`rounded-lg px-2.5 py-1 text-[11px] font-bold capitalize transition cursor-pointer ${
                        clozeDifficulty === d
                          ? "bg-slate-900 text-white"
                          : "bg-white border border-slate-200 text-slate-600 hover:text-slate-900"
                      }`}
                    >
                      {d === "standard" ? "Standard (Zahlen & Präp.)" : "Intensiv (Max Fokus)"}
                    </button>
                  ))}
                </div>

                <div className="flex items-center gap-1">
                  <span className="text-[10px] font-semibold text-slate-500 mr-1">Umlaut:</span>
                  {UMLAUTS.map((u) => (
                    <button
                      key={u}
                      type="button"
                      onClick={() => insertUmlautIntoBlank(u)}
                      className="rounded border border-slate-300 bg-white px-2 py-0.5 font-mono text-xs font-bold text-slate-800 hover:bg-slate-900 hover:text-white transition cursor-pointer"
                    >
                      {u}
                    </button>
                  ))}
                </div>
              </div>

              <div className="max-h-80 overflow-y-auto space-y-2.5 pr-1">
                {clozeTurns.map((ct) => (
                  <div
                    key={`cloze-turn-${ct.index}`}
                    className="rounded-xl border border-slate-200 bg-white p-3.5 text-xs space-y-1.5"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span className="font-bold uppercase tracking-wider text-[10px] text-indigo-700">
                        {ct.speaker}
                      </span>
                      <button
                        type="button"
                        onClick={() => playSpecificTurn(ct.index)}
                        className="inline-flex items-center gap-1 rounded-lg border border-slate-200 bg-slate-50 px-2 py-0.5 text-[10px] font-bold text-slate-700 hover:bg-indigo-50 hover:text-indigo-700 transition cursor-pointer"
                      >
                        <Volume2 className="h-3 w-3" />
                        <span>Satz abspielen</span>
                      </button>
                    </div>

                    <div className="leading-8 text-slate-800 font-medium german-reading">
                      {ct.segments.map((seg, sIdx) => {
                        if (seg.kind === "text") {
                          return <span key={`t-${ct.index}-${sIdx}`}>{seg.text}</span>;
                        }
                        const val = clozeInputs[seg.id] || "";
                        const isOk = clozeGraded && gradeClozeBlank(val, seg.answer);
                        const isWrong = clozeGraded && !isOk;
                        return (
                          <span key={seg.id} className="inline-flex items-center gap-1 mx-1 align-baseline">
                            <input
                              type="text"
                              value={val}
                              onFocus={() => setFocusedBlankId(seg.id)}
                              onChange={(e) => {
                                setClozeInputs((prev) => ({
                                  ...prev,
                                  [seg.id]: e.target.value,
                                }));
                                if (clozeGraded) setClozeGraded(false);
                              }}
                              placeholder={`${seg.hintPrefix}…`}
                              style={{ width: `${Math.max(5, seg.answer.length + 2)}ch` }}
                              className={`rounded-md border px-2 py-0.5 font-mono text-xs font-bold focus:outline-none ${
                                isOk
                                  ? "border-emerald-400 bg-emerald-50 text-emerald-900"
                                  : isWrong
                                    ? "border-rose-400 bg-rose-50 text-rose-900"
                                    : "border-indigo-300 bg-indigo-50/40 text-slate-900 focus:border-indigo-600 focus:bg-white"
                              }`}
                            />
                            {isWrong && (
                              <span className="rounded bg-emerald-100 px-1.5 py-0.5 text-[10px] font-bold text-emerald-800">
                                {seg.answer}
                              </span>
                            )}
                          </span>
                        );
                      })}
                    </div>
                  </div>
                ))}
              </div>

              <div className="flex flex-wrap items-center justify-between gap-3 pt-1">
                {clozeGraded ? (
                  <div className="inline-flex items-center gap-2 rounded-xl border border-emerald-200 bg-emerald-50 px-3.5 py-2 text-xs font-bold text-emerald-900">
                    {clozeScore.percent >= 70 ? (
                      <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                    ) : (
                      <XCircle className="h-4 w-4 text-amber-600" />
                    )}
                    <span>
                      Diktat-Ergebnis: {clozeScore.correct}/{clozeScore.total} ({clozeScore.percent}%) — Fehler wurden im Mistake-DNA Radar gespeichert!
                    </span>
                  </div>
                ) : (
                  <span className="text-[11px] text-slate-500">
                    Hören Sie jeden Satz ab und tippen Sie Zahlen, Uhrzeiten, Negationen &amp; Präpositionen exakt ein.
                  </span>
                )}

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      setClozeInputs({});
                      setClozeGraded(false);
                    }}
                    className="inline-flex items-center gap-1 rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-bold text-slate-700 hover:bg-slate-50 transition cursor-pointer"
                  >
                    <RotateCcw className="h-3.5 w-3.5" />
                    <span>Reset</span>
                  </button>
                  <button
                    type="button"
                    onClick={handleGradeCloze}
                    className="inline-flex items-center gap-1.5 rounded-xl bg-slate-900 px-4 py-2 text-xs font-bold text-white hover:bg-slate-800 transition cursor-pointer"
                  >
                    <Sparkles className="h-3.5 w-3.5 text-amber-300" />
                    <span>Diktat prüfen</span>
                  </button>
                </div>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
