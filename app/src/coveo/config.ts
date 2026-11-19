/**
 * Coveo connection + field mapping.
 *
 * Credentials come from env vars injected at dev/build time (never committed):
 *   bws run -- npm run dev
 * with Bitwarden secrets named VITE_COVEO_ORG_ID and VITE_COVEO_API_KEY.
 *
 * Without them the app falls back to Coveo's public sample org so the UI can be
 * developed before the Pokémon org exists. Field mapping switches accordingly.
 */

export const ORG_ID: string | undefined = import.meta.env.VITE_COVEO_ORG_ID;
export const API_KEY: string | undefined = import.meta.env.VITE_COVEO_API_KEY;
export const SEARCH_HUB: string = import.meta.env.VITE_COVEO_SEARCH_HUB ?? 'PokemonSearch';
export const PIPELINE: string | undefined = import.meta.env.VITE_COVEO_PIPELINE;

export const IS_SAMPLE_ORG = !ORG_ID || !API_KEY;

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
