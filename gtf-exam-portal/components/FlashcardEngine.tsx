"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import {
  AlertCircle,
  ArrowRight,
  Award,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Eye,
  EyeOff,
  Layers,
  RotateCcw,
  RotateCw,
  Shuffle,
  Sparkles,
  Volume2,
} from "lucide-react";
import type { FlashcardDeckItem } from "@/lib/types";
import {
  A1_GREETINGS_BASICS_DECK,
  A2_OFFICE_VOCABULARY_DECK,
  B1_JOB_INTERVIEW_PHRASES_DECK,
  B2_ACADEMIC_CONNECTORS_DECK,
  PFLEGE_STATION_HANDOVER_DECK,
  STUDIENKOLLEG_SCIENTIFIC_DECK,
  CEFR_LEVEL_FLASHCARD_POOLS,
} from "@/lib/flashcard-decks-data";

export type { FlashcardDeckItem };
export {
  A1_GREETINGS_BASICS_DECK,
  A2_OFFICE_VOCABULARY_DECK,
  B1_JOB_INTERVIEW_PHRASES_DECK,
  B2_ACADEMIC_CONNECTORS_DECK,
  PFLEGE_STATION_HANDOVER_DECK,
  STUDIENKOLLEG_SCIENTIFIC_DECK,
};

export interface DynamicFlashcardDeck {
  id: string;
  title: string;
  cards: FlashcardDeckItem[];
}

export const TRACK_FLASHCARD_DECKS: Record<
  string,
  { title: string; deck: FlashcardDeckItem[] }
> = {
  a1: {
    title: "A1 Greetings, Housing & Berlin Basics",
    deck: A1_GREETINGS_BASICS_DECK,
  },
  a2: {
    title: "A2 Office, Everyday & Perfekt Vocabulary",
    deck: A2_OFFICE_VOCABULARY_DECK,
  },
  b1: {
    title: "B1 Job Interview, Connectors & Grammar Phrases",
    deck: B1_JOB_INTERVIEW_PHRASES_DECK,
  },
  b2: {
    title: "B2 Academic Connectors, Nominal Style & § 81a",
    deck: B2_ACADEMIC_CONNECTORS_DECK,
  },
  pflege: {
    title: "Pflege Station Handover (ISBAR) & Clinical Terms",
    deck: PFLEGE_STATION_HANDOVER_DECK,
  },
  fachsprache_medizin: {
    title: "Fachsprache Medizin & Nursing Ward Handover",
    deck: PFLEGE_STATION_HANDOVER_DECK,
  },
  studienkolleg: {
    title: "Studienkolleg Scientific & Aufnahmeprüfung Terms",
    deck: STUDIENKOLLEG_SCIENTIFIC_DECK,
  },
};

const EMPTY_DYNAMIC_DECKS: DynamicFlashcardDeck[] = [];
const MASTERED_STORAGE_KEY = "gtf_mastered_cards_v1";

function detectTrackPoolKey(title: string, trackHint?: string): string {
  const hint = (trackHint || title || "").toLowerCase();
  if (hint.includes("pflege") || hint.includes("medizin") || hint.includes("klinik") || hint.includes("fachsprache")) {
    return "pflege";
  }
  if (hint.includes("studienkolleg") || hint.includes("stk") || hint.includes("aufnahme")) {
    return "studienkolleg";
  }
  if (hint.includes("b2") || hint.includes("nominal") || hint.includes("passiversatz")) {
    return "b2";
  }
  if (hint.includes("b1") || hint.includes("konjunktiv") || hint.includes("relativ")) {
    return "b1";
  }
  if (hint.includes("a2") || hint.includes("perfekt") || hint.includes("wechsel")) {
    return "a2";
  }
  return "a1";
}

function normalizeTrilingualCard(card: FlashcardDeckItem): FlashcardDeckItem {
  const englishMain = (card.english || card.backText || card.german || "").trim();
  const rawHindi = (card.hindi || "").trim();
  const startsWithRoman = /^[A-Za-z0-9'"(/\-]/.test(rawHindi);
  const formattedHindi = rawHindi
    ? startsWithRoman
      ? rawHindi
      : `Hindi Note: ${englishMain} (${rawHindi})`
    : `Meaning: ${englishMain} (अर्थ देखें)`;

  const exampleDe = (card.exampleDe || "").trim();
  const exampleTranslation =
    (card.exampleTranslation || "").trim() ||
    (exampleDe ? `Example context for "${card.german}": ${englishMain}` : "");

  return {
    ...card,
    english: englishMain,
    backText: card.backText || englishMain,
    frontText: card.frontText || card.german,
    hindi: formattedHindi,
    exampleDe,
    exampleTranslation,
  };
}

/**
 * Guarantees every deck has 25-30 unique trilingual cards without duplicates across shuffles.
 */
export function ensureFullTrilingualDeck(
  rawCards: FlashcardDeckItem[],
  trackHint?: string,
  titleHint?: string,
): FlashcardDeckItem[] {
  const result: FlashcardDeckItem[] = [];
  const seenIds = new Set<string>();
  const seenTerms = new Set<string>();

  const pushCard = (c: FlashcardDeckItem | null | undefined) => {
    if (!c || !c.id) return;
    const normTerm = (c.german || c.frontText || "").trim().toLowerCase().replace(/\s+/g, " ");
    if (seenIds.has(c.id) || (normTerm && seenTerms.has(normTerm))) return;
    seenIds.add(c.id);
    if (normTerm) seenTerms.add(normTerm);
    result.push(normalizeTrilingualCard(c));
  };

  for (const c of rawCards || []) {
    pushCard(c);
    if (result.length >= 30) break;
  }

  if (result.length < 25) {
    const poolKey = detectTrackPoolKey(titleHint || "", trackHint);
    const pool = CEFR_LEVEL_FLASHCARD_POOLS[poolKey] || A1_GREETINGS_BASICS_DECK;
    for (const c of pool) {
      pushCard(c);
      if (result.length >= 30) break;
    }
  }

  return result;
}

/**
 * True Fisher-Yates shuffle with anti-repeat guard so recently seen cards
 * do not immediately appear at the top of a fresh shuffle.
 */
function fisherYatesShuffle(
  items: FlashcardDeckItem[],
  recentIds: string[],
): FlashcardDeckItem[] {
  const arr = [...items];
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    const tmp = arr[i];
    arr[i] = arr[j];
    arr[j] = tmp;
  }

  if (arr.length > 4 && recentIds.length > 0) {
    const recentSet = new Set(recentIds.slice(-3));
    const midStart = Math.floor(arr.length / 2);
    for (const topPos of [0, 1]) {
      if (recentSet.has(arr[topPos].id)) {
        const swapIdx = arr.findIndex(
          (candidate, idx) => idx >= midStart && !recentSet.has(candidate.id),
        );
        if (swapIdx !== -1) {
          const tmp = arr[topPos];
          arr[topPos] = arr[swapIdx];
          arr[swapIdx] = tmp;
        }
      }
    }
  }

  return arr;
}

