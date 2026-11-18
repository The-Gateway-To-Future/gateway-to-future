"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  AlertCircle,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Layers,
  RotateCw,
  Shuffle,
  Sparkles,
  Volume2,
} from "lucide-react";
import type { FlashcardDeckItem } from "@/lib/types";

export type { FlashcardDeckItem };

export interface DynamicFlashcardDeck {
  id: string;
  title: string;
  cards: FlashcardDeckItem[];
}

export const A1_GREETINGS_BASICS_DECK: FlashcardDeckItem[] = [
  {
    id: "a1-fc-01",
    german: "Guten Tag! Wie geht es Ihnen?",
    phonetic: "GOO-ten tahk! Vee gayt es EE-nen?",
    category: "Formal Greeting",
    english: "Good day! How are you? (Formal)",
    hindi: "Namaste! Aap kaise hain? (नमस्ते! आप कैसे हैं?)",
    exampleDe: "Guten Tag, Frau Weber! Wie geht es Ihnen heute?",
    exampleTranslation: "Good day, Ms. Weber! How are you today?",
    grammarTip: "Use 'Ihnen' (Sie-form) with teachers, doctors, Bürgeramt officers, and strangers.",
  },
  {
    id: "a1-fc-02",
    german: "Mein Name ist ... / Ich heiße ...",
    phonetic: "Mine NAH-me ist ... / Ikh HY-se ...",
    category: "Self-Introduction",
    english: "My name is ... / I am called ...",
    hindi: "Mera naam ... hai (मेरा नाम ... है)",
    exampleDe: "Hallo, ich heiße Priya Sharma und bin neu im Kurs.",
    exampleTranslation: "Hello, my name is Priya Sharma and I am new in the course.",
    grammarTip: "'heißen' ends in '-e' for 'ich' -> ich heiße (never 'ich heiß').",
  },
  {
    id: "a1-fc-03",
    german: "Ich komme aus Indien und wohne in Berlin.",
    phonetic: "Ikh KOM-me ows IN-dee-en oont VOH-ne in Ber-LEEN.",
    category: "Origin & Residence",
    english: "I come from India and live in Berlin.",
    hindi: "Main Bharat se hoon aur Berlin mein rehta/rehti hoon (मैं भारत से हूँ और बर्लिन में रहता/रहती हूँ)",
    exampleDe: "Ich komme aus Pune in Indien, aber jetzt wohne ich in Berlin-Mitte.",
    exampleTranslation: "I come from Pune in India, but now I live in Berlin-Mitte.",
    grammarTip: "Always use 'aus' for country of origin and 'in' for current city.",
  },
  {
    id: "a1-fc-04",
    german: "Entschuldigung, wo ist der Hauptbahnhof?",
    phonetic: "Ent-SHOOL-dee-goong, voh ist dair HOWPT-bahn-hohf?",
    category: "Directions & Transit",
    english: "Excuse me, where is the central train station?",
    hindi: "Maaf kijiye, mukhya railway station kahan hai? (माफ़ कीजिए, मुख्य रेलवे स्टेशन कहाँ है?)",
    exampleDe: "Entschuldigung, wo ist bitte das Gleis vier?",
    exampleTranslation: "Excuse me, where is platform four please?",
    grammarTip: "'der Bahnhof' -> Nominative masculine takes 'der'. Start questions cleanly with W-word (Wo) + Verb.",
  },
  {
    id: "a1-fc-05",
    german: "Ich möchte bitte einen Termin beim Bürgeramt vereinbaren.",
    phonetic: "Ikh MÖKH-te BIT-te EYE-nen ter-MEEN bime BÜR-ger-amt fer-EYEN-bah-ren.",
    category: "Berlin Registration",
    english: "I would like to book an appointment at the Citizen Office, please.",
    hindi: "Main Bürgeramt mein ek appointment book karna chahta/chahti hoon (मैं बुर्गरआम्ट में अपॉइंटमेंट लेना चाहता हूँ)",
    exampleDe: "Für die Anmeldung brauche ich heute einen Termin beim Bürgeramt.",
    exampleTranslation: "For city registration I need an appointment at the Citizen Office today.",
    grammarTip: "'möchte' (modal-like verb at Position 2) pushes the infinitive 'vereinbaren' to the very end!",
  },
  {
    id: "a1-fc-06",
    german: "Sprechen Sie bitte etwas langsamer!",
    phonetic: "SHPRE-khen zee BIT-te ET-vas LANG-zah-mer!",
    category: "Survival Phrase",
    english: "Please speak a little more slowly!",
    hindi: "Kripaya thoda dheere boliye! (कृपया थोड़ा धीरे बोलिए!)",
    exampleDe: "Entschuldigung, ich lerne noch Deutsch. Sprechen Sie bitte etwas langsamer!",
    exampleTranslation: "Sorry, I am still learning German. Please speak a little more slowly!",
    grammarTip: "Imperative formal form simply reverses order: Verb ('Sprechen') + 'Sie' + 'bitte'.",
  },
  {
    id: "a1-fc-07",
    german: "Was kostet die Fahrkarte für die Zone AB?",
    phonetic: "Vas KOS-tet dee FAHR-kar-te für dee TSOH-ne ah-bay?",
    category: "Public Transport",
    english: "How much does the ticket for Zone AB cost?",
    hindi: "Zone AB ke liye ticket kitne ka hai? (ज़ोन AB के लिए टिकट कितने का है?)",
    exampleDe: "Ein Einzelfahrausweis für Berlin Zone AB kostet drei Euro fünfzig.",
    exampleTranslation: "A single ticket for Berlin Zone AB costs three euros fifty.",
    grammarTip: "Always keep 'bitte' and polite eye contact ready when buying tickets from BVG/DB counters.",
  },
  {
    id: "a1-fc-08",
    german: "Ich lerne Deutsch für mein Studium und meine Arbeit.",
    phonetic: "Ikh LER-ne doytsh für mine SHTOO-dee-oom oont MY-ne AR-bite.",
    category: "Career & Goals",
    english: "I am learning German for my university studies and my work.",
    hindi: "Main apni padhai aur kaam ke liye German seekh raha/rahi hoon (मैं अपनी पढ़ाई और काम के लिए जर्मन सीख रहा हूँ)",
    exampleDe: "Ich lerne jeden Tag eine Stunde Deutsch für meine Karriere in Deutschland.",
    exampleTranslation: "I study German one hour every day for my career in Germany.",
    grammarTip: "'für' ALWAYS requires Akkusativ ('mein Studium', 'meine Arbeit').",
  },
  {
    id: "a1-fc-09",
    german: "Vielen Dank für Ihre Hilfe! Schönen Tag noch.",
    phonetic: "FEE-len dank für EE-re HIL-fe! SHÖ-nen tahk nokh.",
    category: "Polite Gratitude",
    english: "Thank you very much for your help! Have a nice day.",
    hindi: "Aapki madad ke liye bahut dhanyavaad! Aapka din shubh ho (आपकी मदद के लिए धन्यवाद!)",
    exampleDe: "Vielen Dank für Ihre schnelle Hilfe, Frau Müller! Schönen Tag noch.",
    exampleTranslation: "Many thanks for your quick help, Ms. Müller! Have a lovely day.",
    grammarTip: "Saying 'Schönen Tag noch!' when leaving a shop or office is essential German politeness.",
  },
  {
    id: "a1-fc-10",
    german: "Auf Wiedersehen! Bis morgen im Deutschkurs.",
    phonetic: "Owf VEE-der-zay-en! Bis MOR-gen im DOYTSH-koors.",
    category: "Farewell",
    english: "Goodbye! See you tomorrow in the German course.",
    hindi: "Alvida / Phir milenge! Kal German class mein milte hain (फिर मिलेंगे! कल जर्मन क्लास में मिलते हैं)",
    exampleDe: "Tschüss Freunde oder Auf Wiedersehen, Frau Schneider! Bis morgen!",
    exampleTranslation: "Bye friends, or goodbye Ms. Schneider! See you tomorrow!",
    grammarTip: "Use 'Auf Wiedersehen' formally and 'Tschüss' with friends and classmates.",
  },
];

