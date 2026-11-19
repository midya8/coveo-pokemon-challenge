import { buildFacet, type SearchEngine } from '@coveo/headless';
import { useMemo } from 'react';
import { useController } from '../hooks/useController';

interface Props {
  engine: SearchEngine;
  facetId: string;
  field: string;
  title: string;
  /** Optional fixed display order (e.g. Generation 1..10). */
  customSort?: string[];
  renderValue?: (value: string) => React.ReactNode;
}

export function Facet({ engine, facetId, field, title, customSort, renderValue }: Props) {
  const controller = useMemo(
    () =>
      buildFacet(engine, {
        options: {
          facetId,
          field,
          numberOfValues: 20,
          sortCriteria: customSort ? 'alphanumeric' : 'occurrences',
          customSort,
        },
      }),
    [engine, facetId, field, customSort],
  );
  const state = useController(controller);

  if (!state.values.length) return null;

  return (
    <section className="facet" aria-labelledby={`${facetId}-title`}>
      <header>
        <h3 id={`${facetId}-title`}>{title}</h3>
        {state.hasActiveValues && (
          <button type="button" className="link" onClick={() => controller.deselectAll()}>
            Clear
          </button>
        )}
      </header>
      <ul>
        {state.values.map((v) => (
          <li key={v.value}>
            <label>
              <input
                type="checkbox"
                checked={v.state === 'selected'}
                onChange={() => controller.toggleSelect(v)}
              />
              <span className="facet-value">{renderValue ? renderValue(v.value) : v.value}</span>
              <span className="count">{v.numberOfResults}</span>
            </label>
          </li>
        ))}
      </ul>
      {(state.canShowMoreValues || state.canShowLessValues) && (
        <div className="facet-more">
          {state.canShowMoreValues && (
            <button type="button" className="link" onClick={() => controller.showMoreValues()}>
              Show more
            </button>
          )}
          {state.canShowLessValues && (
            <button type="button" className="link" onClick={() => controller.showLessValues()}>
              Show less
            </button>
          )}
        </div>
      )}
    </section>
  );
}
