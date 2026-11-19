import { buildResultList, loadAdvancedSearchQueryActions } from '@coveo/headless';
import { useMemo } from 'react';
import { Link, useParams } from 'react-router-dom';
import { TypeBadge } from '../components/TypeBadge';
import { asList } from '../coveo/fields';
import { FIELDS_TO_INCLUDE, IS_SAMPLE_ORG, POKEDEX_URL_PREFIX, SOURCE_FILTER } from '../coveo/config';
import { createEngine } from '../coveo/engine';
import { useController } from '../hooks/useController';

const STATS: { field: string; label: string }[] = [
  { field: 'pokemon_hp', label: 'HP' },
  { field: 'pokemon_attack', label: 'Attack' },
  { field: 'pokemon_defense', label: 'Defense' },
  { field: 'pokemon_sp_atk', label: 'Sp. Atk' },
  { field: 'pokemon_sp_def', label: 'Sp. Def' },
  { field: 'pokemon_speed', label: 'Speed' },
];
const STAT_MAX = 255;

/** Detail page: fetches the single indexed document for this Pokémon from Coveo. */
export function PokemonPage() {
  const { slug = '' } = useParams();
  const uri = `${POKEDEX_URL_PREFIX}${slug}`;

  const resultList = useMemo(() => {
    const engine = createEngine();
    const { registerAdvancedSearchQueries } = loadAdvancedSearchQueryActions(engine);
    // Re-state the source filter too: registering advanced queries replaces the whole set.
    engine.dispatch(
      registerAdvancedSearchQueries({ aq: `@uri=="${uri.replace(/"/g, '')}"`, cq: SOURCE_FILTER }),
    );
    const list = buildResultList(engine, { options: { fieldsToInclude: FIELDS_TO_INCLUDE } });
    engine.executeFirstSearch();
    return list;
  }, [uri]);
  const state = useController(resultList);
  const result = state.results[0];

  if (IS_SAMPLE_ORG) {
    return (
      <Page>
        <p className="notice sample">Detail pages need the Pokémon org. Connect it to see {slug}.</p>
      </Page>
    );
  }
  if (!state.firstSearchExecuted || state.isLoading) return <Page><p className="notice">Loading…</p></Page>;
  if (!result) return <Page><p className="notice">No Pokémon found for “{slug}”.</p></Page>;

  const raw = result.raw as Record<string, unknown>;
  const name = (raw.pokemon_name as string) || result.title;
  const total = raw.pokemon_total as number | undefined;

  return (
    <Page>
      <article className="detail">
        <div className="detail-art">
          {raw.pokemon_image ? <img src={raw.pokemon_image as string} alt={name ?? slug} width={400} height={400} /> : null}
        </div>
        <div className="detail-body">
          {raw.pokemon_number !== undefined && Number(raw.pokemon_number) !== 0 && (
            <span className="dex-no">#{String(raw.pokemon_number).padStart(4, '0')}</span>
          )}
          <h1>{name}</h1>
          <p className="species">{raw.pokemon_species as string}</p>
          <div className="types">
            {asList(raw.pokemon_type).map((t) => (
              <TypeBadge key={t} type={t} />
            ))}
          </div>

          <dl className="vitals">
            <dt>Generation</dt>
            <dd>{raw.pokemon_generation as string}</dd>
            <dt>Height</dt>
            <dd>{raw.pokemon_height as string}</dd>
            <dt>Weight</dt>
            <dd>{raw.pokemon_weight as string}</dd>
            <dt>Abilities</dt>
            <dd>{asList(raw.pokemon_abilities).join(', ')}</dd>
            {asList(raw.pokemon_forms).length > 1 && (
              <>
                <dt>Forms</dt>
                <dd>{asList(raw.pokemon_forms).join(', ')}</dd>
              </>
            )}
          </dl>

          {total !== undefined ? (
            <section className="stats">
              <h2>Base stats</h2>
              <table>
                <tbody>
                  {STATS.map(({ field, label }) => {
                    const v = Number(raw[field] ?? 0);
                    return (
                      <tr key={field}>
                        <th>{label}</th>
                        <td className="num">{v}</td>
                        <td className="bar">
                          <span style={{ width: `${Math.min(100, (v / STAT_MAX) * 100)}%` }} />
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
                <tfoot>
                  <tr>
                    <th>Total</th>
                    <td className="num">{total}</td>
                    <td />
                  </tr>
                </tfoot>
              </table>
            </section>
          ) : (
            <p className="notice">Base stats haven’t been published for this Pokémon yet.</p>
          )}

          <p className="source-link">
            <a href={result.clickUri} target="_blank" rel="noreferrer">
              View on pokemondb.net ↗
            </a>
          </p>
        </div>
      </article>
    </Page>
  );
}

function Page({ children }: { children: React.ReactNode }) {
  return (
    <main id="results" className="detail-page">
      <Link to={{ pathname: '/', hash: sessionStorageSafeHash() }} className="back">
        ← Back to search
      </Link>
      {children}
    </main>
  );
}

/** Restore the last search (query + facets) when going back. */
function sessionStorageSafeHash(): string {
  try {
    return sessionStorage.getItem('lastSearchHash') ?? '';
  } catch {
    return '';
  }
}
