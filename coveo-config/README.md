# Coveo org configuration

Everything needed to set up the org lives here. The extraction rules are validated locally
against live pages with `tools/validate_scraping.py` before they go into the Admin Console.

## Source

**Type: Sitemap source**, not a Web source. A Web source would also work.

| Setting | Value |
|---|---|
| Sitemap URL | `https://pokemondb.net/static/sitemaps/pokemondb.xml` |
| Inclusion filter (regex) | `^https://pokemondb\.net/pokedex/(?!all$\|national$\|shiny$)[a-z0-9-]+$` |
| Web scraping configuration | [`web-scraping-config.json`](web-scraping-config.json) |
| Crawl rate | Honor robots.txt (`Crawl-delay: 2`), about 35 min for a full rebuild |

Why a Sitemap source:
- **Exact coverage.** The sitemap lists every Pokémon page. The filter matches 1,028 of its
  12,923 URLs (run `--sitemap` to reproduce), so the crawler never has to follow links.
- **Nothing to discover.** A Web source would need `/pokedex/national` as a starting page to find
  the links. That page is itself out of scope, so it would have to be crawled without being indexed.
- **Cheaper refreshes.** Only the pages we need are fetched, and nothing is visited just to find links.

Excluded on purpose: `/pokedex/all`, `/pokedex/national`, `/pokedex/shiny` (lists),
`/pokedex/<name>/moves/<gen>` (5,390 move pages), `/pokedex/game/*` and `/pokedex/stats/*`, plus
moves, types, abilities, items, locations and news.

**Test source (from the challenge tips):** a second Sitemap source with the same scraping config
but filtered to `^https://pokemondb\.net/pokedex/bulbasaur$`. It rebuilds in seconds, so scraping
changes can be tried without waiting for a full crawl.

## Fields

Metadata names in the scraping config match the field names, so mapping is automatic.

| Field | Type | Facet | Multi-value | Sortable | Notes |
|---|---|---|---|---|---|
| `pokemon_name` | String | | | yes | |
| `pokemon_number` | Integer 32 | | | yes | National Dex number. Gen 10 pages show `???`, so this stays empty for them |
| `pokemon_type` | String | yes | **yes** | | Grass / Poison, etc. **Type facet** |
| `pokemon_generation` | String | yes | | | `Generation 1` … `Generation 10`. **Generation facet** |
| `pokemon_image` | String | | | | Artwork URL from `og:image` |
| `pokemon_species` | String | | | | e.g. "Seed Pokémon" |
| `pokemon_height` | String | | | | |
| `pokemon_weight` | String | | | | |
| `pokemon_abilities` | String | yes | yes | | |
| `pokemon_forms` | String | | yes | | Mega and regional forms |
| `pokemon_hp` … `pokemon_speed`, `pokemon_total` | Integer 32 | | | yes | Base stats (empty for unreleased Gen 10) |

## Content exclusions (scraping config `exclude`)

Site header, nav and footer, the sprite gallery and the other-languages table. This keeps each
indexed body focused on Pokédex content, which also gives RGA cleaner passages to work from.

## Org setup (trial org `voljzmfhemcvoorg`)

Done with [`tools/coveo_setup.py`](../tools/coveo_setup.py), using an admin key from Bitwarden that can
edit fields and sources and view the org:

```bash
bws run -- tools/.venv/bin/python -I tools/coveo_setup.py fields             # create the 17 fields
bws run -- tools/.venv/bin/python -I tools/coveo_setup.py mappings "Pokemon" # metadata -> field mappings
```

| Resource | Status |
|---|---|
| 17 `pokemon_*` fields | Created by script and verified |
| `Pokemon TEST - single page` (Sitemap) | Bulbasaur only. All 17 fields indexed and verified in "View and map metadata" |
| `Pokemon - pokemondb.net` (Sitemap) | Duplicate of the test source with the full regex filter and a 2,000 ms request interval |
| Search key (Anonymous search template) | Bitwarden secret `VITE_COVEO_API_KEY` |

## Lessons learned (for the panel)
- **Scraped metadata isn't indexed without a mapping.** The crawler extracted all 17 values, but they
  showed "Not indexed" until each source had a mapping rule `pokemon_x ← %[pokemon_x]`. Having a field
  with the same name wasn't enough. The script now adds these mappings to any source in one command.
- **Facet and multi-value facet are mutually exclusive** on a field, and a multi-value field needs a
  tokenizer (`;`). The API returns a clear 412 for both. The Admin Console hides this behind toggles.
- **The Coveo API edge firewall** blocked requests sent with Python's default User-Agent, and a
  description containing `Height (`. The fixes were a named User-Agent and a reworded description.
- **Test with a single-page source first.** It rebuilds in seconds. Duplicating it into the full
  source carries over the scraping config and mappings, so the two can't drift apart.
- **Be polite to the site.** pokemondb's robots.txt sets `Crawl-delay: 2`, so the request interval is
  2,000 ms. That costs about 35 minutes per full rebuild, but it's the correct way to crawl someone else's site.

## Query pipeline
**`Pokemon Search`**, with the condition *Search Hub is `PokemonSearch`*. The app sends that search hub,
so every query from the app goes through this pipeline, and the ML models are associated with it rather
than with `default`.

## Query Suggestions: seeding a cold-start org
QS models learn only from analytics: queries followed by a click, with at least 100 events. A new
org has none, so [`tools/seed_analytics.py`](../tools/seed_analytics.py) simulates visitors on the
`PokemonSearch` hub:
- one *name journey* per indexed Pokémon (search "pikachu", open Pikachu's page), 2 visitors each
- *topic journeys* ("fire type", "legendary pokemon", "eevee evolutions"…) run against the live index;
  the visitor opens the top hit, or sometimes the second, 8 visitors each

The events use the UA v15 API with a synthetic user agent (`pokemon-challenge-seed/1.0`), so they're
easy to filter out later. In a real deployment, you'd turn on the model's *Test configuration mode*
(sandbox orgs only) or let real traffic build up.

## RGA and Passage Retrieval: not on this trial
The trial license cannot create a Relevance Generative Answering model, and
`/rest/search/v3/passages/retrieve` returns 403 `UNAUTHORIZED_ACCESS_TO_FEATURE`.
The app mounts both panels and, when the platform refuses them, shows a note
instead of a search error. A successful payload renders as soon as the license allows it.

## Query pipeline rules
[`pipeline.json`](pipeline.json) is the thesaurus, featured result, ranking expression,
and production-source filter. Apply it with [`tools/apply_pipeline.py`](../tools/apply_pipeline.py).
The command is a dry run unless `--apply` is passed, and it never deletes statements.

## Still to do
- [ ] Run `apply_pipeline.py --apply` with an admin key (the JSON is in the repo; it is not applied by CI)
- [ ] RGA model, once the license includes it
- [ ] Passage Retrieval, once the license includes it
- [x] Query Suggest model associated with `Pokemon Search` (learned queries complete; unknown phrases fall back to instant results in the UI)
