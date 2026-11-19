import type { Route } from '@playwright/test';

interface FacetValueRequest {
  value: string;
  state: string;
}

interface FacetRequest {
  facetId?: string;
  field?: string;
  currentValues?: FacetValueRequest[];
  resultsMustMatch?: string;
}

interface SearchBody {
  q?: string;
  aq?: string;
  numberOfResults?: number;
  facets?: FacetRequest[];
}

const TYPES = [
  ['Fire', 82],
  ['Flying', 109],
  ['Water', 155],
] as const;

export function selectedTypes(body: SearchBody): string[] {
  const facet = body.facets?.find((item) => item.field === 'pokemon_type');
  return (facet?.currentValues ?? []).filter((value) => value.state === 'selected').map((value) => value.value);
}

export function resultsMustMatch(body: SearchBody): string | undefined {
  return body.facets?.find((item) => item.field === 'pokemon_type')?.resultsMustMatch;
}

function result(name: string, slug: string, number: number, types: string[], total: number) {
  return {
    title: name,
    uri: `https://pokemondb.net/pokedex/${slug}`,
    clickUri: `https://pokemondb.net/pokedex/${slug}`,
    printableUri: `https://pokemondb.net/pokedex/${slug}`,
    uniqueId: slug,
    excerpt: `${name} is a test result.`,
    excerptHighlights: [],
    titleHighlights: [],
    firstSentences: '',
    firstSentencesHighlights: [],
    summary: '',
    summaryHighlights: [],
    flags: '',
    hasHtmlVersion: false,
    hasMobileHtmlVersion: false,
    score: 1000,
    percentScore: 100,
    rating: 0,
    isTopResult: false,
    isRecommendation: false,
    absentTerms: [],
    childResults: [],
    totalNumberOfChildResults: 0,
    parentResult: null,
    rankingInfo: null,
    raw: {
      pokemon_name: name,
      pokemon_number: number,
      pokemon_type: types,
      pokemon_generation: 'Generation 1',
      pokemon_species: 'Flame Pokémon',
      pokemon_total: total,
      urihash: slug,
      permanentid: slug,
    },
  };
}

const CHARIZARD = result('Charizard', 'charizard', 6, ['Fire', 'Flying'], 534);
const MOLTRES = result('Moltres', 'moltres', 146, ['Fire', 'Flying'], 580);
const BULBASAUR = result('Bulbasaur', 'bulbasaur', 1, ['Grass', 'Poison'], 318);

function facetValues(field: string | undefined, current: FacetValueRequest[] | undefined) {
  const selected = new Set((current ?? []).filter((value) => value.state === 'selected').map((value) => value.value));
  const defaults =
    field === 'pokemon_type'
      ? TYPES.map(([value, count]) => ({ value, count }))
      : field === 'pokemon_generation'
        ? [{ value: 'Generation 1', count: 151 }]
        : [{ value: 'Blaze', count: 3 }];
  const known = new Map(defaults.map((item) => [item.value, item.count]));
  for (const value of current ?? []) known.set(value.value, known.get(value.value) ?? 1);
  return [...known.entries()].map(([value, count]) => ({
    value,
    numberOfResults: count,
    state: selected.has(value) ? 'selected' : 'idle',
  }));
}

export function searchResponse(body: SearchBody) {
  const selected = selectedTypes(body);
  const both = selected.includes('Fire') && selected.includes('Flying');
  const named = (body.q ?? '').toLowerCase().includes('charizard');
  const detail = (body.aq ?? '').toLowerCase();
  const results = detail.includes('charizard')
    ? [CHARIZARD]
    : detail.includes('moltres')
      ? [MOLTRES]
      : both || named
        ? [CHARIZARD, MOLTRES]
        : [BULBASAUR, CHARIZARD];
  return {
    results,
    searchUid: 'playwright-search',
    totalCount: results.length,
    totalCountFiltered: results.length,
    duration: 12,
    indexDuration: 4,
    requestDuration: 12,
    facets: (body.facets ?? []).map((facet) => ({
      facetId: facet.facetId,
      field: facet.field,
      moreValuesAvailable: false,
      indexScore: 0,
      values: facetValues(facet.field, facet.currentValues),
    })),
    queryCorrections: [],
    triggers: [],
    termsToHighlight: {},
    phrasesToHighlight: {},
    groupByResults: [],
    questionAnswer: { answers: [] },
    pipeline: 'Pokemon Search',
    splitTestRun: 'not-running',
    extendedResults: {},
  };
}

export async function fulfillCoveo(route: Route) {
  const request = route.request();
  const url = request.url();
  if (url.includes('/querySuggest')) {
    const body = JSON.parse(request.postData() || '{}') as { q?: string };
    const q = body.q ?? '';
    const completions = q.toLowerCase().startsWith('char')
      ? [{ expression: 'charizard', score: 10, highlighted: 'charizard' }]
      : [];
    await route.fulfill({ json: { completions, responseId: 'playwright-suggest' } });
    return;
  }
  if (url.includes('/passages/')) {
    await route.fulfill({
      status: 403,
      json: { statusCode: 403, errorCode: 'UNAUTHORIZED_ACCESS_TO_FEATURE', message: 'not licensed' },
    });
    return;
  }
  if (url.includes('/rest/search/v2') && request.method() === 'POST') {
    const body = JSON.parse(request.postData() || '{}') as SearchBody;
    await route.fulfill({ json: searchResponse(body) });
    return;
  }
  await route.fulfill({ status: 200, json: {} });
}
