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

## Still to do in the org (needs org access)
- [ ] Create the fields above, then the Sitemap source(s), then rebuild
- [ ] Create a search API key (search only, anonymous), stored in Bitwarden Secrets Manager
- [ ] Query pipeline + Query Suggest model (Advanced)
- [ ] RGA model on the Pokémon source (Advanced)
- [ ] Send the Org ID to Will to get Passage Retrieval enabled (Bonus)