export const A2_OFFICE_VOCABULARY_DECK: FlashcardDeckItem[] = [
  {
    id: "a2-fc-01",
    german: "die Besprechung / das Meeting",
    phonetic: "dee be-SHPRE-khoong",
    category: "Office Routine",
    english: "the meeting / team briefing",
    hindi: "Kaam ki meeting / charcha (ऑफिस मीटिंग)",
    exampleDe: "Um zehn Uhr beginnt unsere tägliche Besprechung im Konferenzraum.",
    exampleTranslation: "Our daily meeting begins at 10 o'clock in the conference room.",
    grammarTip: "Nouns ending in '-ung' are ALWAYS feminine ('die Besprechung').",
  },
  {
    id: "a2-fc-02",
    german: "der Dienstplan",
    phonetic: "dair DEENST-plahn",
    category: "Scheduling",
    english: "the work schedule / duty roster",
    hindi: "Duty time-table / shift schedule (ड्यूटी रोस्टर)",
    exampleDe: "Ich muss heute meinen neuen Dienstplan für nächsten Monat prüfen.",
    exampleTranslation: "I have to check my new shift schedule for next month today.",
    grammarTip: "Compound nouns take the article of the last word: der Plan -> der Dienstplan.",
  },
  {
    id: "a2-fc-03",
    german: "sich krankmelden (vor 8 Uhr)",
    phonetic: "zikh KRANK-mel-den",
    category: "Workplace Rules",
    english: "to call in sick (before 8 a.m.)",
    hindi: "Bimaari ki chhutti ki suchna dena (बीमारी की सूचना देना)",
    exampleDe: "Wenn man Fieber hat, muss man sich rechtzeitig beim Chef krankmelden.",
    exampleTranslation: "If you have a fever, you must report sick to your boss on time.",
    grammarTip: "Separable reflexive verb: 'Ich melde mich heute krank.' ('mich' in Accusative).",
  },
  {
    id: "a2-fc-04",
    german: "die elektronische Arbeitsunfähigkeitsbescheinigung (eAU)",
    phonetic: "dee eh-ah-OO",
    category: "HR & Administration",
    english: "electronic doctor's sick note",
    hindi: "Doctor ka digital medical certificate",
    exampleDe: "Die Arztpraxis schickt die eAU direkt an meine Krankenkasse.",
    exampleTranslation: "The doctor's clinic sends the electronic sick note directly to my health insurance.",
    grammarTip: "In Germany, employers fetch your eAU digitally once you inform them of your sick dates.",
  },
  {
    id: "a2-fc-05",
    german: "eine E-Mail weiterleiten",
    phonetic: "EYE-ne EE-mail VY-ter-ly-ten",
    category: "Digital Office",
    english: "to forward an email",
    hindi: "Email aage forward karna",
    exampleDe: "Könnten Sie mir bitte die Rechnung per E-Mail weiterleiten?",
    exampleTranslation: "Could you please forward me the invoice by email?",
    grammarTip: "'weiterleiten' is separable, so Perfekt takes '-ge-' in the middle: 'weitergeleitet'.",
  },
  {
    id: "a2-fc-06",
    german: "den Termin verschieben",
    phonetic: "dayn ter-MEEN fer-SHEE-ben",
    category: "Calendar",
    english: "to postpone / reschedule the appointment",
    hindi: "Appointment ki tareekh ya samay aage badhana",
    exampleDe: "Leider müssen wir den Kundentermin auf Freitag verschieben.",
    exampleTranslation: "Unfortunately we have to postpone the client appointment to Friday.",
    grammarTip: "Verbs starting with 'ver-' NEVER take 'ge-' in Perfekt -> 'Ich habe den Termin verschoben.'",
  },
  {
    id: "a2-fc-07",
    german: "der Urlaubsantrag",
    phonetic: "dair OOR-lowps-ahn-trahk",
    category: "Leave Request",
    english: "the vacation / leave request form",
    hindi: "Chhutti ke liye aavedan (छुट्टी का आवेदन)",
    exampleDe: "Mein Teamleiter hat meinen Urlaubsantrag für August bereits genehmigt.",
    exampleTranslation: "My team lead has already approved my leave application for August.",
    grammarTip: "Use preposition 'für + Zeitraum' (for a duration) when requesting leave in writing.",
  },
  {
    id: "a2-fc-08",
    german: "die Kollegin / der Kollege (übernehmen)",
    phonetic: "dee ko-LAY-gin / dair ko-LAY-ge",
    category: "Teamwork",
    english: "colleague (to take over a task/shift)",
    hindi: "Sahkarmi (kaam ya shift sambhalna)",
    exampleDe: "Meine Kollegin übernimmt heute meine Spätschicht im Büro.",
    exampleTranslation: "My colleague is taking over my late shift in the office today.",
    grammarTip: "'übernehmen' in this abstract meaning is inseparable: 'sie übernimmt', Perfekt: 'übernommen'.",
  },
];

