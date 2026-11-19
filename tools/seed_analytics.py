"""Seed Coveo Analytics with realistic search + click events so the Query Suggestions model can learn.

A brand-new org has no usage data, and QS models learn only from queries that were followed by a click.
This script simulates visitors on the PokemonSearch hub:
  * a "name" journey for every indexed Pokémon (search its name, open its page)
  * "topic" journeys for natural queries ("fire type", "legendary"...): the query runs against the real
    index and the visitor opens the top result

All events are clearly synthetic: user agent "pokemon-challenge-seed/1.0". This is meant for a trial or
sandbox org only.

  bws run -- tools/.venv/bin/python -I tools/seed_analytics.py --dry-run
  bws run -- tools/.venv/bin/python -I tools/seed_analytics.py --name-visits 2 --topic-visits 8

Env: VITE_COVEO_API_KEY (anonymous search key: execute queries + push analytics). Never printed.
"""

from __future__ import annotations

import argparse
import json
import os
import random
import ssl
import sys
import time
import urllib.error
import urllib.request
import uuid
from concurrent.futures import ThreadPoolExecutor, as_completed

import certifi

ORG_ID = os.environ.get("COVEO_ORG_ID", "voljzmfhemcvoorg")
SEARCH_HUB = "PokemonSearch"
TAB = "default"
PIPELINE = "Pokemon Search"
SOURCE_FILTER = '@source=="Pokemon - pokemondb.net"'
SEARCH_URL = f"https://platform.cloud.coveo.com/rest/search/v2?organizationId={ORG_ID}"
UA_BASE = f"https://{ORG_ID}.analytics.org.coveo.com/rest/ua/v15/analytics"
USER_AGENT = "pokemon-challenge-seed/1.0"
SSL_CTX = ssl.create_default_context(cafile=certifi.where())

TOPIC_QUERIES = [
    "fire type", "water type", "grass type", "electric type", "dragon type", "ghost type",
    "psychic type", "fairy type", "legendary pokemon", "starter pokemon", "mega evolution",
    "fire starter", "water starter", "grass starter", "electric mouse", "seed pokemon",
    "fastest pokemon", "strongest pokemon", "eevee evolutions", "dragon flying",
    "pikachu", "charizard", "mewtwo", "eevee", "gengar", "lucario", "snorlax", "gyarados",
]


def key() -> str:
    k = os.environ.get("VITE_COVEO_API_KEY")
    if not k:
        sys.exit("VITE_COVEO_API_KEY not set. Run via: bws run -- ...")
    return k


def post(url: str, body: dict) -> tuple[int, dict | None]:
    req = urllib.request.Request(
        url,
        data=json.dumps(body).encode(),
        method="POST",
        headers={
            "Authorization": f"Bearer {key()}",
            "Content-Type": "application/json",
            "Accept": "application/json",
            "User-Agent": USER_AGENT,
        },
    )
    for attempt in range(4):
        try:
            with urllib.request.urlopen(req, timeout=60, context=SSL_CTX) as resp:
                raw = resp.read()
                return resp.status, (json.loads(raw) if raw else None)
        except urllib.error.HTTPError as e:
            if e.code in (429, 502, 503, 504) and attempt < 3:
                time.sleep(2 ** attempt)
                continue
            return e.code, {"error": e.read().decode(errors="replace")[:300]}
        except (urllib.error.URLError, TimeoutError, ConnectionError) as e:
            # Transient network/DNS hiccups: back off and retry, never crash the whole run.
            if attempt < 3:
                time.sleep(2 ** attempt)
                continue
            return 0, {"error": str(e)[:200]}
    return 0, None


def search(q: str, n: int = 5, first: int = 0, fields: list[str] | None = None) -> dict:
    status, res = post(SEARCH_URL, {
        "q": q, "cq": SOURCE_FILTER, "numberOfResults": n, "firstResult": first,
        "searchHub": SEARCH_HUB, "tab": TAB, "fieldsToInclude": fields or ["pokemon_name", "urihash", "source"],
    })
    if status != 200:
        sys.exit(f"search failed ({status}): {res}")
    return res


