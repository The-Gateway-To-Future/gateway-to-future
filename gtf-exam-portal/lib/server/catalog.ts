import crypto from "crypto";
import { promises as fs } from "fs";
import fsSync from "fs";
import path from "path";
import sampleB1Raw from "@/data/sample-b1-test.json";
import sampleWorkbooksRaw from "@/data/sample-workbooks.json";
import catalogJsonRaw from "@/data/catalog.json";
import a1Modelltest1Raw from "@/data/gtf-a1-modelltest-1.json";
import a1Modelltest2Raw from "@/data/gtf-a1-modelltest-2.json";
import a1Modelltest3Raw from "@/data/gtf-a1-modelltest-3.json";
import a2Modelltest1Raw from "@/data/gtf-a2-modelltest-1.json";
import a2Modelltest2Raw from "@/data/gtf-a2-modelltest-2.json";
import a2Modelltest3Raw from "@/data/gtf-a2-modelltest-3.json";
import b1Modelltest1Raw from "@/data/gtf-b1-modelltest-1.json";
import b1Modelltest2Raw from "@/data/gtf-b1-modelltest-2.json";
import b1Modelltest3Raw from "@/data/gtf-b1-modelltest-3.json";
import b2Modelltest1Raw from "@/data/gtf-b2-modelltest-1.json";
import b2Modelltest2Raw from "@/data/gtf-b2-modelltest-2.json";
import b2Modelltest3Raw from "@/data/gtf-b2-modelltest-3.json";
import mKursModelltest1Raw from "@/data/gtf-m_kurs-modelltest-1.json";
import tKursModelltest1Raw from "@/data/gtf-t_kurs-modelltest-1.json";
import wKursModelltest1Raw from "@/data/gtf-w_kurs-modelltest-1.json";
import gKursModelltest1Raw from "@/data/gtf-g_kurs-modelltest-1.json";
import pflegeModelltest1Raw from "@/data/gtf-ausbildung_pflege-modelltest-1.json";
import { LEVEL_META, isLevel } from "../config";
import type {
  ExamTest,
  FlashcardDeckItem,
  GrammarNotes,
  Level,
  Product,
  Workbook,
  WorkbookClientView,
  WorkbookContentType,
} from "../types";
import { getSupabaseServerClient } from "../supabase";
import { serverEnv } from "./env";
import { signMediaToken } from "./media-token";
import {
  getCoreLabById,
  getGrammarPillarById,
  convertLabToWorkbook,
  ALL_CORE_LABS,
  ALL_GRAMMAR_PILLARS,
} from "@/lib/curriculum-labs";
import {
  CEFR_LEVEL_FLASHCARD_POOLS,
  GRAMMAR_PILLAR_FLASHCARD_DECKS,
} from "@/lib/flashcard-decks-data";

const RUNTIME_ROOT = Reflect.apply(process.cwd, process, []) as string;
const LOCAL_STORE_DIR = path.join(RUNTIME_ROOT, ".local-store");
const LOCAL_PURCHASES_FILE = path.join(LOCAL_STORE_DIR, "purchases.json");
const LOCAL_ATTEMPTS_FILE = path.join(LOCAL_STORE_DIR, "attempts.json");

export interface LocalPurchaseRecord {
  userEmail: string;
  productSlug: string;
  paymentProvider: string;
  paymentReference?: string;
  unlockedAt: string;
}

