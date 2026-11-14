#!/usr/bin/env python3
"""
GTF 16-Employer Automated Content Factory (Vertex AI + Google Cloud TTS)
------------------------------------------------------------------------
Re-wired Interactive Roadmap & Flashcard JSON Engine across 3 Core Departments:

  - Department A: General German (A1–B2) — 5 Interactive Hören/Lesen JSON modules + Flashcards + MP3s
  - Department B: Studienkolleg (M/T/W/G-Kurs) — 2 Aufnahmeprüfung JSON modules + Flashcards
  - Department C: Pflege & Medizin (FSP) — 2 Clinical Case Study JSON modules + Flashcards + MP3s

Enforces a strict Billing Safety Cap (MAX 10 items per execution) to stay within
Google Cloud Free Tier limits. Outputs clean JSON payloads directly into:
  - `data/question_banks/<id>.json` (for Roadmap Step 2/3 + Dynamic Flashcards)
  - `data/question_banks/factory_daily_batch_1.json`
  - `data/catalog.json` (feeding Dashboard & Studienkolleg Roadmaps + FlashcardEngine)
  - `public/audio/hoeren/*.mp3` (via Google Cloud TTS)
  - Cloud Firestore (`materials` & `questionBanks`)
"""

from __future__ import annotations

import argparse
import io
import json
import logging
import os
import sys
import time
import urllib.error
import urllib.request
import warnings
from datetime import datetime, timezone
from pathlib import Path
from typing import Any, Dict, List, Optional, Tuple

import google.auth
from dotenv import load_dotenv
from google import genai
from google.auth.transport.requests import Request
from google.cloud import aiplatform, texttospeech
from google.genai import types as genai_types
from google.oauth2 import service_account

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s | %(levelname)-7s | [16EmployerFactory] %(message)s",
    datefmt="%Y-%m-%d %H:%M:%S",
)
logger = logging.getLogger("run_daily_factory")

# ── Paths & Safety Cap Constants ─────────────────────────────────────────────
SCRIPT_DIR = Path(__file__).resolve().parent
WORKSPACE_ROOT = (
    SCRIPT_DIR.parent.parent
    if SCRIPT_DIR.parent.name == "gtf-exam-portal"
    else SCRIPT_DIR.parent
)
PORTAL_DIR = WORKSPACE_ROOT / "gtf-exam-portal"
ENV_FILE = PORTAL_DIR / ".env.local"
DATA_DIR = PORTAL_DIR / "data"
CATALOG_PATH = DATA_DIR / "catalog.json"
QUESTION_BANKS_DIR = DATA_DIR / "question_banks"
PDF_DIR = DATA_DIR / "pdfs"
AUDIO_DIR = PORTAL_DIR / "public" / "audio" / "hoeren"

PROJECT_ID = "gateway-to-future"
VERTEX_LOCATION = "us-central1"
BILLING_SAFETY_CAP_MAX_ITEMS = 10


# ── Department Specs (Batch 1 = 5 + 2 + 2 = 9 items <= Cap 10) ───────────────
BATCH_SPECS: List[Dict[str, Any]] = [
    # DEPARTMENT A: General German A1-B2 (5 Modules: 3 Hören + 2 Lesen)
    {
        "id": "wb-factory-a1-hoeren-batch1",
        "department": "Department A: General German A1-B2",
        "divisionId": "sprachakademie",
        "level": "a1",
        "skill": "hoeren",
        "title": "A1 Hören — Ankunft am Berliner Hauptbahnhof & Bürgeramt-Anmeldung",
        "subtitle": "Daily Factory · Interactive Audio Dialogue, Flashcards & Hindi/English Musterlösung",
        "coverColor": "#1E3A8A",
        "topics": ["Hörverstehen", "Alltag Berlin", "Bürgeramt", "Flashcards DE/EN/HI"],
        "audioFile": "factory_a1_hoeren_batch1.mp3",
        "promptTopic": (
            "Create a Goethe A1 level German listening dialogue (6-8 short natural turns) between Priya (female Indian newcomer) "
            "and Herr Müller (male Berlin Bürgeramt / Bahn info clerk) about registering an address (Anmeldung), finding Gleis 4, and appointment times. "
            "Generate 8 high-yield A1 flashcards (with German phrase, English, Hindi/Hinglish, exampleDe, exampleTranslation, grammarTip) AND 8 MCQ comprehension & grammar questions with English + Hinglish Musterlösung."
        ),
    },
    {
        "id": "wb-factory-a2-lesen-batch1",
        "department": "Department A: General German A1-B2",
        "divisionId": "sprachakademie",
        "level": "a2",
        "skill": "lesen",
        "title": "A2 Lesen — Dienstplan, Hausordnung & Krankmeldung im Betrieb",
        "subtitle": "Daily Factory · Workplace Reading JSON, Flashcards & Hindi/English Musterlösung",
        "coverColor": "#134074",
        "topics": ["Leseverstehen", "Arbeitswelt", "Krankmeldung", "Flashcards DE/EN/HI"],
        "audioFile": None,
        "promptTopic": (
            "Create an authentic Goethe/telc A2 reading passage (~220 words) consisting of a company intranet notice about shift schedules (Dienstplan), "
            "calling in sick before 08:00 (Krankmeldung & eAU), and break rules in Berlin. "
            "Generate 8 A2 Office Vocabulary flashcards AND 8 MCQ questions with step-by-step English + Hinglish Musterlösung."
        ),
    },
    {
        "id": "wb-factory-b1-hoeren-batch1",
        "department": "Department A: General German A1-B2",
        "divisionId": "sprachakademie",
        "level": "b1",
        "skill": "hoeren",
        "title": "B1 Hören — Beratungsgespräch bei der Agentur für Arbeit & Weiterbildung",
        "subtitle": "Daily Factory · Exam Audio Simulation, Flashcards & Hindi/English Musterlösung",
        "coverColor": "#0F4C81",
        "topics": ["Hörverstehen B1", "Beruf & Anerkennung", "Nebensätze", "Flashcards DE/EN/HI"],
        "audioFile": "factory_b1_hoeren_batch1.mp3",
        "promptTopic": (
            "Create a Goethe/telc B1 German listening dialogue (8 turns) between a female career advisor (Frau Becker) at Agentur für Arbeit Berlin "
            "and a male applicant (Amit) discussing Berufsanerkennung, Bildungsgutschein, and B2 evening courses. "
            "Generate 8 B1 Job Interview & Career flashcards AND 8 MCQ questions testing detail, attitude, and B1 connectors (obwohl, damit, deshalb) with Hindi/English Musterlösung."
        ),
    },
    {
        "id": "wb-factory-b2-hoeren-batch1",
        "department": "Department A: General German A1-B2",
        "divisionId": "sprachakademie",
        "level": "b2",
        "skill": "hoeren",
        "title": "B2 Hören — Klinik-Symposium: Digitalisierung & Personalmanagement im Krankenhaus",
        "subtitle": "Daily Factory · B2 Radio Discussion, Flashcards & Hindi/English Musterlösung",
        "coverColor": "#0A1628",
        "topics": ["Hörverstehen B2", "Digitalisierung", "Krankenhaus", "Flashcards DE/EN/HI"],
        "audioFile": "factory_b2_hoeren_batch1.mp3",
        "promptTopic": (
            "Create a telc/Goethe B2 level German panel interview (8 rich turns) between moderator Dr. Sabine Weber (female) and hospital director "
            "Prof. Tobias Hartmann (male) on electronic patient records (ePA), international nursing teams in Berlin, and Schichtdienst relief. "
            "Generate 8 B2 Academic & Hospital Connectors flashcards AND 8 B2 MCQ questions (Nominalstil, Zweiteilige Konnektoren, inference) with English + Hindi Musterlösung."
        ),
    },
    {
        "id": "wb-factory-b2-lesen-batch1",
        "department": "Department A: General German A1-B2",
        "divisionId": "sprachakademie",
        "level": "b2",
        "skill": "lesen",
        "title": "B2 Lesen — Tarifvertrag, Arbeitsrecht & Berufsanerkennung in Deutschland",
        "subtitle": "Daily Factory · Editorial Reading JSON, Flashcards & Musterlösung",
        "coverColor": "#1E293B",
        "topics": ["Leseverstehen B2", "Arbeitsrecht", "Konjunktiv II", "Flashcards DE/EN/HI"],
        "audioFile": None,
        "promptTopic": (
            "Create a B2 reading dossier (~260 words) analyzing German labor contracts (Arbeitsvertrag), TVöD salary tiers, Probezeit rules, and "
            "recognition under §16d AufenthG / §81a Beschleunigtes Fachkräfteverfahren. "
            "Generate 8 B2 Labor Law & Nominalstil flashcards AND 8 B2 MCQ comprehension questions with English + Hindi Musterlösung."
        ),
    },
    # DEPARTMENT B: Studienkolleg M/T/W/G-Kurs (2 Aufnahmeprüfung Interactive JSONs)
    {
        "id": "wb-factory-stk-math-batch1",
        "department": "Department B: Studienkolleg M/T/W/G-Kurs",
        "divisionId": "studienkolleg",
        "track": "t_kurs",
        "level": "b2",
        "skill": "lesen",
        "title": "Studienkolleg T/M-Kurs Aufnahmeprüfung Mathematik — Analysis, Vektoren & Gleichungssysteme",
        "subtitle": "Daily Factory · TU Berlin / KIT JSON Mock, Flashcards & Formula Derivations",
        "coverColor": "#B45309",
        "topics": ["T-Kurs / M-Kurs", "Aufnahmeprüfung Mathe", "Differentialrechnung", "Flashcards DE/EN/HI"],
        "audioFile": None,
        "promptTopic": (
            "Create a TU Berlin / KIT Studienkolleg T-Kurs & M-Kurs Mathematik Aufnahmeprüfung interactive JSON module in German. "
            "Passage should present 4 formula theory blocks (quadratische Gleichungen, Logarithmen, Ableitungen/Extremwerte, lineare Gleichungssysteme & Vektoren). "
            "Generate 8 German Math terminology flashcards AND 8 authentic calculation MCQ problems with step-by-step formula derivations in Musterlösung."
        ),
    },
    {
        "id": "wb-factory-stk-ctest-batch1",
        "department": "Department B: Studienkolleg M/T/W/G-Kurs",
        "divisionId": "studienkolleg",
        "track": "m_kurs",
        "level": "b2",
        "skill": "lesen",
        "title": "Studienkolleg M/T/W/G-Kurs Aufnahmeprüfung Deutsch — Authentischer C-Test & Wissenschaftssprache",
        "subtitle": "Daily Factory · LMU / Charité JSON Mock, Flashcards & Grammatik-Herleitung",
        "coverColor": "#92400E",
        "topics": ["C-Test Training", "Wissenschaftssprache", "M/T/W/G-Kurs", "Flashcards DE/EN/HI"],
        "audioFile": None,
        "promptTopic": (
            "Create a Studienkolleg Aufnahmeprüfung Deutsch C-Test & academic reading JSON module (~240 words passage on biomedical research / climate engineering "
            "with scientific German terminology). "
            "Generate 8 Studienkolleg Wissenschaftssprache flashcards AND 8 MCQ questions testing exact word stems, Partizipialattribute, and Präpositionalrektion with English/Hindi explanations."
        ),
    },
    # DEPARTMENT C: Pflege & Medizin (2 FSP Case Study JSONs + MP3s)
    {
        "id": "wb-factory-fsp-anamnese-batch1",
        "department": "Department C: Pflege & Medizin",
        "divisionId": "fachsprache_medizin",
        "level": "b2",
        "skill": "hoeren",
        "title": "FSP Medizin & Pflege Fallstudie 1 — Strukturierter Anamnesebogen (Akutes Koronarsyndrom)",
        "subtitle": "Daily Factory · Arzt-Patient-Anamnese Audio, Clinical Flashcards & Quiz",
        "coverColor": "#065F46",
        "topics": ["Fachsprachenprüfung", "Anamnesebogen", "Kardiologie", "Flashcards DE/EN/HI"],
        "audioFile": "factory_fsp_anamnese_batch1.mp3",
        "promptTopic": (
            "Create a German Fachsprachenprüfung (FSP) Medizin & Pflege Case Study 1 dialogue (8 realistic clinical turns) between Dr. Kapoor / Pflegekraft (female) "
            "and Herr Richter, a 58-year-old patient (male) presenting to Charité Notaufnahme with retrosternal chest pain (retrosternale Schmerzen), dyspnea, "
            "hypertension, and Metformin/Ramipril medication history. "
            "Generate 8 Pflege & Anamnese clinical flashcards AND 8 clinical German MCQ questions with Hindi/English Musterlösung."
        ),
    },
    {
        "id": "wb-factory-fsp-isbar-batch1",
        "department": "Department C: Pflege & Medizin",
        "divisionId": "fachsprache_medizin",
        "level": "b2",
        "skill": "hoeren",
        "title": "FSP Pflege & Medizin Fallstudie 2 — ISBAR Übergabeprotokoll & Postoperative Überwachung",
        "subtitle": "Daily Factory · Schichtübergabe Audio, Station Handover Flashcards & Quiz",
        "coverColor": "#047857",
        "topics": ["ISBAR Übergabe", "Pflegedokumentation", "Post-OP Versorgung", "Flashcards DE/EN/HI"],
        "audioFile": "factory_fsp_isbar_batch1.mp3",
        "promptTopic": (
            "Create a German Pflegefachkraft / FSP Case Study 2 shift handover dialogue (8 realistic turns) using the strict ISBAR framework (Identify, Situation, "
            "Background, Assessment, Recommendation) between Fräulein Hoffmann (female outgoing nurse) and Pfleger Lukas (male incoming nurse) at Vivantes Klinikum Berlin "
            "for a post-operative hip arthroplasty (Hüft-TEP) patient with mild hypotension and Drainagen-Monitoring. "
            "Generate 8 Pflege Station Handover flashcards AND 8 clinical MCQ questions with Hindi/English Musterlösung."
        ),
    },
]


