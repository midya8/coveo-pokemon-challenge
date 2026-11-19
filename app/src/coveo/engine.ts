import {
  buildSearchEngine,
  getSampleSearchEngineConfiguration,
  type SearchEngine,
  type SearchEngineConfiguration,
} from '@coveo/headless';
import { API_KEY, IS_SAMPLE_ORG, ORG_ID, PIPELINE, SEARCH_HUB } from './config';

function configuration(): SearchEngineConfiguration {
  if (IS_SAMPLE_ORG) {
    return getSampleSearchEngineConfiguration();
  }
  return {
    organizationId: ORG_ID!,
    accessToken: API_KEY!,
    search: { searchHub: SEARCH_HUB, pipeline: PIPELINE },
    analytics: { trackingId: 'pokemon-challenge' },
  };
}

/** Main engine shared by the search page. */
export const searchEngine: SearchEngine = buildSearchEngine({ configuration: configuration() });

/** A fresh, isolated engine (used by the detail page so it doesn't clobber search state). */
export function createEngine(): SearchEngine {
  return buildSearchEngine({ configuration: configuration() });
}
