export type TypeaheadMode = 'suggestions' | 'index-fallback' | 'idle';

/**
 * Query Suggestions come from the ML model. When that model has nothing for the
 * current text, the box falls back to instant results from the index instead
 * of showing an empty list. `pokemon_name` is not a facet field, so field
 * suggestions cannot complete names.
 */
export function typeaheadMode(
  suggestionCount: number,
  query: string,
  suggestionsLoading: boolean,
): TypeaheadMode {
  if (suggestionCount > 0) return 'suggestions';
  if (suggestionsLoading) return 'idle';
  if (query.trim().length >= 2) return 'index-fallback';
  return 'idle';
}
