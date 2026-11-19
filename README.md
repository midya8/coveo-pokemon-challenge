# Pokédex Search: Coveo Pokémon Challenge

A Coveo-powered search experience over [pokemondb.net](https://pokemondb.net), built with
**Coveo Headless + React**.

| Folder | What's in it |
|---|---|
| [`coveo-config/`](coveo-config/) | Org setup: source settings, web scraping config, field definitions |
| [`tools/`](tools/) | Local validator for the scraping config (URL scoping + extraction) |
| [`app/`](app/) | The search UI (Vite + React + TypeScript + `@coveo/headless`) |

## Why Headless instead of Atomic
The challenge needs a custom result card (artwork, type badges), a naturally sorted Generation facet
(1 … 10, where plain alphanumeric sorting would put 10 after 1) and a separate detail page. Headless
provides Coveo's state, analytics and API handling while leaving the markup and routing to us.

## Run it

```bash
cd app && npm install
npm run dev                  # no credentials: uses Coveo's public sample org
bws run -- npm run dev       # with the Pokémon org (VITE_COVEO_ORG_ID / VITE_COVEO_API_KEY in Bitwarden)
```

Credentials are never committed. The API key is a search-only key stored in Bitwarden Secrets Manager
and injected as env vars at dev and build time.

## Validate the scraping config

```bash
python3 -m venv tools/.venv && tools/.venv/bin/pip install -r tools/requirements.txt
tools/.venv/bin/python -I tools/validate_scraping.py --sitemap bulbasaur charizard rotom browt
```

## Status

**Essential**
- [x] Crawl scope: 1,028 Pokémon pages, everything else excluded (checked against the live sitemap)
- [x] Web scraping config: type, generation, image, stats and more (checked on edge cases)
- [x] Search page: search box with suggestions, Type and Generation facets, artwork in results, sort, paging, shareable URL state
- [ ] Org: create fields and sources, rebuild, connect the app *(waiting on org access)*

**Intermediate**
- [ ] GitHub repo
- [ ] Hosting

**Advanced**
- [x] Pokémon detail page (`/pokemon/:slug`, loaded from the index)
- [x] RGA UI component (renders once an RGA model is on the pipeline)
- [ ] RGA model + Query Suggest model in the org
- [ ] Presentation

**Bonus**
- [ ] Passage Retrieval API (needs Coveo to enable it on the org)
