#!/usr/bin/env python3
"""
Regenerate data.js Pixeldrain links from the official One Pace watch page.

Usage:
  python3 scripts/fetch_onepace_watch_links.py
  python3 scripts/fetch_onepace_watch_links.py /path/to/watch.html

Requires: Python 3.9+ (stdlib only).
"""

from __future__ import annotations

import html as html_lib
import json
import re
import ssl
import sys
import urllib.request
from pathlib import Path

WATCH_URL = "https://onepace.net/en/watch"
REPO_ROOT = Path(__file__).resolve().parents[1]
OUT_PATH = REPO_ROOT / "data.js"

# Timeline uses "Arabasta"; official site uses "Alabasta".
APP_ALIASES = {
    "Alabasta": "Arabasta",
    "If You Could Go Anywhere... The Adventures of the Straw Hats": (
        "The Adventures of the Straw Hats"
    ),
}

DESCS = {
    "Romance Dawn": (
        "Monkey D. Luffy sets out on an adventure to form a crew, find the "
        "legendary One Piece, and become the pirate king."
    ),
    "Orange Town": (
        "Luffy and Zoro run afoul of a flashy crew of pirates and their captain, "
        "Buggy the Clown."
    ),
    "Syrup Village": (
        "Luffy's fledgling pirate crew arrives at the slopes of Syrup Village. "
        "There they find a liar and a conspiracy."
    ),
    "Gaimon": (
        "The Straw Hats head to an island said to hold a fabled treasure. "
        "There they encounter a strange man stuck in a box."
    ),
    "Baratie": (
        "The Straw Hats head to the ocean-going restaurant, Baratie, with the "
        "hopes of recruiting one of their cooks."
    ),
    "Arlong Park": (
        "Nami's hometown has long been overrun by Arlong and his band of fishmen. "
        "The Straw Hats arrive to help."
    ),
}

SEGMENT_RE = re.compile(
    r'<li[^>]*id="([^"]+)"[^>]*data-timeline-segment="([^"]+)"[^>]*>'
)
TRACK_START_RE = re.compile(r'<span id="[^"]*" class="text-lg/6 font-semibold">')
PIXELDRAIN_RE = re.compile(r'href="(https://pixeldrain\.net/l/[A-Za-z0-9]+)"')


def load_html(source: str | None) -> str:
    if source:
        return Path(source).read_text(encoding="utf-8", errors="replace")
    req = urllib.request.Request(
        WATCH_URL,
        headers={"User-Agent": "YourOnePace-link-sync/1.0"},
    )
    try:
        with urllib.request.urlopen(req, timeout=60) as resp:
            return resp.read().decode("utf-8", errors="replace")
    except ssl.SSLCertVerificationError:
        ctx = ssl._create_unverified_context()
        with urllib.request.urlopen(req, timeout=60, context=ctx) as resp:
            return resp.read().decode("utf-8", errors="replace")


def inner_text(fragment: str) -> str:
    return re.sub(r"\s+", " ", html_lib.unescape(re.sub(r"<[^>]+>", "", fragment))).strip()


def extract_balanced_span(section: str, open_at: int) -> tuple[str, int]:
    """Return inner HTML and index after the matching closing </span>."""
    i = section.find(">", open_at)
    if i == -1:
        return "", len(section)
    i += 1
    start = i
    depth = 1
    while i < len(section) and depth > 0:
        if section.startswith("<span", i):
            depth += 1
            gt = section.find(">", i)
            i = gt + 1 if gt != -1 else len(section)
        elif section.startswith("</span>", i):
            depth -= 1
            if depth == 0:
                return section[start:i], i + len("</span>")
            i += 7
        else:
            i += 1
    return section[start:], len(section)


def extract_title(section: str) -> str:
    m = re.search(r"<h2[^>]*>\s*<a[^>]*>(.*?)</a>", section, re.S)
    if m:
        return inner_text(m.group(1))
    m = re.search(r"<h2[^>]*>(.*?)</h2>", section, re.S)
    return inner_text(m.group(1)) if m else ""


def extract_links(section: str) -> list[dict[str, str]]:
    out: list[dict[str, str]] = []
    pos = 0
    current_track = "Release"
    while pos < len(section):
        t = TRACK_START_RE.search(section, pos)
        l = PIXELDRAIN_RE.search(section, pos)
        t_at = t.start() if t else len(section) + 1
        l_at = l.start() if l else len(section) + 1
        if t_at >= len(section) and l_at >= len(section):
            break
        if t_at < l_at:
            inner, end = extract_balanced_span(section, t_at)
            track = inner_text(inner)
            if track:
                current_track = track
            pos = end
            continue
        url = l.group(1)
        after = section[l.end() : l.end() + 500]
        rm = re.search(r">(\d{3,4}p)<", after)
        res = rm.group(1) if rm else ""
        label = f"Pixeldrain ({res})" if res else "Pixeldrain"
        out.append({"type": f"{current_track} — {label}", "url": url})
        pos = l.end()

    seen: set[str] = set()
    deduped: list[dict[str, str]] = []
    for item in out:
        if item["url"] in seen:
            continue
        seen.add(item["url"])
        deduped.append(item)
    return deduped


def build_episode_data(html: str) -> tuple[dict[str, list[dict[str, str]]], list[str]]:
    matches = list(SEGMENT_RE.finditer(html))
    ordered_keys: list[str] = []
    result: dict[str, list[dict[str, str]]] = {}
    for i, m in enumerate(matches):
        start = m.start()
        end = matches[i + 1].start() if i + 1 < len(matches) else len(html)
        section = html[start:end]
        raw_title = extract_title(section)
        if not raw_title or raw_title.startswith("Special:"):
            continue
        key = APP_ALIASES.get(raw_title, raw_title)
        if key in result:
            continue
        ordered_keys.append(key)
        result[key] = extract_links(section)
    return result, ordered_keys


def write_data_js(result: dict[str, list[dict[str, str]]], ordered_keys: list[str]) -> None:
    lines = [
        "/**",
        " * One Pace — extended episode data (Pixeldrain links from https://onepace.net/en/watch ).",
        " * Regenerate: python3 scripts/fetch_onepace_watch_links.py",
        " */",
        "",
        "const episodeData = {",
    ]
    for key in ordered_keys:
        links = result[key]
        lines.append(f"    {json.dumps(key, ensure_ascii=False)}: {{")
        if key in DESCS:
            lines.append(f"        description: {json.dumps(DESCS[key], ensure_ascii=False)},")
        lines.append("        links: [")
        for link in links:
            lines.append(
                "            { type: "
                f"{json.dumps(link['type'], ensure_ascii=False)}, "
                f"url: {json.dumps(link['url'], ensure_ascii=False)} }},"
            )
        lines.append("        ]")
        lines.append("    },")
    lines.append("};")
    lines.append("")
    lines.append("window.EPISODE_DATA = episodeData;")
    OUT_PATH.write_text("\n".join(lines) + "\n", encoding="utf-8")


def main() -> None:
    source = sys.argv[1] if len(sys.argv) > 1 else None
    html = load_html(source)
    result, ordered = build_episode_data(html)
    write_data_js(result, ordered)
    empty = [k for k, v in result.items() if not v]
    print(f"Wrote {OUT_PATH} ({len(ordered)} arcs, {sum(len(v) for v in result.values())} links).")
    if empty:
        print("Warning: arcs with no links:", ", ".join(empty))


if __name__ == "__main__":
    main()
