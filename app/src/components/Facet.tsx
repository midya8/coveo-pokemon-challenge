import { buildFacet, type FacetOptions, type SearchEngine } from '@coveo/headless';
import { useMemo } from 'react';
import { useController } from '../hooks/useController';

interface Props {
  engine: SearchEngine;
  /** Stable options object. A new object each render would rebuild the controller. */
  options: FacetOptions;
  title: string;
  /** Short explanation of how selected values combine. */
  hint?: string;
  renderValue?: (value: string) => React.ReactNode;
}

export function Facet({ engine, options, title, hint, renderValue }: Props) {
  const controller = useMemo(() => buildFacet(engine, { options }), [engine, options]);
  const facetId = options.facetId ?? options.field;
  const state = useController(controller);

  if (!state.values.length) {
    if (!state.isLoading) return null;
    return (
      <section className="facet" aria-labelledby={`${facetId}-title`} aria-busy="true">
        <h3 id={`${facetId}-title`}>{title}</h3>
        <p className="facet-hint" role="status">
          Loading {title.toLowerCase()}…
        </p>
      </section>
    );
  }

  return (
    <section className="facet" aria-labelledby={`${facetId}-title`} aria-describedby={hint ? `${facetId}-hint` : undefined}>
      <header>
        <h3 id={`${facetId}-title`}>{title}</h3>
        {state.hasActiveValues && (
          <button type="button" className="link" onClick={() => controller.deselectAll()}>
            Clear
          </button>
        )}
      </header>
      {hint ? (
        <p id={`${facetId}-hint`} className="facet-hint">
          {hint}
        </p>
      ) : null}
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