const DEFAULT_PRODUCTS: Product[] = [
  // ── DIVISION 1: GTF SPRACHAKADEMIE (A1–B2) ───────────────────────────────────
  {
    slug: "a1-free-demo-test",
    divisionId: "sprachakademie",
    type: "mock_test",
    level: "a1",
    title: "GTF A1 Start Deutsch Modelltest 1 (Free Demo)",
    description: "Complete A1 mock test with Lesen, Sprachbausteine, Hören, Schreiben & Sprechen.",
    priceEur: 0,
    priceInr: 0,
    isFree: true,
    resourceId: "gtf-a1-modelltest-1",
  },
  {
    slug: "a2-free-demo-test",
    divisionId: "sprachakademie",
    type: "mock_test",
    level: "a2",
    title: "GTF A2 Modelltest 1 (Free Demo)",
    description: "Complete A2 mock test covering everyday life, workplace & relocation in Germany.",
    priceEur: 0,
    priceInr: 0,
    isFree: true,
    resourceId: "gtf-a2-modelltest-1",
  },
  {
    slug: "b1-free-demo-test",
    divisionId: "sprachakademie",
    type: "mock_test",
    level: "b1",
    title: "GTF B1 Modelltest 1 — Goethe/telc Hybrid (Free Demo)",
    description: "Full B1 exam simulation: Lesen, Sprachbausteine, Hören (locked 1x/2x), Schreiben & Sprechen.",
    priceEur: 0,
    priceInr: 0,
    isFree: true,
    resourceId: "gtf-b1-modelltest-1",
  },
  {
    slug: "b2-free-demo-test",
    divisionId: "sprachakademie",
    type: "mock_test",
    level: "b2",
    title: "GTF B2 Beruf & Pflege Modelltest 1 (Free Demo)",
    description: "Complete B2 exam simulation for nursing, medical & professional pathways in Germany.",
    priceEur: 0,
    priceInr: 0,
    isFree: true,
    resourceId: "gtf-b2-modelltest-1",
  },
  {
    slug: "exam-vault-a1-b2",
    divisionId: "sprachakademie",
    type: "mock_test",
    level: "b2",
    title: "GTF Sprachakademie Full Exam Vault (A1–B2 Complete Suite)",
    description: "Full institutional vault of 20+ Goethe/telc mock exams across A1, A2, B1, and B2 with instant AI Schreiben & Whisper v3 speech evaluation.",
    priceEur: 0,
    priceInr: 1999,
    isFree: false,
    resourceId: "vault-a1-b2-complete",
  },
  {
    slug: "wb-suite-a1-b2",
    divisionId: "sprachakademie",
    type: "pdf_workbook",
    level: "b1",
    title: "GTF Digital Workbooks Complete Suite",
    description: "7 proprietary workbooks with DRM anti-piracy protection, interactive answer keys, and error analysis.",
    priceEur: 0,
    priceInr: 1999,
    isFree: false,
    resourceId: "wb-suite-complete",
  },
  {
    slug: "sprechen-ai-unlimited-90d",
    divisionId: "sprachakademie",
    type: "sprechen_pass",
    level: "b1",
    title: "GTF Sprechen + Schreiben AI Pass (Practice Pack)",
    description: "Whisper-large-v3 speaking evaluations + Llama-3/Gemini writing evaluations.",
    priceEur: 0,
    priceInr: 499,
    isFree: false,
    resourceId: "sprechen-pass-90d",
  },

  // ── DIVISION 2: GTF STUDIENKOLLEG & AUFNAHMEPRÜFUNG HUB ─────────────────────
  {
    slug: "studienkolleg-m-kurs-crash",
    divisionId: "studienkolleg",
    type: "studienkolleg_course",
    track: "m_kurs",
    title: "GTF Studienkolleg M-Kurs Intensive Track Course",
    description: "Comprehensive medical prep: Mathematik, Physik, Chemie & Biologie. Includes 500+ terminological flashcards, interactive formula engines, and TU Berlin / LMU past papers.",
    priceEur: 0,
    priceInr: 2999,
    isFree: false,
    resourceId: "stk-m-kurs-crash",
  },
  {
    slug: "studienkolleg-t-kurs-crash",
    divisionId: "studienkolleg",
    type: "studienkolleg_course",
    track: "t_kurs",
    title: "GTF Studienkolleg T-Kurs Intensive Track Course",
    description: "Comprehensive engineering prep: Höhere Mathematik, Physik, Technische Mechanik, and Deutsch C-Test. Past papers for RWTH Aachen, KIT & TU Berlin.",
    priceEur: 0,
    priceInr: 2999,
    isFree: false,
    resourceId: "stk-t-kurs-crash",
  },
  {
    slug: "studienkolleg-all-access",
    divisionId: "studienkolleg",
    type: "studienkolleg_course",
    title: "GTF Studienkolleg & Academy All-Access Master Pass",
    description: "Full access to all Studienkolleg tracks (M, T, W, G Kurs), all past entrance exams, formula engines, and structured Berlin & India advisory strategy consultation.",
    priceEur: 0,
    priceInr: 4999,
    isFree: false,
    resourceId: "stk-all-access",
  },
  {
    slug: "gtf-berlin-consultation",
    divisionId: "sprachakademie",
    type: "consultation",
    title: "1:1 Berlin & India Advisory Consultation",
    description: "Confirmed 1:1 strategy appointment with the Gateway To Future Berlin & India Advisory Team, including direct Berlin Desk phone & WhatsApp access upon payment confirmation.",
    priceEur: 0,
    priceInr: 1000,
    isFree: false,
    resourceId: "gtf-berlin-consultation",
  },
  {
    slug: "gtf-all-access-pass",
    divisionId: "sprachakademie",
    type: "studienkolleg_course",
    title: "GTF All-Access Pro Membership (€50 / mo)",
    description: "Complete all-access membership across Language Academy (A1–B2), Studienkolleg (T/M/W/G-Kurs), and Fachsprache Pflege & Medizin.",
    priceEur: 50,
    priceInr: 4499,
    isFree: false,
    resourceId: "gtf-all-access-pass",
  },

  // ── DIVISION 3: GTF FACHSPRACHE PFLEGE & MEDIZIN ─────────────────────────────
  {
    slug: "fachsprache-medizin-master",
    divisionId: "fachsprache_medizin",
    type: "clinical_module",
    level: "b2",
    title: "GTF Fachsprachenprüfung (FSP) Medizin Master Track",
    description: "Hospital-grade clinical German: 3-part FSP simulation (Anamnese, Epikrise, Arzt-Arzt Übergabe), physical examination scripts, and clinical case presentations.",
    priceEur: 0,
    priceInr: 2999,
    isFree: false,
    resourceId: "fsp-medizin-master",
  },
  {
    slug: "fachsprache-pflege-ausbildung",
    divisionId: "fachsprache_medizin",
    type: "clinical_module",
    level: "b2",
    title: "GTF Pflege Fachsprache & Dual Ausbildung Complete Track",
    description: "ISBAR clinical handover training, Pflegedokumentation protocols, and hospital onboarding for Berlin healthcare networks.",
    priceEur: 0,
    priceInr: 2999,
    isFree: false,
    resourceId: "pflege-ausbildung-pass",
  },

  // Workbooks from sample-workbooks.json
  ...(sampleWorkbooksRaw.workbooks as unknown as Workbook[]).map((wb) => ({
    slug: wb.productSlug,
    divisionId: "sprachakademie" as const,
    type: "pdf_workbook" as const,
    level: wb.level,
    title: `${wb.title} — ${wb.subtitle}`,
    description: `Topics: ${wb.topics.join(" · ")} (${wb.pages} pages + interactive answer sheet)`,
    priceEur: wb.priceEur || 0,
    priceInr: wb.isFree ? 0 : (wb.priceInr || 499),
    isFree: Boolean(wb.isFree),
    resourceId: wb.id,
  })),
];

