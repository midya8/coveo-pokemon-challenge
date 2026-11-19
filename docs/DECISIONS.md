# Decision log

Short record of choices that would otherwise only be visible by reading the code. Each one is reversible.

## Headless, not Atomic

The result card, the generation order `Generation 1` … `Generation 10`, and the `/pokemon/:slug` route are custom. Atomic would own the markup and the router. Headless keeps Coveo’s state, analytics, and request building and leaves those three to React.

## Type facet is a conjunction

`pokemon_type` is a multi-value facet. The default operator is OR, and Fire plus Flying returned 185 Pokémon with Charizard off page 1. `resultsMustMatch: "allValues"` is the Headless form of the old JSUI AND facet. An `aq` of `@pokemon_type==Fire AND @pokemon_type==Flying` would filter results and then disagree with the facet controller, the URL manager, and facet analytics.

Generation and Ability stay OR. A Pokémon has one generation, and “has any of these abilities” is the useful reading.

## Instant results when suggestions are empty

The Query Suggestions model completes phrases it has learned and returns nothing otherwise. `pokemon_name` is sortable and free-text. It is not a facet field, and the values API rejects it with `INVALID_FACET_FIELD`. Making it a facet needs an admin change and a reindex. `buildInstantResults` answers the same keystrokes from the index without that change. Field suggestions were not attached to the Type facet either: a second registration of facet id `type` can overwrite the conjunctive options.

## Analytics stays on v15

`analyticsMode` is `legacy`. The seed script and the Query Suggestions model use Usage Analytics v15, where origin level 1 is the search hub. A placeholder `trackingId` belongs to the Event Protocol and would not feed that model. Events are anonymous. There is no signed-in user.

## Sitemap source, not Push

The pages already exist on pokemondb, the sitemap lists them, and the crawl delay is 2 seconds. A Push copy would drift from the site and would still have to fetch every page. `tools/coveo_setup.py` only adds missing fields and mappings. `tools/verify_index.py` checks the Fire AND Flying result against the live index.

## Passage Retrieval and RGA fail quietly

The trial returns 403 `UNAUTHORIZED_ACCESS_TO_FEATURE` for passages, and there is no RGA model on the pipeline. The passage probe runs once per page load and renders a note. `buildGeneratedAnswer` returns nothing when it has an error, so a missing license does not become a failed search. A successful payload still renders.

## Pipeline rules are data, and applying them is opt-in

`coveo-config/pipeline.json` is the filter, thesaurus, featured result, and ranking expression. The apply script validates each write, updates by the `pokemon-challenge:` description, and never deletes. CI does not call the Platform API. The app keeps its own `cq` so the test source stays hidden even when the pipeline filter has not been applied.

## The detail page has its own engine

One shared engine would replace the search the Back button is supposed to restore. A second engine runs `@uri==…` for that Pokémon only. The search page’s engine is left alone, and the hash brings the filters back.