# ── Google Cloud Auth & Clients ──────────────────────────────────────────────
def init_google_clients() -> Tuple[Any, Optional[texttospeech.TextToSpeechClient], List[str]]:
    """Load Service Account (CI/GitHub Actions) or ADC, initialize Vertex AI SDK + Cloud TTS."""
    if ENV_FILE.exists():
        load_dotenv(dotenv_path=ENV_FILE, override=False)

    sa_email = (os.getenv("GOOGLE_CLIENT_EMAIL") or "").strip()
    sa_private_key = (
        (os.getenv("GOOGLE_PRIVATE_KEY") or "")
        .strip()
        .strip('"')
        .replace("\\n", "\n")
    )

    creds: Any
    detected_project: Optional[str] = None
    if sa_email and "BEGIN PRIVATE KEY" in sa_private_key:
        sa_info = {
            "type": "service_account",
            "project_id": PROJECT_ID,
            "client_email": sa_email,
            "private_key": sa_private_key,
            "token_uri": "https://oauth2.googleapis.com/token",
        }
        creds = service_account.Credentials.from_service_account_info(
            sa_info,
            scopes=["https://www.googleapis.com/auth/cloud-platform"],
        )
        detected_project = PROJECT_ID
        logger.info("Initialized Google Service Account credentials from env (%s)", sa_email)
    else:
        creds, detected_project = google.auth.default(
            scopes=["https://www.googleapis.com/auth/cloud-platform"]
        )
        if hasattr(creds, "with_quota_project"):
            creds = creds.with_quota_project(PROJECT_ID)
        logger.info(
            "Google ADC initialized (project=%s, detected=%s)", PROJECT_ID, detected_project
        )

    creds.refresh(Request())

    aiplatform.init(project=PROJECT_ID, location=VERTEX_LOCATION, credentials=creds)
    logger.info(
        "Vertex AI aiplatform SDK initialized (project=%s, location=%s)",
        PROJECT_ID,
        VERTEX_LOCATION,
    )

    tts_client = texttospeech.TextToSpeechClient(credentials=creds)
    de_voices = [
        v.name for v in tts_client.list_voices(language_code="de-DE").voices
    ]
    logger.info("Google Cloud TTS ready (%d de-DE voices available)", len(de_voices))
    return creds, tts_client, de_voices


def select_voice(preferred: List[str], available: List[str], default_fallback: str) -> str:
    """Pick highest-priority Journey / Neural2 voice present in project voice catalog."""
    avail_set = set(available)
    for v in preferred:
        if v in avail_set:
            return v
    return default_fallback if default_fallback in avail_set else (available[0] if available else "de-DE-Neural2-G")


_VERTEX_AVAILABLE: Optional[bool] = None


