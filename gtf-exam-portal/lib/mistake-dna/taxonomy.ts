/**
 * Gateway To Future (GTF) — Mistake-DNA Taxonomy & Deterministic Classifier
 *
 * Engineered specifically for Indian & South Asian German learners (A1–C1, Goethe/telc,
 * Studienkolleg, Pflege/Ausbildung) who face systematic L1 English/Hindi transfer traps.
 */

export const MISTAKE_AXES = [
  "cases_articles",
  "syntax_verbs",
  "prepositions_register",
  "listening_traps",
  "reading_vocab",
] as const;

export type MistakeAxis = (typeof MISTAKE_AXES)[number];

export interface MistakeAxisMeta {
  id: MistakeAxis;
  label: string;
  shortLabel: string;
  labelDe: string;
  color: string;
}

export const MISTAKE_AXIS_META: Record<MistakeAxis, MistakeAxisMeta> = {
  cases_articles: {
    id: "cases_articles",
    label: "Cases & Gender",
    shortLabel: "Kasus",
    labelDe: "Kasus & Artikel",
    color: "#0f4c81",
  },
  syntax_verbs: {
    id: "syntax_verbs",
    label: "Word Order & Verbs",
    shortLabel: "Satzbau",
    labelDe: "Satzbau & Verben",
    color: "#d97706",
  },
  prepositions_register: {
    id: "prepositions_register",
    label: "Prepositions & Register",
    shortLabel: "Präp/Reg",
    labelDe: "Präpositionen & Stil",
    color: "#059669",
  },
  listening_traps: {
    id: "listening_traps",
    label: "Hören Traps",
    shortLabel: "Hören",
    labelDe: "Hören-Fallen",
    color: "#7c3aed",
  },
  reading_vocab: {
    id: "reading_vocab",
    label: "Reading & Expression",
    shortLabel: "Ausdruck",
    labelDe: "Lesen & Ausdruck",
    color: "#dc2626",
  },
};

export const MISTAKE_CODES = [
  "CASE_DAT_WECHSEL",
  "CASE_AKK_DAT_VERBS",
  "GENDER_RULE_UNG_HEIT",
  "WORD_ORDER_WEIL",
  "WORD_ORDER_INVERSION",
  "PERFEKT_HABEN_SEIN",
  "MODAL_SEPARABLE_BRACKET",
  "PREP_ZU_NACH_IN",
  "REGISTER_SIE_DU",
  "HOEREN_TIME_TRAP",
  "HOEREN_NEGATION_DIST",
  "LESEN_SYNONYM_PARAPHRASE",
  "PRONUNCIATION_UMLAUT_CH",
  "CONNECTOR_COHERENCE",
] as const;

export type MistakeCode = (typeof MISTAKE_CODES)[number];

export interface RemediationDrillItem {
  id: string;
  errorKey: MistakeCode;
  cefr: "A1" | "A2" | "B1" | "B2";
  promptDe: string;
  options: { id: string; text: string }[];
  correctId: string;
  explanationDe: string;
  explanationHinglish: string;
}

export interface MistakeTaxonomyEntry {
  code: MistakeCode;
  axis: MistakeAxis;
  shortLabel: string;
  titleDe: string;
  titleEn: string;
  cefrBand: string;
  whyIndiansMissItHinglish: string;
  goldenRuleDe: string;
  classicTrap: { wrong: string; right: string };
  recommendedGrammarHref: string;
  remediationDrills: RemediationDrillItem[];
}

