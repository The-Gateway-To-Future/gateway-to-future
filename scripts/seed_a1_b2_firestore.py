#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
================================================================================
The Gateway to Future (GTF) Berlin — Curriculum-Separated Firestore Seeder
================================================================================
Enforces strict Level -> Module -> Topic hierarchy across Cloud Firestore
(`gateway-to-future`) with zero cross-contamination ("no Frankenstein docs"):

  1. contentType == "grammar"        (module: "02-grammar")
     - ONLY grammarNotes (rule, proTip, examples) + grammar-focused flashcards (>= 4)
     - questions == [], audioUrl == "", readingPassage == ""
     - Rejects any Goethe/telc Lesen/Hören/Prüfungstraining exam markers

  2. contentType == "exam_lesen"     (module: "03-hoeren-lesen" | "04-modelltests")
     - ONLY readingPassage + interactive questions (Antwortblatt)
     - audioUrl == "", grammarNotes == None, flashcards == []

  3. contentType == "exam_hoeren"    (module: "03-hoeren-lesen")
     - ONLY audioUrl + interactive questions (Antwortblatt)
     - grammarNotes == None, flashcards == []

  4. contentType in ("exam_schreiben", "exam_sprechen") (module: "04-modelltests")
     - ONLY readingPassage (task prompt) + optional audioUrl (sprechen) + questions
     - grammarNotes == None, flashcards == []

CLI Usage:
  python scripts/seed_a1_b2_firestore.py --purge --level b1
  python scripts/seed_a1_b2_firestore.py --level all