export const B1_JOB_INTERVIEW_PHRASES_DECK: FlashcardDeckItem[] = [
  {
    id: "b1-fc-01",
    german: "Vielen Dank für die Einladung zum Vorstellungsgespräch.",
    phonetic: "FEE-len dank für dee EYEN-lah-doong tsoom FOR-shtel-loongs-ge-shpraykh.",
    category: "Interview Opening",
    english: "Thank you very much for the invitation to the job interview.",
    hindi: "Job interview ke nimantran ke liye bahut dhanyavaad (इंटरव्यू के निमंत्रण के लिए धन्यवाद)",
    exampleDe: "Guten Tag, Frau Schulz! Vielen Dank für die Einladung zum Vorstellungsgespräch.",
    exampleTranslation: "Good day, Ms. Schulz! Thank you very much for inviting me to the interview.",
    grammarTip: "'danken für + Akkusativ' / 'die Einladung zu + Dativ' (zu dem -> zum Vorstellungsgespräch).",
  },
  {
    id: "b1-fc-02",
    german: "Ich verfüge über dreijährige Berufserfahrung in ...",
    phonetic: "Ikh fer-FÜ-ge Ü-ber dry-YAY-ri-ge be-ROOFS-er-fah-roong.",
    category: "Experience",
    english: "I possess three years of professional experience in ...",
    hindi: "Mere paas ... kshetra mein teen saal ka karyanubhav hai",
    exampleDe: "Ich verfüge über dreijährige Berufserfahrung in der Intensivpflege.",
    exampleTranslation: "I have three years of professional experience in intensive care nursing.",
    grammarTip: "'verfügen über + Akkusativ' sounds far more professional than simply saying 'ich habe'.",
  },
  {
    id: "b1-fc-03",
    german: "Zu meinen Stärken zählen Zuverlässigkeit und Teamfähigkeit.",
    phonetic: "Tsoo MY-nen SHTER-ken TSAY-len TSOO-fer-les-ikh-kite...",
    category: "Strengths",
    english: "My strengths include reliability and ability to work in a team.",
    hindi: "Meri takaton mein bharosemand hona aur team ke saath kaam karna shamil hai",
    exampleDe: "Zu meinen größten Stärken zählen Belastbarkeit, Pünktlichkeit und Teamfähigkeit.",
    exampleTranslation: "Among my greatest strengths are resilience, punctuality, and teamwork.",
    grammarTip: "'zählen zu + Dativ Plural' requires '-n' on the plural noun ('meinen Stärken').",
  },
  {
    id: "b1-fc-04",
    german: "Ich möchte meine Fachkenntnisse in Ihrem Unternehmen einbringen.",
    phonetic: "Ikh MÖKH-te MY-ne FAKH-kent-nis-se ... EYEN-brin-gen.",
    category: "Motivation",
    english: "I would like to contribute my specialist expertise to your company.",
    hindi: "Main apni visheshagyata aapki company ke kaam mein lagana chahta/chahti hoon",
    exampleDe: "Besonders reizt mich die Möglichkeit, meine Fachkenntnisse direkt in Ihrem Team einzubringen.",
    exampleTranslation: "I am especially excited by the opportunity to contribute my expertise directly to your team.",
    grammarTip: "With 'Möglichkeit + zu + Infinitiv', separable verb 'einbringen' wraps 'zu' in the middle: 'einzubringen'.",
  },
  {
    id: "b1-fc-05",
    german: "Wie sieht die Einarbeitungszeit bei Ihnen konkret aus?",
    phonetic: "Vee zeet dee EYEN-ar-by-toongs-tsite by EE-nen kon-KRAYT ows?",
    category: "Candidate Question",
    english: "What does the onboarding period specifically look like at your organization?",
    hindi: "Aapke yahan shuruati training (onboarding) kis tarah hoti hai?",
    exampleDe: "Darf ich fragen, wie die Einarbeitungszeit für internationale Fachkräfte aussieht?",
    exampleTranslation: "May I ask what the onboarding period looks like for international specialists?",
    grammarTip: "Asking about 'Einarbeitungszeit' shows German HR that you value structured quality.",
  },
  {
    id: "b1-fc-06",
    german: "Ich arbeite mich schnell in neue Programme ein.",
    phonetic: "Ikh AR-by-te mikh shnel in NOY-e pro-GRAM-me eyen.",
    category: "Adaptability",
    english: "I familiarize myself quickly with new software / systems.",
    hindi: "Main naye software aur system ko jaldi seekh leta/leti hoon",
    exampleDe: "Obwohl die Kliniksoftware neu ist, arbeite ich mich sehr schnell darin ein.",
    exampleTranslation: "Although the hospital software is new, I pick it up very quickly.",
    grammarTip: "'obwohl' sends the conjugated verb ('ist') to the end of the subordinate clause.",
  },
  {
    id: "b1-fc-07",
    german: "Meine Berufsanerkennung befindet sich aktuell im Verfahren.",
    phonetic: "MY-ne be-ROOFS-an-er-ken-noong be-FIN-det zikh ak-too-EL im fer-FAH-ren.",
    category: "Recognition Status",
    english: "My professional credential recognition is currently in process.",
    hindi: "Meri degree/qualification recognition ki prakriya abhi chal rahi hai",
    exampleDe: "Alle beglaubigten Zeugnisse liegen vor und die Anerkennung befindet sich im Verfahren.",
    exampleTranslation: "All certified transcripts are ready and the recognition is currently in process.",
    grammarTip: "'sich befinden in + Dativ' (in dem -> im Verfahren) is crisp C-level/B-level official phrasing.",
  },
  {
    id: "b1-fc-08",
    german: "Wann darf ich mit einer Rückmeldung rechnen?",
    phonetic: "Van darf ikh mit EYE-ner RÜK-mel-doong REKH-nen?",
    category: "Interview Closing",
    english: "When may I expect to hear back from you?",
    hindi: "Main aapki taraf se jawaab ki ummeed kab tak kar sakta/sakti hoon?",
    exampleDe: "Ich danke Ihnen für das angenehme Gespräch. Wann darf ich mit einer Rückmeldung rechnen?",
    exampleTranslation: "Thank you for the pleasant conversation. When may I expect feedback?",
    grammarTip: "'rechnen mit + Dativ' ('mit einer Rückmeldung'). Polite alternative to asking 'Did I get the job?'.",
  },
];

