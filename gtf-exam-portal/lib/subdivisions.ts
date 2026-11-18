import type { RoadmapWorkbookSummary } from "@/components/GuidedRoadmapTimeline";
import type { SubdivisionTheme } from "@/components/SubdivisionCard";
import { LEVEL_META, type DivisionKey, type SectionKey } from "@/lib/config";
import type { StudienkollegTrack } from "@/lib/types";
import { getCoreLabsForLevel } from "@/lib/curriculum-labs";

export type CoreModuleSlug =
  | "01-vocabulary"
  | "02-grammar"
  | "03-hoeren-lesen"
  | "04-modelltests";

export interface LevelHierarchyInfo {
  levelKey: string;
  examLevel: string;
  flashcardKey: string;
  label: string;
  cefrTag: string;
  description: string;
  divisionId: DivisionKey;
  divisionLabel: string;
  divisionHref: string;
  theme: SubdivisionTheme;
  isStudienkolleg: boolean;
  isPflege: boolean;
  isComingSoon: boolean;
  stkTrack?: StudienkollegTrack;
}

export interface SubdivisionFolderItem {
  slug: CoreModuleSlug;
  indexLabel: string;
  title: string;
  subtitle: string;
  badge: string;
  theme: SubdivisionTheme;
  href: string;
  metaItems: string[];
}

export interface SubdivisionTopicItem {
  id: string;
  indexLabel: string;
  title: string;
  subtitle: string;
  badge: string;
  theme: SubdivisionTheme;
  href: string;
  ctaLabel: string;
  metaItems?: string[];
  kind:
    | "flashcard-deck"
    | "workbook"
    | "exam-simulator"
    | "stk-tool"
    | "pflege-tool";
  workbookId?: string;
  examSection?: SectionKey;
}

export function getLevelInfo(rawLevel: string): LevelHierarchyInfo {
  const key = (rawLevel || "a1").toLowerCase().trim();

  if (key === "a1" || key === "a2" || key === "b1" || key === "b2") {
    const meta = LEVEL_META[key];
    return {
      levelKey: key,
      examLevel: key,
      flashcardKey: key,
      label: meta.label,
      cefrTag: meta.cefr,
      description: `${meta.description} (${meta.exams}).`,
      divisionId: "sprachakademie",
      divisionLabel: "Language Academy",
      divisionHref: "/academy",
      theme: "academy",
      isStudienkolleg: false,
      isPflege: false,
      isComingSoon: false,
    };
  }

  if (key === "t_kurs" || key === "m_kurs" || key === "w_kurs" || key === "g_kurs") {
    const meta = LEVEL_META[key];
    return {
      levelKey: key,
      examLevel: key,
      flashcardKey: "studienkolleg",
      label: meta.label,
      cefrTag: "Studienkolleg",
      description: `${meta.description} (${meta.exams}).`,
      divisionId: "studienkolleg",
      divisionLabel: "Studienkolleg Hub",
      divisionHref: "/studienkolleg",
      theme: "studienkolleg",
      isStudienkolleg: true,
      isPflege: false,
      isComingSoon: true,
      stkTrack: key,
    };
  }

  if (key === "pflege" || key === "b1_b2" || key === "ausbildung_pflege") {
    const meta = LEVEL_META.ausbildung_pflege;
    return {
      levelKey: "ausbildung_pflege",
      examLevel: "ausbildung_pflege",
      flashcardKey: "pflege",
      label: "Pflege B1–B2",
      cefrTag: "Clinical German",
      description: `${meta.description} (${meta.exams}).`,
      divisionId: "fachsprache_medizin",
      divisionLabel: "Pflege & Medizin",
      divisionHref: "/pflege",
      theme: "pflege",
      isStudienkolleg: false,
      isPflege: true,
      isComingSoon: true,
    };
  }

  if (key === "ausbildung_it" || key === "ausbildung_hotelfach" || key === "ausbildung") {
    const meta = LEVEL_META[key];
    return {
      levelKey: key,
      examLevel: key,
      flashcardKey: "pflege",
      label: meta.label,
      cefrTag: meta.cefr,
      description: `${meta.description} (${meta.exams}).`,
      divisionId: "fachsprache_medizin",
      divisionLabel: "Pflege & Medizin",
      divisionHref: "/pflege",
      theme: "pflege",
      isStudienkolleg: false,
      isPflege: true,
      isComingSoon: true,
    };
  }

  return {
    levelKey: "a1",
    examLevel: "a1",
    flashcardKey: "a1",
    label: "A1",
    cefrTag: "Anfänger",
    description: LEVEL_META.a1.description,
    divisionId: "sprachakademie",
    divisionLabel: "Language Academy",
    divisionHref: "/academy",
    theme: "academy",
    isStudienkolleg: false,
    isPflege: false,
    isComingSoon: false,
  };
}

