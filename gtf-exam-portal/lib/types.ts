import type { Level, SectionKey } from "./config";

export type { Level, SectionKey };

/* ───────────────────────────── Exam content ───────────────────────────── */

export interface Option {
  id: string;
  text: string;
}

interface QuestionBase {
  id: string;
  prompt: string;
  points?: number;
  /** Stripped before reaching the browser. */
  answer?: string;
  /** Stripped before reaching the browser; returned by /api/exam/score. */
  explanation?: string;
}

export interface RichtigFalschQuestion extends QuestionBase {
  type: "richtig_falsch";
}

export interface McqQuestion extends QuestionBase {
  type: "mcq";
  options: Option[];
}

export type Question = RichtigFalschQuestion | McqQuestion;

export interface ReadingTeil {
  id: string;
  kind: "reading";
  title: string;
  instructions: string;
  passageTitle: string;
  /** Paragraphs separated by blank lines. */
  passage: string;
  source?: string;
  questions: Question[];
}

export interface SprachbausteinGap {
  id: string;
  /** Only for mode = "select". */
  options?: Option[];
  answer?: string;
  explanation?: string;
  points?: number;
}

export interface SprachbausteineTeil {
  id: string;
  kind: "sprachbausteine";
  title: string;
  instructions: string;
  /** "select": every gap has its own a/b/c options. "wordbank": shared word bank (drag or tap). */
  mode: "select" | "wordbank";
  /** Text with gap markers like {{21}}. */
  text: string;
  gaps: SprachbausteinGap[];
  wordBank?: Option[];
}

export type LesenTeil = ReadingTeil | SprachbausteineTeil;

export interface ScriptLine {
  speaker: string;
  voice: "female" | "male";
  text: string;
}

/** Server-side reference to a Drive file. NEVER sent to the client. */
export interface DriveRef {
  driveFileId?: string;
  /** Path relative to GOOGLE_DRIVE_ROOT_FOLDER_ID, e.g. "audio/b1/modelltest-1/teil1.mp3". */
  drivePath?: string;
  /** Local MP3 fallback file name (e.g. "b1_hoeren_dialogue_sample.mp3"). */
  localFile?: string;
}

export interface HoerenTeil {
  id: string;
  title: string;
  instructions: string;
  /** Goethe/telc rule: how often the recording may be played. */
  maxPlays: 1 | 2;
  /** Direct static preloaded MP3 audio URL (e.g. /audio/a1_hoeren_01.mp3) for instant 1-click playback. */
  audioUrl?: string;
  /** Server-only drive source; replaced by `audioToken` for the client. */
  audio?: DriveRef;
  /** Opaque, encrypted, short-lived token → /api/drive/stream-audio?token=… */
  audioToken?: string;
  /** Used for the offline TTS fallback. Stripped when a real recording is available. */
  script?: ScriptLine[];
  questions: Question[];
}

export interface SchreibenTask {
  id: string;
  title: string;
  register: "informell" | "formell" | "forum";
  instructions: string;
  situation: string;
  leitpunkte: string[];
  minWords: number;
  recommendedMinutes: number;
}

export interface SprechenTeil {
  id: string;
  teil: 1 | 2 | 3;
  title: string;
  instructions: string;
  card: {
    heading: string;
    subheading?: string;
    bullets: string[];
  };
  examinerScript: string;
  examinerAudio?: DriveRef;
  examinerAudioToken?: string;
  audio?: DriveRef;
  audioToken?: string;
  prepSeconds: number;
  speakSeconds: number;
}

export interface ExamTest {
  id: string;
  level: Level;
  title: string;
  provider: string;
  version: string;
  productSlug: string;
  isFree: boolean;
  passPercent: number;
  sections: {
    lesen: { durationMinutes: number; teile: LesenTeil[] };
    hoeren: { durationMinutes: number; teile: HoerenTeil[] };
    schreiben: { durationMinutes: number; tasks: SchreibenTask[] };
    sprechen: { durationMinutes: number; teile: SprechenTeil[] };
  };
}

/* ───────────────────────────── Workbooks ───────────────────────────── */