export const B2_ACADEMIC_CONNECTORS_DECK: FlashcardDeckItem[] = [
  {
    id: "b2-fc-01",
    german: "einerseits ... andererseits",
    phonetic: "EYEN-er-zyts ... AN-de-rer-zyts",
    category: "Double Connectors",
    english: "on the one hand ... on the other hand",
    hindi: "Ek taraf ... toh doosri taraf",
    exampleDe: "Einerseits entlastet KI die Pflegekräfte bei der Dokumentation, andererseits bleibt menschliche Empathie unersetzlich.",
    exampleTranslation: "On one hand AI relieves nurses in documentation; on the other hand human empathy remains irreplaceable.",
    grammarTip: "Inversion applies in both clauses if starting the sentence: Verb always stays in Position 2!",
  },
  {
    id: "b2-fc-02",
    german: "infolge + Genitiv (des Fachkräftemangels)",
    phonetic: "in-FOL-ge des FAKH-kref-te-man-gels",
    category: "Nominalstil Cause",
    english: "as a consequence of / due to (the skilled labor shortage)",
    hindi: "... ke parinaamswaroop / ki wajah se",
    exampleDe: "Infolge des demografischen Wandels steigt der Bedarf an qualifiziertem Personal.",
    exampleTranslation: "As a consequence of demographic change, the demand for qualified staff is rising.",
    grammarTip: "Classic B2/TestDaF upgrade from 'weil': infolge / aufgrund + Genitiv masculine adds '-s/-es'.",
  },
  {
    id: "b2-fc-03",
    german: "zwecks + Genitiv (der Qualitätssicherung)",
    phonetic: "tsveks dair kva-lee-TAYTS-zi-khe-roong",
    category: "Nominalstil Purpose",
    english: "for the purpose of (quality assurance)",
    hindi: "... ke uddeshya se",
    exampleDe: "Zwecks einer schnellen Integration bietet das Krankenhaus begleitende Sprachkurse an.",
    exampleTranslation: "For the purpose of rapid integration, the hospital offers accompanying language courses.",
    grammarTip: "Replaces 'damit / um ... zu' clauses cleanly in formal reports and B2 Leserbriefe.",
  },
  {
    id: "b2-fc-04",
    german: "je ... desto / umso (Komparativ)",
    phonetic: "yay ... DES-to / OOM-zo",
    category: "Proportional Clauses",
    english: "the more ... the more ...",
    hindi: "Jitna zyada ... utna zyada",
    exampleDe: "Je strukturierter die Übergabe erfolgt, desto geringer ist das Fehlerrisiko auf Station.",
    exampleTranslation: "The more structured the handover is, the lower the risk of error on the ward.",
    grammarTip: "'Je' takes subordinate verb-final order; 'desto' puts comparative immediately before the Verb at Pos 2.",
  },
  {
    id: "b2-fc-05",
    german: "trotz + Genitiv (erhöhter Arbeitsbelastung)",
    phonetic: "trots er-HÖ-ter AR-byts-be-las-toong",
    category: "Concessive Structure",
    english: "despite (increased workload)",
    hindi: "... ke bawajood",
    exampleDe: "Trotz hoher beruflicher Anforderungen engagiert sich das Team vorbildlich.",
    exampleTranslation: "Despite high professional demands, the team shows exemplary commitment.",
    grammarTip: "Transforms 'obwohl' verbal clauses into concise B2 Nominalstil.",
  },
  {
    id: "b2-fc-06",
    german: "Meines Erachtens lässt sich feststellen, dass ...",
    phonetic: "MY-nes er-AKH-tens lest zikh FEST-shtel-len",
    category: "Academic Stance",
    english: "In my estimation / view, it can be established that ...",
    hindi: "Mere vichaar se yeh kaha ja sakta hai ki ...",
    exampleDe: "Meines Erachtens lässt sich eindeutig feststellen, dass Praxisnähe den Lernerfolg verdoppelt.",
    exampleTranslation: "In my view, it can clearly be established that practical relevance doubles learning success.",
    grammarTip: "Fixed Genitive expression 'Meines Erachtens' requires NO preposition (never write 'nach meines Erachtens').",
  },
  {
    id: "b2-fc-07",
    german: "im Gegensatz zu + Dativ",
    phonetic: "im GAY-gen-zats tsoo",
    category: "Contrast",
    english: "in contrast to",
    hindi: "... ke vipreet",
    exampleDe: "Im Gegensatz zu früheren Verfahren verkürzt § 81a die Visabearbeitung deutlich.",
    exampleTranslation: "In contrast to earlier procedures, Section 81a significantly shortens visa processing.",
    grammarTip: "Ideal for B2 Grafikbeschreibung and Podiumsdiskussion comparisons.",
  },
  {
    id: "b2-fc-08",
    german: "Es steht außer Frage, dass ...",
    phonetic: "es shtayt OW-ser FRAH-ge",
    category: "Strong Consensus",
    english: "It is beyond question that ...",
    hindi: "Ismein koi sandeh nahi hai ki ...",
    exampleDe: "Es steht außer Frage, dass fachliche und sprachliche Kompetenz untrennbar zusammengehören.",
    exampleTranslation: "It is beyond question that technical and language competence belong inseparably together.",
    grammarTip: "High-scoring opening or concluding sentence in telc B2 / Goethe B2 Schreiben Teil 1.",
  },
];

