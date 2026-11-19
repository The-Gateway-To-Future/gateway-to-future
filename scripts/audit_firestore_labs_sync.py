#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Audit EVERY topic/lab/grammar/workbook ID defined across:
  1. gtf-exam-portal/lib/curriculum-labs.ts (ALL_CORE_LABS & ALL_GRAMMAR_PILLARS)
  2. gtf-exam-portal/data/catalog.json (workbooks)
  3. gtf-exam-portal/data/sample-workbooks.json (workbooks)
against live Cloud Firestore `workbooks` and `materials` collections in project `gateway-to-future`.
"""

import json
import re
import subprocess
import sys
from pathlib import Path
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


def list_firestore_docs(session: requests.Session, headers: dict, collection: str) -> dict[str, dict]:
    docs: dict[str, dict] = {}
    pt = None
    while True:
        url = f"{FIRESTORE_BASE}/{collection}?pageSize=300" + (f"&pageToken={pt}" if pt else "")
        r = session.get(url, headers=headers, timeout=25)
        if not r.ok:
            raise RuntimeError(f"Failed listing {collection}: HTTP {r.status_code} {r.text[:200]}")
        data = r.json()
        for doc in data.get("documents", []):
            doc_id = doc["name"].split("/")[-1]
            fields = doc.get("fields", {})
            docs[doc_id] = {
                "title": fields.get("title", {}).get("stringValue", ""),
                "level": fields.get("level", {}).get("stringValue", ""),
                "contentType": fields.get("contentType", {}).get("stringValue", ""),
                "module": fields.get("module", {}).get("stringValue", ""),
                "audioUrl": fields.get("audioUrl", {}).get("stringValue", ""),
                "questions": len(fields.get("questions", {}).get("arrayValue", {}).get("values", [])),
                "flashcards": len(fields.get("flashcards", {}).get("arrayValue", {}).get("values", [])),
            }
        pt = data.get("nextPageToken")
        if not pt:
            break
    return docs


def extract_curriculum_lab_ids() -> list[tuple[str, str, str]]:
    """Parse all top-level lab & grammar pillar IDs from curriculum-labs.ts."""
    ts_path = PORTAL_DIR / "lib" / "curriculum-labs.ts"
    text = ts_path.read_text(encoding="utf-8")
    # Match entries with id + level + index + title (top-level lab/pillar objects, not question ids q1..q8)
    pattern = re.compile(
        r'id:\s*"([^"]+)",\s*\r?\n\s*level:\s*"([^"]+)",\s*\r?\n\s*index:\s*(\d+),\s*\r?\n\s*indexLabel:\s*"([^"]+)",\s*\r?\n\s*title:\s*"([^"]+)"'
    )
    results = []
    for m in pattern.finditer(text):
        results.append((m.group(1), m.group(2), f"{m.group(4)} | {m.group(5)}"))
    return results


def extract_catalog_workbook_ids() -> list[tuple[str, str, str, str]]:
    items = []
    seen = set()
    for fname in ["catalog.json", "sample-workbooks.json"]:
        p = PORTAL_DIR / "data" / fname
        if not p.exists():
            continue
        data = json.loads(p.read_text(encoding="utf-8"))
        for wb in data.get("workbooks", []):
            wid = str(wb.get("id", "")).strip()
            if not wid or wid in seen:
                continue
            seen.add(wid)
            items.append((wid, str(wb.get("level", "")), str(wb.get("divisionId", "sprachakademie")), str(wb.get("title", ""))))
    return items


def main() -> int:
    token = get_token()
    session = requests.Session()
    headers = {"Authorization": f"Bearer {token}", "x-goog-user-project": PROJECT_ID}

    fs_workbooks = list_firestore_docs(session, headers, "workbooks")
    fs_materials = list_firestore_docs(session, headers, "materials")

    print("=" * 90)
    print(f"GTF FIRESTORE LAB & WORKBOOK AUDIT (Project: {PROJECT_ID})")
    print(f"Firestore `workbooks`: {len(fs_workbooks)} docs | Firestore `materials`: {len(fs_materials)} docs")
    print("=" * 90)

    ts_labs = extract_curriculum_lab_ids()
    print(f"\n[1] curriculum-labs.ts entries found: {len(ts_labs)}")
    missing_ts_wb = []
    missing_ts_mat = []
    for lab_id, level, desc in ts_labs:
        in_wb = lab_id in fs_workbooks
        in_mat = lab_id in fs_materials
        if not in_wb:
            missing_ts_wb.append((lab_id, level, desc))
        if not in_mat:
            missing_ts_mat.append((lab_id, level, desc))

    print(f"    Missing in Firestore `workbooks`: {len(missing_ts_wb)}")
    for item in missing_ts_wb:
        print(f"      MISSING WB: {item[0]} ({item[1]}) — {item[2]}")
    print(f"    Missing in Firestore `materials`: {len(missing_ts_mat)}")
    for item in missing_ts_mat:
        print(f"      MISSING MAT: {item[0]} ({item[1]}) — {item[2]}")

    cat_wbs = extract_catalog_workbook_ids()
    print(f"\n[2] catalog.json + sample-workbooks.json entries found: {len(cat_wbs)}")
    missing_cat_wb = []
    missing_cat_mat = []
    for wid, level, div, title in cat_wbs:
        if wid not in fs_workbooks:
            missing_cat_wb.append((wid, level, div, title))
        if wid not in fs_materials:
            missing_cat_mat.append((wid, level, div, title))

    print(f"    Missing in Firestore `workbooks`: {len(missing_cat_wb)}")
    for item in missing_cat_wb:
        print(f"      MISSING WB: {item[0]} (lvl={item[1]}, div={item[2]}) — {item[3]}")
    print(f"    Missing in Firestore `materials`: {len(missing_cat_mat)}")
    for item in missing_cat_mat:
        print(f"      MISSING MAT: {item[0]} (lvl={item[1]}, div={item[2]}) — {item[3]}")

    # Check Lab 11 specifically
    print("\n[3] Spot-check: A1 Hören — Am Berliner Hauptbahnhof")
    for doc_id, meta in sorted(fs_workbooks.items()):
        if "Hauptbahnhof" in meta["title"]:
            print(f"    FOUND in workbooks & materials={doc_id in fs_materials}: {doc_id}")
            print(f"      title={meta['title']!r} | level={meta['level']} | ct={meta['contentType']} | audio={meta['audioUrl']} | q={meta['questions']}")

    total_missing = len(missing_ts_wb) + len(missing_ts_mat) + len(missing_cat_wb) + len(missing_cat_mat)
    print("\n" + "=" * 90)
    print(f"TOTAL MISSING/MISMATCHED DOCS ACROSS ALL SOURCES: {total_missing}")
    print("=" * 90)
    return 0 if total_missing == 0 else 1


if __name__ == "__main__":
    sys.exit(main())