export interface FlashcardDeckItem {
  id: string;
  german: string;
  phonetic?: string;
  category: string;
  english: string;
  hindi: string;
  exampleDe: string;
  exampleTranslation: string;
  grammarTip?: string;
  audioUrl?: string;
  frontText?: string;
  backText?: string;
}

export interface WorkbookQuestion {
  id: string;
  page: number;
  label: string;
  prompt: string;
  type: "mcq" | "text";
  options?: Option[];
  /** For text questions: accepted answers (case/umlaut tolerant). Stripped before client. */
  answer?: string | string[];
  explanation?: string;
}

export type WorkbookContentType =
  | "grammar"
  | "exam_lesen"
  | "exam_hoeren"
  | "exam_schreiben"
  | "exam_sprechen";

export interface GrammarNotes {
  rule: string;
  proTip: string;
  examples: string[];
}

export interface Workbook {
  id: string;
  title: string;
  subtitle: string;
  level: Level;
  contentType?: WorkbookContentType;
  module?: string;
  productSlug: string;
  isFree: boolean;
  priceEur: number;
  priceInr: number;
  pages: number;
  coverColor: string;
  topics: string[];
  audioUrl?: string;
  skill?: string;
  flashcards?: FlashcardDeckItem[];
  grammarNotes?: GrammarNotes;
  readingPassage?: string;
  /** Server-only. Local file in /data/pdfs (offline demo) or Drive reference. */
  pdf?: { localFile?: string } & DriveRef;
  questions: WorkbookQuestion[];
}

export interface WorkbookClientView extends Omit<Workbook, "pdf"> {
  unlocked: boolean;
  /** Opaque token for /api/drive/stream-pdf, only present when unlocked. */
  pdfToken?: string;
  viewerEmail?: string;
  contentType?: WorkbookContentType;
  module?: string;
  audioUrl?: string;
  skill?: string;
  flashcards?: FlashcardDeckItem[];
  grammarNotes?: GrammarNotes;
  readingPassage?: string;
}

/* ───────────────────────────── Multi-Division Ecosystem ───────────────────────────── */

export type DivisionId = "sprachakademie" | "studienkolleg" | "fachsprache_medizin";

export interface DivisionInfo {
  id: DivisionId;
  name: string;
  shortTitle: string;
  tagline: string;
  description: string;
  badge: string;
  accentColor: string;
  iconName: string;
}

export type StudienkollegTrack = "m_kurs" | "t_kurs" | "g_kurs" | "w_kurs";

export interface FlashcardItem {
  id: string;
  track: StudienkollegTrack;
  subject:
    | "Mathematik"
    | "Physik"
    | "Chemie"
    | "Biologie"
    | "Technische Mechanik"
    | "Informatik"
    | "Volkswirtschaftslehre (VWL)"
    | "Betriebswirtschaftslehre (BWL)"
    | "Geschichte"
    | "Sozialkunde"
    | "Literaturwissenschaft"
    | (string & {});
  termDe: string;
  articleDe?: "der" | "die" | "das";
  pronunciationDe?: string;
  definitionDe: string;
  contextHinglish: string;
  formulaOrExample?: string;
  category: string;
}

export interface FormulaItem {
  id: string;
  track: StudienkollegTrack;
  subject: string;
  title: string;
  latex: string;
  explanationDe: string;
  variables: { symbol: string; unit: string; description: string }[];
  exampleCalculation: {
    inputs: Record<string, number>;
    result: string;
    steps: string[];
  };
}

export interface PastPaperItem {
  id: string;
  university: string;
  city: string;
  year: string;
  semester: "Sommersemester" | "Wintersemester";
  track: StudienkollegTrack;
  subject: string;
  durationMinutes: number;
  totalPoints: number;
  downloadSlug: string;
  overview: string;
  keyTopics: string[];
}

/* ───────────────────────────── Division 3: Clinical & Nursing ───────────────────────────── */

export interface ClinicalCaseDialogue {
  speaker: string;
  role: "Arzt" | "Patient" | "Pflegekraft" | "Oberarzt";
  german: string;
  hinglishNote?: string;
}

