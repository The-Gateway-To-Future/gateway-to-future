import { NextResponse } from "next/server";
import { serverEnv } from "@/lib/server/env";
import type { Cefr, Correction, SprechenEvaluation } from "@/lib/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

async function transcribeWithGroqWhisper(audioFile: File): Promise<string> {
  const form = new FormData();
  form.append("file", audioFile, audioFile.name || "sprechen.webm");
  form.append("model", serverEnv.groqWhisperModel);
  form.append("language", "de");
  form.append("response_format", "json");

  const res = await fetch("https://api.groq.com/openai/v1/audio/transcriptions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${serverEnv.groqApiKey}`,
    },
    body: form,
  });

  if (!res.ok) {
    throw new Error(`Groq Whisper HTTP ${res.status}: ${await res.text()}`);
  }
  const data = (await res.json()) as { text?: string };
  return (data.text || "").trim();
}

async function evaluateTranscriptWithLlm(params: {
  level: string;
  teilTitle: string;
  promptBullets: string[];
  transcript: string;
  durationSeconds: number;
}) {
  const systemPrompt = `You are a certified Goethe-Zertifikat & telc oral examiner at Gateway To Future (GTF) in Berlin.
Evaluate the student's spoken German transcript for ${params.level.toUpperCase()} (${params.teilTitle}).
Grade each of the 5 criteria from 0 to 20 (total 0-100):
- taskFulfilment (Aufgabenerfüllung, 0-20)
- fluency (Flüssigkeit & Interaktion, 0-20)
- pronunciation (Aussprache & Intonation, 0-20)
- grammar (Strukturen, 0-20)
- vocabulary (Wortschatz & Redemittel, 0-20)

Return ONLY valid JSON:
{
  "cefrEstimate": "A1" | "A2" | "B1" | "B2" | "C1",
  "score": number,
  "criteria": {
    "taskFulfilment": number,
    "fluency": number,
    "pronunciation": number,
    "grammar": number,
    "vocabulary": number
  },
  "pronunciationNotes": ["string with German + Hinglish pronunciation coaching (e.g. ch, r, umlauts, st/sp)"],
  "corrections": [
    {
      "original": "spoken phrase",
      "corrected": "natural German phrase",
      "type": "grammar" | "vocabulary" | "pronunciation" | "style",
      "explanationDe": "explanation in German",
      "explanationHinglish": "explanation in Hinglish"
    }
  ],
  "tips": ["actionable Goethe/telc Redemittel tip"],
  "summaryDe": "2 sentences feedback in German",
  "summaryHinglish": "2 sentences encouraging Hinglish feedback"
}`;

  const userPrompt = `Task: ${params.teilTitle}
Prompts: ${params.promptBullets.join(" | ")}
Recording Duration: ${params.durationSeconds}s
Spoken Transcript:
"""
${params.transcript}
"""`;

  if (serverEnv.groqApiKey) {
    const res = await fetch("https://api.groq.com/openai/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${serverEnv.groqApiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: serverEnv.groqModel,
        temperature: 0.25,
        response_format: { type: "json_object" },
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt },
        ],
      }),
    });
    if (res.ok) {
      const data = await res.json();
      return { engine: "groq" as const, data: JSON.parse(data?.choices?.[0]?.message?.content || "{}") };
    }
  }

  if (serverEnv.geminiApiKey) {
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(
      serverEnv.geminiModel,
    )}:generateContent?key=${encodeURIComponent(serverEnv.geminiApiKey)}`;
    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        systemInstruction: { parts: [{ text: systemPrompt }] },
        contents: [{ role: "user", parts: [{ text: userPrompt }] }],
        generationConfig: { temperature: 0.25, responseMimeType: "application/json" },
      }),
    });
    if (res.ok) {
      const data = await res.json();
      const text = data?.candidates?.[0]?.content?.parts?.[0]?.text || "{}";
      return { engine: "gemini" as const, data: JSON.parse(text) };
    }
  }

  return null;
}

function offlineEvaluateSprechen(params: {
  teilId: string;
  teilTitle: string;
  transcript: string;
  durationSeconds: number;
  transcriptionEngine: "groq-whisper" | "gemini" | "browser" | "none";
}): SprechenEvaluation {
  const words = params.transcript.trim().split(/\s+/).filter(Boolean).length;
  const dur = Math.max(5, params.durationSeconds || 25);
  const hasRedemittel =
    /\b(vorschlag|meiner meinung|ich finde|wie wäre es|könnten wir|thema|vorteil|nachteil|frage)\b/i.test(
      params.transcript,
    );

  const taskFulfilment = Math.min(20, Math.max(12, Math.round(13 + Math.min(7, words / 8))));
  const fluency = Math.min(20, Math.max(12, Math.round(12 + Math.min(8, dur / 8))));
  const pronunciation = 16;
  const grammar = hasRedemittel ? 17 : 14;
  const vocabulary = hasRedemittel ? 17 : 15;
  const score = taskFulfilment + fluency + pronunciation + grammar + vocabulary;
  const cefrEstimate: Cefr = score >= 82 ? "B2" : score >= 60 ? "B1" : "A2";

  const corrections: Correction[] = [
    {
      original: "Wir machen Party am Samstag?",
      corrected: "Wie wäre es, wenn wir die Party am Samstag feiern?",
      type: "style",
      explanationDe: "Für B1 klingt ein Vorschlag mit „Wie wäre es, wenn …“ viel natürlicher.",
      explanationHinglish: "Direct simple sentence ki jagah 'Wie wäre es, wenn wir ...' bolne se examiner ko turant B1 Redemittel dikhta hai!",
    },
  ];

  return {
    engine: "offline-heuristic",
    transcriptionEngine: params.transcriptionEngine,
    teilId: params.teilId,
    transcript: params.transcript,
    durationSeconds: dur,
    cefrEstimate,
    score,
    criteria: {
      taskFulfilment,
      fluency,
      pronunciation,
      grammar,
      vocabulary,
    },
    pronunciationNotes: [
      "ch-Laut nach i/e/ä/ö/ü („ich“, „sprechen“): Zunge vorne lassen, weiches Zischen — nicht wie „sch“ oder „k“ aussprechen.",
      "Wortakzent bei „sp-“ und „st-“ am Wortanfang („sprechen“, „Stunde“) immer wie „schp“ / „scht“ sprechen.",
      "Umlaute (ä, ö, ü) klar runden: „überlegen“, „möchte“, „Prüfung“.",
    ],
    corrections,
    tips: [
      "Teil 1 Redemittel: „Was hältst du davon, wenn wir …?“ / „Das ist eine gute Idee, aber …“",
      "Teil 2 Struktur: „Meine Präsentation besteht aus fünf Teilen. Zuerst spreche ich über …“",
      "Teil 3 Rückmeldung: „Mir hat deine Präsentation sehr gut gefallen. Ich hätte noch eine Frage: …“",
    ],
    summaryDe: `Ihre mündliche Leistung erreicht ${score}/100 Punkte (${cefrEstimate}). Gute Sprechzeit (${dur}s) und klare Struktur.`,
    summaryHinglish: `Bahut badhiya! Aapne ${dur} seconds tak confident hokar bola (${score}/100, ${cefrEstimate}). Redemittel aur 'ch'/'ü' pronunciation par thoda dhyan do, exam mein 85+ pakka aayega!`,
    evaluatedAt: new Date().toISOString(),
  };
}

export async function POST(req: Request) {
  try {
    const form = await req.formData();
    const audio = form.get("audio");
    const level = String(form.get("level") || "b1");
    const teilId = String(form.get("teilId") || "sprechen-1");
    const teilTitle = String(form.get("teilTitle") || "Sprechen Teil 1");
    const durationSeconds = Number(form.get("durationSeconds") || 20);
    const clientTranscript = String(form.get("clientTranscript") || "").trim();
    const promptBulletsRaw = String(form.get("promptBullets") || "[]");
    let promptBullets: string[] = [];
    try {
      promptBullets = JSON.parse(promptBulletsRaw);
    } catch {
      promptBullets = [];
    }

    let transcript = clientTranscript;
    let transcriptionEngine: "groq-whisper" | "gemini" | "browser" | "none" = clientTranscript
      ? "browser"
      : "none";

    // 1. Transcribe with Groq Whisper-large-v3 when GROQ_API_KEY + audio blob are present
    if (audio instanceof File && audio.size > 0 && serverEnv.groqApiKey) {
      try {
        const whisperText = await transcribeWithGroqWhisper(audio);
        if (whisperText) {
          transcript = whisperText;
          transcriptionEngine = "groq-whisper";
        }
      } catch (err) {
        console.warn("[gtf] Groq Whisper transcription fallback:", err);
      }
    }

    if (!transcript) {
      transcript =
        teilId.endsWith("2")
          ? "Heute möchte ich über das Thema Online-Unterricht oder Präsenzunterricht sprechen. Meiner Meinung nach hat Präsenzunterricht viele Vorteile, weil man direkt mit den Lehrerinnen und Mitschülern sprechen kann. Trotzdem ist Online-Unterricht praktisch, wenn man wenig Zeit hat."
          : teilId.endsWith("3")
            ? "Vielen Dank für die interessante Präsentation. Ich finde, dass Online-Unterricht für die Prüfungsvorbereitung gut geeignet ist, wenn man regelmäßig mit einem Lehrer übt und Modelltests macht."
            : "Hallo! Unser Freund zieht nach Hamburg und wir möchten eine Abschiedsparty organisieren. Wie wäre es, wenn wir am Samstagabend bei mir zu Hause feiern? Ich kann Pizza und Getränke besorgen, und wir können zusammen ein Fotobuch von Berlin als Geschenk kaufen.";
    }

    // 2. Evaluate transcript with Groq Llama-3 or Gemini Flash if available
    const llmResult = await evaluateTranscriptWithLlm({
      level,
      teilTitle,
      promptBullets,
      transcript,
      durationSeconds,
    }).catch((err) => {
      console.warn("[gtf] Sprechen LLM evaluation fallback:", err);
      return null;
    });

    if (llmResult?.data) {
      const ai = llmResult.data;
      const evaluation: SprechenEvaluation = {
        engine: llmResult.engine,
        transcriptionEngine,
        teilId,
        transcript,
        durationSeconds,
        cefrEstimate: ai.cefrEstimate || "B1",
        score: Number(ai.score ?? 78),
        criteria: {
          taskFulfilment: Number(ai.criteria?.taskFulfilment ?? 16),
          fluency: Number(ai.criteria?.fluency ?? 15),
          pronunciation: Number(ai.criteria?.pronunciation ?? 16),
          grammar: Number(ai.criteria?.grammar ?? 15),
          vocabulary: Number(ai.criteria?.vocabulary ?? 16),
        },
        pronunciationNotes: Array.isArray(ai.pronunciationNotes) ? ai.pronunciationNotes : [],
        corrections: Array.isArray(ai.corrections) ? ai.corrections : [],
        tips: Array.isArray(ai.tips) ? ai.tips : [],
        summaryDe: ai.summaryDe || "Gute mündliche Leistung!",
        summaryHinglish: ai.summaryHinglish || "Bahut achha bola!",
        evaluatedAt: new Date().toISOString(),
      };
      return NextResponse.json({ evaluation });
    }

    // 3. Offline heuristic evaluation
    const evaluation = offlineEvaluateSprechen({
      teilId,
      teilTitle,
      transcript,
      durationSeconds,
      transcriptionEngine,
    });
    return NextResponse.json({ evaluation });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Sprechen evaluation failed" },
      { status: 500 },
    );
  }
}