# ── Curated Fallback Flashcards & Exam JSON ──────────────────────────────────
CURATED_FLASHCARDS_BY_ID: Dict[str, List[Dict[str, str]]] = {
    "wb-factory-a1-hoeren-batch1": [
        {
            "german": "die Anmeldung (beim Bürgeramt)",
            "phonetic": "dee AHN-mel-doong",
            "category": "Berlin Registration",
            "english": "address registration at the citizen office",
            "hindi": "Bürgeramt mein ghar ka address register karwana",
            "exampleDe": "Nach der Ankunft in Berlin braucht man innerhalb von 14 Tagen die Anmeldung.",
            "exampleTranslation": "After arriving in Berlin you need address registration within 14 days.",
            "grammarTip": "Nouns ending in '-ung' always take feminine article 'die'.",
        },
        {
            "german": "das Gleis (Gleis vier)",
            "phonetic": "das GLYSE",
            "category": "Train Station",
            "english": "the railway platform (Platform 4)",
            "hindi": "Railway platform",
            "exampleDe": "Der ICE nach München fährt heute von Gleis vier ab.",
            "exampleTranslation": "The ICE to Munich departs from Platform 4 today.",
            "grammarTip": "Separable verb 'abfahren': 'fährt ... ab'.",
        },
        {
            "german": "einen Termin buchen / vereinbaren",
            "phonetic": "EYE-nen ter-MEEN fer-EYEN-bah-ren",
            "category": "Appointments",
            "english": "to book / arrange an appointment",
            "hindi": "Appointment book karna",
            "exampleDe": "Ich möchte für nächsten Montag einen Termin beim Bürgeramt vereinbaren.",
            "exampleTranslation": "I would like to book an appointment at the citizen office for next Monday.",
            "grammarTip": "'der Termin' becomes masculine Accusative: 'einen Termin'.",
        },
        {
            "german": "die Wohnungsgeberbestätigung",
            "phonetic": "dee VOH-noongs-gay-ber-be-shtay-tee-goong",
            "category": "Documents",
            "english": "landlord confirmation of residence",
            "hindi": "Makan malik ka residence confirmation letter",
            "exampleDe": "Ohne Wohnungsgeberbestätigung kann man sich nicht anmelden.",
            "exampleTranslation": "Without a landlord confirmation letter you cannot register.",
            "grammarTip": "Read long German compounds from back to front: Bestätigung + Geber + Wohnung.",
        },
        {
            "german": "der Reisepass und das Visum",
            "phonetic": "dair RY-ze-pas oont das VEE-zoom",
            "category": "Identity",
            "english": "the passport and the visa",
            "hindi": "Passport aur visa",
            "exampleDe": "Bitte bringen Sie Ihren gültigen Reisepass zum Termin mit.",
            "exampleTranslation": "Please bring your valid passport with you to the appointment.",
            "grammarTip": "'mitbringen' is separable: 'bringen Sie ... mit'.",
        },
    ],
    "wb-factory-a2-lesen-batch1": [
        {
            "german": "der Dienstplan",
            "phonetic": "dair DEENST-plahn",
            "category": "Workplace",
            "english": "duty roster / shift schedule",
            "hindi": "Office ya hospital ka duty time-table",
            "exampleDe": "Der neue Dienstplan hängt ab Freitag im Pausenraum aus.",
            "exampleTranslation": "The new shift schedule is posted in the break room starting Friday.",
            "grammarTip": "'ab + Dativ/Zeitpunkt' expresses from a specific day onward.",
        },
        {
            "german": "sich rechtzeitig krankmelden",
            "phonetic": "zikh REKHT-tsy-tikh KRANK-mel-den",
            "category": "HR Rules",
            "english": "to call in sick in good time",
            "hindi": "Samay par bimaari ki chhutti ki khabar dena",
            "exampleDe": "Alle Mitarbeitenden müssen sich vor acht Uhr telefonisch krankmelden.",
            "exampleTranslation": "All employees must call in sick before 8 a.m.",
            "grammarTip": "Reflexive pronoun matches subject: 'ich melde mich krank', 'wir melden uns krank'.",
        },
        {
            "german": "die Hausordnung beachten",
            "phonetic": "dee HOWS-ord-noong be-AKH-ten",
            "category": "Building Rules",
            "english": "to observe the building / house rules",
            "hindi": "Building ya hostel ke niyamon ka palan karna",
            "exampleDe": "Bitte beachten Sie die Hausordnung und halten Sie Fluchtwege frei.",
            "exampleTranslation": "Please observe the house rules and keep emergency exits clear.",
            "grammarTip": "'beachten' takes Accusative without a preposition.",
        },
        {
            "german": "die Ruhepause einhalten",
            "phonetic": "dee ROO-e-pow-ze EYEN-hal-ten",
            "category": "Break Times",
            "english": "to observe the mandatory rest break",
            "hindi": "Kaam ke beech zaroori aaram ka samay lena",
            "exampleDe": "Bei mehr als sechs Stunden Arbeit ist eine 30-minütige Pause Pflicht.",
            "exampleTranslation": "When working over six hours, a 30-minute break is mandatory.",
            "grammarTip": "German labor law (Arbeitszeitgesetz) strictly enforces rest breaks.",
        },
        {
            "german": "der Schichtwechsel",
            "phonetic": "dair SHIKHT-vek-sel",
            "category": "Shifts",
            "english": "shift change / shift swap",
            "hindi": "Shift badalna (subah se shaam ya raat)",
            "exampleDe": "Ein Schichtwechsel muss zuerst vom Teamleiter genehmigt werden.",
            "exampleTranslation": "A shift swap must first be approved by the team lead.",
            "grammarTip": "Passive with modal verb: 'muss ... genehmigt werden'.",
        },
    ],
    "wb-factory-b1-hoeren-batch1": [
        {
            "german": "die Agentur für Arbeit",
            "phonetic": "dee ah-gen-TOOR für AR-bite",
            "category": "German Agencies",
            "english": "Federal Employment Agency",
            "hindi": "Germany ka sarkari rozgar karyalaya",
            "exampleDe": "Die Agentur für Arbeit berät Fachkräfte zu Kursen und Jobsuche.",
            "exampleTranslation": "The Federal Employment Agency advises specialists on courses and job hunting.",
            "grammarTip": "Singular present of 'beraten' undergoes vowel change: ich berate, sie berät.",
        },
        {
            "german": "der Bildungsgutschein",
            "phonetic": "dair BIL-doongs-goot-shyne",
            "category": "Funding",
            "english": "funded continuing education voucher",
            "hindi": "Sarkari training ya course funding voucher",
            "exampleDe": "Mit einem Bildungsgutschein werden zertifizierte Sprach- und Fachkurse finanziert.",
            "exampleTranslation": "With an education voucher, certified language and specialist courses are funded.",
            "grammarTip": "Present Passive plural: 'werden ... finanziert'.",
        },
        {
            "german": "die Berufsanerkennung beantragen",
            "phonetic": "dee be-ROOFS-an-er-ken-noong be-AN-trah-gen",
            "category": "Career Pathways",
            "english": "to apply for professional qualification recognition",
            "hindi": "Degree ya nursing/medical license ki recognition apply karna",
            "exampleDe": "Für reglementierte Berufe müssen Sie zuerst die Berufsanerkennung beantragen.",
            "exampleTranslation": "For regulated professions you must first apply for professional recognition.",
            "grammarTip": "'beantragen' is inseparable ('be-'), Past Participle: 'beantragt'.",
        },
        {
            "german": "sich weiterbilden (berufsbegleitend)",
            "phonetic": "zikh VY-ter-bil-den",
            "category": "Upskilling",
            "english": "to pursue further training (alongside work)",
            "hindi": "Naukri ke saath aage ki training ya course karna",
            "exampleDe": "Ich möchte mich abends berufsbegleitend auf B2-Niveau weiterbilden.",
            "exampleTranslation": "I would like to upskill to B2 level alongside work in the evenings.",
            "grammarTip": "Adverb '-begleitend' means accompanying an activity (work/study).",
        },
        {
            "german": "obwohl / deshalb (Konnektoren)",
            "phonetic": "op-VOHL / DES-halp",
            "category": "B1 Grammar",
            "english": "although (subordinating) / therefore (adverbial Pos 1/3)",
            "hindi": "Haalanki / Isliye",
            "exampleDe": "Obwohl der Kurs anspruchsvoll ist, macht er mir großen Spaß.",
            "exampleTranslation": "Although the course is demanding, I enjoy it very much.",
            "grammarTip": "'obwohl' kicks verb to end of clause; main clause starts immediately with Verb!",
        },
    ],
    "wb-factory-b2-hoeren-batch1": [
        {
            "german": "die elektronische Patientenakte (ePA)",
            "phonetic": "dee e-lek-TROH-ni-she pa-tsee-EN-ten-ak-te",
            "category": "Digital Health",
            "english": "electronic patient medical record",
            "hindi": "Mareez ka digital medical file / record",
            "exampleDe": "Durch die ePA stehen Laborbefunde und Medikationspläne sofort digital bereit.",
            "exampleTranslation": "Through the ePA, lab findings and medication plans are immediately available digitally.",
            "grammarTip": "'bereitstehen' separates: 'stehen ... bereit'.",
        },
        {
            "german": "die Entlastung im Schichtdienst",
            "phonetic": "dee ent-LAS-toong im SHIKHT-deenst",
            "category": "Hospital Management",
            "english": "workload relief during shift work",
            "hindi": "Hospital shifts mein kaam ka bojh halka karna",
            "exampleDe": "Digitale Spracherkennung sorgt für eine spürbare Entlastung des Pflegepersonals.",
            "exampleTranslation": "Digital voice documentation brings noticeable workload relief for nursing staff.",
            "grammarTip": "'sorgen für + Akkusativ' = to ensure / provide for something.",
        },
        {
            "german": "das Onboarding internationaler Fachkräfte",
            "phonetic": "das ON-bor-ding",
            "category": "HR Strategy",
            "english": "structured onboarding of international specialists",
            "hindi": "Videshi specialists ki hospital onboarding training",
            "exampleDe": "Ein strukturiertes Onboarding reduziert die Fluktuation im ersten Berufsjahr erheblich.",
            "exampleTranslation": "Structured onboarding significantly reduces staff turnover in the first year.",
            "grammarTip": "'internationaler Fachkräfte' uses Genitive plural without an article ('-er' ending).",
        },
        {
            "german": "der Datenschutz (DSGVO)",
            "phonetic": "dair DAH-ten-shoots",
            "category": "Compliance",
            "english": "data protection (GDPR)",
            "hindi": "Patient data privacy aur suraksha niyam (GDPR)",
            "exampleDe": "Bei jeder digitalen Kliniksoftware genießt der Datenschutz höchste Priorität.",
            "exampleTranslation": "Data protection enjoys the highest priority in all hospital software.",
            "grammarTip": "Fixed phrase: 'höchste Priorität genießen' (sounds crisp in B2 speaking/writing).",
        },
        {
            "german": "sowohl ... als auch",
            "phonetic": "zo-VOHL ... als OWKH",
            "category": "B2 Double Connector",
            "english": "both ... and also",
            "hindi": "Na sirf ... balki ... bhi (dono)",
            "exampleDe": "Digitalisierung verbessert sowohl die Versorgungsqualität als auch die Patientensicherheit.",
            "exampleTranslation": "Digitalization improves both care quality and patient safety.",
            "grammarTip": "Both noun phrases must stay in the exact same grammatical case!",
        },
    ],
    "wb-factory-b2-lesen-batch1": [
        {
            "german": "der Tarifvertrag (TVöD)",
            "phonetic": "dair tah-REEF-fer-trahk",
            "category": "Labor Law",
            "english": "collective bargaining agreement (Public Sector)",
            "hindi": "Sarkari hospital/staff ka standard salary agreement",
            "exampleDe": "Pflegekräfte an kommunalen Kliniken werden nach TVöD fair vergütet.",
            "exampleTranslation": "Nurses at municipal hospitals are fairly paid under the TVöD collective agreement.",
            "grammarTip": "Always check Entgeltgruppe (pay grade) and Erfahrungsstufe (experience step).",
        },
        {
            "german": "die Probezeit (max. 6 Monate)",
            "phonetic": "dee PROH-be-tsyte",
            "category": "Contract Terms",
            "english": "probationary period (max 6 months)",
            "hindi": "Shuruati pariksha kaal (6 mahine)",
            "exampleDe": "Während der sechsmonatigen Probezeit beträgt die Kündigungsfrist zwei Wochen.",
            "exampleTranslation": "During the six-month probation period, the notice period is two weeks.",
            "grammarTip": "'während + Genitiv': 'während der sechsmonatigen Probezeit'.",
        },
        {
            "german": "das beschleunigte Fachkräfteverfahren (§ 81a)",
            "phonetic": "das be-SHLOY-nikh-te FAKH-kref-te-fer-fah-ren",
            "category": "Migration Law",
            "english": "fast-track skilled worker immigration procedure (§ 81a)",
            "hindi": "Germany ka fast-track work visa process (§ 81a)",
            "exampleDe": "Über § 81a AufenthG verkürzen Arbeitgeber die Visabearbeitung für Pflegekräfte deutlich.",
            "exampleTranslation": "Via Section 81a AufenthG, employers significantly shorten visa processing for nurses.",
            "grammarTip": "'das Verfahren' keeps the same form in Singular & Plural.",
        },
        {
            "german": "der Kündigungsschutz",
            "phonetic": "dair KÜN-dee-goongs-shoots",
            "category": "Worker Rights",
            "english": "statutory protection against unfair dismissal",
            "hindi": "Naukri se bina kaaran nikalne se suraksha",
            "exampleDe": "Nach Ablauf der Probezeit greift in Deutschland der gesetzliche Kündigungsschutz.",
            "exampleTranslation": "After probation ends, statutory dismissal protection applies in Germany.",
            "grammarTip": "'greifen' in legal German means 'to take effect / apply'.",
        },
        {
            "german": "die Überstundenvergütung",
            "phonetic": "dee Ü-ber-shtoon-den-fer-gü-toong",
            "category": "Compensation",
            "english": "overtime pay / compensation",
            "hindi": "Overtime kaam ka atirikta vetan ya chhutti",
            "exampleDe": "Im Arbeitsvertrag ist geregelt, ob Überstunden ausgezahlt oder durch Freizeit ausgeglichen werden.",
            "exampleTranslation": "The employment contract governs whether overtime is paid or compensated via time off.",
            "grammarTip": "'durch Freizeit ausgleichen' = to compensate with time off in lieu.",
        },
    ],
    "wb-factory-stk-math-batch1": [
        {
            "german": "der Scheitelpunkt einer Parabel",
            "phonetic": "dair SHY-tel-poonkt",
            "category": "Algebra / Analysis",
            "english": "vertex of a parabola",
            "hindi": "Parabola ka vertex (uchchtam/nimnatam bindu)",
            "exampleDe": "Mithilfe der quadratischen Ergänzung bestimmt man exakt den Scheitelpunkt S(d|e).",
            "exampleTranslation": "Using completing the square, one determines the exact vertex S(d|e).",
            "grammarTip": "Key phrase in T-Kurs exams: 'quadratische Ergänzung' = completing the square.",
        },
        {
            "german": "die Nullstelle berechnen",
            "phonetic": "dee NOOL-shtel-le be-REKH-nen",
            "category": "Curve Sketching",
            "english": "to calculate the x-intercept / zero root",
            "hindi": "Function f(x)=0 ke roots nikalna",
            "exampleDe": "Für die Nullstellen setzt man die Funktion f(x) gleich null und faktorisiert.",
            "exampleTranslation": "For the roots one sets the function f(x) equal to zero and factors it.",
            "grammarTip": "Plural is 'die Nullstellen'; always factor out common 'x' first!",
        },
        {
            "german": "das Skalarprodukt zweier Vektoren",
            "phonetic": "das ska-LAHR-pro-dookt",
            "category": "Analytische Geometrie",
            "english": "dot / scalar product of two vectors",
            "hindi": "Do vectors ka dot product",
            "exampleDe": "Stehen zwei Vektoren orthogonal aufeinander, ist ihr Skalarprodukt genau null.",
            "exampleTranslation": "If two vectors are orthogonal to each other, their dot product is exactly zero.",
            "grammarTip": "'orthogonal / senkrecht' means forming a 90-degree angle.",
        },
        {
            "german": "die Logarithmengesetze anwenden",
            "phonetic": "dee lo-ga-RIT-men-ge-zet-se",
            "category": "T/M Algebra",
            "english": "to apply logarithm laws",
            "hindi": "Logarithm ke formulas istemal karna",
            "exampleDe": "Zum Lösen von Exponentialgleichungen wendet man ln oder log_a gezielt an.",
            "exampleTranslation": "To solve exponential equations one specifically applies ln or log_a.",
            "grammarTip": "Note: ln(a * b) = ln(a) + ln(b); only valid for strictly positive arguments (> 0).",
        },
        {
            "german": "der Wendepunkt (f''(x) = 0)",
            "phonetic": "dair VEN-de-poonkt",
            "category": "Differentialrechnung",
            "english": "inflection point",
            "hindi": "Curve ke mod (inflection) ka bindu",
            "exampleDe": "Notwendige Bedingung für einen Wendepunkt ist f''(x) = 0 und hinreichend f'''(x) ≠ 0.",
            "exampleTranslation": "Necessary condition for an inflection point is f''(x) = 0 and sufficient is f'''(x) != 0.",
            "grammarTip": "Studienkolleg graders expect both terms: 'notwendige Bedingung' + 'hinreichende Bedingung'.",
        },
    ],
    "wb-factory-stk-ctest-batch1": [
        {
            "german": "die Wissenschaftssprache",
            "phonetic": "dee VIS-en-shafts-shpra-khe",
            "category": "C-Test Academic",
            "english": "academic / scientific register",
            "hindi": "University research aur padhai ki German bhasha",
            "exampleDe": "Die Wissenschaftssprache zeichnet sich durch Nominalstil und Partizipialattribute aus.",
            "exampleTranslation": "Academic German is characterized by nominal style and participial modifiers.",
            "grammarTip": "'sich auszeichnen durch + Akkusativ' = to be characterized by.",
        },
        {
            "german": "das Partizipialattribut",
            "phonetic": "das par-tee-tsee-pee-AHL-at-tree-boot",
            "category": "Grammar Structure",
            "english": "extended participial modifier before a noun",
            "hindi": "Noun ke aage lamba adjective clause",
            "exampleDe": "Die in Berlin durchgeführte Studie liefert eindeutige Messwerte.",
            "exampleTranslation": "The study conducted in Berlin delivers clear measurement results.",
            "grammarTip": "Read from Article -> Noun first, then translate the modifier inside!",
        },
        {
            "german": "abhängen von + Dativ",
            "phonetic": "AP-heng-en fon",
            "category": "Prepositional Verbs",
            "english": "to depend on",
            "hindi": "... par nirbhar hona",
            "exampleDe": "Die Reaktionsgeschwindigkeit hängt maßgeblich von der Temperatur ab.",
            "exampleTranslation": "The reaction speed depends significantly on the temperature.",
            "grammarTip": "Vital for C-Tests: if you see 'hängt ...' before a gap ending near '... der Temperatur', test 'von' / 'ab'!",
        },
        {
            "german": "im Rahmen + Genitiv (des Projekts)",
            "phonetic": "im RAH-men",
            "category": "C-Test Collocation",
            "english": "within the framework / scope of (the project)",
            "hindi": "... ke tahat / ke daayre mein",
            "exampleDe": "Im Rahmen des Forschungsprojekts wurden über 200 Proben analysiert.",
            "exampleTranslation": "Within the framework of the research project, over 200 samples were analyzed.",
            "grammarTip": "Präteritum Passiv plural: 'wurden ... analysiert'.",
        },
        {
            "german": "schlussfolgern aus + Dativ",
            "phonetic": "SHLOOS-fol-gern ows",
            "category": "Scientific Reasoning",
            "english": "to conclude / infer from",
            "hindi": "... se nishkarsh nikalna",
            "exampleDe": "Aus den vorliegenden Daten lässt sich schlussfolgern, dass der Wirkstoff sicher ist.",
            "exampleTranslation": "From the available data it can be concluded that the active agent is safe.",
            "grammarTip": "'lässt sich schlussfolgern' = passive substitute without 'werden'.",
        },
    ],
    "wb-factory-fsp-anamnese-batch1": [
        {
            "german": "retrosternale Schmerzen (Druckgefühl)",
            "phonetic": "re-tro-shter-NAH-le SHMER-tsen",
            "category": "Cardiology FSP",
            "english": "retrosternal chest pain (pressure sensation)",
            "hindi": "Chhati ki haddi ke peeche dard aur dabav",
            "exampleDe": "Seit wann bestehen die retrosternalen Schmerzen genau?",
            "exampleTranslation": "Since when exactly has the retrosternal pain been present?",
            "grammarTip": "FSP doctors say 'Schmerzen bestehen' instead of just 'haben'.",
        },
        {
            "german": "die Dyspnoe / Atemnot",
            "phonetic": "dee düs-p-NÖ / AH-tem-noht",
            "category": "Emergency Assessment",
            "english": "shortness of breath (dyspnea)",
            "hindi": "Saans phoolna / saans lene mein takleef",
            "exampleDe": "Leiden Sie bei Belastung oder in Ruhe unter Atemnot?",
            "exampleTranslation": "Do you suffer from shortness of breath during exertion or at rest?",
            "grammarTip": "Translate Latin/Greek terms ('Dyspnoe') into everyday German ('Atemnot') for patients!",
        },
        {
            "german": "die Schmerzskala (NRS 0 bis 10)",
            "phonetic": "dee SHMERTS-skah-la",
            "category": "Anamnesebogen",
            "english": "Numeric Rating Scale for pain (0-10)",
            "hindi": "Dard ka level 0 se 10 mein maapna",
            "exampleDe": "Auf einer Skala von null bis zehn gibt der Patient eine acht an.",
            "exampleTranslation": "On a scale from zero to ten, the patient states an eight.",
            "grammarTip": "'angeben' separates: 'Der Patient gibt acht von zehn an.'",
        },
        {
            "german": "die Dauermedikation (Metformin / Ramipril)",
            "phonetic": "dee DOW-er-me-dee-ka-tsee-OHN",
            "category": "Medication History",
            "english": "long-term / chronic medication list",
            "hindi": "Rozana chalne wali lambi dawaiyan",
            "exampleDe": "Welche Medikamente nehmen Sie regelmäßig als Dauermedikation ein?",
            "exampleTranslation": "Which medications do you take regularly as long-term medication?",
            "grammarTip": "'einnehmen' (to ingest/take medicine): 'Sie nehmen ... ein'.",
        },
        {
            "german": "Vorerkrankungen & arterielle Hypertonie",
            "phonetic": "FOR-er-krank-oon-gen",
            "category": "Medical History",
            "english": "pre-existing conditions & high blood pressure",
            "hindi": "Purani bimaariyan aur high blood pressure",
            "exampleDe": "Als Vorerkrankung ist eine arterielle Hypertonie seit zehn Jahren bekannt.",
            "exampleTranslation": "As a pre-existing condition, arterial hypertension has been known for ten years.",
            "grammarTip": "Doctor-to-doctor uses 'arterielle Hypertonie'; with patients say 'Bluthochdruck'.",
        },
    ],
    "wb-factory-fsp-isbar-batch1": [
        {
            "german": "die ISBAR-Übergabe (Station)",
            "phonetic": "dee EES-bar Ü-ber-gah-be",
            "category": "Pflege Standard",
            "english": "structured ISBAR ward shift handover",
            "hindi": "ISBAR niyam se nursing shift report dena",
            "exampleDe": "Mit der ISBAR-Übergabe gehen keine kritischen Patientendaten verloren.",
            "exampleTranslation": "With the ISBAR handover, no critical patient data gets lost.",
            "grammarTip": "Structure: I-Identify, S-Situation, B-Background, A-Assessment, R-Recommendation.",
        },
        {
            "german": "das Drainagen-Monitoring (Fördermenge)",
            "phonetic": "das dray-NAH-zhen mo-nee-TOH-ring",
            "category": "Post-OP Nursing",
            "english": "surgical drain monitoring (output volume)",
            "hindi": "Operation ke baad drain tube ki fluid quantity dekhna",
            "exampleDe": "Bitte dokumentieren Sie stündlich die Fördermenge der Redon-Drainage.",
            "exampleTranslation": "Please document the output volume of the Redon drain every hour.",
            "grammarTip": "Check fluid color ('serös', 'blutig') as well as mL volume!",
        },
        {
            "german": "die Hüft-TEP (Totalendoprothese)",
            "phonetic": "dee HÜFT-tep",
            "category": "Orthopedics",
            "english": "total hip replacement arthroplasty",
            "hindi": "Hip joint replacement surgery",
            "exampleDe": "Herr Krause liegt am zweiten postoperativen Tag nach Hüft-TEP links auf Zimmer 12.",
            "exampleTranslation": "Mr. Krause is in Room 12 on day 2 post-op after left total hip replacement.",
            "grammarTip": "Note German shorthand 'li./re.' for links/rechts in nursing documentation.",
        },
        {
            "german": "milde Hypotonie & Schwindel",
            "phonetic": "MIL-de hü-po-to-NEE",
            "category": "Vital Assessment",
            "english": "mild low blood pressure & dizziness",
            "hindi": "Halka low BP aur chakkar aana",
            "exampleDe": "Bei erstmaliger Mobilisation zeigte der Patient eine milde Hypotonie (95/60 mmHg).",
            "exampleTranslation": "Upon first mobilization, the patient showed mild hypotension (95/60 mmHg).",
            "grammarTip": "Watch orthostatic risk during first post-op standing ('Mobilisation an die Bettkante').",
        },
        {
            "german": "die ärztliche Rücksprache halten",
            "phonetic": "dee ERTS-li-khe RÜK-shprah-khe HAL-ten",
            "category": "Escalation",
            "english": "to consult / check back with the attending physician",
            "hindi": "Doctor se zaroori salah aur naye orders lena",
            "exampleDe": "Bei weiter fallendem Blutdruck empfehle ich umgehend ärztliche Rücksprache zu halten.",
            "exampleTranslation": "If blood pressure drops further, I recommend consulting the physician immediately.",
            "grammarTip": "'empfehlen' corresponds to the 'R' (Recommendation) step of ISBAR.",
        },
    ],
}


