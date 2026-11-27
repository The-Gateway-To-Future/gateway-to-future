"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  Ban,
  Calculator,
  CheckCircle2,
  Clock,
  Eraser,
  FileText,
  NotebookPen,
  Pencil,
  RotateCcw,
  Sparkles,
  XCircle,
} from "lucide-react";
import { MathText } from "@/components/MathText";
import { useAuth } from "@/lib/auth-context";
import { resolveProgressUid } from "@/lib/firebase/progress";
import { recordMistakeOccurrences } from "@/lib/mistake-dna/store";
import {
  STUDIENKOLLEG_CTESTS,
  STUDIENKOLLEG_MATH_SPRINT,
  gradeCTestGap,
  isStkMathAnswerCorrect,
  parseCTestSegments,
  type CTestGapSegment,
} from "@/lib/studienkolleg-drills";

const UMLAUTS = ["ä", "ö", "ü", "ß"] as const;
const MATH_SYMBOLS = ["√", "π", "²", "³", "∫", "→", "≠", "≤", "≥", "±"] as const;

function formatTimer(sec: number): string {
  const safe = Math.max(0, sec);
  const m = Math.floor(safe / 60);
  const s = safe % 60;
  return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
}

/**
 * Interactive Schmierzettel (Freehand Touch/Mouse Canvas + Monospace Formula Pad)
 * Strictly NO calculator — authentic German Studienkolleg Aufnahmeprüfung discipline.
 */
function OhneTaschenrechnerScratchpad() {
  const [padMode, setPadMode] = useState<"draw" | "notes">("draw");
  const [notes, setNotes] = useState("");
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const drawingRef = useRef(false);

  const getCoords = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0 };
    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    return {
      x: (e.clientX - rect.left) * scaleX,
      y: (e.clientY - rect.top) * scaleY,
    };
  };

  const handlePointerDown = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext("2d");
    if (!canvas || !ctx) return;
    canvas.setPointerCapture(e.pointerId);
    drawingRef.current = true;
    const { x, y } = getCoords(e);
    ctx.strokeStyle = "#0f172a";
    ctx.lineWidth = 2.2;
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    ctx.beginPath();
    ctx.moveTo(x, y);
  };

  const handlePointerMove = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (!drawingRef.current) return;
    const ctx = canvasRef.current?.getContext("2d");
    if (!ctx) return;
    const { x, y } = getCoords(e);
    ctx.lineTo(x, y);
    ctx.stroke();
  };

  const handlePointerUp = () => {
    drawingRef.current = false;
  };

  const clearCanvas = () => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext("2d");
    if (canvas && ctx) {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
    }
  };

  return (
    <div className="rounded-2xl border border-amber-200 bg-amber-50/60 p-4 space-y-3 shadow-xs">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <NotebookPen className="h-4 w-4 text-amber-800" />
          <span className="text-xs font-extrabold uppercase tracking-wider text-amber-950">
            Schmierzettel · Ohne Taschenrechner
          </span>
        </div>

        <div className="flex items-center gap-1.5">
          <button
            type="button"
            onClick={() => setPadMode("draw")}
            className={`inline-flex items-center gap-1 rounded-lg px-2.5 py-1 text-[11px] font-bold transition cursor-pointer ${
              padMode === "draw"
                ? "bg-slate-900 text-white"
                : "bg-white border border-amber-200 text-slate-700 hover:bg-amber-100"
            }`}
          >
            <Pencil className="h-3 w-3" />
            <span>Skizze</span>
          </button>
          <button
            type="button"
            onClick={() => setPadMode("notes")}
            className={`inline-flex items-center gap-1 rounded-lg px-2.5 py-1 text-[11px] font-bold transition cursor-pointer ${
              padMode === "notes"
                ? "bg-slate-900 text-white"
                : "bg-white border border-amber-200 text-slate-700 hover:bg-amber-100"
            }`}
          >
            <FileText className="h-3 w-3" />
            <span>Notizen</span>
          </button>
          <button
            type="button"
            onClick={() => (padMode === "draw" ? clearCanvas() : setNotes(""))}
            className="inline-flex items-center gap-1 rounded-lg border border-amber-300 bg-white px-2.5 py-1 text-[11px] font-bold text-amber-900 hover:bg-amber-100 cursor-pointer"
            title="Schmierzettel leeren"
          >
            <Eraser className="h-3 w-3" />
            <span>Leeren</span>
          </button>
        </div>
      </div>

      {padMode === "draw" ? (
        <div className="rounded-xl border border-amber-200 bg-white overflow-hidden">
          <canvas
            ref={canvasRef}
            width={640}
            height={260}
            onPointerDown={handlePointerDown}
            onPointerMove={handlePointerMove}
            onPointerUp={handlePointerUp}
            onPointerCancel={handlePointerUp}
            style={{ touchAction: "none" }}
            className="w-full h-[220px] sm:h-[260px] cursor-crosshair bg-[radial-gradient(#e2e8f0_1px,transparent_1px)] [background-size:16px_16px]"
          />
        </div>
      ) : (
        <div className="space-y-2">
          <div className="flex flex-wrap gap-1">
            {MATH_SYMBOLS.map((sym) => (
              <button
                key={sym}
                type="button"
                onClick={() => setNotes((prev) => prev + sym)}
                className="h-7 min-w-[28px] rounded-md border border-amber-200 bg-white px-1.5 font-mono text-xs font-bold text-slate-800 hover:bg-slate-900 hover:text-white transition cursor-pointer"
              >
                {sym}
              </button>
            ))}
          </div>
          <textarea
            rows={7}
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Rechenschritte ohne Taschenrechner notieren…"
            className="w-full rounded-xl border border-amber-200 bg-white p-3 font-mono text-xs text-slate-900 focus:border-amber-500 focus:outline-none"
          />
        </div>
      )}
    </div>
  );
}

