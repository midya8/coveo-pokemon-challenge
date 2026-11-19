import type { SearchBoxOptions } from '@coveo/headless';

/** Shared by the search box and instant results so the two controllers stay in sync. */
export const SEARCH_BOX_ID = 'pokedex-search';

export const SEARCH_BOX_OPTIONS: SearchBoxOptions = {
  id: SEARCH_BOX_ID,
  numberOfSuggestions: 6,
  clearFilters: true,
  highlightOptions: {
    notMatchDelimiters: { open: '<strong>', close: '</strong>' },
    correctionDelimiters: { open: '<em>', close: '</em>' },
  },
};
