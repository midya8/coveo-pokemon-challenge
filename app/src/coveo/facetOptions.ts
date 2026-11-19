import type { FacetOptions, FacetResultsMustMatch } from '@coveo/headless';

/**
 * How a facet combines selected values.
 *
 * Coveo's default is `atLeastOneValue`: `@field==(A,B)` is a disjunction.
 * `allValues` is the conjunction `@field==A @field==B`, which is what a
 * multi-value field such as `pokemon_type` needs. Fire and Flying must both
 * be present on the same Pokémon (Charizard), not either type.
 */
const ANY: FacetResultsMustMatch = 'atLeastOneValue';
const EVERY: FacetResultsMustMatch = 'allValues';

export function typeFacetOptions(field: string): FacetOptions {
  return {
    facetId: 'type',
    field,
    numberOfValues: 20,
    sortCriteria: 'occurrences',
    // Only the real multi-value type field is conjunctive. The sample org
    // reuses `filetype`, where selecting two values should stay a union.
    resultsMustMatch: field === 'pokemon_type' ? EVERY : ANY,
  };
}

export function generationFacetOptions(field: string, customSort?: string[]): FacetOptions {
  return {
    facetId: 'generation',
    field,
    numberOfValues: 20,
    sortCriteria: customSort ? 'alphanumeric' : 'occurrences',
    customSort,
    resultsMustMatch: ANY,
  };
}

export function abilitiesFacetOptions(field: string): FacetOptions {
  return {
    facetId: 'abilities',
    field,
    numberOfValues: 8,
    sortCriteria: 'occurrences',
    resultsMustMatch: ANY,
  };
}