function loadDynamicCatalog(): { products: Product[]; workbooks: Workbook[] } {
  // 1. Primary: statically bundled catalog.json (guaranteed availability in Next.js Serverless runtime)
  try {
    if (
      catalogJsonRaw &&
      typeof catalogJsonRaw === "object" &&
      (Array.isArray((catalogJsonRaw as { products?: unknown }).products) ||
        Array.isArray((catalogJsonRaw as { workbooks?: unknown }).workbooks))
    ) {
      const parsed = catalogJsonRaw as { products?: Product[]; workbooks?: Workbook[] };
      return {
        products: Array.isArray(parsed.products) ? parsed.products : [],
        workbooks: Array.isArray(parsed.workbooks) ? parsed.workbooks : [],
      };
    }
  } catch {
    // fallback to filesystem read
  }

  // 2. Fallback: filesystem read if available in container
  const candidatePaths = [
    path.join(RUNTIME_ROOT, "data", "catalog.json"),
  ];
  for (const p of candidatePaths) {
    try {
      if (fsSync.existsSync(p)) {
        const raw = fsSync.readFileSync(p, "utf8");
        const parsed = JSON.parse(raw);
        return {
          products: Array.isArray(parsed.products) ? parsed.products : [],
          workbooks: Array.isArray(parsed.workbooks) ? parsed.workbooks : [],
        };
      }
    } catch {
      // ignore
    }
  }
  return { products: [], workbooks: [] };
}

export function getAllProducts(): Product[] {
  const dynamic = loadDynamicCatalog();
  const bySlug = new Map<string, Product>();
  for (const p of DEFAULT_PRODUCTS) {
    bySlug.set(p.slug, p);
  }
  for (const p of dynamic.products) {
    bySlug.set(p.slug, {
      ...p,
      divisionId: p.divisionId || "sprachakademie",
    });
  }
  return Array.from(bySlug.values());
}

function loadFlashcardsFromQuestionBank(workbookId: string): FlashcardDeckItem[] {
  const candidates = [
    path.join(RUNTIME_ROOT, "data", "question_banks", `${workbookId}.json`),
  ];
  for (const p of candidates) {
    try {
      if (fsSync.existsSync(p)) {
        const parsed = JSON.parse(fsSync.readFileSync(p, "utf8")) as {
          flashcards?: unknown;
        };
        if (Array.isArray(parsed.flashcards) && parsed.flashcards.length > 0) {
          return parsed.flashcards as FlashcardDeckItem[];
        }
      }
    } catch {
      // ignore
    }
  }
  return [];
}

function resolveWorkbookContentMeta(wb: Workbook): {
  contentType: WorkbookContentType;
  module: string;
} {
  if (wb.contentType) {
    const mod =
      wb.module ||
      (wb.contentType === "grammar"
        ? "02-grammar"
        : wb.contentType === "exam_lesen" || wb.contentType === "exam_hoeren"
        ? "03-hoeren-lesen"
        : "04-modelltests");
    return { contentType: wb.contentType, module: mod };
  }

  const skill = (wb.skill || "").toLowerCase();
  const id = (wb.id || "").toLowerCase();
  const title = (wb.title || "").toLowerCase();

  if (
    id.includes("modelltest") ||
    id.includes("pruefungstraining") ||
    id.includes("vollsimulation") ||
    id.includes("vorbereitungsheft") ||
    id.includes("aufnahme_deutsch") ||
    title.includes("modelltest") ||
    title.includes("prüfungstraining") ||
    title.includes("vollsimulation")
  ) {
    return {
      contentType: skill === "hoeren" ? "exam_hoeren" : skill === "schreiben" ? "exam_schreiben" : skill === "sprechen" ? "exam_sprechen" : "exam_lesen",
      module: "04-modelltests",
    };
  }
  if (skill === "schreiben" || id.includes("schreiben")) {
    return { contentType: "exam_schreiben", module: "04-modelltests" };
  }
  if (skill === "sprechen" || id.includes("sprechen")) {
    return { contentType: "exam_sprechen", module: "04-modelltests" };
  }
  if (skill === "hoeren" || Boolean(wb.audioUrl) || id.includes("hoeren") || title.includes("hören")) {
    return { contentType: "exam_hoeren", module: "03-hoeren-lesen" };
  }
  if (
    skill === "lesen" ||
    id.includes("lesen") ||
    id.includes("sprachbausteine") ||
    id.includes("stk-") ||
    id.includes("pflege") ||
    id.includes("krankenhaus") ||
    title.includes("lesen") ||
    title.includes("sprachbausteine")
  ) {
    return { contentType: "exam_lesen", module: "03-hoeren-lesen" };
  }
  return { contentType: "grammar", module: "02-grammar" };
}

