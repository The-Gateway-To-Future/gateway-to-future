#!/usr/bin/env python3
"""
GTF Hören Audio Generator — renders exercise-bound Hören MP3s from their OWN scripts.

Binding rules (never break these):
  * Core Labs:  data/hoeren-lab-scripts.json[<lab-id>]  ->  public/audio/hoeren/labs/<lab-id>.mp3
  * Exam Teile: data/<test>.json  sections.hoeren.teile[id=<teil-id>].script
                ->  public/audio/hoeren/exams/<test-id>/<teil-id>.mp3
  * DaF queue:  ../content-factory/syllabi/daf_audio_exams_queue.json[<id>].dialogue
                ->  public/audio/hoeren/<id>.mp3

Every rendered file is recorded in public/audio/hoeren/AUDIO_MANIFEST.json together with a
SHA-256 of the exact script text, so scripts/verify-hoeren-audio.mjs can detect drift.

Engine: Microsoft Neural German voices via edge-tts (same engine as content-factory/emp03),
mastered to 128 kbps CBR mono MP3 with ffmpeg (imageio-ffmpeg).

Usage:
  python scripts/generate-hoeren-audio.py --labs                 # all Core Labs
  python scripts/generate-hoeren-audio.py --labs a2-lab-01-wegbeschreibung
  python scripts/generate-hoeren-audio.py --exam data/gtf-a1-modelltest-2.json   # all teile of a test
  python scripts/generate-hoeren-audio.py --daf daf_a1_hoeren_03
  add --force to re-render even when the manifest hash is unchanged.
"""
from __future__ import annotations

import argparse
import asyncio
import datetime as dt
import hashlib
import json
import subprocess
import sys
import tempfile
from pathlib import Path

import edge_tts
import imageio_ffmpeg

PORTAL = Path(__file__).resolve().parents[1]
AUDIO_ROOT = PORTAL / "public" / "audio" / "hoeren"
MANIFEST_PATH = AUDIO_ROOT / "AUDIO_MANIFEST.json"
LAB_SCRIPTS_PATH = PORTAL / "data" / "hoeren-lab-scripts.json"
DAF_QUEUE_PATH = PORTAL.parent / "content-factory" / "syllabi" / "daf_audio_exams_queue.json"

ANNOUNCER_VOICE = "de-DE-SeraphinaMultilingualNeural"
FEMALE_VOICES = ["de-DE-KatjaNeural", "de-DE-AmalaNeural", "de-DE-SeraphinaMultilingualNeural"]
MALE_VOICES = ["de-DE-ConradNeural", "de-DE-KillianNeural", "de-DE-FlorianMultilingualNeural"]
PAUSE_AFTER_ANNOUNCEMENT_S = 1.4
PAUSE_BETWEEN_TURNS_S = 0.7
FFMPEG = imageio_ffmpeg.get_ffmpeg_exe()


def script_hash(announcement: str, turns: list[dict]) -> str:
    """Canonical hash of what is spoken (announcement + speaker/text of every turn)."""
    canon = json.dumps(
        {"announcement": announcement.strip(), "turns": [[t["speaker"].strip(), t["text"].strip()] for t in turns]},
        ensure_ascii=False,
        separators=(",", ":"),
    )
    return hashlib.sha256(canon.encode("utf-8")).hexdigest()


def assign_voices(turns: list[dict]) -> dict[str, str]:
    """Stable, distinct voice per speaker (by first appearance and gender)."""
    mapping: dict[str, str] = {}
    f_i = m_i = 0
    for t in turns:
        spk = t["speaker"]
        if spk in mapping:
            continue
        if t.get("voice") == "male":
            mapping[spk] = MALE_VOICES[m_i % len(MALE_VOICES)]
            m_i += 1
        else:
            mapping[spk] = FEMALE_VOICES[f_i % len(FEMALE_VOICES)]
            f_i += 1
    return mapping


async def tts_to_file(text: str, voice: str, out: Path, retries: int = 3) -> None:
    last: Exception | None = None
    for attempt in range(retries):
        try:
            await edge_tts.Communicate(text, voice, rate="-4%").save(str(out))
            if out.exists() and out.stat().st_size > 1000:
                return
        except Exception as exc:  # network hiccup -> retry
            last = exc
        await asyncio.sleep(1.5 * (attempt + 1))
    raise RuntimeError(f"TTS failed for voice {voice}: {last}")


def silence(path: Path, seconds: float) -> None:
    subprocess.run(
        [FFMPEG, "-y", "-loglevel", "error", "-f", "lavfi", "-i", "anullsrc=r=24000:cl=mono",
         "-t", f"{seconds:.2f}", "-c:a", "libmp3lame", "-b:a", "128k", str(path)],
        check=True,
    )


