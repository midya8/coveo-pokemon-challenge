import { buildQuerySummary, buildUrlManager } from '@coveo/headless';
import { useEffect, useMemo } from 'react';
import { Facet } from '../components/Facet';
import { GeneratedAnswer } from '../components/GeneratedAnswer';
import { PassageRetrieval } from '../components/PassageRetrieval';
import { ResultList } from '../components/ResultList';
import { SearchBox } from '../components/SearchBox';
import { Breadcrumbs, DidYouMean, Pager, QuerySummary, SortSelect } from '../components/SearchChrome';
import { TypeBadge } from '../components/TypeBadge';
import { IS_SAMPLE_ORG } from '../coveo/config';
import { searchEngine } from '../coveo/engine';
import { abilitiesFacet, generationFacet, typeFacet } from '../coveo/facetOptions';
import { useController } from '../hooks/useController';
import { useDocumentTitle } from '../hooks/useDocumentTitle';

let firstSearchDone = false;

export function SearchPage() {
  const summaryController = useMemo(() => buildQuerySummary(searchEngine), []);
  const summary = useController(summaryController);
  useDocumentTitle(summary.hasQuery ? summary.query : undefined);
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
          Running against Coveo’s public sample org. Set <code>VITE_COVEO_API_KEY</code> to search the Pokémon index.
        </p>
      )}
      <SearchBox engine={searchEngine} />
      <Breadcrumbs engine={searchEngine} />
      <div className="layout">
        <aside className="facets" aria-label="Filters">
          <Facet
            engine={searchEngine}
            options={typeFacet}
            title="Type"
            hint={typeFacet.resultsMustMatch === 'allValues' ? 'Match all selected types.' : undefined}
            renderValue={IS_SAMPLE_ORG ? undefined : (v) => <TypeBadge type={v} />}
          />
          <Facet engine={searchEngine} options={generationFacet} title="Generation" />
          {abilitiesFacet && <Facet engine={searchEngine} options={abilitiesFacet} title="Ability" />}
        </aside>
        <main id="results" className="results-pane">
          <div className="results-header">
            <QuerySummary engine={searchEngine} />
            <SortSelect engine={searchEngine} />
          </div>
          <DidYouMean engine={searchEngine} />
          <GeneratedAnswer engine={searchEngine} />
          <ResultList engine={searchEngine} />
          <Pager engine={searchEngine} />
          <PassageRetrieval />
        </main>
      </div>
    </div>
  );
}
