"use client";

import Link from "next/link";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import { Suspense, useEffect, useRef, useState } from "react";
import {
  Award,
  CheckCircle2,
  Lock,
  Mic,
  Play,
  Sparkles,
  Square,
  Volume2,
} from "lucide-react";
import { ExamHeader } from "@/components/ExamHeader";
import { motion } from "framer-motion";
import {
  loadExamState,
  resetExamSection,
  saveExamState,
  type ExamMode,
} from "@/lib/client-storage";
import { isLevel, type Level } from "@/lib/config";
import type { ExamTest, SprechenEvaluation, SprechenTeil } from "@/lib/types";

function SprechenExamPageInner() {
  const router = useRouter();
  const params = useParams<{ level: string }>();
  const searchParams = useSearchParams();
  const rawLevel = (params?.level || "b1").toLowerCase();
  const level: Level = isLevel(rawLevel) ? rawLevel : "b1";
  const defaultTestId = `gtf-${level}-modelltest-1`;
  const testId = (searchParams?.get("testId") || defaultTestId).trim().toLowerCase();
  const testQuery =
    testId !== defaultTestId ? `?testId=${encodeURIComponent(testId)}` : "";

  const [test, setTest] = useState<ExamTest | null>(null);
  const [activeTeilIdx, setActiveTeilIdx] = useState(0);
  const [evaluations, setEvaluations] = useState<Record<string, SprechenEvaluation>>({});
  const [examMode, setExamMode] = useState<ExamMode>("practice");
  const [sectionExpired, setSectionExpired] = useState(false);
  const [micDenied, setMicDenied] = useState(false);
  const [examinerPlayedOnce, setExaminerPlayedOnce] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [recordingSeconds, setRecordingSeconds] = useState(0);
  const [recordedBlob, setRecordedBlob] = useState<Blob | null>(null);
  const [recordedUrl, setRecordedUrl] = useState<string | null>(null);
  const [clientTranscript, setClientTranscript] = useState("");
  const [examinerPlaying, setExaminerPlaying] = useState(false);
  const [evaluating, setEvaluating] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<BlobPart[]>([]);
  const timerRef = useRef<number | null>(null);
  const examinerAudioRef = useRef<HTMLAudioElement | null>(null);
  const isExamMode = examMode === "exam";

  useEffect(() => {
    setActiveTeilIdx(0);
    setLoading(true);
    const st = loadExamState(level, undefined, testId);
    setEvaluations(st.sprechenEvaluations || {});
    setExamMode(st.examMode || "practice");
    setSectionExpired(
      st.examMode === "exam" && (st.expiredSections || []).includes("sprechen"),
    );

    const cacheKey = `gtf_exam_test_${level}_${testId}`;
    // 1. Instant cache check for <100ms load
    try {
      const cached = sessionStorage.getItem(cacheKey);
      if (cached) {
        const parsed = JSON.parse(cached) as ExamTest;
        if (parsed?.sections?.sprechen?.teile?.length) {
          setTest(parsed);
          setLoading(false);
        }
      }
    } catch {
      // ignore
    }

    async function fetchTest() {
      try {
        const res = await fetch(
          `/api/drive/fetch-test?level=${encodeURIComponent(level)}&testId=${encodeURIComponent(testId)}`,
          { credentials: "include" },
        );
        if (res.ok) {
          const data = (await res.json()) as { test: ExamTest };
          if (data?.test?.sections?.sprechen?.teile?.length) {
            setTest(data.test);
            try {
              sessionStorage.setItem(cacheKey, JSON.stringify(data.test));
            } catch {}
          }
        }
      } catch (err) {
        console.warn("[gtf] Error loading sprechen test:", err);
      } finally {
        setLoading(false);
      }
    }
    fetchTest();

    return () => {
      if (timerRef.current) window.clearInterval(timerRef.current);
      if (examinerAudioRef.current) {
        examinerAudioRef.current.pause();
      }
    };
  }, [level, testId]);

  const teile: SprechenTeil[] = test?.sections.sprechen.teile || [];
  const currentTeil: SprechenTeil | undefined = teile[activeTeilIdx];
  const currentEvaluation = currentTeil ? evaluations[currentTeil.id] : undefined;

  useEffect(() => {
    setRecordedBlob(null);
    setRecordedUrl(null);
    setRecordingSeconds(0);
    setClientTranscript("");
    setErrorMsg(null);
    setExaminerPlayedOnce(false);
    if (examinerAudioRef.current) {
      examinerAudioRef.current.pause();
      examinerAudioRef.current.currentTime = 0;
    }
    setExaminerPlaying(false);
  }, [activeTeilIdx]);

  // iOS/iPadOS-safe MP3 examiner audio handler: plays real MP3 directly via user gesture.
  const playExaminerPrompt = () => {
    if (!currentTeil) return;
    const mp3Src = currentTeil.examinerAudioToken
      ? `/api/drive/stream-audio?token=${encodeURIComponent(currentTeil.examinerAudioToken)}`
      : `/api/tts?text=${encodeURIComponent(currentTeil.examinerScript)}`;

    const el = examinerAudioRef.current;
    if (el) {
      if (examinerPlaying && !el.paused) {
        el.pause();
        return;
      }
      el.currentTime = 0;
      if (el.getAttribute("src") !== mp3Src) {
        el.src = mp3Src;
      }
      // Strictly synchronous .play() before state updates for iOS user-gesture lock
      const playPromise = el.play();
      setErrorMsg(null);
      if (playPromise !== undefined) {
        playPromise.catch((err) => {
          console.warn("[gtf sprechen] Examiner MP3 play error:", err);
          setExaminerPlaying(false);
          setErrorMsg("Prüfer-Audio konnte nicht abgespielt werden. Bitte erneut tippen.");
        });
      }
      return;
    }

    if (typeof window === "undefined") return;
    const audio = new Audio(mp3Src);
    audio.setAttribute("playsinline", "true");
    audio.onplay = () => setExaminerPlaying(true);
    audio.onpause = () => setExaminerPlaying(false);
    audio.onended = () => setExaminerPlaying(false);
    audio.onerror = () => {
      setExaminerPlaying(false);
      setErrorMsg("Prüfer-Audio konnte nicht geladen werden.");
    };
    const playPromise = audio.play();
    setErrorMsg(null);
    if (playPromise !== undefined) {
      playPromise.catch((err) => {
        console.warn("[gtf sprechen] Audio play prevented:", err);
        setExaminerPlaying(false);
        setErrorMsg("Prüfer-Audio konnte nicht abgespielt werden. Bitte erneut tippen.");
      });
    }
  };

  const startRecording = async () => {
    setErrorMsg(null);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const recorder = new MediaRecorder(stream);
      chunksRef.current = [];

      recorder.ondataavailable = (e) => {
        if (e.data && e.data.size > 0) {
          chunksRef.current.push(e.data);
        }
      };

      recorder.onstop = () => {
        const blob = new Blob(chunksRef.current, {
          type: recorder.mimeType || "audio/webm",
        });
        setRecordedBlob(blob);
        setRecordedUrl(URL.createObjectURL(blob));
        stream.getTracks().forEach((t) => t.stop());
      };

      recorder.start();
      mediaRecorderRef.current = recorder;
      setIsRecording(true);
      setRecordingSeconds(0);

      timerRef.current = window.setInterval(() => {
        setRecordingSeconds((s) => s + 1);
      }, 1000);
    } catch {
      setMicDenied(true);
      setErrorMsg(
        isExamMode
          ? "Kein Mikrofonzugriff möglich. Bitte erlauben Sie das Mikrofon in den Browsereinstellungen oder nutzen Sie das Barrierefreiheits-Eingabefeld unten."
          : "Kein Mikrofonzugriff möglich. Sie können unten „Demo-Sprachaufnahme simulieren“ klicken oder Ihre gesprochene Antwort eintippen.",
      );
    }
  };

  const stopRecording = () => {
    if (timerRef.current) {
      window.clearInterval(timerRef.current);
      timerRef.current = null;
    }
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== "inactive") {
      mediaRecorderRef.current.stop();
    }
    setIsRecording(false);
  };

  const submitForEvaluation = async (overrideTranscript?: string) => {
    if (!currentTeil) return;
    setErrorMsg(null);
    setEvaluating(true);
    try {
      const form = new FormData();
      if (recordedBlob) {
        form.append("audio", recordedBlob, `${currentTeil.id}.webm`);
      }
      form.append("level", level);
      form.append("teilId", currentTeil.id);
      form.append("teilTitle", currentTeil.title);
      form.append(
        "durationSeconds",
        String(recordingSeconds > 0 ? recordingSeconds : 42),
      );
      form.append(
        "clientTranscript",
        overrideTranscript ?? clientTranscript,
      );
      form.append("promptBullets", JSON.stringify(currentTeil.card.bullets));

      const res = await fetch("/api/ai/evaluate-sprechen", {
        method: "POST",
        credentials: "include",
        body: form,
      });
      const data = await res.json();
      if (!res.ok) {
        setErrorMsg(data.error || "Bewertung fehlgeschlagen.");
        return;
      }
      const ev = data.evaluation as SprechenEvaluation;
      setEvaluations((prev) => {
        const next = { ...prev, [currentTeil.id]: ev };
        saveExamState(level, (st) => ({ ...st, sprechenEvaluations: next }), undefined, testId);
        return next;
      });
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : "Netzwerkfehler");
    } finally {
      setEvaluating(false);
    }
  };

  const handleTimeExpired = () => {
    setSectionExpired(true);
    if (isRecording) stopRecording();
    window.setTimeout(() => {
      router.push(`/exam/${level}/result${testQuery}`);
    }, 1800);
  };

  const handleReset = () => {
    if (
      typeof window !== "undefined" &&
      !window.confirm("Aufnahmen und Bewertungen in „Sprechen“ zurücksetzen? Andere Prüfungsteile bleiben erhalten.")
    ) {
      return;
    }
    const fresh = resetExamSection(level, "sprechen", undefined, testId);
    setEvaluations(fresh.sprechenEvaluations);
    setSectionExpired(false);
  };

  return (
    <div className="min-h-screen flex flex-col bg-slate-50 text-slate-900 light-study">
      <ExamHeader
        level={level}
        activeSection="sprechen"
        durationMinutes={test?.sections.sprechen.durationMinutes || 15}
        testTitle={test?.title}
        testId={testId}
        onResetExam={handleReset}
        examMode={examMode}
        onModeChange={(m) => {
          setExamMode(m);
          if (m === "practice") setSectionExpired(false);
        }}
        onTimeExpired={handleTimeExpired}
      />

      <main className="mx-auto w-full max-w-7xl flex-1 px-4 py-6 sm:px-6">
        {loading && !currentTeil ? (
          <div className="rounded-2xl border border-slate-200 bg-white p-8 text-center text-sm text-slate-600 shadow-sm flex items-center justify-center gap-3">
            <div className="h-4 w-4 animate-spin rounded-full border-2 border-slate-300 border-t-slate-900" />
            <span>Lade Prüfungsmodul Sprechen…</span>
          </div>
        ) : !currentTeil ? (
          <div className="rounded-2xl border border-amber-200 bg-amber-50 p-8 text-center text-sm text-amber-900 shadow-sm">
            <p className="font-bold">Keine Sprechaufgaben für dieses Modul verfügbar.</p>
            <p className="text-xs text-amber-700 mt-1">Bitte wählen Sie einen anderen Prüfungsteil oben aus.</p>
          </div>
        ) : (
          <div className="space-y-6">
            {/* Teil 1, 2, 3 selector */}
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="flex flex-wrap gap-1.5 rounded-2xl bg-white p-1.5 border border-slate-200 shadow-xs">
                {teile.map((t, idx) => {
                  const active = idx === activeTeilIdx;
                  const ev = evaluations[t.id];
                  return (
                    <button
                      key={t.id}
                      type="button"
                      onClick={() => setActiveTeilIdx(idx)}
                      className={`relative z-10 cursor-pointer inline-flex items-center gap-2 rounded-xl px-3.5 py-2 text-xs font-bold transition ${
                        active
                          ? "!bg-slate-900 !text-white shadow-xs"
                          : "text-slate-600 hover:bg-slate-100 hover:text-slate-900"
                      }`}
                    >
                      <Mic className={`h-3.5 w-3.5 ${active ? "text-white" : "text-amber-500"}`} />
                      <span>{t.title}</span>
                      {ev && (
                        <span
                          className={`rounded-md px-1.5 py-0.5 text-[10px] ${
                            active
                              ? "bg-emerald-600 text-white"
                              : "bg-emerald-50 text-emerald-700 border border-emerald-200"
                          }`}
                        >
                          {ev.score}/100
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>

              <Link
                href={`/exam/${level}/result${testQuery}`}
                className="relative z-10 cursor-pointer inline-flex items-center gap-1.5 rounded-xl bg-slate-900 text-white px-4 py-2 text-xs font-extrabold shadow-xs hover:bg-slate-800 transition"
              >
                <Award className="h-4 w-4" />
                <span>Prüfung abschließen &amp; Scorecard öffnen</span>
              </Link>
            </div>

            <div className="grid gap-6 lg:grid-cols-12">
              {/* LEFT: Visual Speaking Prompt Card + Examiner Audio Player */}
              <div className="lg:col-span-6 space-y-4">
                <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm space-y-4 text-slate-900">
                  <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 pb-3">
                    <span className="rounded-lg border border-slate-200 bg-slate-100 px-3 py-1 text-xs font-extrabold uppercase text-slate-800">
                      Kandidatenkarte · Teil {currentTeil.teil}
                    </span>
                    <span className="text-xs font-semibold text-slate-500">
                      Vorbereitung: {currentTeil.prepSeconds}s · Sprechzeit:{" "}
                      {currentTeil.speakSeconds}s
                    </span>
                  </div>

                  <div>
                    <h2 className="text-xl font-extrabold text-slate-900">
                      {currentTeil.card.heading}
                    </h2>
                    {currentTeil.card.subheading && (
                      <p className="mt-1 text-xs font-medium text-slate-500">
                        {currentTeil.card.subheading}
                      </p>
                    )}
                  </div>

                  <ul className="space-y-2.5">
                    {currentTeil.card.bullets.map((bullet, i) => (
                      <li
                        key={i}
                        className="flex items-start gap-3 rounded-xl border border-slate-200 bg-slate-50/70 p-3.5 text-sm font-semibold text-slate-800"
                      >
                        <span className="inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-slate-900 text-white text-xs font-bold">
                          {i + 1}
                        </span>
                        <span>{bullet}</span>
                      </li>
                    ))}
                  </ul>

                  {/* Pre-generated Examiner Audio Prompt Player */}
                  <div className="rounded-xl border border-slate-200 bg-slate-50/70 p-4 text-slate-900">
                    <div className="flex flex-wrap items-center justify-between gap-3">
                      <div>
                        <span className="text-[10px] font-bold uppercase tracking-wider text-amber-700">
                          Prüfer-Impuls (Examiner Audio Prompt)
                        </span>
                        <p className="mt-0.5 text-xs text-slate-600">
                          Hören Sie die Aufgabenstellung der Prüferin / des Prüfers.
                        </p>
                      </div>

                      <button
                        type="button"
                        onClick={playExaminerPrompt}
                        className="relative z-10 cursor-pointer inline-flex items-center gap-2 rounded-xl bg-slate-900 text-white px-4 py-2 text-xs font-extrabold shadow-xs hover:bg-slate-800 transition"
                      >
                        {examinerPlaying ? (
                          <>
                            <Volume2 className="h-4 w-4 animate-bounce" />
                            <span>Prüfer spricht…</span>
                          </>
                        ) : (
                          <>
                            <Play className="h-4 w-4 fill-current" />
                            <span>Prüfer-Audio abspielen</span>
                          </>
                        )}
                      </button>
                    </div>
                    {(!isExamMode || examinerPlayedOnce) ? (
                      <p className="mt-3 rounded-lg border border-slate-200 bg-white p-3 text-xs italic text-slate-700">
                        „{currentTeil.examinerScript}“
                      </p>
                    ) : (
                      <p className="mt-3 rounded-lg border border-amber-200 bg-amber-50/70 p-3 text-xs font-medium text-amber-900 flex items-center gap-1.5">
                        <Lock className="h-3.5 w-3.5 shrink-0" />
                        <span>Prüfungsmodus: Bitte spielen Sie zuerst den Prüfer-Impuls per Audio ab.</span>
                      </p>
                    )}
                    <audio
                      ref={examinerAudioRef}
                      key={currentTeil.examinerAudioToken || currentTeil.id}
                      src={
                        currentTeil.examinerAudioToken
                          ? `/api/drive/stream-audio?token=${encodeURIComponent(
                              currentTeil.examinerAudioToken,
                            )}`
                          : `/api/tts?text=${encodeURIComponent(currentTeil.examinerScript)}`
                      }
                      playsInline
                      preload="auto"
                      onPlay={() => {
                        setExaminerPlaying(true);
                        setExaminerPlayedOnce(true);
                      }}
                      onPause={() => setExaminerPlaying(false)}
                      onEnded={() => setExaminerPlaying(false)}
                      onError={() => setExaminerPlaying(false)}
                    />
                  </div>
                </div>
              </div>

              {/* RIGHT: MediaRecorder Microphone Widget + Whisper AI Evaluation */}
              <div className="lg:col-span-6 space-y-4">
                <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm space-y-5 text-slate-900">
                  <div>
                    <h3 className="text-base font-extrabold text-slate-900">
                      Ihre Sprachaufnahme (Browser MediaRecorder → Whisper-large-v3)
                    </h3>
                    <p className="text-xs text-slate-500 mt-0.5">
                      Nehmen Sie Ihre Antwort direkt im Browser auf und senden Sie sie zur KI-Bewertung.
                    </p>
                  </div>

                  {/* Mic control center with Framer Motion Smooth Pulse */}
                  <div className="flex flex-col items-center justify-center rounded-2xl border border-slate-200 bg-slate-50/70 p-7 text-center">
                    <div className="relative flex items-center justify-center h-28 w-28">
                      {isRecording && (
                        <>
                          <motion.div
                            animate={{ scale: [1, 1.4, 1.9], opacity: [0.7, 0.3, 0] }}
                            transition={{ repeat: Infinity, duration: 1.8, ease: "easeOut" }}
                            className="absolute inset-0 rounded-full bg-red-500"
                          />
                          <motion.div
                            animate={{ scale: [1, 1.25, 1.55], opacity: [0.6, 0.25, 0] }}
                            transition={{ repeat: Infinity, duration: 1.8, ease: "easeOut", delay: 0.4 }}
                            className="absolute inset-0 rounded-full bg-red-400"
                          />
                        </>
                      )}
                      <motion.button
                        whileHover={{ scale: 1.05 }}
                        whileTap={{ scale: 0.94 }}
                        type="button"
                        onClick={isRecording ? stopRecording : startRecording}
                        className={`relative z-10 cursor-pointer flex h-20 w-20 items-center justify-center rounded-full shadow-lg transition-all duration-200 ${
                          isRecording
                            ? "bg-red-600 text-white shadow-red-500/40"
                            : "bg-slate-900 text-white hover:bg-slate-800"
                        }`}
                      >
                        {isRecording ? (
                          <Square className="h-7 w-7 fill-current" />
                        ) : (
                          <Mic className="h-9 w-9" />
                        )}
                      </motion.button>
                    </div>

                    {/* Animated sound wave bars when recording */}
                    {isRecording && (
                      <div className="flex items-center justify-center gap-1.5 h-6 mt-3">
                        {[40, 75, 100, 60, 90, 45, 80, 50, 95].map((h, i) => (
                          <motion.div
                            key={i}
                            animate={{ height: [`${h * 0.25}%`, `${h}%`, `${h * 0.3}%`] }}
                            transition={{ repeat: Infinity, duration: 0.5 + i * 0.07, ease: "easeInOut" }}
                            className="w-1 rounded-full bg-red-500"
                          />
                        ))}
                      </div>
                    )}

                    <p className="mt-3 font-mono text-base font-extrabold text-slate-900">
                      {isRecording
                        ? `Aufnahme läuft… ${recordingSeconds}s`
                        : recordedBlob
                          ? `Aufnahme bereit (${recordingSeconds}s)`
                          : "Klicken Sie auf das Mikrofon zum Starten"}
                    </p>
                    <p className="text-xs font-semibold text-slate-500">
                      Ziel-Sprechzeit: ca. {currentTeil.speakSeconds} Sekunden
                    </p>

                    {recordedUrl && (
                      <audio
                        controls
                        playsInline
                        src={recordedUrl}
                        onError={() => {
                          console.warn("[gtf sprechen] Recorded audio playback error");
                        }}
                        className="mt-4 w-full max-w-md rounded-2xl [color-scheme:light]"
                      />
                    )}
                  </div>

                  {/* Optional transcript override: hidden in Prüfungsmodus unless mic access was denied */}
                  {(!isExamMode || micDenied) && (
                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                        {isExamMode
                          ? "Barrierefreiheits-Fallback (Mikrofon nicht verfügbar):"
                          : "Optionales Transkript / Notizen (falls kein Mikrofon angeschlossen ist):"}
                      </label>
                      <textarea
                        rows={3}
                        disabled={isExamMode && sectionExpired}
                        value={clientTranscript}
                        onChange={(e) => setClientTranscript(e.target.value)}
                        placeholder="Wenn Sie mit Mikrofon aufnehmen, transkribiert die KI Ihre Sprache automatisch…"
                        className="w-full rounded-xl border border-slate-300 bg-white p-3 text-xs text-slate-900 placeholder:text-slate-400 focus:border-slate-900 focus:outline-none disabled:bg-slate-100"
                      />
                    </div>
                  )}

                  {errorMsg && (
                    <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-2.5 text-xs font-medium text-amber-800">
                      {errorMsg}
                    </div>
                  )}

                  <div className="flex flex-wrap items-center justify-between gap-3">
                    {isExamMode ? (
                      <span className="inline-flex items-center gap-1.5 rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-xs font-semibold text-rose-800">
                        <Lock className="h-3.5 w-3.5" />
                        <span>Prüfungsmodus · Demo-Aufnahme gesperrt</span>
                      </span>
                    ) : (
                      <button
                        type="button"
                        disabled={evaluating}
                        onClick={() =>
                          submitForEvaluation(
                            clientTranscript ||
                              "Guten Tag! Unser Freund aus dem Deutschkurs zieht nach Hamburg. Wie wäre es, wenn wir am Samstagabend eine Überraschungsparty bei mir zu Hause feiern? Ich kann das Essen vorbereiten und wir kaufen zusammen ein schönes Fotobuch von Berlin als Geschenk.",
                          )
                        }
                        className="relative z-10 cursor-pointer rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-2.5 text-xs font-semibold text-slate-700 hover:bg-slate-100 hover:text-slate-900 transition"
                      >
                        Demo-Sprachaufnahme simulieren
                      </button>
                    )}

                    <button
                      type="button"
                      disabled={evaluating || (isExamMode && sectionExpired)}
                      onClick={() => submitForEvaluation()}
                      className="relative z-10 cursor-pointer inline-flex items-center gap-2 rounded-xl bg-slate-900 text-white px-5 py-3 text-xs font-extrabold shadow-sm hover:bg-slate-800 disabled:opacity-50 sm:text-sm transition"
                    >
                      <Sparkles className="h-4 w-4 text-white" />
                      <span>
                        {evaluating
                          ? "Transcribing & Grading…"
                          : "Send Audio for AI Evaluation"}
                      </span>
                    </button>
                  </div>
                </div>

                {/* SPRECHEN AI EVALUATION RESULT */}
                {currentEvaluation && (
                  <div className="rounded-2xl border border-emerald-200 bg-white p-6 shadow-sm space-y-4 text-slate-900">
                    <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 pb-3">
                      <div>
                        <span className="inline-flex items-center gap-1 rounded-full border border-emerald-200 bg-emerald-50 px-2.5 py-0.5 text-[11px] font-bold text-emerald-700">
                          <CheckCircle2 className="h-3.5 w-3.5" />
                          Engine: {currentEvaluation.engine.toUpperCase()} · STT:{" "}
                          {currentEvaluation.transcriptionEngine.toUpperCase()}
                        </span>
                        <h4 className="mt-1.5 text-lg font-extrabold text-slate-900">
                          Sprechen Score: {currentEvaluation.score} / 100 (GER{" "}
                          {currentEvaluation.cefrEstimate})
                        </h4>
                      </div>
                    </div>

                    <div className="rounded-xl border border-slate-200 bg-slate-50/70 p-3.5 text-xs text-slate-800">
                      <span className="font-bold text-slate-500 uppercase">
                        Erkanntes Transkript:
                      </span>
                      <p className="mt-1 italic text-slate-700">„{currentEvaluation.transcript}“</p>
                    </div>

                    <div className="grid grid-cols-2 sm:grid-cols-5 gap-2 text-center text-xs">
                      <div className="rounded-xl border border-slate-200 bg-slate-50 p-2.5">
                        <div className="text-[10px] text-slate-500">Inhalt</div>
                        <div className="font-bold text-slate-900">{currentEvaluation.criteria.taskFulfilment}/20</div>
                      </div>
                      <div className="rounded-xl border border-slate-200 bg-slate-50 p-2.5">
                        <div className="text-[10px] text-slate-500">Flüssigkeit</div>
                        <div className="font-bold text-slate-900">{currentEvaluation.criteria.fluency}/20</div>
                      </div>
                      <div className="rounded-xl border border-slate-200 bg-slate-50 p-2.5">
                        <div className="text-[10px] text-slate-500">Aussprache</div>
                        <div className="font-bold text-slate-900">{currentEvaluation.criteria.pronunciation}/20</div>
                      </div>
                      <div className="rounded-xl border border-slate-200 bg-slate-50 p-2.5">
                        <div className="text-[10px] text-slate-500">Grammatik</div>
                        <div className="font-bold text-slate-900">{currentEvaluation.criteria.grammar}/20</div>
                      </div>
                      <div className="rounded-xl border border-slate-200 bg-slate-50 p-2.5 col-span-2 sm:col-span-1">
                        <div className="text-[10px] text-slate-500">Wortschatz</div>
                        <div className="font-bold text-slate-900">{currentEvaluation.criteria.vocabulary}/20</div>
                      </div>
                    </div>

                    <div className="grid gap-3 sm:grid-cols-2 text-xs">
                      <div className="rounded-xl border border-sky-200 bg-sky-50/70 p-3 text-sky-900">
                        <p className="font-bold text-sky-800">Feedback (Deutsch):</p>
                        <p className="mt-1 text-slate-700">{currentEvaluation.summaryDe}</p>
                      </div>
                      <div className="rounded-xl border border-amber-200 bg-amber-50/70 p-3 text-amber-900">
                        <p className="font-bold text-amber-800">Feedback (Hinglish):</p>
                        <p className="mt-1 text-slate-700">{currentEvaluation.summaryHinglish}</p>
                      </div>
                    </div>

                    {currentEvaluation.pronunciationNotes.length > 0 && (
                      <div className="rounded-xl border border-slate-200 bg-slate-50/70 p-3.5 text-xs text-slate-800">
                        <p className="font-bold text-slate-900 mb-1">
                          Aussprache-Coaching (Pronunciation):
                        </p>
                        <ul className="list-inside list-disc space-y-1 text-slate-600">
                          {currentEvaluation.pronunciationNotes.map((n, i) => (
                            <li key={i}>{n}</li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}

export default function SprechenExamPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center bg-slate-50 text-slate-600 text-sm">
          Lade Prüfungsmodul Sprechen…
        </div>
      }
    >
      <SprechenExamPageInner />
    </Suspense>
  );
}
