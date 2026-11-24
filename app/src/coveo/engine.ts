import {
  buildSearchEngine,
  getOrganizationEndpoints,
  getSampleSearchEngineConfiguration,
  loadAdvancedSearchQueryActions,
  type SearchEngine,
  type SearchEngineConfiguration,
} from '@coveo/headless';
import { API_KEY, ORG_ID, PIPELINE, SEARCH_HUB, SOURCE_FILTER } from './config';

export interface EngineConfigInput {
  organizationId: string;
  accessToken?: string;
  searchHub: string;
  pipeline?: string;
}

/**
 * Search-hub analytics stay on Usage Analytics v15 (`analyticsMode: 'legacy'`).
 * The Query Suggestions model and `tools/seed_analytics.py` learn from those
 * events, where origin level 1 is the search hub. A placeholder `trackingId`
 * would only matter for the newer Event Protocol, and a fake one is rejected.
 */
export function engineConfiguration(input: EngineConfigInput): SearchEngineConfiguration {
  if (!input.accessToken) {
    return getSampleSearchEngineConfiguration();
  }
  return {
    organizationId: input.organizationId,
    accessToken: input.accessToken,
    organizationEndpoints: getOrganizationEndpoints(input.organizationId),
    search: {
      searchHub: input.searchHub,
      ...(input.pipeline ? { pipeline: input.pipeline } : {}),
    },
    analytics: {
      enabled: true,
      analyticsMode: 'legacy',
      originContext: 'Search',
      anonymous: true,
    },
    preprocessRequest: withPartialMatch,
  };
}

/**
 * Natural-language questions ("what does sprigatito evolve into") contain words the page
 * doesn't, and Coveo requires every keyword by default, so they returned nothing and RGA had
 * nothing to ground on. Partial match keeps results when at least half of 3+ keywords match.
 * (The v1 pipeline statements API rejects `override query`, so this lives in the client.)
 */
export const withPartialMatch: NonNullable<SearchEngineConfiguration['preprocessRequest']> = (request, clientOrigin) => {
  if (clientOrigin !== 'searchApiFetch' || typeof request.body !== 'string') return request;
  try {
    const body = JSON.parse(request.body) as Record<string, unknown>;
    if (typeof body.q !== 'string' || !body.q.trim()) return request;
    request.body = JSON.stringify({
      ...body,
      partialMatch: true,
      partialMatchKeywords: 3,
      partialMatchThreshold: '50%',
    });
  } catch {
    /* not a JSON search body: leave it untouched */
  }
  return request;
};

function configuration(): SearchEngineConfiguration {
  return engineConfiguration({
    organizationId: ORG_ID,
    accessToken: API_KEY,
    searchHub: SEARCH_HUB,
    pipeline: PIPELINE,
  });
}

/** A fresh, isolated engine scoped to the production Pokémon source. */
export function createEngine(): SearchEngine {
  const engine = buildSearchEngine({ configuration: configuration() });
  if (API_KEY) {
    const { registerAdvancedSearchQueries } = loadAdvancedSearchQueryActions(engine);
    engine.dispatch(registerAdvancedSearchQueries({ cq: SOURCE_FILTER }));
  }
  return engine;
}

/** Main engine shared by the search page. */
export const searchEngine: SearchEngine = createEngine();
