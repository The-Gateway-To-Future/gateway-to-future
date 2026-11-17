"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useEffect, useRef, useState, type ChangeEvent } from "react";
import { motion } from "framer-motion";
import {
  AlertCircle,
  ArrowLeft,
  ArrowRight,
  FileText,
  Headphones,
  Pause,
  Play,
  RotateCcw,
  RotateCw,
  Volume2,
} from "lucide-react";
import { ExamHeader } from "@/components/ExamHeader";
import {
  getActiveUserEmail,
  loadExamState,
  resetExamState,
  saveExamState,
} from "@/lib/client-storage";
import { isLevel, type Level } from "@/lib/config";
import type { ExamTest, HoerenTeil } from "@/lib/types";

function formatAudioTime(sec: number): string {
  if (!Number.isFinite(sec) || sec < 0) return "0:00";
  const m = Math.floor(sec / 60);
  const s = Math.floor(sec % 60);
  return `${m}:${String(s).padStart(2, "0")}`;
}

export default function HoerenExamPage() {
  const params = useParams<{ level: string }>();
  const rawLevel = (params?.level || "b1").toLowerCase();
  const level: Level = isLevel(rawLevel) ? rawLevel : "b1";

  const [test, setTest] = useState<ExamTest | null>(null);
  const [activeTeilIdx, setActiveTeilIdx] = useState(0);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [progressPct, setProgressPct] = useState(0);
  const [showTranscript, setShowTranscript] = useState(false);
  const [loading, setLoading] = useState(true);

  const audioRef = useRef<HTMLAudioElement | null>(null);

  useEffect(() => {
    const state = loadExamState(level);
    setAnswers(state.hoerenAnswers || {});

    // Clear any previously locked play counts in localStorage / sessionStorage
    saveExamState(level, (st) => ({ ...st, hoerenPlayCounts: {} }));
    try {
      sessionStorage.removeItem(`gtf_hoeren_locks_${level}`);
    } catch {
      // ignore
    }

    // 1. Instant cache load for <100ms tab switching
    try {
      const cached = sessionStorage.getItem(`gtf_exam_test_${level}`);
      if (cached) {
        const parsed = JSON.parse(cached) as ExamTest;
        if (parsed?.sections?.hoeren?.teile?.length) {
          setTest(parsed);
          setLoading(false);
        }
      }
    } catch {
      // ignore
    }

    async function fetchTest() {
      try {
        const email = getActiveUserEmail();
        const res = await fetch(
          `/api/drive/fetch-test?level=${encodeURIComponent(level)}&email=${encodeURIComponent(email)}`,
        );
        if (res.ok) {
          const data = (await res.json()) as { test: ExamTest };
          if (data?.test?.sections?.hoeren?.teile?.length) {
            setTest(data.test);
            try {
              sessionStorage.setItem(`gtf_exam_test_${level}`, JSON.stringify(data.test));
            } catch {
              // ignore
            }
          }
        }
      } catch (err) {
        console.warn("[gtf] Error loading hoeren test:", err);
      } finally {
        setLoading(false);
      }
    }
    fetchTest();
  }, [level]);

  const teile: HoerenTeil[] = test?.sections?.hoeren?.teile || [];
  const currentTeil: HoerenTeil | undefined = teile[activeTeilIdx] || teile[0];

  const normalizeAudioUrl = (url?: string | null): string => {
    if (!url) return "";
    const trimmed = url.trim();
    if (!trimmed) return "";
    if (/^(https?:\/\/|blob:|data:)/i.test(trimmed)) {
      return trimmed;
    }
    return trimmed.startsWith("/") ? trimmed : `/${trimmed}`;
  };

  const fallbackAudioSrc = `/audio/hoeren/${level}_hoeren_0${activeTeilIdx + 1}.mp3`;

  // Resolve direct static MP3 audio URL
  const rawAudioSrc =
    currentTeil?.audioUrl ||
    (currentTeil?.audioToken
      ? `/api/drive/stream-audio?token=${encodeURIComponent(currentTeil.audioToken)}`
      : fallbackAudioSrc);
  const resolvedAudioSrc = normalizeAudioUrl(rawAudioSrc);

  const [activeAudioSrc, setActiveAudioSrc] = useState(resolvedAudioSrc);
  const [audioError, setAudioError] = useState(false);
  const [triedFallback, setTriedFallback] = useState(false);

  // Stop playback and reset time when switching Teil
  useEffect(() => {
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.currentTime = 0;
    }
    setIsPlaying(false);
    setCurrentTime(0);
    setDuration(0);
    setProgressPct(0);
    setActiveAudioSrc(resolvedAudioSrc);
    setAudioError(false);
    setTriedFallback(false);
  }, [activeTeilIdx, resolvedAudioSrc]);

  const handleAudioError = () => {
    if (!triedFallback && fallbackAudioSrc && activeAudioSrc !== fallbackAudioSrc) {
      console.warn("[ExamHoeren] Primary audio failed, falling back to local bundle track:", fallbackAudioSrc);
      setTriedFallback(true);
      setActiveAudioSrc(fallbackAudioSrc);
      setAudioError(false);
    } else {
      setAudioError(true);
      setIsPlaying(false);
    }
  };

  const setAnswer = (qId: string, val: string) => {
    setAnswers((prev) => {
      const next = { ...prev, [qId]: val };
      saveExamState(level, (st) => ({ ...st, hoerenAnswers: next }));
      return next;
    });
  };

  const handleTogglePlayPause = () => {
    const el = audioRef.current;
    if (!el || !currentTeil) return;
    if (isPlaying) {
      el.pause();
    } else {
      let restarted = false;
      if (el.duration && el.currentTime >= el.duration - 0.25) {
        el.currentTime = 0;
        restarted = true;
      }
      // Call .play() synchronously inside onClick before any state updates (iOS user-gesture lock)
      const playPromise = el.play();
      if (restarted) {
        setCurrentTime(0);
      }
      if (playPromise !== undefined) {
        playPromise.catch((err) => {
          console.warn("Audio play prevented:", err);
          setIsPlaying(false);
        });
      }
    }
  };

  const handleRestartAudio = () => {
    const el = audioRef.current;
    if (!el || !currentTeil) return;
    el.currentTime = 0;
    // Call .play() synchronously inside onClick before any state updates (iOS user-gesture lock)
    const playPromise = el.play();
    setCurrentTime(0);
    setProgressPct(0);
    if (playPromise !== undefined) {
      playPromise.catch((err) => {
        console.warn("Audio play prevented:", err);
        setIsPlaying(false);
      });
    }
  };

  const handleSkip = (deltaSeconds: number) => {
    const el = audioRef.current;
    if (!el) return;
    const maxDur = el.duration && Number.isFinite(el.duration) ? el.duration : duration || 300;
    const next = Math.max(0, Math.min(maxDur, (el.currentTime || 0) + deltaSeconds));
    el.currentTime = next;
    setCurrentTime(next);
    if (maxDur > 0) {
      setProgressPct(Math.min(100, Math.max(0, Math.round((next / maxDur) * 100))));
    }
  };

  const handleSeekSlider = (e: ChangeEvent<HTMLInputElement>) => {
    const val = Number(e.target.value);
    const el = audioRef.current;
    if (el) {
      el.currentTime = val;
    }
    setCurrentTime(val);
    const maxDur = el?.duration && Number.isFinite(el.duration) ? el.duration : duration || 100;
    if (maxDur > 0) {
      setProgressPct(Math.min(100, Math.max(0, Math.round((val / maxDur) * 100))));
    }
  };

  const handleReset = () => {
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.currentTime = 0;
    }
    const fresh = resetExamState(level);
    setAnswers(fresh.hoerenAnswers);
    setIsPlaying(false);
    setCurrentTime(0);
    setProgressPct(0);
  };

  const answeredInSection = Object.keys(answers).length;
  const totalInSection = teile.reduce((acc, t) => acc + t.questions.length, 0);

  return (
    <div className="min-h-screen flex flex-col bg-slate-50 text-slate-900 light-study">
      {/* Focus Mode Exam Header */}
      <ExamHeader
        level={level}
        activeSection="hoeren"
        durationMinutes={test?.sections?.hoeren?.durationMinutes || 40}
        testTitle={test?.title}
        onResetExam={handleReset}
        answeredCount={answeredInSection}
        totalQuestions={totalInSection}
      />

      <main className="mx-auto w-full max-w-7xl flex-1 px-4 pt-5 pb-52 sm:px-6 sm:pt-6 sm:pb-40">
        {loading && !currentTeil ? (
          <div className="rounded-2xl border border-slate-200 bg-white p-8 text-center text-sm text-slate-700 shadow-sm flex items-center justify-center gap-3">
            <div className="h-4 w-4 animate-spin rounded-full border-2 border-slate-300 border-t-slate-900" />
            <span>Lade Prüfungsmodul Hören…</span>
          </div>
        ) : !currentTeil ? (
          <div className="rounded-2xl border border-amber-300 bg-amber-50 p-8 text-center text-sm text-amber-900 shadow-sm">
            <p className="font-bold text-slate-900">Keine Höraufgaben für diesen Prüfungsteil verfügbar.</p>
            <p className="text-xs text-amber-800 mt-1">Bitte wählen Sie einen anderen Prüfungsteil oben aus.</p>
          </div>
        ) : (
          <div className="space-y-5">
            {/* Clean Horizontal 4-Pill Switcher across Hören Teile */}
            <div className="grid grid-cols-4 gap-2 sm:inline-flex rounded-2xl bg-white p-1.5 border border-slate-200 shadow-xs">
              {(teile || []).map((t, idx) => {
                const active = idx === activeTeilIdx;
                return (
                  <button
                    key={t.id}
                    type="button"
                    onClick={() => setActiveTeilIdx(idx)}
                    className={`relative z-20 flex items-center justify-center gap-1.5 rounded-xl px-3 py-2 text-xs font-bold transition-all select-none whitespace-nowrap cursor-pointer ${
                      active
                        ? "bg-slate-900 text-white shadow-sm"
                        : "text-slate-600 hover:bg-slate-100 hover:text-slate-900"
                    }`}
                  >
                    <Headphones className={`h-3.5 w-3.5 shrink-0 hidden sm:inline ${active ? "text-white" : "text-slate-400"}`} />
                    <span>Teil {idx + 1}</span>
                  </button>
                );
              })}
            </div>

            {/* Instructions card with active Teil Title & Transcript toggle */}
            <div className="rounded-2xl border border-slate-200 bg-white px-4 py-3.5 text-xs text-slate-700 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="space-y-1">
                <p className="text-sm font-bold text-slate-900">
                  {currentTeil.title}
                </p>
                <p className="font-medium leading-relaxed text-slate-600">
                  {currentTeil.instructions}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setShowTranscript((prev) => !prev)}
                className={`relative z-20 inline-flex items-center justify-center gap-1.5 rounded-xl border px-3.5 py-2 text-xs font-bold transition shrink-0 cursor-pointer ${
                  showTranscript
                    ? "border-slate-900 bg-slate-900 text-white shadow-xs"
                    : "border-slate-200 bg-slate-50 text-slate-700 hover:bg-slate-100 hover:text-slate-900"
                }`}
              >
                <FileText className="h-3.5 w-3.5" />
                <span>Transcript (Hörtext anzeigen)</span>
              </button>
            </div>

            {/* Collapsible German Dialogue Transcript */}
            {showTranscript && (
              <div className="rounded-2xl border border-slate-200 bg-white p-5 space-y-3 shadow-sm text-slate-900">
                <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                  <span className="text-xs font-bold uppercase tracking-wider text-slate-900 flex items-center gap-1.5">
                    <FileText className="h-4 w-4 text-amber-600" />
                    Transkript — {currentTeil.title}
                  </span>
                  <button
                    type="button"
                    onClick={() => setShowTranscript(false)}
                    className="relative z-20 text-xs font-bold text-slate-500 hover:text-slate-900 cursor-pointer"
                  >
                    Schließen
                  </button>
                </div>
                {currentTeil.script && currentTeil.script.length > 0 ? (
                  <div className="space-y-3 text-xs sm:text-sm leading-relaxed text-slate-800 german-reading">
                    {(currentTeil.script || []).map((line, i) => (
                      <div key={i} className="rounded-xl bg-slate-50 p-3.5 border border-slate-200">
                        <span className="block text-[11px] font-bold uppercase tracking-wider text-emerald-700 mb-1">
                          {line.speaker}
                        </span>
                        <p>{line.text}</p>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-xs text-slate-500">
                    Für diesen Prüfungsteil ist kein separates Texttranskript hinterlegt. Nutzen Sie den Audio-Player unten zum freien Abhören.
                  </p>
                )}
              </div>
            )}

            {/* QUESTIONS FOR ACTIVE HÖREN TEIL */}
            <div className="grid gap-4 md:grid-cols-2">
              {(currentTeil.questions || []).map((q) => {
                const selected = answers[q.id];
                return (
                  <div
                    key={q.id}
                    className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm text-slate-900 transition-all"
                  >
                    <p className="text-sm font-bold text-slate-900 german-reading">{q.prompt}</p>

                    {q.type === "richtig_falsch" ? (
                      <div className="mt-4 flex gap-3">
                        {(["richtig", "falsch"] as const).map((choice) => {
                          const active = selected === choice;
                          return (
                            <button
                              key={choice}
                              type="button"
                              onClick={() => setAnswer(q.id, choice)}
                              className={`relative z-20 flex-1 rounded-xl border py-2.5 text-xs font-bold uppercase tracking-wider transition cursor-pointer ${
                                active
                                  ? "border-slate-900 bg-slate-900 text-white shadow-xs"
                                  : "border-slate-200 bg-slate-50 text-slate-700 hover:bg-slate-100 hover:text-slate-900"
                              }`}
                            >
                              {choice}
                            </button>
                          );
                        })}
                      </div>
                    ) : (
                      <div className="mt-4 space-y-2">
                        {(q.options || []).map((opt) => {
                          const active = selected === opt.id;
                          return (
                            <button
                              key={opt.id}
                              type="button"
                              onClick={() => setAnswer(q.id, opt.id)}
                              className={`relative z-20 flex w-full items-center gap-3 rounded-xl border px-3.5 py-2.5 text-left text-xs font-semibold transition sm:text-sm cursor-pointer ${
                                active
                                  ? "border-slate-900 bg-slate-900 text-white shadow-xs"
                                  : "border-slate-200 bg-slate-50 text-slate-800 hover:bg-slate-100 hover:text-slate-900"
                              }`}
                            >
                              <span
                                className={`inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-lg text-xs font-bold uppercase ${
                                  active
                                    ? "bg-white text-slate-900"
                                    : "bg-white text-slate-700 border border-slate-200"
                                }`}
                              >
                                {opt.id}
                              </span>
                              <span>{opt.text}</span>
                            </button>
                          );
                        })}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>

            {/* Bottom Navigation & Progression Footer */}
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 pt-4 border-t border-slate-200">
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  disabled={activeTeilIdx === 0}
                  onClick={() => setActiveTeilIdx((idx) => Math.max(0, idx - 1))}
                  className="relative z-10 inline-flex flex-1 sm:flex-none items-center justify-center gap-1.5 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-xs font-bold text-slate-700 hover:bg-slate-50 hover:text-slate-900 disabled:opacity-40 transition shadow-xs cursor-pointer"
                >
                  <ArrowLeft className="h-3.5 w-3.5" />
                  <span>Vorheriger Teil</span>
                </button>
                <button
                  type="button"
                  disabled={activeTeilIdx >= teile.length - 1}
                  onClick={() => setActiveTeilIdx((idx) => Math.min(teile.length - 1, idx + 1))}
                  className="relative z-10 inline-flex flex-1 sm:flex-none items-center justify-center gap-1.5 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-xs font-bold text-slate-700 hover:bg-slate-50 hover:text-slate-900 disabled:opacity-40 transition shadow-xs cursor-pointer"
                >
                  <span>Nächster Teil</span>
                  <ArrowRight className="h-3.5 w-3.5" />
                </button>
              </div>

              <Link
                href={`/exam/${level}/schreiben`}
                className="relative z-10 inline-flex items-center justify-center gap-2 rounded-xl bg-slate-900 text-white px-5 py-3 text-xs sm:text-sm font-bold shadow-sm hover:bg-slate-800 transition cursor-pointer"
              >
                <span>Weiter zu Modul 3: Schreiben</span>
                <ArrowRight className="h-4 w-4" />
              </Link>
            </div>
          </div>
        )}
      </main>

      {/* STICKY BOTTOM UNLOCKED AUDIO PLAYER (Clean Light Theme) */}
      {currentTeil && (
        <div className="fixed bottom-0 inset-x-0 z-40 border-t border-slate-200 bg-white/95 backdrop-blur-2xl shadow-xl px-3 py-3 sm:px-6 pb-safe text-slate-900">
          <div className="mx-auto max-w-7xl flex flex-col gap-2.5">
            {/* Row 1: Play/Pause, Skip Controls, Seekable Slider, Time, Transcript Toggle */}
            <div className="flex flex-wrap sm:flex-nowrap items-center justify-between gap-2.5 sm:gap-4">
              {/* Left Playback Controls */}
              <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
                <motion.button
                  whileTap={{ scale: 0.95 }}
                  type="button"
                  onClick={handleTogglePlayPause}
                  className={`relative z-10 inline-flex items-center gap-1.5 rounded-xl px-4 py-2 text-xs font-bold shadow-sm transition cursor-pointer ${
                    isPlaying
                      ? "bg-emerald-600 text-white"
                      : "bg-slate-900 text-white hover:bg-slate-800"
                  }`}
                >
                  {isPlaying ? (
                    <>
                      <Pause className="h-4 w-4 fill-current" />
                      <span>Pause</span>
                    </>
                  ) : (
                    <>
                      <Play className="h-4 w-4 fill-current" />
                      <span>Play</span>
                    </>
                  )}
                </motion.button>

                <button
                  type="button"
                  onClick={() => handleSkip(-10)}
                  className="relative z-10 inline-flex items-center gap-1 rounded-xl border border-slate-200 bg-slate-50 px-2.5 py-2 text-[11px] font-bold text-slate-700 hover:bg-slate-100 hover:text-slate-900 cursor-pointer"
                  title="10 Sekunden zurück"
                >
                  <RotateCcw className="h-3.5 w-3.5" />
                  <span>-10s</span>
                </button>

                <button
                  type="button"
                  onClick={() => handleSkip(10)}
                  className="relative z-10 inline-flex items-center gap-1 rounded-xl border border-slate-200 bg-slate-50 px-2.5 py-2 text-[11px] font-bold text-slate-700 hover:bg-slate-100 hover:text-slate-900 cursor-pointer"
                  title="10 Sekunden vor"
                >
                  <span>+10s</span>
                  <RotateCw className="h-3.5 w-3.5" />
                </button>

                <button
                  type="button"
                  onClick={handleRestartAudio}
                  className="relative z-10 hidden xs:inline-flex items-center justify-center rounded-xl border border-slate-200 bg-slate-50 p-2 text-slate-700 hover:bg-slate-100 hover:text-slate-900 cursor-pointer"
                  title="Neu starten"
                >
                  <Volume2 className="h-4 w-4 text-slate-700" />
                </button>
              </div>

              {/* Center Interactive Seekable Timeline */}
              <div className="w-full sm:flex-1 order-last sm:order-none flex items-center gap-2.5">
                <span className="font-mono text-[11px] font-bold text-slate-700 shrink-0 w-10 text-right">
                  {formatAudioTime(currentTime)}
                </span>
                <input
                  type="range"
                  aria-label="Audio-Zeitleiste"
                  min={0}
                  max={duration > 0 ? duration : 165}
                  step={0.1}
                  value={Math.min(currentTime, duration > 0 ? duration : 165)}
                  onChange={handleSeekSlider}
                  className="relative z-10 w-full h-2 rounded-lg accent-slate-900 cursor-pointer bg-slate-200"
                />
                <span className="font-mono text-[11px] font-bold text-slate-500 shrink-0 w-10">
                  {formatAudioTime(duration > 0 ? duration : 165)}
                </span>
              </div>

              {/* Right: Transcript Toggle */}
              <button
                type="button"
                onClick={() => setShowTranscript((prev) => !prev)}
                className={`relative z-10 inline-flex items-center gap-1.5 rounded-xl border px-3 py-2 text-[11px] font-bold transition shrink-0 cursor-pointer ${
                  showTranscript
                    ? "border-slate-900 bg-slate-900 text-white"
                    : "border-slate-200 bg-slate-50 text-slate-700 hover:bg-slate-100 hover:text-slate-900"
                }`}
              >
                <FileText className="h-3.5 w-3.5" />
                <span className="hidden md:inline">Transcript (Hörtext anzeigen)</span>
                <span className="md:hidden">Transcript</span>
              </button>
            </div>

            {/* Subtle Track Subtitle Row */}
            <div className="hidden sm:flex items-center justify-between text-[11px] text-slate-500">
              <span className="font-semibold truncate">
                {currentTeil.title} · Übungsmodus (Unbegrenzte Wiedergabe &amp; Zeitsprung aktiv)
              </span>
              <span className="font-mono font-bold text-slate-700">{progressPct}%</span>
            </div>
          </div>

          {/* Direct HTML5 audio element with native controls & preload="metadata" for iOS/iPadOS Safari */}
          <audio
            ref={audioRef}
            key={activeAudioSrc}
            src={activeAudioSrc}
            controls
            preload="metadata"
            playsInline
            className="mt-2 w-full h-9 rounded-xl [color-scheme:light]"
            onError={handleAudioError}
            onCanPlay={() => setAudioError(false)}
            onPlay={() => setIsPlaying(true)}
            onPause={() => setIsPlaying(false)}
            onLoadedMetadata={(e) => {
              setAudioError(false);
              const d = e.currentTarget.duration;
              if (Number.isFinite(d) && d > 0) setDuration(d);
            }}
            onDurationChange={(e) => {
              const d = e.currentTarget.duration;
              if (Number.isFinite(d) && d > 0) setDuration(d);
            }}
            onTimeUpdate={(e) => {
              const el = e.currentTarget;
              setCurrentTime(el.currentTime || 0);
              if (el.duration && Number.isFinite(el.duration) && el.duration > 0) {
                setDuration(el.duration);
                const pct = Math.round((el.currentTime / el.duration) * 100);
                setProgressPct(Math.min(100, Math.max(0, pct)));
              }
            }}
            onEnded={() => {
              setIsPlaying(false);
              setProgressPct(100);
            }}
          />
          {audioError && (
            <div className="mt-2 rounded-lg border border-red-200 bg-red-50 p-2.5 text-xs font-semibold text-red-600 flex items-center gap-1.5">
              <AlertCircle className="h-4 w-4 shrink-0 text-red-600" />
              <span>Error: Audio file could not be loaded or is missing.</span>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
