import { describe, expect, it } from 'vitest';
import { slugFromUri } from './config';
import { asList } from './fields';

describe('asList', () => {
  it('returns an empty list for missing values', () => {
    expect(asList(undefined)).toEqual([]);
    expect(asList(null)).toEqual([]);
    expect(asList('')).toEqual([]);
  });

  it('wraps a single Coveo field value', () => {
    expect(asList('Fire')).toEqual(['Fire']);
  });

  it('stringifies multi-value field arrays', () => {
    expect(asList(['Fire', 'Flying'])).toEqual(['Fire', 'Flying']);
  });
});

describe('slugFromUri', () => {
  it('reads the Pokédex slug from a pokemondb uri', () => {
    expect(slugFromUri('https://pokemondb.net/pokedex/charizard')).toBe('charizard');
  });

  it('returns null for a uri outside the Pokédex', () => {
    expect(slugFromUri('https://example.com/charizard')).toBeNull();
  });
});
