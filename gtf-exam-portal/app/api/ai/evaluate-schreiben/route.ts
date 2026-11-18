import { NextResponse } from "next/server";
import { serverEnv } from "@/lib/server/env";
import type { Cefr, Correction, SchreibenEvaluation } from "@/lib/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

interface EvaluateSchreibenBody {
  level?: string;
  taskId?: string;
  taskTitle?: string;
  register?: "informell" | "formell" | "forum";
  situation?: string;
  leitpunkte?: string[];
  minWords?: number;
  text?: string;
}

function countWords(text: string): number {
  const cleaned = text.trim();
  if (!cleaned) return 0;
  return cleaned.split(/\s+/).length;
}

function buildSystemPrompt(body: EvaluateSchreibenBody): string {
  return `You are a senior Goethe-Zertifikat & telc German examiner at Gateway To Future (GTF) in Berlin, coaching Indian & South Asian students.
Evaluate the student's German writing submission strictly according to Goethe/telc ${
    (body.level || "B1").toUpperCase()
  } criteria:
- taskFulfilment (Erfüllung der Aufgabenstellung, 0-25)
- coherence (Kohärenz & Textaufbau, 0-25)
- vocabulary (Wortschatz & Register, 0-25)
- grammar (Strukturen & Orthografie, 0-25)

Return ONLY valid JSON matching this exact TypeScript shape:
{
  "cefrEstimate": "A1" | "A2" | "B1" | "B2" | "C1",
  "score": number,
  "criteria": {
    "taskFulfilment": number,
    "coherence": number,
    "vocabulary": number,
    "grammar": number
  },
  "corrections": [
    {
      "original": "exact phrase from student text",
      "corrected": "corrected German phrase",
      "type": "grammar" | "spelling" | "vocabulary" | "punctuation" | "style",
      "explanationDe": "short explanation in simple German",
      "explanationHinglish": "friendly explanation in Hinglish (Hindi in Latin script + English) explaining the grammar rule"
    }
  ],
  "strengths": ["string"],
  "improvements": ["string"],
  "summaryDe": "2-3 sentences overall examiner feedback in German",
  "summaryHinglish": "2-3 sentences encouraging mentor feedback in Hinglish (by Sarbjit Kour, Founder & CEO style)",
  "improvedVersion": "Complete C1/B2-polished model version of the student's text"
}`;
}

async function callGroq(systemPrompt: string, userPrompt: string) {
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
  if (!res.ok) {
    throw new Error(`Groq HTTP ${res.status}: ${await res.text()}`);
  }
  const data = await res.json();
  const content = data?.choices?.[0]?.message?.content || "{}";
  return JSON.parse(content);
}

