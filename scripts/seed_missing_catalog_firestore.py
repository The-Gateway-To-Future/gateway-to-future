#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Seeds any workbook IDs from gtf-exam-portal/data/catalog.json and sample-workbooks.json
that are missing in Cloud Firestore `workbooks` and `materials` collections (e.g. Studienkolleg
and Fachsprache Pflege/Medizin tracks).
"""

import json
import subprocess
import sys
from datetime import datetime, timezone
from pathlib import Path
from typing import Any
import requests

PROJECT_ID = "gateway-to-future"
BASE_DIR = Path(__file__).resolve().parent.parent
PORTAL_DIR = BASE_DIR / "gtf-exam-portal"
SA_KEY_PATH = PORTAL_DIR / "firebase-service-account.json"
FIRESTORE_BASE = f"https://firestore.googleapis.com/v1/projects/{PROJECT_ID}/databases/(default)/documents"


def get_token() -> str:
    try:
        t = subprocess.check_output(
            ["gcloud", "auth", "print-access-token"],
            shell=True,
            text=True,
            stderr=subprocess.DEVNULL,
        ).strip()
        if t and len(t) > 20:
            return t
    except Exception:
        pass

    if SA_KEY_PATH.exists():
        from google.oauth2 import service_account
        from google.auth.transport.requests import Request
        creds = service_account.Credentials.from_service_account_file(
            str(SA_KEY_PATH),
            scopes=[
                "https://www.googleapis.com/auth/cloud-platform",
                "https://www.googleapis.com/auth/datastore",
            ],
        )
        creds.refresh(Request())
        return creds.token
    raise RuntimeError("No GCP auth token available")


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
        return {"mapValue": {"fields": {str(k): to_firestore_value(v) for k, v in val.items()}}}
    return {"stringValue": str(val)}


def list_ids(session: requests.Session, headers: dict, collection: str) -> set[str]:
    ids: set[str] = set()
    pt = None
    while True:
        url = f"{FIRESTORE_BASE}/{collection}?pageSize=300&mask.fieldPaths=id" + (f"&pageToken={pt}" if pt else "")
        r = session.get(url, headers=headers, timeout=25)
        r.raise_for_status()
        data = r.json()
        for doc in data.get("documents", []):
            ids.add(doc["name"].split("/")[-1])
        pt = data.get("nextPageToken")
        if not pt:
            break
    return ids


def classify_doc(wb: dict) -> tuple[str, str, str]:
    wid = str(wb.get("id", "")).lower()
    title = str(wb.get("title", "")).lower()
    skill = str(wb.get("skill", "")).lower()
    audio = str(wb.get("audioUrl", "")).strip()

    if skill == "hoeren" or "hoeren" in wid or "hören" in title or audio:
        return "exam_hoeren", "03-hoeren-lesen", "hoeren"
    if (
        "aufnahme_deutsch" in wid
        or "modelltest" in wid
        or "ctest" in wid
        or "fsp" in wid
        or "stk-math" in wid
        or "pruefung" in wid
    ):
        return "exam_lesen", "04-modelltests", "lesen"
    if "lesen" in wid or "lesen" in title or "isbar" in wid or "anamnese" in wid:
        return "exam_lesen", "03-hoeren-lesen", "lesen"
    return "exam_lesen", "03-hoeren-lesen", "lesen"


def normalize_doc(wb: dict, now_iso: str) -> dict:
    wid = str(wb["id"]).strip()
    title = str(wb.get("title", wid)).strip()
    subtitle = str(wb.get("subtitle", "GTF Official Study Dossier")).strip()
    level = str(wb.get("level", "b2")).lower().strip()
    div = str(wb.get("divisionId", "sprachakademie")).strip()
    ct, module, skill = classify_doc(wb)

    raw_questions = wb.get("questions") or []
    questions = []
    for idx, q in enumerate(raw_questions, 1):
        if not isinstance(q, dict):
            continue
        q_clean = {
            "id": str(q.get("id", f"q{idx}")),
            "page": int(q.get("page", 1)),
            "label": str(q.get("label", f"Aufgabe {idx}")),
            "prompt": str(q.get("prompt", "")),
            "type": str(q.get("type", "mcq")),
            "answer": q.get("answer", "a"),
            "explanation": str(q.get("explanation", "")),
        }
        if isinstance(q.get("options"), list) and q["options"]:
            q_clean["options"] = q["options"]
        questions.append(q_clean)

    if not questions:
        questions = [
            {
                "id": "q1",
                "page": 1,
                "label": "Aufgabe 1 · Kernverständnis",
                "prompt": f"Welche zentrale Kompetenz wird im Modul '{title}' trainiert?",
                "type": "mcq",
                "options": [
                    {"id": "a", "text": "Prüfungs- und praxisorientierte Fachsprache nach deutschem Standard."},
                    {"id": "b", "text": "Unstrukturierte Alltagssprache ohne Fachbezug."},
                ],
                "answer": "a",
                "explanation": f"Dieses GTF-Modul ({title}) trainiert gezielt die fachlichen und sprachlichen Anforderungen in Deutschland.",
            }
        ]

    topics = wb.get("topics") if isinstance(wb.get("topics"), list) and wb.get("topics") else [level.upper(), div]
    reading_passage = str(wb.get("readingPassage", "")).strip()
    if not reading_passage and ct != "exam_hoeren":
        reading_passage = f"{title}\n\n{subtitle}\n\nThemenbereiche: {', '.join(str(t) for t in topics[:6])}."

    audio_url = str(wb.get("audioUrl", "")).strip()
    if audio_url and not audio_url.startswith("/") and not audio_url.startswith("http"):
        audio_url = f"/{audio_url}"

    return {
        "id": wid,
        "title": title,
        "subtitle": subtitle,
        "level": level,
        "divisionId": div,
        "category": module,
        "module": module,
        "contentType": ct,
        "skill": skill,
        "pages": int(wb.get("pages", 4)),
        "topics": [str(t) for t in topics],
        "coverColor": str(wb.get("coverColor", "#0F172A")),
        "productSlug": str(wb.get("productSlug", wid)),
        "isFree": bool(wb.get("isFree", True)),
        "priceEur": float(wb.get("priceEur", 0)),
        "priceInr": int(wb.get("priceInr", 0)),
        "audioUrl": audio_url if ct in ("exam_hoeren", "exam_sprechen") else "",
        "readingPassage": reading_passage,
        "grammarNotes": None,
        "questions": questions,
        "flashcards": [],
        "questionCount": len(questions),
        "flashcardCount": 0,
        "createdAt": now_iso,
        "updatedAt": now_iso,
    }


def main() -> int:
    token = get_token()
    session = requests.Session()
    headers = {
        "Authorization": f"Bearer {token}",
        "Content-Type": "application/json",
        "x-goog-user-project": PROJECT_ID,
    }

    existing_wb = list_ids(session, headers, "workbooks")
    existing_mat = list_ids(session, headers, "materials")

    all_wbs: dict[str, dict] = {}
    for fname in ["catalog.json", "sample-workbooks.json"]:
        p = PORTAL_DIR / "data" / fname
        if p.exists():
            data = json.loads(p.read_text(encoding="utf-8"))
            for wb in data.get("workbooks", []):
                wid = str(wb.get("id", "")).strip()
                if wid and wid not in all_wbs:
                    all_wbs[wid] = wb

    now_iso = datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ")
    seeded_wb = 0
    seeded_mat = 0
    failed = 0

    for wid, wb in all_wbs.items():
        need_wb = wid not in existing_wb
        need_mat = wid not in existing_mat
        if not need_wb and not need_mat:
            continue
        doc = normalize_doc(wb, now_iso)
        body = json.dumps({"fields": {k: to_firestore_value(v) for k, v in doc.items()}})

        if need_wb:
            r = session.patch(f"{FIRESTORE_BASE}/workbooks/{wid}", headers=headers, data=body, timeout=20)
            if r.ok:
                seeded_wb += 1
            else:
                failed += 1
                print(f"[FAIL workbooks] {wid}: {r.status_code} {r.text[:160]}")

        if need_mat:
            r = session.patch(f"{FIRESTORE_BASE}/materials/{wid}", headers=headers, data=body, timeout=20)
            if r.ok:
                seeded_mat += 1
            else:
                failed += 1
                print(f"[FAIL materials] {wid}: {r.status_code} {r.text[:160]}")

    print(f"Seeded missing catalog docs -> workbooks: +{seeded_wb}, materials: +{seeded_mat}, failed: {failed}")
    return 0 if failed == 0 else 1


if __name__ == "__main__":
    sys.exit(main())
