#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
================================================================================
The Gateway to Future (GTF) Berlin — Permanent Self-Healing QA Gatekeeper
================================================================================
Automated pre-deploy & deploy gatekeeper invoked by `npm run safe-deploy`.

Pipeline:
  1. Scan every topic/folder registered in `curriculum-labs.ts` and
     `subdivisions.ts` (+ `data/sample-workbooks.json` & `data/catalog.json`).
     Also audit official Berlin address (`Schönefelder Straße 2, GStU, 12355 Berlin`).
  2. Verify every single topic exists in Cloud Firestore (`workbooks` &
     `materials`) and passes `assert_clean_curriculum_doc` (0 Frankenstein docs,
     0 missing audio/grammar/reading fields).
  3. SELF-HEAL: If any newly added topic/folder is missing in Firestore (or fails
     strict QA validation), automatically trigger the seeder / synthesize & push
     the missing topic, then re-verify Firestore before proceeding.
  4. Run `npx tsc --noEmit` and `npm run build` in `gtf-exam-portal`. Abort
     immediately with exact broken file/line diagnostics on any failure.
  5. Deploy via `npx vercel --prod --yes` and run live HTTP 200 smoke tests on
     A1, A2, B1, B2 routes (`app.gatewaytofuture.com`) and main site
     (`gatewaytofuture.com`).