function buildFallbackGrammarNotes(wb: Workbook): GrammarNotes {
  const examples = (wb.questions || [])
    .slice(0, 4)
    .map((q) => (q.explanation ? `${q.label}: ${q.explanation}` : q.prompt))
    .filter(Boolean);
  return {
    rule: `${wb.subtitle || wb.title}. Schwerpunkte: ${(wb.topics || []).join(", ") || "Deutsche Grammatikstrukturen"}.`,
    proTip:
      "Arbeiten Sie zunächst die Strukturregeln und Signalwörter durch und festigen Sie die Formen mit den Grammatik-Flashcards.",
    examples,
  };
}

function sanitizeWorkbookBoundary(wb: Workbook): Workbook {
  const { contentType, module } = resolveWorkbookContentMeta(wb);
  if (contentType === "grammar") {
    const rawInlineCards =
      Array.isArray(wb.flashcards) && wb.flashcards.length > 0
        ? wb.flashcards
        : loadFlashcardsFromQuestionBank(wb.id);
    const pillarDeck = GRAMMAR_PILLAR_FLASHCARD_DECKS[wb.id];
    const levelKey = (wb.level || "a1").toLowerCase();
    const levelPool = CEFR_LEVEL_FLASHCARD_POOLS[levelKey] || CEFR_LEVEL_FLASHCARD_POOLS.a1 || [];
    const mergedCards: FlashcardDeckItem[] = [];
    const seenIds = new Set<string>();
    const pushUnique = (c: FlashcardDeckItem) => {
      if (!c?.id || seenIds.has(c.id)) return;
      seenIds.add(c.id);
      mergedCards.push(c);
    };
    for (const c of pillarDeck || rawInlineCards) {
      pushUnique(c);
      if (mergedCards.length >= 30) break;
    }
    if (mergedCards.length < 25) {
      for (const c of levelPool) {
        pushUnique(c);
        if (mergedCards.length >= 30) break;
      }
    }
    return {
      ...wb,
      contentType,
      module,
      skill: "grammar",
      audioUrl: "",
      readingPassage: undefined,
      grammarNotes: wb.grammarNotes || buildFallbackGrammarNotes(wb),
      flashcards: mergedCards,
      questions: [],
    };
  }
  return {
    ...wb,
    contentType,
    module,
    audioUrl:
      contentType === "exam_hoeren" || contentType === "exam_sprechen" ? wb.audioUrl : "",
    grammarNotes: undefined,
    flashcards: [],
  };
}

export function getAllWorkbooks(): Workbook[] {
  const dynamic = loadDynamicCatalog();
  const byId = new Map<string, Workbook>();
  for (const wb of sampleWorkbooksRaw.workbooks as unknown as Workbook[]) {
    byId.set(wb.id, sanitizeWorkbookBoundary(wb));
  }
  for (const wb of dynamic.workbooks) {
    byId.set(wb.id, sanitizeWorkbookBoundary(wb));
  }
  for (const pillar of ALL_GRAMMAR_PILLARS) {
    byId.set(pillar.id, convertLabToWorkbook(pillar));
  }
  for (const lab of ALL_CORE_LABS) {
    if (!byId.has(lab.id)) {
      byId.set(lab.id, convertLabToWorkbook(lab));
    }
  }
  return Array.from(byId.values());
}

export function getWorkbookById(id: string): Workbook | null {
  if (!id) return null;
  const decodedId = decodeURIComponent(id).trim();
  const lowerId = decodedId.toLowerCase();

  // Never strip 'grammar-' to blend exam tasks into grammar
  const grammarPillar = getGrammarPillarById(decodedId);
  if (grammarPillar) return convertLabToWorkbook(grammarPillar);

  const all = getAllWorkbooks();

  // 1. Exact ID or lowercase match
  const exact = all.find((w) => w.id === decodedId || w.id.toLowerCase() === lowerId);
  if (exact) return exact;

  // 2. Match by productSlug
  const bySlug = all.find(
    (w) => w.productSlug === decodedId || (w.productSlug && w.productSlug.toLowerCase() === lowerId),
  );
  if (bySlug) return bySlug;

  // 3. Normalized stripped match (handles prefixes: wb-, book-, dossier-, wb-factory-, wb-fc-)
  const strippedId = lowerId.replace(/^(wb-factory-|wb-fc-|book-|dossier-|wb-)/, "");
  const fuzzy = all.find((w) => {
    const wId = w.id.toLowerCase();
    const wSlug = (w.productSlug || "").toLowerCase();
    return (
      wId === strippedId ||
      wId.replace(/^(wb-factory-|wb-fc-|book-|dossier-|wb-)/, "") === strippedId ||
      wSlug === strippedId ||
      wSlug.replace(/^(wb-factory-|wb-fc-|book-|dossier-|wb-)/, "") === strippedId
    );
  });
  if (fuzzy) return fuzzy;

  // 4. Fallback from Core Labs repository (no grammar- stripping)
  const coreLab =
    getCoreLabById(decodedId) ||
    getCoreLabById(lowerId) ||
    getCoreLabById(strippedId);
  if (coreLab) return convertLabToWorkbook(coreLab);

  return null;
}

