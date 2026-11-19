import { describe, expect, it } from 'vitest';
import { abilitiesFacetOptions, generationFacetOptions, typeFacetOptions } from './facetOptions';

describe('type facet', () => {
  it('requires every selected type so Fire and Flying is a conjunction', () => {
    const options = typeFacetOptions('pokemon_type');
    expect(options.field).toBe('pokemon_type');
    expect(options.facetId).toBe('type');
    expect(options.resultsMustMatch).toBe('allValues');
  });

  it('does not force conjunction on the sample-org stand-in field', () => {
    expect(typeFacetOptions('filetype').resultsMustMatch).toBe('atLeastOneValue');
  });
});

describe('other facets', () => {
  it('keeps generation as a disjunction because a Pokémon has one generation', () => {
    const options = generationFacetOptions('pokemon_generation', ['Generation 1', 'Generation 2']);
    expect(options.resultsMustMatch).toBe('atLeastOneValue');
    expect(options.sortCriteria).toBe('alphanumeric');
    expect(options.customSort).toEqual(['Generation 1', 'Generation 2']);
  });

  it('keeps abilities as a disjunction', () => {
    expect(abilitiesFacetOptions('pokemon_abilities').resultsMustMatch).toBe('atLeastOneValue');
  });
});