================================================================================
"""

from __future__ import annotations

import argparse
import json
import os
import re
import subprocess
import sys
import time
from datetime import datetime, timezone
from pathlib import Path
from typing import Any

import requests

# Resolve workspace & portal roots cleanly regardless of where invoked from
SCRIPT_PATH = Path(__file__).resolve()
if (SCRIPT_PATH.parent.parent / "gtf-exam-portal").is_dir():
    WORKSPACE_ROOT = SCRIPT_PATH.parent.parent
    PORTAL_DIR = WORKSPACE_ROOT / "gtf-exam-portal"
elif (SCRIPT_PATH.parent.parent / "lib" / "curriculum-labs.ts").is_file():
    PORTAL_DIR = SCRIPT_PATH.parent.parent
    WORKSPACE_ROOT = PORTAL_DIR.parent
else:
    WORKSPACE_ROOT = Path(r"c:\GTF\about us")
    PORTAL_DIR = WORKSPACE_ROOT / "gtf-exam-portal"

SEEDER_SCRIPT = WORKSPACE_ROOT / "scripts" / "seed_a1_b2_firestore.py"
sys.path.insert(0, str(WORKSPACE_ROOT / "scripts"))
import seed_a1_b2_firestore as seeder  # noqa: E402

CURRICULUM_LABS_TS = PORTAL_DIR / "lib" / "curriculum-labs.ts"
SUBDIVISIONS_TS = PORTAL_DIR / "lib" / "subdivisions.ts"
CATALOG_JSON = PORTAL_DIR / "data" / "catalog.json"
SAMPLE_WORKBOOKS_JSON = PORTAL_DIR / "data" / "sample-workbooks.json"

OFFICIAL_ADDRESS = "Schönefelder Straße 2, GStU, 12355 Berlin"
APP_BASE_URL = "https://app.gatewaytofuture.com"
MAIN_SITE_URL = "https://www.gatewaytofuture.com"

# Subdivisions defined in subdivisions.ts that are virtual/client-only workspaces
# (i.e., rendered via FlashcardEngine, ExamRoom, StudienkollegHub, or PflegeHub,
# rather than stored as documents in Firestore `workbooks`/`materials`).
CLIENT_ONLY_SLUGS = {
    "01-vocabulary",
    "02-grammar",
    "03-hoeren-lesen",
    "04-modelltests",
    "core-deck",
    "lab-hoeren",
    "lab-lesen",
    "exam-lesen",
    "exam-hoeren",
    "exam-schreiben",
    "exam-sprechen",
    "stk-workspace",
    "stk-syllabus",
    "pflege-clinical-hub",
    "pflege-dialogues",
}


# ── Helpers ───────────────────────────────────────────────────────────────────

def banner(title: str) -> None:
    print("\n" + "=" * 78)
    print(f" {title}")
    print("=" * 78)


def from_firestore_value(val: dict[str, Any]) -> Any:
    """Convert a Firestore REST Value object into native Python data."""
    if not isinstance(val, dict):
        return val
    if "nullValue" in val:
        return None
    if "booleanValue" in val:
        return bool(val["booleanValue"])
    if "integerValue" in val:
        return int(val["integerValue"])
    if "doubleValue" in val:
        return float(val["doubleValue"])
    if "stringValue" in val:
        return str(val["stringValue"])
    if "timestampValue" in val:
        return str(val["timestampValue"])
    if "arrayValue" in val:
        return [from_firestore_value(x) for x in val["arrayValue"].get("values", [])]
    if "mapValue" in val:
        fields = val["mapValue"].get("fields", {})
        return {k: from_firestore_value(v) for k, v in fields.items()}
    return None


def fetch_all_firestore_docs(
    session: requests.Session, token: str, collection: str
) -> dict[str, dict[str, Any]]:
    """Fetch and decode every document in a Firestore collection."""
    headers = {
        "Authorization": f"Bearer {token}",
        "x-goog-user-project": seeder.PROJECT_ID,
    }
    docs_by_id: dict[str, dict[str, Any]] = {}
    page_token: str | None = None
    while True:
        params: dict[str, Any] = {"pageSize": 300}
        if page_token:
            params["pageToken"] = page_token
        resp = session.get(
            f"{seeder.FIRESTORE_BASE}/{collection}",
            headers=headers,
            params=params,
            timeout=30,
        )
        if resp.status_code == 404:
            return {}
        resp.raise_for_status()
        payload = resp.json()
        for raw_doc in payload.get("documents", []):
            doc_id = raw_doc["name"].rsplit("/", 1)[-1]
            decoded = {
                k: from_firestore_value(v)
                for k, v in raw_doc.get("fields", {}).items()
            }
            decoded.setdefault("id", doc_id)
            docs_by_id[doc_id] = decoded
        page_token = payload.get("nextPageToken")
        if not page_token:
            break
    return docs_by_id


# ── Step 1: Scan curriculum-labs.ts, subdivisions.ts & Official Address ───────

def scan_registered_topics() -> dict[str, dict[str, Any]]:
    """
    Scan curriculum-labs.ts, subdivisions.ts, sample-workbooks.json, and catalog.json
    for every registered CEFR topic ID that must exist in Firestore.
    Returns mapping: topic_id -> metadata dict.
    """
    registered: dict[str, dict[str, Any]] = {}

    # 1A. Scan curriculum-labs.ts for all declared lab & grammar pillar IDs
    ts_labs_text = CURRICULUM_LABS_TS.read_text(encoding="utf-8")
    # Match object blocks containing id: "..." and level: "..."
    id_matches = re.findall(r'id:\s*"([a-z0-9_-]+)"', ts_labs_text)
    for tid in id_matches:
        # Ignore inner flashcard/question IDs (fc_*, q1..q99)
        if tid.startswith(("fc_", "q")) or len(tid) <= 3:
            continue
        lvl_match = re.match(r"^(a1|a2|b1|b2)-", tid)
        if lvl_match:
            lvl = lvl_match.group(1)
            is_grammar = "-grammar-" in tid
            registered[tid] = {
                "id": tid,
                "level": lvl,
                "source": "curriculum-labs.ts",
                "expected_module": "02-grammar" if is_grammar else "03-hoeren-lesen",
                "is_grammar": is_grammar,
            }

    # 1B. Scan subdivisions.ts for declared module folders & any hardcoded topic IDs
    sub_text = SUBDIVISIONS_TS.read_text(encoding="utf-8")
    required_folders = ["01-vocabulary", "02-grammar", "03-hoeren-lesen", "04-modelltests"]
    missing_folders = [f for f in required_folders if f'"{f}"' not in sub_text]
    if missing_folders:
        raise RuntimeError(
            f"[QA FAIL] subdivisions.ts missing core folder slugs: {missing_folders}"
        )

    # Scan any hardcoded id: "..." in subdivisions.ts that isn't a client-only route
    sub_ids = re.findall(r'id:\s*"([a-z0-9_-]+)"', sub_text)
    for sid in sub_ids:
        if sid in CLIENT_ONLY_SLUGS:
            continue
        lvl_match = re.match(r"^(a1|a2|b1|b2)-", sid)
        if lvl_match and sid not in registered:
            registered[sid] = {
                "id": sid,
                "level": lvl_match.group(1),
                "source": "subdivisions.ts",
                "expected_module": "02-grammar" if "grammar" in sid else "03-hoeren-lesen",
                "is_grammar": "grammar" in sid,
            }

    # 1C. Scan data/sample-workbooks.json
    if SAMPLE_WORKBOOKS_JSON.exists():
        swb = json.loads(SAMPLE_WORKBOOKS_JSON.read_text(encoding="utf-8"))
        for wb in swb.get("workbooks", []):
            wid = str(wb.get("id", "")).strip()
            lvl = str(wb.get("level", "")).lower().strip()
            if wid and lvl in ("a1", "a2", "b1", "b2") and wid not in registered:
                registered[wid] = {
                    "id": wid,
                    "level": lvl,
                    "source": "sample-workbooks.json",
                    "expected_module": "02-grammar" if "grammatik" in wid else "03-hoeren-lesen",
                    "is_grammar": "grammatik" in wid,
                }

    # 1D. Scan data/catalog.json CEFR sprachakademie workbooks
    if CATALOG_JSON.exists():
        cat = json.loads(CATALOG_JSON.read_text(encoding="utf-8"))
        for wb in cat.get("workbooks", []):
            wid = str(wb.get("id", "")).strip()
            div = str(wb.get("divisionId", "sprachakademie")).lower().strip()
            lvl = str(wb.get("level", "")).lower().strip()
            if (
                wid
                and div == "sprachakademie"
                and lvl in ("a1", "a2", "b1", "b2")
                and wid not in registered
            ):
                sk = str(wb.get("skill") or "").lower().strip()
                is_exam = (
                    sk in ("hoeren", "lesen", "schreiben", "sprechen", "allround")
                    or any(k in wid.lower() for k in ("hoeren", "lesen", "sprachbausteine", "pruefungstraining", "modelltest"))
                    or bool(wb.get("audioUrl"))
                )
                registered[wid] = {
                    "id": wid,
                    "level": lvl,
                    "source": "catalog.json",
                    "expected_module": "03-hoeren-lesen" if is_exam else "02-grammar",
                    "is_grammar": not is_exam,
                }

    return registered


def verify_address_and_crash_guards() -> None:
    """Verify official Berlin address and crash-elimination directives in source files."""
    checks = [
        (PORTAL_DIR / "lib" / "config.ts", OFFICIAL_ADDRESS),
        (PORTAL_DIR / "app" / "privacy" / "page.tsx", OFFICIAL_ADDRESS),
        (PORTAL_DIR / "app" / "terms" / "page.tsx", OFFICIAL_ADDRESS),
        (WORKSPACE_ROOT / "index.html", OFFICIAL_ADDRESS),
        (PORTAL_DIR / "app" / "layout.tsx", 'translate="no"'),
        (PORTAL_DIR / "app" / "layout.tsx", 'content="notranslate"'),
        (PORTAL_DIR / "components" / "FocusedWorkbookWorkspace.tsx", "3000"),
    ]
    for fpath, needle in checks:
        text = fpath.read_text(encoding="utf-8")
        if needle not in text:
            raise RuntimeError(
                f"[QA FAIL] Missing required directive '{needle}' in {fpath}"
            )

    # Ensure zero occurrences of old address in key web files
    web_files = [
        PORTAL_DIR / "lib" / "config.ts",
        PORTAL_DIR / "app" / "privacy" / "page.tsx",
        PORTAL_DIR / "app" / "terms" / "page.tsx",
        PORTAL_DIR / "STORE_LAUNCH_KIT.md",
        PORTAL_DIR / "automation" / "n8n_gtf_workflow.json",
        PORTAL_DIR / "automation" / "n8n_firebase_auth_whatsapp_workflow.json",
        WORKSPACE_ROOT / "index.html",
        WORKSPACE_ROOT / "contact.html",
        WORKSPACE_ROOT / "courses.html",
        WORKSPACE_ROOT / "ausbildung.html",
        WORKSPACE_ROOT / "STORE_LAUNCH_KIT.md",
        WORKSPACE_ROOT / "automation" / "n8n_gtf_workflow.json",
    ]
    for fpath in web_files:
        if fpath.exists():
            text = fpath.read_text(encoding="utf-8")
            if "Ketschendorfer Weg 33" in text or "12683 Berlin" in text:
                raise RuntimeError(
                    f"[QA FAIL] Old Berlin address detected in {fpath}"
                )
    print("[✓] Official Berlin address & DOM crash-guard directives verified.")


# ── Step 2 & 3: Verify Firestore + Self-Heal Missing/Broken Topics ────────────

def extract_new_topic_from_ts(topic_id: str) -> dict[str, Any] | None:
    """
    If a brand-new topic was added to `curriculum-labs.ts` without yet being
    added to `seed_a1_b2_firestore.py`, extract its fields cleanly via Node.js
    or regex and synthesize a clean `assert_clean_curriculum_doc`-compliant doc.
    """
    ts_text = CURRICULUM_LABS_TS.read_text(encoding="utf-8")
    idx = ts_text.find(f'id: "{topic_id}"')
    if idx == -1:
        return None
    snippet = ts_text[idx : idx + 3500]
    lvl_m = re.search(r'level:\s*"([a-z0-9_]+)"', snippet)
    title_m = re.search(r'title:\s*"([^"]+)"', snippet)
    sub_m = re.search(r'subtitle:\s*"([^"]+)"', snippet)
    skill_m = re.search(r'skill:\s*"([a-z_]+)"', snippet)
    audio_m = re.search(r'audioUrl:\s*"([^"]*)"', snippet)

    lvl = (lvl_m.group(1) if lvl_m else topic_id.split("-")[0]).lower()
    title = title_m.group(1) if title_m else topic_id
    subtitle = sub_m.group(1) if sub_m else f"GTF {lvl.upper()} Curriculum Module"
    skill = skill_m.group(1) if skill_m else ("grammar" if "-grammar-" in topic_id else "lesen")
    audio_url = audio_m.group(1) if audio_m else ""

    if skill == "grammar" or "-grammar-" in topic_id:
        cards = [
            c for c in seeder.HIGH_DENSITY_FLASHCARDS if c["level"].lower() == lvl
        ][:4] or seeder.HIGH_DENSITY_FLASHCARDS[:4]
        doc = {
            "id": topic_id,
            "level": lvl,
            "module": "02-grammar",
            "contentType": "grammar",
            "hierarchyPath": f"{lvl.upper()}/02-grammar/{topic_id}",
            "title": title,
            "subtitle": subtitle,
            "divisionId": "sprachakademie",
            "skill": "grammar",
            "badge": "122 SÄULEN · GRAMMAR",
            "topics": [lvl.upper(), "Grammatik"],
            "pages": 4,
            "coverColor": "#134074",
            "productSlug": topic_id,
            "isFree": True,
            "priceEur": 0.0,
            "priceInr": 0,
            "readingPassage": "",
            "audioUrl": "",
            "grammarNotes": {
                "rule": subtitle,
                "proTip": "Beachten Sie Verbposition 2 im Hauptsatz und Endstellung im Nebensatz.",
                "examples": [f"Beispielstruktur zu {title}."],
            },
            "questions": [],
            "flashcards": cards,
            "questionCount": 0,
            "flashcardCount": len(cards),
        }
    else:
        ct, module = seeder.classify_lab_record(topic_id, skill, title)
        questions = [
            {
                "id": "q1",
                "page": 1,
                "label": "Aufgabe 1",
                "prompt": f"Kernverständnis zu '{title}': Welche Aussage trifft zu?",
                "type": "mcq",
                "options": [
                    {"id": "a", "text": "Die Vorgaben entsprechen dem offiziellen CEFR-Prüfungsformat."},
                    {"id": "b", "text": "Die Struktur weicht vom Prüfungsstandard ab."},
                ],
                "answer": "a",
                "explanation": seeder.enrich_explanation_with_hindi(
                    "Richtige Antwort gemäß CEFR-Standard.", lvl
                ),
            }
        ]
        resolved_audio = audio_url or (
            f"/audio/hoeren/daf_{lvl}_hoeren_01.mp3" if ct in ("exam_hoeren", "exam_sprechen") else ""
        )
        doc = {
            "id": topic_id,
            "level": lvl,
            "module": module,
            "contentType": ct,
            "hierarchyPath": f"{lvl.upper()}/{module}/{topic_id}",
            "title": title,
            "subtitle": subtitle,
            "divisionId": "sprachakademie",
            "skill": "hoeren" if ct == "exam_hoeren" else "lesen",
            "badge": f"{lvl.upper()} EXAM LAB",
            "topics": [lvl.upper(), skill.upper()],
            "pages": 4,
            "coverColor": "#0D1017",
            "productSlug": topic_id,
            "isFree": True,
            "priceEur": 0.0,
            "priceInr": 0,
            "readingPassage": "" if ct == "exam_hoeren" else seeder.build_default_reading_passage(title, subtitle, questions),
            "audioUrl": resolved_audio,
            "grammarNotes": None,
            "questions": questions,
            "flashcards": [],
            "questionCount": len(questions),
            "flashcardCount": 0,
        }

    seeder.assert_clean_curriculum_doc(doc)
    return doc


def audit_firestore(
    session: requests.Session, token: str, registered: dict[str, dict[str, Any]]
) -> tuple[list[str], list[str], dict[str, int]]:
    """
    Audit Firestore `workbooks` & `materials`:
      - Every registered topic exists in both `workbooks` & `materials`
      - Every document passes `assert_clean_curriculum_doc`
      - Every exam_hoeren audioUrl points to an existing MP3 asset
    Returns (missing_ids, frankenstein_errors, summary_counts).
    """
    wb_docs = fetch_all_firestore_docs(session, token, "workbooks")
    mat_docs = fetch_all_firestore_docs(session, token, "materials")

    missing_ids: list[str] = []
    for tid in sorted(registered.keys()):
        if tid not in wb_docs or tid not in mat_docs:
            missing_ids.append(tid)

    frankenstein_errors: list[str] = []
    for col_name, col_docs in (("workbooks", wb_docs), ("materials", mat_docs)):
        for doc_id, doc in col_docs.items():
            try:
                seeder.assert_clean_curriculum_doc(doc)
            except Exception as exc:
                frankenstein_errors.append(f"{col_name}/{doc_id}: {exc}")
                continue

            if doc.get("contentType") == "exam_hoeren":
                audio_url = str(doc.get("audioUrl") or "").strip()
                if audio_url.startswith("/"):
                    local_audio = PORTAL_DIR / "public" / audio_url.lstrip("/")
                    if not local_audio.is_file():
                        frankenstein_errors.append(
                            f"{col_name}/{doc_id}: missing audio file {local_audio}"
                        )

    summary = {
        "registered_topics": len(registered),
        "workbooks_count": len(wb_docs),
        "materials_count": len(mat_docs),
        "missing_count": len(missing_ids),
        "frankenstein_count": len(frankenstein_errors),
    }
    return missing_ids, frankenstein_errors, summary


def verify_and_self_heal_firestore(registered: dict[str, dict[str, Any]]) -> dict[str, int]:
    token = seeder.get_auth_token()
    session = requests.Session()

    missing_ids, frankenstein_errors, summary = audit_firestore(session, token, registered)
    print(f"--> Initial Firestore Audit: {json.dumps(summary)}")

    if missing_ids or frankenstein_errors:
        print(f"[!] Self-Heal triggered! Missing={missing_ids} | QA Errors={len(frankenstein_errors)}")
        for err in frankenstein_errors[:10]:
            print(f"    [QA ERR] {err}")

        # 1. Run full curriculum seeder
        cmd = [sys.executable, str(SEEDER_SCRIPT), "--level", "all"]
        if frankenstein_errors:
            cmd.append("--purge")
        print(f"--> Running Seeder: {' '.join(cmd)}")
        res = subprocess.run(cmd, cwd=str(WORKSPACE_ROOT), check=False)
        if res.returncode != 0:
            raise RuntimeError("Firestore seeder returned non-zero exit code during self-heal.")

        # 2. Check for any brand-new topics in curriculum-labs.ts not yet in seed_a1_b2_firestore.py
        token = seeder.get_auth_token()
        missing_after, _, _ = audit_firestore(session, token, registered)
        if missing_after:
            now_iso = datetime.now(timezone.utc).isoformat()
            for tid in missing_after:
                synth_doc = extract_new_topic_from_ts(tid)
                if not synth_doc:
                    raise RuntimeError(
                        f"[SELF-HEAL FAIL] Topic '{tid}' could not be synthesized from source files."
                    )
                payload = {**synth_doc, "createdAt": now_iso, "updatedAt": now_iso}
                for col in ("workbooks", "materials"):
                    ok, msg, _ = seeder.push_firestore_doc(session, token, col, tid, payload)
                    if not ok:
                        raise RuntimeError(f"[SELF-HEAL FAIL] Failed pushing {col}/{tid}: {msg}")
                print(f"    [✓] Self-healed brand-new topic '{tid}' into workbooks & materials.")

        # 3. Re-verify Firestore after self-healing
        missing_final, frank_final, summary_final = audit_firestore(session, token, registered)
        print(f"--> Post-Heal Firestore Audit: {json.dumps(summary_final)}")
        if missing_final or frank_final:
            raise RuntimeError(
                f"[QA GATE ABORT] Firestore still has issues after self-heal: "
                f"missing={missing_final}, frankenstein={frank_final[:5]}"
            )
        return summary_final

    print("[✓] Firestore 100% verified: 0 missing topics, frankensteinCount: 0.")
    return summary


# ── Step 4: TypeScript & Next.js Build Gate ───────────────────────────────────

def run_command_or_abort(cmd: list[str], cwd: Path, label: str) -> None:
    print(f"--> Running {label}: {' '.join(cmd)} (cwd={cwd})")
    proc = subprocess.run(
        cmd,
        cwd=str(cwd),
        shell=(os.name == "nt"),
        text=True,
        capture_output=True,
    )
    if proc.stdout:
        print(proc.stdout[-3500:] if len(proc.stdout) > 3500 else proc.stdout)
    if proc.returncode != 0:
        print(f"\n[X] {label} FAILED (exit code {proc.returncode})!", file=sys.stderr)
        if proc.stderr:
            print(proc.stderr, file=sys.stderr)
        raise RuntimeError(f"{label} failed; deployment aborted.")
    print(f"[✓] {label} passed with 0 errors.")


# ── Step 5: Production Deployment & Live HTTP 200 Smoke Tests ─────────────────

def deploy_vercel_prod() -> str:
    print("--> Deploying gtf-exam-portal to Vercel Production (npx vercel --prod --yes)...")
    proc = subprocess.run(
        ["npx", "vercel", "--prod", "--yes"],
        cwd=str(PORTAL_DIR),
        shell=(os.name == "nt"),
        text=True,
        capture_output=True,
    )
    combined = (proc.stdout or "") + "\n" + (proc.stderr or "")
    print(combined[-3000:] if len(combined) > 3000 else combined)
    if proc.returncode != 0:
        raise RuntimeError(f"Vercel deployment failed (exit code {proc.returncode}).")
    print("[✓] Vercel production deployment succeeded.")
    return combined


def run_live_smoke_tests() -> dict[str, int]:
    """Run live HTTP 200 smoke tests across A1, A2, B1, B2, and main site routes."""
    routes = [
        f"{APP_BASE_URL}/",
        f"{APP_BASE_URL}/about",
        f"{APP_BASE_URL}/privacy",
        f"{APP_BASE_URL}/terms",
        f"{APP_BASE_URL}/academy/a1",
        f"{APP_BASE_URL}/academy/a1/02-grammar/a1-grammar-01-satzbau-v2",
        f"{APP_BASE_URL}/academy/a2",
        f"{APP_BASE_URL}/academy/a2/02-grammar/a2-grammar-01-perfekt-vergangenheit",
        f"{APP_BASE_URL}/academy/b1",
        f"{APP_BASE_URL}/academy/b1/02-grammar/b1-grammar-01-nebensaetze-konnektoren",
        f"{APP_BASE_URL}/academy/b2",
        f"{APP_BASE_URL}/academy/b2/02-grammar/b2-grammar-01-nominalstil",
        f"{APP_BASE_URL}/academy/b2/02-grammar/b2-grammar-03-partizipialattribute",
        f"{APP_BASE_URL}/api/workbooks/b1-grammar-01-nebensaetze-konnektoren",
        f"{APP_BASE_URL}/api/workbooks/b2-grammar-01-nominalstil",
        f"{APP_BASE_URL}/api/workbooks/b2-grammar-03-partizipialattribute",
        f"{MAIN_SITE_URL}/",
        f"{MAIN_SITE_URL}/contact.html",
    ]
    results: dict[str, int] = {}
    failures: list[str] = []

    for url in routes:
        try:
            r = requests.get(url, timeout=15, allow_redirects=True)
            results[url] = r.status_code
            status_tag = "OK" if r.status_code == 200 else "FAIL"
            print(f"    [{status_tag}] {r.status_code} {url}")
            if r.status_code != 200:
                failures.append(f"{url} -> HTTP {r.status_code}")
                continue

            # Content assertions on critical endpoints
            if url == f"{APP_BASE_URL}/privacy" and OFFICIAL_ADDRESS not in r.text:
                failures.append(f"{url} missing new official Berlin address")
            if url == f"{APP_BASE_URL}/" and 'translate="no"' not in r.text:
                failures.append(f"{url} missing translate=\"no\" crash protection")
            if "/api/workbooks/" in url:
                wb = r.json().get("workbook", {})
                if wb.get("contentType") != "grammar" or len(wb.get("flashcards") or []) < 4:
                    failures.append(
                        f"{url} failed grammar payload check: ct={wb.get('contentType')} fc={len(wb.get('flashcards') or [])}"
                    )
            if url == f"{MAIN_SITE_URL}/" and OFFICIAL_ADDRESS not in r.text:
                failures.append(f"{url} missing new official Berlin address in live HTML")
        except Exception as exc:
            results[url] = 0
            failures.append(f"{url} -> {exc}")

    if failures:
        raise RuntimeError("[SMOKE TEST FAIL]\n  - " + "\n  - ".join(failures))
    print(f"[✓] All {len(routes)} live smoke tests returned HTTP 200 & passed payload assertions.")
    return results


# ── Main Entrypoint ───────────────────────────────────────────────────────────

def main() -> int:
    parser = argparse.ArgumentParser(description="GTF Permanent Self-Healing QA Gatekeeper")
    parser.add_argument(
        "--verify-only",
        action="store_true",
        help="Run curriculum, Firestore self-heal, tsc, and build checks without deploying.",
    )
    parser.add_argument(
        "--skip-smoke",
        action="store_true",
        help="Skip live HTTP 200 smoke test after deployment.",
    )
    args = parser.parse_args()

    t0 = time.time()
    banner("GTF SELF-HEALING QA GATEKEEPER — PRE-DEPLOYMENT PIPELINE")
    print(f"Workspace Root : {WORKSPACE_ROOT}")
    print(f"Portal Root    : {PORTAL_DIR}")

    # Step 1
    banner("STEP 1/5: Scan Curriculum Registry & Brand Address Directives")
    registered = scan_registered_topics()
    print(f"[✓] Discovered {len(registered)} registered CEFR topics across curriculum-labs.ts, subdivisions.ts & data/*.json.")
    verify_address_and_crash_guards()

    # Step 2 & 3
    banner("STEP 2-3/5: Firestore Audit & Automated Self-Healing")
    fs_summary = verify_and_self_heal_firestore(registered)

    # Step 4
    banner("STEP 4/5: TypeScript Typecheck & Production Next.js Build")
    run_command_or_abort(["npx", "tsc", "--noEmit"], PORTAL_DIR, "TypeScript (npx tsc --noEmit)")
    run_command_or_abort(["npm", "run", "build"], PORTAL_DIR, "Next.js Production Build (npm run build)")

    if args.verify_only:
        elapsed = round(time.time() - t0, 2)
        banner(f"VERIFICATION COMPLETE IN {elapsed}s (--verify-only)")
        print(json.dumps(fs_summary, indent=2))
        return 0

    # Step 5
    banner("STEP 5/5: Vercel Production Deploy & Live HTTP 200 Smoke Tests")
    deploy_vercel_prod()
    if not args.skip_smoke:
        time.sleep(3)
        run_live_smoke_tests()

    elapsed = round(time.time() - t0, 2)
    banner(f"SAFE DEPLOY 100% GREEN IN {elapsed}s")
    return 0


if __name__ == "__main__":
    try:
        sys.exit(main())
    except Exception as err:
        print(f"\n[ABORTED] {err}", file=sys.stderr)
        sys.exit(1)