export const PFLEGE_STATION_HANDOVER_DECK: FlashcardDeckItem[] = [
  {
    id: "pflege-fc-01",
    german: "die Dienstübergabe nach ISBAR",
    phonetic: "dee DEENST-ü-ber-gah-be nakh EES-bar",
    category: "ISBAR Framework",
    english: "structured shift handover using ISBAR (Identify, Situation, Background, Assessment, Recommendation)",
    hindi: "ISBAR niyam ke anusar nurse shift handover",
    exampleDe: "Während der Dienstübergabe nach ISBAR berichten wir systematisch über alle Vitalzeichen.",
    exampleTranslation: "During the ISBAR shift handover we report systematically on all vital signs.",
    grammarTip: "In German FSP Pflege exams, examiners deduct points if Recommendation ('Empfehlung') is omitted.",
  },
  {
    id: "pflege-fc-02",
    german: "die Vitalzeichen kontrollieren (RR, Puls, SpO2, Temp.)",
    phonetic: "dee vee-TAHL-tsy-khen kon-tro-LEE-ren",
    category: "Monitoring",
    english: "to check vital signs (blood pressure, heart rate, O2 saturation, temperature)",
    hindi: "BP, pulse, oxygen level aur bukhar check karna",
    exampleDe: "Bitte kontrollieren Sie postoperativ alle zwei Stunden die Vitalzeichen bei Frau Becker.",
    exampleTranslation: "Please monitor Ms. Becker's vital signs every two hours post-operatively.",
    grammarTip: "Note: In Germany, blood pressure is commonly abbreviated 'RR' (after Riva-Rocci).",
  },
  {
    id: "pflege-fc-03",
    german: "das Pflegeanamnese-Gespräch & Allergien abklären",
    phonetic: "das PFLAY-ge-ah-nam-NAY-ze-ge-shpraykh",
    category: "Patient Intake",
    english: "nursing admission interview & clarifying allergies/intolerances",
    hindi: "Mareez ki bimaari ka itihaas aur allergy puchna",
    exampleDe: "Bei der stationären Aufnahme klären wir Medikamentenallergien und Vorerkrankungen ab.",
    exampleTranslation: "On inpatient admission we clarify drug allergies and pre-existing conditions.",
    grammarTip: "'abklären' is separable and specifically means clarifying clinically until certain.",
  },
  {
    id: "pflege-fc-04",
    german: "der Verbandwechsel unter aseptischen Bedingungen",
    phonetic: "dair fer-BANT-vek-sel oon-ter ah-ZEP-ti-shen be-DING-oon-gen",
    category: "Wound Care",
    english: "wound dressing change under sterile / aseptic conditions",
    hindi: "Sterile tareeke se patti (dressing) badalna",
    exampleDe: "Der tägliche Verbandwechsel der Operationswunde erfolgte reizlos und ohne Sekretion.",
    exampleTranslation: "The daily dressing change of the surgical wound showed no irritation or discharge.",
    grammarTip: "'reizlos' (unirritated/clean) is key vocabulary in Pflegedokumentation notes.",
  },
  {
    id: "pflege-fc-05",
    german: "die Sturzprophylaxe & Dekubitusprophylaxe",
    phonetic: "dee SHTOORTS-pro-fee-lak-se / de-KOO-bee-toos",
    category: "Safety Standards",
    english: "fall prevention & pressure ulcer prevention",
    hindi: "Mareez ko girne aur bed-sore se bachane ke upay",
    exampleDe: "Aufgrund der Gangunsicherheit führen wir konsequent Maßnahmen zur Sturzprophylaxe durch.",
    exampleTranslation: "Due to gait instability we consistently implement fall-prevention measures.",
    grammarTip: "Both words follow the pattern [Risk]-prophylaxe -> feminine 'die'.",
  },
  {
    id: "pflege-fc-06",
    german: "die Bedarfsmedikation verabreichen",
    phonetic: "dee be-DARFS-me-dee-ka-tsee-OHN fer-AP-ry-khen",
    category: "Medication",
    english: "to administer PRN / as-needed medication",
    hindi: "Zaroorat padne par dawai dena (PRN medication)",
    exampleDe: "Bei starken Schmerzen (NRS > 5) dürfen wir laut Anordnung die Bedarfsmedikation verabreichen.",
    exampleTranslation: "With severe pain (NRS > 5) we may administer PRN medication per physician order.",
    grammarTip: "'verabreichen' is the formal medical verb used on German hospital wards instead of 'geben'.",
  },
  {
    id: "pflege-fc-07",
    german: "retrosternale Schmerzen mit Ausstrahlung",
    phonetic: "re-tro-shter-NAH-le SHMER-tsen mit OWS-shtrah-loong",
    category: "Emergency Symptoms",
    english: "retrosternal chest pain radiating (to left arm/jaw)",
    hindi: "Seene ke peeche dard jo baayein haath ya jabde tak phaile",
    exampleDe: "Der Patient klagt über akute retrosternale Schmerzen mit Ausstrahlung in den linken Arm.",
    exampleTranslation: "The patient complains of acute retrosternal pain radiating into the left arm.",
    grammarTip: "'klagen über + Akkusativ' = standard clinical phrase for patient symptom reporting.",
  },
  {
    id: "pflege-fc-08",
    german: "die Flüssigkeitsbilanzierung (Ein- und Ausfuhr)",
    phonetic: "dee FLÜS-ikh-kyts-bee-lan-TSEE-roong",
    category: "Documentation",
    english: "fluid intake and output balance monitoring",
    hindi: "Mareez ke liquid intake aur urine output ka hisaab rakhna",
    exampleDe: "Auf der kardiologischen Station ist eine genaue Flüssigkeitsbilanzierung zwingend erforderlich.",
    exampleTranslation: "On the cardiology ward, accurate fluid intake/output balancing is strictly required.",
    grammarTip: "Watch for 'Einfuhr' (intake) vs. 'Ausfuhr' (output) in Vivantes/Charité charts.",
  },
];

export const STUDIENKOLLEG_SCIENTIFIC_DECK: FlashcardDeckItem[] = [
  {
    id: "stk-fc-01",
    german: "die Ableitung / der Differentialquotient f'(x)",
    phonetic: "dee AP-ly-toong",
    category: "T/M-Kurs Mathematik",
    english: "the derivative / rate of change",
    hindi: "Derivative (Calculus avkalan)",
    exampleDe: "Um lokale Extremwerte zu bestimmen, setzt man die erste Ableitung gleich null.",
    exampleTranslation: "To determine local extrema, set the first derivative equal to zero.",
    grammarTip: "Master phrase: 'etwas gleich null setzen' = set something equal to zero.",
  },
  {
    id: "stk-fc-02",
    german: "die Definitionsmenge & Lösungsmenge",
    phonetic: "dee de-fee-nee-TSEE-ohns-meng-e",
    category: "Algebra & C-Test",
    english: "domain of definition & solution set",
    hindi: "Equation ka domain aur valid answer set",
    exampleDe: "Vor dem Lösen der Wurzelgleichung bestimmen wir zuerst die maximale Definitionsmenge.",
    exampleTranslation: "Before solving the radical equation we first determine the maximum domain.",
    grammarTip: "TU Berlin / KIT exams deduct points if extraneous roots aren't checked against Definitionsmenge!",
  },
  {
    id: "stk-fc-03",
    german: "der C-Test (Wortstamm & Endung ergänzen)",
    phonetic: "dair TSAY-test",
    category: "Deutsch Aufnahmeprüfung",
    english: "academic cloze test where the second half of every second word is missing",
    hindi: "Half-word completion exam (Studienkolleg admission test)",
    exampleDe: "Beim C-Test prüft die Universität sowohl Wortschatz als auch präzise Grammatikendungen.",
    exampleTranslation: "In the C-Test the university tests both vocabulary and exact grammatical endings.",
    grammarTip: "Count letters carefully and double-check adjective declensions (-en/-er/-es) and Kasus!",
  },
  {
    id: "stk-fc-04",
    german: "das Gleichungssystem (Gauß-Verfahren)",
    phonetic: "das GLY-khoongs-züs-taym",
    category: "Lineare Algebra",
    english: "system of linear equations (Gaussian elimination)",
    hindi: "Linear equations ka system (elimination vidhi)",
    exampleDe: "Dieses lineare Gleichungssystem mit drei Unbekannten lässt sich mit Gauß lösen.",
    exampleTranslation: "This linear system with three unknowns can be solved using Gaussian elimination.",
    grammarTip: "'lässt sich + Infinitiv' = can be [done] — very common in German math exam prompts.",
  },
  {
    id: "stk-fc-05",
    german: "die Wirkungsweise / die Reaktionsgleichung",
    phonetic: "dee VIR-koongs-vy-ze",
    category: "M-Kurs Naturwissenschaften",
    english: "mechanism of action / chemical reaction equation",
    hindi: "Kaam karne ka tareeka / rasayanik samikaran",
    exampleDe: "Erklären Sie anhand der Reaktionsgleichung das chemische Gleichgewicht.",
    exampleTranslation: "Explain chemical equilibrium using the reaction equation.",
    grammarTip: "'anhand + Genitiv' means 'on the basis of / by means of'.",
  },
  {
    id: "stk-fc-06",
    german: "sich verhalten proportional / umgekehrt proportional",
    phonetic: "zikh fer-HAL-ten pro-por-tsee-oh-NAHL",
    category: "Physik & Formeln",
    english: "to be directly / inversely proportional",
    hindi: "Sidhe / ulte anupaat mein hona",
    exampleDe: "Bei konstanter Temperatur verhält sich der Druck umgekehrt proportional zum Volumen.",
    exampleTranslation: "At constant temperature pressure behaves inversely proportional to volume.",
    grammarTip: "Always uses 'zu + Dativ' ('zum Volumen').",
  },
];

