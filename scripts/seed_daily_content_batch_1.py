#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
================================================================================
The Gateway to Future (GTF) Berlin — Daily Balanced Content Batch #1 Seeder
================================================================================
Seeds 5 balanced German learning labs (1 per track: A1, A2, B1, B2, Studienkolleg):
  1. a1-lab-11-baecker-supermarkt
  2. a2-lab-11-perfekt-praeteritum-alltag
  3. b1-lab-11-wohnungssuche-mietvertrag
  4. b2-lab-11-beruf-emails-beschwerdemanagement
  5. stk-math-ctest-kompakt-01

Actions:
  1. Upserts all 5 workbooks + products into `gtf-exam-portal/data/catalog.json`
  2. Upserts the 4 CEFR core labs into `gtf-exam-portal/data/all_core_labs.json`
  3. Validates all 5 documents against `seed_a1_b2_firestore.assert_clean_curriculum_doc`
  4. Pushes all 5 documents cleanly into Cloud Firestore `workbooks` & `materials`
     in GCP project `gateway-to-future` and verifies HTTP 200 read-back.
================================================================================
"""

from __future__ import annotations

import json
import sys
from datetime import datetime, timezone
from pathlib import Path
from typing import Any

import requests

BASE_DIR = Path(__file__).resolve().parent.parent
PORTAL_DIR = BASE_DIR / "gtf-exam-portal"
DATA_DIR = PORTAL_DIR / "data"
CATALOG_FILE = DATA_DIR / "catalog.json"
CORE_LABS_FILE = DATA_DIR / "all_core_labs.json"

sys.path.insert(0, str(BASE_DIR / "scripts"))
import seed_a1_b2_firestore as seeder  # noqa: E402


DAILY_BATCH_1_ITEMS: list[dict[str, Any]] = [
    # ─────────────────────────────────────────────────────────────────────────
    # 1. A1 — Alltag & Hören/Lesen
    # ─────────────────────────────────────────────────────────────────────────
    {
        "id": "a1-lab-11-baecker-supermarkt",
        "level": "a1",
        "divisionId": "sprachakademie",
        "index": 11,
        "indexLabel": "LAB 11 · ALLTAG & PREISE",
        "title": "A1 Alltag — Beim Bäcker und im Supermarkt (Zahlen, Preise & Höflichkeitsformen)",
        "subtitle": "Realistischer Einkaufsdialog in Berlin, Zahlen & Preise in Euro, höfliche Bestellungen (möchten / hätten gern) + 6 Prüfungsaufgaben & Kernwortschatz.",
        "badge": "DAILY LAB #1 · 6 TASKS",
        "topics": [
            "Beim Bäcker",
            "Im Supermarkt",
            "Zahlen & Preise",
            "Höflichkeitsformen",
        ],
        "pages": 4,
        "coverColor": "#0F4C81",
        "productSlug": "a1-lab-11-baecker-supermarkt",
        "isFree": True,
        "priceEur": 0.0,
        "priceInr": 0,
        "audioUrl": "",
        "skill": "lesen",
        "contentType": "exam_lesen",
        "module": "03-hoeren-lesen",
        "readingPassage": (
            "SZENE 1 · MORGENS IN DER BERLINER BÄCKEREI „KORN & KRUSTE“\n\n"
            "Verkäufer (Herr Bergmann): Guten Morgen! Was darf es heute sein?\n"
            "Kundin (Anja): Guten Morgen! Ich hätte gern zwei Vollkornbrötchen, eine Brezel und ein kleines Bauernbrot, bitte.\n"
            "Verkäufer: Sehr gern. Zwei Vollkornbrötchen kosten zusammen 1,50 Euro, die Brezel 1,20 Euro und das kleine Bauernbrot 3,40 Euro. Darf es sonst noch etwas sein?\n"
            "Anja: Nein, danke, das ist alles. Wie viel macht das zusammen?\n"
            "Verkäufer: Das macht zusammen genau 6,10 Euro. Zahlen Sie bar oder mit Karte?\n"
            "Anja: Ich zahle heute bar. Hier sind 10,00 Euro.\n"
            "Verkäufer: Vielen Dank. Sie bekommen 3,90 Euro zurück. Möchten Sie den Kassenbon?\n"
            "Anja: Ja, bitte. Vielen Dank und einen schönen Tag noch!\n"
            "Verkäufer: Danke, gleichfalls! Auf Wiedersehen!\n\n"
            "────────────────────────────────────────────────────────\n"
            "SZENE 2 · IM SUPERMARKT (SONDERANGEBOTE & KASSE)\n\n"
            "Wochenangebote bei „FrischMarkt Berlin“ (Montag bis Samstag, 07:00–21:00 Uhr):\n"
            "• Rote Äpfel (1 kg): 2,49 € (statt 3,20 €)\n"
            "• Bio-Vollmilch (1 Liter): 1,15 €\n"
            "• Gouda-Käse in Scheiben (250 g): 2,90 €\n"
            "• Mineralwasser (1,5 Liter): 0,69 € + 0,25 € Pfand\n\n"
            "Anja fragt einen Mitarbeiter: „Entschuldigung, wo finde ich bitte die frische Milch?“\n"
            "Mitarbeiter: „Gehen Sie geradeaus bis zum Kühlregal ganz hinten links.“\n"
            "An der Kasse fragt die Kassiererin: „Brauchen Sie eine Tüte?“ — Anja antwortet: „Nein, danke, ich habe meine eigene Tasche dabei.“\n\n"
            "────────────────────────────────────────────────────────\n"
            "WICHTIGER WORTSCHATZ & HÖFLICHKEITSFORMEN (KEY VOCABULARY)\n\n"
            "1. die Bäckerei (Pl. -en) — bakery (बेकर / ब्रेड की दुकान)\n"
            "2. das Vollkornbrötchen (Pl. -) — wholegrain bread roll (साबुत अनाज का ब्रेड रोल)\n"
            "3. die Brezel (Pl. -n) — pretzel (ब्रेट्ज़ेल)\n"
            "4. das Wechselgeld (Sg.) — change money (बचे हुए छुट्टे पैसे)\n"
            "5. der Kassenbon / die Quittung — payment receipt (बिल की रसीद)\n"
            "6. das Sonderangebot (Pl. -e) — special discount offer (विशेष छूट ऑफर)\n"
            "7. das Pfand (Sg.) — bottle deposit, 0,25 € for plastic bottles (बोतल रिफंडेबल डिपॉज़िट)\n"
            "8. bar bezahlen / mit Karte zahlen — to pay in cash / by card (नकद / कार्ड से भुगतान)\n"
            "9. Ich hätte gern ... / Ich möchte bitte ... — I would like ... (Polite A1 ordering)\n"
            "10. Was darf es sein? / Darf es sonst noch etwas sein? — What may I get you? Anything else?\n"
            "11. Das macht zusammen ... Euro. — That comes to ... euros in total.\n"
            "12. Stimmt so! — Keep the change! (बाकी पैसे आप रख लीजिए!)\n"
            "13. Entschuldigung, wo finde ich ...? — Excuse me, where can I find ...?\n"
            "14. Einen schönen Tag noch! — Danke, gleichfalls! — Have a nice day! — Thanks, you too!"
        ),
        "questions": [
            {
                "id": "q1",
                "page": 1,
                "label": "Aufgabe 1 · Dialogverständnis & Preise",
                "prompt": "Wie viel muss Anja in der Bäckerei „Korn & Kruste“ insgesamt bezahlen?",
                "type": "mcq",
                "options": [
                    {"id": "a", "text": "5,35 Euro"},
                    {"id": "b", "text": "6,10 Euro"},
                    {"id": "c", "text": "3,90 Euro"},
                    {"id": "d", "text": "10,00 Euro"},
                ],
                "answer": "b",
                "explanation": (
                    "Rechnung im Dialog: 1,50 € (2 Vollkornbrötchen) + 1,20 € (1 Brezel) + 3,40 € (1 Bauernbrot) = 6,10 €. "
                    "| English: The total is 6.10 euros; 3.90 euros is the change she receives back from 10 euros. "
                    "| Hinglish: Kul bill 6,10 Euro banta hai (1,50 + 1,20 + 3,40). 3,90 Euro wapas milne wala Wechselgeld hai."
                ),
            },
            {
                "id": "q2",
                "page": 1,
                "label": "Aufgabe 2 · Höflichkeitsform beim Bestellen",
                "prompt": "Welche Formulierung ist in einer deutschen Bäckerei höflich und grammatikalisch korrekt?",
                "type": "mcq",
                "options": [
                    {"id": "a", "text": "Gib mir sofort zwei Brötchen!"},
                    {"id": "b", "text": "Ich hätte gern zwei Vollkornbrötchen und eine Brezel, bitte."},
                    {"id": "c", "text": "Ich habe zwei Brötchen wollen."},
                    {"id": "d", "text": "Du gibst mir eine Brezel."},
                ],
                "answer": "b",
                "explanation": (
                    "„Ich hätte gern …“ (Konjunktiv II) oder „Ich möchte bitte …“ sind die wichtigsten A1-Höflichkeitsformen beim Einkaufen. "
                    "| English: 'Ich hätte gern ...' is the standard polite way to order in German shops. "
                    "| Hinglish: Germany mein bakery ya café mein hamesha 'Ich hätte gern ...' ya 'Ich möchte bitte ...' bolna chahiye."
                ),
            },
            {
                "id": "q3",
                "page": 2,
                "label": "Aufgabe 3 · Lückentext Höflichkeitsform",
                "prompt": "Ergänzen Sie das fehlende Wort in Anjas Bestellung: „Ich _____ gern zwei Vollkornbrötchen, bitte.“ (Konjunktiv II von haben)",
                "type": "text",
                "answer": ["hätte", "haette"],
                "explanation": (
                    "Die höfliche Bestellform lautet „Ich hätte gern …“ (1. Person Singular Konjunktiv II von ‚haben‘). "
                    "| English: 'Ich hätte gern' literally means 'I would like to have'. "
                    "| Hinglish: Polite request ke liye 'haben' ka Konjunktiv II form 'hätte' use hota hai."
                ),
            },
            {
                "id": "q4",
                "page": 2,
                "label": "Aufgabe 4 · Supermarkt-Angebote & Pfand",
                "prompt": "Wie viel bezahlt man im „FrischMarkt Berlin“ an der Kasse für eine Flasche Mineralwasser inklusive Pfand?",
                "type": "mcq",
                "options": [
                    {"id": "a", "text": "0,69 Euro"},
                    {"id": "b", "text": "0,94 Euro"},
                    {"id": "c", "text": "1,15 Euro"},
                    {"id": "d", "text": "0,25 Euro"},
                ],
                "answer": "b",
                "explanation": (
                    "Mineralwasser kostet 0,69 € plus 0,25 € Pfand = 0,94 €. Das Pfand bekommt man bei der Rückgabe der leeren Flasche am Pfandautomaten zurück. "
                    "| English: 0.69 € + 0.25 € bottle deposit (Pfand) = 0.94 € at checkout. "
                    "| Hinglish: Germany mein plastic bottle par 0,25 € Pfand lagta hai (0,69 + 0,25 = 0,94 €), jo empty bottle return karne par wapas milta hai."
                ),
            },
            {
                "id": "q5",
                "page": 3,
                "label": "Aufgabe 5 · Lückentext an der Kasse",
                "prompt": "Ergänzen Sie das passende Wort im Satz des Verkäufers: „Zahlen Sie bar oder mit _____?“",
                "type": "text",
                "answer": ["Karte", "der Karte", "EC-Karte", "Kreditkarte"],
                "explanation": (
                    "Die Standardfrage an deutschen Kassen lautet: „Zahlen Sie bar oder mit Karte?“ "
                    "| English: 'bar oder mit Karte' means 'in cash or by card'. "
                    "| Hinglish: Cashier puchhte hain: 'bar' (cash) ya 'mit Karte' (debit/credit card)."
                ),
            },
            {
                "id": "q6",
                "page": 3,
                "label": "Aufgabe 6 · Alltagspragmatik & Zahlen",
                "prompt": "Ein Kunde muss 4,80 € bezahlen, gibt einen 5-Euro-Schein und sagt: „Stimmt so!“ Was bedeutet das?",
                "type": "mcq",
                "options": [
                    {"id": "a", "text": "Der Preis auf dem Kassenbon ist falsch."},
                    {"id": "b", "text": "Der Kunde möchte das Wechselgeld (0,20 €) als Trinkgeld geben."},
                    {"id": "c", "text": "Der Kunde möchte lieber mit Karte bezahlen."},
                    {"id": "d", "text": "Der Kunde braucht eine Plastiktüte."},
                ],
                "answer": "b",
                "explanation": (
                    "„Stimmt so!“ bedeutet, dass der Verkäufer oder Kellner das Restgeld als Trinkgeld behalten darf. "
                    "| English: 'Stimmt so!' means 'Keep the change!' in cafés, bakeries, and restaurants. "
                    "| Hinglish: Jab aap chhote change wapas nahi lena chahte aur tip dena chahte hain, tab 'Stimmt so!' bolte hain."
                ),
            },
        ],
    },
    # ─────────────────────────────────────────────────────────────────────────
    # 2. A2 — Grammatik & Alltag (Perfekt vs. Präteritum)
    # ─────────────────────────────────────────────────────────────────────────
    {
        "id": "a2-lab-11-perfekt-praeteritum-alltag",
        "level": "a2",
        "divisionId": "sprachakademie",
        "index": 11,
        "indexLabel": "LAB 11 · GRAMMATIK & ALLTAG",
        "title": "A2 Grammatik — Perfekt vs. Präteritum im Alltag (Tagesablauf & Wochenende)",
        "subtitle": "Kompakte Regelübersicht (haben/sein + trennbare Verben + Präteritum im Alltag) und 6 praxisnahe Übungen mit sofortiger Erklärung.",
        "badge": "DAILY LAB #1 · 6 EXERCISES",
        "topics": [
            "Perfekt (haben / sein)",
            "Präteritum im Alltag",
            "Trennbare Verben",
            "Tagesablauf & Wochenende",
        ],
        "pages": 4,
        "coverColor": "#134074",
        "productSlug": "a2-lab-11-perfekt-praeteritum-alltag",
        "isFree": True,
        "priceEur": 0.0,
        "priceInr": 0,
        "audioUrl": "",
        "skill": "lesen",
        "contentType": "exam_lesen",
        "module": "03-hoeren-lesen",
        "readingPassage": (
            "KOMPAKTE REGELÜBERSICHT · PERFEKT VS. PRÄTERITUM IM ALLTAG (A2)\n\n"
            "1. PERFEKT — Standard für die gesprochene Sprache & den Alltag\n"
            "   Struktur: [haben / sein auf Position 2] + ... + [Partizip II am Satzende]\n"
            "   • Perfekt mit SEIN:\n"
            "     - Ortsveränderung (Bewegung von A nach B): gehen → ist gegangen, fahren → ist gefahren, fliegen → ist geflogen, ankommen → ist angekommen\n"
            "     - Zustandsveränderung: aufstehen → ist aufgestanden, einschlafen → ist eingeschlafen, aufwachen → ist aufgewacht\n"
            "     - Sonderverben: sein (ist gewesen), bleiben (ist geblieben), werden (ist geworden), passieren (ist passiert)\n"
            "   • Perfekt mit HABEN:\n"
            "     - Alle anderen Verben (besonders Verben mit Akkusativobjekt: kaufen, kochen, essen, treffen, lesen) sowie alle reflexiven Verben (sich freuen).\n\n"
            "2. TRENNBARE & UNTRENNBARE VERBEN IM PARTIZIP II\n"
            "   • Trennbare Verben (auf-, ein-, an-, ab-, mit-, zurück-, fern-):\n"
            "     „-ge-“ steht ZWISCHEN Präfix und Verbstamm!\n"
            "     Beispiele: aufstehen → auf-ge-standen | einkaufen → ein-ge-kauft | anrufen → an-ge-rufen | fernsehen → fern-ge-sehen\n"
            "   • Untrennbare Verben (be-, ver-, er-, ent-, ge-, emp-, zer-) & Verben auf „-ieren“:\n"
            "     KEIN „ge-“!\n"
            "     Beispiele: besuchen → besucht | verstehen → verstanden | telefonieren → telefoniert\n\n"
            "3. PRÄTERITUM IM ALLTAG — Wann benutzt man Präteritum statt Perfekt?\n"
            "   Im Alltag und in Gesprächen nutzt man Präteritum vor allem bei:\n"
            "   • sein → ich war / wir waren\n"
            "   • haben → ich hatte / wir hatten\n"
            "   • es gibt → es gab\n"
            "   • Modalverben → konnte, musste, wollte, durfte, sollte\n\n"
            "────────────────────────────────────────────────────────\n"
            "BEISPIELTEXT · MEIN WOCHENENDE IN BERLIN\n\n"
            "„Am Samstag war das Wetter fantastisch und ich hatte endlich frei. Ich bin schon um 8 Uhr aufgestanden und habe zuerst in Ruhe gefrühstückt. "
            "Danach bin ich mit der S-Bahn nach Potsdam gefahren und habe meine Schwester besucht. Am Nachmittag haben wir im Supermarkt eingekauft und zusammen gekocht. "
            "Abends wollte ich eigentlich früh schlafen gehen, aber wir sind bis 23 Uhr im Café geblieben, weil es so gemütlich war.“"
        ),
        "questions": [
            {
                "id": "q1",
                "page": 1,
                "label": "Übung 1 · Hilfsverb haben oder sein?",
                "prompt": "Wählen Sie die korrekte Perfekt-Form: „Am Samstag _____ ich mit der S-Bahn nach Potsdam gefahren.“",
                "type": "mcq",
                "options": [
                    {"id": "a", "text": "habe"},
                    {"id": "b", "text": "bin"},
                    {"id": "c", "text": "war"},
                    {"id": "d", "text": "hatte"},
                ],
                "answer": "b",
                "explanation": (
                    "„fahren“ beschreibt eine Ortsveränderung (von A nach B) → Perfekt immer mit ‚sein‘: ich bin gefahren. "
                    "| English: Movement from A to B takes 'sein' in Perfekt (ich bin gefahren). "
                    "| Hinglish: A se B jaane wali movement (fahren, gehen) mein Perfekt hamesha 'sein' (bin) ke saath banta hai."
                ),
            },
            {
                "id": "q2",
                "page": 1,
                "label": "Übung 2 · Trennbares Verb im Perfekt",
                "prompt": "Bilden Sie das Partizip II von „aufstehen“: „Am Sonntag bin ich erst um 9 Uhr _____.“",
                "type": "text",
                "answer": ["aufgestanden"],
                "explanation": (
                    "„aufstehen“ ist ein trennbares starkes Verb: Präfix ‚auf‘ + ‚ge‘ + ‚standen‘ = aufgestanden (mit ‚sein‘, da Zustandsveränderung). "
                    "| English: Separable verbs insert '-ge-' between prefix and stem: auf + ge + standen. "
                    "| Hinglish: Trennbare Verben mein '-ge-' beech mein aata hai: auf + ge + standen = aufgestanden."
                ),
            },
            {
                "id": "q3",
                "page": 2,
                "label": "Übung 3 · Präteritum im Alltag (haben + Modalverb)",
                "prompt": "Welche Kombination klingt im gesprochenen Alltagsdeutsch am natürlichsten? „Gestern _____ ich leider keine Zeit, weil ich lange arbeiten _____.“",
                "type": "mcq",
                "options": [
                    {"id": "a", "text": "hatte ... musste"},
                    {"id": "b", "text": "habe gehabt ... habe gemusst"},
                    {"id": "c", "text": "war ... konnte"},
                    {"id": "d", "text": "bin ... wollte"},
                ],
                "answer": "a",
                "explanation": (
                    "Für ‚haben‘, ‚sein‘ und Modalverben (müssen, können, wollen) verwendet man im Alltag fast immer das Präteritum: ‚hatte‘ und ‚musste‘. "
                    "| English: In everyday German, 'haben', 'sein', and modal verbs strongly prefer Präteritum ('hatte', 'musste'). "
                    "| Hinglish: Rozmarra ki German mein 'sein', 'haben' aur Modalverben (musste, konnte) ka Präteritum use karna sabse natural hota hai."
                ),
            },
            {
                "id": "q4",
                "page": 2,
                "label": "Übung 4 · Trennbares Verb mit ‚haben‘",
                "prompt": "Bilden Sie das Partizip II von „einkaufen“: „Nachmittags haben wir im Supermarkt Obst und Gemüse _____.“",
                "type": "text",
                "answer": ["eingekauft"],
                "explanation": (
                    "„einkaufen“ ist trennbar und regelmäßig: ein + ge + kauft = eingekauft. Wegen des Akkusativobjekts (Obst und Gemüse) steht ‚haben‘. "
                    "| English: Regular separable verb: ein + ge + kauft = eingekauft (with 'haben'). "
                    "| Hinglish: 'einkaufen' separable regular verb hai, isliye Partizip II 'eingekauft' hota hai."
                ),
            },
            {
                "id": "q5",
                "page": 3,
                "label": "Übung 5 · Untrennbares Präfix (kein ‚ge-‘!)",
                "prompt": "Welcher Satz ist grammatikalisch richtig?",
                "type": "mcq",
                "options": [
                    {"id": "a", "text": "Am Abend habe ich meine Freundin in Kreuzberg gebesucht."},
                    {"id": "b", "text": "Am Abend habe ich meine Freundin in Kreuzberg besucht."},
                    {"id": "c", "text": "Am Abend bin ich meine Freundin in Kreuzberg besucht."},
                    {"id": "d", "text": "Am Abend habe ich meine Freundin in Kreuzberg begesucht."},
                ],
                "answer": "b",
                "explanation": (
                    "Verben mit dem untrennbaren Präfix ‚be-‘ (besuchen, bestellen, bezahlen) erhalten im Partizip II KEIN ‚ge-‘: besucht. "
                    "| English: Inseparable prefixes (be-, ver-, er-, ent-) never take 'ge-' in Partizip II → besucht. "
                    "| Hinglish: 'be-' untrennbares Präfix hai, isliye kabhi 'ge-' nahi lagta: 'besucht' (NOT gebesucht!)."
                ),
            },
            {
                "id": "q6",
                "page": 3,
                "label": "Übung 6 · Ausnahmeverb ‚bleiben‘",
                "prompt": "Ergänzen Sie die richtige Perfekt-Form von „bleiben“: „Am Samstagabend _____ wir sehr lange im Café _____.“",
                "type": "mcq",
                "options": [
                    {"id": "a", "text": "haben ... geblieben"},
                    {"id": "b", "text": "sind ... geblieben"},
                    {"id": "c", "text": "haben ... gebleibt"},
                    {"id": "d", "text": "sind ... gebliebt"},
                ],
                "answer": "b",
                "explanation": (
                    "Obwohl ‚bleiben‘ keine Bewegung ausdrückt, gehört es zu den festen ‚sein‘-Verben (sein, bleiben, werden, passieren): wir sind geblieben. "
                    "| English: 'bleiben' is a classic exam exception — it ALWAYS takes 'sein' + strong participle 'geblieben'. "
                    "| Hinglish: Exam trap! 'bleiben' mein movement nahi hai phir bhi hamesha 'sein' lagta hai: 'wir sind geblieben'."
                ),
            },
        ],
    },
    # ─────────────────────────────────────────────────────────────────────────
    # 3. B1 — Goethe/telc Prüfungstraining (Lesen & Sprachbausteine)
    # ─────────────────────────────────────────────────────────────────────────
    {
        "id": "b1-lab-11-wohnungssuche-mietvertrag",
        "level": "b1",
        "divisionId": "sprachakademie",
        "index": 11,
        "indexLabel": "LAB 11 · GOETHE/TELC B1",
        "title": "B1 Lesen & Sprachbausteine — Wohnungssuche und Mietvertrag in Deutschland",
        "subtitle": "Realistischer B1-Text & Vermieter-E-Mail mit 6 Goethe/telc-Prüfungsfragen (Richtig/Falsch & Sprachbausteine) inkl. klarer Erklärungen.",
        "badge": "DAILY LAB #1 · GOETHE/TELC",
        "topics": [
            "Wohnungssuche Berlin",
            "Mietvertrag & Kaution",
            "Lesen Richtig/Falsch",
            "Sprachbausteine B1",
        ],
        "pages": 4,
        "coverColor": "#0D1017",
        "productSlug": "b1-lab-11-wohnungssuche-mietvertrag",
        "isFree": True,
        "priceEur": 0.0,
        "priceInr": 0,
        "audioUrl": "",
        "skill": "lesen",
        "contentType": "exam_lesen",
        "module": "03-hoeren-lesen",
        "readingPassage": (
            "TEIL 1 · LESEN (GOETHE / TELC B1 — RICHTIG ODER FALSCH?)\n\n"
            "Von: vermietung@spreeblick-hausverwaltung.de\n"
            "An: priya.patel@example.de\n"
            "Betreff: Informationen zur 2-Zimmer-Wohnung in Berlin-Tempelhof (Objekt-Nr. TH-408)\n\n"
            "Sehr geehrte Frau Patel,\n\n"
            "vielen Dank für Ihr Interesse an unserer hellen 2-Zimmer-Wohnung (58 m², 3. OG mit Balkon) in Berlin-Tempelhof. "
            "Vor dem Besichtigungstermin am kommenden Donnerstag um 17:00 Uhr möchten wir Ihnen alle wichtigen Konditionen des Mietvertrags transparent mitteilen:\n\n"
            "Die monatliche Kaltmiete beträgt 790,00 Euro. Hinzu kommt eine Nebenkosten-Vorauszahlung von 180,00 Euro für Heizung, Warmwasser, Müllabfuhr und Hausreinigung. "
            "Somit liegt die gesamte Warmmiete bei 970,00 Euro monatlich. Bitte beachten Sie, dass Strom und Internet nicht in den Nebenkosten enthalten sind und von der Mieterin selbst bei einem Anbieter angemeldet werden müssen.\n\n"
            "Die gesetzliche Mietkaution beträgt drei Nettokaltmieten (2.370,00 Euro). Gemäß deutschem Mietrecht (§ 551 BGB) müssen Sie diesen Betrag nicht auf einmal zahlen, "
            "sondern können die Kaution bequem in drei gleichen monatlichen Raten überweisen — die erste Rate ist zu Beginn des Mietverhältnisses fällig.\n\n"
            "Der Mietvertrag ist unbefristet mit der gesetzlichen Kündigungsfrist von drei Monaten. Selbstverständlich erhalten Sie nach Schlüsselübergabe umgehend die "
            "Wohnungsgeberbestätigung, damit Sie Ihren Wohnsitz innerhalb von 14 Tagen beim Berliner Bürgeramt anmelden können. Zur Besichtigung bringen Sie bitte eine aktuelle "
            "SCHUFA-Bonitätsauskunft, die letzten drei Gehaltsabrechnungen sowie Ihren Ausweis mit.\n\n"
            "Mit freundlichen Grüßen\n"
            "Hausverwaltung Spreeblick GmbH\n\n"
            "────────────────────────────────────────────────────────\n"
            "TEIL 2 · SPRACHBAUSTEINE (LÜCKENTEXT — ANTWORT-E-MAIL AN DIE HAUSVERWALTUNG)\n\n"
            "Sehr geehrte Damen und Herren,\n\n"
            "herzlichen Dank für Ihre schnelle Rückmeldung und die ausführlichen Informationen zur Wohnung in Tempelhof. "
            "Ich interessiere mich sehr für das Objekt, [Lücke 4] die Wohnung sowohl ruhig gelegen ist als auch eine hervorragende U-Bahn-Anbindung hat.\n\n"
            "[Lücke 5] meines aktuellen Wohnortwechsels liegen mir bereits alle gewünschten Unterlagen — einschließlich der SCHUFA-Auskunft und meiner Arbeitsbescheinigung — vollständig vor.\n\n"
            "Über eine kurze Bestätigung des Besichtigungstermins am Donnerstag um 17:00 Uhr [Lücke 6] ich mich sehr freuen.\n\n"
            "Mit freundlichen Grüßen\n"
            "Priya Patel"
        ),
        "questions": [
            {
                "id": "q1",
                "page": 1,
                "label": "Lesen · Aufgabe 1 (Richtig / Falsch)",
                "prompt": "Aussage: Die gesamte Mietkaution von 2.370 Euro muss laut E-Mail auf einmal vor der Schlüsselübergabe überwiesen werden.",
                "type": "mcq",
                "options": [
                    {"id": "a", "text": "Richtig"},
                    {"id": "b", "text": "Falsch"},
                ],
                "answer": "b",
                "explanation": (
                    "FALSCH. Im Text steht ausdrücklich: „Sie müssen diesen Betrag nicht auf einmal zahlen, sondern können die Kaution bequem in drei gleichen monatlichen Raten überweisen.“ "
                    "| English: False — under § 551 BGB tenants have the legal right to pay the deposit in 3 equal monthly installments. "
                    "| Hinglish: Galat (Falsch)! Email mein likha hai ki Kaution ek saath nahi, balki 3 equal monthly installments (Raten) mein pay kar sakte hain."
                ),
            },
            {
                "id": "q2",
                "page": 1,
                "label": "Lesen · Aufgabe 2 (Richtig / Falsch)",
                "prompt": "Aussage: In der monatlichen Warmmiete von 970 Euro sind sowohl die Heizkosten als auch die Stromkosten bereits enthalten.",
                "type": "mcq",
                "options": [
                    {"id": "a", "text": "Richtig"},
                    {"id": "b", "text": "Falsch"},
                ],
                "answer": "b",
                "explanation": (
                    "FALSCH. Heizung und Warmwasser sind in den Nebenkosten enthalten, aber Strom und Internet müssen separat bei einem Anbieter angemeldet werden. "
                    "| English: False — electricity (Strom) and internet are NOT included in Warmmiete and require separate contracts. "
                    "| Hinglish: Galat (Falsch)! Warmmiete mein heating include hai, lekin Strom (electricity) aur Internet alag se register karne padte hain."
                ),
            },
            {
                "id": "q3",
                "page": 2,
                "label": "Lesen · Aufgabe 3 (Richtig / Falsch)",
                "prompt": "Aussage: Nach dem Einzug stellt die Hausverwaltung eine Wohnungsgeberbestätigung für die Anmeldung beim Bürgeramt aus.",
                "type": "mcq",
                "options": [
                    {"id": "a", "text": "Richtig"},
                    {"id": "b", "text": "Falsch"},
                ],
                "answer": "a",
                "explanation": (
                    "RICHTIG. Im letzten Absatz bestätigt die Hausverwaltung, dass die Wohnungsgeberbestätigung nach der Schlüsselübergabe umgehend für die 14-tägige Bürgeramt-Anmeldung ausgestellt wird. "
                    "| English: True — the landlord confirmation (Wohnungsgeberbestätigung) is issued right after key handover for city registration. "
                    "| Hinglish: Sahi (Richtig)! Key handover ke baad landlord Wohnungsgeberbestätigung deta hai, jo Berlin Anmeldung ke liye zaroori hai."
                ),
            },
            {
                "id": "q4",
                "page": 2,
                "label": "Sprachbausteine · Lücke 4 (Konnektor)",
                "prompt": "Wählen Sie das passende Wort für [Lücke 4]: „Ich interessiere mich sehr für das Objekt, _____ die Wohnung sowohl ruhig gelegen ist als auch eine hervorragende U-Bahn-Anbindung hat.“",
                "type": "mcq",
                "options": [
                    {"id": "a", "text": "weil"},
                    {"id": "b", "text": "deshalb"},
                    {"id": "c", "text": "obwohl"},
                ],
                "answer": "a",
                "explanation": (
                    "„weil“ nennt den Grund (Kausalsatz) und stellt das konjugierte Verb (‚ist‘ / ‚hat‘) ans Satzende. ‚deshalb‘ bräuchte Verbposition 2; ‚obwohl‘ drückt einen Gegensatz aus. "
                    "| English: 'weil' introduces a causal subordinate clause (verb at the end). "
                    "| Hinglish: Reason batane ke liye 'weil' lagta hai aur iske baad conjugated verb sentence ke end mein jaata hai."
                ),
            },
            {
                "id": "q5",
                "page": 3,
                "label": "Sprachbausteine · Lücke 5 (Genitiv-Präposition)",
                "prompt": "Wählen Sie die passende Präposition für [Lücke 5]: „_____ meines aktuellen Wohnortwechsels liegen mir bereits alle gewünschten Unterlagen vollständig vor.“",
                "type": "mcq",
                "options": [
                    {"id": "a", "text": "Trotz"},
                    {"id": "b", "text": "Wegen"},
                    {"id": "c", "text": "Während"},
                ],
                "answer": "a",
                "explanation": (
                    "„Trotz“ (+ Genitiv: meines Wohnortwechsels) drückt einen unerwarteten Gegensatz (Konzession) aus: Obwohl sie gerade umzieht, hat sie trotzdem schon alle Unterlagen bereit. "
                    "| English: 'Trotz + Genitive' means 'despite' — expressing contrast. "
                    "| Hinglish: Contrast dikhane ke liye 'Trotz' (+ Genitiv) use hota hai — 'relocation ke bawajood saare documents ready hain'."
                ),
            },
            {
                "id": "q6",
                "page": 3,
                "label": "Sprachbausteine · Lücke 6 (Konjunktiv II Höflichkeit)",
                "prompt": "Wählen Sie das richtige Hilfsverb für [Lücke 6]: „Über eine kurze Bestätigung des Besichtigungstermins _____ ich mich sehr freuen.“",
                "type": "mcq",
                "options": [
                    {"id": "a", "text": "würde"},
                    {"id": "b", "text": "werde"},
                    {"id": "c", "text": "hätte"},
                ],
                "answer": "a",
                "explanation": (
                    "Die feste höfliche B1-Schlussformel lautet: „Über … würde ich mich sehr freuen.“ (Konjunktiv II: würde + Infinitiv ‚freuen‘). "
                    "| English: Standard polite B1 closing formula: 'würde + sich freuen'. "
                    "| Hinglish: Formal email close karne ke liye 'Über ... würde ich mich sehr freuen' golden B1 Redemittel hai."
                ),
            },
        ],
    },
    # ─────────────────────────────────────────────────────────────────────────
    # 4. B2 — Beruf & Fachsprache (Professionelle E-Mails & Beschwerdemanagement)
    # ─────────────────────────────────────────────────────────────────────────
    {
        "id": "b2-lab-11-beruf-emails-beschwerdemanagement",
        "level": "b2",
        "divisionId": "sprachakademie",
        "index": 11,
        "indexLabel": "LAB 11 · B2 BERUF & E-MAIL",
        "title": "B2 Beruf — Professionelle E-Mails & Beschwerdemanagement am Arbeitsplatz",
        "subtitle": "Authentisches deutsches Büroszenario (Kundenreklamation & Lieferverzug), B2-Redemittel zur Deeskalation + 6 Aufgaben mit Musterantworten.",
        "badge": "DAILY LAB #1 · B2 BERUF",
        "topics": [
            "Geschäftskorrespondenz",
            "Beschwerdemanagement",
            "Deeskalation & Kulanz",
            "B2 Redemittel & NVV",
        ],
        "pages": 4,
        "coverColor": "#0A3358",
        "productSlug": "b2-lab-11-beruf-emails-beschwerdemanagement",
        "isFree": True,
        "priceEur": 0.0,
        "priceInr": 0,
        "audioUrl": "",
        "skill": "lesen",
        "contentType": "exam_lesen",
        "module": "03-hoeren-lesen",
        "readingPassage": (
            "BERUFLICHES SZENARIO · B2 BERUF (KUNDENREKLAMATION & BESCHWERDEMANAGEMENT)\n\n"
            "Sie arbeiten in der Auftragsabwicklung der NovaLogistik Berlin AG. Heute Morgen geht folgende formelle Beschwerde-E-Mail eines wichtigen Geschäftskunden ein:\n\n"
            "Von: m.lindner@medtech-brandenburg.de\n"
            "An: kundenservice@novalogistik-berlin.de\n"
            "Betreff: Reklamation zu Bestellung Nr. NL-2026-4812 — Lieferverzug und Transportschäden\n\n"
            "Sehr geehrte Damen und Herren,\n\n"
            "mit großem Bedauern muss ich Ihnen mitteilen, dass unsere Bestellung Nr. NL-2026-4812 (30 ergonomische Klinik-Arbeitsstationen) "
            "trotz schriftlicher Terminzusage erst mit zehntägiger Verspätung bei uns eingetroffen ist.\n\n"
            "Darüber hinaus mussten wir bei der Wareneingangsprüfung feststellen, dass vier Verpackungen erhebliche Transportschäden aufwiesen und "
            "die zugehörigen Monitorkabel defekt waren. Außerdem fehlt bislang die korrigierte Gesamtrechnung mit ausgewiesener Umsatzsteuer.\n\n"
            "Da die verzögerte und unvollständige Lieferung unseren Klinik-Umbau erheblich beeinträchtigt, bitten wir Sie um eine kostenfreie "
            "Nachlieferung der vier beschädigten Einheiten sowie um eine schriftliche Stellungnahme innerhalb von fünf Werktagen. Angesichts der "
            "entstandenen Unannehmlichkeiten erwarten wir zudem einen angemessenen Preisnachlass von 10 % aus Kulanz. Sollte die Frist ohne Lösung "
            "verstreichen, sehen wir uns gezwungen, von weiteren Aufträgen abzusehen.\n\n"
            "Mit freundlichen Grüßen\n"
            "Dr. Markus Lindner · Einkaufsleitung · MedTech Brandenburg GmbH\n\n"
            "────────────────────────────────────────────────────────\n"
            "B2-REDEMITTEL-KASTEN · 4-SCHRITTE-FORMEL FÜR PROFESSIONELLES BESCHWERDEMANAGEMENT\n\n"
            "1. Eingang bestätigen & Empathie zeigen:\n"
            "   „Vielen Dank für Ihren offenen Hinweis. Wir bedauern die entstandenen Unannehmlichkeiten außerordentlich und bitten um Ihr Verständnis.“\n"
            "2. Sachlich aufklären (ohne Schuldzuweisung):\n"
            "   „Nach interner Rücksprache mit unserer Logistikabteilung stellte sich heraus, dass es aufgrund eines Systemengpasses zu Verzögerungen kam.“\n"
            "3. Konkrete Lösung & Kulanz zusichern:\n"
            "   „Um den Mangel unverzüglich zu beheben, veranlassen wir umgehend eine kostenfreie Express-Ersatzlieferung sowie eine Gutschrift in Höhe von 10 %.“\n"
            "4. Vertrauen wiederherstellen & verbindlich abschließen:\n"
            "   „Wir versichern Ihnen, dass wir entsprechende Maßnahmen zur Qualitätssicherung eingeleitet haben, und stehen Ihnen für Rückfragen jederzeit gern zur Verfügung.“"
        ),
        "questions": [
            {
                "id": "q1",
                "page": 1,
                "label": "Aufgabe 1 · Szenario- & Detailverständnis",
                "prompt": "Welche drei konkreten Mängel reklamiert Dr. Lindner in seiner E-Mail?",
                "type": "mcq",
                "options": [
                    {
                        "id": "a",
                        "text": "10 Tage Lieferverzug, 4 beschädigte Verpackungen mit defekten Monitorkabeln und eine fehlende korrigierte Rechnung.",
                    },
                    {
                        "id": "b",
                        "text": "Falsche Farbe der Stühle, zu hoher Stromverbrauch und unfreundliche Fahrer.",
                    },
                    {
                        "id": "c",
                        "text": "Fehlende Lieferung aller 30 Arbeitsstationen und doppelte Abbuchung.",
                    },
                    {
                        "id": "d",
                        "text": "Fristverkürzung auf 2 Tage und fehlende Betriebsanleitung auf Englisch.",
                    },
                ],
                "answer": "a",
                "explanation": (
                    "Musterantwort: Dr. Lindner beanstandet (1) die zehntägige Verspätung, (2) vier transportbeschädigte Verpackungen inkl. defekter Monitorkabel und (3) die fehlende korrigierte Gesamtrechnung. "
                    "| English: The complaint cites a 10-day delay, 4 damaged packages with defective monitor cables, and the missing corrected invoice. "
                    "| Hinglish: Teen main issues hain: 10 din ka delay, 4 damaged boxes + faulty monitor cables, aur missing corrected invoice."
                ),
            },
            {
                "id": "q2",
                "page": 1,
                "label": "Aufgabe 2 · B2-Deeskalation & Eröffnung",
                "prompt": "Welche Eröffnungsformulierung entspricht professionellem B2-Beschwerdemanagement in Deutschland?",
                "type": "mcq",
                "options": [
                    {
                        "id": "a",
                        "text": "Ihre E-Mail ist ziemlich streng, aber die Spedition ist allein schuld an dem Schaden.",
                    },
                    {
                        "id": "b",
                        "text": "Vielen Dank für Ihre Rückmeldung. Wir bedauern die entstandenen Unannehmlichkeiten sehr und nehmen Ihr Anliegen äußerst ernst.",
                    },
                    {
                        "id": "c",
                        "text": "Sorry für die späte Lieferung, so etwas passiert im Lager halt manchmal.",
                    },
                    {
                        "id": "d",
                        "text": "Wir können nichts dafür, weil Sie die Ware sofort hätten abholen können.",
                    },
                ],
                "answer": "b",
                "explanation": (
                    "Musterantwort: Professionelle Deeskalation vermeidet Schuldzuweisungen („die Spedition ist schuld“) und Umgangssprache („Sorry“, „halt“). Stattdessen drückt sie sachlich Bedauern und Wertschätzung aus. "
                    "| English: Professional German B2 correspondence acknowledges the issue empathetically without shifting blame. "
                    "| Hinglish: B2 business German mein kabhi blame-shifting ya casual 'Sorry' nahi likhte; hamesha formal empathy dikhate hain."
                ),
            },
            {
                "id": "q3",
                "page": 2,
                "label": "Aufgabe 3 · Feste Geschäftskollokation",
                "prompt": "Ergänzen Sie die korrekte B2-Kollokation: „Wir bitten Sie vielmals um Ihr _____ für die entstandene Verzögerung.“",
                "type": "mcq",
                "options": [
                    {"id": "a", "text": "Verständnis"},
                    {"id": "b", "text": "Erlaubnis"},
                    {"id": "c", "text": "Verbot"},
                    {"id": "d", "text": "Verspätung"},
                ],
                "answer": "a",
                "explanation": (
                    "Musterantwort: Die feste Wendung im Geschäftsdeutsch lautet „jemanden um Verständnis bitten“ (Akkusativ). "
                    "| English: 'um Verständnis bitten' (to ask for understanding) is a mandatory B2 business collocation. "
                    "| Hinglish: Fixed business collocation: 'um Verständnis bitten' — 'hum aapse samajh/patience ki request karte hain'."
                ),
            },
            {
                "id": "q4",
                "page": 2,
                "label": "Aufgabe 4 · Nomen-Verb-Verbindung (Lückentext)",
                "prompt": "Ergänzen Sie das fehlende Nomen (B2-Nomen-Verb-Verbindung für ‚informieren‘): „Hiermit möchten wir Sie darüber in _____ setzen, dass die Ersatzlieferung bereits veranlasst wurde.“",
                "type": "text",
                "answer": ["Kenntnis"],
                "explanation": (
                    "Musterantwort: „jemanden über etwas in Kenntnis setzen“ ist die gehobene B2/C1-Nomen-Verb-Verbindung für ‚informieren‘. "
                    "| English: 'in Kenntnis setzen' = to formally inform / notify someone. "
                    "| Hinglish: B2/C1 formal phrase 'in Kenntnis setzen' ka matlab 'officially inform karna' hota hai (noun hamesha Capital K se!)."
                ),
            },
            {
                "id": "q5",
                "page": 3,
                "label": "Aufgabe 5 · Lösungsvorschlag & Kulanz formulieren",
                "prompt": "Wie formulieren Sie die Zusage zur Ersatzlieferung und zum 10-%-Kulanzrabatt am präzisesten auf B2-Niveau?",
                "type": "mcq",
                "options": [
                    {
                        "id": "a",
                        "text": "Wir schicken die vier Sachen bald nochmal und machen die Rechnung ein bisschen billiger.",
                    },
                    {
                        "id": "b",
                        "text": "Selbstverständlich veranlassen wir umgehend eine kostenfreie Express-Nachlieferung der vier beschädigten Einheiten und gewähren Ihnen aus Kulanz eine Gutschrift in Höhe von 10 %.",
                    },
                    {
                        "id": "c",
                        "text": "Vielleicht bekommen Sie 10 % Rabatt, wenn unser Chef nächste Woche gute Laune hat.",
                    },
                    {
                        "id": "d",
                        "text": "Die Kabel sind eigentlich nicht teuer, deshalb lohnt sich eine Reklamation kaum.",
                    },
                ],
                "answer": "b",
                "explanation": (
                    "Musterantwort: Präzise Fachbegriffe („Express-Nachlieferung“, „aus Kulanz“, „eine Gutschrift in Höhe von 10 % gewähren“) schaffen Verbindlichkeit und sichern die Kundenbindung. "
                    "| English: Specific B2 commercial terms ('kostenfreie Express-Nachlieferung', 'aus Kulanz', 'Gutschrift gewähren') convey professionalism. "
                    "| Hinglish: Vague words ('Sachen', 'billiger') avoid karein; concrete B2 terms ('Gutschrift', 'aus Kulanz', 'unverzüglich') use karein."
                ),
            },
            {
                "id": "q6",
                "page": 3,
                "label": "Aufgabe 6 · Abschluss & Qualitätssicherung (Musterantwort)",
                "prompt": "Welcher Schlussabsatz rundet eine professionelle B2-Antwort auf eine Kundenbeschwerde optimal ab?",
                "type": "mcq",
                "options": [
                    {
                        "id": "a",
                        "text": "Wir hoffen, Sie beschweren sich nächstes Mal nicht mehr. Liebe Grüße!",
                    },
                    {
                        "id": "b",
                        "text": "Die korrigierte Rechnung senden wir Ihnen noch heute im Anhang zu. Wir versichern Ihnen, entsprechende Qualitätssicherungsmaßnahmen einzuleiten, und stehen Ihnen für Rückfragen jederzeit gern zur Verfügung. Mit freundlichen Grüßen",
                    },
                    {
                        "id": "c",
                        "text": "Das war alles von meiner Seite. Tschüss und bis bald!",
                    },
                    {
                        "id": "d",
                        "text": "Bei weiteren Problemen wenden Sie sich bitte nicht an uns, sondern an das Lager.",
                    },
                ],
                "answer": "b",
                "explanation": (
                    "Musterantwort (Kompletter B2-Schluss): Deckt den dritten offenen Punkt (korrigierte Rechnung) ab, sichert vorbeugende Qualitätssicherung zu, bleibt ansprechbar und schließt nach DIN 5008 mit ‚Mit freundlichen Grüßen‘ (ohne Komma!). "
                    "| English: Covers the corrected invoice, promises preventive QA measures, offers continued support, and uses the formal DIN 5008 sign-off. "
                    "| Hinglish: Perfect B2 email ending: pending invoice confirm karein, future quality guarantee dein aur 'Mit freundlichen Grüßen' (bina comma) se close karein."
                ),
            },
        ],
    },
    # ─────────────────────────────────────────────────────────────────────────
    # 5. Studienkolleg — M-/T-Kurs Aufnahmeprüfung (C-Test & Fachmathematik)
    # ─────────────────────────────────────────────────────────────────────────
    {
        "id": "stk-math-ctest-kompakt-01",
        "level": "b2",
        "divisionId": "studienkolleg",
        "track": "t_kurs",
        "index": 1,
        "indexLabel": "KOMPAKT-SET 01 · M-/T-KURS",
        "title": "Studienkolleg C-Test & Fachmathematik — Kompakt-Training Set #1",
        "subtitle": "1 authentischer akademischer C-Test (Lückentext) + 5 TU-Berlin-Aufnahmeprüfungsaufgaben (Mathematik & Logik ohne Taschenrechner) mit Schritt-für-Schritt-Lösungen.",
        "badge": "DAILY LAB #1 · M-/T-KURS",
        "topics": [
            "Studienkolleg C-Test",
            "TU Berlin Aufnahmeprüfung",
            "Fachmathematik M-/T-Kurs",
            "Gleichungen, Logarithmen & Logik",
        ],
        "pages": 4,
        "coverColor": "#B45309",
        "productSlug": "stk-math-ctest-kompakt-01",
        "isFree": True,
        "priceEur": 0.0,
        "priceInr": 0,
        "audioUrl": "",
        "skill": "lesen",
        "contentType": "exam_lesen",
        "module": "03-hoeren-lesen",
        "readingPassage": (
            "TEIL A · AUTHENTISCHER AKADEMISCHER C-TEST (STUDIENKOLLEG M- & T-KURS)\n\n"
            "Aufgabenstellung: Ergänzen Sie die fehlenden Worthälften im akademischen Fachtext nach dem offiziellen TU-Berlin-Standard (jedes zweite Wort ab Satz 2 ist halbiert). "
            "Prüfen Sie anschließend Ihre Schlüssel-Lücken (1)–(6) in Aufgabe 1 rechts.\n\n"
            "Text: „Wasserstoff als Schlüsseltechnologie der Energiewende“\n\n"
            "Die globale Energiewende stellt Wissenschaft und Industrie vor immense technologische Herausforderungen. "
            "Da erneu______(1) Energien w__ Wind- u__ Sonnenkraft st___ wetterabhängig si__, werden effiz_____ Speichersysteme drin____(2) benötigt. "
            "Grü___ Wasserstoff, d__(3) mittels Elekt______ aus Was___ gewonnen wi__, bietet hie____(4) eine vielvers_________ Lösung. "
            "Insbes______ in d__ Stahlindustrie so___(5) im Schwerla_________ lässt si__ der CO₂-Ausstoß dad____ nachhaltig reduz_____(6). "
            "Allerdings müssen die Herstellungskosten durch weitere Forschung noch deutlich gesenkt werden.\n\n"
            "────────────────────────────────────────────────────────\n"
            "TEIL B · TU BERLIN FACHMATHEMATIK & LOGIK — WARM-UP (OHNE TASCHENRECHNER)\n\n"
            "Bearbeitungshinweis: In der Aufnahmeprüfung für den M- und T-Kurs (z. B. TU Berlin, KIT, LMU München) sind KEINE Taschenrechner und KEINE Formelsammlungen zugelassen. "
            "Lösen Sie die 5 prüfungsnahen Mathematik- und Logikaufgaben im Antwortblatt rechts:\n"
            "• Aufgabe 2: Quadratische Gleichung (p-q-Formel / Satz von Vieta)\n"
            "• Aufgabe 3: Logarithmengesetze ohne Taschenrechner\n"
            "• Aufgabe 4: Lineare Funktion & y-Achsenabschnitt aus zwei Punkten\n"
            "• Aufgabe 5: Exponentielles Wachstum / Verdopplungszeit (M-/T-Kurs Klassiker)\n"
            "• Aufgabe 6: Geometrie & lineares Gleichungssystem (Umfang und Flächeninhalt)"
        ),
        "questions": [
            {
                "id": "q1",
                "page": 1,
                "label": "Teil A · C-Test Schlüssel-Lücken (1)–(6)",
                "prompt": "Welche Wortreihe ergänzt die nummerierten C-Test-Lücken (1) erneu______, (2) drin____, (3) d__, (4) hie____, (5) so___ und (6) reduz_____ grammatikalisch und inhaltlich exakt?",
                "type": "mcq",
                "options": [
                    {
                        "id": "a",
                        "text": "(1) erneuerbare · (2) dringend · (3) der · (4) hierfür · (5) sowie · (6) reduzieren",
                    },
                    {
                        "id": "b",
                        "text": "(1) erneuerten · (2) drinnen · (3) das · (4) hierhin · (5) sogar · (6) reduziert",
                    },
                    {
                        "id": "c",
                        "text": "(1) erneuerbarer · (2) dringlich · (3) den · (4) hierauf · (5) sobald · (6) reduziere",
                    },
                    {
                        "id": "d",
                        "text": "(1) erneute · (2) dringend · (3) dem · (4) hiervon · (5) sonst · (6) reduzieren",
                    },
                ],
                "answer": "a",
                "explanation": (
                    "VOLLSTÄNDIGE C-TEST MUSTERLÖSUNG: „Da erneuerbare(1) Energien wie Wind- und Sonnenkraft stark wetterabhängig sind, werden effiziente Speichersysteme dringend(2) benötigt. "
                    "Grüner Wasserstoff, der(3) mittels Elektrolyse aus Wasser gewonnen wird, bietet hierfür(4) eine vielversprechende Lösung. "
                    "Insbesondere in der Stahlindustrie sowie(5) im Schwerlastverkehr lässt sich der CO₂-Ausstoß dadurch nachhaltig reduzieren(6).“ "
                    "| Grammatik-Check: ‚der Wasserstoff‘ (Mask. Nom. → ‚der‘), ‚lässt sich + Infinitiv‘ (Passiversatz → ‚reduzieren‘). "
                    "| Hinglish: Har word ki second half delete hoti hai; context + grammar (e.g., maskulin 'der Wasserstoff' aur 'lässt sich + Infinitiv') se exact form nikalti hai."
                ),
            },
            {
                "id": "q2",
                "page": 1,
                "label": "Teil B · Mathematik 1 (Quadratische Gleichung)",
                "prompt": "Lösen Sie ohne Taschenrechner: x² − 5x − 14 = 0. Wie lautet die Lösungsmenge L?",
                "type": "mcq",
                "options": [
                    {"id": "a", "text": "L = {−7; 2}"},
                    {"id": "b", "text": "L = {−2; 7}"},
                    {"id": "c", "text": "L = {2; 7}"},
                    {"id": "d", "text": "L = {−2; −7}"},
                ],
                "answer": "b",
                "explanation": (
                    "Schritt-für-Schritt-Lösung (Satz von Vieta & p-q-Formel):\n"
                    "1) p = −5, q = −14.\n"
                    "2) p-q-Formel: x₁,₂ = −(−5)/2 ± √((−5/2)² − (−14)) = 2,5 ± √(6,25 + 14) = 2,5 ± √20,25 = 2,5 ± 4,5.\n"
                    "3) x₁ = 2,5 − 4,5 = −2 | x₂ = 2,5 + 4,5 = 7.\n"
                    "Probe (Vieta): (−2)·7 = −14 und (−2) + 7 = +5 (= −p). Also (x − 7)(x + 2) = 0 → L = {−2; 7}."
                ),
            },
            {
                "id": "q3",
                "page": 2,
                "label": "Teil B · Mathematik 2 (Logarithmengesetze)",
                "prompt": "Berechnen Sie den exakten Zahlenwert ohne Taschenrechner: log₂(32) + log₃(27) − log₁₀(100) = ?",
                "type": "text",
                "answer": ["6"],
                "explanation": (
                    "Schritt-für-Schritt-Lösung:\n"
                    "1) log₂(32) = 5, da 2⁵ = 32.\n"
                    "2) log₃(27) = 3, da 3³ = 27.\n"
                    "3) log₁₀(100) = 2, da 10² = 100.\n"
                    "4) Gesamtergebnis: 5 + 3 − 2 = 6. "
                    "| Tip: Im TU-Berlin-Test immer Basis-Potenzen (2ⁿ, 3ⁿ, 10ⁿ) im Kopf erkennen!"
                ),
            },
            {
                "id": "q4",
                "page": 2,
                "label": "Teil B · Mathematik 3 (Lineare Funktion & Geradengleichung)",
                "prompt": "Eine Gerade g verläuft durch die Punkte A(1 | 3) und B(4 | 9). An welchem Punkt S_y schneidet g die y-Achse?",
                "type": "mcq",
                "options": [
                    {"id": "a", "text": "S_y(0 | 1)"},
                    {"id": "b", "text": "S_y(0 | 2)"},
                    {"id": "c", "text": "S_y(0 | −1)"},
                    {"id": "d", "text": "S_y(0 | 3)"},
                ],
                "answer": "a",
                "explanation": (
                    "Schritt-für-Schritt-Lösung:\n"
                    "1) Steigung m = (y₂ − y₁) / (x₂ − x₁) = (9 − 3) / (4 − 1) = 6 / 3 = 2.\n"
                    "2) Einsetzen von A(1 | 3) in y = m·x + b: 3 = 2·1 + b → b = 1.\n"
                    "3) Geradengleichung: g(x) = 2x + 1. Probe mit B(4 | 9): 2·4 + 1 = 9 ✓.\n"
                    "4) y-Achsenabschnitt (x = 0): S_y(0 | 1)."
                ),
            },
            {
                "id": "q5",
                "page": 3,
                "label": "Teil B · Mathematik 4 (Exponentielles Wachstum · M-/T-Kurs)",
                "prompt": "Eine Bakterienkultur verdoppelt ihre Anzahl alle 3 Stunden. Zu Beginn (t = 0) sind 500 Bakterien vorhanden. Wie viele Bakterien gibt es nach 12 Stunden?",
                "type": "mcq",
                "options": [
                    {"id": "a", "text": "2.000 Bakterien"},
                    {"id": "b", "text": "4.000 Bakterien"},
                    {"id": "c", "text": "8.000 Bakterien"},
                    {"id": "d", "text": "16.000 Bakterien"},
                ],
                "answer": "c",
                "explanation": (
                    "Schritt-für-Schritt-Lösung:\n"
                    "1) Wachstumsformel: N(t) = N₀ · 2^(t / T), mit N₀ = 500, T = 3 h, t = 12 h.\n"
                    "2) Anzahl der Verdopplungsintervalle: n = 12 / 3 = 4.\n"
                    "3) Berechnung: N(12) = 500 · 2⁴ = 500 · 16 = 8.000 Bakterien.\n"
                    "| Hinweis: Typische Fangfrage ist lineares Rechnen (4 · 500 = 2.000) — bei Verdopplung immer Potenzen von 2 nutzen!"
                ),
            },
            {
                "id": "q6",
                "page": 3,
                "label": "Teil B · Mathematik 5 (Geometrie & Logik-Textaufgabe)",
                "prompt": "Ein Rechteck hat den Umfang U = 30 cm. Die Länge a ist genau doppelt so groß wie die Breite b (a = 2b). Wie groß ist der Flächeninhalt A des Rechtecks?",
                "type": "mcq",
                "options": [
                    {"id": "a", "text": "A = 36 cm²"},
                    {"id": "b", "text": "A = 45 cm²"},
                    {"id": "c", "text": "A = 50 cm²"},
                    {"id": "d", "text": "A = 60 cm²"},
                ],
                "answer": "c",
                "explanation": (
                    "Schritt-für-Schritt-Lösung:\n"
                    "1) Umfangsformel Rechteck: U = 2·(a + b) = 30 cm.\n"
                    "2) Nebenbedingung a = 2b einsetzen: 2·(2b + b) = 30 → 2·3b = 30 → 6b = 30 → b = 5 cm.\n"
                    "3) Länge bestimmen: a = 2 · 5 cm = 10 cm. (Probe Umfang: 2·(10 + 5) = 30 cm ✓).\n"
                    "4) Flächeninhalt: A = a · b = 10 cm · 5 cm = 50 cm²."
                ),
            },
        ],
    },
]


def build_firestore_doc(item: dict[str, Any], now_iso: str) -> dict[str, Any]:
    """Build a strict, QA-clean Firestore document passing assert_clean_curriculum_doc."""
    level = item["level"].lower().strip()
    module = item["module"].strip()
    doc_id = item["id"].strip()
    doc: dict[str, Any] = {
        "id": doc_id,
        "level": level,
        "divisionId": item["divisionId"],
        "category": module,
        "module": module,
        "contentType": item["contentType"],
        "hierarchyPath": f"{level.upper()}/{module}/{doc_id}",
        "title": item["title"],
        "subtitle": item["subtitle"],
        "badge": item["badge"],
        "skill": item["skill"],
        "pages": int(item["pages"]),
        "topics": list(item["topics"]),
        "coverColor": item["coverColor"],
        "productSlug": item["productSlug"],
        "isFree": True,
        "priceEur": 0.0,
        "priceInr": 0,
        "audioUrl": "",
        "readingPassage": item["readingPassage"],
        "grammarNotes": None,
        "questions": item["questions"],
        "flashcards": [],
        "questionCount": len(item["questions"]),
        "flashcardCount": 0,
        "createdAt": now_iso,
        "updatedAt": now_iso,
    }
    if item.get("track"):
        doc["track"] = item["track"]
    # Validate strictly against GTF anti-Frankenstein QA gate
    seeder.assert_clean_curriculum_doc(doc)
    return doc


def sync_catalog_json(now_iso: str) -> None:
    """Upsert all 5 workbooks & products cleanly into gtf-exam-portal/data/catalog.json."""
    catalog = json.loads(CATALOG_FILE.read_text(encoding="utf-8"))
    products: list[dict[str, Any]] = catalog.get("products", [])
    workbooks: list[dict[str, Any]] = catalog.get("workbooks", [])

    for item in DAILY_BATCH_1_ITEMS:
        wid = item["id"]
        wb_entry: dict[str, Any] = {
            "id": wid,
            "title": item["title"],
            "subtitle": item["subtitle"],
            "level": item["level"],
            "divisionId": item["divisionId"],
            "productSlug": item["productSlug"],
            "isFree": True,
            "priceEur": 0.0,
            "priceInr": 0,
            "pages": item["pages"],
            "coverColor": item["coverColor"],
            "topics": item["topics"],
            "skill": item["skill"],
            "contentType": item["contentType"],
            "module": item["module"],
            "audioUrl": "",
            "readingPassage": item["readingPassage"],
            "questionCount": len(item["questions"]),
            "flashcardCount": 0,
            "flashcards": [],
            "unlocked": True,
            "qaStatus": "VERIFIED",
            "questions": item["questions"],
            "generatedAt": now_iso,
            "generatedBy": "GTF Daily Content Batch #1",
        }
        if item.get("track"):
            wb_entry["track"] = item["track"]

        existing_wb_idx = next((i for i, w in enumerate(workbooks) if w.get("id") == wid), None)
        if existing_wb_idx is not None:
            workbooks[existing_wb_idx] = wb_entry
        else:
            workbooks.append(wb_entry)

        prod_entry: dict[str, Any] = {
            "slug": item["productSlug"],
            "divisionId": item["divisionId"],
            "type": "studienkolleg_course" if item["divisionId"] == "studienkolleg" else "pdf_workbook",
            "level": item["level"],
            "title": item["title"],
            "description": item["subtitle"],
            "priceEur": 0.0,
            "priceInr": 0,
            "isFree": True,
            "resourceId": wid,
        }
        if item.get("track"):
            prod_entry["track"] = item["track"]

        existing_prod_idx = next(
            (i for i, p in enumerate(products) if p.get("slug") == item["productSlug"]),
            None,
        )
        if existing_prod_idx is not None:
            products[existing_prod_idx] = prod_entry
        else:
            products.append(prod_entry)

    catalog["products"] = products
    catalog["workbooks"] = workbooks
    CATALOG_FILE.write_text(
        json.dumps(catalog, indent=2, ensure_ascii=False) + "\n",
        encoding="utf-8",
    )
    print(f"[✓] Updated {CATALOG_FILE.name}: {len(products)} products, {len(workbooks)} workbooks.")


def sync_all_core_labs_json() -> None:
    """Upsert the 4 CEFR labs (A1, A2, B1, B2) into gtf-exam-portal/data/all_core_labs.json."""
    labs: list[dict[str, Any]] = json.loads(CORE_LABS_FILE.read_text(encoding="utf-8"))
    for item in DAILY_BATCH_1_ITEMS:
        if item["divisionId"] != "sprachakademie":
            continue
        lab_entry = {
            "id": item["id"],
            "level": item["level"],
            "index": item["index"],
            "indexLabel": item["indexLabel"],
            "title": item["title"],
            "subtitle": item["subtitle"],
            "badge": item["badge"],
            "topics": item["topics"],
            "pages": item["pages"],
            "audioUrl": "",
            "skill": item["skill"],
            "contentType": item["contentType"],
            "module": item["module"],
            "readingPassage": item["readingPassage"],
            "questions": item["questions"],
        }
        idx = next((i for i, x in enumerate(labs) if x.get("id") == item["id"]), None)
        if idx is not None:
            labs[idx] = lab_entry
        else:
            labs.append(lab_entry)

    CORE_LABS_FILE.write_text(
        json.dumps(labs, indent=2, ensure_ascii=False) + "\n",
        encoding="utf-8",
    )
    print(f"[✓] Updated {CORE_LABS_FILE.name}: {len(labs)} total CEFR core labs.")


def main() -> int:
    now_iso = datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ")

    print("=" * 86)
    print(" GTF DAILY CONTENT BATCH #1 — CATALOG SYNC + FIRESTORE SEEDER")
    print("=" * 86)

    # 1. Build & QA-validate all 5 documents first
    fs_docs = [build_firestore_doc(item, now_iso) for item in DAILY_BATCH_1_ITEMS]
    print(f"[✓] All {len(fs_docs)} documents passed assert_clean_curriculum_doc (0 Frankenstein docs).")

    # 2. Update local catalog.json & all_core_labs.json
    sync_catalog_json(now_iso)
    sync_all_core_labs_json()

    # 3. Push all 5 documents into Cloud Firestore `workbooks` & `materials`
    token = seeder.get_auth_token()
    session = requests.Session()
    headers = {
        "Authorization": f"Bearer {token}",
        "x-goog-user-project": seeder.PROJECT_ID,
    }

    failures = 0
    for doc in fs_docs:
        doc_id = doc["id"]
        for col in ("workbooks", "materials"):
            ok, msg, status = seeder.push_firestore_doc(session, token, col, doc_id, doc)
            if not ok:
                print(f"  [FAIL] {col}/{doc_id}: {msg}")
                failures += 1
            else:
                # Immediate read-back verification
                verify = session.get(
                    f"{seeder.FIRESTORE_BASE}/{col}/{doc_id}",
                    headers=headers,
                    timeout=15,
                )
                if verify.status_code == 200:
                    print(
                        f"  [✓] {col:<9} / {doc_id:<44} HTTP 200 | "
                        f"lvl={doc['level']} | mod={doc['module']} | q={doc['questionCount']} | rp={len(doc['readingPassage'])}c"
                    )
                else:
                    print(f"  [FAIL READBACK] {col}/{doc_id}: HTTP {verify.status_code}")
                    failures += 1

    print("=" * 86)
    if failures == 0:
        print(" SUCCESS: All 5 Daily Content Batch #1 labs seeded & verified in Firestore!")
        return 0
    print(f" ERROR: {failures} Firestore operations failed.")
    return 1


if __name__ == "__main__":
    sys.exit(main())