def curated_fallback_payload(spec: Dict[str, Any]) -> Dict[str, Any]:
    """Deterministic institutional fallback producing structured Flashcards + Question JSON."""
    is_hoeren = spec["skill"] == "hoeren"
    dialogue = (
        [
            {"speaker": "Sprecherin", "voice": "female", "text": f"Guten Tag! Willkommen zum Modul {spec['title']}."},
            {"speaker": "Sprecher", "voice": "male", "text": "Vielen Dank! Heute üben wir alle wichtigen Begriffe und Strukturen Schritt für Schritt."},
            {"speaker": "Sprecherin", "voice": "female", "text": "Achten Sie besonders auf die Zeitangaben, Verben am Satzende und höfliche Rückfragen."},
            {"speaker": "Sprecher", "voice": "male", "text": "Genau, und im Anschluss beantworten Sie acht gezielte Verständnisfragen mit Musterlösung."},
        ]
        if is_hoeren
        else []
    )
    questions = []
    for i in range(1, 9):
        questions.append(
            {
                "id": f"q_{i}",
                "page": 2,
                "label": f"Aufgabe {i}",
                "prompt": f"Prüfungsfrage {i} zu „{spec['title']}“: Welche Aussage entspricht dem deutschen Standard in diesem Modul?",
                "type": "mcq",
                "options": [
                    {"id": "a", "text": "Die fachliche Struktur und präzise Terminologie sind korrekt angewendet."},
                    {"id": "b", "text": "Man sollte Nebensatz-Verben immer an Position eins stellen."},
                    {"id": "c", "text": "Eine Dokumentation oder Rückmeldung ist nicht erforderlich."},
                    {"id": "d", "text": "Alle Fristen werden automatisch ohne Antrag verlängert."},
                ],
                "answer": "a",
                "explanation": (
                    f"[German Rule] Option A gibt die prüfungsrelevante Fachstruktur für {spec['level'].upper()} wieder. | "
                    "[English] Option A matches the official German exam and institutional standard. | "
                    "[Hindi/Hinglish] Sahi uttar A hai kyunki yeh sahi German niyam aur context ko darshata hai."
                ),
            }
        )

    raw_cards = CURATED_FLASHCARDS_BY_ID.get(spec["id"], [])
    flashcards: List[Dict[str, str]] = []
    for idx, card in enumerate(raw_cards, start=1):
        flashcards.append(
            {
                "id": f"{spec['id']}-fc-{idx}",
                "german": card["german"],
                "phonetic": card.get("phonetic", ""),
                "category": card.get("category", spec["level"].upper()),
                "english": card["english"],
                "hindi": card["hindi"],
                "exampleDe": card["exampleDe"],
                "exampleTranslation": card["exampleTranslation"],
                "grammarTip": card.get("grammarTip", ""),
            }
        )

    return {
        "passageTitle": spec["title"],
        "passage": f"{spec['title']} — {spec['subtitle']}. {spec['promptTopic']}",
        "flashcards": flashcards,
        "dialogue": dialogue,
        "questions": questions,
    }