export const MISTAKE_TAXONOMY: Record<MistakeCode, MistakeTaxonomyEntry> = {
  CASE_DAT_WECHSEL: {
    code: "CASE_DAT_WECHSEL",
    axis: "cases_articles",
    shortLabel: "Wechselpräp (Dat/Akk)",
    titleDe: "Wechselpräpositionen (Wo? Dativ vs. Wohin? Akkusativ)",
    titleEn: "Two-Way Prepositions (Location vs. Direction)",
    cefrBand: "A2–B2",
    whyIndiansMissItHinglish:
      "English mein 'in/on' same rehta hai chahe aap andar baithe ho ya andar ja rahe ho. German mein 9 Wechselpräpositionen (an, auf, hinter, in, neben, über, unter, vor, zwischen) 'Wo?' (static position) par Dativ aur 'Wohin?' (movement) par Akkusativ leti hain.",
    goldenRuleDe: "Wo? (Position/Ruhe) → Dativ (dem/der/den+n) | Wohin? (Richtung) → Akkusativ (den/die/das).",
    classicTrap: {
      wrong: "Ich bin in die Bibliothek.",
      right: "Ich bin in der Bibliothek. (Wo? → Dativ)",
    },
    recommendedGrammarHref: "/academy/a2/02-grammar",
    remediationDrills: [
      {
        id: "dna-cdw-1",
        errorKey: "CASE_DAT_WECHSEL",
        cefr: "A2",
        promptDe: "Wo ist dein Reisepass? — Er liegt auf ___ Schreibtisch (der).",
        options: [
          { id: "a", text: "dem" },
          { id: "b", text: "den" },
          { id: "c", text: "der" },
        ],
        correctId: "a",
        explanationDe: "„liegen“ beschreibt eine Position (Wo?) → Dativ maskulin: auf dem Schreibtisch.",
        explanationHinglish: "Passport desk par 'rakha hua hai' (Wo? static) — isliye Dativ 'dem' aayega, 'den' nahi!",
      },
      {
        id: "dna-cdw-2",
        errorKey: "CASE_DAT_WECHSEL",
        cefr: "B1",
        promptDe: "Wohin gehst du nach dem Sprachkurs? — Ich gehe direkt in ___ Klinik (die).",
        options: [
          { id: "a", text: "der" },
          { id: "b", text: "die" },
          { id: "c", text: "dem" },
        ],
        correctId: "b",
        explanationDe: "„gehen“ beschreibt eine Bewegung/Richtung (Wohin?) → Akkusativ feminin: in die Klinik.",
        explanationHinglish: "Movement hai ('ja rahe ho' = Wohin?), isliye feminine noun 'Klinik' Akkusativ mein 'die' hi rahegi.",
      },
      {
        id: "dna-cdw-3",
        errorKey: "CASE_DAT_WECHSEL",
        cefr: "B1",
        promptDe: "Das Bewerbungsgespräch findet in ___ Konferenzraum (der) im 2. Stock statt.",
        options: [
          { id: "a", text: "den" },
          { id: "b", text: "das" },
          { id: "c", text: "dem" },
        ],
        correctId: "c",
        explanationDe: "„stattfinden“ antwortet auf „Wo?“ → Dativ: in dem (im) Konferenzraum.",
        explanationHinglish: "'stattfinden' (hona) static location batata hai (Wo?) — so 'der Konferenzraum' → 'in dem (im) Konferenzraum'.",
      },
    ],
  },

  CASE_AKK_DAT_VERBS: {
    code: "CASE_AKK_DAT_VERBS",
    axis: "cases_articles",
    shortLabel: "Dativ/Akk Verben",
    titleDe: "Verben mit Dativ & Akkusativ (helfen, danken, gefallen, brauchen)",
    titleEn: "Verb-Governed Dativ & Akkusativ Objects",
    cefrBand: "A1–B2",
    whyIndiansMissItHinglish:
      "English mein 'I help you' direct object lagta hai, par German mein 'helfen, danken, gehören, gefallen, passen, antworten, gratulieren' STRICTLY Dativ maangte hain ('Ich helfe dir', kabhi 'dich' nahi!).",
    goldenRuleDe: "Dativ-Verben (helfen, danken, gefallen, antworten, gehören) verlangen IMMER mir/dir/ihm/ihr/dem/der.",
    classicTrap: {
      wrong: "Können Sie mich bitte helfen?",
      right: "Können Sie mir bitte helfen?",
    },
    recommendedGrammarHref: "/academy/b1/02-grammar",
    remediationDrills: [
      {
        id: "dna-cadv-1",
        errorKey: "CASE_AKK_DAT_VERBS",
        cefr: "A2",
        promptDe: "Die neue Wohnung in Berlin gefällt ___ sehr gut (ich).",
        options: [
          { id: "a", text: "mich" },
          { id: "b", text: "mir" },
          { id: "c", text: "mein" },
        ],
        correctId: "b",
        explanationDe: "„gefallen“ steht immer mit Dativ: Es gefällt mir / dir / ihm / ihr.",
        explanationHinglish: "'gefallen' hamesha Dativ leta hai — 'mir gefällt' (mujhe pasand aaya), 'mich' bilkul galat hai!",
      },
      {
        id: "dna-cadv-2",
        errorKey: "CASE_AKK_DAT_VERBS",
        cefr: "B1",
        promptDe: "Vielen Dank! Sie haben ___ wirklich sehr geholfen (wir).",
        options: [
          { id: "a", text: "uns" },
          { id: "b", text: "unser" },
          { id: "c", text: "wir" },
        ],
        correctId: "a",
        explanationDe: "„helfen“ verlangt Dativ; Dativ von „wir“ ist „uns“.",
        explanationHinglish: "'helfen' + Dativ: wir → uns ('Sie haben uns geholfen').",
      },
      {
        id: "dna-cadv-3",
        errorKey: "CASE_AKK_DAT_VERBS",
        cefr: "B1",
        promptDe: "Ich suche ___ erfahrenen Berater für mein Visum (ein).",
        options: [
          { id: "a", text: "ein" },
          { id: "b", text: "einem" },
          { id: "c", text: "einen" },
        ],
        correctId: "c",
        explanationDe: "„suchen“ verlangt ein Akkusativobjekt; maskulin Akkusativ: einen erfahrenen Berater.",
        explanationHinglish: "'suchen' direct Akkusativ verb hai — masculine noun 'der Berater' Akkusativ mein 'einen Berater' ban jaata hai!",
      },
    ],
  },

  GENDER_RULE_UNG_HEIT: {
    code: "GENDER_RULE_UNG_HEIT",
    axis: "cases_articles",
    shortLabel: "Artikel & Suffix-Regeln",
    titleDe: "Genus-Regeln (-ung, -heit, -keit, -schaft, -tion, -chen, -ment)",
    titleEn: "Noun Gender & Suffix Rules (der / die / das)",
    cefrBand: "A1–B2",
    whyIndiansMissItHinglish:
      "Hindi mein sirf 2 genders hain aur English mein nouns ka gender nahi hota. Sab nouns ratne ki jagah suffix rules yaad rakho: -ung/-heit/-keit/-schaft/-tion/-tät = 100% DIE; -chen/-lein/-ment/-um = 100% DAS!",
    goldenRuleDe: "-ung, -heit, -keit, -schaft, -tion, -tät → immer DIE | -chen, -lein, -ment, -um → immer DAS.",
    classicTrap: {
      wrong: "der Bewerbung / das Gesundheit",
      right: "die Bewerbung / die Gesundheit",
    },
    recommendedGrammarHref: "/academy/a1/02-grammar",
    remediationDrills: [
      {
        id: "dna-gen-1",
        errorKey: "GENDER_RULE_UNG_HEIT",
        cefr: "A2",
        promptDe: "Welcher Artikel gehört zu „Anerkennung“ und „Gesundheit“?",
        options: [
          { id: "a", text: "der / das" },
          { id: "b", text: "die / die" },
          { id: "c", text: "das / die" },
        ],
        correctId: "b",
        explanationDe: "Alle Nomen auf -ung und -heit sind ausnahmslos feminin (die).",
        explanationHinglish: "100% guarantee rule: koi bhi noun '-ung' ya '-heit' par end ho toh aankh band karke 'DIE' lagao!",
      },
      {
        id: "dna-gen-2",
        errorKey: "GENDER_RULE_UNG_HEIT",
        cefr: "B1",
        promptDe: "Ich habe ___ Dokument (das) rechtzeitig per E-Mail geschickt.",
        options: [
          { id: "a", text: "der" },
          { id: "b", text: "die" },
          { id: "c", text: "das" },
        ],
        correctId: "c",
        explanationDe: "Nomen auf -ment (das Dokument, das Medikament, das Apartment) sind fast immer neutral (das).",
        explanationHinglish: "'-ment' ending wale international nouns (Dokument, Medikament, Instrument) hamesha 'DAS' hote hain.",
      },
      {
        id: "dna-gen-3",
        errorKey: "GENDER_RULE_UNG_HEIT",
        cefr: "B1",
        promptDe: "Wegen ___ Möglichkeit (die) zur Ausbildung lerne ich täglich Deutsch.",
        options: [
          { id: "a", text: "der" },
          { id: "b", text: "des" },
          { id: "c", text: "dem" },
        ],
        correctId: "a",
        explanationDe: "„Möglichkeit“ (-keit) ist feminin (die). Nach „wegen“ (Genitiv) wird „die“ zu „der“.",
        explanationHinglish: "Pehle suffix check karo: '-keit' = 'die'. Phir 'wegen' (Genitiv) mein 'die' → 'der Möglichkeit'!",
      },
    ],
  },

  WORD_ORDER_WEIL: {
    code: "WORD_ORDER_WEIL",
    axis: "syntax_verbs",
    shortLabel: "Weil / Nebensatz",
    titleDe: "Nebensatz-Verbendstellung (weil, dass, obwohl, wenn, damit)",
    titleEn: "Subordinate Clause Verb-Final Rule",
    cefrBand: "A2–B2",
    whyIndiansMissItHinglish:
      "Ye Indian students ki #1 exam galti hai! English ('because I have time') ke chakkar mein log 'weil ich habe Zeit' bol dete hain. German mein weil/dass/obwohl/wenn/damit aate hi conjugated verb seedha sentence ke BILKUL END mein chala jaata hai!",
    goldenRuleDe: "Nach weil, dass, obwohl, wenn, bevor, nachdem steht das konjugierte Verb IMMER ganz am Ende.",
    classicTrap: {
      wrong: "Ich lerne Deutsch, weil ich will in Berlin arbeiten.",
      right: "Ich lerne Deutsch, weil ich in Berlin arbeiten will.",
    },
    recommendedGrammarHref: "/academy/b1/02-grammar",
    remediationDrills: [
      {
        id: "dna-wow-1",
        errorKey: "WORD_ORDER_WEIL",
        cefr: "A2",
        promptDe: "Wählen Sie den grammatisch korrekten Satz:",
        options: [
          { id: "a", text: "Ich komme später, weil der Zug hat Verspätung." },
          { id: "b", text: "Ich komme später, weil der Zug Verspätung hat." },
          { id: "c", text: "Ich komme später, weil hat der Zug Verspätung." },
        ],
        correctId: "b",
        explanationDe: "Nach „weil“ wandert das konjugierte Verb „hat“ ans Satzende.",
        explanationHinglish: "'weil' dekhte hi conjugated verb ('hat') ko utha kar aakhri position par rakh do!",
      },
      {
        id: "dna-wow-2",
        errorKey: "WORD_ORDER_WEIL",
        cefr: "B1",
        promptDe: "Ich freue mich sehr, dass Sie ___ .",
        options: [
          { id: "a", text: "haben mir schnell geantwortet" },
          { id: "b", text: "mir haben schnell geantwortet" },
          { id: "c", text: "mir schnell geantwortet haben" },
        ],
        correctId: "c",
        explanationDe: "Im Perfekt-Nebensatz steht das Hilfsverb („haben“) ganz am Ende nach dem Partizip II.",
        explanationHinglish: "Perfekt + 'dass' mein Hilfsverb ('haben') Partizip II ke bhi baad — bilkul end mein aata hai!",
      },
      {
        id: "dna-wow-3",
        errorKey: "WORD_ORDER_WEIL",
        cefr: "B2",
        promptDe: "Obwohl die Prüfung sehr anspruchsvoll ___, hat er sie beim ersten Versuch bestanden.",
        options: [
          { id: "a", text: "war" },
          { id: "b", text: "war sehr" },
          { id: "c", text: "ist gewesen war" },
        ],
        correctId: "a",
        explanationDe: "„obwohl“ leitet einen Nebensatz ein → Verb „war“ direkt vor dem Komma.",
        explanationHinglish: "'obwohl' bhi Nebensatz banata hai — comma se theek pehle 'war' aayega, aur comma ke turant baad main verb 'hat'!",
      },
    ],
  },

  WORD_ORDER_INVERSION: {
    code: "WORD_ORDER_INVERSION",
    axis: "syntax_verbs",
    shortLabel: "Verb Position 2",
    titleDe: "Verb-Zweitstellung & Inversion (Heute gehe ich / Deshalb lerne ich)",
    titleEn: "V2 Rule & Subject-Verb Inversion",
    cefrBand: "A1–B2",
    whyIndiansMissItHinglish:
      "English mein 'Tomorrow I will go' bolte hain, isliye German mein galti se 'Morgen ich gehe' likh dete hain. German mein main clause ka verb HAMESHA Position 2 par chipka rehta hai — agar Position 1 par Time/Place/Deshalb aaya, toh Subject Position 3 par chala jaayega!",
    goldenRuleDe: "Im Hauptsatz steht das konjugierte Verb IMMER auf Position 2: [Zeit/Grund] + [Verb] + [Subjekt].",
    classicTrap: {
      wrong: "Deshalb ich möchte eine Ausbildung machen.",
      right: "Deshalb möchte ich eine Ausbildung machen.",
    },
    recommendedGrammarHref: "/academy/a2/02-grammar",
    remediationDrills: [
      {
        id: "dna-inv-1",
        errorKey: "WORD_ORDER_INVERSION",
        cefr: "A2",
        promptDe: "Am Montag ___ mein B1-Intensivkurs in Berlin.",
        options: [
          { id: "a", text: "beginnt" },
          { id: "b", text: "er beginnt" },
          { id: "c", text: "mein beginnt" },
        ],
        correctId: "a",
        explanationDe: "„Am Montag“ belegt Position 1 → das Verb „beginnt“ muss direkt auf Position 2 stehen.",
        explanationHinglish: "Position 1 = 'Am Montag', toh Position 2 = Verb 'beginnt'! Subject 'mein B1-Intensivkurs' Position 3 par jaayega.",
      },
      {
        id: "dna-inv-2",
        errorKey: "WORD_ORDER_INVERSION",
        cefr: "B1",
        promptDe: "Ich habe gestern nicht gut geschlafen. Trotzdem ___ ich heute pünktlich zur Arbeit.",
        options: [
          { id: "a", text: "ich komme" },
          { id: "b", text: "komme" },
          { id: "c", text: "gekommen" },
        ],
        correctId: "b",
        explanationDe: "Nach „trotzdem“ und „deshalb“ (Position 1) folgt sofort das konjugierte Verb (Inversion).",
        explanationHinglish: "'deshalb', 'trotzdem', 'außerdem' Position 1 lete hain — inke turant baad VERB aata hai, 'ich' nahi!",
      },
      {
        id: "dna-inv-3",
        errorKey: "WORD_ORDER_INVERSION",
        cefr: "B1",
        promptDe: "Wenn ich die B1-Prüfung bestehe, ___ ich mich sofort bei der Charité.",
        options: [
          { id: "a", text: "ich bewerbe" },
          { id: "b", text: "bewerbe" },
          { id: "c", text: "beworben" },
        ],
        correctId: "b",
        explanationDe: "Ein vorangestellter Nebensatz zählt als Position 1 → Verb-Komma-Verb-Regel: „…, bewerbe ich mich“.",
        explanationHinglish: "Yaad rakho 'Verb-Comma-Verb' formula! Agar sentence 'Wenn/Weil' se start ho, toh comma ke turant baad VERB aata hai.",
      },
    ],
  },

  PERFEKT_HABEN_SEIN: {
    code: "PERFEKT_HABEN_SEIN",
    axis: "syntax_verbs",
    shortLabel: "Perfekt (haben/sein)",
    titleDe: "Perfekt mit „haben“ vs. „sein“ & Partizip II",
    titleEn: "Past Tense Auxiliary Selection (haben vs. sein)",
    cefrBand: "A2–B2",
    whyIndiansMissItHinglish:
      "English mein har past perfect 'have' se banta hai ('I have gone / moved'), par German mein movement (A→B: gehen, fahren, fliegen, umziehen) aur state-change (aufstehen, einschlafen, werden, bleiben, passieren) HAMESHA 'sein' lete hain!",
    goldenRuleDe: "Ortswechsel (gehen, fahren, umziehen) + Zustandswechsel (aufstehen, werden) + bleiben/sein/passieren → SEIN.",
    classicTrap: {
      wrong: "Ich habe nach Berlin umgezogen.",
      right: "Ich bin nach Berlin umgezogen.",
    },
    recommendedGrammarHref: "/academy/a2/02-grammar",
    remediationDrills: [
      {
        id: "dna-perf-1",
        errorKey: "PERFEKT_HABEN_SEIN",
        cefr: "A2",
        promptDe: "Letzten Monat ___ meine Familie in eine größere Wohnung umgezogen.",
        options: [
          { id: "a", text: "hat" },
          { id: "b", text: "ist" },
          { id: "c", text: "war" },
        ],
        correctId: "b",
        explanationDe: "„umziehen“ (Wohnungswechsel) zeigt einen Ortswechsel → Perfekt mit „sein“ (ist umgezogen).",
        explanationHinglish: "'umziehen' (shift hona) location change hai, isliye 'ist umgezogen' hoga, 'hat umgezogen' nahi!",
      },
      {
        id: "dna-perf-2",
        errorKey: "PERFEKT_HABEN_SEIN",
        cefr: "A2",
        promptDe: "Am Wochenende ___ wir wegen des Regens zu Hause geblieben.",
        options: [
          { id: "a", text: "haben" },
          { id: "b", text: "sind" },
          { id: "c", text: "werden" },
        ],
        correctId: "b",
        explanationDe: "„bleiben“ bildet trotz fehlender Bewegung das Perfekt immer mit „sein“: wir sind geblieben.",
        explanationHinglish: "VIP Exception: 'bleiben' (rukna) aur 'passieren' (hona) bina movement ke bhi hamesha 'SEIN' lete hain!",
      },
      {
        id: "dna-perf-3",
        errorKey: "PERFEKT_HABEN_SEIN",
        cefr: "B1",
        promptDe: "Sie hat die Dokumente gestern bereits ___ (unterschreiben).",
        options: [
          { id: "a", text: "geunterschrieben" },
          { id: "b", text: "unterschrieben" },
          { id: "c", text: "unterschreibt" },
        ],
        correctId: "b",
        explanationDe: "Untrennbare Verben (be-, ver-, er-, ent-, unter- unbetont) bilden das Partizip II OHNE „ge-“.",
        explanationHinglish: "Untrennbare prefixes (be-, ver-, er-, ent-, zer-, über-, unter- sign karne par) mein 'ge-' KABHI nahi lagta: 'unterschrieben'!",
      },
    ],
  },

  MODAL_SEPARABLE_BRACKET: {
    code: "MODAL_SEPARABLE_BRACKET",
    axis: "syntax_verbs",
    shortLabel: "Satzklammer (Modal/Trennbar)",
    titleDe: "Satzklammer: Modalverben & trennbare Verben",
    titleEn: "Sentence Bracket (Modal & Separable Verbs)",
    cefrBand: "A1–B1",
    whyIndiansMissItHinglish:
      "English mein 'I must work today' mein dono verbs saath rehte hain. German mein Modalverb Position 2 par rehta hai aur Infinitiv (bina 'zu' ke!) sentence ke end mein jaata hai. Same rule trennbare Verben (anrufen, aufstehen) par lagta hai!",
    goldenRuleDe: "Modalverb (Pos. 2) + … + Infinitiv (Ende, OHNE „zu“) | Trennbares Verb: Stamm (Pos. 2) + … + Präfix (Ende).",
    classicTrap: {
      wrong: "Ich muss zu lernen heute für die Prüfung.",
      right: "Ich muss heute für die Prüfung lernen.",
    },
    recommendedGrammarHref: "/academy/a1/02-grammar",
    remediationDrills: [
      {
        id: "dna-msb-1",
        errorKey: "MODAL_SEPARABLE_BRACKET",
        cefr: "A1",
        promptDe: "Wählen Sie den korrekten Satz mit „anrufen“:",
        options: [
          { id: "a", text: "Ich anrufe dich morgen um 18 Uhr." },
          { id: "b", text: "Ich rufe dich morgen um 18 Uhr an." },
          { id: "c", text: "Ich rufe an dich morgen um 18 Uhr." },
        ],
        correctId: "b",
        explanationDe: "„anrufen“ ist trennbar: das Präfix „an“ steht ganz am Satzende.",
        explanationHinglish: "'anrufen' toot kar bracket banata hai — 'rufe' Position 2 par aur 'an' sentence ke bilkul end mein!",
      },
      {
        id: "dna-msb-2",
        errorKey: "MODAL_SEPARABLE_BRACKET",
        cefr: "A2",
        promptDe: "Für das Studentenvisum müssen Sie ein Sperrkonto ___ .",
        options: [
          { id: "a", text: "zu eröffnen" },
          { id: "b", text: "eröffnet" },
          { id: "c", text: "eröffnen" },
        ],
        correctId: "c",
        explanationDe: "Nach Modalverben (müssen, können, wollen, sollen, dürfen) steht der reine Infinitiv OHNE „zu“.",
        explanationHinglish: "Modal verb ke baad kabhi 'zu' mat lagao — sirf plain infinitive 'eröffnen' end mein aayega!",
      },
      {
        id: "dna-msb-3",
        errorKey: "MODAL_SEPARABLE_BRACKET",
        cefr: "B1",
        promptDe: "Wann ___ der neue Deutschkurs nächste Woche ___ ?",
        options: [
          { id: "a", text: "fängt … an" },
          { id: "b", text: "anfängt … —" },
          { id: "c", text: "fangen … an" },
        ],
        correctId: "a",
        explanationDe: "„anfangen“ ist trennbar mit Vokalwechsel (a → ä in der 3. Person Singular): fängt … an.",
        explanationHinglish: "Der Kurs = singular (er), aur 'anfangen' trennbar + umlaut verb hai: 'fängt ... an'!",
      },
    ],
  },

  PREP_ZU_NACH_IN: {
    code: "PREP_ZU_NACH_IN",
    axis: "prepositions_register",
    shortLabel: "Präpositionen (zu/nach/in)",
    titleDe: "Orts- & Richtungspräpositionen (zu, nach, in, bei, auf, mit)",
    titleEn: "Destination & Fixed Prepositions",
    cefrBand: "A1–B2",
    whyIndiansMissItHinglish:
      "English ke ek 'to' ke liye German mein 3 alag prepositions hain: cities/countries (bina article) + 'Hause' → NACH; people/institutions/shops → ZU (+ Dativ); countries with article (die Schweiz) / enclosed spaces → IN (+ Akkusativ)!",
    goldenRuleDe: "Städte/Länder ohne Artikel + Hause → NACH | Personen/Ärzte/Orte → ZU (+Dativ) | Räume/Länder mit Artikel → IN.",
    classicTrap: {
      wrong: "Ich fliege zu Deutschland / Ich gehe nach Arzt.",
      right: "Ich fliege nach Deutschland / Ich gehe zum Arzt.",
    },
    recommendedGrammarHref: "/academy/a2/02-grammar",
    remediationDrills: [
      {
        id: "dna-pzn-1",
        errorKey: "PREP_ZU_NACH_IN",
        cefr: "A1",
        promptDe: "Nächsten September fliege ich ___ Berlin und gehe dort zuerst ___ Bürgeramt.",
        options: [
          { id: "a", text: "zu / nach" },
          { id: "b", text: "nach / zum" },
          { id: "c", text: "in / bei" },
        ],
        correctId: "b",
        explanationDe: "Städte stehen mit „nach“ (nach Berlin); Behörden/Orte als Ziel mit „zu + Dativ“ (zum Bürgeramt).",
        explanationHinglish: "City (Berlin) = 'nach Berlin', aur office/authority (das Bürgeramt) = 'zu dem → zum Bürgeramt'!",
      },
      {
        id: "dna-pzn-2",
        errorKey: "PREP_ZU_NACH_IN",
        cefr: "A2",
        promptDe: "Bist du schon ___ Hause oder noch ___ deiner Kollegin?",
        options: [
          { id: "a", text: "nach / zu" },
          { id: "b", text: "zu / bei" },
          { id: "c", text: "in / mit" },
        ],
        correctId: "b",
        explanationDe: "Ruhe/Position: „zu Hause“ (at home) und „bei + Person“ (at someone's place).",
        explanationHinglish: "Ghar JA rahe ho = 'nach Hause', ghar PAR ho = 'zu Hause'; kisi insaan ke paas ho = 'bei + Dativ'!",
      },
      {
        id: "dna-pzn-3",
        errorKey: "PREP_ZU_NACH_IN",
        cefr: "B1",
        promptDe: "Ich interessiere mich sehr ___ eine Ausbildung in der Pflege.",
        options: [
          { id: "a", text: "über" },
          { id: "b", text: "auf" },
          { id: "c", text: "für" },
        ],
        correctId: "c",
        explanationDe: "Feste Verb-Präposition-Verbindung: sich interessieren für + Akkusativ.",
        explanationHinglish: "Fixed pair yaad rakho: 'sich interessieren FÜR + Akk' (kabhi 'in' ya 'über' mat lagana!).",
      },
    ],
  },

  REGISTER_SIE_DU: {
    code: "REGISTER_SIE_DU",
    axis: "prepositions_register",
    shortLabel: "Formell (Sie vs. du)",
    titleDe: "Register & Anrede: Formelles „Sie“ vs. Informelles „du“",
    titleEn: "Formal vs. Informal Register Discipline",
    cefrBand: "A1–B2",
    whyIndiansMissItHinglish:
      "English mein boss aur dost dono 'you' hain. Goethe/telc Schreiben aur German hospital/HR emails mein agar aapne formelle mail mein 'du' ya 'Liebe Grüße' likh diya, toh examiner seedha register ke marks kaat deta hai!",
    goldenRuleDe: "Formell: Sehr geehrte(r) …, Sie/Ihr (groß!), Mit freundlichen Grüßen | Informell: Liebe(r) …, du/dein, Viele Grüße.",
    classicTrap: {
      wrong: "Sehr geehrte Frau Weber, kannst du mir helfen? Liebe Grüße",
      right: "Sehr geehrte Frau Weber, könnten Sie mir bitte helfen? Mit freundlichen Grüßen",
    },
    recommendedGrammarHref: "/academy/b1/04-modelltests",
    remediationDrills: [
      {
        id: "dna-reg-1",
        errorKey: "REGISTER_SIE_DU",
        cefr: "A2",
        promptDe: "Sie schreiben eine formelle E-Mail an die Personalabteilung. Welche Grußformel passt?",
        options: [
          { id: "a", text: "Bis bald & liebe Grüße" },
          { id: "b", text: "Mit freundlichen Grüßen" },
          { id: "c", text: "Tschüss und danke dir" },
        ],
        correctId: "b",
        explanationDe: "In formellen Briefen und Bewerbungen ist „Mit freundlichen Grüßen“ der Standard.",
        explanationHinglish: "Formal mail (HR, Vermieter, Behörde, Kursleiter) ka closing HAMESHA 'Mit freundlichen Grüßen' hota hai.",
      },
      {
        id: "dna-reg-2",
        errorKey: "REGISTER_SIE_DU",
        cefr: "B1",
        promptDe: "Welche Anrede und Pronomen-Schreibweise ist in einer formellen E-Mail richtig?",
        options: [
          { id: "a", text: "Ich danke ihnen für ihre schnelle Antwort." },
          { id: "b", text: "Ich danke Ihnen für Ihre schnelle Antwort." },
          { id: "c", text: "Ich danke dir für Ihre schnelle Antwort." },
        ],
        correctId: "b",
        explanationDe: "Die Höflichkeitsform (Sie, Ihnen, Ihr/Ihre) wird im Deutschen IMMER großgeschrieben.",
        explanationHinglish: "Formal 'Sie', 'Ihnen', 'Ihr/Ihre' sentence ke beech mein bhi HAMESHA CAPITAL letter se likhe jaate hain!",
      },
      {
        id: "dna-reg-3",
        errorKey: "REGISTER_SIE_DU",
        cefr: "B1",
        promptDe: "Sie kennen den Namen des Ansprechpartners im Krankenhaus nicht. Wie beginnen Sie?",
        options: [
          { id: "a", text: "Hallo Krankenhaus-Team," },
          { id: "b", text: "Liebe Damen und Herren," },
          { id: "c", text: "Sehr geehrte Damen und Herren," },
        ],
        correctId: "c",
        explanationDe: "Ohne konkreten Namen lautet die offizielle Anrede „Sehr geehrte Damen und Herren,“.",
        explanationHinglish: "Jab contact person ka naam na pata ho, official German greeting 'Sehr geehrte Damen und Herren,' hoti hai.",
      },
    ],
  },

  HOEREN_TIME_TRAP: {
    code: "HOEREN_TIME_TRAP",
    axis: "listening_traps",
    shortLabel: "Hören: Zeit & Zahlen",
    titleDe: "Hören-Falle: Uhrzeiten, Zahlen & Terminänderungen",
    titleEn: "Listening Trap: German Clock Times & Self-Corrections",
    cefrBand: "A1–B2",
    whyIndiansMissItHinglish:
      "Goethe/telc Hören ka sabse bada trap: 'halb acht' = 7:30 (8:30 NAHI!), 'vierzehn' (14) vs 'vierzig' (40), aur speaker pehle purana time bolta hai ('eigentlich um 10 Uhr, aber heute ausnahmsweise erst um 10:30')!",
    goldenRuleDe: "„halb X“ = (X−1):30 Uhr! Immer bis zum Satzende auf „aber / jetzt / verschoben auf“ warten.",
    classicTrap: {
      wrong: "halb neun = 9:30 Uhr",
      right: "halb neun = 8:30 Uhr (halfway TO nine!)",
    },
    recommendedGrammarHref: "/academy/b1/03-hoeren-lesen",
    remediationDrills: [
      {
        id: "dna-htt-1",
        errorKey: "HOEREN_TIME_TRAP",
        cefr: "A1",
        promptDe: "Durchsage: „Die Praxis öffnet am Mittwoch um halb neun.“ Wann öffnet die Praxis?",
        options: [
          { id: "a", text: "09:30 Uhr" },
          { id: "b", text: "08:30 Uhr" },
          { id: "c", text: "08:15 Uhr" },
        ],
        correctId: "b",
        explanationDe: "„halb neun“ bedeutet eine halbe Stunde VOR neun → 08:30 Uhr.",
        explanationHinglish: "'halb neun' = 9 bajne mein aadha ghanta baaki hai → 8:30! English ke 'half past' se ulta hota hai.",
      },
      {
        id: "dna-htt-2",
        errorKey: "HOEREN_TIME_TRAP",
        cefr: "A2",
        promptDe: "Ansage: „Der ICE nach München sollte um 14:15 abfahren, hat aber 25 Minuten Verspätung.“ Wann fährt er ab?",
        options: [
          { id: "a", text: "14:15 Uhr" },
          { id: "b", text: "14:40 Uhr" },
          { id: "c", text: "13:50 Uhr" },
        ],
        correctId: "b",
        explanationDe: "14:15 + 25 Minuten Verspätung = 14:40 Uhr. Die erste Zahl (14:15) ist ein klassischer Distraktor!",
        explanationHinglish: "Audio mein pehli number sunte hi tick mat karo! 'aber ... Verspätung' sun kar add karo: 14:15 + 25 = 14:40.",
      },
      {
        id: "dna-htt-3",
        errorKey: "HOEREN_TIME_TRAP",
        cefr: "B1",
        promptDe: "Telefonat: „Ursprünglich war unser Termin am vierzehnten Mai, wir müssen ihn aber auf den siebzehnten verschieben.“ Welches Datum gilt?",
        options: [
          { id: "a", text: "14. Mai" },
          { id: "b", text: "40. Mai" },
          { id: "c", text: "17. Mai" },
        ],
        correctId: "c",
        explanationDe: "„ursprünglich“ markiert die alte Info; „verschieben auf“ nennt den neuen gültigen Termin (17. Mai).",
        explanationHinglish: "'ursprünglich' = purana plan (trap!). 'verschieben auf' ke baad jo date aaye wahi final answer hai (17. Mai).",
      },
    ],
  },

  HOEREN_NEGATION_DIST: {
    code: "HOEREN_NEGATION_DIST",
    axis: "listening_traps",
    shortLabel: "Hören: Verneinung/Doch",
    titleDe: "Hören-Falle: Verneinung, „doch“ & Meinungswechsel",
    titleEn: "Listening Trap: Negation, 'doch' & Distractors",
    cefrBand: "A2–B2",
    whyIndiansMissItHinglish:
      "Goethe/telc Hören mein 'nicht mehr', 'erst ab', 'leider abgesagt', aur negative question par 'doch!' bolne se poora meaning palat jaata hai. Sirf keyword sun kar Richtig/Falsch mark karna sabse common galti hai.",
    goldenRuleDe: "Achten Sie auf Signalwörter: nicht mehr, kaum, leider, eigentlich … aber, doch (widerspricht einer Verneinung!).",
    classicTrap: {
      wrong: "„Kommst du nicht mit?“ — „Doch!“ (= Nein)",
      right: "„Kommst du nicht mit?“ — „Doch!“ (= JA, ich komme mit!)",
    },
    recommendedGrammarHref: "/academy/b1/03-hoeren-lesen",
    remediationDrills: [
      {
        id: "dna-hnd-1",
        errorKey: "HOEREN_NEGATION_DIST",
        cefr: "A2",
        promptDe: "Kollegin: „Hast du morgen keine Zeit für die Übergabe?“ — Antwort: „Doch, ab 14 Uhr geht es!“ Was bedeutet das?",
        options: [
          { id: "a", text: "Die Person hat morgen keine Zeit." },
          { id: "b", text: "Die Person hat ab 14 Uhr Zeit." },
          { id: "c", text: "Die Übergabe fällt aus." },
        ],
        correctId: "b",
        explanationDe: "„Doch“ widerspricht der negativen Frage („keine Zeit?“) und bedeutet eindeutig JA.",
        explanationHinglish: "Negative question ('keine Zeit?') ka jawab 'Doch!' = 'Nahi nahi, time HAI!' (Positive answer).",
      },
      {
        id: "dna-hnd-2",
        errorKey: "HOEREN_NEGATION_DIST",
        cefr: "B1",
        promptDe: "Radio: „Das Konzert im Park findet heute wegen des Gewitters nicht im Freien, sondern in der Stadthalle statt.“ Aussage: Das Konzert wurde abgesagt.",
        options: [
          { id: "a", text: "Richtig" },
          { id: "b", text: "Falsch" },
        ],
        correctId: "b",
        explanationDe: "Das Konzert findet statt — nur der Ort wurde verlegt („sondern in der Stadthalle“). Es wurde NICHT abgesagt.",
        explanationHinglish: "'Gewitter' aur 'nicht im Freien' sun kar cancel mat samjho — 'sondern in der Stadthalle' matlab show HO raha hai (Falsch)!",
      },
      {
        id: "dna-hnd-3",
        errorKey: "HOEREN_NEGATION_DIST",
        cefr: "B2",
        promptDe: "Interview: „Anfangs war ich skeptisch gegenüber Homeoffice, inzwischen möchte ich die Flexibilität aber nicht mehr missen.“ Wie denkt die Person JETZT?",
        options: [
          { id: "a", text: "Sie lehnt Homeoffice ab." },
          { id: "b", text: "Sie schätzt Homeoffice sehr." },
          { id: "c", text: "Sie arbeitet nie von zu Hause." },
        ],
        correctId: "b",
        explanationDe: "„Anfangs“ = Vergangenheit (Distraktor); „nicht mehr missen möchten“ = sehr positiv bewerten.",
        explanationHinglish: "'Anfangs skeptisch' purani baat thi — 'nicht mehr missen möchten' ek B2 idiom hai jiska matlab 'ab iske bina kaam nahi chalega (bahut pasand hai)'!",
      },
    ],
  },

  LESEN_SYNONYM_PARAPHRASE: {
    code: "LESEN_SYNONYM_PARAPHRASE",
    axis: "reading_vocab",
    shortLabel: "Lesen: Paraphrasen",
    titleDe: "Lesen-Falle: Synonyme, Paraphrasen & Schlüsselwort-Fallen",
    titleEn: "Reading Comprehension: Paraphrase vs. Surface Word Traps",
    cefrBand: "A2–B2",
    whyIndiansMissItHinglish:
      "Goethe/telc Lesen mein sahi option mein kabhi bhi passage ka exact word copy-paste nahi hota — balki uska SYNONYM hota hai (e.g., 'kostenlos' = 'ohne Gebühr' = 'gratis', 'untersagt' = 'verboten'). Exact word aksar trap option mein hota hai!",
    goldenRuleDe: "Suchen Sie nach inhaltlichen Synonymen (z. B. kostenlos = gebührenfrei; Pflicht = obligatorisch), nicht nach identischen Wörtern.",
    classicTrap: {
      wrong: "Exact keyword match in option A without checking qualifiers ('nur', 'immer', 'alle')",
      right: "Match the true paraphrase & check absolute words ('immer', 'nie', 'nur', 'ausschließlich')",
    },
    recommendedGrammarHref: "/academy/b1/03-hoeren-lesen",
    remediationDrills: [
      {
        id: "dna-lsp-1",
        errorKey: "LESEN_SYNONYM_PARAPHRASE",
        cefr: "B1",
        promptDe: "Text: „Die Teilnahme am Orientierungskurs ist für alle neuen Auszubildenden verpflichtend, jedoch gebührenfrei.“ Welche Aussage stimmt?",
        options: [
          { id: "a", text: "Der Kurs ist freiwillig und kostet nichts." },
          { id: "b", text: "Man muss teilnehmen, zahlt aber nichts." },
          { id: "c", text: "Nur erfahrene Mitarbeiter müssen bezahlen." },
        ],
        correctId: "b",
        explanationDe: "„verpflichtend“ = man muss teilnehmen; „gebührenfrei“ = man zahlt nichts.",
        explanationHinglish: "Synonym mapping: 'verpflichtend' = compulsory (muss), 'gebührenfrei' = free (zahlt nichts) → Option B!",
      },
      {
        id: "dna-lsp-2",
        errorKey: "LESEN_SYNONYM_PARAPHRASE",
        cefr: "B2",
        promptDe: "Text: „Die meisten Bewerber unterschätzen die Bearbeitungszeit beim Visum.“ Aussage: Alle Bewerber warten zu kurz.",
        options: [
          { id: "a", text: "Richtig" },
          { id: "b", text: "Falsch" },
        ],
        correctId: "b",
        explanationDe: "Achtung auf Quantoren: „Die meisten“ ≠ „Alle“! Außerdem bedeutet „unterschätzen“, dass es LÄNGER dauert als gedacht.",
        explanationHinglish: "Double trap! 'Die meisten' (most) ≠ 'Alle' (all) — Goethe Lesen mein extreme words ('alle', 'immer', 'nie') 90% Falsch hote hain!",
      },
      {
        id: "dna-lsp-3",
        errorKey: "LESEN_SYNONYM_PARAPHRASE",
        cefr: "B1",
        promptDe: "Schild im Krankenhaus: „Das Fotografieren auf der Station ist aus Datenschutzgründen untersagt.“ Was heißt „untersagt“?",
        options: [
          { id: "a", text: "erlaubt" },
          { id: "b", text: "verboten" },
          { id: "c", text: "empfohlen" },
        ],
        correctId: "b",
        explanationDe: "„untersagt“ ist das formelle Synonym für „verboten“.",
        explanationHinglish: "Official German notices mein 'verboten' ki jagah 'untersagt' ya 'nicht gestattet' likha hota hai — dono ka matlab strictly prohibited!",
      },
    ],
  },

  PRONUNCIATION_UMLAUT_CH: {
    code: "PRONUNCIATION_UMLAUT_CH",
    axis: "reading_vocab",
    shortLabel: "Umlaute / Orthografie / ch",
    titleDe: "Aussprache & Rechtschreibung (ä/ö/ü, ch, r, Großschreibung)",
    titleEn: "Umlauts, Pronunciation (ch/r/st) & Capitalization",
    cefrBand: "A1–B2",
    whyIndiansMissItHinglish:
      "English habit ki wajah se log beech sentence mein 'Ich' capital likh dete hain aur nouns ('arbeit', 'termin') small! Bolte waqt 'ü' ko 'u' ('müssen' vs 'mussten') aur 'ich' ko 'ish/ik' bolne se pronunciation marks kat te hain.",
    goldenRuleDe: "Alle Nomen GROSS, „ich“ im Satz klein! Umlaute lippenrund sprechen (ü = „i“ mit runden Lippen) & ich-Laut weich nach e/i/ä/ö/ü.",
    classicTrap: {
      wrong: "Heute habe Ich einen termin. (Aussprache: 'ik' statt 'ich')",
      right: "Heute habe ich einen Termin. (Nomen groß, 'ich' klein!)",
    },
    recommendedGrammarHref: "/academy/a1/01-vocabulary",
    remediationDrills: [
      {
        id: "dna-puc-1",
        errorKey: "PRONUNCIATION_UMLAUT_CH",
        cefr: "A1",
        promptDe: "Welcher Satz ist in der Groß- und Kleinschreibung komplett richtig?",
        options: [
          { id: "a", text: "Morgen habe Ich ein wichtiges Gespräch in der klinik." },
          { id: "b", text: "Morgen habe ich ein wichtiges Gespräch in der Klinik." },
          { id: "c", text: "morgen habe ich ein Wichtiges Gespräch in der Klinik." },
        ],
        correctId: "b",
        explanationDe: "Nomen (Gespräch, Klinik) werden immer großgeschrieben; „ich“ und Adjektive (wichtiges) im Satz klein.",
        explanationHinglish: "German rule: Har NOUN capital (Gespräch, Klinik), aur 'ich' sentence ke beech mein hamesha SMALL!",
      },
      {
        id: "dna-puc-2",
        errorKey: "PRONUNCIATION_UMLAUT_CH",
        cefr: "A2",
        promptDe: "Wann spricht man „ch“ weich (wie in „ich“, „möchte“, „sprechen“)?",
        options: [
          { id: "a", text: "Nach a, o, u, au (z. B. Buch, machen)" },
          { id: "b", text: "Nach i, e, ä, ö, ü, ei, eu (z. B. ich, Küche, sprechen)" },
          { id: "c", text: "Immer wie englisches „k“" },
        ],
        correctId: "b",
        explanationDe: "Nach hellen Vokalen (i, e, ä, ö, ü, ei, eu) und Konsonanten (l, n, r) spricht man den weichen ich-Laut.",
        explanationHinglish: "Trick: a/o/u/au ke baad gale se hard 'kh' (Buch, Nacht), baaki i/e/ä/ö/ü ke baad soft hissing 'ich-Laut' (hawa daanton ke upar se)!",
      },
      {
        id: "dna-puc-3",
        errorKey: "PRONUNCIATION_UMLAUT_CH",
        cefr: "B1",
        promptDe: "Welches Wortpaar ändert durch den Umlaut komplett seine Bedeutung (Präsens vs. Konjunktiv II)?",
        options: [
          { id: "a", text: "konnte (past) vs. könnte (could/would)" },
          { id: "b", text: "gehen vs. laufen" },
          { id: "c", text: "lernen vs. studieren" },
        ],
        correctId: "a",
        explanationDe: "Umlaute tragen Grammatik-Bedeutung: „konnte“ (Präteritum) vs. „könnte“ (höfliche Bitte / Konjunktiv II).",
        explanationHinglish: "Umlaut dots miss karne se grammar badal jaati hai: 'konnte' = kar saka (past), 'könnte' = kya aap kar sakte hain (polite)!",
      },
    ],
  },

  CONNECTOR_COHERENCE: {
    code: "CONNECTOR_COHERENCE",
    axis: "prepositions_register",
    shortLabel: "Konnektoren & Redemittel",
    titleDe: "Konnektoren, Redemittel & Textkohärenz (B1/B2)",
    titleEn: "Connectors, Discourse Markers & Text Cohesion",
    cefrBand: "B1–B2",
    whyIndiansMissItHinglish:
      "Sirf chhote 'Ich … Ich … Und …' sentences likhne ya bolne se B1/B2 mein Coherence ke marks ruk jaate hain. Har text/speech mein 3–4 connectors (deshalb, obwohl, außerdem, einerseits… andererseits) + Goethe Redemittel add karte hi band jump ho jaata hai!",
    goldenRuleDe: "Verbinden Sie Ideen gezielt: Grund (weil/deshalb), Gegensatz (obwohl/trotzdem), Ergänzung (außerdem), Zweck (damit/um…zu).",
    classicTrap: {
      wrong: "Ich möchte nach Deutschland. Ich lerne Deutsch. Es ist schwer.",
      right: "Obwohl Deutsch anspruchsvoll ist, lerne ich täglich, weil ich in Deutschland arbeiten möchte.",
    },
    recommendedGrammarHref: "/academy/b2/02-grammar",
    remediationDrills: [
      {
        id: "dna-con-1",
        errorKey: "CONNECTOR_COHERENCE",
        cefr: "B1",
        promptDe: "Er hat viel Berufserfahrung. ___ spricht er bereits fließend B2-Deutsch.",
        options: [
          { id: "a", text: "Trotzdem" },
          { id: "b", text: "Außerdem" },
          { id: "c", text: "Obwohl" },
        ],
        correctId: "b",
        explanationDe: "„Außerdem“ fügt ein weiteres positives Argument hinzu (Addition).",
        explanationHinglish: "Ek aur positive point add karne ke liye 'Außerdem' (In addition) use karo; 'Trotzdem' opposite point ke liye hota hai.",
      },
      {
        id: "dna-con-2",
        errorKey: "CONNECTOR_COHERENCE",
        cefr: "B1",
        promptDe: "Ich besuche einen Vorbereitungskurs, ___ die Goethe-B1-Prüfung sicher zu bestehen.",
        options: [
          { id: "a", text: "damit" },
          { id: "b", text: "um" },
          { id: "c", text: "weil" },
        ],
        correctId: "b",
        explanationDe: "Bei gleichem Subjekt („ich“ … „ich“) verwendet man „um … zu + Infinitiv“.",
        explanationHinglish: "Agar dono parts ka subject SAME hai ('ich'), toh 'um ... zu + Infinitiv' best aur cleanest B1/B2 structure hai!",
      },
      {
        id: "dna-con-3",
        errorKey: "CONNECTOR_COHERENCE",
        cefr: "B2",
        promptDe: "___ bietet die Großstadt viele Stellenangebote, ___ sind die Mieten in Berlin sehr hoch.",
        options: [
          { id: "a", text: "Einerseits … andererseits" },
          { id: "b", text: "Sowohl … als auch" },
          { id: "c", text: "Weder … noch" },
        ],
        correctId: "a",
        explanationDe: "Für Pro- und Kontra-Argumente (Gegensatz) nutzt man „einerseits … andererseits“.",
        explanationHinglish: "Sprechen Teil 2 / Schreiben mein Pro vs. Contra dikhane ka #1 B2 phrase: 'Einerseits ... andererseits ...'!",
      },
    ],
  },
};

