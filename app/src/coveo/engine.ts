import {
  buildSearchEngine,
  getSampleSearchEngineConfiguration,
  loadAdvancedSearchQueryActions,
  type SearchEngine,
  type SearchEngineConfiguration,
} from '@coveo/headless';
import { API_KEY, IS_SAMPLE_ORG, ORG_ID, PIPELINE, SEARCH_HUB, SOURCE_FILTER } from './config';

function configuration(): SearchEngineConfiguration {
  if (IS_SAMPLE_ORG) {
    return getSampleSearchEngineConfiguration();
  }
  return {
    organizationId: ORG_ID,
    accessToken: API_KEY!,
    search: { searchHub: SEARCH_HUB, pipeline: PIPELINE },
    analytics: { trackingId: 'pokemon-challenge' },
  };
}

/** A fresh, isolated engine scoped to the production Pokémon source. */
export function createEngine(): SearchEngine {
  const engine = buildSearchEngine({ configuration: configuration() });
  if (!IS_SAMPLE_ORG) {
    const { registerAdvancedSearchQueries } = loadAdvancedSearchQueryActions(engine);
    engine.dispatch(registerAdvancedSearchQueries({ cq: SOURCE_FILTER }));
  }
  return engine;
}

/** Main engine shared by the search page. */
export const searchEngine: SearchEngine = createEngine();