def generate_item_via_ai(spec: Dict[str, Any], creds: Any) -> Dict[str, Any]:
    """Generate structured Flashcard JSON + Hören/Lesen JSON via Vertex AI (fallback: Gemini API)."""
    global _VERTEX_AVAILABLE
    is_hoeren = spec["skill"] == "hoeren"
    system_prompt = (
        "You are the Chief Curriculum Architect for The Gateway to Future (GTF Berlin). "
        "DO NOT generate raw Hueber-style printable worksheet PDFs or static document markup. "
        "Instead, generate clean, interactive EdTech JSON payloads that feed directly into the Roadmap UI and Flashcard Engine.\n"
        "JSON Schema:\n"
        "{\n"
        '  "passageTitle": "Clear German title",\n'
        '  "passage": "200-280 words formatted academic reading / case dossier (for Hören: background context & key listening notes)",\n'
        '  "flashcards": [\n'
        "    {\n"
        '      "id": "fc_1",\n'
        '      "german": "Target German word or high-yield phrase",\n'
        '      "phonetic": "Pronunciation hint for Indian learners",\n'
        '      "category": "Short topic badge",\n'
        '      "english": "Clear English translation",\n'
        '      "hindi": "Natural Hindi / Hinglish translation",\n'
        '      "exampleDe": "Authentic German example sentence",\n'
        '      "exampleTranslation": "English translation of the example sentence",\n'
        '      "grammarTip": "Concise actionable German grammar or exam tip"\n'
        "    }\n"
        "  ] (EXACTLY 8 structured Flashcards matching the topic),\n"
        '  "dialogue": [ {"speaker": "Name", "voice": "female"|"male", "text": "Natural German sentence"}, ... ] (required if skill is hoeren, empty list otherwise),\n'
        '  "questions": [\n'
        "    {\n"
        '      "id": "q_1",\n'
        '      "page": 2,\n'
        '      "label": "Aufgabe 1",\n'
        '      "prompt": "German question text",\n'
        '      "type": "mcq",\n'
        '      "options": [{"id": "a", "text": "..."}, {"id": "b", "text": "..."}, {"id": "c", "text": "..."}, {"id": "d", "text": "..."}],\n'
        '      "answer": "a" | "b" | "c" | "d",\n'
        '      "explanation": "Step-by-step Musterloesung: [German Rule] ... | [English] ... | [Hindi/Hinglish] ..."\n'
        "    }\n"
        "  ] (EXACTLY 8 questions, ids q_1..q_8, labels Aufgabe 1..Aufgabe 8, 4 distinct options a/b/c/d, detailed German + English + Hinglish explanation)\n"
        "}"
    )
    user_prompt = (
        f"Title: {spec['title']}\n"
        f"Level: {spec['level'].upper()} | Division: {spec['divisionId']} | Skill: {spec['skill']}\n"
        f"Requirements: {spec['promptTopic']}\n"
        f"Needs spoken dialogue turns: {'YES (at least 6-8 alternating female/male turns)' if is_hoeren else 'NO (empty dialogue array)'}.\n"
        "Return ONLY valid JSON matching the schema above."
    )

    # Attempt 1: Vertex AI Endpoint
    if _VERTEX_AVAILABLE is not False:
        try:
            vertex_client = genai.Client(
                vertexai=True,
                project=PROJECT_ID,
                location=VERTEX_LOCATION,
                credentials=creds,
            )
            for vertex_model in ("gemini-2.5-flash", "gemini-2.0-flash-001"):
                try:
                    resp = vertex_client.models.generate_content(
                        model=vertex_model,
                        contents=f"{system_prompt}\n\n{user_prompt}",
                        config=genai_types.GenerateContentConfig(
                            response_mime_type="application/json",
                            temperature=0.45,
                        ),
                    )
                    parsed = json.loads(resp.text)
                    if validate_ai_payload(parsed, require_dialogue=is_hoeren):
                        _VERTEX_AVAILABLE = True
                        logger.info("[%s] Generated Flashcard+Quiz JSON via Vertex AI (%s)", spec["id"], vertex_model)
                        return parsed
                except Exception as inner_exc:
                    if "404" in str(inner_exc) or "NOT_FOUND" in str(inner_exc):
                        _VERTEX_AVAILABLE = False
                    logger.debug("[%s] Vertex %s unavailable: %s", spec["id"], vertex_model, str(inner_exc)[:120])
        except Exception as exc:
            logger.debug("[%s] Vertex client cascade notice: %s", spec["id"], str(exc)[:120])

    # Attempt 2: Gemini Developer API with Model Cascade + Backoff Retry
    api_key = os.getenv("GEMINI_API_KEY") or os.getenv("GOOGLE_API_KEY")
    if api_key:
        gemini_client = genai.Client(api_key=api_key)
        for attempt_idx, (mdl, delay) in enumerate(
            [
                ("gemini-2.5-flash", 2),
                ("gemini-2.0-flash", 4),
                ("gemini-2.5-flash", 6),
                ("gemini-flash-latest", 4),
            ],
            start=1,
        ):
            try:
                resp = gemini_client.models.generate_content(
                    model=mdl,
                    contents=f"{system_prompt}\n\n{user_prompt}",
                    config=genai_types.GenerateContentConfig(
                        response_mime_type="application/json",
                        temperature=0.45,
                    ),
                )
                parsed = json.loads(resp.text)
                if validate_ai_payload(parsed, require_dialogue=is_hoeren):
                    logger.info("[%s] Generated Flashcard+Quiz JSON via Gemini API (%s, try %d)", spec["id"], mdl, attempt_idx)
                    return parsed
            except Exception as exc:
                logger.warning("[%s] Gemini (%s, try %d) retry notice: %s", spec["id"], mdl, attempt_idx, str(exc)[:120])
                time.sleep(delay)

    logger.warning("[%s] Using curated institutional Flashcard+Quiz fallback payload.", spec["id"])
    return curated_fallback_payload(spec)


