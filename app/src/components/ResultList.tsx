import {
  buildInteractiveResult,
  buildQuerySummary,
  buildResultList,
  buildSearchBox,
  loadSearchActions,
  loadSearchAnalyticsActions,
  type Result,
  type SearchEngine,
} from '@coveo/headless';
import { useMemo } from 'react';
import { Link } from 'react-router-dom';
import { FIELDS_TO_INCLUDE, slugFromUri } from '../coveo/config';
import { SEARCH_BOX_OPTIONS } from '../coveo/searchBoxOptions';
import { useController } from '../hooks/useController';
import { asList } from '../coveo/fields';
import { HighlightedText } from './HighlightedText';
import { TypeBadge } from './TypeBadge';

export function ResultList({ engine }: { engine: SearchEngine }) {
  const controller = useMemo(
    () => buildResultList(engine, { options: { fieldsToInclude: FIELDS_TO_INCLUDE } }),
    [engine],
  );
  const summaryController = useMemo(() => buildQuerySummary(engine), [engine]);
  const state = useController(controller);
  const summary = useController(summaryController);

  if (state.hasError) {
    return (
      <div className="empty" role="alert">
        <h2>Search failed</h2>
        <p>The search request did not succeed. Check the organization id and the search token, then try again.</p>
        <button type="button" onClick={() => retrySearch(engine)}>
          Try again
        </button>
      </div>
    );
  }
  if (state.isLoading && !state.results.length) {
    return (
      <>
        <p className="visually-hidden" role="status">
          Searching…
        </p>
        <ul className="skeleton" aria-hidden="true">
          {Array.from({ length: 6 }, (_, index) => (
            <li key={index} />
          ))}
        </ul>
      </>
    );
  }
  if (!state.results.length && state.firstSearchExecuted) {
    return <EmptyState engine={engine} />;
  }

  return (
    <ul className="results" aria-busy={state.isLoading}>
      {state.results.map((result) => (
        <ResultCard key={result.uniqueId} engine={engine} result={result} showExcerpt={summary.hasQuery} />
      ))}
    </ul>
  );
}

function retrySearch(engine: SearchEngine) {
  const { executeSearch } = loadSearchActions(engine);
  const { logSearchboxSubmit } = loadSearchAnalyticsActions(engine);
  void engine.dispatch(executeSearch(logSearchboxSubmit()));
}

function EmptyState({ engine }: { engine: SearchEngine }) {
  const box = useMemo(() => buildSearchBox(engine, { options: SEARCH_BOX_OPTIONS }), [engine]);
  return (
    <div className="empty" role="status">
      <h2>No Pokémon match</h2>
      <p>
        Try another name, or clear the query and filters. Selecting more than one type keeps only Pokémon that have
        every one of those types.
      </p>
      <button
        type="button"
        onClick={() => {
          box.clear();
          box.submit();
        }}
      >
        Clear search and filters
      </button>
    </div>
  );
}

function ResultCard({ engine, result, showExcerpt }: { engine: SearchEngine; result: Result; showExcerpt: boolean }) {
  const interactive = useMemo(
    () => buildInteractiveResult(engine, { options: { result } }),
    [engine, result],
  );
  const raw = result.raw as Record<string, unknown>;
  const name = (typeof raw.pokemon_name === 'string' && raw.pokemon_name) || result.title;
  const number = raw.pokemon_number as number | string | undefined;
  const image = typeof raw.pokemon_image === 'string' ? raw.pokemon_image : undefined;
  const types = asList(raw.pokemon_type);
  const generation = typeof raw.pokemon_generation === 'string' ? raw.pokemon_generation : undefined;
  const species = typeof raw.pokemon_species === 'string' ? raw.pokemon_species : undefined;
  const total = typeof raw.pokemon_total === 'number' ? raw.pokemon_total : undefined;
  const slug = slugFromUri(result.clickUri);
  const href = slug ? `/pokemon/${slug}` : result.clickUri;
  const showNumber = number !== undefined && number !== '' && Number(number) !== 0;

  const body = (
    <>
      <div className="art">
        {image ? <img src={image} alt="" loading="lazy" /> : <div className="art-placeholder">?</div>}
      </div>
      <div className="meta">
        {showNumber && <span className="dex-no">#{String(number).padStart(4, '0')}</span>}
        <h2>{name}</h2>
        {species && <p className="species">{species}</p>}
        <div className="types">
          {types.map((t) => (
            <TypeBadge key={t} type={t} />
          ))}
        </div>
        <p className="card-sub">
          {generation && <span className="gen">{generation}</span>}
          {total !== undefined && <span className="total">BST {total}</span>}
        </p>
        {showExcerpt && result.excerpt && (
          <p className="excerpt">
            <HighlightedText text={result.excerpt} highlights={result.excerptHighlights} />
          </p>
        )}
      </div>
    </>
  );

  // Log the click to Coveo analytics (feeds ART / ML models) before navigating.
  const onSelect = () => interactive.select();

  return (
    <li className="card">
      {slug ? (
        <Link to={href} onClick={onSelect}>
          {body}
        </Link>
      ) : (
        <a href={href} onClick={onSelect} target="_blank" rel="noreferrer">
          {body}
        </a>
      )}
    </li>
  );
}