function readLocalMasteredIds(): Record<string, boolean> {
  if (typeof window === "undefined") return {};
  try {
    const raw = window.localStorage.getItem(MASTERED_STORAGE_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw);
    return parsed && typeof parsed === "object" ? (parsed as Record<string, boolean>) : {};
  } catch {
    return {};
  }
}

function writeLocalMasteredIds(map: Record<string, boolean>): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(MASTERED_STORAGE_KEY, JSON.stringify(map));
  } catch {
    // Ignore storage quota errors
  }
}

interface FlashcardEngineProps {
  title?: string;
  deck?: FlashcardDeckItem[];
  dynamicDecks?: DynamicFlashcardDeck[];
  masteredCardIds?: string[];
  onToggleMasteredCard?: (cardId: string, masteredCardIds: string[]) => void;
  onCompleteDeck?: () => void;
  trackHint?: string;
  nextTopicHref?: string;
  nextTopicLabel?: string;
}

function FlashcardEngineInner({
  title = "A1 Greetings & Basics — Interactive Flashcards",
  deck = A1_GREETINGS_BASICS_DECK,
  dynamicDecks = EMPTY_DYNAMIC_DECKS,
  masteredCardIds,
  onToggleMasteredCard,
  onCompleteDeck,
  trackHint,
  nextTopicHref,
  nextTopicLabel = "Load Next Topic Deck",
}: FlashcardEngineProps) {
  const router = useRouter();
  const [isMounted, setIsMounted] = useState(false);
  useEffect(() => {
    setIsMounted(true);
  }, []);

  const resolvedTrackKey = useMemo(
    () => detectTrackPoolKey(title, trackHint),
    [title, trackHint],
  );

  const safeInitialDeck = useMemo(
    () => ensureFullTrilingualDeck(deck || [], trackHint, title),
    [deck, trackHint, title],
  );

  const validDynamicDecks = useMemo(
    () =>
      Array.isArray(dynamicDecks)
        ? dynamicDecks
            .filter((d) => d && Array.isArray(d.cards) && d.cards.length > 0)
            .map((d) => ({
              ...d,
              cards: ensureFullTrilingualDeck(d.cards, trackHint, d.title),
            }))
        : EMPTY_DYNAMIC_DECKS,
    [dynamicDecks, trackHint],
  );

  const deckOptions = useMemo(
    () => [
      { id: "core", title: title || "Core Vocabulary Deck", cards: safeInitialDeck },
      ...validDynamicDecks,
    ],
    [title, safeInitialDeck, validDynamicDecks],
  );

  const [selectedDeckId, setSelectedDeckId] = useState<string>("core");
  const [shuffledOrder, setShuffledOrder] = useState<FlashcardDeckItem[] | null>(null);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isFlipped, setIsFlipped] = useState(false);
  const [hideMastered, setHideMastered] = useState(true);
  const [masteredIds, setMasteredIds] = useState<Record<string, boolean>>({});
  const [speaking, setSpeaking] = useState(false);
  const [ttsError, setTtsError] = useState<string | null>(null);

  const audioRef = useRef<HTMLAudioElement | null>(null);
  const utteranceRef = useRef<SpeechSynthesisUtterance | null>(null);
  const ttsWatchdogRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const recentCardIdsRef = useRef<string[]>([]);

  const activeOption = useMemo(
    () =>
      deckOptions.find((d) => d.id === selectedDeckId) ||
      deckOptions[0] || { id: "core", title: "Core Vocabulary Deck", cards: safeInitialDeck },
    [deckOptions, selectedDeckId, safeInitialDeck],
  );

  const allDeckCards = useMemo(() => {
    const base =
      Array.isArray(activeOption?.cards) && activeOption.cards.length > 0
        ? activeOption.cards
        : safeInitialDeck;
    return base;
  }, [activeOption, safeInitialDeck]);

  const orderedDeckCards = useMemo(
    () => shuffledOrder || allDeckCards,
    [shuffledOrder, allDeckCards],
  );

  // Active Study Queue filters out mastered cards automatically when hideMastered is ON
  const activeQueue = useMemo(() => {
    if (!hideMastered) return orderedDeckCards;
    return orderedDeckCards.filter((c) => c && !masteredIds[c.id]);
  }, [orderedDeckCards, hideMastered, masteredIds]);

  // Hydrate mastered IDs from localStorage + external Firestore UserProgress
  useEffect(() => {
    const localMap = readLocalMasteredIds();
    const merged: Record<string, boolean> = { ...localMap };
    if (Array.isArray(masteredCardIds)) {
      for (const id of masteredCardIds) {
        if (id) merged[id] = true;
      }
    }
    setMasteredIds(merged);
  }, [masteredCardIds]);

  // Reset shuffle order and index ONLY when deck selection/title actually changes
  const activeDeckIdentity = `${title}:::${selectedDeckId}`;
  const lastDeckIdentityRef = useRef<string>(activeDeckIdentity);

  useEffect(() => {
    if (lastDeckIdentityRef.current !== activeDeckIdentity) {
      lastDeckIdentityRef.current = activeDeckIdentity;
      setShuffledOrder(null);
      setCurrentIndex(0);
      setIsFlipped(false);
      setTtsError(null);
      recentCardIdsRef.current = [];
    }
  }, [activeDeckIdentity]);

  const safeIndex = Math.min(currentIndex, Math.max(0, activeQueue.length - 1));
  const currentCard = activeQueue[safeIndex] || null;

  // Record recently viewed card IDs so next shuffle avoids repeating them first
  useEffect(() => {
    if (!currentCard?.id) return;
    const prev = recentCardIdsRef.current.filter((id) => id !== currentCard.id);
    recentCardIdsRef.current = [...prev, currentCard.id].slice(-4);
  }, [currentCard?.id]);

  // Stop audio + watchdog when the card/deck changes or unmounts
  useEffect(() => {
    return () => {
      if (ttsWatchdogRef.current) clearTimeout(ttsWatchdogRef.current);
      if (utteranceRef.current && typeof window !== "undefined" && "speechSynthesis" in window) {
        try {
          window.speechSynthesis.cancel();
        } catch {}
        utteranceRef.current = null;
      }
      try {
        if (audioRef.current) {
          audioRef.current.pause();
          audioRef.current.currentTime = 0;
        }
      } catch {}
      setSpeaking(false);
    };
  }, [safeIndex, selectedDeckId]);

  // Pre-warm speechSynthesis voices on iOS/iPadOS Safari & Chrome
  useEffect(() => {
    if (typeof window === "undefined" || !("speechSynthesis" in window)) return;
    const synth = window.speechSynthesis;
    const loadVoices = () => {
      try {
        synth.getVoices();
      } catch {}
    };
    loadVoices();
    if (typeof synth.addEventListener === "function") {
      synth.addEventListener("voiceschanged", loadVoices);
      return () => synth.removeEventListener("voiceschanged", loadVoices);
    }
    return undefined;
  }, []);

  const masteredCount = useMemo(
    () => allDeckCards.filter((c) => c && Boolean(masteredIds[c.id])).length,
    [allDeckCards, masteredIds],
  );
  const unmasteredCount = Math.max(0, allDeckCards.length - masteredCount);
  const progressPct = Math.round(
    (masteredCount / Math.max(1, allDeckCards.length)) * 100,
  );
  const isAllMastered = allDeckCards.length > 0 && masteredCount >= allDeckCards.length;

  if (!isMounted) {
    return null;
  }

  const handleFlip = (e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    setIsFlipped((prev) => !prev);
  };

  const handleNext = (e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    setIsFlipped(false);
    const total = activeQueue.length;
    if (total > 0) {
      setCurrentIndex((prev) => (prev + 1) % total);
    }
  };

  const handlePrev = (e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    setIsFlipped(false);
    const total = activeQueue.length;
    if (total > 0) {
      setCurrentIndex((prev) => (prev - 1 + total) % total);
    }
  };

  const handleToggleMastered = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!currentCard) return;

    const nextState = !masteredIds[currentCard.id];
    const updated = { ...masteredIds, [currentCard.id]: nextState };
    setMasteredIds(updated);
    writeLocalMasteredIds(updated);

    const activeAllIds = Object.keys(updated).filter((id) => updated[id]);
    onToggleMasteredCard?.(currentCard.id, activeAllIds);

    const newMasteredCount = allDeckCards.filter((c) => Boolean(updated[c.id])).length;
    if (nextState && newMasteredCount === allDeckCards.length && onCompleteDeck) {
      onCompleteDeck();
    }

    setIsFlipped(false);
    if (nextState && hideMastered) {
      // Removing the current item from activeQueue leaves the next item at `safeIndex`
      const nextQueueLen = activeQueue.length - 1;
      if (nextQueueLen <= 0) {
        setCurrentIndex(0);
      } else if (safeIndex >= nextQueueLen) {
        setCurrentIndex(0);
      }
    } else if (nextState && !hideMastered && safeIndex < activeQueue.length - 1) {
      setCurrentIndex(safeIndex + 1);
    }
  };

  const handleShuffle = (e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    const freshOrder = fisherYatesShuffle(allDeckCards, recentCardIdsRef.current);
    setShuffledOrder(freshOrder);
    setCurrentIndex(0);
    setIsFlipped(false);
  };

  const handleResetDeck = (e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    const updated = { ...masteredIds };
    for (const c of allDeckCards) {
      if (c?.id) delete updated[c.id];
    }
    setMasteredIds(updated);
    writeLocalMasteredIds(updated);
    onToggleMasteredCard?.(
      allDeckCards[0]?.id || "reset",
      Object.keys(updated).filter((id) => updated[id]),
    );
    const freshOrder = fisherYatesShuffle(allDeckCards, recentCardIdsRef.current);
    setShuffledOrder(freshOrder);
    setHideMastered(true);
    setCurrentIndex(0);
    setIsFlipped(false);
  };

  const handleLoadNextTopic = (e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    if (deckOptions.length > 1) {
      const currOptIdx = deckOptions.findIndex((o) => o.id === activeOption.id);
      const nextOpt = deckOptions[(currOptIdx + 1) % deckOptions.length];
      if (nextOpt && nextOpt.id !== activeOption.id) {
        setSelectedDeckId(nextOpt.id);
        setCurrentIndex(0);
        setIsFlipped(false);
        return;
      }
    }
    const fallbackHref =
      nextTopicHref || `/academy/${resolvedTrackKey === "fachsprache_medizin" ? "pflege" : resolvedTrackKey}/01-vocabulary`;
    router.push(fallbackHref);
  };

  // Browser Web-Speech Synthesis fallback (SpeechSynthesisUtterance)
  const speakWithBrowserTts = (text: string) => {
    if (!text) {
      setSpeaking(false);
      return;
    }
    if (
      typeof window !== "undefined" &&
      "speechSynthesis" in window &&
      typeof SpeechSynthesisUtterance !== "undefined"
    ) {
      try {
        const synth = window.speechSynthesis;
        if (ttsWatchdogRef.current) clearTimeout(ttsWatchdogRef.current);
        if (synth.speaking || synth.pending) {
          synth.cancel();
        }
        synth.resume();
        setTtsError(null);

        const utterance = new SpeechSynthesisUtterance(text);
        utterance.lang = "de-DE";
        utterance.rate = 0.9;
        utterance.pitch = 1;
        utterance.volume = 1;

        try {
          const norm = (l: string) => l.replace("_", "-").toLowerCase();
          const voices = synth.getVoices();
          const deVoice =
            voices.find((v) => norm(v.lang) === "de-de" && v.localService) ||
            voices.find((v) => norm(v.lang) === "de-de") ||
            voices.find((v) => norm(v.lang).startsWith("de"));
          if (deVoice) utterance.voice = deVoice;
        } catch {}

        utterance.onstart = () => {
          if (ttsWatchdogRef.current) clearTimeout(ttsWatchdogRef.current);
          setSpeaking(true);
        };

        utterance.onend = () => {
          setSpeaking(false);
          utteranceRef.current = null;
        };

        utterance.onerror = (ev) => {
          setSpeaking(false);
          utteranceRef.current = null;
          if (ev.error !== "interrupted" && ev.error !== "canceled") {
            setTtsError("Audio playback error on this device.");
          }
        };

        utteranceRef.current = utterance;
        synth.speak(utterance);
        setSpeaking(true);

        ttsWatchdogRef.current = setTimeout(() => {
          synth.cancel();
          utteranceRef.current = null;
          setSpeaking(false);
        }, 5000);

        return;
      } catch (err) {
        console.warn("[FlashcardEngine] speechSynthesis.speak failed:", err);
      }
    }

    setSpeaking(false);
    setTtsError("Audio playback is not supported on this browser.");
  };

  // Bulletproof handleListen: Real MP3 Audio -> Native Edge Audio Stream -> Web-Speech Fallback
  const handleListen = (e?: React.MouseEvent, customText?: string) => {
    if (e) e.stopPropagation();
    if (!isMounted || !currentCard) return;

    setTtsError(null);
    const spokenText = (
      customText ||
      currentCard.frontText ||
      currentCard.german ||
      ""
    ).trim();
    if (!spokenText) return;

    const audioUrl =
      !customText && currentCard.audioUrl?.trim()
        ? currentCard.audioUrl.trim()
        : `/api/tts?text=${encodeURIComponent(spokenText)}`;

    const el = audioRef.current;
    if (el) {
      try {
        setSpeaking(true);
        el.pause();
        el.currentTime = 0;
        el.src = audioUrl;
        const playPromise = el.play();
        if (playPromise !== undefined) {
          playPromise
            .then(() => {
              setTtsError(null);
            })
            .catch(() => {
              speakWithBrowserTts(spokenText);
            });
        }
      } catch {
        speakWithBrowserTts(spokenText);
      }
    } else {
      speakWithBrowserTts(spokenText);
    }
  };

  const cardKey = currentCard?.id || `card-${safeIndex}`;
  const isMastered = currentCard ? Boolean(masteredIds[currentCard.id]) : false;

  return (
    <div
      key={`fc-root-${activeOption?.id || "core"}`}
      className="light-study rounded-2xl border border-slate-200 bg-white p-5 sm:p-8 space-y-5 text-slate-900 shadow-sm relative z-10 pointer-events-auto"
    >
      <audio
        ref={audioRef}
        playsInline
        preload="none"
        className="hidden"
        onPlay={() => setSpeaking(true)}
        onPause={() => setSpeaking(false)}
        onEnded={() => setSpeaking(false)}
        onError={() => {
          setSpeaking(false);
          const fallbackText = (
            currentCard?.frontText ||
            currentCard?.german ||
            ""
          ).trim();
          if (fallbackText) speakWithBrowserTts(fallbackText);
        }}
      />

      {/* Header & Top Action Bar */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <span
              key="fc-badge-interactive"
              className="inline-flex items-center gap-1.5 rounded-full border border-slate-200 bg-slate-100 px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.18em] text-slate-700"
            >
              <Sparkles className="h-3 w-3 text-slate-600" />
              <span>{`Trilingual Study Deck · ${allDeckCards.length} Unique Cards`}</span>
            </span>
            {validDynamicDecks.length > 0 && (
              <span
                key="fc-badge-dynamic"
                className="inline-flex items-center gap-1 rounded-full border border-slate-200 bg-slate-100 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.14em] text-slate-600"
              >
                <Layers className="h-3 w-3" />
                <span>{`+${validDynamicDecks.length} Workbook Deck${validDynamicDecks.length > 1 ? "s" : ""}`}</span>
              </span>
            )}
          </div>
          <h4 className="mt-2 text-lg sm:text-xl font-semibold tracking-tight text-slate-900 break-words hyphens-auto">
            <span key={`fc-title-${activeOption?.id || "core"}`}>
              {activeOption?.title || title}
            </span>
          </h4>
        </div>

        <div className="flex flex-wrap items-center gap-2.5 shrink-0">
          {/* Smart Filter Toggle Chips: Hide Mastered (X) vs Review All (30) */}
          <div className="inline-flex rounded-xl border border-slate-200 bg-slate-100 p-1">
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                setHideMastered(true);
                setCurrentIndex(0);
                setIsFlipped(false);
              }}
              className={`relative z-20 cursor-pointer inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold transition ${
                hideMastered
                  ? "bg-slate-900 text-white shadow-xs"
                  : "text-slate-600 hover:text-slate-900"
              }`}
            >
              <EyeOff className="h-3.5 w-3.5" />
              <span key={`toggle-hide-${masteredCount}`}>
                {`Hide Mastered (${masteredCount})`}
              </span>
            </button>
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                setHideMastered(false);
                setCurrentIndex(0);
                setIsFlipped(false);
              }}
              className={`relative z-20 cursor-pointer inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold transition ${
                !hideMastered
                  ? "bg-slate-900 text-white shadow-xs"
                  : "text-slate-600 hover:text-slate-900"
              }`}
            >
              <Eye className="h-3.5 w-3.5" />
              <span key={`toggle-all-${allDeckCards.length}`}>
                {`Review All (${allDeckCards.length})`}
              </span>
            </button>
          </div>

          <button
            type="button"
            onClick={handleShuffle}
            className="relative z-20 inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3.5 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 hover:text-slate-900 transition shadow-xs cursor-pointer"
            title="Fisher-Yates Smart Shuffle (no immediate repeats)"
          >
            <Shuffle className="h-3.5 w-3.5 text-slate-500" />
            <span>Shuffle</span>
          </button>
        </div>
      </div>

      {/* Mastery & Active Queue Status Strip */}
      <div className="space-y-2">
        <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
          <span
            key={`fc-queue-status-${hideMastered}-${unmasteredCount}-${allDeckCards.length}`}
            className="font-semibold text-slate-700"
          >
            {hideMastered
              ? `Active Study Queue: ${unmasteredCount} remaining unmastered (${masteredCount} mastered)`
              : `Full Deck Review: Showing all ${allDeckCards.length} cards (${masteredCount} mastered)`}
          </span>
          <span
            key={`fc-progress-${masteredCount}-${allDeckCards.length}-${progressPct}`}
            className="font-bold text-emerald-700"
          >
            {`${masteredCount} / ${allDeckCards.length} Mastered (${progressPct}%)`}
          </span>
        </div>
        <div className="h-2 w-full rounded-full bg-slate-100 overflow-hidden">
          <div
            className="h-full rounded-full bg-emerald-600 transition-all duration-300"
            style={{ width: `${Math.max(4, progressPct)}%` }}
          />
        </div>
      </div>

      {/* Dynamic JSON Deck Selector (when multiple decks are attached) */}
      {(deckOptions || []).length > 1 && (
        <div className="flex flex-wrap items-center gap-2 rounded-xl border border-slate-200 bg-slate-50 p-2.5">
          <span className="text-[10px] font-semibold uppercase tracking-[0.16em] text-slate-500 px-2">
            Switch Deck:
          </span>
          {(deckOptions || []).map((opt) => {
            const active = opt.id === (activeOption?.id || "core");
            return (
              <button
                key={opt.id}
                type="button"
                onClick={() => setSelectedDeckId(opt.id)}
                className={`relative z-50 cursor-pointer pointer-events-auto rounded-lg px-3 py-1.5 text-xs font-semibold transition ${
                  active
                    ? "bg-slate-900 text-white shadow-xs"
                    : "border border-slate-200 bg-white text-slate-700 hover:bg-slate-100 hover:text-slate-900"
                }`}
              >
                <span key={`opt-${opt.id}`}>
                  {`${opt.title} (${(opt.cards || []).length})`}
                </span>
              </button>
            );
          })}
        </div>
      )}

      {/* Browser / Safari TTS Fallback Alert */}
      {ttsError && (
        <div
          key="fc-tts-error"
          role="alert"
          className="flex items-center justify-between gap-2 rounded-xl border border-amber-300 bg-amber-50 px-3.5 py-2.5 text-xs font-medium text-amber-800"
        >
          <span className="flex items-center gap-2">
            <AlertCircle className="h-4 w-4 text-amber-600 shrink-0" />
            <span key="fc-tts-err-msg">{ttsError}</span>
          </span>
          <button
            type="button"
            onClick={() => setTtsError(null)}
            className="relative z-50 cursor-pointer pointer-events-auto text-[11px] font-semibold text-amber-700 hover:underline"
          >
            <span>Dismiss</span>
          </button>
        </div>
      )}

      {/* CELEBRATORY COMPLETION STATE when all cards in deck are Mastered & hidden */}
      {isAllMastered && hideMastered && activeQueue.length === 0 ? (
        <div
          key={`fc-complete-${activeOption?.id}`}
          className="rounded-3xl border-2 border-emerald-300 bg-emerald-50/60 p-8 sm:p-12 text-center space-y-5 shadow-sm"
        >
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl border border-emerald-300 bg-white text-emerald-600 shadow-sm">
            <Award className="h-8 w-8" />
          </div>
          <div className="space-y-2 max-w-lg mx-auto">
            <span className="inline-block rounded-full border border-emerald-300 bg-emerald-100 px-3.5 py-1 text-[10px] font-bold uppercase tracking-[0.2em] text-emerald-800">
              100% DECK MASTERED
            </span>
            <h3 className="text-2xl sm:text-3xl font-bold tracking-tight text-slate-900">
              <span>{`Bravo! All ${allDeckCards.length} Cards Mastered!`}</span>
            </h3>
            <p className="text-sm text-slate-700 leading-relaxed">
              <span>
                You completed every single German term, English meaning, Roman Hinglish cue, and real-life example in this topic. Advance to the next topic or reset to drill again.
              </span>
            </p>
          </div>

          <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
            <button
              type="button"
              onClick={handleLoadNextTopic}
              className="relative z-50 cursor-pointer pointer-events-auto inline-flex items-center gap-2 rounded-xl bg-slate-900 px-6 py-3 text-xs font-semibold uppercase tracking-[0.14em] text-white hover:bg-slate-800 transition shadow-sm"
            >
              <span>{`${nextTopicLabel} ->`}</span>
              <ArrowRight className="h-4 w-4" />
            </button>
            <button
              type="button"
              onClick={handleResetDeck}
              className="relative z-50 cursor-pointer pointer-events-auto inline-flex items-center gap-2 rounded-xl border border-slate-300 bg-white px-5 py-3 text-xs font-semibold text-slate-800 hover:bg-slate-50 transition shadow-xs"
            >
              <RotateCcw className="h-4 w-4" />
              <span>{`Reset & Practice All ${allDeckCards.length} Again`}</span>
            </button>
          </div>
        </div>
      ) : !currentCard ? (
        <div className="rounded-2xl border border-slate-200 bg-white p-8 text-center space-y-3 shadow-sm text-slate-900">
          <Layers className="mx-auto h-8 w-8 text-slate-400" />
          <h3 className="text-sm font-semibold text-slate-800">
            <span>Keine Flashcards verfügbar</span>
          </h3>
          <p className="text-xs text-slate-500">
            <span>Diese Lektion enthält aktuell noch keine Vokabelkarten.</span>
          </p>
        </div>
      ) : (
        <>
          {/* Interactive Tap-to-Flip Trilingual Card */}
          <div
            role="button"
            tabIndex={0}
            onClick={handleFlip}
            onKeyDown={(e) => {
              if (e.key === "Enter" || e.key === " ") {
                e.preventDefault();
                handleFlip();
              }
            }}
            className={`relative z-10 cursor-pointer pointer-events-auto rounded-3xl border-2 p-5 sm:p-9 min-h-[320px] h-auto flex flex-col justify-between transition-all duration-300 select-none text-slate-900 shadow-sm ${
              isFlipped
                ? "border-indigo-300 ring-2 ring-indigo-500/20 bg-indigo-50/20 shadow-md"
                : "border-slate-200 bg-white hover:border-slate-300 hover:shadow-md"
            }`}
          >
            {/* Card Top Bar */}
            <div className="flex flex-wrap items-center justify-between gap-3 pointer-events-auto">
              <span
                key={`fc-side-badge-${cardKey}-${isFlipped ? "back" : "front"}`}
                className="rounded-full border border-slate-200 bg-slate-100 px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.18em] text-slate-600"
              >
                {isFlipped
                  ? "BACK · ENGLISH + ROMAN HINGLISH + HINDI"
                  : `FRONT · ${(currentCard.category || "VOKABEL").toUpperCase()}`}
              </span>

              <div className="flex items-center gap-2.5">
                <span
                  key={`fc-counter-${safeIndex}-${activeQueue.length}`}
                  className="rounded-lg border border-slate-200 bg-slate-50 px-2.5 py-1 text-xs font-bold text-slate-700"
                >
                  {`Card ${safeIndex + 1} of ${activeQueue.length}`}
                </span>
                <button
                  type="button"
                  onClick={(e) => handleListen(e)}
                  className="relative z-50 cursor-pointer pointer-events-auto inline-flex items-center gap-1.5 rounded-xl bg-slate-900 text-white px-3.5 py-2 text-xs font-semibold uppercase tracking-[0.12em] transition hover:bg-slate-800 shadow-sm"
                  title="Listen in German (de-DE)"
                >
                  <Volume2
                    className={`h-3.5 w-3.5 text-white ${speaking ? "animate-pulse" : ""}`}
                  />
                  <span key={`fc-listen-${speaking ? "on" : "off"}`}>
                    {speaking ? "Speaking..." : "LISTEN (DE)"}
                  </span>
                </button>
              </div>
            </div>

            {/* Card Body: Front or Back */}
            <div className="pointer-events-none transition-all duration-300 ease-out my-5">
              {!isFlipped ? (
                <div key={`fc-front-${cardKey}`} className="space-y-5">
                  <div className="text-center space-y-2 pt-2">
                    <p className="text-2xl sm:text-4xl font-bold tracking-tight leading-snug text-slate-900 break-words hyphens-auto">
                      <span key={`fc-front-text-${cardKey}`}>
                        {currentCard.frontText || currentCard.german}
                      </span>
                    </p>
                    {currentCard.phonetic && (
                      <p className="text-xs sm:text-sm font-medium text-slate-500 italic">
                        <span key={`fc-phonetic-${cardKey}`}>
                          {`Pronunciation: [${currentCard.phonetic}]`}
                        </span>
                      </p>
                    )}
                  </div>

                  {/* German Example Sentence + Mandatory English Translation below it on Front too */}
                  {(currentCard.exampleDe || currentCard.exampleTranslation) && (
                    <div
                      key={`fc-front-ex-${cardKey}`}
                      className="rounded-2xl border border-slate-200 bg-slate-50/90 p-4 space-y-1.5 text-left"
                    >
                      <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-slate-500">
                        EXAMPLE IN REAL GERMAN LIFE
                      </p>
                      {currentCard.exampleDe && (
                        <p className="text-sm sm:text-base font-semibold text-slate-900">
                          <span key={`fc-front-exde-${cardKey}`}>
                            {currentCard.exampleDe}
                          </span>
                        </p>
                      )}
                      {currentCard.exampleTranslation && (
                        <p className="text-xs sm:text-sm font-medium text-slate-600">
                          <span key={`fc-front-exen-${cardKey}`}>
                            {`English: ${currentCard.exampleTranslation}`}
                          </span>
                        </p>
                      )}
                    </div>
                  )}
                </div>
              ) : (
                <div key={`fc-back-${cardKey}`} className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {/* Box 1: ENGLISH MEANING (Primary & Mandatory) */}
                    <div className="rounded-2xl border border-indigo-200 bg-white p-4 shadow-2xs">
                      <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-indigo-700">
                        ENGLISH MEANING (PRIMARY)
                      </p>
                      <p className="mt-1.5 text-sm sm:text-base font-semibold text-slate-900 leading-relaxed">
                        <span key={`fc-back-en-${cardKey}`}>
                          {currentCard.backText || currentCard.english}
                        </span>
                      </p>
                    </div>

                    {/* Box 2: ROMAN HINGLISH FIRST + DEVANAGARI */}
                    <div className="rounded-2xl border border-amber-200 bg-amber-50/70 p-4">
                      <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-amber-800">
                        ROMAN HINGLISH + HINDI
                      </p>
                      <p className="mt-1.5 text-sm sm:text-base font-semibold text-slate-900 leading-relaxed">
                        <span key={`fc-back-hi-${cardKey}`}>
                          {currentCard.hindi}
                        </span>
                      </p>
                    </div>
                  </div>

                  {/* Box 3: German Example + English Translation directly below */}
                  {(currentCard.exampleDe || currentCard.exampleTranslation) && (
                    <div
                      key={`fc-ex-box-${cardKey}`}
                      className="rounded-2xl border border-slate-200 bg-slate-50/90 p-4 space-y-1.5"
                    >
                      <div className="flex items-center justify-between gap-2">
                        <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-slate-500">
                          EXAMPLE IN REAL GERMAN LIFE
                        </p>
                        {currentCard.exampleDe && (
                          <button
                            type="button"
                            onClick={(e) => handleListen(e, currentCard.exampleDe)}
                            className="relative z-50 cursor-pointer pointer-events-auto inline-flex items-center gap-1 rounded-lg border border-slate-200 bg-white px-2.5 py-1 text-[10px] font-semibold text-slate-700 hover:bg-slate-100 transition"
                          >
                            <Volume2 className="h-3 w-3" />
                            <span>Hear Sentence</span>
                          </button>
                        )}
                      </div>
                      {currentCard.exampleDe && (
                        <p className="text-sm sm:text-base font-semibold text-slate-900">
                          <span key={`fc-ex-de-${cardKey}`}>
                            {currentCard.exampleDe}
                          </span>
                        </p>
                      )}
                      {currentCard.exampleTranslation && (
                        <p className="text-xs sm:text-sm font-medium text-slate-700">
                          <span key={`fc-ex-tr-${cardKey}`}>
                            {`English: ${currentCard.exampleTranslation}`}
                          </span>
                        </p>
                      )}
                    </div>
                  )}

                  {/* Box 4: Grammar & Exam Pro Tip */}
                  {currentCard.grammarTip && (
                    <div
                      key={`fc-tip-${cardKey}`}
                      className="text-xs sm:text-sm text-emerald-900 bg-emerald-50 border border-emerald-200 rounded-xl px-4 py-3 font-medium leading-relaxed"
                    >
                      <span className="font-bold uppercase tracking-wider text-emerald-700 text-[10px] block mb-0.5">
                        EXAM & GRAMMAR PRO TIP
                      </span>
                      <span key={`fc-tip-text-${cardKey}`}>
                        {currentCard.grammarTip}
                      </span>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Tap Hint Footer */}
            <div className="flex items-center justify-between pt-4 border-t border-slate-100 text-xs pointer-events-none">
              <span className="font-medium flex items-center gap-1.5 text-slate-500">
                <RotateCw
                  className={`h-3.5 w-3.5 transition-transform duration-300 ${
                    isFlipped ? "rotate-180 text-indigo-600" : ""
                  }`}
                />
                <span key={`fc-hint-${isFlipped ? "back" : "front"}`}>
                  {isFlipped
                    ? "Tap card to return to German Front"
                    : "Tap card to reveal English, Roman Hinglish & Grammar Tip"}
                </span>
              </span>

              {isMastered && (
                <span
                  key={`fc-mastered-badge-${cardKey}`}
                  className="inline-flex items-center gap-1 rounded-full border border-emerald-300 bg-emerald-50 px-2.5 py-0.5 text-[10px] font-semibold text-emerald-700"
                >
                  <CheckCircle2 className="h-3 w-3" />
                  <span>Mastered</span>
                </span>
              )}
            </div>
          </div>

          {/* Primary Navigation & Mastery Controls */}
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={handlePrev}
                className="relative z-50 cursor-pointer pointer-events-auto inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-xs font-semibold text-slate-700 hover:bg-slate-50 hover:text-slate-900 transition shadow-xs"
              >
                <ChevronLeft className="h-4 w-4" />
                <span>Previous</span>
              </button>

              <button
                type="button"
                onClick={handleFlip}
                className="relative z-50 cursor-pointer pointer-events-auto inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-xs font-semibold text-slate-700 hover:bg-slate-50 hover:text-slate-900 transition shadow-xs"
              >
                <RotateCw
                  className={`h-3.5 w-3.5 transition-transform duration-300 ${
                    isFlipped ? "rotate-180 text-indigo-600" : "text-slate-500"
                  }`}
                />
                <span>Flip Card</span>
              </button>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={handleToggleMastered}
                className={`relative z-50 cursor-pointer pointer-events-auto inline-flex items-center gap-1.5 rounded-xl px-4 py-2.5 text-xs font-semibold transition shadow-xs ${
                  isMastered
                    ? "border border-emerald-300 bg-emerald-50 text-emerald-700"
                    : "border border-emerald-600 bg-emerald-600 text-white hover:bg-emerald-700"
                }`}
              >
                <CheckCircle2 className="h-4 w-4" />
                <span key={`fc-master-btn-${cardKey}-${isMastered ? "yes" : "no"}`}>
                  {isMastered ? "Mastered ✓ (Undo)" : "Mark Mastered"}
                </span>
              </button>

              <button
                type="button"
                onClick={handleNext}
                className="relative z-50 cursor-pointer pointer-events-auto inline-flex items-center gap-1.5 rounded-xl bg-slate-900 text-white px-5 py-2.5 text-xs font-semibold uppercase tracking-[0.14em] hover:bg-slate-800 transition shadow-sm"
              >
                <span>Next</span>
                <ChevronRight className="h-4 w-4 text-white" />
              </button>
            </div>
          </div>

          {/* Mobile-Clean Scrollable Card Number Pill Bar */}
          <div className="pt-2 border-t border-slate-100 space-y-2">
            <div className="flex items-center justify-between text-[11px] font-semibold text-slate-500">
              <span key={`pill-summary-${safeIndex}-${activeQueue.length}`}>
                {`Card ${safeIndex + 1} of ${activeQueue.length} (${hideMastered ? "Unmastered Queue" : "Full Deck"})`}
              </span>
              {masteredCount > 0 && (
                <button
                  type="button"
                  onClick={handleResetDeck}
                  className="text-slate-500 hover:text-slate-900 underline cursor-pointer"
                >
                  <span>Reset Progress</span>
                </button>
              )}
            </div>
            <div className="flex items-center gap-1.5 overflow-x-auto max-w-full pb-2 scrollbar-thin">
              {(activeQueue || []).map((c, idx) => {
                if (!c) return null;
                const active = idx === safeIndex;
                const done = Boolean(masteredIds[c.id]);
                return (
                  <button
                    key={c.id || idx}
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      setCurrentIndex(idx);
                      setIsFlipped(false);
                    }}
                    className={`relative z-50 cursor-pointer pointer-events-auto shrink-0 h-8 min-w-[2rem] px-2 rounded-lg text-[11px] font-semibold transition ${
                      active
                        ? "bg-slate-900 text-white shadow-xs"
                        : done
                        ? "border border-emerald-300 bg-emerald-50 text-emerald-700"
                        : "border border-slate-200 bg-white text-slate-600 hover:bg-slate-100 hover:text-slate-900"
                    }`}
                  >
                    <span>{idx + 1}</span>
                  </button>
                );
              })}
            </div>
          </div>
        </>
      )}
    </div>
  );
}

export function FlashcardEngine(props: FlashcardEngineProps) {
  return (
    <React.Suspense
      fallback={<p className="text-sm text-slate-500 py-4">Loading Workspace...</p>}
    >
      <FlashcardEngineInner {...props} />
    </React.Suspense>
  );
}
