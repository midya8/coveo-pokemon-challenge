import { describe, expect, it } from 'vitest';
import { documentTitle } from './documentTitle';

describe('documentTitle', () => {
  it('uses the product name when nothing is selected', () => {
    expect(documentTitle()).toBe('Pokédex Search · Coveo');
    expect(documentTitle('  ')).toBe('Pokédex Search · Coveo');
  });

  it('puts the query or Pokémon name first', () => {
    expect(documentTitle('charizard')).toBe('charizard · Pokédex Search');
  });
});