export function normalizeModuleSlug(rawModule: string): CoreModuleSlug {
  const m = (rawModule || "").toLowerCase().trim();
  if (m === "01-vocabulary" || m === "flashcards" || m === "vocabulary") {
    return "01-vocabulary";
  }
  if (m === "02-grammar" || m === "grammar") {
    return "02-grammar";
  }
  if (m === "03-hoeren-lesen" || m === "hoeren-lesen" || m === "audio") {
    return "03-hoeren-lesen";
  }
  if (m === "04-modelltests" || m === "practice" || m === "modelltests") {
    return "04-modelltests";
  }
  return "01-vocabulary";
}

export function cleanWorkbookTitle(title: string): string {
  return title.replace(/^[^\wÄÖÜäöüß0-9]+/, "").trim() || title;
}

export function filterWorkbooksForLevel(
  levelKey: string,
  workbooks: RoadmapWorkbookSummary[],
): RoadmapWorkbookSummary[] {
  const info = getLevelInfo(levelKey);

  return workbooks.filter((wb) => {
    const wbLvl = (wb.level || "").toLowerCase();
    const wbId = wb.id.toLowerCase();
    const wbTitle = wb.title.toLowerCase();
    const wbTrack = (wb.track || "").toLowerCase().replace("-", "_");

    if (info.isStudienkolleg) {
      if (wb.divisionId !== "studienkolleg") return false;
      const trackHyphen = info.levelKey.replace("_", "-");
      if (wbTrack === info.levelKey) return true;
      if (wbId.includes(info.levelKey) || wbId.includes(trackHyphen)) return true;
      if (wbTitle.includes(trackHyphen)) return true;
      if (
        (info.levelKey === "t_kurs" || info.levelKey === "m_kurs") &&
        (wbId.includes("m-und-t-kurs") ||
          wbId.includes("mathematik") ||
          wbId.includes("stk_aufnahme_deutsch") ||
          wbId.includes("stk-ctest") ||
          wbId.includes("stk-math"))
      ) {
        return true;
      }
      if (
        (info.levelKey === "w_kurs" || info.levelKey === "g_kurs") &&
        (wbId.includes("stk_aufnahme_deutsch") || wbId.includes("stk-ctest"))
      ) {
        return true;
      }
      return false;
    }

    if (info.isPflege) {
      return (
        wb.divisionId === "fachsprache_medizin" ||
        wbLvl.includes("pflege") ||
        wbId.includes("pflege") ||
        wbId.includes("fsp")
      );
    }

    // CEFR Language Academy (a1, a2, b1, b2)
    if (wb.divisionId === "studienkolleg") return false;
    if (wb.divisionId && wb.divisionId !== "sprachakademie") {
      // Allow B2 medical workbooks to stay in Pflege so Academy B2 remains crisp
      return false;
    }
    if (wbLvl.includes("kurs") || wbLvl.includes("pflege") || wbLvl.includes("stk")) {
      return false;
    }
    return (
      wbLvl === info.levelKey ||
      wbLvl.startsWith(info.levelKey) ||
      wbLvl.includes(info.levelKey)
    );
  });
}

export function classifyWorkbookModule(wb: RoadmapWorkbookSummary): CoreModuleSlug {
  const skill = (wb.skill || "").toLowerCase();
  const id = wb.id.toLowerCase();
  const title = wb.title.toLowerCase();

  if (id.includes("modelltest") || id.includes("aufnahme_deutsch") || title.includes("modelltest")) {
    return "04-modelltests";
  }
  if (
    skill === "hoeren" ||
    skill === "lesen" ||
    Boolean(wb.audioUrl) ||
    id.includes("hoeren") ||
    id.includes("lesen") ||
    title.includes("hören") ||
    title.includes("lesen")
  ) {
    return "03-hoeren-lesen";
  }
  return "02-grammar";
}