async function callGemini(systemPrompt: string, userPrompt: string) {
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(
    serverEnv.geminiModel,
  )}:generateContent?key=${encodeURIComponent(serverEnv.geminiApiKey)}`;

  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      systemInstruction: { parts: [{ text: systemPrompt }] },
      contents: [{ role: "user", parts: [{ text: userPrompt }] }],
      generationConfig: {
        temperature: 0.25,
        responseMimeType: "application/json",
      },
    }),
  });
  if (!res.ok) {
    throw new Error(`Gemini HTTP ${res.status}: ${await res.text()}`);
  }
  const data = await res.json();
  const content = data?.candidates?.[0]?.content?.parts?.[0]?.text || "{}";
  return JSON.parse(content);
}

function offlineEvaluateSchreiben(body: EvaluateSchreibenBody): SchreibenEvaluation {
  const text = (body.text || "").trim();
  const words = countWords(text);
  const minWords = body.minWords || 80;
  const register = body.register || "informell";
  const corrections: Correction[] = [];

  // 1. Check lowercase "ich" in the middle of a sentence
  if (/\bich\b/.test(text)) {
    const m = text.match(/[,;]\s+(ich\s+\w+)/);
    if (m) {
      corrections.push({
        original: m[1],
        corrected: m[1],
        type: "style",
        explanationDe: "Tipp: „ich“ schreibt man im Deutschen nur am Satzanfang groß.",
        explanationHinglish: "Dhyan rakho: English ke 'I' ke ulta, German mein 'ich' sirf sentence ke start mein capital hota hai.",
      });
    }
  }

  // 2. Detect classic Nebensatz verb-position errors ("weil ich habe...", "dass ich bin...")
  const nebensatzRegex =
    /\b(weil|dass|obwohl|wenn)\s+(ich|du|er|sie|es|wir|ihr)\s+(habe|bin|kann|muss|will|möchte|gehe|komme|arbeite|wohne)\s+([^,.!?]+)/i;
  const nsMatch = text.match(nebensatzRegex);
  if (nsMatch) {
    const [full, conj, subj, verb, rest] = nsMatch;
    corrections.push({
      original: full,
      corrected: `${conj} ${subj} ${rest.trim()} ${verb}`,
      type: "grammar",
      explanationDe: `Nach „${conj}“ (Nebensatz) muss das konjugierte Verb „${verb}“ ganz am Ende stehen.`,
      explanationHinglish: `'${conj}' ek Nebensatz connector hai — iske baad conjugated verb ('${verb}') hamesha sentence ke bilkul end mein jaata hai!`,
    });
  }

  // 3. Detect "ich bin umgezogen" vs "ich habe umgezogen"
  if (/ich\s+habe\s+[^\n.]*umgezogen/i.test(text)) {
    corrections.push({
      original: "ich habe ... umgezogen",
      corrected: "ich bin ... umgezogen",
      type: "grammar",
      explanationDe: "„umziehen“ (Wohnungswechsel) bildet das Perfekt mit „sein“: ich bin umgezogen.",
      explanationHinglish: "'umziehen' (ghar shift karna) Ortswechsel dikhata hai, isliye Perfekt 'sein' ke saath banta hai: 'ich bin umgezogen', 'habe' nahi.",
    });
  }

  // 4. Register check (Sie vs du)
  if (register === "formell" && /\b(du|dein|deine|dir|dich|tschüss|liebe grüße)\b/i.test(text)) {
    corrections.push({
      original: "Informelle Anrede (du / Liebe Grüße)",
      corrected: "Sie / Ihr / Mit freundlichen Grüßen",
      type: "style",
      explanationDe: "In einer formellen Nachricht müssen Sie die Höflichkeitsform „Sie“ und „Mit freundlichen Grüßen“ verwenden.",
      explanationHinglish: "Formelle E-Mail mein 'du' ya 'Liebe Grüße' use mat karo — hamesha 'Sie' aur end mein 'Mit freundlichen Grüßen' likho.",
    });
  }

  // 5. Check connectors richness
  const hasConnectors = /\b(weil|dass|obwohl|deshalb|trotzdem|außerdem|wenn|damit)\b/i.test(text);
  if (!hasConnectors) {
    corrections.push({
      original: "Kurze Hauptsätze ohne Konnektoren",
      corrected: "Verwenden Sie: weil, dass, deshalb, außerdem, obwohl",
      type: "vocabulary",
      explanationDe: "Für B1-Punkte im Bereich „Kohärenz & Strukturen“ sollten Sie Sätze mit Konnektoren verbinden.",
      explanationHinglish: "Goethe/telc B1 mein अच्छे marks ke liye kam se kam 2-3 connectors (weil, dass, deshalb, außerdem) zaroor add karo.",
    });
  }

  const lengthRatio = Math.min(1.15, words / Math.max(30, minWords));
  const taskFulfilment = Math.min(25, Math.max(8, Math.round(22 * lengthRatio)));
  const coherence = Math.min(25, Math.max(8, Math.round((hasConnectors ? 22 : 16) * Math.min(1, lengthRatio))));
  const vocabulary = Math.min(25, Math.max(8, Math.round(20 * Math.min(1.05, lengthRatio))));
  const grammarPenalty = Math.min(10, corrections.filter((c) => c.type === "grammar").length * 4);
  const grammar = Math.min(25, Math.max(8, Math.round(22 * Math.min(1, lengthRatio)) - grammarPenalty));

  const score = Math.min(100, Math.max(15, taskFulfilment + coherence + vocabulary + grammar));
  const cefrEstimate: Cefr =
    score >= 82 ? "B2" : score >= 60 ? "B1" : score >= 42 ? "A2" : "A1";

  const improvedVersion =
    register === "formell"
      ? "Sehr geehrte Frau Wagner,\n\nvielen Dank für Ihre herzliche Einladung zum Abschlussfest am Freitagabend. Leider muss ich Ihnen mitteilen, dass ich an diesem Abend nicht teilnehmen kann, weil ich einen wichtigen Arzttermin habe.\n\nIch möchte mich bei Ihnen herzlich für den tollen Deutschkurs und Ihre Geduld bedanken. Ich habe in den letzten Wochen sehr viel gelernt.\n\nMit freundlichen Grüßen\nIhr Kursteilnehmer"
      : register === "forum"
        ? "Hallo zusammen,\n\nich habe den Beitrag von Sandra mit großem Interesse gelesen. Ich verstehe gut, dass sie im Homeoffice viel Fahrzeit spart und sich besser konzentrieren kann. Auf der anderen Seite fehlt beim Arbeiten von zu Hause oft der persönliche Kontakt zu den Kolleginnen und Kollegen.\n\nMeiner Meinung nach ist eine Mischung aus Büro und Homeoffice ideal, weil man so flexibel bleibt und trotzdem im Team zusammenarbeitet."
        : "Hallo Tim,\n\nwie geht es dir? Vor zwei Wochen bin ich endlich in meine neue Wohnung umgezogen. Schade, dass du beim Umzug nicht dabei sein konntest, aber das war kein Problem.\n\nIch bin umgezogen, weil meine alte Wohnung viel zu weit vom Krankenhaus entfernt war. Die neue Wohnung ist hell, hat zwei Zimmer und sogar einen kleinen Balkon. Hast du am nächsten Samstag Zeit? Komm doch zum Abendessen vorbei, dann zeige ich dir alles!\n\nViele Grüße\nDein/Deine ...";

  return {
    engine: "offline-heuristic",
    taskId: body.taskId || "schreiben-1",
    cefrEstimate,
    score,
    criteria: { taskFulfilment, coherence, vocabulary, grammar },
    wordCount: words,
    corrections,
    strengths: [
      words >= minWords
        ? `Wortanzahl erreicht (${words} Wörter bei Ziel ${minWords} Wörtern).`
        : `Guter Einstieg (${words} Wörter geschrieben).`,
      hasConnectors
        ? "Konnektoren / Nebensätze wurden sinnvoll eingebaut."
        : "Verständlicher Satzbau mit klarer Aussage.",
    ],
    improvements: [
      words < minWords
        ? `Schreiben Sie noch ca. ${minWords - words} Wörter mehr, damit alle Leitpunkte ausführlich behandelt sind.`
        : "Achten Sie am Ende auf die Verbposition in Nebensätzen (weil, dass, obwohl).",
      "Nutzen Sie abwechslungsreiche Satzanfänge (z. B. „Außerdem“, „Deshalb“, „Meiner Meinung nach“).",
    ],
    summaryDe: `Ihre Textleistung erreicht ${score}/100 Punkte (Geschätztes Niveau: ${cefrEstimate}). ${
      score >= 60 ? "Bestanden nach Goethe/telc B1-Maßstab!" : "Noch etwas Übung nötig, um die 60%-Grenze sicher zu erreichen."
    }`,
    summaryHinglish: `Shabash! Aapka score ${score}/100 (${cefrEstimate}) hai. ${
      words < minWords
        ? `Word count thoda kam hai (${words}/${minWords} words) — har Leitpunkt par 2-3 sentences likho.`
        : "Structure achha hai! Nebensatz (weil/dass) mein verb ko sentence ke end mein rakhna mat bhoolna."
    }`,
    improvedVersion,
    evaluatedAt: new Date().toISOString(),
  };
}

export async function POST(req: Request) {
  try {
    const body = (await req.json()) as EvaluateSchreibenBody;
    const text = (body.text || "").trim();

    if (text.length < 10) {
      return NextResponse.json(
        { error: "Bitte schreiben Sie mindestens einen kurzen deutschen Text (mind. 10 Zeichen)." },
        { status: 400 },
      );
    }

    const words = countWords(text);
    const systemPrompt = buildSystemPrompt(body);
    const userPrompt = `Task: ${body.taskTitle || "Schreiben"}