def all_pokemon() -> list[dict]:
    docs, first = [], 0
    while True:
        res = search("", n=500, first=first, fields=["pokemon_name", "urihash", "source"])
        docs.extend(res["results"])
        first += 500
        if first >= res["totalCount"]:
            return docs


def doc_info(r: dict) -> dict:
    raw = r["raw"]
    return {
        "title": r["title"], "uri": r["uri"], "clickUri": r["clickUri"],
        "urihash": raw.get("urihash", ""), "source": raw.get("source", ""),
        "name": raw.get("pokemon_name") or r["title"],
    }


def journey(query: str, doc: dict, position: int, visitor: str) -> list[int]:
    """One visitor searches `query` and opens `doc` at `position`. Returns HTTP statuses."""
    uid = str(uuid.uuid4())
    common = {
        "language": "en", "anonymous": True, "originLevel1": SEARCH_HUB, "originLevel2": TAB,
        "queryPipeline": PIPELINE, "clientId": visitor, "userAgent": USER_AGENT,
    }
    s1, _ = post(f"{UA_BASE}/search?visitor={visitor}", {
        **common, "actionCause": "searchboxSubmit", "actionType": "search box", "queryText": query,
        "responseTime": random.randint(40, 180), "searchQueryUid": uid, "numberOfResults": 10,
    })
    s2, _ = post(f"{UA_BASE}/click?visitor={visitor}", {
        **common, "actionCause": "documentOpen", "actionType": "document", "searchQueryUid": uid,
        "documentPosition": position, "documentTitle": doc["title"], "documentUrl": doc["clickUri"],
        "documentUri": doc["uri"], "documentUriHash": doc["urihash"], "sourceName": doc["source"],
        "collectionName": "default",
    })
    return [s1, s2]


def main() -> int:
    ap = argparse.ArgumentParser()
    ap.add_argument("--name-visits", type=int, default=2, help="visitors per Pokémon-name query")
    ap.add_argument("--topic-visits", type=int, default=8, help="visitors per topic query")
    ap.add_argument("--workers", type=int, default=6)
    ap.add_argument("--limit", type=int, default=0, help="only send N journeys (smoke test)")
    ap.add_argument("--dry-run", action="store_true")
    args = ap.parse_args()

    pokemon = [doc_info(r) for r in all_pokemon()]
    plan: list[tuple[str, dict, int]] = [(p["name"].lower(), p, 1) for p in pokemon for _ in range(args.name_visits)]
    for q in TOPIC_QUERIES:
        res = search(q, n=3)
        if not res["results"]:
            print(f"  (skip topic with no results: {q})")
            continue
        top = [doc_info(r) for r in res["results"]]
        for i in range(args.topic_visits):
            pos = 1 if i % 4 else min(2, len(top))  # mostly the top hit, sometimes the 2nd
            plan.append((q, top[pos - 1], pos))
    random.shuffle(plan)
    if args.limit:
        plan = plan[: args.limit]
    print(f"indexed Pokémon: {len(pokemon)} | journeys planned: {len(plan)} ({len(plan) * 2} events)")
    if args.dry_run:
        for q, d, pos in plan[:8]:
            print(f"  {q!r} -> {d['name']} (pos {pos})")
        return 0

    ok = fail = 0
    errors: dict[int, int] = {}
    with ThreadPoolExecutor(max_workers=args.workers) as pool:
        futures = [pool.submit(journey, q, d, pos, str(uuid.uuid4())) for q, d, pos in plan]
        for i, fut in enumerate(as_completed(futures), 1):
            for status in fut.result():
                if 200 <= status < 300:
                    ok += 1
                else:
                    fail += 1
                    errors[status] = errors.get(status, 0) + 1
            if i % 250 == 0:
                print(f"  {i}/{len(plan)} journeys sent")
    print(f"events ok: {ok}, failed: {fail} {errors if errors else ''}")
    return 0 if fail == 0 else 1


if __name__ == "__main__":
    sys.exit(main())