export interface ClinicalModule {
  id: string;
  title: string;
  category: "fsp_anamnese" | "isbar_handover" | "pflegedokumentation" | "ausbildung_prep";
  patientName: string;
  patientAge: number;
  chiefComplaint: string;
  diagnosis: string;
  situation: string;
  vitalSigns: {
    bloodPressure: string;
    heartRate: string;
    spo2: string;
    temperature: string;
  };
  dialogueScript: ClinicalCaseDialogue[];
  redemittel: string[];
  sampleHandover: {
    identification: string;
    situation: string;
    background: string;
    assessment: string;
    recommendation: string;
  };
}

/* ───────────────────────────── Identity & Single-Device Sessions ───────────────────────────── */

export type DeviceType = "web" | "mobile";

export interface UserSessionState {
  studentId?: string;
  userEmail: string;
  fullName: string;
  phone: string;
  phoneVerified: boolean;
  course?: string;
  role?: string;
  deviceType: DeviceType;
  sessionToken: string;
  isAuthenticated: boolean;
}

/* ───────────────────────────── Commerce ───────────────────────────── */

export type ProductType = "mock_test" | "pdf_workbook" | "sprechen_pass" | "studienkolleg_course" | "clinical_module";

export interface Product {
  slug: string;
  divisionId: DivisionId;
  type: ProductType;
  level?: Level;
  track?: StudienkollegTrack;
  title: string;
  description: string;
  priceEur: number;
  priceInr: number;
  isFree: boolean;
  /** Mock test id or workbook id this product unlocks. */
  resourceId: string;
}

export interface CatalogItem extends Product {
  unlocked: boolean;
}

/* ───────────────────────────── Evaluation ───────────────────────────── */

export type Cefr = "A1" | "A2" | "B1" | "B2" | "C1";
export type AiEngine = "groq" | "gemini" | "offline-heuristic";

export interface Correction {
  original: string;
  corrected: string;
  type: "grammar" | "spelling" | "vocabulary" | "punctuation" | "style" | "pronunciation";
  explanationDe: string;
  explanationHinglish: string;
}

export interface SchreibenEvaluation {
  engine: AiEngine;
  taskId: string;
  cefrEstimate: Cefr;
  /** 0–100 */
  score: number;
  criteria: {
    taskFulfilment: number; // 0–25 Erfüllung
    coherence: number; // 0–25 Kohärenz
    vocabulary: number; // 0–25 Wortschatz
    grammar: number; // 0–25 Strukturen
  };
  wordCount: number;
  corrections: Correction[];
  strengths: string[];
  improvements: string[];
  summaryDe: string;
  summaryHinglish: string;
  improvedVersion: string;
  evaluatedAt: string;
}

export interface SprechenEvaluation {
  engine: AiEngine;
  transcriptionEngine: "groq-whisper" | "gemini" | "browser" | "none";
  teilId: string;
  transcript: string;
  durationSeconds: number;
  cefrEstimate: Cefr;
  /** 0–100 */
  score: number;
  criteria: {
    taskFulfilment: number; // 0–20
    fluency: number; // 0–20
    pronunciation: number; // 0–20
    grammar: number; // 0–20
    vocabulary: number; // 0–20
  };
  pronunciationNotes: string[];
  corrections: Correction[];
  tips: string[];
  summaryDe: string;
  summaryHinglish: string;
  evaluatedAt: string;
}

export interface ScoredItem {
  id: string;
  teilTitle: string;
  prompt: string;
  given: string | null;
  givenText: string | null;
  correct: string;
  correctText: string;
  isCorrect: boolean;
  points: number;
  explanation: string;
}

export interface SectionScore {
  section: SectionKey;
  score: number;
  max: number;
  percent: number;
  passed: boolean;
  items: ScoredItem[];
}

export interface ExamResult {
  testId: string;
  level: Level;
  title: string;
  passPercent: number;
  sections: SectionScore[];
  overallPercent: number;
  passed: boolean;
  attemptId: string | null;
  persisted: boolean;
}
