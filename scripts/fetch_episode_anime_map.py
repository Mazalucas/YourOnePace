#!/usr/bin/env python3
"""
Build per-episode anime/manga mapping for Your One Pace from one-pace-metadata.

Usage:
  python3 scripts/fetch_episode_anime_map.py
  python3 scripts/fetch_episode_anime_map.py --arcs arcs.min.json --episodes episodes.min.json

Requires: Python 3.9+ (stdlib only).
"""

from __future__ import annotations

import argparse
import json
import ssl
import urllib.request
from collections import defaultdict
from pathlib import Path

METADATA_BASE = (
    "https://raw.githubusercontent.com/ladyisatis/one-pace-metadata/refs/heads/v2/metadata"
)
REPO_ROOT = Path(__file__).resolve().parents[1]
OUT_PATH = REPO_ROOT / "episodeAnimeMap.js"

# Timeline uses "Arabasta"; metadata uses "Alabasta".
APP_ALIASES = {"Alabasta": "Arabasta"}

# Pixeldrain already ships Post-Enies Lobby as 6 files (new 04 = manga 436-437)
# while one-pace-metadata still lists 5. Keep checklist Open links aligned.
COVERAGE_OVERRIDES = {
    "Post-Enies Lobby": {
        4: {"anime": "321-322", "manga": "436-437"},
        5: {"anime": "323-324", "manga": "438-439"},
        6: {"anime": "324-325", "manga": "440-441"},
    }
}


def fetch_json(url: str) -> dict | list:
    req = urllib.request.Request(url, headers={"User-Agent": "YourOnePace-anime-map/1.0"})
    try:
        with urllib.request.urlopen(req, timeout=60) as resp:
            return json.load(resp)
    except ssl.SSLCertVerificationError:
        ctx = ssl._create_unverified_context()
        with urllib.request.urlopen(req, timeout=60, context=ctx) as resp:
            return json.load(resp)


def load_json(path_or_url: str | None, default_url: str) -> dict | list:
    if path_or_url:
        return json.loads(Path(path_or_url).read_text(encoding="utf-8"))
    return fetch_json(default_url)


def build_map(arcs: list[dict], episodes: dict) -> dict[str, dict[int, dict[str, str]]]:
    by_arc: dict[int, dict[int, dict[str, str]]] = defaultdict(dict)
    for entry in episodes.values():
        if entry.get("extended"):
            continue
        arc_id = entry.get("arc")
        ep_no = entry.get("episode")
        anime = (entry.get("anime_episodes") or "").strip()
        manga = (entry.get("manga_chapters") or "").strip()
        if arc_id is None or ep_no is None or not anime:
            continue
        released = str(entry.get("released") or "")
        prev = by_arc[int(arc_id)].get(int(ep_no))
        if prev and prev.get("released", "") > released:
            continue
        by_arc[int(arc_id)][int(ep_no)] = {
            "anime": anime,
            "manga": manga,
            "released": released,
        }

    result: dict[str, dict[int, dict[str, str]]] = {}
    for arc in arcs:
        part = arc.get("part")
        title = arc.get("title")
        if part is None or not title or part == 0:
            continue
        app_name = APP_ALIASES.get(title, title)
        arc_eps = by_arc.get(int(part), {})
        if not arc_eps:
            continue
        cleaned = {
            ep_no: {"anime": info["anime"], "manga": info["manga"]}
            for ep_no, info in sorted(arc_eps.items())
        }
        extra = COVERAGE_OVERRIDES.get(app_name)
        if extra:
            cleaned.update(extra)
            cleaned = dict(sorted(cleaned.items()))
        result[app_name] = cleaned
    return result


def write_js(mapping: dict[str, dict[int, dict[str, str]]]) -> None:
    lines = [
        "/**",
        " * One Pace episode → Crunchyroll/anime episode + manga chapter mapping.",
        " * Source: https://github.com/ladyisatis/one-pace-metadata",
        " * Regenerate: python3 scripts/fetch_episode_anime_map.py",
        " */",
        "",
        "const episodeAnimeMap = {",
    ]
    for arc_name in sorted(mapping, key=str.lower):
        lines.append(f"    {json.dumps(arc_name, ensure_ascii=False)}: {{")
        for ep_no, info in mapping[arc_name].items():
            anime = json.dumps(info.get("anime", ""), ensure_ascii=False)
            manga = json.dumps(info.get("manga", ""), ensure_ascii=False)
            lines.append(f"        {ep_no}: {{ anime: {anime}, manga: {manga} }},")
        lines.append("    },")
    lines.append("};")
    lines.append("")
    lines.append("window.EPISODE_ANIME_MAP = episodeAnimeMap;")
    OUT_PATH.write_text("\n".join(lines) + "\n", encoding="utf-8")


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--arcs", help="Local arcs.min.json instead of GitHub")
    parser.add_argument("--episodes", help="Local episodes.min.json instead of GitHub")
    args = parser.parse_args()

    arcs_payload = load_json(args.arcs, f"{METADATA_BASE}/arcs.min.json")
    episodes_payload = load_json(args.episodes, f"{METADATA_BASE}/episodes.min.json")
    arcs = arcs_payload["en"]
    mapping = build_map(arcs, episodes_payload)
    write_js(mapping)
    total = sum(len(v) for v in mapping.values())
    print(f"Wrote {OUT_PATH} ({len(mapping)} arcs, {total} episode mappings).")


if __name__ == "__main__":
    main()