export function StudienkollegDrillsWorkspace() {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState<"ctest" | "math">("ctest");

  /* ── C-Test Half-Word Trainer State ── */
  const [ctestId, setCtestId] = useState(STUDIENKOLLEG_CTESTS[0].id);
  const [ctestInputs, setCtestInputs] = useState<Record<string, string>>({});
  const [ctestGraded, setCtestGraded] = useState(false);
  const [ctestStrictTimer, setCtestStrictTimer] = useState(false);
  const [ctestSecondsLeft, setCtestSecondsLeft] = useState(600);
  const [focusedGapId, setFocusedGapId] = useState<string | null>(null);

  const activeCTest = useMemo(
    () => STUDIENKOLLEG_CTESTS.find((c) => c.id === ctestId) || STUDIENKOLLEG_CTESTS[0],
    [ctestId],
  );
  const ctestSegments = useMemo(
    () => parseCTestSegments(activeCTest.encodedText),
    [activeCTest],
  );
  const ctestGaps = useMemo(
    () => ctestSegments.filter((s): s is CTestGapSegment => s.kind === "gap"),
    [ctestSegments],
  );

  useEffect(() => {
    setCtestInputs({});
    setCtestGraded(false);
    setFocusedGapId(null);
    setCtestSecondsLeft(activeCTest.recommendedMinutes * 60);
  }, [activeCTest]);

  useEffect(() => {
    if (!ctestStrictTimer || ctestGraded) return;
    const id = window.setInterval(() => {
      setCtestSecondsLeft((prev) => {
        if (prev <= 1) {
          setCtestGraded(true);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => window.clearInterval(id);
  }, [ctestStrictTimer, ctestGraded]);

  const ctestScore = useMemo(() => {
    let correct = 0;
    for (const g of ctestGaps) {
      if (gradeCTestGap(ctestInputs[g.id] || "", g.missing)) {
        correct += 1;
      }
    }
    const percent = Math.round((correct / Math.max(1, ctestGaps.length)) * 100);
    return { correct, total: ctestGaps.length, percent, passed: percent >= 60 };
  }, [ctestGaps, ctestInputs]);

  const handleGradeCTest = () => {
    setCtestGraded(true);
    const uid = resolveProgressUid(user);
    if (uid && uid !== "guest") {
      const misses = ctestGaps
        .filter((g) => !gradeCTestGap(ctestInputs[g.id] || "", g.missing))
        .slice(0, 6)
        .map((g) => ({
          errorKey: "LESEN_SYNONYM_PARAPHRASE" as const,
          source: "workbook" as const,
          prompt: `C-Test (${activeCTest.university}): ${g.prefix}___`,
          wrong: `${g.prefix}${ctestInputs[g.id] || "___"}`,
          right: g.fullWord,
        }));
      if (misses.length > 0) {
        void recordMistakeOccurrences(uid, misses);
      }
    }
  };

  const insertUmlautIntoGap = (ch: string) => {
    if (ctestGraded) return;
    const targetId = focusedGapId || ctestGaps[0]?.id;
    if (!targetId) return;
    setCtestInputs((prev) => ({ ...prev, [targetId]: (prev[targetId] || "") + ch }));
  };

  /* ── Ohne-Taschenrechner Math Sprint State ── */
  const [mathTrackFilter, setMathTrackFilter] = useState<"all" | "t_kurs" | "m_kurs" | "w_kurs">("all");
  const [mathAnswers, setMathAnswers] = useState<Record<string, string>>({});
  const [mathGraded, setMathGraded] = useState(false);
  const [mathSprintActive, setMathSprintActive] = useState(false);
  const [mathSecondsLeft, setMathSecondsLeft] = useState(600);

  const visibleMathQuestions = useMemo(
    () =>
      mathTrackFilter === "all"
        ? STUDIENKOLLEG_MATH_SPRINT
        : STUDIENKOLLEG_MATH_SPRINT.filter((q) => q.track === mathTrackFilter),
    [mathTrackFilter],
  );

  useEffect(() => {
    if (!mathSprintActive || mathGraded) return;
    const id = window.setInterval(() => {
      setMathSecondsLeft((prev) => {
        if (prev <= 1) {
          setMathGraded(true);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => window.clearInterval(id);
  }, [mathSprintActive, mathGraded]);

  const mathScore = useMemo(() => {
    let correct = 0;
    for (const q of visibleMathQuestions) {
      if (isStkMathAnswerCorrect(mathAnswers[q.id] || "", q)) correct += 1;
    }
    const percent = Math.round((correct / Math.max(1, visibleMathQuestions.length)) * 100);
    return { correct, total: visibleMathQuestions.length, percent, passed: percent >= 60 };
  }, [visibleMathQuestions, mathAnswers]);

  return (
    <section className="mx-auto max-w-6xl px-4 sm:px-8 pb-12 space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-4 border-b border-slate-200 pb-4">
        <div className="space-y-1">
          <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-amber-700">
            PRÜFUNGSMODUS · INTERACTIVE STUDIENKOLLEG PROCTOR LAB
          </p>
          <h2 className="text-2xl sm:text-3xl font-bold tracking-tight text-slate-900">
            C-Test Half-Word Trainer &amp; Ohne-Taschenrechner Math Sprint
          </h2>
        </div>

        {/* Mode Switcher Tabs */}
        <div className="inline-flex rounded-2xl border border-slate-200 bg-white p-1 shadow-xs">
          <button
            type="button"
            onClick={() => setActiveTab("ctest")}
            className={`inline-flex items-center gap-1.5 rounded-xl px-4 py-2 text-xs font-bold transition cursor-pointer ${
              activeTab === "ctest"
                ? "bg-slate-900 text-white shadow-xs"
                : "text-slate-600 hover:text-slate-900 hover:bg-slate-50"
            }`}
          >
            <FileText className="h-3.5 w-3.5" />
            <span>C-Test Half-Word Trainer</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("math")}
            className={`inline-flex items-center gap-1.5 rounded-xl px-4 py-2 text-xs font-bold transition cursor-pointer ${
              activeTab === "math"
                ? "bg-slate-900 text-white shadow-xs"
                : "text-slate-600 hover:text-slate-900 hover:bg-slate-50"
            }`}
          >
            <Calculator className="h-3.5 w-3.5" />
            <span>Ohne-Taschenrechner Sprint</span>
          </button>
        </div>
      </div>

      {/* ══════════════════ TAB 1: C-TEST HALF-WORD COMPLETION ══════════════════ */}
      {activeTab === "ctest" && (
        <div className="rounded-3xl border border-slate-200 bg-white p-5 sm:p-8 shadow-sm space-y-6">
          {/* Top Bar: University selector + Proctor Timer + Umlaut Bar */}
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 pb-4">
            <div className="flex flex-wrap gap-1.5">
              {STUDIENKOLLEG_CTESTS.map((ct) => {
                const active = ct.id === activeCTest.id;
                return (
                  <button
                    key={ct.id}
                    type="button"
                    onClick={() => setCtestId(ct.id)}
                    className={`rounded-xl border px-3 py-1.5 text-xs font-bold transition cursor-pointer ${
                      active
                        ? "border-slate-900 bg-slate-900 text-white"
                        : "border-slate-200 bg-slate-50 text-slate-700 hover:bg-slate-100"
                    }`}
                  >
                    {ct.university}{" "}
                    <span className={active ? "text-slate-300" : "text-slate-400"}>
                      ({ct.trackLabel.split(" ")[0]})
                    </span>
                  </button>
                );
              })}
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={() => {
                  setCtestStrictTimer((s) => !s);
                  if (!ctestStrictTimer) {
                    setCtestSecondsLeft(activeCTest.recommendedMinutes * 60);
                  }
                }}
                className={`inline-flex items-center gap-1.5 rounded-xl border px-3 py-1.5 text-xs font-bold transition cursor-pointer ${
                  ctestStrictTimer
                    ? "border-rose-300 bg-rose-50 text-rose-800"
                    : "border-slate-200 bg-slate-50 text-slate-700 hover:bg-slate-100"
                }`}
              >
                <Clock className="h-3.5 w-3.5" />
                <span className="font-mono">{formatTimer(ctestSecondsLeft)}</span>
                <span>{ctestStrictTimer ? "· Prüfungs-Timer aktiv" : "· 10-Min Timer starten"}</span>
              </button>
            </div>
          </div>

          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <span className="text-[10px] font-bold uppercase tracking-[0.18em] text-amber-700">
                {activeCTest.university} · {activeCTest.trackLabel} · {ctestGaps.length} Lücken
              </span>
              <h3 className="text-lg sm:text-xl font-bold text-slate-900">
                {activeCTest.title}
              </h3>
            </div>

            <div className="flex items-center gap-1.5">
              <span className="text-[11px] font-bold text-slate-500">Umlaute:</span>
              {UMLAUTS.map((u) => (
                <button
                  key={u}
                  type="button"
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={() => insertUmlautIntoGap(u)}
                  className="h-8 w-8 rounded-lg border border-slate-200 bg-slate-50 font-mono text-xs font-extrabold text-slate-900 hover:bg-slate-900 hover:text-white transition cursor-pointer"
                >
                  {u}
                </button>
              ))}
            </div>
          </div>

          {/* Interactive Half-Word Passage */}
          <div className="rounded-2xl border border-slate-200 bg-slate-50/70 p-5 sm:p-6 leading-[2.4] text-sm sm:text-base text-slate-800 german-reading">
            {ctestSegments.map((seg, idx) => {
              if (seg.kind === "text") {
                return <span key={idx}>{seg.text}</span>;
              }
              const val = ctestInputs[seg.id] || "";
              const isRight = ctestGraded && gradeCTestGap(val, seg.missing);
              const isWrong = ctestGraded && !isRight;
              const widthCh = Math.max(4, Math.min(12, seg.missing.length + 1));

              return (
                <span key={seg.id} className="inline-flex items-baseline whitespace-nowrap mx-0.5">
                  <span className="font-bold text-slate-950">{seg.prefix}</span>
                  <input
                    type="text"
                    disabled={ctestGraded}
                    value={val}
                    onFocus={() => setFocusedGapId(seg.id)}
                    onChange={(e) =>
                      setCtestInputs((prev) => ({ ...prev, [seg.id]: e.target.value }))
                    }
                    aria-label={`C-Test Lücke ${seg.id} nach ${seg.prefix}`}
                    autoComplete="off"
                    autoCorrect="off"
                    spellCheck={false}
                    style={{ width: `${widthCh}ch` }}
                    className={`mx-0.5 rounded-md border px-1.5 py-0.5 font-mono text-xs sm:text-sm font-bold outline-none transition ${
                      isRight
                        ? "border-emerald-500 bg-emerald-50 text-emerald-900"
                        : isWrong
                          ? "border-rose-400 bg-rose-50 text-rose-800"
                          : "border-slate-300 bg-white text-slate-900 focus:border-slate-900 focus:ring-1 focus:ring-slate-900"
                    }`}
                  />
                  {isWrong && (
                    <span className="ml-0.5 rounded bg-emerald-100 px-1 py-0.5 font-mono text-[11px] font-bold text-emerald-800">
                      {seg.missing}
                    </span>
                  )}
                  {seg.trailing && <span>{seg.trailing}</span>}
                </span>
              );
            })}
          </div>

          <div className="rounded-xl border border-sky-200 bg-sky-50/70 px-4 py-3 text-xs text-sky-950">
            <strong>GTF Hinglish C-Test Strategy:</strong> {activeCTest.hintHinglish}
          </div>

          {/* Grading Summary & Controls */}
          <div className="flex flex-wrap items-center justify-between gap-3 pt-2 border-t border-slate-100">
            {ctestGraded ? (
              <div className="flex flex-wrap items-center gap-3">
                <span
                  className={`inline-flex items-center gap-1.5 rounded-full border px-3.5 py-1.5 text-xs font-extrabold ${
                    ctestScore.passed
                      ? "border-emerald-300 bg-emerald-50 text-emerald-800"
                      : "border-amber-300 bg-amber-50 text-amber-900"
                  }`}
                >
                  {ctestScore.passed ? (
                    <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                  ) : (
                    <XCircle className="h-4 w-4 text-amber-700" />
                  )}
                  <span>
                    {ctestScore.correct} / {ctestScore.total} richtig ({ctestScore.percent}%) ·{" "}
                    {ctestScore.passed ? "Aufnahmeprüfung-Niveau erreicht" : "Unter 60% — weiter üben"}
                  </span>
                </span>
              </div>
            ) : (
              <span className="text-xs text-slate-500 font-medium">
                Ausgefüllt: {Object.values(ctestInputs).filter((v) => v.trim()).length} / {ctestGaps.length} Lücken
              </span>
            )}

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => {
                  setCtestInputs({});
                  setCtestGraded(false);
                  setCtestSecondsLeft(activeCTest.recommendedMinutes * 60);
                }}
                className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-xs font-bold text-slate-700 hover:bg-slate-50 transition cursor-pointer"
              >
                <RotateCcw className="h-3.5 w-3.5" />
                <span>Neu starten</span>
              </button>
              {!ctestGraded && (
                <button
                  type="button"
                  onClick={handleGradeCTest}
                  className="inline-flex items-center gap-1.5 rounded-xl bg-slate-900 px-5 py-2.5 text-xs font-bold uppercase tracking-[0.14em] text-white hover:bg-slate-800 transition cursor-pointer"
                >
                  <Sparkles className="h-3.5 w-3.5" />
                  <span>C-Test auswerten</span>
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ══════════════════ TAB 2: OHNE-TASCHENRECHNER MATH SPRINT ══════════════════ */}
      {activeTab === "math" && (
        <div className="space-y-5">
          {/* Top Proctor Discipline Banner */}
          <div className="rounded-2xl border border-amber-300 bg-amber-50 p-4 flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-2.5">
              <Ban className="h-5 w-5 text-amber-800 shrink-0" />
              <div className="text-xs">
                <p className="font-extrabold uppercase tracking-wider text-amber-950">
                  Prüfungsmodus: Streng Ohne Taschenrechner (No Calculator Allowed)
                </p>
                <p className="text-amber-900">
                  Lösen Sie alle Aufgaben im Kopf oder mit dem digitalen Schmierzettel — exakt wie bei TU Berlin, KIT &amp; LMU.
                </p>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              {(["all", "t_kurs", "m_kurs", "w_kurs"] as const).map((tr) => (
                <button
                  key={tr}
                  type="button"
                  onClick={() => {
                    setMathTrackFilter(tr);
                    setMathGraded(false);
                  }}
                  className={`rounded-lg px-2.5 py-1 text-[11px] font-bold uppercase transition cursor-pointer ${
                    mathTrackFilter === tr
                      ? "bg-slate-900 text-white"
                      : "bg-white border border-amber-200 text-slate-700 hover:bg-amber-100"
                  }`}
                >
                  {tr === "all" ? "Alle" : tr.replace("_", "-")}
                </button>
              ))}
              <button
                type="button"
                onClick={() => {
                  setMathSprintActive((s) => !s);
                  if (!mathSprintActive) setMathSecondsLeft(600);
                }}
                className={`inline-flex items-center gap-1.5 rounded-xl border px-3 py-1.5 text-xs font-bold transition cursor-pointer ${
                  mathSprintActive
                    ? "border-rose-300 bg-rose-600 text-white"
                    : "border-slate-300 bg-white text-slate-800 hover:bg-slate-50"
                }`}
              >
                <Clock className="h-3.5 w-3.5" />
                <span className="font-mono">{formatTimer(mathSecondsLeft)}</span>
                <span>{mathSprintActive ? "Sprint läuft" : "10-Min Sprint"}</span>
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
            {/* Left: Timed Math Sprint Questions */}
            <div className="lg:col-span-7 space-y-3">
              {visibleMathQuestions.map((q, idx) => {
                const given = mathAnswers[q.id] || "";
                const isRight = mathGraded && isStkMathAnswerCorrect(given, q);
                const isWrong = mathGraded && !isRight;
                return (
                  <div
                    key={q.id}
                    className={`rounded-2xl border p-4 sm:p-5 space-y-3 shadow-2xs transition ${
                      isRight
                        ? "border-emerald-300 bg-emerald-50/40"
                        : isWrong
                          ? "border-amber-300 bg-amber-50/40"
                          : "border-slate-200 bg-white"
                    }`}
                  >
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <span className="text-[10px] font-bold uppercase tracking-[0.16em] text-slate-500">
                        Aufgabe {idx + 1} · {q.track.replace("_", "-").toUpperCase()} · {q.topic}
                      </span>
                      {mathGraded && (
                        <span
                          className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-[10px] font-bold ${
                            isRight
                              ? "bg-emerald-100 text-emerald-800"
                              : "bg-rose-100 text-rose-800"
                          }`}
                        >
                          {isRight ? "Richtig ✓" : "Überprüfen"}
                        </span>
                      )}
                    </div>

                    <div className="text-sm sm:text-base font-bold text-slate-900 overflow-x-auto">
                      <MathText text={q.promptLatex} />
                    </div>

                    <div className="flex flex-wrap items-center gap-3">
                      <input
                        type="text"
                        disabled={mathGraded}
                        value={given}
                        onChange={(e) =>
                          setMathAnswers((prev) => ({ ...prev, [q.id]: e.target.value }))
                        }
                        placeholder={q.placeholder}
                        className="w-44 h-10 rounded-xl border border-slate-300 bg-white px-3 font-mono text-sm font-bold text-slate-900 focus:border-slate-900 focus:outline-none disabled:bg-slate-100"
                      />
                      {mathGraded && (
                        <span className="text-xs font-bold text-emerald-700">
                          Lösung: <MathText text={q.displayAnswer} />
                        </span>
                      )}
                    </div>

                    {mathGraded && (
                      <div className="rounded-xl border border-slate-200 bg-white p-3 text-xs space-y-1.5">
                        <p className="font-bold text-slate-900">Rechenweg (Ohne Taschenrechner):</p>
                        <ul className="list-disc pl-4 space-y-1 text-slate-700">
                          {q.stepsLatex.map((st, sIdx) => (
                            <li key={sIdx} className="overflow-x-auto">
                              <MathText text={st} />
                            </li>
                          ))}
                        </ul>
                        <p className="text-[#0f4c81] font-medium pt-1">
                          <strong>Hinglish Shortcut:</strong> {q.mentalShortcutHinglish}
                        </p>
                      </div>
                    )}
                  </div>
                );
              })}

              {/* Grade / Reset Bar */}
              <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-slate-200 bg-white p-4 shadow-xs">
                {mathGraded ? (
                  <span
                    className={`inline-flex items-center gap-1.5 rounded-full border px-3.5 py-1.5 text-xs font-extrabold ${
                      mathScore.passed
                        ? "border-emerald-300 bg-emerald-50 text-emerald-800"
                        : "border-amber-300 bg-amber-50 text-amber-900"
                    }`}
                  >
                    {mathScore.correct} / {mathScore.total} richtig ({mathScore.percent}%)
                  </span>
                ) : (
                  <span className="text-xs font-medium text-slate-500">
                    Beantwortet: {visibleMathQuestions.filter((q) => (mathAnswers[q.id] || "").trim()).length} /{" "}
                    {visibleMathQuestions.length}
                  </span>
                )}

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      setMathAnswers({});
                      setMathGraded(false);
                      setMathSecondsLeft(600);
                    }}
                    className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-4 py-2 text-xs font-bold text-slate-700 hover:bg-slate-50 transition cursor-pointer"
                  >
                    <RotateCcw className="h-3.5 w-3.5" />
                    <span>Reset</span>
                  </button>
                  {!mathGraded && (
                    <button
                      type="button"
                      onClick={() => setMathGraded(true)}
                      className="inline-flex items-center gap-1.5 rounded-xl bg-slate-900 px-5 py-2 text-xs font-bold uppercase tracking-[0.14em] text-white hover:bg-slate-800 transition cursor-pointer"
                    >
                      <Sparkles className="h-3.5 w-3.5" />
                      <span>Sprint auswerten</span>
                    </button>
                  )}
                </div>
              </div>
            </div>

            {/* Right: Sticky Digital Schmierzettel Scratchpad */}
            <div className="lg:col-span-5 lg:sticky lg:top-24">
              <OhneTaschenrechnerScratchpad />
            </div>
          </div>
        </div>
      )}
    </section>
  );
}
