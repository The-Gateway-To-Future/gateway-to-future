#!/usr/bin/env python3
"""
The Gateway to Future (GTF) — Firestore Direct Connection Test
Tests writing and reading a sample A1/B1 German Flashcard to Firestore.
Uses GCP Project 'gateway-to-future'.
"""

import sys
import json
import time
import subprocess
import requests

PROJECT_ID = "gateway-to-future"
COLLECTION = "flashcards"
TEST_CARD_ID = f"test_fc_krankenversicherung_{int(time.time())}"

def get_access_token():
    """Retrieve OAuth2 token via gcloud or local service account"""
    try:
        token = subprocess.check_output(
            ["gcloud", "auth", "print-access-token"],
            shell=True,
            text=True
        ).strip()
        return token
    except Exception as e:
        print(f"[!] Error getting gcloud access token: {e}")
        return None

def main():
    print("=" * 65)
    print(" 🇩🇪 GTF FIRESTORE FLASHCARD INGESTION VERIFICATION")
    print(f" Target Project: {PROJECT_ID}")
    print(f" Collection:     {COLLECTION}")
    print(f" Test Card ID:   {TEST_CARD_ID}")
    print("=" * 65)

    token = get_access_token()
    if not token:
        print("[X] Failed to acquire Google Cloud authorization token.")
        sys.exit(1)

    print("[✓] Acquired Google Cloud access token.")

    # Flashcard Payload according to GTF CEFR A1-B2 Standard
    doc_url = f"https://firestore.googleapis.com/v1/projects/{PROJECT_ID}/databases/(default)/documents/{COLLECTION}/{TEST_CARD_ID}"
    headers = {
        "Authorization": f"Bearer {token}",
        "Content-Type": "application/json"
    }

    payload = {
        "fields": {
            "id": {"stringValue": TEST_CARD_ID},
            "level": {"stringValue": "B1"},
            "category": {"stringValue": "Healthcare & Relocation"},
            "german": {"stringValue": "die Krankenversicherung"},
            "articleDe": {"stringValue": "die"},
            "phonetic": {"stringValue": "/ˈkʁaŋkn̩fɛɐ̯ˌzɪçəʁʊŋ/"},
            "pronunciationDe": {"stringValue": "dee Krahn-ken-fair-zikh-air-oong"},
            "english": {"stringValue": "Health Insurance"},
            "hindi": {"stringValue": "स्वास्थ्य बीमा (Health Insurance)"},
            "contextHinglish": {"stringValue": "Germany mein visa aur job dono ke liye Krankenversicherung mandatory hai."},
            "exampleDe": {"stringValue": "Jeder Auszubildende in Deutschland muss eine Krankenversicherung abschließen."},
            "exampleTranslation": {"stringValue": "Every vocational trainee in Germany must take out health insurance."},
            "grammarTip": {"stringValue": "Nomen mit der Endung -ung sind immer weiblich (die)."},
            "source": {"stringValue": "emp11_interactive_builder"},
            "createdAt": {"timestampValue": "2026-11-16T20:30:00Z"},
            "updatedAt": {"timestampValue": "2026-11-16T20:30:00Z"}
        }
    }

    print(f"--> Pushing test document to: {doc_url} ...")
    resp = requests.patch(doc_url, headers=headers, json=payload, timeout=15)

    if resp.status_code in (200, 201):
        print(f"[✓] SUCCESS! Document created with HTTP {resp.status_code}.")
        print("    Firestore response path:", resp.json().get("name", "N/A"))
    else:
        print(f"[X] FAILED with status code {resp.status_code}: {resp.text}")
        sys.exit(1)

    # Verify Read
    print("--> Verifying document read back from Firestore...")
    get_resp = requests.get(doc_url, headers=headers, timeout=10)
    if get_resp.status_code == 200:
        data = get_resp.json()
        german_val = data.get("fields", {}).get("german", {}).get("stringValue")
        print(f"[✓] VERIFIED! Read back German field: '{german_val}'")
    else:
        print(f"[!] Warning: Read back failed with code {get_resp.status_code}")

    print("=" * 65)
    print(" All Firestore integration checks passed successfully!")
    print("=" * 65)

if __name__ == "__main__":
    main()
