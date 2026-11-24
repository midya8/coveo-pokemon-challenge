"""Create (or update) a Coveo source from a raw source configuration file.

The file is the source's raw configuration (`GET /sources/{id}/raw`) with org-specific
fields stripped. It carries the sitemap, crawling rules, web scraping configuration,
request interval and the metadata-to-field mappings, so a whole source moves between
orgs in one call.

  bws run -- tools/.venv/bin/python -I tools/import_source.py coveo-config/source-pokemondb.json [--rebuild]

Env: COVEO_ADMIN_API_KEY (needs Sources: Edit + Can create), COVEO_ORG_ID (optional).
"""

from __future__ import annotations

import argparse
import json
import os
import ssl
import sys
import urllib.error
import urllib.request
from pathlib import Path

import certifi

PLATFORM = "https://platform.cloud.coveo.com"
ORG_ID = os.environ.get("COVEO_ORG_ID", "agsqwaoevfcvoorg")
SSL_CTX = ssl.create_default_context(cafile=certifi.where())


def api(method: str, path: str, body: object | None = None) -> object:
    key = os.environ.get("COVEO_ADMIN_API_KEY")
    if not key:
        sys.exit("COVEO_ADMIN_API_KEY is not set. Run via: bws run -- ...")
    req = urllib.request.Request(
        f"{PLATFORM}{path}",
        data=json.dumps(body).encode() if body is not None else None,
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
        with urllib.request.urlopen(req, timeout=120, context=SSL_CTX) as resp:
            raw = resp.read()
            return json.loads(raw) if raw else None
    except urllib.error.HTTPError as e:
        sys.exit(f"{method} {path} -> HTTP {e.code}\n{e.read().decode(errors='replace')[:800]}")


def main() -> int:
    ap = argparse.ArgumentParser()
    ap.add_argument("config", type=Path)
    ap.add_argument("--rebuild", action="store_true", help="start a rebuild after create/update")
    args = ap.parse_args()

    raw = json.loads(args.config.read_text(encoding="utf-8"))
    name = raw["name"]
    existing = [s for s in api("GET", f"/rest/organizations/{ORG_ID}/sources") if s["name"] == name]
    if existing:
        sid = existing[0]["id"]
        api("PUT", f"/rest/organizations/{ORG_ID}/sources/{sid}/raw?rebuild=false", {**raw, "id": sid})
        print(f"updated source {name!r} ({sid})")
    else:
        created = api("POST", f"/rest/organizations/{ORG_ID}/sources/raw?rebuild=false", raw)
        sid = created["id"]
        print(f"created source {name!r} ({sid})")

    mappings = api("GET", f"/rest/organizations/{ORG_ID}/sources/{sid}/mappings")
    mapped = sorted(r["field"] for r in mappings["common"]["rules"] if r["field"].startswith("pokemon_"))
    print(f"pokemon_* mappings on the source: {len(mapped)}")
    if args.rebuild:
        api("POST", f"/rest/organizations/{ORG_ID}/sources/{sid}/rebuild")
        print("rebuild started")
    return 0


if __name__ == "__main__":
    sys.exit(main())