async function readLocalPurchases(): Promise<LocalPurchaseRecord[]> {
  try {
    const raw = await fs.readFile(LOCAL_PURCHASES_FILE, "utf8");
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

async function writeLocalPurchases(records: LocalPurchaseRecord[]): Promise<void> {
  await fs.mkdir(LOCAL_STORE_DIR, { recursive: true });
  await fs.writeFile(LOCAL_PURCHASES_FILE, JSON.stringify(records, null, 2), "utf8");
}

/**
 * Returns the set of unlocked product slugs for the given user email.
 * Free products are always included. Checks Supabase first, then local fallback store.
 */
export async function getUnlockedProductSlugs(userEmail?: string | null): Promise<Set<string>> {
  // Global Free Launch Mode: 100% free access for all students
  if (process.env.NEXT_PUBLIC_FREE_LAUNCH_MODE === "true") {
    return new Set(getAllProducts().map((p) => p.slug));
  }

  const email = (userEmail || serverEnv.demoUserEmail).toLowerCase().trim();
  const unlocked = new Set<string>(
    DEFAULT_PRODUCTS.filter((p) => p.isFree).map((p) => p.slug),
  );

  // 1. Check Supabase if configured
  const supabase = getSupabaseServerClient();
  if (supabase) {
    try {
      const { data } = await supabase
        .from("user_purchases")
        .select("product_slug, status, expires_at")
        .eq("user_email", email)
        .eq("status", "active");
      if (data) {
        const now = Date.now();
        for (const row of data) {
          if (!row.expires_at || new Date(row.expires_at).getTime() > now) {
            unlocked.add(row.product_slug);
          }
        }
      }
    } catch (err) {
      console.warn("[gtf] Supabase purchase lookup fallback:", err);
    }
  }

  // 2. Check local dev store (.local-store/purchases.json)
  const localRecords = await readLocalPurchases();
  for (const rec of localRecords) {
    if (rec.userEmail.toLowerCase() === email) {
      unlocked.add(rec.productSlug);
    }
  }

  // 3. Automated Vault & Suite Entitlement Expansion
  if (unlocked.has("exam-vault-a1-b2")) {
    for (const p of DEFAULT_PRODUCTS) {
      if (p.divisionId === "sprachakademie" && p.type === "mock_test") {
        unlocked.add(p.slug);
      }
    }
  }
  if (unlocked.has("wb-suite-a1-b2")) {
    for (const p of DEFAULT_PRODUCTS) {
      if (p.type === "pdf_workbook") {
        unlocked.add(p.slug);
      }
    }
  }
  if (unlocked.has("studienkolleg-all-access")) {
    unlocked.add("studienkolleg-m-kurs-crash");
    unlocked.add("studienkolleg-t-kurs-crash");
  }
  if (unlocked.has("gtf-all-access-pass")) {
    for (const p of getAllProducts()) {
      unlocked.add(p.slug);
    }
    unlocked.add("fachsprache-pflege-ausbildung-suite");
  }

  return unlocked;
}

/**
 * Records a product unlock in Supabase (when configured) AND the local dev store
 * so `/api/webhooks/unlock-pack` works out-of-the-box on localhost:3000.
 */
export async function grantProductUnlock(params: {
  userEmail: string;
  productSlug: string;
  fullName?: string;
  paymentProvider?: string;
  paymentReference?: string;
  amountPaid?: number;
  currency?: string;
}): Promise<{ persistedTo: "supabase" | "local-store"; record: LocalPurchaseRecord }> {
  const email = params.userEmail.toLowerCase().trim();
  const slug = params.productSlug.trim();
  const nowIso = new Date().toISOString();

  const record: LocalPurchaseRecord = {
    userEmail: email,
    productSlug: slug,
    paymentProvider: params.paymentProvider || "webhook",
    paymentReference: params.paymentReference,
    unlockedAt: nowIso,
  };

  // Always save to local store so offline demo works immediately
  const existing = await readLocalPurchases();
  const filtered = existing.filter(
    (r) => !(r.userEmail.toLowerCase() === email && r.productSlug === slug),
  );
  filtered.push(record);
  await writeLocalPurchases(filtered);

  const supabase = getSupabaseServerClient();
  if (supabase) {
    try {
      // Ensure user row exists
      const { data: userRow } = await supabase
        .from("users")
        .upsert(
          { email, full_name: params.fullName || null, updated_at: nowIso },
          { onConflict: "email" },
        )
        .select("id")
        .single();

      const { data: prodRow } = await supabase
        .from("products")
        .select("id")
        .eq("slug", slug)
        .maybeSingle();

      const { error } = await supabase.from("user_purchases").upsert(
        {
          user_id: userRow?.id ?? null,
          user_email: email,
          product_id: prodRow?.id ?? null,
          product_slug: slug,
          payment_provider: params.paymentProvider || "webhook",
          payment_reference: params.paymentReference || null,
          amount_paid: params.amountPaid ?? null,
          currency: params.currency || "EUR",
          status: "active",
          unlocked_at: nowIso,
        },
        { onConflict: "user_email,product_slug" },
      );
      if (!error) {
        return { persistedTo: "supabase", record };
      }
    } catch (err) {
      console.warn("[gtf] Supabase unlock fallback to local-store:", err);
    }
  }

  return { persistedTo: "local-store", record };
}

/**
 * Loads the full server-side ExamTest (including answer keys for server scoring).
 * Loads genuine modular question banks and tests for all tracks:
 * A1, A2, B1, B2, M-Kurs, T-Kurs, W-Kurs, G-Kurs, Ausbildung Pflege, IT, Hotelfach.
 */
function isValidExamTest(test: any): boolean {
  return Boolean(
    test &&
      typeof test === "object" &&
      test.sections &&
      test.sections.hoeren &&
      Array.isArray(test.sections.hoeren.teile) &&
      test.sections.hoeren.teile.length > 0 &&
      test.sections.lesen &&
      Array.isArray(test.sections.lesen.teile) &&
      test.sections.lesen.teile.length > 0,
  );
}

const BUNDLED_EXAM_TESTS: Record<string, ExamTest> = {
  "gtf-a1-modelltest-1": a1Modelltest1Raw as unknown as ExamTest,
  "gtf-a1-modelltest-2": a1Modelltest2Raw as unknown as ExamTest,
  "gtf-a1-modelltest-3": a1Modelltest3Raw as unknown as ExamTest,
  "gtf-a2-modelltest-1": a2Modelltest1Raw as unknown as ExamTest,
  "gtf-a2-from-drive": a2Modelltest1Raw as unknown as ExamTest,
  "gtf-a2-modelltest-2": a2Modelltest2Raw as unknown as ExamTest,
  "gtf-a2-modelltest-3": a2Modelltest3Raw as unknown as ExamTest,
  "gtf-b1-modelltest-1": b1Modelltest1Raw as unknown as ExamTest,
  "gtf-b1-modelltest-2": b1Modelltest2Raw as unknown as ExamTest,
  "gtf-b1-modelltest-3": b1Modelltest3Raw as unknown as ExamTest,
  "gtf-b2-modelltest-1": b2Modelltest1Raw as unknown as ExamTest,
  "gtf-b2-modelltest-2": b2Modelltest2Raw as unknown as ExamTest,
  "gtf-b2-modelltest-3": b2Modelltest3Raw as unknown as ExamTest,
  "gtf-m_kurs-modelltest-1": mKursModelltest1Raw as unknown as ExamTest,
  "gtf-t_kurs-modelltest-1": tKursModelltest1Raw as unknown as ExamTest,
  "gtf-w_kurs-modelltest-1": wKursModelltest1Raw as unknown as ExamTest,
  "gtf-g_kurs-modelltest-1": gKursModelltest1Raw as unknown as ExamTest,
  "gtf-ausbildung_pflege-modelltest-1": pflegeModelltest1Raw as unknown as ExamTest,
};

export function getServerExamTest(levelRaw: string, testId?: string): ExamTest {
  const level: Level = isLevel(levelRaw) ? levelRaw : "b1";
  const cleanTestId = (testId || "").trim().toLowerCase();

  // 0. Instant statically bundled exam test lookup (100% reliable on Vercel Serverless)
  if (cleanTestId && BUNDLED_EXAM_TESTS[cleanTestId]) {
    return structuredClone(BUNDLED_EXAM_TESTS[cleanTestId]);
  }
  const defaultBundledKey = `gtf-${level}-modelltest-1`;
  if (!cleanTestId && BUNDLED_EXAM_TESTS[defaultBundledKey]) {
    return structuredClone(BUNDLED_EXAM_TESTS[defaultBundledKey]);
  }

  // 1. Direct candidate paths if testId is specified
  if (testId) {
    const candidates = [
      path.join(RUNTIME_ROOT, "data", `${testId}.json`),
      path.join(RUNTIME_ROOT, "data", "question_banks", `${testId}.json`),
      path.join(RUNTIME_ROOT, "data", `gtf-${level}-modelltest-1.json`),
    ];
    for (const p of candidates) {
      if (fsSync.existsSync(p)) {
        try {
          const parsed = JSON.parse(fsSync.readFileSync(p, "utf8")) as ExamTest;
          if (isValidExamTest(parsed)) {
            return parsed;
          }
        } catch {
          // ignore
        }
      }
    }
  }

  if (BUNDLED_EXAM_TESTS[defaultBundledKey]) {
    return structuredClone(BUNDLED_EXAM_TESTS[defaultBundledKey]);
  }

  // 2. Track-specific genuine question bank candidates
  const trackCandidates = [
    path.join(RUNTIME_ROOT, "data", `gtf-${level}-modelltest-1.json`),
    path.join(RUNTIME_ROOT, "data", `sample-${level}-test.json`),
  ];
  for (const p of trackCandidates) {
    if (fsSync.existsSync(p)) {
      try {
        const parsed = JSON.parse(fsSync.readFileSync(p, "utf8")) as ExamTest;
        if (isValidExamTest(parsed)) {
          return parsed;
        }
      } catch {
        // ignore
      }
    }
  }

  // 3. Fallbacks for A1, A2, B1, B2
  if (level === "a1") {
    const a1Candidates = [
      path.join(RUNTIME_ROOT, "data", "gtf-a1-modelltest-1.json"),
    ];
    for (const p of a1Candidates) {
      if (fsSync.existsSync(p)) {
        try {
          const parsed = JSON.parse(fsSync.readFileSync(p, "utf8")) as ExamTest;
          if (isValidExamTest(parsed)) return parsed;
        } catch {
          // ignore
        }
      }
    }
  }

  if (level === "a2") {
    const a2Candidates = [
      path.join(RUNTIME_ROOT, "data", "gtf-a2-modelltest-1.json"),
      path.join(RUNTIME_ROOT, "data", "sample-a2-from-drive.json"),
    ];
    for (const p of a2Candidates) {
      if (fsSync.existsSync(p)) {
        try {
          const parsed = JSON.parse(fsSync.readFileSync(p, "utf8")) as ExamTest;
          if (isValidExamTest(parsed)) return parsed;
        } catch {
          // ignore
        }
      }
    }
  }

  if (level === "b2") {
    const b2Candidates = [
      path.join(RUNTIME_ROOT, "data", "gtf-b2-modelltest-1.json"),
    ];
    for (const p of b2Candidates) {
      if (fsSync.existsSync(p)) {
        try {
          const parsed = JSON.parse(fsSync.readFileSync(p, "utf8")) as ExamTest;
          if (isValidExamTest(parsed)) return parsed;
        } catch {
          // ignore
        }
      }
    }
  }

  const base = structuredClone(sampleB1Raw) as unknown as ExamTest;
  base.isFree = true;
  if (level !== "b1") {
    const meta = LEVEL_META[level] || { label: level.toUpperCase(), exams: "Modelltest" };
    base.id = testId || `gtf-${level}-modelltest-1`;
    base.level = level;
    base.title = `GTF ${meta.label} Modelltest 1 — ${meta.exams}`;
    base.productSlug = `${level}-free-demo-test`;
  } else if (testId) {
    base.id = testId;
  }
  return base;
}

/**
 * Strips answers & explanations and attaches encrypted media tokens for audio streaming
 * before returning an ExamTest to the browser.
 */
export function sanitizeExamTestForClient(test: ExamTest, userEmail: string): ExamTest {
  const clone = structuredClone(test);

  if (clone.sections?.lesen?.teile) {
    for (const teil of clone.sections.lesen.teile) {
      if (teil.kind === "reading") {
        for (const q of teil.questions) {
          delete q.answer;
          delete q.explanation;
        }
      } else {
        for (const g of teil.gaps) {
          delete g.answer;
          delete g.explanation;
        }
      }
    }
  }

  if (clone.sections?.hoeren?.teile) {
    for (const teil of clone.sections.hoeren.teile) {
      // Audio is bound explicitly per teil (teil.audioUrl in the exam JSON).
      // NEVER synthesize a path from the level or the digit inside teil.id — that silently
      // played another exercise's recording whenever a teil had no audioUrl.
      if (!teil.audioUrl) {
        console.error(`[GTF Hören] Teil "${teil.id}" of test "${clone.id}" has no bound audioUrl.`);
      }

      const source = teil.audio?.driveFileId || teil.audio?.drivePath || teil.audio?.localFile
        ? teil.audio
        : { localFile: `synth:${teil.id}` };
      teil.audioToken = signMediaToken("audio", source, userEmail, 2 * 60 * 60);
      delete teil.audio;
      for (const q of teil.questions) {
        delete q.answer;
        delete q.explanation;
      }
    }
  }

  for (const teil of clone.sections.sprechen.teile) {
    const audioObj = teil.examinerAudio || teil.audio;
    const scriptHash = teil.examinerScript
      ? crypto.createHash("sha256").update(teil.examinerScript.trim(), "utf8").digest("hex")
      : "";
    const source = audioObj?.driveFileId || audioObj?.drivePath || audioObj?.localFile
      ? audioObj
      : { localFile: scriptHash ? `${scriptHash}.mp3` : `synth:${teil.id}` };
    const token = signMediaToken("audio", source, userEmail, 2 * 60 * 60);
    teil.examinerAudioToken = token;
    teil.audioToken = token;
    delete teil.examinerAudio;
    delete teil.audio;
  }

  return clone;
}

export async function getWorkbookForClient(
  workbookId: string,
  userEmail?: string | null,
): Promise<WorkbookClientView | null> {
  const wb = getWorkbookById(workbookId);
  if (!wb) return null;
  const email = (userEmail || serverEnv.demoUserEmail).toLowerCase().trim();
  const unlockedSlugs = await getUnlockedProductSlugs(email);
  const isFreeLaunch = process.env.NEXT_PUBLIC_FREE_LAUNCH_MODE === "true";
  const unlocked = isFreeLaunch || wb.isFree || unlockedSlugs.has(wb.productSlug);

  const { contentType, module } = resolveWorkbookContentMeta(wb);
  const isGrammar = contentType === "grammar";

  const sanitizedQuestions = isGrammar
    ? []
    : (wb.questions || []).map((q) => ({
        id: q.id,
        page: q.page,
        label: q.label,
        prompt: q.prompt,
        type: q.type,
        options: q.options,
      }));

  const pdfToken =
    unlocked && wb.pdf && !isGrammar
      ? signMediaToken("pdf", wb.pdf, email, 60 * 60)
      : undefined;

  const isHoeren =
    !isGrammar &&
    (contentType === "exam_hoeren" ||
      contentType === "exam_sprechen" ||
      wb.skill === "hoeren" ||
      wb.title.toLowerCase().includes("hören") ||
      wb.id.toLowerCase().includes("hoeren"));

  // Audio comes ONLY from the workbook's own explicit audioUrl. No level/ID-number guessing:
  // a missing binding must surface as "no audio", never as another exercise's recording.
  const resolvedAudioUrl = isGrammar || contentType === "exam_lesen" || contentType === "exam_schreiben"
    ? undefined
    : wb.audioUrl || undefined;
  if (isHoeren && !resolvedAudioUrl) {
    console.error(`[GTF Hören] Workbook "${wb.id}" is a Hören exercise without a bound audioUrl.`);
  }

  return {
    id: wb.id,
    title: wb.title,
    subtitle: wb.subtitle,
    level: wb.level,
    contentType,
    module,
    productSlug: wb.productSlug,
    isFree: isFreeLaunch ? true : wb.isFree,
    priceEur: isFreeLaunch ? 0 : wb.priceEur,
    priceInr: isFreeLaunch ? 0 : wb.priceInr,
    pages: wb.pages,
    coverColor: wb.coverColor,
    topics: wb.topics,
    questions: sanitizedQuestions,
    unlocked,
    pdfToken,
    viewerEmail: email,
    audioUrl: resolvedAudioUrl,
    hoerenTranscript: resolvedAudioUrl && isHoeren ? wb.hoerenTranscript : undefined,
    skill: isGrammar ? "grammar" : wb.skill || (isHoeren ? "hoeren" : undefined),
    grammarNotes: isGrammar ? wb.grammarNotes : undefined,
    readingPassage: isGrammar ? undefined : wb.readingPassage,
    flashcards: isGrammar ? wb.flashcards || [] : [],
  };
}

export async function saveExamAttempt(attempt: {
  userEmail: string;
  testId: string;
  level: Level;
  lesenScore: number;
  hoerenScore: number;
  schreibenScore: number;
  sprechenScore: number;
  overallPercent: number;
  passed: boolean;
  answersJson: Record<string, unknown>;
  aiFeedbackJson: Record<string, unknown>;
}): Promise<{ id: string; persisted: boolean }> {
  const id = `att_${Date.now().toString(36)}`;
  const nowIso = new Date().toISOString();

  const supabase = getSupabaseServerClient();
  if (supabase) {
    try {
      const { data, error } = await supabase
        .from("exam_attempts")
        .insert({
          user_email: attempt.userEmail.toLowerCase(),
          test_id: attempt.testId,
          cefr_level: attempt.level,
          lesen_score: attempt.lesenScore,
          hoeren_score: attempt.hoerenScore,
          schreiben_score: attempt.schreibenScore,
          sprechen_score: attempt.sprechenScore,
          overall_percent: attempt.overallPercent,
          passed: attempt.passed,
          answers_json: attempt.answersJson,
          ai_feedback_json: attempt.aiFeedbackJson,
        })
        .select("id")
        .single();
      if (!error && data?.id) {
        return { id: data.id, persisted: true };
      }
    } catch (err) {
      console.warn("[gtf] Supabase exam_attempts insert fallback:", err);
    }
  }

  try {
    await fs.mkdir(LOCAL_STORE_DIR, { recursive: true });
    let list: unknown[] = [];
    try {
      list = JSON.parse(await fs.readFile(LOCAL_ATTEMPTS_FILE, "utf8"));
      if (!Array.isArray(list)) list = [];
    } catch {
      list = [];
    }
    list.unshift({ id, ...attempt, createdAt: nowIso });
    await fs.writeFile(LOCAL_ATTEMPTS_FILE, JSON.stringify(list.slice(0, 50), null, 2), "utf8");
    return { id, persisted: true };
  } catch {
    return { id, persisted: false };
  }
}
