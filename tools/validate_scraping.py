"""Validate the Coveo web scraping config locally before pushing it to the org.

Usage:
  tools/.venv/bin/python -I tools/validate_scraping.py --sitemap            # check URL scoping
  tools/.venv/bin/python -I tools/validate_scraping.py bulbasaur charizard  # check extraction (fetches pages)

Pages are fetched politely (robots.txt asks for a 2s crawl delay) and cached
under tools/.cache so repeated runs don't hit the site again.
"""

from __future__ import annotations

import argparse
import json
import re
import ssl
import sys
import time
import urllib.request
from pathlib import Path

import certifi
from lxml import html

SSL_CTX = ssl.create_default_context(cafile=certifi.where())

ROOT = Path(__file__).resolve().parent.parent
CONFIG = ROOT / "coveo-config" / "web-scraping-config.json"
CACHE = ROOT / "tools" / ".cache"
SITEMAP_URL = "https://pokemondb.net/static/sitemaps/pokemondb.xml"
UA = "Mozilla/5.0 (pokemon-challenge validator)"
CRAWL_DELAY_S = 2.0

_last_fetch = 0.0


def fetch(url: str, cache_name: str) -> str:
    global _last_fetch
    CACHE.mkdir(parents=True, exist_ok=True)
    path = CACHE / cache_name
    if path.exists():
        return path.read_text(encoding="utf-8")
    wait = CRAWL_DELAY_S - (time.time() - _last_fetch)
    if wait > 0:
        time.sleep(wait)
    req = urllib.request.Request(url, headers={"User-Agent": UA})
    with urllib.request.urlopen(req, timeout=30, context=SSL_CTX) as resp:
        body = resp.read().decode("utf-8")
    _last_fetch = time.time()
    path.write_text(body, encoding="utf-8")
    return body


def load_rule() -> dict:
    rules = json.loads(CONFIG.read_text(encoding="utf-8"))
    assert len(rules) == 1, "expected a single rule"
    return rules[0]


def check_sitemap(rule: dict) -> int:
    xml = fetch(SITEMAP_URL, "sitemap.xml")
    urls = re.findall(r"<loc>([^<]+)</loc>", xml)
    pattern = re.compile(rule["for"]["urls"][0])
    matched = [u for u in urls if pattern.search(u)]
    pokedex = [u for u in urls if "/pokedex/" in u]
    print(f"sitemap URLs: {len(urls)}  /pokedex/ URLs: {len(pokedex)}  matched by rule: {len(matched)}")
    excluded_samples = sorted({re.sub(r"/[^/]+$", "/*", u) for u in pokedex if u not in matched})
    print("excluded /pokedex/ patterns (sample):", excluded_samples[:8])
    for probe in ("all", "national", "shiny", "bulbasaur", "browt", "bulbasaur/moves/1", "game/red-blue-yellow"):
        url = f"https://pokemondb.net/pokedex/{probe}"
        print(f"  {'INCLUDE' if pattern.search(url) else 'exclude'}  {url}")
    return 0


def extract(doc, selector: dict) -> list[str]:
    if selector["type"] == "XPATH":
        raw = doc.xpath(selector["path"])
    else:
        raw = doc.cssselect(selector["path"])
    values = []
    for v in raw:
        text = v if isinstance(v, str) else v.text_content()
        text = re.sub(r"\s+", " ", str(text)).strip()
        if text:
            values.append(text)
    return values


def check_pages(rule: dict, slugs: list[str]) -> int:
    failures = 0
    required = {"pokemon_name", "pokemon_type", "pokemon_generation", "pokemon_image"}
    for slug in slugs:
        url = f"https://pokemondb.net/pokedex/{slug}"
        doc = html.fromstring(fetch(url, f"{slug}.html"))
        print(f"\n== {url}")
        for name, selector in rule["metadata"].items():
            values = extract(doc, selector)
            flag = ""
            if name in required and not values:
                flag = "   <-- MISSING (required)"
                failures += 1
            print(f"  {name:20s} {values}{flag}")
        for ex in rule["exclude"]:
            hits = len(doc.cssselect(ex["path"])) if ex["type"] == "CSS" else len(doc.xpath(ex["path"]))
            print(f"  exclude {ex['path']!r}: {hits} element(s)")
    print(f"\n{len(slugs)} page(s) checked, {failures} missing required value(s)")
    return 1 if failures else 0


def main() -> int:
    ap = argparse.ArgumentParser()
    ap.add_argument("--sitemap", action="store_true", help="check URL scoping against the sitemap")
    ap.add_argument("slugs", nargs="*", help="pokedex slugs to extract, e.g. bulbasaur")
    args = ap.parse_args()
    rule = load_rule()
    rc = 0
    if args.sitemap:
        rc |= check_sitemap(rule)
    if args.slugs:
        rc |= check_pages(rule, args.slugs)
    if not args.sitemap and not args.slugs:
        ap.print_help()
    return rc


if __name__ == "__main__":
    sys.exit(main())
