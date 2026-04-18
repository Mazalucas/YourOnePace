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
import sys
import urllib.request
from pathlib import Path

WATCH_URL = "https://onepace.net/en/watch"
REPO_ROOT = Path(__file__).resolve().parents[1]
OUT_PATH = REPO_ROOT / "data.js"

# Timeline uses "Arabasta"; official site uses "Alabasta".
APP_ALIASES = {"Alabasta": "Arabasta"}

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


def load_html(source: str | None) -> str:
    if source:
        return Path(source).read_text(encoding="utf-8", errors="replace")
    req = urllib.request.Request(
        WATCH_URL,
        headers={"User-Agent": "YourOnePace-link-sync/1.0"},
    )
    with urllib.request.urlopen(req, timeout=60) as resp:
        return resp.read().decode("utf-8", errors="replace")


def flex1_plain_text(section: str, t: int) -> str:
    """t = index of '<span class=\"flex-1\">'."""
    i = t + len('<span class="flex-1">')
    depth = 1
    parts: list[str] = []
    while i < len(section) and depth > 0:
        if section.startswith("<span", i):
            depth += 1
            gt = section.find(">", i)
            i = gt + 1 if gt != -1 else len(section)
        elif section.startswith("</span>", i):
            depth -= 1
            i += 7
        elif section[i] == "<":
            gt = section.find(">", i)
            i = gt + 1 if gt != -1 else len(section)
        else:
            j = section.find("<", i)
            chunk = section[i:j] if j != -1 else section[i:]
            parts.append(chunk)
            i = j if j != -1 else len(section)
    s = "".join(parts).replace("<!-- -->", " ")
    return re.sub(r"\s+", " ", s).strip()


def extract_links(section: str) -> list[dict[str, str]]:
    out: list[dict[str, str]] = []
    current_track = "Release"
    pos = 0
    while pos < len(section):
        t = section.find('<span class="flex-1">', pos)
        l = section.find('href="https://pixeldrain', pos)
        if l == -1:
            l = section.find("href='https://pixeldrain", pos)
        if t == -1:
            t = len(section) + 1
        if l == -1:
            l = len(section) + 1
        if t >= len(section) and l >= len(section):
            break
        if t < l:
            current_track = flex1_plain_text(section, t)
            i = t + len('<span class="flex-1">')
            depth = 1
            while i < len(section) and depth > 0:
                if section.startswith("<span", i):
                    depth += 1
                    i = section.find(">", i) + 1
                elif section.startswith("</span>", i):
                    depth -= 1
                    i += 7
                else:
                    i += 1
            pos = i
            continue
        href_start = section.find("href=", l)
        q = section[href_start + 5]
        url_start = href_start + 6
        url_end = section.find(q, url_start)
        url = section[url_start:url_end]
        gt = section.find(">", url_end)
        sub = section[gt + 1 :]
        close = sub.find("</a>")
        inner = sub[:close]
        rm = re.search(r'tabular-nums">([^<]*\d+p)\s*</span>', inner)
        res = rm.group(1).strip() if rm else ""
        if not res:
            rm2 = re.search(r"(\d{3,4}p)", inner)
            res = rm2.group(1) if rm2 else ""
        label = f"Pixeldrain ({res})" if res else "Pixeldrain"
        out.append({"type": f"{current_track} — {label}", "url": url})
        pos = l + len(url) + 20
    seen: set[str] = set()
    deduped: list[dict[str, str]] = []
    for item in out:
        if item["url"] in seen:
            continue
        seen.add(item["url"])
        deduped.append(item)
    return deduped


def build_episode_data(html: str) -> tuple[dict[str, list[dict[str, str]]], list[str]]:
    h2_pat = re.compile(r'<h2[^>]*>\s*<a href="#([^"]+)">([^<]+)</a>\s*</h2>')
    matches = list(h2_pat.finditer(html))
    ordered_keys: list[str] = []
    result: dict[str, list[dict[str, str]]] = {}
    for i, m in enumerate(matches):
        raw_title = m.group(2).strip()
        title = html_lib.unescape(raw_title)
        key = APP_ALIASES.get(title, title)
        ordered_keys.append(key)
        start = m.end()
        end = matches[i + 1].start() if i + 1 < len(matches) else len(html)
        result[key] = extract_links(html[start:end])
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