export function getSubdivisionsForLevel(
  levelSlug: string,
  workbooks: RoadmapWorkbookSummary[],
): {
  info: LevelHierarchyInfo;
  subdivisions: SubdivisionFolderItem[];
  dynamicChapters: SubdivisionTopicItem[];
} {
  const info = getLevelInfo(levelSlug);
  const levelWorkbooks = filterWorkbooksForLevel(info.levelKey, workbooks);

  const vocabCount =
    1 + levelWorkbooks.filter((w) => Array.isArray(w.flashcards) && w.flashcards.length > 0).length;
  const grammarWorkbooks = levelWorkbooks.filter((w) => classifyWorkbookModule(w) === "02-grammar");
  const labWorkbooks = levelWorkbooks.filter((w) => classifyWorkbookModule(w) === "03-hoeren-lesen");
  const testWorkbooks = levelWorkbooks.filter((w) => classifyWorkbookModule(w) === "04-modelltests");

  const grammarTitle = info.isStudienkolleg
    ? "02 · Syllabus, Formulas & C-Test Grammar"
    : info.isPflege
    ? "02 · Clinical Grammar & Documentation"
    : "02 · Grammar Pillars (122 Säulen)";

  const labTitle = info.isPflege
    ? "03 · Clinical Dialogues, Hören & ISBAR Lab"
    : "03 · Hören & Lesen Lab";

  const coreLabs = !info.isStudienkolleg && !info.isPflege ? getCoreLabsForLevel(info.levelKey) : [];
  const labCount = coreLabs.length > 0 ? coreLabs.length + labWorkbooks.length : 2 + labWorkbooks.length;

  const subdivisions: SubdivisionFolderItem[] = [
    {
      slug: "01-vocabulary",
      indexLabel: "SUBDIVISION 01 · VOCABULARY",
      title: "01 · Core Vocabulary & Flashcards",
      subtitle: `Active recall decks for ${info.label} with native de-DE studio pronunciation and Hindi/English memory anchors.`,
      badge: `${vocabCount} DECK${vocabCount === 1 ? "" : "S"}`,
      theme: "academy",
      href: `/academy/${info.levelKey}/01-vocabulary`,
      metaItems: ["Native de-DE Audio", "Spaced Recall"],
    },
    {
      slug: "02-grammar",
      indexLabel: "SUBDIVISION 02 · ARCHITECTURE",
      title: grammarTitle,
      subtitle: info.isStudienkolleg
        ? `Structured ${info.label} university syllabus, interactive formula calculators, and academic grammar dossiers.`
        : `Structured ${info.label} grammar dossiers, 122 Säulen foundations, and interactive chapter workbooks.`,
      badge: `${Math.max(1, grammarWorkbooks.length)} MODULE${grammarWorkbooks.length === 1 ? "" : "S"}`,
      theme: "grammar",
      href: `/academy/${info.levelKey}/02-grammar`,
      metaItems: info.isStudienkolleg ? ["Formula Engine", "Syllabus"] : ["122 Säulen", "PDF Dossiers"],
    },
    {
      slug: "03-hoeren-lesen",
      indexLabel: "SUBDIVISION 03 · AUDIO & READING",
      title: labTitle,
      subtitle: info.isPflege
        ? "Ward handover scripts, ISBAR structured clinical briefings, and hospital listening labs."
        : `Authentic ${info.label} studio listening tracks, reading passages, and comprehension answer sheets.`,
      badge: `${labCount} LABS`,
      theme: "audio",
      href: `/academy/${info.levelKey}/03-hoeren-lesen`,
      metaItems: ["128 kbps Studio MP3", "Comprehension"],
    },
    {
      slug: "04-modelltests",
      indexLabel: "SUBDIVISION 04 · EXAMINATION",
      title: "04 · Official Modelltests",
      subtitle: info.isStudienkolleg
        ? `Timed ${info.label} Aufnahmeprüfung & Feststellungsprüfung simulations across all 4 exam parts.`
        : `Full ${info.label} Goethe & telc timed simulations across Lesen, Hören, Schreiben, and Sprechen.`,
      badge: `${4 + testWorkbooks.length} TESTS`,
      theme: "exam",
      href: `/academy/${info.levelKey}/04-modelltests`,
      metaItems: ["Timed Mode", "AI Grading"],
    },
  ];

  const dynamicChapters: SubdivisionTopicItem[] = levelWorkbooks.map((wb, idx) => {
    const targetModule = classifyWorkbookModule(wb);
    const chapterTheme: SubdivisionTheme =
      targetModule === "03-hoeren-lesen"
        ? "audio"
        : targetModule === "04-modelltests"
        ? "exam"
        : info.theme;
    return {
      id: wb.id,
      indexLabel: `CHAPTER ${String(idx + 1).padStart(2, "0")} · WORKBOOK`,
      title: cleanWorkbookTitle(wb.title),
      subtitle: wb.subtitle || `${wb.pages} pages · ${wb.topics.slice(0, 3).join(" · ")}`,
      badge: `${wb.pages} PAGES`,
      theme: chapterTheme,
      href: `/academy/${info.levelKey}/${targetModule}/${encodeURIComponent(wb.id)}`,
      ctaLabel: "Open Chapter",
      metaItems: [
        wb.skill ? wb.skill.toUpperCase() : "DOSSIER",
        `${wb.questionCount} Tasks`,
      ],
      kind: "workbook",
      workbookId: wb.id,
    };
  });

  return { info, subdivisions, dynamicChapters };
}

