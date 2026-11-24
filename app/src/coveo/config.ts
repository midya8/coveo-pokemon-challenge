/**
 * Coveo connection + field mapping.
 *
 * The org ID is not a secret. The search API key is injected at dev/build time from
 * Bitwarden Secrets Manager and never committed:
 *   bws run -- npm run dev
 * (secret name: VITE_COVEO_API_KEY, an "Anonymous search" key, safe to ship to browsers).
 *
 * Without the key the app falls back to Coveo's public sample org so the UI still runs.
 */

export const ORG_ID: string = import.meta.env.VITE_COVEO_ORG_ID ?? 'agsqwaoevfcvoorg';
export const API_KEY: string | undefined = import.meta.env.VITE_COVEO_API_KEY;
export const SEARCH_HUB: string = import.meta.env.VITE_COVEO_SEARCH_HUB ?? 'PokemonSearch';
export const PIPELINE: string | undefined = import.meta.env.VITE_COVEO_PIPELINE;

export const IS_SAMPLE_ORG = !API_KEY;

/**
 * Constant query: only the production source. The org also has a single-page test source
 * used to iterate on the scraping config, which would otherwise show up as a duplicate.
 */
export const SOURCE_FILTER = '@source=="Pokemon - pokemondb.net"';

export const FIELDS = IS_SAMPLE_ORG
  ? {
      // Sample org has no Pokémon fields; reuse standard ones so the UI renders.
      type: 'filetype',
      generation: 'source',
      image: 'pokemon_image',
      number: 'pokemon_number',
    }
  : {
      type: 'pokemon_type',
      generation: 'pokemon_generation',
      image: 'pokemon_image',
      number: 'pokemon_number',
    };

/** Every field the result cards and detail page read. */
export const FIELDS_TO_INCLUDE = [
  'pokemon_name',
  'pokemon_number',
  'pokemon_type',
  'pokemon_generation',
  'pokemon_image',
  'pokemon_species',
  'pokemon_height',
  'pokemon_weight',
  'pokemon_abilities',
  'pokemon_forms',
  'pokemon_hp',
  'pokemon_attack',
  'pokemon_defense',
  'pokemon_sp_atk',
  'pokemon_sp_def',
  'pokemon_speed',
  'pokemon_total',
  FIELDS.type,
  FIELDS.generation,
];

/** "Generation 1" … "Generation 10" in natural order (alphanumeric sort would put 10 after 1). */
export const GENERATION_ORDER = Array.from({ length: 10 }, (_, i) => `Generation ${i + 1}`);

export const POKEDEX_URL_PREFIX = 'https://pokemondb.net/pokedex/';

export function slugFromUri(uri: string): string | null {
  return uri.startsWith(POKEDEX_URL_PREFIX) ? uri.slice(POKEDEX_URL_PREFIX.length) : null;
}
