"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import {
  ArrowRight,
  CheckCircle2,
  PenTool,
  Sparkles,
  Wand2,
} from "lucide-react";
import { ExamHeader } from "@/components/ExamHeader";
import {
  getActiveUserEmail,
  loadExamState,
  resetExamState,
  saveExamState,
} from "@/lib/client-storage";
import { isLevel, type Level } from "@/lib/config";
import type { ExamTest, SchreibenEvaluation, SchreibenTask } from "@/lib/types";

const UMLAUTS = ["ä", "ö", "ü", "Ä", "Ö", "Ü", "ß"] as const;

function countWords(text: string): number {
  const cleaned = text.trim();
  if (!cleaned) return 0;
  return cleaned.split(/\s+/).length;
}

export default function SchreibenExamPage() {
  const params = useParams<{ level: string }>();
  const rawLevel = (params?.level || "b1").toLowerCase();
  const level: Level = isLevel(rawLevel) ? rawLevel : "b1";

  const [test, setTest] = useState<ExamTest | null>(null);
  const [activeTaskIdx, setActiveTaskIdx] = useState(0);
  const [drafts, setDrafts] = useState<Record<string, string>>({});
  const [evaluations, setEvaluations] = useState<Record<string, SchreibenEvaluation>>({});
  const [evaluating, setEvaluating] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const textareaRef = useRef<HTMLTextAreaElement | null>(null);

  useEffect(() => {
    const st = loadExamState(level);
    setDrafts(st.schreibenDrafts || {});
    setEvaluations(st.schreibenEvaluations || {});

    // 1. Instant cache check for <100ms load
    try {
      const cached = sessionStorage.getItem(`gtf_exam_test_${level}`);
      if (cached) {
        const parsed = JSON.parse(cached) as ExamTest;
        if (parsed?.sections?.schreiben?.tasks?.length) {
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
          if (data?.test?.sections?.schreiben?.tasks?.length) {
            setTest(data.test);
            try {
              sessionStorage.setItem(`gtf_exam_test_${level}`, JSON.stringify(data.test));
            } catch {}
          }
        }
      } catch (err) {
        console.warn("[gtf] Error loading schreiben test:", err);
      } finally {
        setLoading(false);
      }
    }
    fetchTest();
  }, [level]);

  const tasks: SchreibenTask[] = test?.sections.schreiben.tasks || [];
  const currentTask: SchreibenTask | undefined = tasks[activeTaskIdx];
  const currentText = currentTask ? drafts[currentTask.id] || "" : "";
  const currentEvaluation = currentTask ? evaluations[currentTask.id] : undefined;
  const wordCount = countWords(currentText);

  const updateDraft = (taskId: string, value: string) => {
    setDrafts((prev) => {
      const next = { ...prev, [taskId]: value };
      saveExamState(level, (st) => ({ ...st, schreibenDrafts: next }));
      return next;
    });
  };

  const insertUmlaut = (char: string) => {
    if (!currentTask) return;
    const el = textareaRef.current;
    if (!el) {
      updateDraft(currentTask.id, currentText + char);
      return;
    }
    const start = el.selectionStart ?? currentText.length;
    const end = el.selectionEnd ?? currentText.length;
    const next = currentText.slice(0, start) + char + currentText.slice(end);
    updateDraft(currentTask.id, next);
    requestAnimationFrame(() => {
      el.focus();
      el.setSelectionRange(start + char.length, start + char.length);
    });
  };

  const fillSampleDraft = () => {
    if (!currentTask) return;
    const sample =
      currentTask.register === "formell"
        ? "Sehr geehrte Frau Wagner,\n\nvielen Dank für Ihre freundliche Einladung zum Abschlussfest am Freitagabend. Leider kann ich nicht kommen, weil ich an diesem Abend einen wichtigen Arzttermin habe.\n\nIch möchte mich bei Ihnen herzlich für den tollen Deutschkurs bedanken, weil ich sehr viel gelernt habe.\n\nMit freundlichen Grüßen\nPriya Sharma"
        : currentTask.register === "forum"
          ? "Hallo zusammen,\n\nich habe Sandras Beitrag gelesen und verstehe ihre Meinung sehr gut. Im Homeoffice spart man jeden Tag viel Zeit für den Arbeitsweg und kann in Ruhe arbeiten. Allerdings finde ich, dass der persönliche Kontakt zu den Kollegen sehr wichtig ist, weil man im Team schneller neue Ideen entwickelt.\n\nDeshalb bevorzuge ich eine Mischung: drei Tage im Büro und zwei Tage zu Hause."
          : "Lieber Tim,\n\nwie geht es dir? Vor zwei Wochen bin ich endlich in meine neue Wohnung umgezogen. Schade, dass du mir beim Umzug nicht helfen konntest.\n\nIch bin umgezogen, weil meine alte Wohnung viel zu klein und zu weit von meiner Arbeit im Krankenhaus entfernt war. Die neue Wohnung hat zwei helle Zimmer und einen schönen Balkon. Hast du am Samstagabend Zeit? Komm doch zum Essen vorbei!\n\nViele Grüße\nArjun";
    updateDraft(currentTask.id, sample);
  };

  const handleEvaluate = async () => {
    if (!currentTask) return;
    setErrorMsg(null);
    setEvaluating(true);
    try {
      const res = await fetch("/api/ai/evaluate-schreiben", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          level,
          taskId: currentTask.id,
          taskTitle: currentTask.title,
          register: currentTask.register,
          situation: currentTask.situation,
          leitpunkte: currentTask.leitpunkte,
          minWords: currentTask.minWords,
          text: currentText,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setErrorMsg(data.error || "Bewertung fehlgeschlagen.");
        return;
      }
      const ev = data.evaluation as SchreibenEvaluation;
      setEvaluations((prev) => {
        const next = { ...prev, [currentTask.id]: ev };
        saveExamState(level, (st) => ({ ...st, schreibenEvaluations: next }));
        return next;
      });
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : "Netzwerkfehler");
    } finally {
      setEvaluating(false);
    }
  };

  const handleReset = () => {
    const fresh = resetExamState(level);
    setDrafts(fresh.schreibenDrafts);
    setEvaluations(fresh.schreibenEvaluations);
  };

  return (
    <div className="min-h-screen flex flex-col bg-slate-50 text-slate-900 light-study">
      <ExamHeader
        level={level}
        activeSection="schreiben"
        durationMinutes={test?.sections?.schreiben?.durationMinutes || 60}
        testTitle={test?.title}
        onResetExam={handleReset}
      />

      <main className="mx-auto w-full max-w-7xl flex-1 px-4 py-6 sm:px-6">
        {loading && !currentTask ? (
          <div className="rounded-2xl border border-slate-200 bg-white p-8 text-center text-sm text-slate-600 shadow-sm flex items-center justify-center gap-3">
            <div className="h-4 w-4 animate-spin rounded-full border-2 border-slate-300 border-t-slate-900" />
            <span>Lade Prüfungsmodul Schreiben…</span>
          </div>
        ) : !currentTask ? (
          <div className="rounded-2xl border border-amber-200 bg-amber-50 p-8 text-center text-sm text-amber-900 shadow-sm">
            <p className="font-bold">Keine Schreibaufgaben für dieses Modul verfügbar.</p>
            <p className="text-xs text-amber-700 mt-1">Bitte wählen Sie einen anderen Prüfungsteil oben aus.</p>
          </div>
        ) : (
          <div className="space-y-6">
            {/* Task tabs */}
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="flex flex-wrap gap-1.5 rounded-2xl bg-white p-1.5 border border-slate-200 shadow-xs">
                {(tasks || []).map((t, idx) => {
                  const active = idx === activeTaskIdx;
                  const ev = evaluations[t.id];
                  return (
                    <button
                      key={t.id}
                      type="button"
                      onClick={() => setActiveTaskIdx(idx)}
                      className={`relative z-20 cursor-pointer inline-flex items-center gap-2 rounded-xl px-3.5 py-2 text-xs font-bold transition ${
                        active
                          ? "!bg-slate-900 !text-white shadow-xs"
                          : "text-slate-600 hover:bg-slate-100 hover:text-slate-900"
                      }`}
                    >
                      <PenTool className={`h-3.5 w-3.5 ${active ? "text-white" : "text-amber-500"}`} />
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
                href={`/exam/${level}/sprechen`}
                className="relative z-10 cursor-pointer inline-flex items-center gap-1.5 rounded-xl bg-slate-900 text-white px-4 py-2 text-xs font-bold shadow-xs hover:bg-slate-800 transition"
              >
                <span>Weiter zu Modul 4: Sprechen</span>
                <ArrowRight className="h-3.5 w-3.5" />
              </Link>
            </div>

            <div className="grid gap-6 lg:grid-cols-12">
              {/* LEFT: Prompt & Leitpunkte */}
              <div className="lg:col-span-5 space-y-4">
                <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm space-y-4 text-slate-900">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <span className="rounded-lg border border-slate-200 bg-slate-100 px-2.5 py-1 text-xs font-bold uppercase text-slate-800">
                      Register: {currentTask.register.toUpperCase()}
                    </span>
                    <span className="text-xs font-semibold text-slate-500">
                      Empfohlen: {currentTask.recommendedMinutes} Min · ca.{" "}
                      {currentTask.minWords} Wörter
                    </span>
                  </div>

                  <div>
                    <h2 className="text-lg font-extrabold text-slate-900">
                      {currentTask.title}
                    </h2>
                    <p className="mt-1 text-xs text-slate-500">
                      {currentTask.instructions}
                    </p>
                  </div>

                  <div className="rounded-xl border border-slate-200 bg-slate-50/70 p-4 text-sm text-slate-800">
                    <p className="font-semibold text-slate-900 mb-1">Situation:</p>
                    <p>{currentTask.situation}</p>
                  </div>

                  <div>
                    <p className="text-xs font-bold uppercase tracking-wider text-slate-500">
                      Leitpunkte (Alle Punkte bearbeiten):
                    </p>
                    <ul className="mt-2 space-y-2">
                      {(currentTask?.leitpunkte || []).map((pt, i) => (
                        <li
                          key={i}
                          className="flex items-start gap-2.5 rounded-xl border border-slate-200 bg-slate-50/70 p-3 text-xs font-medium text-slate-800"
                        >
                          <span className="inline-flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-slate-900 text-white text-[11px] font-bold">
                            {i + 1}
                          </span>
                          <span>{pt}</span>
                        </li>
                      ))}
                    </ul>
                  </div>

                  <button
                    type="button"
                    onClick={fillSampleDraft}
                    className="relative z-20 cursor-pointer inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-100 hover:text-slate-900 transition"
                  >
                    <Wand2 className="h-3.5 w-3.5 text-emerald-600" />
                    <span>Beispiel-Antwort zum Testen einfügen</span>
                  </button>
                </div>
              </div>

              {/* RIGHT: Umlaut Bar + Writing Editor + Instant AI Evaluation */}
              <div className="lg:col-span-7 space-y-5">
                <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm space-y-4 text-slate-900">
                  {/* Clickable German Umlaut Bar + Live Word Counter */}
                  <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 pb-3">
                    <div className="flex flex-wrap items-center gap-1.5">
                      <span className="mr-1 text-xs font-bold text-slate-500">
                        Umlaute:
                      </span>
                      {(UMLAUTS || []).map((u) => (
                        <button
                          key={u}
                          type="button"
                          onClick={() => insertUmlaut(u)}
                          className="relative z-20 cursor-pointer inline-flex h-9 w-9 items-center justify-center rounded-xl border border-slate-200 bg-slate-50 font-mono text-sm font-extrabold text-slate-800 transition hover:bg-slate-900 hover:text-white hover:border-slate-900"
                          title={`„${u}“ an Cursorposition einfügen`}
                        >
                          {u}
                        </button>
                      ))}
                    </div>

                    <div className="flex items-center gap-2">
                      <span
                        className={`rounded-xl px-3 py-1.5 font-mono text-xs font-bold border ${
                          wordCount >= currentTask.minWords
                            ? "border-emerald-200 bg-emerald-50 text-emerald-700"
                            : "border-amber-200 bg-amber-50 text-amber-700"
                        }`}
                      >
                        {wordCount} / {currentTask.minWords} Wörter
                      </span>
                    </div>
                  </div>

                  <textarea
                    ref={textareaRef}
                    rows={11}
                    value={currentText}
                    onChange={(e) => updateDraft(currentTask.id, e.target.value)}
                    placeholder="Schreiben Sie Ihren deutschen Text hier… (Nutzen Sie oben die Umlaut-Buttons ä, ö, ü, Ä, Ö, Ü, ß)"
                    className="w-full rounded-xl border border-slate-300 bg-white p-4 text-sm leading-relaxed text-slate-900 placeholder:text-slate-400 focus:border-slate-900 focus:outline-none sm:text-base"
                  />

                  {errorMsg && (
                    <div className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-2.5 text-xs font-semibold text-rose-700">
                      {errorMsg}
                    </div>
                  )}

                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <p className="text-xs text-slate-500">
                      Bewertung nach Goethe/telc Kriterien mit Korrekturen auf{" "}
                      <strong className="text-slate-800">Deutsch + Hinglish</strong>.
                    </p>

                    <button
                      type="button"
                      disabled={evaluating}
                      onClick={handleEvaluate}
                      className="relative z-20 cursor-pointer inline-flex items-center gap-2 rounded-xl bg-slate-900 text-white px-5 py-3 text-xs font-extrabold shadow-sm transition hover:bg-slate-800 disabled:opacity-50 sm:text-sm"
                    >
                      <Sparkles className="h-4 w-4 text-white" />
                      <span>
                        {evaluating
                          ? "Evaluating via AI…"
                          : "Submit for Instant AI Evaluation"}
                      </span>
                    </button>
                  </div>
                </div>

                {/* AI EVALUATION RESULT CARD */}
                {currentEvaluation && (
                  <div className="rounded-2xl border border-emerald-200 bg-white p-6 shadow-sm space-y-5 text-slate-900">
                    <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 pb-4">
                      <div>
                        <span className="inline-flex items-center gap-1 rounded-full border border-emerald-200 bg-emerald-50 px-2.5 py-0.5 text-[11px] font-bold text-emerald-700">
                          <CheckCircle2 className="h-3.5 w-3.5" />
                          Engine: {currentEvaluation.engine.toUpperCase()}
                        </span>
                        <h3 className="mt-1.5 text-lg font-extrabold text-slate-900">
                          KI-Bewertung: {currentEvaluation.score} / 100 Punkte (GER{" "}
                          {currentEvaluation.cefrEstimate})
                        </h3>
                      </div>

                      <div className="grid grid-cols-2 gap-2 text-xs sm:grid-cols-4">
                        <div className="rounded-xl border border-slate-200 bg-slate-50 p-2.5 text-center">
                          <div className="text-[10px] text-slate-500">Erfüllung</div>
                          <div className="font-bold text-slate-900">
                            {currentEvaluation.criteria.taskFulfilment}/25
                          </div>
                        </div>
                        <div className="rounded-xl border border-slate-200 bg-slate-50 p-2.5 text-center">
                          <div className="text-[10px] text-slate-500">Kohärenz</div>
                          <div className="font-bold text-slate-900">
                            {currentEvaluation.criteria.coherence}/25
                          </div>
                        </div>
                        <div className="rounded-xl border border-slate-200 bg-slate-50 p-2.5 text-center">
                          <div className="text-[10px] text-slate-500">Wortschatz</div>
                          <div className="font-bold text-slate-900">
                            {currentEvaluation.criteria.vocabulary}/25
                          </div>
                        </div>
                        <div className="rounded-xl border border-slate-200 bg-slate-50 p-2.5 text-center">
                          <div className="text-[10px] text-slate-500">Strukturen</div>
                          <div className="font-bold text-slate-900">
                            {currentEvaluation.criteria.grammar}/25
                          </div>
                        </div>
                      </div>
                    </div>

                    <div className="grid gap-3 sm:grid-cols-2">
                      <div className="rounded-xl border border-sky-200 bg-sky-50/70 p-3.5 text-xs text-sky-900">
                        <p className="font-bold text-sky-800">Feedback (Deutsch):</p>
                        <p className="mt-1 text-slate-700">{currentEvaluation.summaryDe}</p>
                      </div>
                      <div className="rounded-xl border border-amber-200 bg-amber-50/70 p-3.5 text-xs text-amber-900">
                        <p className="font-bold text-amber-800">
                          GTF Mentor Feedback (Hinglish):
                        </p>
                        <p className="mt-1 text-slate-700">
                          {currentEvaluation.summaryHinglish}
                        </p>
                      </div>
                    </div>

                    {currentEvaluation.corrections.length > 0 && (
                      <div className="space-y-2.5">
                        <h4 className="text-xs font-extrabold uppercase tracking-wider text-slate-500">
                          Satzkorrekturen &amp; Erklärungen (Deutsch + Hinglish)
                        </h4>
                        {(currentEvaluation?.corrections || []).map((c, idx) => (
                          <div
                            key={idx}
                            className="rounded-xl border border-slate-200 bg-slate-50/70 p-3.5 text-xs space-y-1"
                          >
                            <div className="flex flex-wrap items-center gap-2">
                              <span className="line-through text-rose-500 font-semibold">
                                {c.original}
                              </span>
                              <span className="text-slate-400">→</span>
                              <span className="font-bold text-emerald-700">
                                {c.corrected}
                              </span>
                              <span className="rounded border border-slate-200 bg-white px-1.5 py-0.5 text-[10px] uppercase text-slate-600 font-medium">
                                {c.type}
                              </span>
                            </div>
                            <p className="text-slate-700">
                              <strong className="text-slate-900">DE:</strong> {c.explanationDe}
                            </p>
                            <p className="text-slate-700">
                              <strong className="text-slate-900">Hinglish:</strong> {c.explanationHinglish}
                            </p>
                          </div>
                        ))}
                      </div>
                    )}

                    <div className="rounded-xl border border-emerald-200 bg-emerald-50/60 p-4 text-xs">
                      <p className="font-bold text-emerald-800 mb-1.5">
                        Optimierte Musterlösung (B1+/B2 Vorbild):
                      </p>
                      <p className="whitespace-pre-wrap text-slate-800 leading-relaxed font-normal">
                        {currentEvaluation.improvedVersion}
                      </p>
                    </div>
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
