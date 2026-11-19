import { buildUrlManager } from '@coveo/headless';
import { useEffect } from 'react';
import { Facet } from '../components/Facet';
import { GeneratedAnswer } from '../components/GeneratedAnswer';
import { ResultList } from '../components/ResultList';
import { SearchBox } from '../components/SearchBox';
import { Pager, QuerySummary, SortSelect } from '../components/SearchChrome';
import { TypeBadge } from '../components/TypeBadge';
import { FIELDS, GENERATION_ORDER, IS_SAMPLE_ORG } from '../coveo/config';
import { generationFacetOptions, typeFacetOptions } from '../coveo/facetOptions';
import { searchEngine } from '../coveo/engine';

let firstSearchDone = false;

// Module scope so the facet controllers are not rebuilt on every render.
const typeFacet = typeFacetOptions(FIELDS.type);
const generationFacet = generationFacetOptions(FIELDS.generation, IS_SAMPLE_ORG ? undefined : GENERATION_ORDER);

export function SearchPage() {
  // Keep search state in the URL hash so searches are shareable and survive Back from a detail page.
  useEffect(() => {
    const fragment = () => window.location.hash.slice(1);
    const urlManager = buildUrlManager(searchEngine, { initialState: { fragment: fragment() } });
    const unsubscribe = urlManager.subscribe(() => {
      const next = `#${urlManager.state.fragment}`;
      if (window.location.hash !== next) {
        history.pushState(history.state, '', `${window.location.pathname}${window.location.search}${next}`);
      }
    });
    const onHashChange = () => urlManager.synchronize(fragment());
    window.addEventListener('hashchange', onHashChange);
    if (!firstSearchDone) {
      firstSearchDone = true;
      searchEngine.executeFirstSearch();
    } else {
      urlManager.synchronize(fragment());
    }
    return () => {
      window.removeEventListener('hashchange', onHashChange);
      unsubscribe();
    };
  }, []);

  return (
    <div className="search-page">
      {IS_SAMPLE_ORG && (
        <p className="notice sample">
          Running against Coveo’s public sample org. Set{' '}
          <code>VITE_COVEO_API_KEY</code> (via <code>bws run</code>) to search the Pokémon index.
        </p>
      )}
      <SearchBox engine={searchEngine} />
      <div className="layout">
        <aside className="facets">
          <Facet
            engine={searchEngine}
            options={typeFacet}
            title="Type"
            hint={typeFacet.resultsMustMatch === 'allValues' ? 'Match all selected types.' : undefined}
            renderValue={IS_SAMPLE_ORG ? undefined : (v) => <TypeBadge type={v} />}
          />
          <Facet engine={searchEngine} options={generationFacet} title="Generation" />
        </aside>
        <main className="results-pane">
          <div className="results-header">
            <QuerySummary engine={searchEngine} />
            <SortSelect engine={searchEngine} />
          </div>
          <GeneratedAnswer engine={searchEngine} />
          <ResultList engine={searchEngine} />
          <Pager engine={searchEngine} />
        </main>
      </div>
    </div>
  );
}