================================================================================
"""

from __future__ import annotations

import argparse
import json
import re
import subprocess
import sys
import time
from concurrent.futures import ThreadPoolExecutor, as_completed
from datetime import datetime, timezone
from pathlib import Path
from typing import Any

import requests

PROJECT_ID = "gateway-to-future"
BASE_DIR = Path(__file__).resolve().parent.parent
PORTAL_DIR = BASE_DIR / "gtf-exam-portal"
DATA_DIR = PORTAL_DIR / "data"
SA_KEY_PATH = PORTAL_DIR / "firebase-service-account.json"
CORE_LABS_FILE = DATA_DIR / "all_core_labs.json"
CATALOG_FILE = DATA_DIR / "catalog.json"
SAMPLE_WB_FILE = DATA_DIR / "sample-workbooks.json"

FIRESTORE_BASE = (
    f"https://firestore.googleapis.com/v1/projects/{PROJECT_ID}/databases/(default)/documents"
)

ALLOWED_CONTENT_TYPES = {
    "grammar",
    "exam_lesen",
    "exam_hoeren",
    "exam_schreiben",
    "exam_sprechen",
}

ALLOWED_MODULES = {
    "02-grammar",
    "03-hoeren-lesen",
    "04-modelltests",
}

FORBIDDEN_GRAMMAR_EXAM_RE = re.compile(
    r"(goethe|telc|lesen\s+teil|h[öo]ren\s+teil|hoeren\s+teil|modelltest|vollsimulation|pr[üu]fungstraining)",
    re.IGNORECASE,
)


# ── 1. Authentication ─────────────────────────────────────────────────────────

def get_auth_token() -> str:
    """Retrieve OAuth2 token via gcloud CLI or local Service Account."""
    try:
        token = subprocess.check_output(
            ["gcloud", "auth", "print-access-token"],
            shell=True,
            text=True,
            stderr=subprocess.DEVNULL,
        ).strip()
        if token and len(token) > 20:
            return token
    except Exception:
        pass

    if SA_KEY_PATH.exists():
        try:
            from google.auth.transport.requests import Request
            from google.oauth2 import service_account

            creds = service_account.Credentials.from_service_account_file(
                str(SA_KEY_PATH),
                scopes=[
                    "https://www.googleapis.com/auth/cloud-platform",
                    "https://www.googleapis.com/auth/datastore",
                ],
            )
            creds.refresh(Request())
            if creds.token:
                return creds.token
        except Exception as e:
            print(f"[!] Service account auth error: {e}")

    raise RuntimeError(
        "Failed to acquire valid Google Cloud access token via gcloud or Service Account."
    )


# ── 2. Firestore Value Converter & REST Helpers ──────────────────────────────

def to_firestore_value(val: Any) -> dict:
    if val is None:
        return {"nullValue": None}
    if isinstance(val, bool):
        return {"booleanValue": val}
    if isinstance(val, int):
        return {"integerValue": str(val)}
    if isinstance(val, float):
        return {"doubleValue": val}
    if isinstance(val, str):
        if len(val) == 20 and val.endswith("Z") and val[10] == "T":
            return {"timestampValue": val}
        return {"stringValue": val}
    if isinstance(val, list):
        return {"arrayValue": {"values": [to_firestore_value(x) for x in val]}}
    if isinstance(val, dict):
        return {
            "mapValue": {
                "fields": {str(k): to_firestore_value(v) for k, v in val.items()}
            }
        }
    return {"stringValue": str(val)}


def push_firestore_doc(
    session: requests.Session,
    token: str,
    collection: str,
    doc_id: str,
    fields: dict,
) -> tuple[bool, str, int]:
    """Patch (upsert) a single document into Firestore."""
    clean_id = doc_id.strip()
    url = f"{FIRESTORE_BASE}/{collection}/{clean_id}"
    headers = {
        "Authorization": f"Bearer {token}",
        "Content-Type": "application/json",
        "x-goog-user-project": PROJECT_ID,
    }
    body = json.dumps({"fields": {k: to_firestore_value(v) for k, v in fields.items()}})

    for attempt in range(3):
        try:
            resp = session.patch(url, headers=headers, data=body, timeout=20)
            if resp.status_code in (200, 201):
                return True, clean_id, resp.status_code
            if resp.status_code == 429:
                time.sleep(1.0 * (attempt + 1))
                continue
            return (
                False,
                f"{clean_id} (HTTP {resp.status_code}: {resp.text[:140]})",
                resp.status_code,
            )
        except Exception as err:
            if attempt == 2:
                return False, f"{clean_id} ({err})", 0
            time.sleep(0.5)
    return False, clean_id, 0


def list_collection_doc_names(
    session: requests.Session, token: str, collection: str
) -> list[str]:
    """List full Firestore resource names of all documents in a collection."""
    headers = {
        "Authorization": f"Bearer {token}",
        "x-goog-user-project": PROJECT_ID,
    }
    names: list[str] = []
    page_token: str | None = None
    while True:
        params: dict[str, Any] = {"pageSize": 300, "mask.fieldPaths": "id"}
        if page_token:
            params["pageToken"] = page_token
        resp = session.get(
            f"{FIRESTORE_BASE}/{collection}", headers=headers, params=params, timeout=30
        )
        if resp.status_code == 404:
            return []
        resp.raise_for_status()
        payload = resp.json()
        for doc in payload.get("documents", []):
            if "name" in doc:
                names.append(doc["name"])
        page_token = payload.get("nextPageToken")
        if not page_token:
            break
    return names


def delete_firestore_resource(
    session: requests.Session, token: str, resource_name: str
) -> tuple[bool, str]:
    url = f"https://firestore.googleapis.com/v1/{resource_name}"
    headers = {
        "Authorization": f"Bearer {token}",
        "x-goog-user-project": PROJECT_ID,
    }
    for attempt in range(3):
        try:
            resp = session.delete(url, headers=headers, timeout=20)
            if resp.status_code in (200, 204, 404):
                return True, resource_name.rsplit("/", 1)[-1]
            if resp.status_code == 429:
                time.sleep(1.0 * (attempt + 1))
                continue
            return False, f"{resource_name} (HTTP {resp.status_code})"
        except Exception as err:
            if attempt == 2:
                return False, f"{resource_name} ({err})"
            time.sleep(0.5)
    return False, resource_name


def purge_collections(session: requests.Session, token: str, collections: tuple[str, ...]) -> dict[str, int]:
    """Delete all documents in the specified Firestore collections."""
    deleted_counts: dict[str, int] = {}
    for col in collections:
        doc_names = list_collection_doc_names(session, token, col)
        print(f"--> Purging collection '{col}': {len(doc_names)} document(s) found...")
        deleted = 0
        failed = 0
        if doc_names:
            with ThreadPoolExecutor(max_workers=10) as executor:
                futs = [
                    executor.submit(delete_firestore_resource, session, token, name)
                    for name in doc_names
                ]
                for fut in as_completed(futs):
                    ok, msg = fut.result()
                    if ok:
                        deleted += 1
                    else:
                        failed += 1
                        print(f"    [X] Delete failed: {msg}")
        deleted_counts[col] = deleted
        print(f"    [✓] Purged '{col}': {deleted} deleted, {failed} failed.")
    return deleted_counts


# ── 3. Rich High-Density CEFR Flashcards Dataset ──────────────────────────────

HIGH_DENSITY_FLASHCARDS = [
    # ── LEVEL A1 ──
    {
        "id": "fc_a1_01_begruessung",
        "level": "A1",
        "category": "Formal Greetings",
        "german": "Guten Tag, wie geht es Ihnen?",
        "articleDe": "",
        "phonetic": "GOO-ten tahk, vee gayt es EE-nen?",
        "pronunciationDe": "Goo-ten Tahk, vee gayt es Ee-nen?",
        "english": "Good day, how are you? (Formal)",
        "hindi": "नमस्ते, आप कैसे हैं? (Namaste, aap kaise hain?)",
        "contextHinglish": "Germany mein teachers, doctors, aur Bürgeramt officers se baat karte waqt hamesha formal 'Ihnen' use karein.",
        "exampleDe": "Guten Tag, Frau Weber! Wie geht es Ihnen heute im Sprachkurs?",
        "exampleTranslation": "Good day, Ms. Weber! How are you today in the language course?",
        "grammarTip": "Formal 'Sie' takes Dativ 'Ihnen'. Never use informal 'dir' with officials or employers.",
    },
    {
        "id": "fc_a1_02_anmeldung",
        "level": "A1",
        "category": "Berlin Registration & Bureaucracy",
        "german": "die Anmeldung beim Bürgeramt",
        "articleDe": "die",
        "phonetic": "dee AHN-mel-doong bime BÜR-ger-amt",
        "pronunciationDe": "dee Ahn-mel-doong by-me Buer-ger-amt",
        "english": "address registration at the citizen office",
        "hindi": "बर्लिन सिटी ऑफिस में एड्रेस रजिस्टर करवाना (Address registration)",
        "contextHinglish": "Berlin pahunchne ke 14 din ke andar Bürgeramt mein Anmeldung karwana mandatory hai.",
        "exampleDe": "Nach der Ankunft in Berlin muss man innerhalb von 14 Tagen die Anmeldung erledigen.",
        "exampleTranslation": "After arriving in Berlin, one must complete address registration within 14 days.",
        "grammarTip": "Nouns ending in '-ung' are ALWAYS feminine ('die'). 'beim' = bei + dem (Dativ).",
    },
    {
        "id": "fc_a1_03_gleis",
        "level": "A1",
        "category": "Train Station & Transit",
        "german": "das Gleis (Gleis vier)",
        "articleDe": "das",
        "phonetic": "das GLYSE (GLYSE feer)",
        "pronunciationDe": "das Glyse",
        "english": "the railway platform / track (Platform 4)",
        "hindi": "रेलवे प्लेटफार्म (Railway platform)",
        "contextHinglish": "Hauptbahnhof par train dhundhne ke liye hamesha 'Gleis' number check karein.",
        "exampleDe": "Der ICE nach Hamburg fährt heute von Gleis vier ab.",
        "exampleTranslation": "The ICE train to Hamburg departs from Platform 4 today.",
        "grammarTip": "'abfahren' is a separable verb: 'Der Zug fährt ... ab'.",
    },
    {
        "id": "fc_a1_04_wohnungsgeber",
        "level": "A1",
        "category": "Housing Documents",
        "german": "die Wohnungsgeberbestätigung",
        "articleDe": "die",
        "phonetic": "dee VOH-noongs-gay-ber-be-shtay-tee-goong",
        "pronunciationDe": "dee Voh-nungs-gay-ber-be-shta-ti-gung",
        "english": "landlord confirmation of residence certificate",
        "hindi": "मकान मालिक का निवास प्रमाण पत्र (Landlord move-in confirmation)",
        "contextHinglish": "Bürgeramt Anmeldung ke liye landlord ki sign ki hui Wohnungsgeberbestätigung sabse zaroori document hai.",
        "exampleDe": "Ohne Wohnungsgeberbestätigung vom Vermieter ist eine Anmeldung nicht möglich.",
        "exampleTranslation": "Without a landlord confirmation of residence, registration is not possible.",
        "grammarTip": "Compound noun: die Wohnung + der Geber + die Bestätigung. Gender follows the last noun ('die Bestätigung').",
    },
    # ── LEVEL A2 ──
    {
        "id": "fc_a2_01_dienstplan",
        "level": "A2",
        "category": "Workplace & Shifts",
        "german": "der Dienstplan und die Schichtarbeit",
        "articleDe": "der",
        "phonetic": "dair DEENST-plahn oont dee SHIKHT-ar-bite",
        "pronunciationDe": "dair Deenst-plahn",
        "english": "duty roster / shift schedule and shift work",
        "hindi": "ड्यूटी टाइम-टेबल और शिफ्ट का काम (Shift schedule)",
        "contextHinglish": "Hospital ya Ausbildung mein har mahine naya Dienstplan milta hai jisme Frühschicht aur Spätschicht likhi hoti hai.",
        "exampleDe": "Der neue Dienstplan für den kommenden Monat hängt im Stationszimmer aus.",
        "exampleTranslation": "The new duty roster for the coming month is posted in the ward office.",
        "grammarTip": "'aushängen' (to be posted) is separable: 'hängt ... aus'.",
    },
    {
        "id": "fc_a2_02_krankmeldung",
        "level": "A2",
        "category": "HR & Sick Leave",
        "german": "sich rechtzeitig krankmelden",
        "articleDe": "",
        "phonetic": "zikh REKHT-tsy-tikh KRANK-mel-den",
        "pronunciationDe": "zikh rekht-tsy-tikh krank-mel-den",
        "english": "to call in sick in good time",
        "hindi": "समय पर बीमारी की छुट्टी की सूचना देना (To call in sick)",
        "contextHinglish": "Bimaar hone par duty shuru hone se pehle employer ko inform karna mandatory hai.",
        "exampleDe": "Auszubildende müssen sich am ersten Krankheitstag vor Arbeitsbeginn telefonisch krankmelden.",
        "exampleTranslation": "Trainees must call in sick by phone on the first day of illness before work begins.",
        "grammarTip": "Reflexive verb with Akkusativ: 'ich melde mich krank'.",
    },
    {
        "id": "fc_a2_03_hausordnung",
        "level": "A2",
        "category": "Apartment Rules",
        "german": "die Hausordnung und die Ruhezeiten",
        "articleDe": "die",
        "phonetic": "dee HOWS-ord-noong oont dee ROO-e-tsy-ten",
        "pronunciationDe": "dee Hows-ord-nung",
        "english": "building house rules and mandatory quiet hours",
        "hindi": "बिल्डिंग के नियम और शांत समय (Building rules & quiet hours)",
        "contextHinglish": "Germany mein raat 10 baje se subah 6 baje tak shanti maintain karna zaroori hai.",
        "exampleDe": "Laut Hausordnung gilt ab 22 Uhr die gesetzliche Nachtruhe im gesamten Wohngebäude.",
        "exampleTranslation": "According to house rules, statutory night rest applies from 10 p.m.",
        "grammarTip": "'laut' + Dativ or Genitiv expresses 'according to'.",
    },
    {
        "id": "fc_a2_04_kaution",
        "level": "A2",
        "category": "Housing & Rent",
        "german": "die Mietkaution hinterlegen",
        "articleDe": "die",
        "phonetic": "dee MEET-kow-tsee-ohn hin-ter-LAY-gen",
        "pronunciationDe": "dee Meet-kow-tsee-ohn",
        "english": "to deposit the rental security deposit",
        "hindi": "मकान की सिक्योरिटी डिपाजिट जमा करना (Rental deposit)",
        "contextHinglish": "Flat rent karte waqt maximum 3 months ki Kaltmiete deposit di jaati hai.",
        "exampleDe": "Die Kaution beträgt drei Nettokaltmieten und wird auf ein gesondertes Kautionskonto überwiesen.",
        "exampleTranslation": "The deposit amounts to three net cold rents.",
        "grammarTip": "'betragen' takes Akkusativ without preposition.",
    },
    # ── LEVEL B1 ──
    {
        "id": "fc_b1_01_vorstellungsgespraech",
        "level": "B1",
        "category": "Job Interview & Career",
        "german": "das Vorstellungsgespräch erfolgreich meistern",
        "articleDe": "das",
        "phonetic": "das FOHR-shte-loongs-ge-shpraykh er-FOLK-rykh MY-stern",
        "pronunciationDe": "das For-shte-lungs-ge-shpraykh",
        "english": "to successfully master the job interview",
        "hindi": "जॉब इंटरव्यू सफलतापूर्वक पास करना (To master a job interview)",
        "contextHinglish": "German job interview mein apni strengths (Stärken) aur weaknesses (Schwächen) confidently German mein explain karein.",
        "exampleDe": "Im Vorstellungsgespräch konnte sie ihre praktischen Erfahrungen in der Krankenpflege überzeugend darstellen.",
        "exampleTranslation": "In the job interview she was able to convincingly present her practical nursing experience.",
        "grammarTip": "Modal verb 'können' in Präteritum: 'konnte ... darstellen' (Infinitiv am Satzende).",
    },
    {
        "id": "fc_b1_02_anerkennung",
        "level": "B1",
        "category": "Credential Recognition",
        "german": "die Anerkennung ausländischer Berufsabschlüsse",
        "articleDe": "die",
        "phonetic": "dee AHN-er-ken-noong OWS-len-dee-sher be-ROOFS-ap-shlüs-se",
        "pronunciationDe": "dee Ahn-er-ken-nung",
        "english": "the recognition of foreign professional qualifications",
        "hindi": "विदेशी डिग्री और नर्सिंग डिप्लोमा की जर्मन मान्यता (Credential recognition)",
        "contextHinglish": "Indian nursing degree ko Germany mein 'Pflegefachkraft' ke barabar maane jaane ke liye Anerkennungsbescheid zaroori hai.",
        "exampleDe": "Der offizielle Bescheid über die Anerkennung bestätigt die Gleichwertigkeit der Ausbildung.",
        "exampleTranslation": "The official notification of recognition confirms the equivalence of the training.",
        "grammarTip": "'die Anerkennung' takes Genitiv or 'von + Dativ': 'die Anerkennung der Abschlüsse'.",
    },
    {
        "id": "fc_b1_03_krankenversicherung",
        "level": "B1",
        "category": "Healthcare & Relocation",
        "german": "die gesetzliche Krankenversicherung abschließen",
        "articleDe": "die",
        "phonetic": "dee ge-ZETS-likhe KRAHN-ken-fair-zikh-air-oong AP-shlee-sen",
        "pronunciationDe": "dee Krahn-ken-fair-zikh-air-oong",
        "english": "to take out statutory health insurance",
        "hindi": "सरकारी स्वास्थ्य बीमा पॉलिसी लेना (Health insurance policy)",
        "contextHinglish": "Germany mein visa aur job dono ke liye Krankenversicherung (TK, AOK) mandatory hai.",
        "exampleDe": "Jeder Arbeitnehmer in Deutschland muss eine gesetzliche oder private Krankenversicherung abschließen.",
        "exampleTranslation": "Every employee in Germany must take out statutory or private health insurance.",
        "grammarTip": "Separable verb 'abschließen': 'Er schließt eine Versicherung ab'.",
    },
    {
        "id": "fc_b1_04_konnektoren",
        "level": "B1",
        "category": "B1 Grammar Connectors",
        "german": "obwohl / damit / sodass / trotzdem",
        "articleDe": "",
        "phonetic": "op-VOHL / DAH-mit / zoh-DAS / TROTS-dem",
        "pronunciationDe": "op-vohl, dah-mit, trots-dem",
        "english": "although / so that (purpose) / so that (consequence) / nevertheless",
        "hindi": "हालाँकि / ताकि / जिससे कि / फिर भी (Subordinate connectors)",
        "contextHinglish": "'Obwohl' aur 'damit' ke baad verb hamesha sentence ke aakhri mein aati hai (Nebensatz). 'Trotzdem' ke baad verb Position 2 par aati hai.",
        "exampleDe": "Obwohl die Prüfung sehr anspruchsvoll war, hat er sie mit Bestnote bestanden.",
        "exampleTranslation": "Although the exam was very challenging, he passed it with top marks.",
        "grammarTip": "'obwohl' = Subjunktion (Verb am Ende). 'trotzdem' = Konjunktionaladverb (Position 2).",
    },
    {
        "id": "fc_b1_05_weiterbildung",
        "level": "B1",
        "category": "Professional Development",
        "german": "die berufliche Weiterbildung fördern",
        "articleDe": "die",
        "phonetic": "dee be-ROOF-likhe VY-ter-bil-doong FÖR-dern",
        "pronunciationDe": "dee Vy-ter-bil-doong",
        "english": "to promote professional further education / upskilling",
        "hindi": "नौकरी में आगे की ट्रेनिंग और स्किल अपग्रेड करना (Upskilling)",
        "contextHinglish": "Agentur für Arbeit B2 language courses aur clinical prep ke liye Bildungsgutschein provide karti hai.",
        "exampleDe": "Die Bundesagentur für Arbeit fördert Weiterbildungsmaßnahmen durch Bildungsgutscheine.",
        "exampleTranslation": "The Federal Employment Agency sponsors continuing education measures through education vouchers.",
        "grammarTip": "'fördern' (to promote) vs. 'fordern' (to demand). Watch the umlaut 'ö'!",
    },
    {
        "id": "fc_b1_06_arbeitsvertrag",
        "level": "B1",
        "category": "Employment Law",
        "german": "den Arbeitsvertrag sorgfältig prüfen",
        "articleDe": "der",
        "phonetic": "den AR-bites-fair-trahk ZORK-felt-ikh PRÜ-fen",
        "pronunciationDe": "den Ar-bites-fair-trahk",
        "english": "to carefully review the employment contract",
        "hindi": "नौकरी के कॉन्ट्रैक्ट को ध्यान से पढ़ना (Review job contract)",
        "contextHinglish": "Sign karne se pehle Probezeit, Wochenstunden, aur Urlaubstage check karein.",
        "exampleDe": "Vor der Unterschrift sollte man alle Klauseln im Arbeitsvertrag genau durchlesen.",
        "exampleTranslation": "Before signing, one should thoroughly read through all clauses in the employment contract.",
        "grammarTip": "'sollte' (Konjunktiv II) gives polite recommendation: 'Man sollte ... prüfen'.",
    },
    {
        "id": "fc_b1_07_passiv_vorgang",
        "level": "B1",
        "category": "B1 Grammar Structures",
        "german": "das Vorgangspassiv (werden + Partizip II)",
        "articleDe": "das",
        "phonetic": "das FOR-gangs-pas-seef",
        "pronunciationDe": "das For-gangs-pas-seev",
        "english": "action passive voice (present: wird ... gemacht / past: wurde ... gemacht)",
        "hindi": "कर्मवाच्य (Passive voice): कार्य पर ध्यान केंद्रित करने के लिए",
        "contextHinglish": "Hospital reports aur formal processes mein 'werden + Partizip II' use hota hai.",
        "exampleDe": "Der Antrag auf Anerkennung wird derzeit von der Behörde geprüft.",
        "exampleTranslation": "The application for recognition is currently being reviewed by the authority.",
        "grammarTip": "Person/agent uses 'von (+ Dativ)'; instrument/cause uses 'durch (+ Akkusativ)'.",
    },
    {
        "id": "fc_b1_08_relativsatz",
        "level": "B1",
        "category": "B1 Grammar Structures",
        "german": "Relativpronomen im Dativ & Genitiv (denen / dessen / deren)",
        "articleDe": "",
        "phonetic": "re-lah-TEEF-pro-noh-men",
        "pronunciationDe": "re-lah-teef-pro-noh-men",
        "english": "relative pronouns in dative plural ('denen') and genitive ('dessen'/'deren')",
        "hindi": "संबंधवाचक सर्वनाम: Dativ बहुवचन (denen) और Genitiv (dessen/deren)",
        "contextHinglish": "Reference noun se gender/number lein, aur relative clause ke verb se case decide karein.",
        "exampleDe": "Das sind die Kolleginnen, mit denen ich auf Station 3 arbeite.",
        "exampleTranslation": "Those are the colleagues with whom I work on Ward 3.",
        "grammarTip": "Dativ plural relative pronoun is 'denen' (never 'den').",
    },
    # ── LEVEL B2 ──
    {
        "id": "fc_b2_01_nominalstil",
        "level": "B2",
        "category": "Advanced Grammar & Nominal Style",
        "german": "in Erwägung ziehen / zur Anwendung kommen",
        "articleDe": "",
        "phonetic": "in er-VAY-goong TSEE-en / tsoor AHN-ven-doong KOM-men",
        "pronunciationDe": "in er-vay-gung tsee-en",
        "english": "to take into consideration / to be applied (Nominal style)",
        "hindi": "विचार में लेना / लागू होना (Formal noun-verb pairings)",
        "contextHinglish": "B2 exam aur hospital documentation mein Nomen-Verb-Verbindungen use kiye jaate hain.",
        "exampleDe": "Die Klinikleitung zieht eine Umstrukturierung des Schichtdienstes ernsthaft in Erwägung.",
        "exampleTranslation": "The hospital management is seriously considering a restructuring of the shift service.",
        "grammarTip": "'in Erwägung ziehen' = erwägen / nachdenken über.",
    },
    {
        "id": "fc_b2_02_zweiteilige_konnektoren",
        "level": "B2",
        "category": "B2 Complex Connectors",
        "german": "nicht nur ... sondern auch / sowohl ... als auch / weder ... noch",
        "articleDe": "",
        "phonetic": "nikht noor ... ZON-dern owkh",
        "pronunciationDe": "nikht noor sondern owkh",
        "english": "not only ... but also / both ... and / neither ... nor",
        "hindi": "न केवल ... बल्कि / दोनों ... और / न तो ... न ही (Two-part connectors)",
        "contextHinglish": "B2 Schreiben mein two-part connectors high score dilate hain.",
        "exampleDe": "Das Programm bietet nicht nur Sprachförderung, sondern auch Unterstützung bei der Wohnungssuche.",
        "exampleTranslation": "The program offers not only language training, but also apartment hunting support.",
        "grammarTip": "'weder ... noch' already negates both elements — never add 'nicht' or 'kein'.",
    },
    {
        "id": "fc_b2_03_passiversatz",
        "level": "B2",
        "category": "Advanced Grammar Structures",
        "german": "Passiv-Ersatzformen: sein + zu + Infinitiv / sich lassen",
        "articleDe": "",
        "phonetic": "PAS-seef er-ZATS-for-men",
        "pronunciationDe": "Pas-seev er-zats-for-men",
        "english": "passive substitutes: 'sein + zu + infinitive' and 'sich lassen'",
        "hindi": "पैसिव के उन्नत विकल्प (Passive replacement forms)",
        "contextHinglish": "'Diese Regel ist zu beachten' = 'Diese Regel muss beachtet werden'.",
        "exampleDe": "Die Laborwerte sind unverzüglich an den zuständigen Stationsarzt weiterzuleiten.",
        "exampleTranslation": "The laboratory values must be forwarded without delay to the responsible ward physician.",
        "grammarTip": "'sein + zu + Infinitiv' expresses obligation or possibility.",
    },
    {
        "id": "fc_b2_04_fachkraefteverfahren",
        "level": "B2",
        "category": "Immigration & Legal Codes",
        "german": "das beschleunigte Fachkräfteverfahren (§ 81a AufenthG)",
        "articleDe": "das",
        "phonetic": "das be-SHLOY-nikh-te FAKH-kref-te-fer-fah-ren",
        "pronunciationDe": "das be-shloy-nigh-te Fah-kref-te-fair-fah-ren",
        "english": "the fast-track procedure for skilled workers (§ 81a Residence Act)",
        "hindi": "फास्ट-ट्रैक स्किल्ड वर्कर वीज़ा प्रक्रिया (Fast-track skilled immigration)",
        "contextHinglish": "German hospital employer § 81a ke zariye visa appointment fast-track karwa sakta hai.",
        "exampleDe": "Durch das beschleunigte Fachkräfteverfahren verkürzt sich die Bearbeitungszeit erheblich.",
        "exampleTranslation": "Through the fast-track procedure, processing time is reduced considerably.",
        "grammarTip": "Preposition 'durch' always takes Akkusativ.",
    },
]


# ── 4. Pure Grammar Pillars (STRICTLY contentType="grammar", module="02-grammar") ─

GRAMMAR_PILLARS: list[dict[str, Any]] = [
    # ── A1 GRAMMAR PILLARS ──
    {
        "id": "a1-grammar-01-satzbau-v2",
        "level": "a1",
        "module": "02-grammar",
        "contentType": "grammar",
        "title": "Säule 01 · Verbposition 2, W-Fragen & Satzklammer",
        "subtitle": "Grundlagen des deutschen Satzbaus: Aussagesatz, Ja/Nein-Frage und Verbkonjugation im Präsens.",
        "badge": "122 SÄULEN · GRAMMAR",
        "topics": ["Verbposition 2", "W-Fragen", "Präsens", "Sein & Haben"],
        "pages": 3,
        "grammarNotes": {
            "rule": "Im deutschen Aussagesatz steht das konjugierte Verb IMMER auf Position 2. In der Ja/Nein-Frage wandert das konjugierte Verb auf Position 1.",
            "proTip": "Bei Inversion (z. B. 'Heute gehe ich...') bleibt das Subjekt direkt hinter dem Verb. Hindi/English word order ko German V2 par override na karein!",
            "examples": [
                "Ich wohne seit zwei Wochen in Berlin.",
                "Heute lerne ich intensiv deutsche Grammatik.",
                "Wohnen Sie auch in Berlin-Mitte? (Ja/Nein-Frage -> Position 1)",
                "Woher kommen Sie? (W-Frage -> W-Wort Pos. 1, Verb Pos. 2)",
            ],
        },
        "flashcards": [
            {
                "id": "fc_a1_gr_01_v2",
                "german": "Verbposition 2 (Hauptsatz)",
                "phonetic": "fairb-po-zee-tsee-ohn tsvy",
                "category": "Satzbau Regel",
                "english": "Conjugated verb always takes 2nd position in statements",
                "hindi": "सामान्य वाक्य में क्रिया हमेशा दूसरे स्थान (Position 2) पर आती है",
                "exampleDe": "Morgen fahre ich mit der U-Bahn zum Kurs.",
                "exampleTranslation": "Tomorrow I am taking the subway to the course.",
                "grammarTip": "Even when time ('Morgen') is Position 1, the verb ('fahre') stays Position 2.",
            },
            {
                "id": "fc_a1_gr_02_ja_nein",
                "german": "Ja/Nein-Frage (Position 1)",
                "phonetic": "yah-nine-frah-ge",
                "category": "Fragesatz",
                "english": "Yes/No question starts directly with the conjugated verb",
                "hindi": "हाँ/नहीं वाले प्रश्न हमेशा क्रिया (Verb) से शुरू होते हैं",
                "exampleDe": "Haben Sie heute einen Termin beim Bürgeramt?",
                "exampleTranslation": "Do you have an appointment at the citizen office today?",
                "grammarTip": "No auxiliary 'Do' in German! Put the main verb first.",
            },
            {
                "id": "fc_a1_gr_03_sein_haben",
                "german": "sein & haben (Präsens)",
                "phonetic": "zine oont HAH-ben",
                "category": "Hilfsverben",
                "english": "to be (ich bin, du bist, er ist) & to have (ich habe, du hast, er hat)",
                "hindi": "होना (sein) और पास होना (haben) के मूल रूप",
                "exampleDe": "Ich bin Arzt und habe einen Arbeitsvertrag.",
                "exampleTranslation": "I am a doctor and have an employment contract.",
                "grammarTip": "'du hast' and 'er/sie/es hat' drop the 'b'!",
            },
            {
                "id": "fc_a1_gr_04_akk",
                "german": "der -> den / ein -> einen (Akkusativ)",
                "phonetic": "dair -> den / eyen -> EYE-nen",
                "category": "Akkusativ Maskulinum",
                "english": "Only masculine nouns change articles in Accusative",
                "hindi": "Akkusativ में केवल पुल्लिंग (der/ein) बदलकर den/einen बनता है",
                "exampleDe": "Ich trinke einen Kaffee und lese den Text.",
                "exampleTranslation": "I am drinking a coffee and reading the text.",
                "grammarTip": "'die' and 'das' stay identical in Nominative and Accusative.",
            },
        ],
    },
    {
        "id": "a1-grammar-02-akkusativ-artikel",
        "level": "a1",
        "module": "02-grammar",
        "contentType": "grammar",
        "title": "Säule 02 · Bestimmte/Unbestimmte Artikel & Akkusativ",
        "subtitle": "Maskulinum-Wechsel (der -> den, ein -> einen), Verben mit Akkusativ und Verneinung mit kein/nicht.",
        "badge": "122 SÄULEN · GRAMMAR",
        "topics": ["Akkusativ", "Artikel", "Negation kein/nicht"],
        "pages": 3,
        "grammarNotes": {
            "rule": "Im Akkusativ (Wen oder was?) ändert sich NUR das Maskulinum: der -> den, ein -> einen, kein -> keinen, mein -> meinen. Femininum (die/eine), Neutrum (das/ein) und Plural (die) bleiben unverändert.",
            "proTip": "Typische Akkusativ-Verben: haben, kaufen, brauchen, suchen, lesen, trinken, essen, möchten. Nomen mit 'kein', Verben/Adjektive mit 'nicht' verneinen.",
            "examples": [
                "Ich brauche einen neuen Reisepass. (der Reisepass -> einen)",
                "Wir suchen eine helle Wohnung in Berlin. (die Wohnung -> eine)",
                "Er hat kein Auto, aber er fährt nicht gern Bus.",
            ],
        },
        "flashcards": [
            {
                "id": "fc_a1_gr_05_kein_nicht",
                "german": "kein vs. nicht (Verneinung)",
                "phonetic": "kine fair-zoos nikht",
                "category": "Negation",
                "english": "'kein' negates nouns without definite article; 'nicht' negates verbs & adjectives",
                "hindi": "संज्ञा (Noun) के लिए 'kein' और क्रिया/विशेषण के लिए 'nicht' का प्रयोग",
                "exampleDe": "Ich habe keine Zeit und wohne nicht weit weg.",
                "exampleTranslation": "I have no time and do not live far away.",
                "grammarTip": "Never write 'nicht ein' — always merge into 'kein / keine / keinen'.",
            },
            {
                "id": "fc_a1_gr_06_trennbar",
                "german": "Trennbare Verben (Satzklammer)",
                "phonetic": "TREN-bah-re VAIR-ben",
                "category": "Verbstruktur",
                "english": "Separable prefix moves to the very end of a main clause",
                "hindi": "विभाज्य क्रियाओं का उपसर्ग (auf, an, ein) वाक्य के सबसे अंत में जाता है",
                "exampleDe": "Sie ruft ihre Kollegin um 14 Uhr an.",
                "exampleTranslation": "She calls her colleague at 2 p.m.",
                "grammarTip": "With a modal verb, separable verbs stay together at the end.",
            },
            {
                "id": "fc_a1_gr_07_um_am_im",
                "german": "um (Uhr) · am (Tag) · im (Monat)",
                "phonetic": "oom · ahm · im",
                "category": "Zeitpräpositionen",
                "english": "um = clock time | am = days/dayparts | im = months/seasons",
                "hindi": "समय (um), दिन (am) और महीने/मौसम (im) के सही Prepositions",
                "exampleDe": "Am Freitag im Mai beginnt der Kurs um 9 Uhr.",
                "exampleTranslation": "On Friday in May the course starts at 9 a.m.",
                "grammarTip": "Exception: 'in der Nacht' (at night) uses 'in der'.",
            },
            {
                "id": "fc_a1_gr_08_modal",
                "german": "Modalverben: können, müssen, dürfen, wollen",
                "phonetic": "moh-DAHL-vair-ben",
                "category": "Modalverben",
                "english": "Modal verb in Pos 2 + full verb infinitive at the very end",
                "hindi": "Modalverb (Pos 2) + मुख्य क्रिया (Infinitiv) वाक्य के अंत में",
                "exampleDe": "Ich muss heute meine Unterlagen beim Bürgeramt abgeben.",
                "exampleTranslation": "I have to submit my documents at the citizen office today.",
                "grammarTip": "Singular forms (ich/er/sie/es) change stem vowel and take no '-t' ending.",
            },
        ],
    },
    {
        "id": "a1-grammar-03-trennbare-modalverben",
        "level": "a1",
        "module": "02-grammar",
        "contentType": "grammar",
        "title": "Säule 03 · Trennbare Verben, Modalverben & Zeitpräpositionen",
        "subtitle": "Die Satzklammer mit können/müssen/wollen, trennbare Vorsilben (auf-, an-, ein-) und um/am/im.",
        "badge": "122 SÄULEN · GRAMMAR",
        "topics": ["Trennbare Verben", "Modalverben", "Satzklammer", "Präpositionen"],
        "pages": 3,
        "grammarNotes": {
            "rule": "Bei trennbaren Verben wandert das Präfix (auf, an, ab, ein, mit) ans Satzende: 'Ich stehe um 6 Uhr auf.' Bei Modalverben steht das Modalverb auf Position 2 und der Infinitiv am Satzende.",
            "proTip": "Temporale Faustregel: um + Uhrzeit, am + Tag/Tageszeit, im + Monat/Jahreszeit.",
            "examples": [
                "Der ICE nach Berlin fährt am Montag um 7:15 Uhr ab.",
                "Ich muss heute meine Unterlagen beim Bürgeramt abgeben.",
                "Im Sommer kann man im Park gut Deutsch lernen.",
            ],
        },
        "flashcards": [
            {
                "id": "fc_a1_gr_09_trennbar_2",
                "german": "einkaufen · aufstehen · anrufen · abfahren",
                "phonetic": "EYEN-kow-fen · OWF-shtay-en",
                "category": "Trennbare Verben",
                "english": "Core A1 separable verbs forming the sentence bracket",
                "hindi": "प्रमुख विभाज्य क्रियाएँ (Satzklammer बनाने के लिए)",
                "exampleDe": "Ich kaufe am Samstag im Supermarkt Lebensmittel ein.",
                "exampleTranslation": "I buy groceries at the supermarket on Saturday.",
                "grammarTip": "Stress is ALWAYS on the separable prefix: EIN-kaufen.",
            },
            {
                "id": "fc_a1_gr_10_duerfen",
                "german": "dürfen (Erlaubnis) vs. nicht müssen (keine Pflicht)",
                "phonetic": "DÜR-fen vs. nikht MÜS-sen",
                "category": "Modalverben",
                "english": "'nicht dürfen' = must not (forbidden) | 'nicht müssen' = don't have to",
                "hindi": "nicht dürfen = मनाही (Must not) | nicht müssen = आवश्यक नहीं (Need not)",
                "exampleDe": "Hier darf man nicht rauchen, aber Sie müssen nicht warten.",
                "exampleTranslation": "One must not smoke here, and you do not have to wait.",
                "grammarTip": "Classic false friend for English speakers: 'must not' = 'nicht dürfen'!",
            },
            {
                "id": "fc_a1_gr_11_imperativ",
                "german": "Imperativ (Sie / du / ihr)",
                "phonetic": "IM-pe-rah-teef",
                "category": "Aufforderung",
                "english": "Formal: Verb + Sie! ('Lesen Sie!') | Informal singular: stem ('Lies!')",
                "hindi": "आदेश/निर्देश: औपचारिक = Verb + Sie ('Lesen Sie bitte!')",
                "exampleDe": "Bitte füllen Sie das Formular vollständig aus!",
                "exampleTranslation": "Please fill out the form completely!",
                "grammarTip": "In formal Sie-Imperativ, 'Sie' comes right after the verb.",
            },
            {
                "id": "fc_a1_gr_12_possessiv",
                "german": "Possessivartikel: mein / dein / sein / ihr / unser",
                "phonetic": "mine / dine / zine / eer / OON-zer",
                "category": "Artikelwörter",
                "english": "Possessive determiners follow the exact same endings as 'ein/kein'",
                "hindi": "संबंध सूचक शब्द (mein, dein, sein, ihr) 'ein/kein' की तरह बदलते हैं",
                "exampleDe": "Das ist meine Kollegin und das ist mein Ausbildungsvertrag.",
                "exampleTranslation": "This is my colleague and this is my training contract.",
                "grammarTip": "Feminine & plural take '-e': 'meine Wohnung', 'meine Dokumente'.",
            },
        ],
    },

    # ── A2 GRAMMAR PILLARS ──
    {
        "id": "a2-grammar-01-perfekt-vergangenheit",
        "level": "a2",
        "module": "02-grammar",
        "contentType": "grammar",
        "title": "Säule 01 · Perfekt mit haben & sein + Partizip II",
        "subtitle": "Vergangenheitsbildung für Gespräche und Briefe: Ortswechsel, Zustandsänderung und untrennbare Verben.",
        "badge": "122 SÄULEN · GRAMMAR",
        "topics": ["Perfekt", "haben vs. sein", "Partizip II", "Präteritum sein/haben"],
        "pages": 3,
        "grammarNotes": {
            "rule": "Das Perfekt bildet eine Satzklammer aus Hilfsverb (haben/sein auf Position 2) + Partizip II am Satzende. 'sein' nutzt man bei Verben der Ortsveränderung (gehen, fahren, fliegen, kommen) und Zustandsänderung sowie sein/bleiben/werden.",
            "proTip": "Verben auf '-ieren' (telefonieren -> telefoniert, studieren -> studiert) und untrennbare Präfixe (be-, emp-, ent-, er-, ver-, zer-) bekommen KEIN 'ge-'!",
            "examples": [
                "Ich bin gestern mit dem Zug nach Berlin gefahren.",
                "Wir haben im Büro alle Verträge sorgfältig geprüft.",
                "Er hat drei Jahre in München Medizin studiert. (kein ge-!)",
            ],
        },
        "flashcards": [
            {
                "id": "fc_a2_gr_01_sein",
                "german": "Perfekt mit 'sein' (Bewegung)",
                "phonetic": "PAIR-fekt mit zine",
                "category": "Vergangenheit",
                "english": "Use 'sein' for movement A -> B or change of state",
                "hindi": "स्थान परिवर्तन (जाना, आना, उड़ना) के साथ हमेशा 'sein' का प्रयोग करें",
                "exampleDe": "Bist du letzte Woche nach Deutschland geflogen?",
                "exampleTranslation": "Did you fly to Germany last week?",
                "grammarTip": "sein, bleiben, werden, passieren also ALWAYS take 'sein'!",
            },
            {
                "id": "fc_a2_gr_02_partizip",
                "german": "Partizip II ohne 'ge-'",
                "phonetic": "par-tee-TSEEP tsvy",
                "category": "Wortbildung",
                "english": "No 'ge-' for '-ieren' verbs or inseparable prefixes (be-, er-, ver-)",
                "hindi": "'-ieren' और be-/er-/ver- क्रियाओं में 'ge-' नहीं जुड़ता",
                "exampleDe": "Ich habe das Formular heute Morgen unterschrieben.",
                "exampleTranslation": "I signed the form this morning.",
                "grammarTip": "Separable verbs put 'ge' in the middle: aufgestanden, eingekauft.",
            },
            {
                "id": "fc_a2_gr_03_praet_sein_haben",
                "german": "Präteritum von sein (war) & haben (hatte)",
                "phonetic": "vahr & HAT-te",
                "category": "Vergangenheit",
                "english": "Even in spoken German, always use 'ich war' and 'ich hatte' instead of Perfekt",
                "hindi": "बोलचाल में भी 'sein' और 'haben' के लिए हमेशा war / hatte का प्रयोग होता है",
                "exampleDe": "Gestern war ich beim Arzt und hatte hohes Fieber.",
                "exampleTranslation": "Yesterday I was at the doctor and had a high fever.",
                "grammarTip": "Modal verbs also prefer Präteritum in speech: konnte, musste, wollte.",
            },
            {
                "id": "fc_a2_gr_04_trennbar_perf",
                "german": "Partizip II bei trennbaren Verben: ein-ge-kauft",
                "phonetic": "EYEN-ge-kowft",
                "category": "Perfekt Morphologie",
                "english": "Insert '-ge-' directly between the separable prefix and the verb stem",
                "hindi": "विभाज्य क्रियाओं में '-ge-' हमेशा उपसर्ग और धातु के बीच लगता है",
                "exampleDe": "Hast du alle Unterlagen für das Visum mitgebracht?",
                "exampleTranslation": "Did you bring all documents for the visa along?",
                "grammarTip": "aufstehen -> aufgestanden; anrufen -> angerufen; abfahren -> abgefahren.",
            },
        ],
    },
    {
        "id": "a2-grammar-02-wechselpraepositionen",
        "level": "a2",
        "module": "02-grammar",
        "contentType": "grammar",
        "title": "Säule 02 · Wechselpräpositionen (Wo? Dativ vs. Wohin? Akkusativ)",
        "subtitle": "Die 9 Wechselpräpositionen (in, an, auf, neben, hinter, über, unter, vor, zwischen) mit legen/liegen, stellen/stehen.",
        "badge": "122 SÄULEN · GRAMMAR",
        "topics": ["Wechselpräpositionen", "Dativ", "Akkusativ", "Positionsverben"],
        "pages": 3,
        "grammarNotes": {
            "rule": "Die neun Wechselpräpositionen verlangen auf die Frage 'Wohin?' (Richtung/Bewegung mit legen, stellen, setzen, hängen) den Akkusativ. Auf die Frage 'Wo?' (statische Position mit liegen, stehen, sitzen, hängen) verlangen sie den Dativ.",
            "proTip": "Verschmelzungen im Alltag: an + dem = am, in + dem = im, an + das = ans, in + das = ins.",
            "examples": [
                "Wohin? -> Ich lege den Vertrag auf den Schreibtisch. (Akkusativ)",
                "Wo? -> Der Vertrag liegt schon auf dem Schreibtisch. (Dativ)",
                "Wir hängen den Dienstplan an die Wand. / Er hängt an der Wand.",
            ],
        },
        "flashcards": [
            {
                "id": "fc_a2_gr_05_wo_wohin",
                "german": "Wo? (+ Dativ) vs. Wohin? (+ Akkusativ)",
                "phonetic": "voh (DAH-teef) vs. voh-HIN (AH-koo-zah-teef)",
                "category": "Präpositionen",
                "english": "Static location = Dative | Directional movement = Accusative",
                "hindi": "जगह (कहाँ / Wo?) = Dativ | दिशा/गति (किधर / Wohin?) = Akkusativ",
                "exampleDe": "Ich stelle die Akte ins Regal; jetzt steht sie im Regal.",
                "exampleTranslation": "I put the file onto the shelf; now it stands in the shelf.",
                "grammarTip": "Dativ articles: dem (m/n), der (f), den + -n (pl).",
            },
            {
                "id": "fc_a2_gr_06_dativ_pl",
                "german": "Dativ Plural: den + Nomen + -n",
                "phonetic": "den + -en",
                "category": "Kasus Dativ",
                "english": "Dative plural adds '-n' to the noun (unless it already ends in -n or -s)",
                "hindi": "Dativ बहुवचन में संज्ञा के अंत में '-n' जुड़ता है (जैसे den Kindern, den Kollegen)",
                "exampleDe": "Mit den neuen Kollegen arbeite ich sehr gern zusammen.",
                "exampleTranslation": "I enjoy working together with the new colleagues.",
                "grammarTip": "Exceptions: 'den Autos', 'den Hotels' (-s plurals keep -s).",
            },
            {
                "id": "fc_a2_gr_07_dativ_praep",
                "german": "Reine Dativ-Präpositionen: aus, bei, mit, nach, seit, von, zu",
                "phonetic": "ows, by, mit, nakh, zite, fon, tsoo",
                "category": "Präpositionen",
                "english": "Always require Dative regardless of movement or location",
                "hindi": "aus, bei, mit, nach, seit, von, zu — इनके बाद हमेशा Dativ आता है",
                "exampleDe": "Seit einem Monat fahre ich mit der S-Bahn zur Arbeit.",
                "exampleTranslation": "For one month I have been taking the S-Bahn to work.",
                "grammarTip": "zur = zu + der; zum = zu + dem; beim = bei + dem; vom = von + dem.",
            },
            {
                "id": "fc_a2_gr_08_reflexiv",
                "german": "Reflexive Verben (sich freuen / sich bewerben / sich erinnern)",
                "phonetic": "re-flek-SEE-ve VAIR-ben",
                "category": "Verben",
                "english": "mich / dich / sich / uns / euch / sich",
                "hindi": "निजवाचक क्रियाएँ: sich freuen, sich krankmelden, sich bewerben",
                "exampleDe": "Ich bewerbe mich um einen Ausbildungsplatz in Berlin.",
                "exampleTranslation": "I am applying for a vocational training position in Berlin.",
                "grammarTip": "In 3rd person (er/sie/es/Sie/sie), reflexive pronoun is always 'sich'.",
            },
        ],
    },
    {
        "id": "a2-grammar-03-nebensaetze-adjektive",
        "level": "a2",
        "module": "02-grammar",
        "contentType": "grammar",
        "title": "Säule 03 · Nebensätze (weil, dass, wenn) & Adjektivdeklination",
        "subtitle": "Verbendstellung nach Subjunktionen sowie Adjektivendungen nach bestimmten und unbestimmten Artikeln.",
        "badge": "122 SÄULEN · GRAMMAR",
        "topics": ["weil/dass/wenn", "Verbendstellung", "Adjektivdeklination", "Komparativ"],
        "pages": 3,
        "grammarNotes": {
            "rule": "Nach 'weil' (Grund), 'dass' (Fakt) und 'wenn' (Bedingung/Zeit) steht das konjugierte Verb ganz am Ende des Nebensatzes. Steht der Nebensatz vor dem Hauptsatz, beginnt der Hauptsatz sofort mit dem Verb (Verb-Komma-Verb-Regel).",
            "proTip": "Nach bestimmtem Artikel (der/die/das) im Nominativ Singular enden Adjektive auf '-e'; nach Dativ/Plural immer auf '-en'!",
            "examples": [
                "Ich lerne Deutsch, weil ich in einem Berliner Krankenhaus arbeiten möchte.",
                "Wenn ich die B2-Prüfung bestehe, bekomme ich meine Anerkennung.",
                "Der neue Dienstplan hängt im modernen Stationszimmer.",
            ],
        },
        "flashcards": [
            {
                "id": "fc_a2_gr_09_verb_ende",
                "german": "Nebensatz: weil / dass / wenn -> Verb am Ende",
                "phonetic": "NAY-ben-zats: fairb am EN-de",
                "category": "Satzgefüge",
                "english": "Subordinating conjunctions send the conjugated verb to the end",
                "hindi": "weil, dass, wenn के बाद मुख्य क्रिया वाक्य के एकदम अंत में जाती है",
                "exampleDe": "Weil er krank war, ist er zu Hause geblieben.",
                "exampleTranslation": "Because he was sick, he stayed at home.",
                "grammarTip": "Notice Verb-Komma-Verb when the Nebensatz comes first: '...war, ist...'",
            },
            {
                "id": "fc_a2_gr_10_wenn_als",
                "german": "wenn (Gegenwart/wiederholt) vs. als (einmalig Vergangenheit)",
                "phonetic": "ven vs. als",
                "category": "Temporalsätze",
                "english": "'als' = single past event | 'wenn' = present/future/repeated past",
                "hindi": "als = भूतकाल की एक घटना | wenn = वर्तमान/भविष्य या बार-बार होने वाली घटना",
                "exampleDe": "Als ich in Berlin ankam, war es kalt. / Wenn ich Zeit habe, lerne ich.",
                "exampleTranslation": "When I arrived in Berlin, it was cold. / Whenever I have time, I study.",
                "grammarTip": "Never use 'wann' as a conjunction — 'wann' is only for questions!",
            },
            {
                "id": "fc_a2_gr_11_adj_dekl",
                "german": "Adjektivendungen: -e (Nom. bestimmt) vs. -en (Dativ/Plural)",
                "phonetic": "at-yek-TEEF-en-doon-gen",
                "category": "Adjektivdeklination",
                "english": "After 'der/die/das': Nom sg = -e; Dativ & Plural = ALWAYS -en",
                "hindi": "विशेषण के अंत: Nominativ (der/die/das) में -e, और Dativ/बहुवचन में हमेशा -en",
                "exampleDe": "Die neue Ärztin hilft den kranken Patienten mit großer Geduld.",
                "exampleTranslation": "The new doctor helps the sick patients with great patience.",
                "grammarTip": "After 'ein/eine/mein' in Nom sg: Masc = -er ('ein neuer'), Fem = -e, Neut = -es.",
            },
            {
                "id": "fc_a2_gr_12_komparativ",
                "german": "Komparativ & Superlativ: gut - besser - am besten",
                "phonetic": "goot - BES-ser - am BES-ten",
                "category": "Steigerung",
                "english": "Irregular comparisons: gut/besser, viel/mehr, gern/lieber, hoch/höher",
                "hindi": "तुलनात्मक रूप: gut-besser-am besten, gern-lieber, viel-mehr",
                "exampleDe": "In Berlin ist die Ausbildung besser als erwartet.",
                "exampleTranslation": "In Berlin the training is better than expected.",
                "grammarTip": "Use 'als' after comparative ('besser als'), and 'so ... wie' for equality.",
            },
        ],
    },

    # ── B1 GRAMMAR PILLARS (6 FULL 122-SÄULEN PILLARS) ──
    {
        "id": "b1-grammar-01-nebensaetze-konnektoren",
        "level": "b1",
        "module": "02-grammar",
        "contentType": "grammar",
        "title": "Säule 01 · Nebensätze & Konnektoren (weil, obwohl, damit, sodass)",
        "subtitle": "122 Säulen Grammatiktheorie: Verbendstellung bei Subjunktionen vs. Inversion bei Konjunktionaladverbien (deshalb, trotzdem).",
        "badge": "122 SÄULEN · GRAMMAR",
        "topics": ["weil / da", "obwohl / trotzdem", "damit / sodass", "Verbposition"],
        "pages": 4,
        "grammarNotes": {
            "rule": "Subjunktionen (weil, da, obwohl, damit, sodass, während, bevor, nachdem) leiten einen Nebensatz ein -> das konjugierte Verb steht am Satzende. Konjunktionaladverbien (deshalb, darum, trotzdem, außerdem, sonst) stehen auf Position 1 oder 3 im Hauptsatz -> das Verb folgt direkt auf Position 2.",
            "proTip": "Achten Sie auf den klassischen B1-Fehler: 'obwohl' = Verb am Ende ('Obwohl es regnet, gehe ich...'), 'trotzdem' = Verb auf Position 2 ('Es regnet. Trotzdem gehe ich...').",
            "examples": [
                "Kausal (Grund): Ich lerne täglich Fachvokabeln, weil/da ich die B1-Prüfung bestehen möchte.",
                "Konzessiv (Gegensatz): Obwohl der Schichtdienst anstrengend ist, macht mir die Arbeit Freude.",
                "Konzessiv (Hauptsatz): Der Schichtdienst ist anstrengend. Trotzdem macht mir die Arbeit Freude.",
                "Final vs. Konsekutiv: Ich erkläre alles langsam, damit der Patient es versteht. / Es war laut, sodass ich nichts hörte.",
            ],
        },
        "flashcards": [
            {
                "id": "fc_b1_gr_01_obwohl_trotzdem",
                "german": "obwohl (Nebensatz) vs. trotzdem (Hauptsatz)",
                "phonetic": "op-VOHL vs. TROTS-dem",
                "category": "Konzessiv-Konnektoren",
                "english": "although (verb at end) vs. nevertheless (verb in position 2)",
                "hindi": "obwohl = क्रिया अंत में (हालाँकि) | trotzdem = क्रिया Position 2 पर (फिर भी)",
                "exampleDe": "Obwohl die Prüfung schwer war, hat er sie bestanden. / Die Prüfung war schwer; trotzdem hat er bestanden.",
                "exampleTranslation": "Although the exam was hard, he passed. / The exam was hard; nevertheless he passed.",
                "grammarTip": "Never use 'trotzdem' with the verb at the end in formal written German!",
            },
            {
                "id": "fc_b1_gr_02_damit_sodass",
                "german": "damit (Absicht) vs. sodass (Folge)",
                "phonetic": "DAH-mit vs. zoh-DAS",
                "category": "Final & Konsekutiv",
                "english": "so that (purpose/intention) vs. with the result that (consequence)",
                "hindi": "damit = उद्देश्य (ताकि) | sodass = परिणाम (जिससे कि)",
                "exampleDe": "Sie spricht deutlich, damit alle sie verstehen.",
                "exampleTranslation": "She speaks clearly so that everyone understands her.",
                "grammarTip": "If both clauses share the same subject, replace 'damit' with 'um ... zu + Infinitiv'.",
            },
            {
                "id": "fc_b1_gr_03_deshalb_weil",
                "german": "deshalb / daher vs. weil / da",
                "phonetic": "DES-halp vs. vile",
                "category": "Kausal-Konnektoren",
                "english": "therefore (Position 1 + Verb) vs. because (Verb at end)",
                "hindi": "deshalb = इसलिए (Pos 1 + Verb) | weil/da = क्योंकि (Verb अंत में)",
                "exampleDe": "Da ich einen Termin habe, muss ich früher gehen. = Ich habe einen Termin, deshalb muss ich früher gehen.",
                "exampleTranslation": "Since I have an appointment, I must leave earlier.",
                "grammarTip": "'da' is preferred when placing the reason BEFORE the main clause.",
            },
            {
                "id": "fc_b1_gr_04_nachdem",
                "german": "nachdem (Vorzeitigkeit / Zeitenfolge)",
                "phonetic": "nakh-DAYM",
                "category": "Temporalsätze",
                "english": "after (requires one tense step earlier than main clause)",
                "hindi": "nachdem (के बाद) — मुख्य वाक्य से एक काल (Tense) पहले का उपयोग होता है",
                "exampleDe": "Nachdem er das Zertifikat erhalten hatte, beantragte er das Visum.",
                "exampleTranslation": "After he had received the certificate, he applied for the visa.",
                "grammarTip": "Main clause Präsens -> nachdem Perfekt. Main clause Präteritum -> nachdem Plusquamperfekt.",
            },
        ],
    },
    {
        "id": "b1-grammar-02-passiv-formen",
        "level": "b1",
        "module": "02-grammar",
        "contentType": "grammar",
        "title": "Säule 02 · Vorgangspassiv (Präsens, Präteritum & Modalverben)",
        "subtitle": "122 Säulen Grammatiktheorie: Fokus auf die Handlung statt auf den Handelnden — werden + Partizip II, von vs. durch.",
        "badge": "122 SÄULEN · GRAMMAR",
        "topics": ["Passiv Präsens", "Passiv Präteritum", "Modalverb + Passiv", "von / durch"],
        "pages": 4,
        "grammarNotes": {
            "rule": "Das Vorgangspassiv wird mit 'werden' + Partizip II gebildet. Das Akkusativobjekt des Aktivsatzes wird zum Subjekt (Nominativ) im Passivsatz. Präsens: 'wird/werden + Partizip II'; Präteritum: 'wurde/wurden + Partizip II'; mit Modalverb: 'Modalverb + Partizip II + werden'.",
            "proTip": "Handelnde Personen oder Institutionen werden mit 'von' (+ Dativ) angeschlossen, Mittel/Instrumente oder Ursachen mit 'durch' (+ Akkusativ).",
            "examples": [
                "Präsens: Die Medikamente werden vom Arzt verordnet.",
                "Präteritum: Das Krankenhaus wurde im Jahr 1998 modernisiert.",
                "Perfekt Passiv: Der Antrag ist bereits vollständig bearbeitet worden. (nicht 'geworden'!)",
                "Mit Modalverb: Die Unterlagen müssen bis Freitag eingereicht werden.",
            ],
        },
        "flashcards": [
            {
                "id": "fc_b1_gr_05_passiv_praes",
                "german": "Passiv Präsens: wird / werden + Partizip II",
                "phonetic": "PAS-seef PRAY-zens",
                "category": "Passivbildung",
                "english": "Present passive: conjugated 'werden' + past participle at end",
                "hindi": "वर्तमान कर्मवाच्य: wird/werden + Partizip II (वाक्य के अंत में)",
                "exampleDe": "Der Patient wird jeden Morgen untersucht.",
                "exampleTranslation": "The patient is examined every morning.",
                "grammarTip": "Only 'werden' conjugates; the Partizip II never changes.",
            },
            {
                "id": "fc_b1_gr_06_passiv_praet",
                "german": "Passiv Präteritum: wurde / wurden + Partizip II",
                "phonetic": "VOOR-de + par-tee-TSEEP",
                "category": "Passiv Vergangenheit",
                "english": "Simple past passive (standard in reports and news)",
                "hindi": "भूतकाल कर्मवाच्य: wurde/wurden + Partizip II (रिपोर्ट व समाचारों में)",
                "exampleDe": "Die Visumunterlagen wurden gestern geprüft.",
                "exampleTranslation": "The visa documents were checked yesterday.",
                "grammarTip": "In Perfekt Passiv, always use 'worden' (NOT 'geworden'): 'ist geprüft worden'.",
            },
            {
                "id": "fc_b1_gr_07_passiv_modal",
                "german": "Modalverb + Partizip II + werden",
                "phonetic": "moh-DAHL-vairb + VAIR-den",
                "category": "Passiv mit Modalverb",
                "english": "Modal verb (Pos 2) ... Partizip II + infinitive 'werden' (end)",
                "hindi": "Modalverb (Pos 2) ... Partizip II + werden (अंत में)",
                "exampleDe": "Die Schweigepflicht muss immer eingehalten werden.",
                "exampleTranslation": "Confidentiality must always be observed.",
                "grammarTip": "In a Nebensatz, the Modalverb goes to the very end: '...eingehalten werden muss.'",
            },
            {
                "id": "fc_b1_gr_08_von_durch",
                "german": "Agens: von (+ Dativ) vs. durch (+ Akkusativ)",
                "phonetic": "fon vs. doorkh",
                "category": "Passiv Agens",
                "english": "'von' for person/agent | 'durch' for cause/instrument/medium",
                "hindi": "व्यक्ति/संस्था के लिए 'von (+Dat)' और माध्यम/कारण के लिए 'durch (+Akk)'",
                "exampleDe": "Der Brief wurde von der Leitung durch einen Boten geschickt.",
                "exampleTranslation": "The letter was sent by management via a courier.",
                "grammarTip": "Do not confuse 'von' + Dativ with English 'from'.",
            },
        ],
    },
    {
        "id": "b1-grammar-03-relativsaetze",
        "level": "b1",
        "module": "02-grammar",
        "contentType": "grammar",
        "title": "Säule 03 · Relativsätze in allen vier Kasus & mit Präpositionen",
        "subtitle": "122 Säulen Grammatiktheorie: Bezugswort bestimmt Genus & Numerus — Verb im Relativsatz bestimmt Kasus (der/dem/denen/dessen/deren).",
        "badge": "122 SÄULEN · GRAMMAR",
        "topics": ["Relativpronomen", "Dativ denen", "Genitiv dessen/deren", "Präposition + Relativ"],
        "pages": 4,
        "grammarNotes": {
            "rule": "Die goldene Zwei-Schritt-Regel: (1) Genus und Numerus (Maskulin, Feminin, Neutrum, Plural) kommen vom Bezugswort im Hauptsatz. (2) Der Kasus (Nominativ, Akkusativ, Dativ, Genitiv) richtet sich ausschließlich nach der Funktion (Verb oder Präposition) IM Relativsatz.",
            "proTip": "Besonders prüfungsrelevant in B1: Dativ Plural = 'denen' (NICHT 'den'!), Genitiv Maskulin/Neutrum = 'dessen', Genitiv Feminin/Plural = 'deren'.",
            "examples": [
                "Dativ Feminin: Das ist die Kollegin, der ich gestern bei der Übergabe geholfen habe. (helfen + Dativ)",
                "Dativ Plural: Die Patienten, denen wir das Formular gaben, waren sehr dankbar.",
                "Genitiv: Die Bewerberin, deren Unterlagen vollständig sind, wird eingeladen.",
                "Mit Präposition: Das Krankenhaus, in dem (= wo) sie arbeitet, liegt in Berlin-Mitte.",
            ],
        },
        "flashcards": [
            {
                "id": "fc_b1_gr_09_rel_denen",
                "german": "Dativ Plural Relativpronomen: denen",
                "phonetic": "DAY-nen",
                "category": "Relativsätze",
                "english": "Dative plural relative pronoun is 'denen' (NOT 'den'!)",
                "hindi": "बहुवचन Dativ में Relativpronomen हमेशा 'denen' होता है",
                "exampleDe": "Die Kolleginnen, mit denen ich arbeite, sind sehr hilfsbereit.",
                "exampleTranslation": "The colleagues with whom I work are very helpful.",
                "grammarTip": "Same distinction: Definite article is 'den', Relative/Demonstrative pronoun is 'denen'.",
            },
            {
                "id": "fc_b1_gr_10_rel_genitiv",
                "german": "Genitiv Relativ: dessen (m/n) · deren (f/pl)",
                "phonetic": "DES-sen · DAY-ren",
                "category": "Relativsätze Genitiv",
                "english": "whose: 'dessen' (masc/neut) & 'deren' (fem/plural) — no article on following noun",
                "hindi": "जिसका/जिसकी (whose): पुल्लिंग/नपुंसक = dessen | स्त्रीलिंग/बहुवचन = deren",
                "exampleDe": "Der Patient, dessen Fieber gesunken ist, darf heute nach Hause.",
                "exampleTranslation": "The patient whose fever has dropped may go home today.",
                "grammarTip": "Drop the article on the possessed noun right after dessen/deren!",
            },
            {
                "id": "fc_b1_gr_11_rel_praep",
                "german": "Präposition + Relativpronomen",
                "phonetic": "pray-po-zee-tsee-OHN + re-lah-TEEF",
                "category": "Feste Präpositionen",
                "english": "Preposition stays BEFORE the relative pronoun and governs its case",
                "hindi": "Preposition हमेशा Relativpronomen के ठीक पहले आती है",
                "exampleDe": "Der Beruf, für den ich mich interessiere, bietet gute Perspektiven.",
                "exampleTranslation": "The profession in which I am interested offers good prospects.",
                "grammarTip": "For places, 'in dem / auf dem' can often be replaced by 'wo'.",
            },
            {
                "id": "fc_b1_gr_12_rel_was",
                "german": "Relativpronomen 'was' & 'wo'",
                "phonetic": "vas oont voh",
                "category": "Spezielle Relativsätze",
                "english": "'was' after alles, etwas, nichts, superlatives, or whole clauses",
                "hindi": "alles, etwas, nichts या पूरे वाक्य के संदर्भ में 'was' का उपयोग",
                "exampleDe": "Alles, was wir im B1-Kurs gelernt haben, war in der Prüfung nützlich.",
                "exampleTranslation": "Everything that we learned in the B1 course was useful in the exam.",
                "grammarTip": "Use 'wo' after city/country names without preposition: 'Berlin, wo ich wohne'.",
            },
        ],
    },
    {
        "id": "b1-grammar-04-konjunktiv-ii",
        "level": "b1",
        "module": "02-grammar",
        "contentType": "grammar",
        "title": "Säule 04 · Konjunktiv II (Höflichkeit, Wünsche & Ratschläge)",
        "subtitle": "122 Säulen Grammatiktheorie: würde + Infinitiv, wäre, hätte, könnte, sollte und irreale Bedingungssätze mit 'wenn'.",
        "badge": "122 SÄULEN · GRAMMAR",
        "topics": ["würde + Infinitiv", "wäre / hätte", "sollte / könnte", "Irreale Wünsche"],
        "pages": 4,
        "grammarNotes": {
            "rule": "Im B1-Alltag nutzt man für sein -> wäre, haben -> hätte, werden -> würde und für Modalverben Umlautformen (könnte, dürfte, müsste, sollte — Achtung: 'sollte' und 'wollte' ohne Umlaut!). Alle anderen Verben bildet man mit 'würde + Infinitiv'.",
            "proTip": "In formellen E-Mails und Bewerbungen wirkt 'Ich würde mich sehr über eine Rückmeldung freuen' oder 'Könnten Sie mir bitte...' sofort diplomatisch und höflich.",
            "examples": [
                "Höfliche Bitte: Könnten Sie mir bitte die Bescheinigung bis morgen zusenden?",
                "Ratschlag: An deiner Stelle würde ich täglich 20 Minuten laut lesen. / Du solltest früher schlafen.",
                "Irrealer Wunsch: Wenn ich doch nur mehr Zeit für die Prüfungsvorbereitung hätte!",
                "Bedingung: Wenn die Miete günstiger wäre, würden wir sofort umziehen.",
            ],
        },
        "flashcards": [
            {
                "id": "fc_b1_gr_13_waere_haette",
                "german": "wäre · hätte · könnte · würde",
                "phonetic": "VAY-re · HET-te · KÖN-te · VÜR-de",
                "category": "Konjunktiv II Formen",
                "english": "Core irregular subjunctive II forms (never use 'würde sein' or 'würde haben'!)",
                "hindi": "sein (wäre), haben (hätte), können (könnte) — इनके साथ 'würde' कभी न लगाएं",
                "exampleDe": "Wenn ich in Berlin wäre, hätte ich weniger Fahrtzeit.",
                "exampleTranslation": "If I were in Berlin, I would have less commute time.",
                "grammarTip": "'sollte' (should) and 'wollte' take NO umlaut.",
            },
            {
                "id": "fc_b1_gr_14_hoeflichkeit",
                "german": "Höfliche Bitten (Konjunktiv II)",
                "phonetic": "HÖF-likh-kites-for-men",
                "category": "Schreiben & Sprechen",
                "english": "Polite requests for emails, phone calls, and customer service",
                "hindi": "औपचारिक ईमेल व बातचीत में विनम्र अनुरोध के लिए Konjunktiv II",
                "exampleDe": "Ich würde mich über eine Einladung zum Gespräch sehr freuen.",
                "exampleTranslation": "I would be very pleased about an invitation to an interview.",
                "grammarTip": "Watch out: 'wurde' (no umlaut) is past passive; 'würde' (umlaut!) is Konjunktiv II.",
            },
            {
                "id": "fc_b1_gr_15_ratschlag",
                "german": "Ratschlag: Du solltest ... / An deiner Stelle...",
                "phonetic": "ahn DY-ner SHTEL-le",
                "category": "Beratung & Redemittel",
                "english": "Giving advice politely with 'sollte' or 'An deiner Stelle würde ich...'",
                "hindi": "सलाह देना: Du solltest... (तुम्हें चाहिए) / An deiner Stelle... (तुम्हारी जगह मैं)",
                "exampleDe": "An Ihrer Stelle würde ich den Arbeitsvertrag vorab genau prüfen.",
                "exampleTranslation": "In your place, I would check the employment contract carefully beforehand.",
                "grammarTip": "Used heavily in B1 formal & semi-formal advice writing.",
            },
            {
                "id": "fc_b1_gr_16_irreal_ohne_wenn",
                "german": "Irrealer Bedingungssatz ohne 'wenn'",
                "phonetic": "ee-ray-AH-ler be-DIN-goongs-zats",
                "category": "Erweiterter Satzbau",
                "english": "Drop 'wenn' by placing the Konjunktiv II verb in Position 1",
                "hindi": "बिना 'wenn' के शर्त वाले वाक्य (क्रिया Position 1 पर रखें)",
                "exampleDe": "Hätte ich mehr Zeit, würde ich noch eine Sprache lernen.",
                "exampleTranslation": "Had I more time, I would learn another language.",
                "grammarTip": "Same meaning as 'Wenn ich mehr Zeit hätte, ...' — adds style points in B1/B2!",
            },
        ],
    },
    {
        "id": "b1-grammar-05-infinitivsaetze",
        "level": "b1",
        "module": "02-grammar",
        "contentType": "grammar",
        "title": "Säule 05 · Infinitivkonstruktionen (zu, um ... zu, ohne ... zu, statt ... zu)",
        "subtitle": "122 Säulen Grammatiktheorie: Wann steht 'zu + Infinitiv', wo sitzt 'zu' bei trennbaren Verben und wann braucht man KEIN 'zu'?",
        "badge": "122 SÄULEN · GRAMMAR",
        "topics": ["Infinitiv mit zu", "um ... zu", "ohne ... zu / statt ... zu", "Null-zu Verben"],
        "pages": 4,
        "grammarNotes": {
            "rule": "Nach vielen Verben (vorhaben, planen, versuchen, vergessen, hoffen, beginnen) und Ausdrücken ('Es ist wichtig / möglich / verboten') folgt ', ... zu + Infinitiv'. Bei trennbaren Verben rutscht 'zu' zwischen Präfix und Stamm (einzukaufen, aufzustehen). 'um ... zu' drückt ein Ziel bei IDENTISCHEM Subjekt aus.",
            "proTip": "KEIN 'zu' steht nach Modalverben (können, müssen...), Bewegungsverben (gehen, fahren, kommen), Wahrnehmungsverben (sehen, hören) sowie 'lassen' und 'bleiben'!",
            "examples": [
                "Einfacher Infinitivsatz: Ich habe vor, im nächsten Jahr in Berlin zu arbeiten.",
                "Trennbares Verb: Vergessen Sie nicht, Ihr Ticket vor der Fahrt abzustempeln.",
                "Final (gleiches Subjekt): Sie besucht einen Kurs, um fließend Deutsch zu sprechen.",
                "Ohne 'zu': Ich gehe heute einkaufen. / Wir bleiben sitzen.",
            ],
        },
        "flashcards": [
            {
                "id": "fc_b1_gr_17_zu_trennbar",
                "german": "zu + trennbares Verb: aufzustehen / einzukaufen",
                "phonetic": "owf-tsoo-SHTAY-en",
                "category": "Infinitiv-Morphologie",
                "english": "'zu' sits BETWEEN the separable prefix and the verb stem (one word)",
                "hindi": "विभाज्य क्रियाओं में 'zu' उपसर्ग और क्रिया के बीच जुड़कर एक शब्द बनाता है",
                "exampleDe": "Es ist notwendig, alle Unterlagen rechtzeitig einzureichen.",
                "exampleTranslation": "It is necessary to submit all documents on time.",
                "grammarTip": "Written as ONE single word: ein-zu-reichen, vor-zu-bereiten, teil-zu-nehmen.",
            },
            {
                "id": "fc_b1_gr_18_um_zu_vs_damit",
                "german": "um ... zu (gleiches Subjekt) vs. damit (verschiedene Subjekte)",
                "phonetic": "oom ... tsoo vs. DAH-mit",
                "category": "Finalsätze",
                "english": "Same subject = um...zu | Different subjects = damit",
                "hindi": "दोनों वाक्यों में एक ही कर्ता = um...zu | अलग-अलग कर्ता = damit",
                "exampleDe": "Ich lerne Deutsch, um in Berlin zu studieren. / Ich erkläre es, damit du es verstehst.",
                "exampleTranslation": "I learn German in order to study in Berlin. / I explain it so you understand.",
                "grammarTip": "Never put a subject pronoun inside an 'um ... zu' clause.",
            },
            {
                "id": "fc_b1_gr_19_ohne_statt_zu",
                "german": "ohne ... zu · (an)statt ... zu",
                "phonetic": "OH-ne ... tsoo · ahn-SHTAT ... tsoo",
                "category": "Infinitivkonstruktionen",
                "english": "without ... -ing / instead of ... -ing (same subject)",
                "hindi": "बिना ... किए (ohne...zu) / के बजाय (statt...zu)",
                "exampleDe": "Er ging aus dem Haus, ohne sich zu verabschieden.",
                "exampleTranslation": "He left the house without saying goodbye.",
                "grammarTip": "With different subjects, use 'ohne dass' or 'anstatt dass'.",
            },
            {
                "id": "fc_b1_gr_20_kein_zu",
                "german": "Verben OHNE 'zu': Modalverben, gehen, bleiben, lassen",
                "phonetic": "OH-ne tsoo",
                "category": "Ausnahmen",
                "english": "No 'zu' after modals, gehen, fahren, sehen, hören, lassen, bleiben",
                "hindi": "Modalverben, gehen, bleiben, lassen के बाद कभी 'zu' नहीं लगता",
                "exampleDe": "Der Arzt lässt den Patienten zwei Tage im Bett bleiben.",
                "exampleTranslation": "The doctor lets the patient stay in bed for two days.",
                "grammarTip": "'helfen' and 'lernen' also typically omit 'zu' in short phrases.",
            },
        ],
    },
    {
        "id": "b1-grammar-06-genitiv-n-deklination",
        "level": "b1",
        "module": "02-grammar",
        "contentType": "grammar",
        "title": "Säule 06 · Genitiv-Präpositionen, n-Deklination & Doppelkonnektoren",
        "subtitle": "122 Säulen Grammatiktheorie: wegen/trotz/während + Genitiv, maskuline Nomen auf -n/-en und zweiteilige Konnektoren.",
        "badge": "122 SÄULEN · GRAMMAR",
        "topics": ["Genitiv wegen/trotz", "n-Deklination", "sowohl ... als auch", "weder ... noch"],
        "pages": 4,
        "grammarNotes": {
            "rule": "Die vier wichtigsten B1-Genitivpräpositionen lauten wegen, trotz, während und (an)statt. Maskulinum und Neutrum bekommen im Genitiv die Endung '-s' oder '-es' (trotz des Regens, während des Kurses). Bei der n-Deklination erhalten bestimmte maskuline Nomen (der Patient, der Kollege, der Mensch, der Name) in Akkusativ, Dativ und Genitiv die Endung '-n' oder '-en'.",
            "proTip": "Zweiteilige Konnektoren verbinden Satzteile symmetrisch: 'sowohl ... als auch', 'nicht nur ... sondern auch', 'weder ... noch' (KEIN zusätzliches 'nicht'!), 'entweder ... oder', 'zwar ... aber'.",
            "examples": [
                "Genitiv: Trotz des schlechten Wetters kamen alle Teilnehmer pünktlich. / Wegen einer Krankheit fehlt er.",
                "n-Deklination: Die Ärztin untersucht den Patienten (Akk.) und spricht mit dem Kollegen (Dat.).",
                "Doppelkonnektor: Sie beherrscht sowohl Deutsch als auch Englisch verhandlungssicher.",
                "Verneinung: Er hat weder angerufen noch eine E-Mail geschrieben.",
            ],
        },
        "flashcards": [
            {
                "id": "fc_b1_gr_21_genitiv_praep",
                "german": "wegen · trotz · während · statt (+ Genitiv)",
                "phonetic": "VAY-gen · trots · VAY-rent · shtat",
                "category": "Genitivpräpositionen",
                "english": "because of / despite / during / instead of (+ Genitive: des + -(e)s, der)",
                "hindi": "wegen (के कारण), trotz (के बावजूद), während (के दौरान), statt (के बजाय) + Genitiv",
                "exampleDe": "Während der Probezeit beträgt die Kündigungsfrist zwei Wochen.",
                "exampleTranslation": "During the probation period, the notice period is two weeks.",
                "grammarTip": "Plural Genitive uses 'der': 'wegen der hohen Kosten'.",
            },
            {
                "id": "fc_b1_gr_22_n_deklination",
                "german": "n-Deklination: der Patient -> den/dem/des Patienten",
                "phonetic": "en-day-klee-nah-tsee-OHN",
                "category": "Substantiv-Deklination",
                "english": "Certain masculine nouns add -(e)n in every case EXCEPT Nominative singular",
                "hindi": "der Patient, der Kollege, der Herr, der Student को Nominative छोड़ हर जगह -(e)n लगता है",
                "exampleDe": "Ich habe den Kollegen im Krankenhaus nach dem Namen gefragt.",
                "exampleTranslation": "I asked the colleague in the hospital for the name.",
                "grammarTip": "Watch for nouns ending in -e (Kollege), -ent (Patient/Student), -ant (Praktikant), -ist (Polizist).",
            },
            {
                "id": "fc_b1_gr_23_sowohl",
                "german": "sowohl ... als auch / nicht nur ... sondern auch",
                "phonetic": "zoh-VOHL ... als owkh",
                "category": "Zweiteilige Konnektoren",
                "english": "both ... and / not only ... but also",
                "hindi": "दोनों (sowohl ... als auch) / न केवल ... बल्कि (nicht nur ... sondern auch)",
                "exampleDe": "Das Programm fördert sowohl die Sprache als auch den Berufseinstieg.",
                "exampleTranslation": "The program promotes both language and career entry.",
                "grammarTip": "Subject + 'sowohl A als auch B' takes plural verb when connecting two subjects.",
            },
            {
                "id": "fc_b1_gr_24_weder_noch",
                "german": "weder ... noch / entweder ... oder",
                "phonetic": "VAY-der ... nokh",
                "category": "Zweiteilige Konnektoren",
                "english": "neither ... nor / either ... or",
                "hindi": "न तो ... न ही (weder ... noch) / या तो ... या (entweder ... oder)",
                "exampleDe": "Es sind weder Wörterbücher noch Mobiltelefone erlaubt.",
                "exampleTranslation": "Neither dictionaries nor mobile phones are permitted.",
                "grammarTip": "Never add 'nicht' or 'kein' when using 'weder ... noch' — it already negates!",
            },
        ],
    },

    # ── B2 GRAMMAR PILLARS ──
    {
        "id": "b2-grammar-01-nominalstil",
        "level": "b2",
        "module": "02-grammar",
        "contentType": "grammar",
        "title": "Säule 01 · Nominalisierung & Nomen-Verb-Verbindungen",
        "subtitle": "122 Säulen B2-Architektur: Verbalstil vs. Nominalstil in Verträgen, Behördenschreiben und klinischen Berichten.",
        "badge": "122 SÄULEN · GRAMMAR",
        "topics": ["Nominalstil", "Nomen-Verb-Verbindungen", "Genitivketten", "Wissenschaftssprache"],
        "pages": 4,
        "grammarNotes": {
            "rule": "Im B2-Nominalstil werden Nebensätze durch Präposition + Nomen + Genitiv ersetzt: 'Weil die Kosten steigen...' -> 'Wegen des Anstiegs der Kosten...'. Nomen-Verb-Verbindungen verleihen Texten juristische und fachliche Präzision.",
            "proTip": "Transformationsregel: 'weil' -> wegen/aufgrund (+ Gen.), 'obwohl' -> trotz (+ Gen.), 'wenn' -> bei (+ Dat.), 'damit' -> zur (+ Dat.).",
            "examples": [
                "Die Klinikleitung zieht eine Neuregelung in Erwägung.",
                "Aufgrund der hohen Nachfrage wird ein zusätzlicher B2-Kurs eingerichtet.",
                "Zur Vermeidung von Missverständnissen erfolgt die Dokumentation nach ISBAR.",
            ],
        },
        "flashcards": [
            {
                "id": "fc_b2_gr_01_nvv",
                "german": "in Erwägung ziehen / in Kraft treten",
                "phonetic": "in er-VAY-goong TSEE-en",
                "category": "Nomen-Verb-Verbindungen",
                "english": "to take into consideration / to enter into force",
                "hindi": "विचार में लेना (erwägen) / लागू होना (gültig werden)",
                "exampleDe": "Das neue Fachkräfteeinwanderungsgesetz trat am 1. März in Kraft.",
                "exampleTranslation": "The new Skilled Immigration Act entered into force on March 1.",
                "grammarTip": "The noun carries the core meaning while the verb only carries tense/person.",
            },
            {
                "id": "fc_b2_gr_02_praep_nom",
                "german": "aufgrund (+ Gen) · angesichts (+ Gen) · zwecks (+ Gen)",
                "phonetic": "owf-GROONT · AHN-ge-zikhts",
                "category": "Nominalstil-Präpositionen",
                "english": "due to / in view of / for the purpose of (+ Genitive)",
                "hindi": "के कारण (aufgrund), को देखते हुए (angesichts), के उद्देश्य से (zwecks)",
                "exampleDe": "Angesichts des Fachkräftemangels beschleunigt Berlin die Anerkennung.",
                "exampleTranslation": "In view of the skilled labor shortage, Berlin is accelerating recognition.",
                "grammarTip": "Watch genitive endings on the noun: 'des Mangels', 'der Nachfrage'.",
            },
            {
                "id": "fc_b2_gr_03_sein_zu",
                "german": "sein + zu + Infinitiv (= müssen / können + Passiv)",
                "phonetic": "zine + tsoo + IN-fee-nee-teef",
                "category": "Passiversatz",
                "english": "must be / can be + past participle",
                "hindi": "किया जाना अनिवार्य है / किया जा सकता है (sein + zu + Infinitiv)",
                "exampleDe": "Die Hygienevorschriften sind strengstens einzuhalten.",
                "exampleTranslation": "The hygiene regulations must be strictly observed.",
                "grammarTip": "Separable verbs keep 'zu' inside: ein-zu-halten, ab-zu-geben.",
            },
            {
                "id": "fc_b2_gr_04_konj1",
                "german": "Konjunktiv I: er sei / sie habe / es werde",
                "phonetic": "kon-yoonk-TEEF eyens",
                "category": "Indirekte Rede",
                "english": "Reported speech form for medical/journalistic objectivity",
                "hindi": "अप्रत्यक्ष कथन (Reported speech): मेडिकल व न्यूज़ रिपोर्टिंग के लिए",
                "exampleDe": "Die Zeugin erklärte, sie habe den Vorfall genau beobachtet.",
                "exampleTranslation": "The witness stated that she had observed the incident closely.",
                "grammarTip": "Verb stem + -e (er komme, sie arbeite); 'sein' has no -e: 'er sei'.",
            },
        ],
    },
    {
        "id": "b2-grammar-02-passiversatz-konjunktiv1",
        "level": "b2",
        "module": "02-grammar",
        "contentType": "grammar",
        "title": "Säule 02 · Passiversatzformen & Konjunktiv I (Indirekte Rede)",
        "subtitle": "122 Säulen B2-Architektur: sein + zu + Infinitiv, sich lassen + Infinitiv, -bar/-lich und Konjunktiv I in Berichten.",
        "badge": "122 SÄULEN · GRAMMAR",
        "topics": ["Passiversatz", "sein + zu + Infinitiv", "sich lassen", "Konjunktiv I"],
        "pages": 4,
        "grammarNotes": {
            "rule": "'sein + zu + Infinitiv' ersetzt Passiv mit müssen/sollen oder können. 'sich lassen + Infinitiv' und Adjektive auf '-bar/-lich' ersetzen Passiv mit können. Konjunktiv I (er sei, habe, werde, komme) markiert neutrale indirekte Rede.",
            "proTip": "Wenn Konjunktiv I und Indikativ gleich sind (z. B. 'sie haben'), weicht man auf Konjunktiv II ('sie hätten') aus!",
            "examples": [
                "Alle Befunde sind unverzüglich an den Stationsarzt weiterzuleiten.",
                "Die Nebenwirkungen lassen sich medikamentös gut kontrollieren.",
                "Der Patient gab an, er habe seit drei Tagen starke Schmerzen.",
            ],
        },
        "flashcards": [
            {
                "id": "fc_b2_gr_05_sich_lassen",
                "german": "sich lassen + Infinitiv (= können + Passiv)",
                "phonetic": "zikh LAS-sen",
                "category": "Passiversatz",
                "english": "can be done (modal possibility passive alternative)",
                "hindi": "किया जा सकता है (sich lassen + Infinitiv)",
                "exampleDe": "Dieses Problem lässt sich durch klare Kommunikation schnell lösen.",
                "exampleTranslation": "This problem can be solved quickly through clear communication.",
                "grammarTip": "Always requires reflexive 'sich' + conjugated 'lassen' + Infinitiv.",
            },
            {
                "id": "fc_b2_gr_06_part1_part2",
                "german": "Partizip I (-d, Aktiv) vs. Partizip II (Passiv)",
                "phonetic": "par-tee-TSEEP eyens vs. tsvy",
                "category": "Attribute",
                "english": "Participle I = active ongoing action | Participle II = passive completed state",
                "hindi": "Partizip I (-d) = सक्रिय कार्य | Partizip II = पूर्ण/कर्मवाच्य स्थिति",
                "exampleDe": "Der behandelnde Oberarzt bespricht den operierten Patienten.",
                "exampleTranslation": "The treating senior physician discusses the operated patient.",
                "grammarTip": "Both take standard adjective declension endings (-e, -en, -er, -es).",
            },
            {
                "id": "fc_b2_gr_07_subjektiv_modal",
                "german": "Subjektive Modalverben: muss (95%) · dürfte (75%) · soll (Gerücht)",
                "phonetic": "zoop-yek-TEE-ve moh-DAHL-vair-ben",
                "category": "Vermutungsausdruck",
                "english": "Expressing probability or unverified hearsay",
                "hindi": "अनुमान और अफवाह व्यक्त करने के लिए Modalverben",
                "exampleDe": "Er dürfte bereits in Berlin angekommen sein.",
                "exampleTranslation": "He has probably already arrived in Berlin.",
                "grammarTip": "Use 'soll' for unverified claims reported by others.",
            },
            {
                "id": "fc_b2_gr_08_je_desto",
                "german": "je + Komparativ ... desto/umso + Komparativ",
                "phonetic": "yay ... DES-toh",
                "category": "Proportionale Konnektoren",
                "english": "the more ... the more",
                "hindi": "जितना अधिक ... उतना ही अधिक (je ... desto)",
                "exampleDe": "Je länger man übt, desto sicherer spricht man im Klinikalltag.",
                "exampleTranslation": "The longer one practices, the more confidently one speaks.",
                "grammarTip": "'je' clause sends verb to the END; 'desto' clause puts verb right after adjective!",
            },
        ],
    },
    {
        "id": "b2-grammar-03-partizipialattribute",
        "level": "b2",
        "module": "02-grammar",
        "contentType": "grammar",
        "title": "Säule 03 · Partizip I/II als Adjektiv & Subjektive Modalverben",
        "subtitle": "122 Säulen B2-Architektur: Erweiterte Partizipialattribute links vom Nomen und Vermutungen mit müssen/dürften/sollen.",
        "badge": "122 SÄULEN · GRAMMAR",
        "topics": ["Partizip I vs. II", "Linksattribut", "Subjektive Modalverben", "Vermutung"],
        "pages": 4,
        "grammarNotes": {
            "rule": "Partizip I (Infinitiv + -d: der behandelnde Arzt) ist aktiv und gleichzeitig. Partizip II (der untersuchte Patient) ist passiv und meist vorzeitig. Bei subjektiven Modalverben drückt 'muss' ~95% Sicherheit aus, 'dürfte' ~75%, 'kann/könnte' ~50%, und 'soll' eine unbestätigte Information Dritter.",
            "proTip": "Lösen Sie lange Linksattribute von rechts nach links auf: 'der [seit gestern auf Station 4 liegende] Patient' = der Patient, der seit gestern auf Station 4 liegt.",
            "examples": [
                "Partizip I (Aktiv): Die zunehmende Nachfrage nach Pflegekräften erfordert schnelle Verfahren.",
                "Partizip II (Passiv): Das von der Behörde anerkannte Diplom berechtigt zur Arbeitsaufnahme.",
                "Subjektives Modalverb: Er dürfte bereits in Berlin angekommen sein. / Die Klinik soll sehr modern sein.",
            ],
        },
        "flashcards": [
            {
                "id": "fc_b2_gr_09_part1_part2",
                "german": "Partizip I (-d, Aktiv) vs. Partizip II (Passiv)",
                "phonetic": "par-tee-TSEEP eyens vs. tsvy",
                "category": "Attribute",
                "english": "Participle I = active ongoing action | Participle II = passive completed state",
                "hindi": "Partizip I (-d) = सक्रिय कार्य | Partizip II = पूर्ण/कर्मवाच्य स्थिति",
                "exampleDe": "Der behandelnde Oberarzt bespricht den operierten Patienten.",
                "exampleTranslation": "The treating senior physician discusses the operated patient.",
                "grammarTip": "Both take standard adjective declension endings (-e, -en, -er, -es).",
            },
            {
                "id": "fc_b2_gr_10_linksattribut",
                "german": "Erweitertes Linksattribut (Relativsatz-Ersatz)",
                "phonetic": "LINKS-at-tree-boot",
                "category": "B2 Satzbau",
                "english": "Extended pre-nominal modifier placed between article and noun",
                "hindi": "संज्ञा से ठीक पहले जुड़ा लंबा विशेषण वाक्यांश (Linksattribut)",
                "exampleDe": "Das im Januar eingereichte Visum wurde genehmigt.",
                "exampleTranslation": "The visa submitted in January was approved.",
                "grammarTip": "Article + [Modifiers/Prepositional phrases] + Participle + Ending + Noun.",
            },
            {
                "id": "fc_b2_gr_11_subjektiv_modal",
                "german": "Subjektive Modalverben: muss (95%) · dürfte (75%) · soll (Gerücht)",
                "phonetic": "zoop-yek-TEE-ve moh-DAHL-vair-ben",
                "category": "Vermutungsausdruck",
                "english": "Expressing probability or unverified hearsay with modal verbs",
                "hindi": "अनुमान (muss/dürfte) और अफवाह (soll) व्यक्त करने के लिए Modalverben",
                "exampleDe": "Er dürfte bereits in Berlin angekommen sein.",
                "exampleTranslation": "He has probably already arrived in Berlin.",
                "grammarTip": "Past presumption uses: Modalverb + Partizip II + haben/sein.",
            },
            {
                "id": "fc_b2_gr_12_je_desto",
                "german": "je + Komparativ ... desto/umso + Komparativ",
                "phonetic": "yay ... DES-toh",
                "category": "Proportionale Konnektoren",
                "english": "the more ... the more",
                "hindi": "जितना अधिक ... उतना ही अधिक (je ... desto)",
                "exampleDe": "Je länger man übt, desto sicherer spricht man im Klinikalltag.",
                "exampleTranslation": "The longer one practices, the more confidently one speaks.",
                "grammarTip": "'je' clause sends verb to the END; 'desto' clause puts verb right after adjective!",
            },
        ],
    },
]


# Authentic Reading Texts for Exam Lesen Modules (STRICTLY contentType="exam_lesen")
B1_READING_PASSAGES: dict[str, str] = {
    "b1-lab-03-lesen-blog-meinung": (
        "BERLIN-BLOG: Gemeinsam gärtnern — Berlins grüne Oasen im Wandel\n\n"
        "Wer am Sonntagnachmittag über das Tempelhofer Feld spaziert, entdeckt längst nicht mehr nur Skater und Jogger, sondern auch zahlreiche Hochbeete. "
        "Auf dem ehemaligen Flughafenareal betreiben Anwohnerinnen und Anwohner ein gemeinschaftliches Urban-Gardening-Projekt für Nachbarn aus allen Generationen. "
        "Das Tempelhofer Feld ist ein Ort, auf den viele Berliner besonders stolz sind, denn hier wachsen mitten in der Großstadt frische Kräuter, Tomaten und Kürbisse.\n\n"
        "Stadtökologen betonen den enormen Nutzen solcher Projekte für das Stadtklima: Die bepflanzten Grünflächen sorgen für spürbare Kühlung bei sommerlicher Hitze "
        "und fördern gleichzeitig die Biodiversität von Wildbienen und Schmetterlingen in dicht bebauten Quartieren.\n\n"
        "Direkt neben dem Gemeinschaftsgarten entsteht außerdem eine nachhaltige Nachbarschaftskultur. Immer mehr Bewohner kaufen in einem nahegelegenen Unverpackt-Laden ein — "
        "einem Geschäft, in dem Lebensmittel konsequent ohne Einwegplastik verkauft werden und Kunden ihre eigenen Gläser mitbringen. "
        "Mein persönliches Fazit: Nachhaltiger Konsum im Alltag ist mit etwas Planung für fast jeden leicht umsetzbar."
    ),
    "b1-lab-04-sprachbausteine-brief": (
        "AUFGABE: Lesen Sie den folgenden Text und schließen Sie die Lücken (1–6) im Antwortblatt rechts.\n\n"
        "Sehr geehrte Frau Weber,\n\n"
        "ich interessiere mich sehr [1] Ihre Stellenausschreibung als Krankenpfleger in Ihrer Berliner Klinik. "
        "Im Team arbeitet bereits eine frühere Kommilitonin von mir — das ist genau die Bewerberin, [2] Unterlagen bereits vollständig vorliegen.\n\n"
        "Ein Kollege aus meinem Jahrgang spricht [3] fließend Deutsch als auch hervorragend Englisch, und genau diese sprachliche Sicherheit bringe auch ich mit. "
        "Ich [4] mich sehr über eine Einladung zum persönlichen Vorstellungsgespräch freuen.\n\n"
        "[5] des starken Regens fand unser Kennenlerntreffen letzte Woche draußen auf dem Campus statt, und ich habe nun fest vor, "
        "im kommenden Semester zusätzlich Gesundheitsmanagement an der TU Berlin zu [6].\n\n"
        "Mit freundlichen Grüßen\nSarbjit Kour"
    ),
    "b1-lab-06-lesen-anzeigen-suche": (
        "ANZEIGENBOARD BERLIN — Kriterienabgleich (Lesen Teil 2)\n\n"
        "Anzeige A · Seniorenresidenz Havelblick (Berlin-Spandau)\n"
        "Wir suchen ab sofort zuverlässige Unterstützung für die Wochenenddienste in der Pflegeassistenz (20 Std/Woche, Teilzeit). "
        "Ideal für Quereinsteiger und Studierende. Extras: kostenloses Deutschlandticket (Jobticket) und betriebliche Altersvorsorge.\n\n"
        "Anzeige B · GTF Abendakademie Berlin\n"
        "Intensivkurs Medizinische Fachsprache B2 Online (Mo & Mi, 18:30–21:00 Uhr). "
        "Zielgruppe: Internationale Pflegekräfte und Ärztinnen, die berufsbegleitend abends trainieren möchten.\n\n"
        "Anzeige C · Klinikverbund Nord\n"
        "Gesucht: Pflegefachkraft in Vollzeit (40 Std/Woche) im rotierenden 3-Schicht-System inklusive regelmäßiger Nachtschichten. "
        "Bewerbungsfrist: 30. November (spätere Einsendungen können im Auswahlverfahren nicht berücksichtigt werden). "
        "Ihre Unterlagen richten Sie bitte direkt an unsere Personalabteilung, Frau Schneider."
    ),
    "b1-lab-07-schreiben-redemittel": (
        "PRÜFUNGSAUFGABE B1 SCHREIBEN · FORMELLE BESCHWERDE (DIN 5008)\n\n"
        "Situation: Sie haben online ein neues Laptop-Modell bestellt, doch bei der Lieferung ist das Gerät defekt. "
        "Sie kennen den Namen der Sachbearbeiterin oder des Sachbearbeiters nicht.\n\n"
        "Schreiben Sie eine formelle Beschwerde nach Goethe/telc B1 Standard:\n"
        "1. Verwenden Sie eine sachliche, anonyme Anrede und eine klare Reklamationseinleitung.\n"
        "2. Setzen Sie eine konkrete Frist (z. B. bis zum 15. Oktober), um den Mangel zu beheben.\n"
        "3. Begründen Sie Ihre Forderung mit einem Kausalkonnektor und weisen Sie auf den möglichen Vertragsrücktritt hin.\n"
        "4. Beachten Sie beim Schlussgruß ('Mit freundlichen Grüßen') die deutsche Zeichensetzungsregel ohne Komma."
    ),
    "b1-lab-08-sprechen-praesentation": (
        "PRÜFUNGSAUFGABE B1 SPRECHEN TEIL 2 · THEMA PRÄSENTIEREN (ca. 3–4 Minuten)\n\n"
        "Struktur der 5 Folien:\n"
        "• Stufe 1: Thema vorstellen ('Das Thema meiner heutigen Präsentation lautet...')\n"
        "• Stufe 2: Persönliche Erfahrungen ('Aus meiner persönlichen Erfahrung kann ich berichten, dass...')\n"
        "• Stufe 3: Situation im Heimatland (Vergleich mit Indien / Heimatland)\n"
        "• Stufe 4: Vor- und Nachteile ('Einerseits ... andererseits ...')\n"
        "• Stufe 5: Fazit & Übergabe an die Prüfer ('Damit bin ich am Ende meiner Präsentation. Haben Sie noch Fragen?')"
    ),
    "b1-lab-09-diskussion-argumente": (
        "PRÜFUNGSAUFGABE B1 SPRECHEN TEIL 3 · GEMEINSAM ETWAS PLANEN\n\n"
        "Situation: Ihre Sprachkursgruppe möchte am Wochenende eine kleine Abschiedsfeier organisieren. "
        "Planen Sie gemeinsam mit Ihrem Prüfungspartner:\n"
        "• Wann und wo treffen Sie sich?\n"
        "• Wer übernimmt Getränke, Essen und Musik?\n"
        "• Reagieren Sie höflich auf Vorschläge Ihres Partners und fassen Sie die Einigung am Ende zusammen."
    ),
    "b1-lab-10-vollsimulation-b1": (
        "OFFIZIELLE PRÜFUNGSORDNUNG & GENERALPROBE · GOETHE / TELC B1\n\n"
        "• Bestehensgrenze: In jedem Prüfungsteil müssen mindestens 60 % der Gesamtpunkte erreicht werden.\n"
        "• Zeitvorgabe Lesen: 65 Minuten inklusive Übertragung auf den offiziellen Antwortbogen.\n"
        "• Hilfsmittelverbot: Zweisprachige Wörterbücher, Smartphones und Notizzettel sind im Prüfungsraum untersagt.\n"
        "• Bewertung & Visum: Gewertet werden ausschließlich die Markierungen auf dem Antwortbogen. "
        "Zertifikate verfallen formal nicht; Botschaften prüfen jedoch meist eine Aktualität unter 1–2 Jahren."
    ),
    "gtf-b1-pruefungstraining": (
        "GOETHE / TELC B1 PRÜFUNGSTRAINING · LESEN & SCHREIBEN\n\n"
        "Trainingsteil 1 (Vorgang & Struktur): Lesen Sie die Sätze im betrieblichen und klinischen Kontext und ergänzen Sie "
        "im Antwortblatt rechts die korrekten Passivformen (Präsens & Präteritum), Relativpronomen (Dativ & Genitiv) "
        "sowie die passenden Schlussformeln für formelle E-Mails."
    ),
}


# ── 5. Catalog Products Builder ───────────────────────────────────────────────

def build_catalog_products(target_level: str) -> list[dict]:
    """Merge flagship products and catalog.json, optionally filtered by target_level."""
    products: list[dict] = []
    seen_slugs: set[str] = set()

    flagship_products = [
        {
            "slug": "a1-free-demo-test",
            "divisionId": "sprachakademie",
            "type": "mock_test",
            "level": "a1",
            "title": "GTF A1 Start Deutsch Modelltest 1 (Free Demo)",
            "description": "Complete A1 mock test with Lesen, Sprachbausteine, Hören, Schreiben & Sprechen.",
            "priceEur": 0.0,
            "priceInr": 0,
            "isFree": True,
            "resourceId": "gtf-a1-modelltest-1",
        },
        {
            "slug": "a2-free-demo-test",
            "divisionId": "sprachakademie",
            "type": "mock_test",
            "level": "a2",
            "title": "GTF A2 Modelltest 1 (Free Demo)",
            "description": "Complete A2 mock test covering everyday life, workplace & relocation in Germany.",
            "priceEur": 0.0,
            "priceInr": 0,
            "isFree": True,
            "resourceId": "gtf-a2-modelltest-1",
        },
        {
            "slug": "b1-free-demo-test",
            "divisionId": "sprachakademie",
            "type": "mock_test",
            "level": "b1",
            "title": "GTF B1 Modelltest 1 — Goethe/telc Hybrid (Free Demo)",
            "description": "Full B1 exam simulation: Lesen, Sprachbausteine, Hören (locked 1x/2x audio), Schreiben & Sprechen.",
            "priceEur": 0.0,
            "priceInr": 0,
            "isFree": True,
            "resourceId": "gtf-b1-modelltest-1",
        },
        {
            "slug": "b2-free-demo-test",
            "divisionId": "sprachakademie",
            "type": "mock_test",
            "level": "b2",
            "title": "GTF B2 Beruf & Pflege Modelltest 1 (Free Demo)",
            "description": "Complete B2 exam simulation for nursing, medical & professional career pathways in Germany.",
            "priceEur": 0.0,
            "priceInr": 0,
            "isFree": True,
            "resourceId": "gtf-b2-modelltest-1",
        },
        {
            "slug": "wb-suite-a1-b2",
            "divisionId": "sprachakademie",
            "type": "pdf_workbook",
            "level": "b1",
            "title": "GTF Digital Workbooks Complete Suite",
            "description": "7 proprietary workbooks by Sarbjit Kour with DRM protection, interactive answer keys, and Hindi/English grammar anchors.",
            "priceEur": 0.0,
            "priceInr": 1999,
            "isFree": False,
            "resourceId": "wb-suite-complete",
        },
        {
            "slug": "exam-vault-a1-b2",
            "divisionId": "sprachakademie",
            "type": "mock_test",
            "level": "b2",
            "title": "GTF Sprachakademie Full Exam Vault (A1–B2 Complete Suite)",
            "description": "Full institutional vault of 20+ Goethe/telc mock exams across A1, A2, B1, and B2.",
            "priceEur": 0.0,
            "priceInr": 1999,
            "isFree": False,
            "resourceId": "vault-a1-b2-complete",
        },
        {
            "slug": "gtf-all-access-pass",
            "divisionId": "sprachakademie",
            "type": "all_access_pass",
            "level": "b2",
            "title": "GTF All-Access Pro Membership (€50 / mo)",
            "description": "Complete all-access membership across Language Academy (A1–B2), Studienkolleg, and Fachsprache Pflege & Medizin.",
            "priceEur": 50.0,
            "priceInr": 4499,
            "isFree": False,
            "resourceId": "gtf-all-access-pass",
        },
    ]

    for p in flagship_products:
        seen_slugs.add(p["slug"])
        products.append(p)

    if CATALOG_FILE.exists():
        try:
            with open(CATALOG_FILE, encoding="utf-8") as f:
                cat_data = json.load(f)
                for item in cat_data.get("products", []):
                    slug = item.get("slug")
                    if slug and slug not in seen_slugs:
                        seen_slugs.add(slug)
                        products.append({
                            "slug": slug,
                            "divisionId": item.get("divisionId", "sprachakademie"),
                            "type": item.get("type", "mock_test"),
                            "level": str(item.get("level", "b1")).lower(),
                            "title": item.get("title", slug),
                            "description": item.get("description", "GTF Official Learning Module"),
                            "priceEur": float(item.get("priceEur", 0)),
                            "priceInr": int(item.get("priceInr", 499)),
                            "isFree": bool(item.get("isFree", True)),
                            "resourceId": item.get("resourceId", slug),
                        })
        except Exception as e:
            print(f"[!] Error reading {CATALOG_FILE}: {e}")

    if target_level != "all":
        products = [p for p in products if str(p.get("level", "")).lower() == target_level]
    return products


# ── 6. Strict Curriculum Document Builder & QA Gate ──────────────────────────

def enrich_explanation_with_hindi(exp: str, level: str) -> str:
    """Ensure every exam explanation includes German reason, English translation & Hindi guidance."""
    if "English:" in exp or "Hindi:" in exp or "Hinglish:" in exp:
        return exp
    clean_exp = exp.strip() if exp else "Musterlösung nach Goethe/telc Prüfungsstandard."
    hindi_anchor = (
        "याद रखें: जर्मन व्याकरण में नियम और पोजीशन का विशेष ध्यान रखें।"
        if level in ("a1", "a2")
        else "परीक्षा टिप: B1/B2 में सही कनेक्टर और क्रिया का स्थान (Verb Position) निर्णायक होता है।"
    )
    return (
        f"{clean_exp} | English: According to official CEFR {level.upper()} standards. "
        f"| Hindi/Hinglish: {hindi_anchor}"
    )


def enrich_questions(raw_questions: list[dict], level: str) -> list[dict]:
    enriched: list[dict] = []
    for q in raw_questions:
        item = {
            "id": q.get("id", "q1"),
            "page": int(q.get("page", 1)),
            "label": q.get("label", "Task"),
            "prompt": q.get("prompt", ""),
            "type": q.get("type", "mcq"),
            "explanation": enrich_explanation_with_hindi(q.get("explanation", ""), level),
        }
        if q.get("options"):
            item["options"] = q["options"]
        if "answer" in q:
            item["answer"] = q["answer"]
        enriched.append(item)
    return enriched


def classify_lab_record(lab_id: str, skill: str, title: str) -> tuple[str, str]:
    """Return strict (contentType, module) for non-grammar labs and workbooks."""
    lid = lab_id.lower()
    sk = (skill or "").lower()
    t = (title or "").lower()

    if "schreiben" in lid or sk == "schreiben" or "schreiben —" in t:
        return "exam_schreiben", "04-modelltests"
    if "sprechen" in lid or "diskussion" in lid or sk == "sprechen" or "sprechen teil" in t:
        return "exam_sprechen", "04-modelltests"
    if (
        "vollsimulation" in lid
        or "pruefungstraining" in lid
        or "modelltest" in lid
        or sk == "allround"
        or "prüfungstraining" in t
    ):
        return "exam_lesen", "04-modelltests"
    if sk == "hoeren" or "hoeren" in lid or "hören" in t or "fsp-" in lid:
        return "exam_hoeren", "03-hoeren-lesen"
    return "exam_lesen", "03-hoeren-lesen"


def assert_clean_curriculum_doc(doc: dict[str, Any]) -> None:
    """QA Gate: Fail loudly if any document violates strict Level -> Module -> Topic boundaries."""
    doc_id = doc.get("id", "<unknown>")
    level = doc.get("level", "")
    module = doc.get("module", "")
    ct = doc.get("contentType", "")

    if level not in ("a1", "a2", "b1", "b2"):
        raise ValueError(f"[QA FAIL] {doc_id}: invalid level '{level}'")
    if module not in ALLOWED_MODULES:
        raise ValueError(f"[QA FAIL] {doc_id}: invalid module '{module}'")
    if ct not in ALLOWED_CONTENT_TYPES:
        raise ValueError(f"[QA FAIL] {doc_id}: invalid contentType '{ct}'")
    if doc.get("hierarchyPath") != f"{level.upper()}/{module}/{doc_id}":
        raise ValueError(f"[QA FAIL] {doc_id}: mismatched hierarchyPath '{doc.get('hierarchyPath')}'")

    if ct == "grammar":
        if module != "02-grammar":
            raise ValueError(f"[QA FAIL] {doc_id}: grammar doc placed in '{module}'")
        if FORBIDDEN_GRAMMAR_EXAM_RE.search(doc_id) or FORBIDDEN_GRAMMAR_EXAM_RE.search(doc.get("title", "")):
            raise ValueError(f"[QA FAIL] {doc_id}: exam task marker leaked into grammar pillar")
        if doc.get("questions"):
            raise ValueError(f"[QA FAIL] {doc_id}: grammar doc must have questions == []")
        if doc.get("audioUrl"):
            raise ValueError(f"[QA FAIL] {doc_id}: grammar doc must have empty audioUrl")
        if doc.get("readingPassage"):
            raise ValueError(f"[QA FAIL] {doc_id}: grammar doc must have empty readingPassage")
        notes = doc.get("grammarNotes") or {}
        if not notes.get("rule") or not notes.get("examples"):
            raise ValueError(f"[QA FAIL] {doc_id}: grammar doc missing grammarNotes rule/examples")
        if len(doc.get("flashcards") or []) < 4:
            raise ValueError(f"[QA FAIL] {doc_id}: grammar doc must contain at least 4 flashcards")
    else:
        if module == "02-grammar":
            raise ValueError(f"[QA FAIL] {doc_id}: exam contentType '{ct}' cannot live in 02-grammar")
        if doc.get("grammarNotes") is not None:
            raise ValueError(f"[QA FAIL] {doc_id}: exam doc must have grammarNotes == None")
        if doc.get("flashcards"):
            raise ValueError(f"[QA FAIL] {doc_id}: exam doc must have flashcards == []")
        if not doc.get("questions"):
            raise ValueError(f"[QA FAIL] {doc_id}: exam doc must have questions")
        if ct == "exam_lesen":
            if doc.get("audioUrl"):
                raise ValueError(f"[QA FAIL] {doc_id}: exam_lesen doc must have empty audioUrl")
            if not doc.get("readingPassage"):
                raise ValueError(f"[QA FAIL] {doc_id}: exam_lesen doc must have non-empty readingPassage")
        if ct == "exam_hoeren" and not doc.get("audioUrl"):
            raise ValueError(f"[QA FAIL] {doc_id}: exam_hoeren doc must have non-empty audioUrl")
        if ct == "exam_schreiben":
            if doc.get("audioUrl"):
                raise ValueError(f"[QA FAIL] {doc_id}: exam_schreiben doc must have empty audioUrl")
            if not doc.get("readingPassage"):
                raise ValueError(f"[QA FAIL] {doc_id}: exam_schreiben doc must have task prompt readingPassage")


def build_default_reading_passage(title: str, subtitle: str, questions: list[dict]) -> str:
    snippets = "\n".join(f"• {q.get('label', 'Aufgabe')}: {q.get('prompt', '')}" for q in questions[:4])
    return f"{title}\n{subtitle}\n\nKontext & Aufgabenübersicht:\n{snippets}".strip()


def build_strict_workbooks_dataset(target_level: str) -> list[dict[str, Any]]:
    """Build strictly separated Level -> Module -> Topic documents."""
    docs: list[dict[str, Any]] = []
    seen_ids: set[str] = set()

    def matches_level(lvl: str) -> bool:
        return target_level == "all" or lvl.lower() == target_level

    # 1. Pure Grammar Pillars (02-grammar, contentType="grammar")
    for gp in GRAMMAR_PILLARS:
        lvl = gp["level"].lower()
        if not matches_level(lvl):
            continue
        gid = gp["id"]
        seen_ids.add(gid)
        cards = gp["flashcards"]
        doc = {
            "id": gid,
            "level": lvl,
            "module": "02-grammar",
            "contentType": "grammar",
            "hierarchyPath": f"{lvl.upper()}/02-grammar/{gid}",
            "title": gp["title"],
            "subtitle": gp["subtitle"],
            "divisionId": "sprachakademie",
            "skill": "grammar",
            "badge": gp["badge"],
            "topics": gp["topics"],
            "pages": gp["pages"],
            "coverColor": "#134074",
            "productSlug": gid,
            "isFree": True,
            "priceEur": 0.0,
            "priceInr": 0,
            "readingPassage": "",
            "audioUrl": "",
            "grammarNotes": gp["grammarNotes"],
            "questions": [],
            "flashcards": cards,
            "questionCount": 0,
            "flashcardCount": len(cards),
        }
        assert_clean_curriculum_doc(doc)
        docs.append(doc)

    # 2. Core Exam Labs from data/all_core_labs.json (03-hoeren-lesen / 04-modelltests)
    if CORE_LABS_FILE.exists():
        with open(CORE_LABS_FILE, encoding="utf-8") as f:
            core_labs = json.load(f)
        for lab in core_labs:
            lvl = str(lab.get("level", "a1")).lower()
            if not matches_level(lvl):
                continue
            lab_id = lab["id"]
            if lab_id in seen_ids:
                continue
            seen_ids.add(lab_id)

            title = lab.get("title", lab_id)
            subtitle = lab.get("subtitle", f"Level {lvl.upper()} Interactive Exam Lab")
            ct, module = classify_lab_record(lab_id, lab.get("skill", "hoeren"), title)
            questions = enrich_questions(lab.get("questions", []), lvl)

            audio_url = ""
            if ct in ("exam_hoeren", "exam_sprechen"):
                audio_url = lab.get("audioUrl") or f"/audio/hoeren/daf_{lvl}_hoeren_01.mp3"

            reading_passage = ""
            if ct in ("exam_lesen", "exam_schreiben", "exam_sprechen"):
                reading_passage = B1_READING_PASSAGES.get(lab_id) or build_default_reading_passage(
                    title, subtitle, questions
                )

            skill_val = (
                "hoeren" if ct == "exam_hoeren"
                else "schreiben" if ct == "exam_schreiben"
                else "sprechen" if ct == "exam_sprechen"
                else "lesen"
            )

            doc = {
                "id": lab_id,
                "level": lvl,
                "module": module,
                "contentType": ct,
                "hierarchyPath": f"{lvl.upper()}/{module}/{lab_id}",
                "title": title,
                "subtitle": subtitle,
                "divisionId": "sprachakademie",
                "skill": skill_val,
                "badge": lab.get("badge", f"{lvl.upper()} EXAM LAB"),
                "topics": lab.get("topics", []),
                "pages": int(lab.get("pages", 4)),
                "coverColor": "#0D1017",
                "productSlug": lab_id,
                "isFree": True,
                "priceEur": 0.0,
                "priceInr": 0,
                "readingPassage": reading_passage,
                "audioUrl": audio_url,
                "grammarNotes": None,
                "questions": questions,
                "flashcards": [],
                "questionCount": len(questions),
                "flashcardCount": 0,
            }
            assert_clean_curriculum_doc(doc)
            docs.append(doc)

    # 3. Factory Exam Dossiers (STRICTLY Hören/Lesen — zero flashcards, zero grammarNotes)
    batch_specs = [
        ("wb-factory-a1-hoeren-batch1", "a1", "hoeren", "A1 Hören — Ankunft am Berliner Hauptbahnhof & Bürgeramt-Anmeldung", "factory_a1_hoeren_batch1.mp3"),
        ("wb-factory-a2-lesen-batch1", "a2", "lesen", "A2 Lesen — Dienstplan, Hausordnung & Krankmeldung im Betrieb", ""),
        ("wb-factory-b1-hoeren-batch1", "b1", "hoeren", "B1 Hören — Beratungsgespräch bei der Agentur für Arbeit & Weiterbildung", "factory_b1_hoeren_batch1.mp3"),
        ("wb-factory-b2-hoeren-batch1", "b2", "hoeren", "B2 Hören — Klinik-Symposium: Digitalisierung & Personalmanagement im Krankenhaus", "factory_b2_hoeren_batch1.mp3"),
        ("wb-factory-b2-lesen-batch1", "b2", "lesen", "B2 Lesen — Tarifvertrag, Arbeitsrecht & Berufsanerkennung in Deutschland", ""),
    ]

    for wb_id, lvl, sk, title, audio in batch_specs:
        if not matches_level(lvl) or wb_id in seen_ids:
            continue
        seen_ids.add(wb_id)
        ct = "exam_hoeren" if sk == "hoeren" else "exam_lesen"
        questions = [
            {
                "id": "q1",
                "page": 1,
                "label": "Verständnis & Detail",
                "prompt": f"Welche Kernaussage ist für das Thema '{title}' maßgeblich?",
                "type": "mcq",
                "options": [
                    {"id": "a", "text": "Die Einhaltung der gesetzlichen Fristen und formalen Vorgaben ist verpflichtend."},
                    {"id": "b", "text": "Formulare können ohne Fristbeachtung beliebig eingereicht werden."},
                    {"id": "c", "text": "Eine Anmeldung oder Dokumentation ist in Deutschland optional."},
                ],
                "answer": "a",
                "explanation": "In Deutschland sind behördliche und betriebliche Fristen strikt bindend. | English: Statutory deadlines are mandatory in Germany. | Hindi/Hinglish: Germany mein sabhi sarkari niyam aur deadlines strict hoti hain.",
            },
            {
                "id": "q2",
                "page": 2,
                "label": "Fachwortschatz & Redemittel",
                "prompt": "Welcher Fachbegriff beschreibt den formalen Prozess korrekt?",
                "type": "mcq",
                "options": [
                    {"id": "a", "text": "Der rechtzeitige Nachweis der erforderlichen Bescheinigung."},
                    {"id": "b", "text": "Das mündliche Übergehen der Schutzvorschriften."},
                    {"id": "c", "text": "Die private Vereinbarung ohne schriftliche Bestätigung."},
                ],
                "answer": "a",
                "explanation": "Schriftliche Nachweise sind in deutschen Verfahren unerlässlich. | English: Written proof is indispensable in German administrative procedures. | Hindi/Hinglish: Har process ka written proof hona mandatory hai.",
            },
        ]
        subtitle = "GTF Content Factory · Interactive Exam Dossier"
        reading_passage = (
            ""
            if ct == "exam_hoeren"
            else build_default_reading_passage(title, subtitle, questions)
        )
        doc = {
            "id": wb_id,
            "level": lvl,
            "module": "03-hoeren-lesen",
            "contentType": ct,
            "hierarchyPath": f"{lvl.upper()}/03-hoeren-lesen/{wb_id}",
            "title": title,
            "subtitle": subtitle,
            "divisionId": "sprachakademie",
            "skill": sk,
            "badge": "FACTORY DOSSIER",
            "topics": ["Factory Batch", lvl.upper(), sk.upper(), "Explanations DE/EN/HI"],
            "pages": 4,
            "coverColor": "#0F4C81" if lvl == "b1" else "#1E3A8A",
            "productSlug": wb_id,
            "isFree": True,
            "priceEur": 0.0,
            "priceInr": 0,
            "readingPassage": reading_passage,
            "audioUrl": f"/audio/hoeren/{audio}" if (ct == "exam_hoeren" and audio) else "",
            "grammarNotes": None,
            "questions": questions,
            "flashcards": [],
            "questionCount": len(questions),
            "flashcardCount": 0,
        }
        assert_clean_curriculum_doc(doc)
        docs.append(doc)

    # 4. Sample Workbooks from data/sample-workbooks.json — strictly split by role
    if SAMPLE_WB_FILE.exists():
        with open(SAMPLE_WB_FILE, encoding="utf-8") as f:
            swb = json.load(f)
        for wb in swb.get("workbooks", []):
            w_id = wb.get("id", "")
            lvl = str(wb.get("level", "b1")).lower()
            if not w_id or w_id in seen_ids or not matches_level(lvl):
                continue
            seen_ids.add(w_id)

            title = wb.get("title", w_id)
            subtitle = wb.get("subtitle", "GTF Digital Workbook")
            if "grammatik" in w_id.lower() or "grammatik" in title.lower():
                lvl_cards = [
                    c for c in HIGH_DENSITY_FLASHCARDS if c["level"].lower() == lvl
                ][:4]
                if len(lvl_cards) < 4:
                    lvl_cards = HIGH_DENSITY_FLASHCARDS[:4]
                examples = [
                    q.get("explanation") or q.get("prompt", "")
                    for q in wb.get("questions", [])[:4]
                    if q.get("explanation") or q.get("prompt")
                ]
                doc = {
                    "id": w_id,
                    "level": lvl,
                    "module": "02-grammar",
                    "contentType": "grammar",
                    "hierarchyPath": f"{lvl.upper()}/02-grammar/{w_id}",
                    "title": title,
                    "subtitle": subtitle,
                    "divisionId": "sprachakademie",
                    "skill": "grammar",
                    "badge": "122 SÄULEN · GRAMMAR",
                    "topics": wb.get("topics", ["Grammatik"]),
                    "pages": int(wb.get("pages", 3)),
                    "coverColor": wb.get("coverColor", "#134074"),
                    "productSlug": wb.get("productSlug", w_id),
                    "isFree": bool(wb.get("isFree", True)),
                    "priceEur": float(wb.get("priceEur", 0)),
                    "priceInr": int(wb.get("priceInr", 0)),
                    "readingPassage": "",
                    "audioUrl": "",
                    "grammarNotes": {
                        "rule": f"{subtitle}. Fokus auf {', '.join(wb.get('topics', ['Satzbau']))}.",
                        "proTip": "Prüfen Sie in Nebensätzen immer zuerst die Position des konjugierten Verbs (Satzende bei weil/dass/ob/obwohl; Position 2 bei deshalb/trotzdem).",
                        "examples": examples or ["Ich lerne Deutsch, weil ich in Berlin arbeiten möchte."],
                    },
                    "questions": [],
                    "flashcards": lvl_cards,
                    "questionCount": 0,
                    "flashcardCount": len(lvl_cards),
                }
            else:
                ct, module = classify_lab_record(w_id, wb.get("skill", "lesen"), title)
                questions = enrich_questions(wb.get("questions", []), lvl)
                reading_passage = B1_READING_PASSAGES.get(w_id) or build_default_reading_passage(
                    title, subtitle, questions
                )
                doc = {
                    "id": w_id,
                    "level": lvl,
                    "module": module,
                    "contentType": ct,
                    "hierarchyPath": f"{lvl.upper()}/{module}/{w_id}",
                    "title": title,
                    "subtitle": subtitle,
                    "divisionId": "sprachakademie",
                    "skill": "hoeren" if ct == "exam_hoeren" else "lesen",
                    "badge": "PRÜFUNGSTRAINING",
                    "topics": wb.get("topics", ["Prüfungstraining"]),
                    "pages": int(wb.get("pages", 3)),
                    "coverColor": wb.get("coverColor", "#0D1017"),
                    "productSlug": wb.get("productSlug", w_id),
                    "isFree": bool(wb.get("isFree", True)),
                    "priceEur": float(wb.get("priceEur", 0)),
                    "priceInr": int(wb.get("priceInr", 0)),
                    "readingPassage": reading_passage,
                    "audioUrl": "" if ct != "exam_hoeren" else wb.get("audioUrl", ""),
                    "grammarNotes": None,
                    "questions": questions,
                    "flashcards": [],
                    "questionCount": len(questions),
                    "flashcardCount": 0,
                }
            assert_clean_curriculum_doc(doc)
            docs.append(doc)

    # 5. Catalog CEFR Workbooks from data/catalog.json (strictly separated)
    if CATALOG_FILE.exists():
        with open(CATALOG_FILE, encoding="utf-8") as f:
            cat_raw = json.load(f)
        for wb in cat_raw.get("workbooks", []):
            w_id = str(wb.get("id", "")).strip()
            div = str(wb.get("divisionId", "sprachakademie")).lower().strip()
            lvl = str(wb.get("level", "")).lower().strip()
            if (
                not w_id
                or w_id in seen_ids
                or div != "sprachakademie"
                or lvl not in ("a1", "a2", "b1", "b2")
                or not matches_level(lvl)
            ):
                continue
            seen_ids.add(w_id)

            title = wb.get("title", w_id)
            subtitle = wb.get("subtitle", "GTF Official Study Dossier")
            sk_raw = str(wb.get("skill") or "").lower().strip()
            lid = w_id.lower()
            is_exam_item = (
                sk_raw in ("hoeren", "lesen", "schreiben", "sprechen", "allround")
                or "hoeren" in lid
                or "lesen" in lid
                or "sprachbausteine" in lid
                or "pruefungstraining" in lid
                or "modelltest" in lid
                or "vollsimulation" in lid
                or bool(wb.get("audioUrl"))
            )

            if is_exam_item:
                ct, module = classify_lab_record(w_id, sk_raw or "hoeren", title)
                raw_qs = wb.get("questions") or []
                questions = enrich_questions(raw_qs, lvl)
                if not questions:
                    questions = [
                        {
                            "id": "q1",
                            "page": 1,
                            "label": "Verständnis & Struktur",
                            "prompt": f"Welche Aussage fasst '{title}' treffend zusammen?",
                            "type": "mcq",
                            "options": [
                                {"id": "a", "text": "Die Aufgaben entsprechen dem offiziellen CEFR-Standard."},
                                {"id": "b", "text": "Eine Vorbereitung ist nicht erforderlich."},
                            ],
                            "answer": "a",
                            "explanation": enrich_explanation_with_hindi(
                                "Die Inhalte folgen dem offiziellen CEFR-Standard.", lvl
                            ),
                        }
                    ]
                audio_url = ""
                if ct in ("exam_hoeren", "exam_sprechen"):
                    audio_url = wb.get("audioUrl") or f"/audio/hoeren/daf_{lvl}_hoeren_01.mp3"
                reading_passage = (
                    ""
                    if ct == "exam_hoeren"
                    else build_default_reading_passage(title, subtitle, questions)
                )
                doc = {
                    "id": w_id,
                    "level": lvl,
                    "module": module,
                    "contentType": ct,
                    "hierarchyPath": f"{lvl.upper()}/{module}/{w_id}",
                    "title": title,
                    "subtitle": subtitle,
                    "divisionId": "sprachakademie",
                    "skill": "hoeren" if ct == "exam_hoeren" else "lesen",
                    "badge": "AUDIO + PDF" if audio_url else "PRÜFUNGSTRAINING",
                    "topics": wb.get("topics", [lvl.upper()]),
                    "pages": int(wb.get("pages", 4)),
                    "coverColor": wb.get("coverColor", "#0D1017"),
                    "productSlug": wb.get("productSlug", w_id),
                    "isFree": bool(wb.get("isFree", True)),
                    "priceEur": float(wb.get("priceEur", 0)),
                    "priceInr": int(wb.get("priceInr", 0)),
                    "readingPassage": reading_passage,
                    "audioUrl": audio_url,
                    "grammarNotes": None,
                    "questions": questions,
                    "flashcards": [],
                    "questionCount": len(questions),
                    "flashcardCount": 0,
                }
            else:
                lvl_cards = [
                    c for c in HIGH_DENSITY_FLASHCARDS if c["level"].lower() == lvl
                ][:4]
                if len(lvl_cards) < 4:
                    lvl_cards = HIGH_DENSITY_FLASHCARDS[:4]
                examples = [
                    q.get("explanation") or q.get("prompt", "")
                    for q in (wb.get("questions") or [])[:4]
                    if q.get("explanation") or q.get("prompt")
                ]
                doc = {
                    "id": w_id,
                    "level": lvl,
                    "module": "02-grammar",
                    "contentType": "grammar",
                    "hierarchyPath": f"{lvl.upper()}/02-grammar/{w_id}",
                    "title": title,
                    "subtitle": subtitle,
                    "divisionId": "sprachakademie",
                    "skill": "grammar",
                    "badge": "122 SÄULEN · GRAMMAR",
                    "topics": wb.get("topics", ["Grammatik"]),
                    "pages": int(wb.get("pages", 4)),
                    "coverColor": wb.get("coverColor", "#134074"),
                    "productSlug": wb.get("productSlug", w_id),
                    "isFree": bool(wb.get("isFree", True)),
                    "priceEur": float(wb.get("priceEur", 0)),
                    "priceInr": int(wb.get("priceInr", 0)),
                    "readingPassage": "",
                    "audioUrl": "",
                    "grammarNotes": {
                        "rule": f"{subtitle}. Fokus auf {', '.join(wb.get('topics', ['Grammatik & Struktur']))}.",
                        "proTip": "Analysieren Sie die deutschen Satzstrukturen (V2-Stellung, Nebensatz-Klammer, Kasus) systematisch anhand der Beispiele.",
                        "examples": examples or [f"Strukturbeispiel für {title}."],
                    },
                    "questions": [],
                    "flashcards": lvl_cards,
                    "questionCount": 0,
                    "flashcardCount": len(lvl_cards),
                }
            assert_clean_curriculum_doc(doc)
            docs.append(doc)

    return docs


# ── 7. Master Seeding Execution Pipeline ──────────────────────────────────────

def push_collection_batch(
    session: requests.Session,
    token: str,
    collection: str,
    items: list[dict],
    id_key: str,
    now_iso: str,
) -> tuple[int, int]:
    success = 0
    failed = 0
    with ThreadPoolExecutor(max_workers=8) as executor:
        futures = {
            executor.submit(
                push_firestore_doc,
                session,
                token,
                collection,
                item[id_key],
                {**item, "createdAt": now_iso, "updatedAt": now_iso},
            ): item[id_key]
            for item in items
        }
        for fut in as_completed(futures):
            ok, msg, _ = fut.result()
            if ok:
                success += 1
            else:
                failed += 1
                print(f"    [X] {collection} failed: {msg}")
    return success, failed


def main() -> int:
    parser = argparse.ArgumentParser(
        description="GTF Curriculum-Separated Firestore Seeder (Level -> Module -> Topic)"
    )
    parser.add_argument(
        "--level",
        default="all",
        choices=["a1", "a2", "b1", "b2", "all"],
        help="Target CEFR tier to seed (default: all).",
    )
    parser.add_argument(
        "--topic",
        default="",
        help="Optional specific topic ID to seed (self-heal single topic mode).",
    )
    parser.add_argument(
        "--purge",
        action="store_true",
        help="Purge all existing documents in `workbooks` and `materials` before seeding.",
    )
    args = parser.parse_args()

    target_level = args.level.lower()
    target_topic = args.topic.strip()
    start_time = time.time()
    now_iso = datetime.now(timezone.utc).isoformat()

    print("=" * 78)
    print(" GTF BERLIN — CURRICULUM-SEPARATED FIRESTORE SEEDER")
    print(f" Project: {PROJECT_ID} | Target Tier: {target_level.upper()} | Topic: {target_topic or '*'} | Purge: {args.purge}")
    print("=" * 78)

    token = get_auth_token()
    session = requests.Session()
    print(f"[✓] Acquired Google Cloud authorization token ({len(token)} chars).")

    if args.purge:
        purge_collections(session, token, ("workbooks", "materials"))

    catalog_items = build_catalog_products(target_level)
    workbooks = build_strict_workbooks_dataset(target_level)
    if target_topic:
        workbooks = [w for w in workbooks if w["id"] == target_topic]
        catalog_items = [c for c in catalog_items if c.get("resourceId") == target_topic or c.get("slug") == target_topic]
    flashcards = [
        fc
        for fc in HIGH_DENSITY_FLASHCARDS
        if (target_level == "all" or fc["level"].lower() == target_level) and not target_topic
    ]

    by_ct: dict[str, int] = {}
    for w in workbooks:
        by_ct[w["contentType"]] = by_ct.get(w["contentType"], 0) + 1

    print(f"--> QA-Verified Documents compiled for tier '{target_level.upper()}': {len(workbooks)}")
    for ct_name, cnt in sorted(by_ct.items()):
        print(f"    - contentType={ct_name}: {cnt}")
    print(f"--> Catalog items: {len(catalog_items)} | Standalone flashcards: {len(flashcards)}")

    stats: dict[str, dict[str, int]] = {}
    for col, items, key in [
        ("catalog", catalog_items, "slug"),
        ("workbooks", workbooks, "id"),
        ("materials", workbooks, "id"),
        ("flashcards", flashcards, "id"),
    ]:
        print(f"\n--> Seeding collection '{col}' ({len(items)} docs)...")
        ok_n, fail_n = push_collection_batch(session, token, col, items, key, now_iso)
        stats[col] = {"total": len(items), "success": ok_n, "failed": fail_n}
        print(f"    [✓] {col}: {ok_n}/{len(items)} pushed ({fail_n} failed).")

    elapsed = round(time.time() - start_time, 2)
    print("\n" + "=" * 78)
    print(f" COMPLETED IN {elapsed}s | Tier={target_level.upper()}")
    print(json.dumps(stats, indent=2))
    print("=" * 78)

    total_failed = sum(s["failed"] for s in stats.values())
    return 0 if total_failed == 0 else 1


if __name__ == "__main__":
    sys.exit(main())
