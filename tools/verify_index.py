"""Check the live index for the Fire + Flying demo, using the anonymous search key.

  VITE_COVEO_API_KEY=... python tools/verify_index.py

Prints result titles and counts only. The key is never printed.
Exits 0 when Charizard is on the first page of a conjunctive Type filter.
"""

from __future__ import annotations

import json
import os
import ssl
import sys
import urllib.request

ORG_ID = os.environ.get("COVEO_ORG_ID", os.environ.get("VITE_COVEO_ORG_ID", "voljzmfhemcvoorg"))
SEARCH_HUB = os.environ.get("VITE_COVEO_SEARCH_HUB", "PokemonSearch")


def ssl_context() -> ssl.SSLContext:
    try:
        import certifi
    except ImportError:
        return ssl.create_default_context()
    return ssl.create_default_context(cafile=certifi.where())


def search(token: str, body: dict) -> dict:
    req = urllib.request.Request(
        f"https://platform.cloud.coveo.com/rest/search/v2?organizationId={ORG_ID}",
        data=json.dumps(body).encode(),
        method="POST",
        headers={
            "Authorization": f"Bearer {token}",
            "Content-Type": "application/json",
            "Accept": "application/json",
            "User-Agent": "pokemon-challenge-verify/1.0",
        },
    )
    with urllib.request.urlopen(req, timeout=60, context=ssl_context()) as resp:
        return json.loads(resp.read().decode())


def names(payload: dict) -> list[str]:
    found = []
    for result in payload.get("results") or []:
        raw = result.get("raw") or {}
        found.append(str(raw.get("pokemon_name") or result.get("title") or ""))
    return found


def main() -> int:
    token = os.environ.get("VITE_COVEO_API_KEY")
    if not token:
        print("VITE_COVEO_API_KEY is not set", file=sys.stderr)
        return 1
    facet = {
        "facetId": "type",
        "field": "pokemon_type",
        "type": "specific",
        "currentValues": [
            {"value": "Fire", "state": "selected"},
            {"value": "Flying", "state": "selected"},
        ],
        "numberOfValues": 8,
        "resultsMustMatch": "allValues",
    }
    payload = search(
        token,
        {
            "q": "",
            "numberOfResults": 10,
            "searchHub": SEARCH_HUB,
            "cq": '@source=="Pokemon - pokemondb.net"',
            "fieldsToInclude": ["pokemon_name", "pokemon_type", "pokemon_number"],
            "facets": [facet],
        },
    )
    found = names(payload)
    total = payload.get("totalCount")
    expression = payload.get("advancedExpression")
    print(f"total={total} expression={expression or 'not returned'}")
    for index, name in enumerate(found, 1):
        print(f"{index:2}. {name}")
    charizard = any(name.lower() == "charizard" for name in found)
    small_enough = isinstance(total, int) and 0 < total <= 20
    conjunctive = True
    if isinstance(expression, str):
        compact = expression.replace(" ", "")
        conjunctive = "Fire" in expression and "Flying" in expression and "Fire,Flying" not in compact
    if charizard and small_enough and conjunctive:
        print("ok: Charizard is on page 1 of Fire AND Flying")
        return 0
    print("not ok: expected Charizard on page 1 of a small conjunctive result set", file=sys.stderr)
    return 1


if __name__ == "__main__":
    sys.exit(main())