export const TRACK_FLASHCARD_DECKS: Record<
  string,
  { title: string; deck: FlashcardDeckItem[] }
> = {
  a1: {
    title: "A1 Greetings & Basics",
    deck: A1_GREETINGS_BASICS_DECK,
  },
  a2: {
    title: "A2 Office Vocabulary",
    deck: A2_OFFICE_VOCABULARY_DECK,
  },
  b1: {
    title: "B1 Job Interview Phrases",
    deck: B1_JOB_INTERVIEW_PHRASES_DECK,
  },
  b2: {
    title: "B2 Academic & Workplace Connectors",
    deck: B2_ACADEMIC_CONNECTORS_DECK,
  },
  pflege: {
    title: "Pflege Station Handover terms",
    deck: PFLEGE_STATION_HANDOVER_DECK,
  },
  fachsprache_medizin: {
    title: "Pflege Station Handover terms",
    deck: PFLEGE_STATION_HANDOVER_DECK,
  },
  studienkolleg: {
    title: "Studienkolleg Scientific & Aufnahmeprüfung Terms",
    deck: STUDIENKOLLEG_SCIENTIFIC_DECK,
  },
};

const EMPTY_DYNAMIC_DECKS: DynamicFlashcardDeck[] = [];

interface FlashcardEngineProps {
  title?: string;
  deck?: FlashcardDeckItem[];
  dynamicDecks?: DynamicFlashcardDeck[];
  masteredCardIds?: string[];
  onToggleMasteredCard?: (cardId: string, masteredCardIds: string[]) => void;
  onCompleteDeck?: () => void;
}