export function getModuleMeta(
  levelInfo: LevelHierarchyInfo,
  moduleSlug: CoreModuleSlug,
): {
  title: string;
  eyebrow: string;
  subtitle: string;
  theme: SubdivisionTheme;
} {
  switch (moduleSlug) {
    case "01-vocabulary":
      return {
        eyebrow: `${levelInfo.label} · SUBDIVISION 01`,
        title: "01 · Core Vocabulary & Flashcards",
        subtitle: `Select a single flashcard deck below to open a focused active-recall workspace for ${levelInfo.label}.`,
        theme: "academy",
      };
    case "02-grammar":
      return {
        eyebrow: `${levelInfo.label} · SUBDIVISION 02`,
        title: levelInfo.isStudienkolleg
          ? "02 · Syllabus, Formulas & Grammar"
          : "02 · Grammar Pillars (122 Säulen)",
        subtitle: `Select one chapter or grammar dossier below to read and practice in isolation.`,
        theme: "grammar",
      };
    case "03-hoeren-lesen":
      return {
        eyebrow: `${levelInfo.label} · SUBDIVISION 03`,
        title: levelInfo.isPflege
          ? "03 · Clinical Dialogues, Hören & ISBAR Lab"
          : "03 · Hören & Lesen Lab",
        subtitle: `Select a listening or reading module below for focused audio and text comprehension training.`,
        theme: "audio",
      };
    case "04-modelltests":
      return {
        eyebrow: `${levelInfo.label} · SUBDIVISION 04`,
        title: "04 · Official Modelltests",
        subtitle: `Launch a single timed examination section or past-paper dossier for ${levelInfo.label}.`,
        theme: "exam",
      };
  }
}