async def render(announcement: str, turns: list[dict], out_mp3: Path) -> dict:
    voices = assign_voices(turns)
    out_mp3.parent.mkdir(parents=True, exist_ok=True)
    with tempfile.TemporaryDirectory(prefix="gtf_hoeren_") as tmp:
        tmpd = Path(tmp)
        segs: list[Path] = []
        gap_a, gap_t = tmpd / "gap_a.mp3", tmpd / "gap_t.mp3"
        silence(gap_a, PAUSE_AFTER_ANNOUNCEMENT_S)
        silence(gap_t, PAUSE_BETWEEN_TURNS_S)
        if announcement.strip():
            ann = tmpd / "000_ann.mp3"
            await tts_to_file(announcement, ANNOUNCER_VOICE, ann)
            segs += [ann, gap_a]
        for i, t in enumerate(turns, start=1):
            seg = tmpd / f"{i:03d}.mp3"
            await tts_to_file(t["text"], voices[t["speaker"]], seg)
            segs += [seg, gap_t]
        listing = tmpd / "list.txt"
        listing.write_text("".join(f"file '{p.as_posix()}'\n" for p in segs), encoding="utf-8")
        subprocess.run(
            [FFMPEG, "-y", "-loglevel", "error", "-f", "concat", "-safe", "0", "-i", str(listing),
             "-ac", "1", "-ar", "24000", "-c:a", "libmp3lame", "-b:a", "128k", str(out_mp3)],
            check=True,
        )
    return {"voices": voices}


def load_manifest() -> dict:
    if MANIFEST_PATH.exists():
        return json.loads(MANIFEST_PATH.read_text(encoding="utf-8"))
    return {"_about": "Exercise-bound Hören audio. Key = public URL. Do not hand-edit; use scripts/generate-hoeren-audio.py.", "files": {}}


def save_manifest(manifest: dict) -> None:
    manifest["files"] = dict(sorted(manifest["files"].items()))
    MANIFEST_PATH.write_text(json.dumps(manifest, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")


def collect_jobs(args) -> list[dict]:
    jobs: list[dict] = []
    if args.labs is not None:
        scripts = json.loads(LAB_SCRIPTS_PATH.read_text(encoding="utf-8"))
        ids = args.labs or list(scripts.keys())
        for lab_id in ids:
            if lab_id not in scripts:
                sys.exit(f"Unknown lab id: {lab_id}")
            s = scripts[lab_id]
            jobs.append({"url": f"/audio/hoeren/labs/{lab_id}.mp3", "source": f"lab:{lab_id}",
                         "announcement": s["announcement"], "turns": s["turns"]})
    for exam_path in args.exam or []:
        p = (PORTAL / exam_path).resolve() if not Path(exam_path).is_absolute() else Path(exam_path)
        test = json.loads(p.read_text(encoding="utf-8"))
        for teil in test["sections"]["hoeren"]["teile"]:
            if args.teil and teil["id"] not in args.teil:
                continue
            ann = f"{test.get('title', test['id'])}. {teil.get('title', '')}. {teil.get('instructions', '')}".strip()
            jobs.append({"url": f"/audio/hoeren/exams/{test['id']}/{teil['id']}.mp3",
                         "source": f"exam:{p.name}#{teil['id']}", "announcement": ann, "turns": teil["script"]})
    for daf_id in args.daf or []:
        queue = json.loads(DAF_QUEUE_PATH.read_text(encoding="utf-8"))
        items = queue if isinstance(queue, list) else next(v for v in queue.values() if isinstance(v, list))
        item = next((x for x in items if x.get("id") == daf_id), None)
        if not item:
            sys.exit(f"Unknown DaF queue id: {daf_id}")
        turns = [{"speaker": d["speaker"], "voice": d.get("voice", "female"), "text": d["text"]} for d in item["dialogue"]]
        jobs.append({"url": f"/audio/hoeren/{daf_id}.mp3", "source": f"daf-queue:{daf_id}",
                     "announcement": item.get("announcement", ""), "turns": turns})
    return jobs


async def main_async(args) -> int:
    manifest = load_manifest()
    jobs = collect_jobs(args)
    if not jobs:
        print("Nothing to render. Use --labs, --exam or --daf.")
        return 1
    for job in jobs:
        h = script_hash(job["announcement"], job["turns"])
        out = PORTAL / "public" / job["url"].lstrip("/")
        prev = manifest["files"].get(job["url"])
        if not args.force and prev and prev.get("scriptSha256") == h and out.exists():
            print(f"= up-to-date  {job['url']}")
            continue
        meta = await render(job["announcement"], job["turns"], out)
        manifest["files"][job["url"]] = {
            "source": job["source"],
            "scriptSha256": h,
            "bytes": out.stat().st_size,
            "engine": "edge-tts neural de-DE -> ffmpeg 128k mono",
            "voices": meta["voices"],
            "generatedAt": dt.datetime.now(dt.timezone.utc).isoformat(timespec="seconds"),
        }
        save_manifest(manifest)
        print(f"+ rendered    {job['url']}  ({out.stat().st_size // 1024} KB)")
    save_manifest(manifest)
    return 0


def main() -> int:
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("--labs", nargs="*", help="Render Core Lab audio (all, or the given lab ids).")
    ap.add_argument("--exam", nargs="*", help="Exam JSON file(s) whose Hören teile should be rendered.")
    ap.add_argument("--teil", nargs="*", help="Restrict --exam to these teil ids.")
    ap.add_argument("--daf", nargs="*", help="DaF queue ids to render to /audio/hoeren/<id>.mp3.")
    ap.add_argument("--force", action="store_true", help="Re-render even if the script hash is unchanged.")
    return asyncio.run(main_async(ap.parse_args()))


if __name__ == "__main__":
    raise SystemExit(main())