function FlashcardEngineInner({
  title = "A1 Greetings & Basics — Interactive Flashcards",
  deck = A1_GREETINGS_BASICS_DECK,
  dynamicDecks = EMPTY_DYNAMIC_DECKS,
  masteredCardIds,
  onToggleMasteredCard,
  onCompleteDeck,
}: FlashcardEngineProps) {
  const [isMounted, setIsMounted] = useState(false);
  useEffect(() => {
    setIsMounted(true);
  }, []);

  const safeInitialDeck = useMemo(
    () => (Array.isArray(deck) && deck.length > 0 ? deck : A1_GREETINGS_BASICS_DECK),
    [deck],
  );

  const validDynamicDecks = useMemo(
    () =>
      Array.isArray(dynamicDecks)
        ? dynamicDecks.filter((d) => d && Array.isArray(d.cards) && d.cards.length > 0)
        : EMPTY_DYNAMIC_DECKS,
    [dynamicDecks],
  );

  const deckOptions = useMemo(
    () => [
      { id: "core", title: title || "Core Vocabulary Deck", cards: safeInitialDeck },
      ...validDynamicDecks,
    ],
    [title, safeInitialDeck, validDynamicDecks],
  );

  const [selectedDeckId, setSelectedDeckId] = useState<string>("core");
  const [shuffledCards, setShuffledCards] = useState<FlashcardDeckItem[] | null>(null);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isFlipped, setIsFlipped] = useState(false);
  const [masteredIds, setMasteredIds] = useState<Record<string, boolean>>({});
  const [speaking, setSpeaking] = useState(false);
  const [ttsError, setTtsError] = useState<string | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const utteranceRef = useRef<SpeechSynthesisUtterance | null>(null);
  const ttsWatchdogRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const activeOption = useMemo(
    () =>
      deckOptions.find((d) => d.id === selectedDeckId) ||
      deckOptions[0] || { id: "core", title: "Core Vocabulary Deck", cards: safeInitialDeck },
    [deckOptions, selectedDeckId, safeInitialDeck],
  );

  const activeDeckCards = useMemo(() => {
    return Array.isArray(activeOption?.cards) && activeOption.cards.length > 0
      ? activeOption.cards
      : safeInitialDeck;
  }, [activeOption, safeInitialDeck]);

  const cards = shuffledCards || activeDeckCards;

  // Deck identity key: Only reset index and flip state when the deck actually changes
  const activeDeckIdentity = `${title}:::${selectedDeckId}`;
  const lastDeckIdentityRef = useRef<string>(activeDeckIdentity);

  useEffect(() => {
    if (lastDeckIdentityRef.current !== activeDeckIdentity) {
      lastDeckIdentityRef.current = activeDeckIdentity;
      setShuffledCards(null);
      setCurrentIndex(0);
      setIsFlipped(false);
      setTtsError(null);
    }
  }, [activeDeckIdentity]);

  // Stop audio + watchdog when the card/deck changes or the component unmounts
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
  }, [currentIndex, selectedDeckId]);

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

  // Sync externally persisted mastered card IDs (e.g., from Firestore UserProgress)
  useEffect(() => {
    if (!masteredCardIds || !Array.isArray(masteredCardIds)) return;
    const synced: Record<string, boolean> = {};
    for (const id of masteredCardIds) {
      if (id) synced[id] = true;
    }
    setMasteredIds(synced);
  }, [masteredCardIds]);

  const safeIndex = Math.min(currentIndex, Math.max(0, cards.length - 1));
  const currentCard = cards[safeIndex] || null;
  const masteredCount = cards.filter((c) => c && Boolean(masteredIds[c.id])).length;
  const progressPct = Math.round((masteredCount / Math.max(1, cards.length)) * 100);

  if (!isMounted) {
    return null;
  }

  if (!currentCard) {
    return (
      <div className="rounded-2xl border border-slate-200 bg-white p-8 text-center space-y-3 shadow-sm text-slate-900">
        <Layers className="mx-auto h-8 w-8 text-slate-400" />
        <h3 className="text-sm font-semibold text-slate-800">Keine Flashcards verfügbar</h3>
        <p className="text-xs text-slate-500">Diese Lektion enthält aktuell noch keine Vokabelkarten.</p>
      </div>
    );
  }

  const handleFlip = (e?: React.MouseEvent) => {
    if (e) {
      e.stopPropagation();
    }
    setIsFlipped((prev) => !prev);
  };

  const handleNext = (e?: React.MouseEvent) => {
    if (e) {
      e.stopPropagation();
    }
    setIsFlipped(false);
    const total = cards.length;
    if (total > 0) {
      setCurrentIndex((prev) => (prev + 1) % total);
    }
  };

  const handlePrev = (e?: React.MouseEvent) => {
    if (e) {
      e.stopPropagation();
    }
    setIsFlipped(false);
    const total = cards.length;
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

    const nextSet = new Set(
      masteredCardIds || Object.keys(updated).filter((id) => updated[id]),
    );
    if (nextState) {
      nextSet.add(currentCard.id);
    } else {
      nextSet.delete(currentCard.id);
    }
    onToggleMasteredCard?.(currentCard.id, Array.from(nextSet));

    const newCount = cards.filter((c) => Boolean(updated[c.id])).length;
    if (nextState && newCount === cards.length && onCompleteDeck) {
      onCompleteDeck();
    } else if (nextState && safeIndex < cards.length - 1) {
      setIsFlipped(false);
      setCurrentIndex(safeIndex + 1);
    }
  };

  const handleShuffle = (e?: React.MouseEvent) => {
    if (e) {
      e.stopPropagation();
    }
    const shuffled = [...activeDeckCards];
    for (let i = shuffled.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }
    setShuffledCards(shuffled);
    setCurrentIndex(0);
    setIsFlipped(false);
  };

  // Browser Web-Speech Synthesis fallback (SpeechSynthesisUtterance)
  const speakWithBrowserTts = (text: string) => {
    if (!text) {
      setSpeaking(false);
      return;
    }
    if (typeof window !== "undefined" && "speechSynthesis" in window && typeof SpeechSynthesisUtterance !== "undefined") {
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
  const handleListen = (e?: React.MouseEvent) => {
    if (e) {
      e.stopPropagation();
    }
    if (!isMounted || !currentCard) return;

    setTtsError(null);
    const frontText = (currentCard.frontText || currentCard.german || "").trim();
    if (!frontText) return;

    const audioUrl = currentCard.audioUrl?.trim() || `/api/tts?text=${encodeURIComponent(frontText)}`;

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
            .catch((err) => {
              console.warn("[FlashcardEngine] HTML5 audio play failed, falling back to Web Speech:", err);
              speakWithBrowserTts(frontText);
            });
        }
      } catch (err) {
        console.warn("[FlashcardEngine] HTML5 Audio exception:", err);
        speakWithBrowserTts(frontText);
      }
    } else {
      speakWithBrowserTts(frontText);
    }
  };

  const isMastered = Boolean(masteredIds[currentCard.id]);
  const cardKey = currentCard.id || `card-${safeIndex}`;

  return (
    <div key={`fc-root-${activeOption?.id || "core"}`} className="light-study rounded-2xl border border-slate-200 bg-white p-6 sm:p-8 space-y-6 text-slate-900 shadow-sm relative z-10 pointer-events-auto">
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
          const frontText = (currentCard.frontText || currentCard.german || "").trim();
          if (frontText) {
            speakWithBrowserTts(frontText);
          }
        }}
      />
      {/* Header & Progress */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <span key="fc-badge-interactive" className="inline-flex items-center gap-1.5 rounded-full border border-slate-200 bg-slate-100 px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.18em] text-slate-700">
              <Sparkles className="h-3 w-3 text-slate-600" />
              <span>Interactive Flashcard Deck</span>
            </span>
            {validDynamicDecks.length > 0 && (
              <span key="fc-badge-dynamic" className="inline-flex items-center gap-1 rounded-full border border-slate-200 bg-slate-100 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.14em] text-slate-600">
                <Layers className="h-3 w-3" />
                <span>{`+${validDynamicDecks.length} Factory JSON Deck${validDynamicDecks.length > 1 ? "s" : ""}`}</span>
              </span>
            )}
          </div>
          <h4 className="mt-2.5 text-lg sm:text-xl font-semibold tracking-tight text-slate-900 break-words hyphens-auto">
            <span key={`fc-title-${activeOption?.id || "core"}`}>{activeOption?.title || title}</span>
          </h4>
        </div>

        <div className="flex items-center gap-3 shrink-0">
          <div className="rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-2 text-right">
            <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-slate-500">
              Deck Progress
            </p>
            <p className="text-xs font-bold text-slate-900">
              <span key={`fc-progress-${masteredCount}-${cards.length}-${progressPct}`}>
                {`${masteredCount} / ${cards.length} Mastered (${progressPct}%)`}
              </span>
            </p>
          </div>
          <button
            type="button"
            onClick={handleShuffle}
            className="relative z-20 inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 hover:text-slate-900 transition shadow-xs cursor-pointer"
            title="Shuffle deck order"
          >
            <Shuffle className="h-3.5 w-3.5 text-slate-500" />
            <span className="hidden sm:inline">Shuffle</span>
          </button>
        </div>
      </div>

      {/* Dynamic JSON Deck Selector (Core + Question Bank / Catalog Decks) */}
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
                <span key={`opt-${opt.id}`}>{`${opt.title} (${(opt.cards || []).length})`}</span>
              </button>
            );
          })}
        </div>
      )}

      {/* Mastery Bar */}
      <div className="h-1.5 w-full rounded-full bg-slate-100 overflow-hidden">
        <div
          className="h-full rounded-full bg-slate-900 transition-all duration-300"
          style={{ width: `${Math.max(5, progressPct)}%` }}
        />
      </div>

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

      {/* Interactive Tap-to-Flip Card (Quizlet Clean Light Theme) */}
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
        className={`relative z-10 cursor-pointer pointer-events-auto rounded-3xl border-2 p-6 sm:p-10 min-h-[300px] h-auto flex flex-col justify-between transition-all duration-300 select-none text-slate-900 shadow-sm ${
          isFlipped
            ? "border-indigo-300 ring-2 ring-indigo-500/20 bg-indigo-50/20 shadow-md"
            : "border-slate-200 bg-white hover:border-slate-300 hover:shadow-md"
        }`}
      >
        <div className="flex flex-wrap items-center justify-between gap-3 pointer-events-auto">
          <span
            key={`fc-side-badge-${cardKey}-${isFlipped ? "back" : "front"}`}
            className="rounded-full border border-slate-200 bg-slate-100 px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.18em] text-slate-600"
          >
            {isFlipped
              ? "BACK · ENGLISH / HINDI & EXAMPLE"
              : `FRONT · ${(currentCard.category || "VOKABEL").toUpperCase()}`}
          </span>

          <div className="flex items-center gap-2.5">
            <span key={`fc-counter-${safeIndex}-${cards.length}`} className="text-xs font-medium text-slate-500">
              {`Card ${safeIndex + 1} / ${cards.length}`}
            </span>
            <button
              type="button"
              onClick={handleListen}
              className="relative z-50 cursor-pointer pointer-events-auto inline-flex items-center gap-1.5 rounded-xl bg-slate-900 text-white px-4 py-2 text-xs font-semibold uppercase tracking-[0.14em] transition hover:bg-slate-800 shadow-sm"
              title="Listen in German (de-DE)"
            >
              <Volume2 className={`h-3.5 w-3.5 text-white ${speaking ? "animate-pulse" : ""}`} />
              <span key={`fc-listen-${speaking ? "on" : "off"}`}>
                {speaking ? "Speaking..." : "LISTEN (DE-DE)"}
              </span>
            </button>
          </div>
        </div>

        {/* Center Content with smooth transition */}
        <div className="pointer-events-none transition-all duration-300 ease-out">
          {!isFlipped ? (
            <div key={`fc-front-${cardKey}`} className="my-8 space-y-3 text-center">
              <p className="text-2xl sm:text-4xl font-semibold tracking-tight leading-snug text-slate-900 break-words hyphens-auto">
                <span key={`fc-front-text-${cardKey}`}>{currentCard.frontText || currentCard.german}</span>
              </p>
              {currentCard.phonetic && (
                <p className="text-xs sm:text-sm font-medium text-slate-500 italic">
                  <span key={`fc-phonetic-${cardKey}`}>{`Pronunciation: ${currentCard.phonetic}`}</span>
                </p>
              )}
            </div>
          ) : (
            <div key={`fc-back-${cardKey}`} className="my-4 space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="rounded-2xl border border-slate-200 bg-slate-50/80 p-4">
                  <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-slate-500">
                    English Meaning
                  </p>
                  <p className="mt-1.5 text-sm sm:text-base font-semibold text-slate-900">
                    <span key={`fc-back-en-${cardKey}`}>{currentCard.backText || currentCard.english}</span>
                  </p>
                </div>
                <div className="rounded-2xl border border-amber-200 bg-amber-50/70 p-4">
                  <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-amber-800">
                    Hindi / Hinglish Translation
                  </p>
                  <p className="mt-1.5 text-sm sm:text-base font-semibold text-slate-900">
                    <span key={`fc-back-hi-${cardKey}`}>{currentCard.hindi || "—"}</span>
                  </p>
                </div>
              </div>

              {(currentCard.exampleDe || currentCard.exampleTranslation) && (
                <div key={`fc-ex-box-${cardKey}`} className="rounded-2xl border border-slate-200 bg-slate-50/80 p-4 space-y-1">
                  <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-slate-500">
                    Example in Real German Life
                  </p>
                  {currentCard.exampleDe && (
                    <p className="text-sm font-semibold text-slate-900">
                      <span key={`fc-ex-de-${cardKey}`}>{currentCard.exampleDe}</span>
                    </p>
                  )}
                  {currentCard.exampleTranslation && (
                    <p className="text-xs text-slate-600">
                      <span key={`fc-ex-tr-${cardKey}`}>{currentCard.exampleTranslation}</span>
                    </p>
                  )}
                </div>
              )}

              {currentCard.grammarTip && (
                <p key={`fc-tip-${cardKey}`} className="text-xs text-emerald-800 bg-emerald-50 border border-emerald-200 rounded-xl px-3.5 py-2.5 font-medium">
                  <span>{`Pro Tip: ${currentCard.grammarTip}`}</span>
                </p>
              )}
            </div>
          )}
        </div>

        {/* Tap Hint Footer */}
        <div className="flex items-center justify-between pt-4 border-t border-slate-100 text-xs pointer-events-none">
          <span className="font-medium flex items-center gap-1.5 text-slate-500">
            <RotateCw className={`h-3.5 w-3.5 transition-transform duration-300 ${isFlipped ? "rotate-180 text-indigo-600" : ""}`} />
            <span key={`fc-hint-${isFlipped ? "back" : "front"}`}>
              {isFlipped
                ? "Tap anywhere on card to view German Front"
                : "Tap card to flip to English & Hindi translation"}
            </span>
          </span>

          {isMastered && (
            <span key={`fc-mastered-badge-${cardKey}`} className="inline-flex items-center gap-1 rounded-full border border-emerald-300 bg-emerald-50 px-2.5 py-0.5 text-[10px] font-semibold text-emerald-700">
              <CheckCircle2 className="h-3 w-3" />
              <span>Mastered</span>
            </span>
          )}
        </div>
      </div>

      {/* Controls & Quick Index */}
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
            <RotateCw className={`h-3.5 w-3.5 transition-transform duration-300 ${isFlipped ? "rotate-180 text-indigo-600" : "text-slate-500"}`} />
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
                : "border border-slate-200 bg-white text-slate-700 hover:bg-slate-50"
            }`}
          >
            <CheckCircle2 className="h-4 w-4" />
            <span key={`fc-master-btn-${cardKey}-${isMastered ? "yes" : "no"}`}>
              {isMastered ? "Mastered ✓" : "Mark Mastered"}
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

      {/* Quick Number Pills */}
      <div className="flex flex-wrap items-center gap-1.5 pt-1">
        {(cards || []).map((c, idx) => {
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
              className={`relative z-50 cursor-pointer pointer-events-auto h-7 w-7 rounded-lg text-[11px] font-semibold transition ${
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
  );
}

export function FlashcardEngine(props: FlashcardEngineProps) {
  return (
    <React.Suspense fallback={<p className="text-sm text-slate-500 py-4">Loading Workspace...</p>}>
      <FlashcardEngineInner {...props} />
    </React.Suspense>
  );
}