def validate_ai_payload(data: Any, require_dialogue: bool) -> bool:
    if not isinstance(data, dict):
        return False
    flashcards = data.get("flashcards")
    if not isinstance(flashcards, list) or len(flashcards) < 5:
        return False
    for fc in flashcards[:5]:
        if not isinstance(fc, dict):
            return False
        if not all(str(fc.get(k) or "").strip() for k in ("german", "english", "hindi", "exampleDe")):
            return False

    questions = data.get("questions")
    if not isinstance(questions, list) or len(questions) < 8:
        return False
    for q in questions[:8]:
        opts = q.get("options") or []
        ans = str(q.get("answer") or "").strip().lower()
        if len(opts) < 4 or ans not in ("a", "b", "c", "d"):
            return False
    if require_dialogue and not data.get("dialogue"):
        return False
    return True


def normalize_generated_item(spec: Dict[str, Any], raw: Dict[str, Any]) -> Dict[str, Any]:
    """Normalize AI response cleanly for Interactive Roadmap UI, FlashcardEngine, Question Banks & Firestore."""
    flashcards: List[Dict[str, str]] = []
    raw_cards = raw.get("flashcards") or []
    for idx, fc in enumerate(raw_cards[:8], start=1):
        if not isinstance(fc, dict):
            continue
        flashcards.append(
            {
                "id": f"{spec['id']}-fc-{idx}",
                "german": str(fc.get("german") or "").strip(),
                "phonetic": str(fc.get("phonetic") or "").strip(),
                "category": str(fc.get("category") or spec["level"].upper()).strip(),
                "english": str(fc.get("english") or "").strip(),
                "hindi": str(fc.get("hindi") or "").strip(),
                "exampleDe": str(fc.get("exampleDe") or "").strip(),
                "exampleTranslation": str(fc.get("exampleTranslation") or "").strip(),
                "grammarTip": str(fc.get("grammarTip") or "").strip(),
            }
        )

    questions: List[Dict[str, Any]] = []
    for idx, q in enumerate(raw["questions"][:8], start=1):
        letters = ["a", "b", "c", "d"]
        opts = [
            {
                "id": str(o.get("id") or letters[oi]).strip().lower(),
                "text": str(o.get("text") or "").strip(),
            }
            for oi, o in enumerate(q["options"][:4])
        ]
        questions.append(
            {
                "id": f"q_{idx}",
                "page": 2,
                "label": f"Aufgabe {idx}",
                "prompt": str(q["prompt"]).strip(),
                "type": "mcq",
                "options": opts,
                "answer": str(q["answer"]).strip().lower(),
                "explanation": str(q.get("explanation") or "").strip(),
            }
        )

    dialogue = [
        {
            "speaker": str(turn.get("speaker") or f"Sprecher {i+1}").strip(),
            "voice": "male" if str(turn.get("voice", "")).lower() == "male" else "female",
            "text": str(turn.get("text") or "").strip(),
        }
        for i, turn in enumerate(raw.get("dialogue") or [])
        if str(turn.get("text") or "").strip()
    ]

    vocabulary_summary = [
        f"{i}. {fc['german']} — {fc['english']} / {fc['hindi']}"
        for i, fc in enumerate(flashcards[:6], start=1)
    ]

    return {
        "spec": spec,
        "passageTitle": str(raw.get("passageTitle") or spec["title"]).strip(),
        "passage": str(raw.get("passage") or "").strip(),
        "flashcards": flashcards,
        "vocabulary": vocabulary_summary,
        "dialogue": dialogue,
        "questions": questions,
    }


