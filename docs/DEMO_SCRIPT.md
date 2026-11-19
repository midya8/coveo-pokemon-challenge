# 10-minute demo

A live run-through for the panel. The app is already open at the deployed site, or locally with `VITE_COVEO_API_KEY` set. Start on a fresh search: no query, no facets. Relevance sort.

Say what you are about to click before you click it. The interesting part is the Coveo behavior, not the Pokémon.

## 0:00 Open on the empty search

Point at three things and keep moving:

- The search hub is `PokemonSearch`, so this query is on the **Pokemon Search** pipeline, not `default`.
- Usage analytics is the legacy v15 protocol. That is the same stream the Query Suggestions model learns from. Clicks go through `buildInteractiveResult`.
- Headless owns the query, the URL hash, and the facet state. React only renders.

## 1:30 The bug the facet used to have

Select **Type → Fire**, then **Flying**.

Say: a Coveo facet is a disjunction unless you say otherwise. Fire plus Flying used to be `@pokemon_type==(Fire,Flying)`, about 185 Pokémon, and Charizard was not on page 1.

The facet is now `resultsMustMatch: "allValues"`. The summary should read **1–6 of 6**. Name them: Oricorio, Talonflame, Fletchinder, Ho-oh, Moltres, **Charizard**. Charizard is last because relevance with an empty query is not “most famous.” He is on the page, which is the point. The hint under Type says “Match all selected types.”

If someone asks about the counts still showing Fire 82 and Flying 109: those counts ignore this facet’s own selection, so you can still see how common each type is. The result total is the conjunction. Generation and Ability stay OR. A Pokémon has one generation.

## 3:30 Open Charizard and come back

Open the card. Point at the fields that came from the index, not from a second website fetch: types, generation, height, weight, abilities, forms, base stats. The source link is the only trip to pokemondb.

**Back to search.** The hash still has Fire and Flying. That is `buildUrlManager`, plus the session hash the Back link reads.

## 5:00 Query suggestions, then the empty case

Type `char`. If the model has learned it, you get suggestions such as charizard and charmeleon. Pick one. That click is a query-suggest analytics event.

Clear the box and type `zzznone` (or any nonsense). The model returns nothing. The box should say **No query suggestions for that text** and show instant results from the index, or say the index had nothing either. `pokemon_name` is not a facet field, so this fallback is `buildInstantResults`, not field suggestions. Field suggestions on that field return `INVALID_FACET_FIELD`.

## 6:30 Sort, a second facet, and the unlicensed panels

- Sort by **Pokédex number**. Charizard moves to the top of the six. Sort does not change the filter.
- Open **Ability**. The counts are small because Fire and Flying are still on. That is a different facet, so its counts respect the type filter.
- Scroll to the **Passage Retrieval** note. One probe returned 403. The note is the handling. Search itself did not fail. Relevance Generative Answering is mounted and stays quiet until a pipeline actually returns an answer. This trial has no RGA model.

## 8:00 What is in the repo, not in the click-path

Only if there is time:

- `coveo-config/pipeline.json` is the thesaurus (`fire lizard` ↔ charizard), a featured result, and a ranking expression. `tools/apply_pipeline.py` is dry-run unless `--apply` is passed, and it never deletes. Those rules are not on the org until an admin key runs them, so do not demo `fire lizard` as if the alias already works.
- The index is the sitemap source, 1,028 Pokédex pages, crawl delay 2 seconds. `tools/verify_index.py` checks this same Fire AND Flying case.

## 9:30 Stop

Clear the filters from the breadcrumb. You are back to the full dex. Offer questions.

## If something fails

| What you see | Do this | What to say |
|---|---|---|
| The page is the public sample org (“Set `VITE_COVEO_API_KEY`”) | Stop. The token did not make the build. Open the last deployed Pages URL, or restart `npm run dev` with the env file. | The UI falls back on purpose so a missing token still renders. The Pokémon index needs the search token. |
| Fire + Flying returns ~185, Charizard missing | You are on a build from before the facet change. | The disjunction is the old behavior. `resultsMustMatch` is the fix. |
| Fire + Flying returns 0 | Deselect both and reselect. If it persists, the pipeline or the `cq` source filter is wrong. | The constant query limits results to `Pokemon - pokemondb.net`. |
| Suggestions never appear, including for `char` | Use the nonsense-word path on purpose. | The model only completes phrases it has learned. Instant results are the designed fallback. |
| The suggestion call hangs or the box spins | Press Escape, then Search on `charizard`. | Query suggest is a separate request. The search itself does not wait on it. |
| Passage note never appears | Do not refresh in a loop. | The probe runs once per page load. A missing note means the call has not returned, not that search is broken. |
| A red “Search failed” | Read the status in the network panel. Do not paste the token. | A 401 or 403 on `/rest/search/v2` is the search key. A 403 on `/passages/` is the license and should be the note, not this banner. |
| The network is down | Walk the code: `typeFacetOptions` sets `allValues`, `SearchBox` chooses the fallback in `typeaheadMode`, `PassageRetrieval` interprets 403. | The demo is the integration. The contracts are unit-tested, and `app/e2e` drives the same clicks against a stub. |

Do not turn on the browser console and scroll past tokens. The search key is in the bundle because Coveo search tokens are meant for the browser. Do not read it aloud or copy it into a slide.
