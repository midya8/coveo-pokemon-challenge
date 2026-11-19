import {
  buildInteractiveResult,
  buildResultList,
  type Result,
  type SearchEngine,
} from '@coveo/headless';
import { useMemo } from 'react';
import { Link } from 'react-router-dom';
import { FIELDS_TO_INCLUDE, slugFromUri } from '../coveo/config';
import { useController } from '../hooks/useController';
import { asList } from '../coveo/fields';
import { TypeBadge } from './TypeBadge';

export function ResultList({ engine }: { engine: SearchEngine }) {
  const controller = useMemo(
    () => buildResultList(engine, { options: { fieldsToInclude: FIELDS_TO_INCLUDE } }),
    [engine],
  );
  const state = useController(controller);

  if (state.hasError) return <p className="notice error">Search failed. Check the org configuration.</p>;
  if (!state.results.length && state.firstSearchExecuted && !state.isLoading) {
    return <p className="notice">No Pokémon match that search.</p>;
  }

  return (
    <ul className="results">
      {state.results.map((result) => (
        <ResultCard key={result.uniqueId} engine={engine} result={result} />
      ))}
    </ul>
  );
}

function ResultCard({ engine, result }: { engine: SearchEngine; result: Result }) {
  const interactive = useMemo(
    () => buildInteractiveResult(engine, { options: { result } }),
    [engine, result],
  );
  const raw = result.raw as Record<string, unknown>;
  const name = (raw.pokemon_name as string) || result.title;
  const number = raw.pokemon_number as number | string | undefined;
  const image = raw.pokemon_image as string | undefined;
  const types = asList(raw.pokemon_type);
  const generation = raw.pokemon_generation as string | undefined;
  const slug = slugFromUri(result.clickUri);
  const href = slug ? `/pokemon/${slug}` : result.clickUri;

  const body = (
    <>
      <div className="art">
        {image ? <img src={image} alt={name} loading="lazy" /> : <div className="art-placeholder">?</div>}
      </div>
      <div className="meta">
        {number !== undefined && <span className="dex-no">#{String(number).padStart(4, '0')}</span>}
        <h2>{name}</h2>
        <div className="types">
          {types.map((t) => (
            <TypeBadge key={t} type={t} />
          ))}
        </div>
        {generation && <span className="gen">{generation}</span>}
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
