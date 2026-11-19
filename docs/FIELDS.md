# Pokémon fields

Seventeen `pokemon_*` fields. The scraping config in `coveo-config/web-scraping-config.json` writes metadata under these same names. A mapping rule `%[pokemon_x] → pokemon_x` is what actually indexes them. Creating the field is not enough. `coveo-config/fields.json` is the source for this table, and `tools/coveo_setup.py fields` creates whatever is missing.

Facet and multi-value facet cannot both be set. A multi-value field uses the `;` tokenizer. The scraper emits one metadata value per type or ability. The mapping joins them, and the tokenizer splits them back into facet values.

Unreleased Generation 10 pages have no national number and no base stats. Those fields stay empty. The UI hides a dex number of 0 instead of printing `#0000`.

| Field | Type | Facet | Sort | Example | Where the UI reads it |
|---|---|---|---|---|---|
| `pokemon_name` | String | no | yes | Charizard | Card title, detail heading, name sort. Not a facet, so query suggestions cannot complete it with field suggest. |
| `pokemon_number` | Long | no | yes | 6 | `#0006` on the card and the detail page. Pokédex-number sort. |
| `pokemon_type` | String, multi-value | multi-value | no | Fire; Flying | Type facet, conjunctive (`allValues`). Badges on the card and the detail page. |
| `pokemon_generation` | String | yes | no | Generation 1 | Generation facet, displayed in natural order 1…10. |
| `pokemon_image` | String | no | no | `og:image` URL | Card and detail artwork. |
| `pokemon_species` | String | no | no | Flame Pokémon | Card and detail subtitle. |
| `pokemon_height` | String | no | no | 1.7 m (5′07″) | Detail vitals. |
| `pokemon_weight` | String | no | no | 90.5 kg (199.5 lbs) | Detail vitals. |
| `pokemon_abilities` | String, multi-value | multi-value | no | Blaze; Solar Power | Ability facet (disjunction) and the detail vitals. |
| `pokemon_forms` | String, multi-value | multi-value | no | Charizard; Mega Charizard X | Detail page, only when there is more than one form. |
| `pokemon_hp` | Long | no | yes | 78 | Detail stat bar. |
| `pokemon_attack` | Long | no | yes | 84 | Detail stat bar. |
| `pokemon_defense` | Long | no | yes | 78 | Detail stat bar. |
| `pokemon_sp_atk` | Long | no | yes | 109 | Detail stat bar. |
| `pokemon_sp_def` | Long | no | yes | 85 | Detail stat bar. |
| `pokemon_speed` | Long | no | yes | 100 | Detail stat bar. |
| `pokemon_total` | Long | no | yes | 534 | Card (“BST 534”), detail total, and the stat-total sort. |

`fieldsToInclude` on the result list is `FIELDS_TO_INCLUDE` in `app/src/coveo/config.ts`. A field missing from that list will not appear on the card even if it is indexed.

The XPath for each value is in the scraping config. Types and abilities are every `a` in the matching vitals-table row. The image is `og:image`. Stats are the first number cell of each base-stat row, which skips the min/max columns further to the right.
