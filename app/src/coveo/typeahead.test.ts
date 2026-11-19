import { describe, expect, it } from 'vitest';
import { typeaheadMode } from './typeahead';

describe('typeaheadMode', () => {
  it('shows machine-learning suggestions when the model returned any', () => {
    expect(typeaheadMode(3, 'char', false)).toBe('suggestions');
  });

  it('waits while suggestions are still loading', () => {
    expect(typeaheadMode(0, 'charizard', true)).toBe('idle');
  });

  it('falls back to the index when the model has nothing for a real query', () => {
    expect(typeaheadMode(0, 'fire lizard', false)).toBe('index-fallback');
  });

  it('stays closed for a very short query with no suggestions', () => {
    expect(typeaheadMode(0, 'f', false)).toBe('idle');
  });
});