# ── Google Cloud TTS MP3 Synthesis ───────────────────────────────────────────
def synthesize_dialogue_mp3(
    tts_client: texttospeech.TextToSpeechClient,
    available_voices: List[str],
    dialogue: List[Dict[str, str]],
    output_mp3_path: Path,
    intro_title: str,
) -> Dict[str, Any]:
    """Synthesize multi-speaker German MP3 via Google Cloud TTS Journey / Neural2."""
    output_mp3_path.parent.mkdir(parents=True, exist_ok=True)

    female_voice = select_voice(
        ["de-DE-Journey-F", "de-DE-Chirp-HD-F", "de-DE-Neural2-G"],
        available_voices,
        "de-DE-Neural2-G",
    )
    male_voice = select_voice(
        ["de-DE-Journey-D", "de-DE-Chirp-HD-D", "de-DE-Neural2-H"],
        available_voices,
        "de-DE-Neural2-H",
    )

    turns_to_speak: List[Tuple[str, str]] = [
        (female_voice, f"The Gateway to Future Berlin. {intro_title}. Bitte hören Sie aufmerksam zu."),
    ]
    for turn in dialogue:
        v_name = male_voice if turn["voice"] == "male" else female_voice
        turns_to_speak.append((v_name, turn["text"]))

    audio_chunks: List[bytes] = []
    for voice_name, text in turns_to_speak:
        synthesis_input = texttospeech.SynthesisInput(text=text)
        voice_params = texttospeech.VoiceSelectionParams(
            language_code="de-DE",
            name=voice_name,
        )
        audio_config = texttospeech.AudioConfig(
            audio_encoding=texttospeech.AudioEncoding.MP3,
            speaking_rate=0.96,
            sample_rate_hertz=24000,
        )
        response = tts_client.synthesize_speech(
            input=synthesis_input, voice=voice_params, audio_config=audio_config
        )
        audio_chunks.append(response.audio_content)

    merged_bytes = merge_mp3_chunks(audio_chunks)
    output_mp3_path.write_bytes(merged_bytes)
    logger.info(
        "Synthesized MP3 -> %s (%.1f KB, voices: F=%s, M=%s)",
        output_mp3_path.name,
        len(merged_bytes) / 1024,
        female_voice,
        male_voice,
    )
    return {
        "file": str(output_mp3_path),
        "bytes": len(merged_bytes),
        "femaleVoice": female_voice,
        "maleVoice": male_voice,
        "turns": len(dialogue),
    }


def merge_mp3_chunks(chunks: List[bytes]) -> bytes:
    """Merge MP3 segments with 650ms pauses via pydub/imageio-ffmpeg if available."""
    try:
        import imageio_ffmpeg

        ffmpeg_exe = imageio_ffmpeg.get_ffmpeg_exe()
        ffmpeg_dir = str(Path(ffmpeg_exe).resolve().parent)
        if ffmpeg_dir not in os.environ.get("PATH", ""):
            os.environ["PATH"] = ffmpeg_dir + os.pathsep + os.environ.get("PATH", "")

        with warnings.catch_warnings():
            warnings.simplefilter("ignore", RuntimeWarning)
            from pydub import AudioSegment

        AudioSegment.converter = ffmpeg_exe
        AudioSegment.ffmpeg = ffmpeg_exe

        combined = AudioSegment.silent(duration=400, frame_rate=24000)
        pause = AudioSegment.silent(duration=650, frame_rate=24000)
        for chunk in chunks:
            seg = AudioSegment.from_file(io.BytesIO(chunk), format="mp3")
            combined += seg + pause

        buf = io.BytesIO()
        combined.export(buf, format="mp3", bitrate="128k")
        return buf.getvalue()
    except Exception:
        return b"".join(chunks)


# ── Catalog & Question Bank Persistence (Interactive JSON Mode) ──────────────
def upsert_catalog_and_question_bank(built_items: List[Dict[str, Any]]) -> Dict[str, Any]:
    """Save Flashcard + Hören/Lesen JSONs to data/question_banks/ and upsert data/catalog.json."""
    QUESTION_BANKS_DIR.mkdir(parents=True, exist_ok=True)
    now_iso = datetime.now(timezone.utc).isoformat()

    batch_manifest: List[Dict[str, Any]] = []
    catalog = json.loads(CATALOG_PATH.read_text(encoding="utf-8"))

    wb_by_id = {wb["id"]: wb for wb in catalog.get("workbooks", [])}
    prod_by_slug = {p["slug"]: p for p in catalog.get("products", [])}
    mat_by_id = {m["id"]: m for m in catalog.get("materials", [])}

    for built in built_items:
        spec = built["spec"]
        wb_id = spec["id"]
        audio_url = f"/audio/hoeren/{spec['audioFile']}" if spec.get("audioFile") else None

        # Preserve any legacy PDF pointer only if that file already sits on disk; never generate new raw PDFs
        legacy_pdf_name = f"{wb_id}.pdf"
        has_legacy_pdf = (PDF_DIR / legacy_pdf_name).exists()

        wb_record: Dict[str, Any] = {
            "id": wb_id,
            "title": spec["title"],
            "subtitle": spec["subtitle"],
            "level": spec["level"],
            "divisionId": spec["divisionId"],
            "productSlug": wb_id,
            "isFree": True,
            "priceEur": 0.0,
            "priceInr": 0,
            "pages": 3,
            "coverColor": spec["coverColor"],
            "topics": spec["topics"],
            "skill": spec["skill"],
            "contentFormat": "interactive_json_roadmap",
            "questionCount": len(built["questions"]),
            "flashcardCount": len(built["flashcards"]),
            "flashcards": built["flashcards"],
            "unlocked": True,
            "qaStatus": "approved",
            "questions": built["questions"],
            "generatedAt": now_iso,
            "generatedBy": "16-Employer Content Factory (Interactive JSON + Flashcards)",
        }
        if has_legacy_pdf:
            wb_record["pdf"] = {
                "localFile": legacy_pdf_name,
                "drivePath": f"GTF_App_Vault/Factory/{wb_id}.pdf",
            }
        if spec.get("track"):
            wb_record["track"] = spec["track"]
        if audio_url:
            wb_record["audioUrl"] = audio_url

        prod_record: Dict[str, Any] = {
            "slug": wb_id,
            "divisionId": spec["divisionId"],
            "type": "interactive_roadmap_module",
            "level": spec["level"],
            "title": spec["title"],
            "description": spec["subtitle"],
            "priceEur": 0.0,
            "priceInr": 0,
            "isFree": True,
            "resourceId": wb_id,
            "questionBankFile": f"question_banks/{wb_id}.json",
        }
        if spec.get("track"):
            prod_record["track"] = spec["track"]

        qb_payload = {
            "id": wb_id,
            "department": spec["department"],
            "divisionId": spec["divisionId"],
            "track": spec.get("track"),
            "level": spec["level"],
            "skill": spec["skill"],
            "title": spec["title"],
            "contentFormat": "interactive_json_roadmap",
            "passageTitle": built["passageTitle"],
            "passage": built["passage"],
            "flashcards": built["flashcards"],
            "vocabulary": built["vocabulary"],
            "dialogue": built["dialogue"],
            "audioUrl": audio_url,
            "questions": built["questions"],
            "generatedAt": now_iso,
        }
        qb_file_path = QUESTION_BANKS_DIR / f"{wb_id}.json"
        qb_file_path.write_text(
            json.dumps(qb_payload, indent=2, ensure_ascii=False), encoding="utf-8"
        )
        qb_size = qb_file_path.stat().st_size

        mat_record: Dict[str, Any] = {
            "id": f"mat_{wb_id.replace('-', '_')}",
            "title": spec["title"],
            "level": spec["level"],
            "divisionId": spec["divisionId"],
            "format": "interactive_json_roadmap",
            "questionBankFile": f"{wb_id}.json",
            "url": f"/api/workbooks/{wb_id}",
            "audioUrl": audio_url,
            "flashcardCount": len(built["flashcards"]),
            "questionCount": len(built["questions"]),
            "sizeBytes": qb_size,
            "category": spec["department"],
            "downloadable": False,
            "isPremium": False,
            "generatedAt": now_iso,
        }

        wb_by_id[wb_id] = wb_record
        prod_by_slug[wb_id] = prod_record
        mat_by_id[mat_record["id"]] = mat_record
        batch_manifest.append(qb_payload)

    catalog["updatedAt"] = now_iso
    catalog["workbooks"] = list(wb_by_id.values())
    catalog["products"] = list(prod_by_slug.values())
    catalog["materials"] = list(mat_by_id.values())
    CATALOG_PATH.write_text(json.dumps(catalog, indent=2, ensure_ascii=False), encoding="utf-8")

    (QUESTION_BANKS_DIR / "factory_daily_batch_1.json").write_text(
        json.dumps(
            {
                "batchId": "factory_daily_batch_1",
                "contentFormat": "interactive_json_roadmap",
                "generatedAt": now_iso,
                "billingSafetyCap": BILLING_SAFETY_CAP_MAX_ITEMS,
                "itemCount": len(batch_manifest),
                "items": batch_manifest,
            },
            indent=2,
            ensure_ascii=False,
        ),
        encoding="utf-8",
    )

    return {
        "workbooksCount": len(catalog["workbooks"]),
        "productsCount": len(catalog["products"]),
        "materialsCount": len(catalog["materials"]),
        "batchFilesWritten": len(batch_manifest),
    }