export function getTopicsForSubdivision(
  levelSlug: string,
  rawModuleSlug: string,
  workbooks: RoadmapWorkbookSummary[],
): {
  info: LevelHierarchyInfo;
  moduleSlug: CoreModuleSlug;
  moduleMeta: ReturnType<typeof getModuleMeta>;
  topics: SubdivisionTopicItem[];
} {
  const info = getLevelInfo(levelSlug);
  const moduleSlug = normalizeModuleSlug(rawModuleSlug);
  const moduleMeta = getModuleMeta(info, moduleSlug);
  const levelWorkbooks = filterWorkbooksForLevel(info.levelKey, workbooks);
  const topics: SubdivisionTopicItem[] = [];

  if (moduleSlug === "01-vocabulary") {
    topics.push({
      id: "core-deck",
      indexLabel: "DECK 01 · CORE DECK",
      title: `${info.label} Core Smart Flashcards`,
      subtitle: `High-frequency ${info.label} vocabulary with native de-DE audio synthesis, phonetic transcription, and Hindi/English context.`,
      badge: "CORE DECK",
      theme: info.theme,
      href: `/academy/${info.levelKey}/01-vocabulary/core-deck`,
      ctaLabel: "Open Flashcards",
      metaItems: ["Audio Playback", "Mastery Sync"],
      kind: "flashcard-deck",
    });

    if (!info.isStudienkolleg && !info.isPflege) {
      const coreLabs = getCoreLabsForLevel(info.levelKey);
      coreLabs.forEach((lab) => {
        topics.push({
          id: `vocab-${lab.id}`,
          indexLabel: `DECK ${String(lab.index + 1).padStart(2, "0")} · WORTSCHATZ`,
          title: `${lab.title} — Wortschatz`,
          subtitle: `Fokussierte Karteikarten mit Beispielsätzen, Hindi/Englisch-Bedeutung & Aussprache für ${lab.title}.`,
          badge: "WORTSCHATZ",
          theme: "academy",
          href: `/academy/${info.levelKey}/01-vocabulary/${encodeURIComponent(`vocab-${lab.id}`)}`,
          ctaLabel: "Open Lab Vocab",
          metaItems: [lab.topics.slice(0, 2).join(" · "), "Audio Trainer"],
          kind: "workbook",
          workbookId: lab.id,
        });
      });
    }

    levelWorkbooks
      .filter((wb) => Array.isArray(wb.flashcards) && wb.flashcards.length > 0)
      .forEach((wb, i) => {
        const fcId = `wb-fc-${wb.id}`;
        topics.push({
          id: fcId,
          indexLabel: `DECK ${String(i + 12).padStart(2, "0")} · FACTORY DECK`,
          title: cleanWorkbookTitle(wb.title),
          subtitle: wb.subtitle || `Curated ${wb.flashcards?.length || 0}-card vocabulary deck.`,
          badge: `${wb.flashcards?.length || 0} CARDS`,
          theme: "academy",
          href: `/academy/${info.levelKey}/01-vocabulary/${encodeURIComponent(fcId)}`,
          ctaLabel: "Open Flashcards",
          metaItems: ["Factory JSON", "de-DE Audio"],
          kind: "flashcard-deck",
          workbookId: wb.id,
        });
      });
  } else if (moduleSlug === "02-grammar") {
    if (info.isStudienkolleg) {
      topics.push(
        {
          id: "stk-workspace",
          indexLabel: "WORKSPACE 01 · FORMULAS",
          title: `${info.label} Formula Calculator Engine`,
          subtitle: `Interactive mathematics, physics, chemistry & BWL calculation engine for ${info.label}.`,
          badge: "COMING SOON",
          theme: "studienkolleg",
          href: `/academy/${info.levelKey}/02-grammar/stk-workspace`,
          ctaLabel: "Preview Formula Engine",
          metaItems: ["Formula Engine", "Instant Solve"],
          kind: "stk-tool",
        },
        {
          id: "stk-syllabus",
          indexLabel: "WORKSPACE 02 · SYLLABUS & PAPERS",
          title: `${info.label} 2-Semester Syllabus & Past-Paper Archive`,
          subtitle: `Aufnahmeprüfung C-Tests, university past papers, and 2-semester roadmap for ${info.label}.`,
          badge: "COMING SOON",
          theme: "studienkolleg",
          href: `/academy/${info.levelKey}/02-grammar/stk-syllabus`,
          ctaLabel: "Preview Syllabus",
          metaItems: ["2-Semester Map", "Past Papers"],
          kind: "stk-tool",
        },
      );
    }

    if (!info.isStudienkolleg && !info.isPflege) {
      const coreLabs = getCoreLabsForLevel(info.levelKey);
      coreLabs.forEach((lab) => {
        topics.push({
          id: `grammar-${lab.id}`,
          indexLabel: `SÄULE ${String(lab.index).padStart(2, "0")} · GRAMMATIK`,
          title: `${lab.title} — Grammatik & Struktur`,
          subtitle: `122 Säulen Grammatikregeln, Satzbau, Signalwörter & Goethe/telc Prüfungsaufgaben.`,
          badge: "122 SÄULEN",
          theme: "grammar",
          href: `/academy/${info.levelKey}/02-grammar/${encodeURIComponent(`grammar-${lab.id}`)}`,
          ctaLabel: "Open Grammar Lab",
          metaItems: [lab.topics.slice(0, 2).join(" · "), "Aufgaben & Regeln"],
          kind: "workbook",
          workbookId: lab.id,
        });
      });
    }

    const grammarWorkbooks = levelWorkbooks.filter(
      (wb) => classifyWorkbookModule(wb) === "02-grammar",
    );
    grammarWorkbooks.forEach((wb, i) => {
      topics.push({
        id: wb.id,
        indexLabel: `CHAPTER ${String(i + 1).padStart(2, "0")} · GRAMMAR`,
        title: cleanWorkbookTitle(wb.title),
        subtitle: wb.subtitle || `${wb.pages} pages · ${wb.topics.slice(0, 3).join(" · ")}`,
        badge: `${wb.pages} PAGES`,
        theme: "grammar",
        href: `/academy/${info.levelKey}/02-grammar/${encodeURIComponent(wb.id)}`,
        ctaLabel: "Open Workbook",
        metaItems: [`${wb.questionCount} Exercises`, "Protected PDF"],
        kind: "workbook",
        workbookId: wb.id,
      });
    });

    if (grammarWorkbooks.length === 0 && !info.isStudienkolleg && info.isPflege) {
      topics.push({
        id: "exam-lesen",
        indexLabel: "LAB 01 · SPRACHBAUSTEINE",
        title: `${info.label} Lesen & Sprachbausteine Grammar Lab`,
        subtitle: `Interactive cloze grammar drills and reading structure training for ${info.label}.`,
        badge: "COMING SOON",
        theme: "grammar",
        href: `/academy/${info.levelKey}/02-grammar/exam-lesen`,
        ctaLabel: "Open Grammar Lab",
        metaItems: ["Sprachbausteine", "Instant Key"],
        kind: "exam-simulator",
        examSection: "lesen",
      });
    }
  } else if (moduleSlug === "03-hoeren-lesen") {
    if (info.isPflege) {
      topics.push(
        {
          id: "pflege-clinical-hub",
          indexLabel: "CLINICAL LAB 01 · ISBAR",
          title: "ISBAR Shift Handover Simulator",
          subtitle:
            "Interactive German clinical shift-handover trainer (Identify, Situation, Background, Assessment, Recommendation).",
          badge: "COMING SOON",
          theme: "pflege",
          href: `/academy/${info.levelKey}/03-hoeren-lesen/pflege-clinical-hub`,
          ctaLabel: "Preview ISBAR Lab",
          metaItems: ["ISBAR Protocol", "Shift Handover"],
          kind: "pflege-tool",
        },
        {
          id: "pflege-dialogues",
          indexLabel: "CLINICAL LAB 02 · DIALOGUES",
          title: "Clinical Ward Dialogues & Redemittel",
          subtitle:
            "Hospital patient intake dialogues, vitals briefing, and standardized FSP clinical Redemittel.",
          badge: "COMING SOON",
          theme: "pflege",
          href: `/academy/${info.levelKey}/03-hoeren-lesen/pflege-dialogues`,
          ctaLabel: "Preview Dialogues",
          metaItems: ["Ward Scenarios", "Clinical Redemittel"],
          kind: "pflege-tool",
        },
      );
    } else if (!info.isStudienkolleg) {
      // 10 Comprehensive Core Audio & Reading Labs for CEFR Language Academy (A1–B2)
      const coreLabs = getCoreLabsForLevel(info.levelKey);
      for (const lab of coreLabs) {
        topics.push({
          id: lab.id,
          indexLabel: lab.indexLabel,
          title: lab.title,
          subtitle: lab.subtitle,
          badge: lab.badge,
          theme: "audio",
          href: `/academy/${info.levelKey}/03-hoeren-lesen/${encodeURIComponent(lab.id)}`,
          ctaLabel: "Open Lab",
          metaItems: [
            `${lab.questions.length} Tasks`,
            lab.audioUrl ? "128 kbps MP3" : "Reading Passages",
          ],
          kind: "workbook",
          workbookId: lab.id,
        });
      }
    }

    const labWorkbooks = levelWorkbooks.filter(
      (wb) => classifyWorkbookModule(wb) === "03-hoeren-lesen",
    );
    labWorkbooks.forEach((wb) => {
      if (topics.some((t) => t.id === wb.id)) return;
      topics.push({
        id: wb.id,
        indexLabel: `LAB ${String(topics.length + 1).padStart(2, "0")} · ${(wb.skill || "DOSSIER").toUpperCase()}`,
        title: cleanWorkbookTitle(wb.title),
        subtitle: wb.subtitle || `${wb.pages} pages · ${wb.topics.slice(0, 3).join(" · ")}`,
        badge: wb.audioUrl ? "AUDIO + PDF" : `${wb.pages} PAGES`,
        theme: "audio",
        href: `/academy/${info.levelKey}/03-hoeren-lesen/${encodeURIComponent(wb.id)}`,
        ctaLabel: "Open Lab",
        metaItems: [`${wb.questionCount} Tasks`, wb.audioUrl ? "128 kbps MP3" : "Reading"],
        kind: "workbook",
        workbookId: wb.id,
      });
    });

    topics.push(
      {
        id: "lab-hoeren",
        indexLabel: "SIMULATOR · HÖREN",
        title: `${info.label} Studio Hören Lab`,
        subtitle: `Train listening comprehension with locked 1x/2x exam playback rules for ${info.label}.`,
        badge: "STUDIO AUDIO",
        theme: "audio",
        href: `/academy/${info.levelKey}/03-hoeren-lesen/lab-hoeren`,
        ctaLabel: "Launch Hören",
        metaItems: ["Native Audio", "Timed"],
        kind: "exam-simulator",
        examSection: "hoeren",
      },
      {
        id: "lab-lesen",
        indexLabel: "SIMULATOR · LESEN",
        title: `${info.label} Lesen & Comprehension Lab`,
        subtitle: `Train academic and real-world reading comprehension passages under timed ${info.label} conditions.`,
        badge: "READING LAB",
        theme: "audio",
        href: `/academy/${info.levelKey}/03-hoeren-lesen/lab-lesen`,
        ctaLabel: "Launch Lesen",
        metaItems: ["Reading Passages", "Auto-Scored"],
        kind: "exam-simulator",
        examSection: "lesen",
      },
    );
  } else if (moduleSlug === "04-modelltests") {
    const examParts: {
      id: string;
      section: SectionKey;
      indexLabel: string;
      title: string;
      subtitle: string;
      badge: string;
    }[] = [
      {
        id: "exam-lesen",
        section: "lesen",
        indexLabel: "PART 01 · READING",
        title: "Lesen & Sprachbausteine",
        subtitle: `Timed ${info.label} reading comprehension and structured grammar gap tests.`,
        badge: "MODUL 01",
      },
      {
        id: "exam-hoeren",
        section: "hoeren",
        indexLabel: "PART 02 · LISTENING",
        title: "Hören (Audio Simulation)",
        subtitle: `Authentic ${info.label} listening dialogues with native studio audio playback.`,
        badge: "MODUL 02",
      },
      {
        id: "exam-schreiben",
        section: "schreiben",
        indexLabel: "PART 03 · WRITING",
        title: "Schreiben (Guided & AI Evaluation)",
        subtitle: `Official ${info.label} formal letters, essays, and structured written tasks.`,
        badge: "MODUL 03",
      },
      {
        id: "exam-sprechen",
        section: "sprechen",
        indexLabel: "PART 04 · SPEAKING",
        title: "Sprechen (Oral Exam Simulator)",
        subtitle: `Oral examination prompts, examiner audio, and structured speaking practice for ${info.label}.`,
        badge: "MODUL 04",
      },
    ];

    for (const part of examParts) {
      topics.push({
        id: part.id,
        indexLabel: part.indexLabel,
        title: part.title,
        subtitle: part.subtitle,
        badge: part.badge,
        theme: part.section === "hoeren" ? "audio" : "exam",
        href: `/academy/${info.levelKey}/04-modelltests/${part.id}`,
        ctaLabel: `Open ${part.title.split(" ")[0]}`,
        metaItems: [info.label, "Exam Standard"],
        kind: "exam-simulator",
        examSection: part.section,
      });
    }

    const testWorkbooks = levelWorkbooks.filter(
      (wb) => classifyWorkbookModule(wb) === "04-modelltests",
    );
    testWorkbooks.forEach((wb, i) => {
      topics.push({
        id: wb.id,
        indexLabel: `DOSSIER ${String(i + 1).padStart(2, "0")} · PAST PAPER`,
        title: cleanWorkbookTitle(wb.title),
        subtitle: wb.subtitle || `${wb.pages} pages · Authentic past-paper workbook.`,
        badge: `${wb.pages} PAGES`,
        theme: "exam",
        href: `/academy/${info.levelKey}/04-modelltests/${encodeURIComponent(wb.id)}`,
        ctaLabel: "Open Paper",
        metaItems: [`${wb.questionCount} Tasks`, "Musterlösung"],
        kind: "workbook",
        workbookId: wb.id,
      });
    });
  }

  return { info, moduleSlug, moduleMeta, topics };
}