Register: ${body.register || "informell"}
Situation: ${body.situation || ""}
Leitpunkte: ${(body.leitpunkte || []).join(" | ")}
Target minimum words: ${body.minWords || 80}
Student submission (${words} words):
"""
${text}
"""`;

    // 1. Try Groq (Llama-3) if GROQ_API_KEY is configured
    if (serverEnv.groqApiKey) {
      try {
        const ai = await callGroq(systemPrompt, userPrompt);
        const evaluation: SchreibenEvaluation = {
          engine: "groq",
          taskId: body.taskId || "schreiben-1",
          cefrEstimate: ai.cefrEstimate || "B1",
          score: Number(ai.score ?? 75),
          criteria: {
            taskFulfilment: Number(ai.criteria?.taskFulfilment ?? 19),
            coherence: Number(ai.criteria?.coherence ?? 19),
            vocabulary: Number(ai.criteria?.vocabulary ?? 19),
            grammar: Number(ai.criteria?.grammar ?? 18),
          },
          wordCount: words,
          corrections: Array.isArray(ai.corrections) ? ai.corrections : [],
          strengths: Array.isArray(ai.strengths) ? ai.strengths : [],
          improvements: Array.isArray(ai.improvements) ? ai.improvements : [],
          summaryDe: ai.summaryDe || "Gute Leistung!",
          summaryHinglish: ai.summaryHinglish || "Bahut badhiya koshish!",
          improvedVersion: ai.improvedVersion || text,
          evaluatedAt: new Date().toISOString(),
        };
        return NextResponse.json({ evaluation });
      } catch (err) {
        console.warn("[gtf] Groq Schreiben evaluation fallback:", err);
      }
    }

    // 2. Try Gemini Flash if GEMINI_API_KEY is configured
    if (serverEnv.geminiApiKey) {
      try {
        const ai = await callGemini(systemPrompt, userPrompt);
        const evaluation: SchreibenEvaluation = {
          engine: "gemini",
          taskId: body.taskId || "schreiben-1",
          cefrEstimate: ai.cefrEstimate || "B1",
          score: Number(ai.score ?? 75),
          criteria: {
            taskFulfilment: Number(ai.criteria?.taskFulfilment ?? 19),
            coherence: Number(ai.criteria?.coherence ?? 19),
            vocabulary: Number(ai.criteria?.vocabulary ?? 19),
            grammar: Number(ai.criteria?.grammar ?? 18),
          },
          wordCount: words,
          corrections: Array.isArray(ai.corrections) ? ai.corrections : [],
          strengths: Array.isArray(ai.strengths) ? ai.strengths : [],
          improvements: Array.isArray(ai.improvements) ? ai.improvements : [],
          summaryDe: ai.summaryDe || "Gute Leistung!",
          summaryHinglish: ai.summaryHinglish || "Bahut badhiya koshish!",
          improvedVersion: ai.improvedVersion || text,
          evaluatedAt: new Date().toISOString(),
        };
        return NextResponse.json({ evaluation });
      } catch (err) {
        console.warn("[gtf] Gemini Schreiben evaluation fallback:", err);
      }
    }

    // 3. Offline heuristic evaluation (100% functional without keys)
    const evaluation = offlineEvaluateSchreiben(body);
    return NextResponse.json({ evaluation });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Evaluation failed" },
      { status: 500 },
    );
  }
}
