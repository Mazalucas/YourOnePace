#!/usr/bin/env python3
"""
Build per-episode anime mapping for Your One Pace from one-pace-metadata.

Usage:
  python3 scripts/fetch_episode_anime_map.py

Requires: Python 3.9+ (stdlib only).
"""

from __future__ import annotations

import json
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


def fetch_json(url: str) -> dict | list:
    req = urllib.request.Request(url, headers={"User-Agent": "YourOnePace-anime-map/1.0"})
    with urllib.request.urlopen(req, timeout=60) as resp:
        return json.load(resp)


def build_map(arcs: list[dict], episodes: dict) -> dict[str, dict[int, str]]:
    by_arc: dict[int, dict[int, str]] = defaultdict(dict)
    for entry in episodes.values():
        arc_id = entry.get("arc")
        ep_no = entry.get("episode")
        anime = (entry.get("anime_episodes") or "").strip()
        if arc_id is None or ep_no is None or not anime:
            continue
        by_arc[int(arc_id)][int(ep_no)] = anime

    result: dict[str, dict[int, str]] = {}
    for arc in arcs:
        part = arc.get("part")
        title = arc.get("title")
        if part is None or not title or part == 0:
            continue
        app_name = APP_ALIASES.get(title, title)
        arc_eps = by_arc.get(int(part), {})
        if not arc_eps:
            continue
        result[app_name] = dict(sorted(arc_eps.items()))
    return result


def write_js(mapping: dict[str, dict[int, str]]) -> None:
    lines = [
        "/**",
        " * One Pace episode → original anime episode mapping.",
        " * Source: https://github.com/ladyisatis/one-pace-metadata",
        " * Regenerate: python3 scripts/fetch_episode_anime_map.py",
        " */",
        "",
        "const episodeAnimeMap = {",
    ]
    for arc_name in sorted(mapping, key=str.lower):
        lines.append(f"    {json.dumps(arc_name, ensure_ascii=False)}: {{")
        for ep_no, anime in mapping[arc_name].items():
            lines.append(
                f"        {ep_no}: {json.dumps(anime, ensure_ascii=False)},"
            )
        lines.append("    },")
    lines.append("};")
    lines.append("")
    lines.append("window.EPISODE_ANIME_MAP = episodeAnimeMap;")
    OUT_PATH.write_text("\n".join(lines) + "\n", encoding="utf-8")


def main() -> None:
    arcs_payload = fetch_json(f"{METADATA_BASE}/arcs.min.json")
    episodes_payload = fetch_json(f"{METADATA_BASE}/episodes.min.json")
    arcs = arcs_payload["en"]
    mapping = build_map(arcs, episodes_payload)
    write_js(mapping)
    total = sum(len(v) for v in mapping.values())
    print(f"Wrote {OUT_PATH} ({len(mapping)} arcs, {total} episode mappings).")


if __name__ == "__main__":
    main()
