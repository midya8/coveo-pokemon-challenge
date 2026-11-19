"""Set up the Coveo org from coveo-config/ (idempotent).

Run with the admin key injected from Bitwarden Secrets Manager (never printed):
  bws run -- tools/.venv/bin/python -I tools/coveo_setup.py fields
  bws run -- tools/.venv/bin/python -I tools/coveo_setup.py mappings "Pokemon" [--rebuild]

Env:
  COVEO_ADMIN_API_KEY  required (Bitwarden secret)
  COVEO_ORG_ID         optional, defaults to the trial org below
"""

from __future__ import annotations

import json
import os
import ssl
import sys
import urllib.error
import urllib.request
from pathlib import Path

import certifi

ROOT = Path(__file__).resolve().parent.parent
FIELDS_FILE = ROOT / "coveo-config" / "fields.json"
PLATFORM = "https://platform.cloud.coveo.com"
ORG_ID = os.environ.get("COVEO_ORG_ID", "voljzmfhemcvoorg")
SSL_CTX = ssl.create_default_context(cafile=certifi.where())

# Defaults applied to every field unless fields.json overrides them.
FIELD_DEFAULTS = {
    "facet": False,
    "multiValueFacet": False,
    "sort": False,
    "includeInQuery": True,
    "includeInResults": True,
    "mergeWithLexicon": False,
    "ranking": False,
    "stemming": False,
    "smartDateFacet": False,
    "useCacheForComputedFacet": False,
    "useCacheForNestedQuery": False,
    "useCacheForNumericQuery": False,
    "useCacheForSort": False,
}


def api(method: str, path: str, body: object | None = None) -> object:
    key = os.environ.get("COVEO_ADMIN_API_KEY")
    if not key:
        sys.exit("COVEO_ADMIN_API_KEY is not set. Run via: bws run -- ...")
    data = json.dumps(body).encode() if body is not None else None
    req = urllib.request.Request(
        f"{PLATFORM}{path}",
        data=data,
        method=method,
        headers={
            "Authorization": f"Bearer {key}",
            "Content-Type": "application/json",
            "Accept": "application/json",
            # Coveo's edge blocks writes from the default "Python-urllib" User-Agent.
            "User-Agent": "pokemon-challenge-setup/1.0",
        },
    )
    try:
        with urllib.request.urlopen(req, timeout=60, context=SSL_CTX) as resp:
            raw = resp.read()
            return json.loads(raw) if raw else None
    except urllib.error.HTTPError as e:
        detail = e.read().decode(errors="replace")[:800]
        sys.exit(f"{method} {path} -> HTTP {e.code}\n{detail}")


def existing_field_names() -> set[str]:
    names: set[str] = set()
    page = 0
    while True:
        res = api("GET", f"/rest/organizations/{ORG_ID}/indexes/page/fields?page={page}&perPage=200&origin=USER")
        items = res.get("items", []) if isinstance(res, dict) else []
        names.update(f["name"] for f in items)
        total_pages = res.get("totalPages", 1) if isinstance(res, dict) else 1
        page += 1
        if page >= total_pages:
            return names


def setup_fields() -> int:
    wanted = json.loads(FIELDS_FILE.read_text(encoding="utf-8"))
    have = existing_field_names()
    to_create = [{**FIELD_DEFAULTS, **f} for f in wanted if f["name"] not in have]
    skipped = [f["name"] for f in wanted if f["name"] in have]
    if skipped:
        print(f"already exist ({len(skipped)}): {', '.join(skipped)}")
    if not to_create:
        print("nothing to create")
        return 0
    api("POST", f"/rest/organizations/{ORG_ID}/indexes/fields/batch/create", to_create)
    print(f"created ({len(to_create)}): {', '.join(f['name'] for f in to_create)}")
    after = existing_field_names()
    missing = [f["name"] for f in wanted if f["name"] not in after]
    if missing:
        print(f"WARNING still missing: {', '.join(missing)}")
        return 1
    print(f"verified: all {len(wanted)} fields present in org {ORG_ID}")
    return 0


def find_sources(name_contains: str) -> list[dict]:
    sources = api("GET", f"/rest/organizations/{ORG_ID}/sources")
    return [s for s in sources if name_contains.lower() in s["name"].lower()]


def setup_mappings(name_contains: str, rebuild: bool) -> int:
    """Map each scraped metadata value to the field of the same name (%[pokemon_x] -> pokemon_x).

    Coveo extracts the web-scraping metadata but only indexes it once a mapping rule exists.
    """
    wanted = [f["name"] for f in json.loads(FIELDS_FILE.read_text(encoding="utf-8"))]
    sources = find_sources(name_contains)
    if not sources:
        print(f"no source matching {name_contains!r}")
        return 1
    for src in sources:
        sid = src["id"]
        mappings = api("GET", f"/rest/organizations/{ORG_ID}/sources/{sid}/mappings")
        rules = mappings.setdefault("common", {}).setdefault("rules", [])
        mapped = {r["field"] for r in rules}
        new = [{"field": name, "content": [f"%[{name}]"]} for name in wanted if name not in mapped]
        if new:
            rules.extend(new)
            api("PUT", f"/rest/organizations/{ORG_ID}/sources/{sid}/mappings?rebuild=false", mappings)
        print(f"{src['name']}: added {len(new)} mapping(s), {len(wanted) - len(new)} already present")
        if rebuild:
            api("POST", f"/rest/organizations/{ORG_ID}/sources/{sid}/rebuild")
            print(f"{src['name']}: rebuild started")
    return 0


def main() -> int:
    cmd = sys.argv[1] if len(sys.argv) > 1 else ""
    if cmd == "fields":
        return setup_fields()
    if cmd == "mappings" and len(sys.argv) > 2:
        return setup_mappings(sys.argv[2], rebuild="--rebuild" in sys.argv)
    print(__doc__)
    return 2


if __name__ == "__main__":
    sys.exit(main())