export function isMistakeCode(value: unknown): value is MistakeCode {
  return typeof value === "string" && (MISTAKE_CODES as readonly string[]).includes(value);
}

export function normalizeMistakeCodes(raw: unknown): MistakeCode[] {
  if (!Array.isArray(raw)) return [];
  const unique = new Set<MistakeCode>();
  for (const item of raw) {
    if (isMistakeCode(item)) unique.add(item);
  }
  return Array.from(unique);
}

/**
 * Compact prompt legend injected into AI Schreiben & Sprechen evaluators
 * so LLM responses emit exact canonical Mistake-DNA codes.
 */
export const MISTAKE_CODE_PROMPT_LEGEND = MISTAKE_CODES.map(
  (code) => `- ${code}: ${MISTAKE_TAXONOMY[code].titleEn}`,
).join("\n");

/**
 * Deterministic classifier that maps any exam question, workbook exercise,
 * or AI correction onto 1–2 canonical Mistake-DNA codes.
 */
export function classifyMistakeCodes(input: {
  section?: "lesen" | "hoeren" | "schreiben" | "sprechen" | "workbook";
  prompt?: string;
  explanation?: string;
  given?: string | null;
  correct?: string | null;
  original?: string;
  corrected?: string;
  correctionType?: string;
  explicitTags?: unknown;
}): MistakeCode[] {
  const explicit = normalizeMistakeCodes(input.explicitTags);
  if (explicit.length > 0) return explicit.slice(0, 2);

  const blob = [
    input.prompt || "",
    input.explanation || "",
    input.original || "",
    input.corrected || "",
    input.given || "",
    input.correct || "",
  ]
    .join(" ")
    .toLowerCase();

  const hits = new Set<MistakeCode>();

  // 1. Subordinate clause verb-end (weil/dass/obwohl/wenn)
  if (
    /\b(nebensatz|verbendstellung|verb am ende|verb-end|weil|dass|obwohl|damit|nachdem|bevor)\b/i.test(blob) &&
    /\b(verb|position|ende|satzbau|nebensatz|weil|dass|obwohl)\b/i.test(blob)
  ) {
    hits.add("WORD_ORDER_WEIL");
  }

  // 2. V2 / Inversion
  if (/\b(inversion|position 2|verb-zweit|hauptsatz|deshalb|trotzdem|verb-komma-verb)\b/i.test(blob)) {
    hits.add("WORD_ORDER_INVERSION");
  }

  // 3. Perfekt haben vs. sein / Partizip II
  if (
    /\b(perfekt|partizip|umgezogen|gefahren|gegangen|geblieben|aufgestanden|hilfsverb|haben.*sein|sein.*haben)\b/i.test(
      blob,
    )
  ) {
    hits.add("PERFEKT_HABEN_SEIN");
  }

  // 4. Wechselpräpositionen (Wo? Dativ vs Wohin? Akkusativ)
  if (
    /\b(wechselpräposition|wo\?|wohin\?|liegen|legen|stehen|stellen|sitzen|setzen|hängen|in der|in die|auf dem|auf den)\b/i.test(
      blob,
    ) &&
    /\b(dativ|akkusativ|wo\?|wohin\?|wechselpräposition)\b/i.test(blob)
  ) {
    hits.add("CASE_DAT_WECHSEL");
  }

  // 5. Dativ / Akkusativ verbs & case endings
  if (
    /\b(dativ|akkusativ|genitiv|kasus|helfen|danken|gefallen|gehören|mir|mich|dir|dich|ihm|ihn|einem|einen)\b/i.test(
      blob,
    ) &&
    !hits.has("CASE_DAT_WECHSEL")
  ) {
    hits.add("CASE_AKK_DAT_VERBS");
  }

  // 6. Noun Gender / Suffixes
  if (/\b(genus|artikel|feminin|maskulin|neutral|-ung|-heit|-keit|-schaft|-tion|-chen|-ment)\b/i.test(blob)) {
    hits.add("GENDER_RULE_UNG_HEIT");
  }

  // 7. Modal / Separable bracket
  if (/\b(modalverb|trennbar|satzklammer|präfix|infinitiv ohne zu|anrufen|aufstehen|anfangen|einkaufen)\b/i.test(blob)) {
    hits.add("MODAL_SEPARABLE_BRACKET");
  }

  // 8. Destination & fixed prepositions
  if (/\b(präposition|nach hause|zu hause|zum arzt|beim arzt|interessieren für|warten auf|träumen von|nach berlin)\b/i.test(blob)) {
    hits.add("PREP_ZU_NACH_IN");
  }

  // 9. Formal vs informal register
  if (/\b(formell|informell|höflichkeitsform|anrede|sehr geehrte|mit freundlichen grüßen|sie vs|du vs)\b/i.test(blob)) {
    hits.add("REGISTER_SIE_DU");
  }

  // 10. Listening traps (time/numbers vs negation/distractor)
  if (input.section === "hoeren") {
    if (
      /\b(uhr|halb|viertel|minuten|verspätung|termin|datum|euro|preis|prozent|zahl|nummer|uhrzeit|\d{1,2}:\d{2})\b/i.test(
        blob,
      )
    ) {
      hits.add("HOEREN_TIME_TRAP");
    } else {
      hits.add("HOEREN_NEGATION_DIST");
    }
  } else if (/\b(halb\s+(eins|zwei|drei|vier|fünf|sechs|sieben|acht|neun|zehn|elf|zwölf)|verspätung|uhrzeit)\b/i.test(blob)) {
    hits.add("HOEREN_TIME_TRAP");
  }

  // 11. Pronunciation / Spelling / Umlauts / Capitalization
  if (
    input.correctionType === "spelling" ||
    input.correctionType === "pronunciation" ||
    /\b(großschreibung|kleinschreibung|umlaut|aussprache|rechtschreibung|orthografie|ich-laut|groß|klein)\b/i.test(blob)
  ) {
    hits.add("PRONUNCIATION_UMLAUT_CH");
  }

  // 12. Connectors / Coherence
  if (
    /\b(konnektor|kohärenz|redemittel|außerdem|einerseits|andererseits|um\s+.*\s+zu|struktur)\b/i.test(blob)
  ) {
    hits.add("CONNECTOR_COHERENCE");
  }

  // Section-aware fallback when no granular grammatical keyword matched
  if (hits.size === 0) {
    if (input.section === "lesen") {
      hits.add("LESEN_SYNONYM_PARAPHRASE");
    } else if (input.section === "hoeren") {
      hits.add("HOEREN_NEGATION_DIST");
    } else if (input.section === "schreiben") {
      hits.add(input.correctionType === "style" ? "REGISTER_SIE_DU" : "CONNECTOR_COHERENCE");
    } else if (input.section === "sprechen") {
      hits.add(input.correctionType === "pronunciation" ? "PRONUNCIATION_UMLAUT_CH" : "CONNECTOR_COHERENCE");
    } else {
      hits.add("LESEN_SYNONYM_PARAPHRASE");
    }
  }

  return Array.from(hits).slice(0, 2);
}