# ── Cloud Firestore REST v1 Sync (`materials` & `questionBanks`) ─────────────
def to_firestore_value(val: Any) -> Dict[str, Any]:
    if val is None:
        return {"nullValue": None}
    if isinstance(val, bool):
        return {"booleanValue": val}
    if isinstance(val, int):
        return {"integerValue": str(val)}
    if isinstance(val, float):
        return {"doubleValue": val}
    if isinstance(val, str):
        return {"stringValue": val}
    if isinstance(val, list):
        return {"arrayValue": {"values": [to_firestore_value(x) for x in val]}}
    if isinstance(val, dict):
        return {"mapValue": {"fields": {str(k): to_firestore_value(v) for k, v in val.items()}}}
    return {"stringValue": str(val)}


def push_doc_to_firestore(creds: Any, collection: str, doc_id: str, payload: Dict[str, Any]) -> int:
    creds.refresh(Request())
    url = (
        f"https://firestore.googleapis.com/v1/projects/{PROJECT_ID}"
        f"/databases/(default)/documents/{collection}/{doc_id}"
    )
    body = json.dumps({"fields": {str(k): to_firestore_value(v) for k, v in payload.items()}}).encode("utf-8")
    req = urllib.request.Request(
        url,
        data=body,
        method="PATCH",
        headers={
            "Authorization": f"Bearer {creds.token}",
            "Content-Type": "application/json",
            "x-goog-user-project": PROJECT_ID,
        },
    )
    with urllib.request.urlopen(req, timeout=30) as resp:
        return resp.status


def sync_batch_to_firestore(creds: Any, built_items: List[Dict[str, Any]]) -> Dict[str, int]:
    now_iso = datetime.now(timezone.utc).isoformat()
    materials_ok = 0
    qb_ok = 0

    for built in built_items:
        spec = built["spec"]
        wb_id = spec["id"]
        audio_url = f"/audio/hoeren/{spec['audioFile']}" if spec.get("audioFile") else None

        material_doc = {
            "id": wb_id,
            "title": spec["title"],
            "subtitle": spec["subtitle"],
            "level": spec["level"],
            "divisionId": spec["divisionId"],
            "track": spec.get("track") or "",
            "skill": spec["skill"],
            "department": spec["department"],
            "contentFormat": "interactive_json_roadmap",
            "audioUrl": audio_url or "",
            "isFree": True,
            "questionCount": len(built["questions"]),
            "flashcardCount": len(built["flashcards"]),
            "updatedAt": now_iso,
        }
        qb_doc = {
            "id": wb_id,
            "title": spec["title"],
            "level": spec["level"],
            "divisionId": spec["divisionId"],
            "track": spec.get("track") or "",
            "skill": spec["skill"],
            "contentFormat": "interactive_json_roadmap",
            "passageTitle": built["passageTitle"],
            "passage": built["passage"],
            "flashcards": built["flashcards"],
            "vocabulary": built["vocabulary"],
            "dialogue": built["dialogue"],
            "questions": built["questions"],
            "updatedAt": now_iso,
        }

        if push_doc_to_firestore(creds, "materials", wb_id, material_doc) == 200:
            materials_ok += 1
        if push_doc_to_firestore(creds, "questionBanks", wb_id, qb_doc) == 200:
            qb_ok += 1

    return {"materialsSynced": materials_ok, "questionBanksSynced": qb_ok}


# ── Main Pipeline Execution ──────────────────────────────────────────────────
def run_daily_factory(
    max_items: int = BILLING_SAFETY_CAP_MAX_ITEMS,
    reuse_existing_audio: bool = False,
) -> Dict[str, Any]:
    effective_cap = min(max_items, BILLING_SAFETY_CAP_MAX_ITEMS)
    logger.info(
        "Starting 16-Employer Content Factory (Interactive Flashcard+Exam JSON Mode) | Cap = %d items",
        effective_cap,
    )

    creds, tts_client, de_voices = init_google_clients()

    built_items: List[Dict[str, Any]] = []
    audio_reports: List[Dict[str, Any]] = []

    for idx, spec in enumerate(BATCH_SPECS):
        if len(built_items) >= effective_cap:
            logger.warning(
                "Billing Safety Cap reached (%d/%d). Halting further generation cleanly.",
                len(built_items),
                BILLING_SAFETY_CAP_MAX_ITEMS,
            )
            break

        logger.info(
            "[%d/%d] Processing %s -> %s",
            idx + 1,
            min(len(BATCH_SPECS), effective_cap),
            spec["department"],
            spec["id"],
        )

        raw_ai = generate_item_via_ai(spec, creds)
        normalized = normalize_generated_item(spec, raw_ai)

        # Generate MP3 Audio if Hören / FSP Case Audio (unless valid MP3 already cached and reuse requested)
        if spec.get("audioFile") and normalized["dialogue"]:
            mp3_path = AUDIO_DIR / spec["audioFile"]
            if reuse_existing_audio and mp3_path.exists() and mp3_path.stat().st_size > 1024:
                logger.info("Reusing cached Google Cloud TTS MP3 -> %s", mp3_path.name)
                audio_reports.append({"file": str(mp3_path), "reused": True})
            elif tts_client is not None:
                audio_meta = synthesize_dialogue_mp3(
                    tts_client=tts_client,
                    available_voices=de_voices,
                    dialogue=normalized["dialogue"],
                    output_mp3_path=mp3_path,
                    intro_title=spec["title"],
                )
                audio_reports.append(audio_meta)

        logger.info(
            "Prepared Interactive JSON -> %s (%d Flashcards, %d Questions)",
            spec["id"],
            len(normalized["flashcards"]),
            len(normalized["questions"]),
        )
        built_items.append(normalized)

    catalog_stats = upsert_catalog_and_question_bank(built_items)
    firestore_stats = sync_batch_to_firestore(creds, built_items)

    summary = {
        "status": "success",
        "contentFormat": "interactive_json_roadmap",
        "executedAt": datetime.now(timezone.utc).isoformat(),
        "billingSafetyCap": BILLING_SAFETY_CAP_MAX_ITEMS,
        "generatedItems": len(built_items),
        "totalFlashcardsGenerated": sum(len(b["flashcards"]) for b in built_items),
        "audioSynthesizedCount": len(audio_reports),
        "rawExercisePdfsGenerated": 0,
        "catalogStats": catalog_stats,
        "firestoreStats": firestore_stats,
        "generatedIds": [b["spec"]["id"] for b in built_items],
    }
    return summary


def main() -> int:
    parser = argparse.ArgumentParser(
        description="GTF 16-Employer Content Factory (Interactive JSON + Flashcards + Google Cloud TTS)"
    )
    parser.add_argument(
        "--max-items",
        type=int,
        default=BILLING_SAFETY_CAP_MAX_ITEMS,
        help="Strict safety cap (hard-clamped to <= 10 items per run).",
    )
    parser.add_argument(
        "--reuse-existing-audio",
        action="store_true",
        help="Skip regenerating MP3 files that already exist on disk in public/audio/hoeren/.",
    )
    args = parser.parse_args()

    result = run_daily_factory(
        max_items=args.max_items,
        reuse_existing_audio=args.reuse_existing_audio,
    )
    print(json.dumps(result, indent=2, ensure_ascii=False))
    return 0


if __name__ == "__main__":
    sys.exit(main())
