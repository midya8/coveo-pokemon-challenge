import {
  SortOrder,
  buildBreadcrumbManager,
  buildDidYouMean,
  buildFieldSortCriterion,
  buildPager,
  buildQuerySummary,
  buildRelevanceSortCriterion,
  buildSort,
  type SearchEngine,
} from '@coveo/headless';
import { useMemo } from 'react';
import { FIELDS, IS_SAMPLE_ORG } from '../coveo/config';
import { useController } from '../hooks/useController';

export function QuerySummary({ engine }: { engine: SearchEngine }) {
  const controller = useMemo(() => buildQuerySummary(engine), [engine]);
  const s = useController(controller);
  if (!s.firstSearchExecuted) return null;
  if (!s.hasResults) {
    return (
      <p className="summary" aria-live="polite">
        No Pokémon
        {s.hasQuery && (
          <>
            {' '}
            for <strong>{s.query}</strong>
          </>
        )}
      </p>
    );
  }
  return (
    <p className="summary" aria-live="polite">
      {s.firstResult}–{s.lastResult} of {s.total.toLocaleString()} Pokémon
      {s.hasQuery && (
        <>
          {' '}
          for <strong>{s.query}</strong>
        </>
      )}
      <span className="duration"> · {s.durationInSeconds}s</span>
    </p>
  );
}

const SORTS = [
  { label: 'Relevance', criterion: buildRelevanceSortCriterion() },
  { label: 'Pokédex number', criterion: buildFieldSortCriterion(FIELDS.number, SortOrder.Ascending) },
  ...(IS_SAMPLE_ORG
    ? []
    : [
        { label: 'Name', criterion: buildFieldSortCriterion('pokemon_name', SortOrder.Ascending) },
        { label: 'Stat total', criterion: buildFieldSortCriterion('pokemon_total', SortOrder.Descending) },
      ]),
];

export function SortSelect({ engine }: { engine: SearchEngine }) {
  const controller = useMemo(
    () => buildSort(engine, { initialState: { criterion: SORTS[0].criterion } }),
    [engine],
  );
  const state = useController(controller);
  const current = SORTS.findIndex((s) => controller.isSortedBy(s.criterion));
  return (
    <label className="sort">
      Sort by{' '}
      <select
        value={Math.max(current, 0)}
        onChange={(e) => controller.sortBy(SORTS[Number(e.target.value)].criterion)}
        disabled={state.sortCriteria === undefined}
      >
        {SORTS.map((s, i) => (
          <option key={s.label} value={i}>
            {s.label}
          </option>
        ))}
      </select>
    </label>
  );
}

export function Pager({ engine }: { engine: SearchEngine }) {
  const controller = useMemo(() => buildPager(engine, { options: { numberOfPages: 5 } }), [engine]);
  const s = useController(controller);
  if (s.maxPage <= 1) return null;
  return (
    <nav className="pager" aria-label="Pagination">
      <button type="button" disabled={!s.hasPreviousPage} onClick={() => controller.previousPage()}>
        ‹ Prev
      </button>
      {s.currentPages.map((p) => (
        <button
          type="button"
          key={p}
          aria-current={p === s.currentPage ? 'page' : undefined}
          className={p === s.currentPage ? 'current' : undefined}
          onClick={() => controller.selectPage(p)}
        >
          {p}
        </button>
      ))}
      <button type="button" disabled={!s.hasNextPage} onClick={() => controller.nextPage()}>
        Next ›
      </button>
    </nav>
  );
}

export function Breadcrumbs({ engine }: { engine: SearchEngine }) {
  const controller = useMemo(() => buildBreadcrumbManager(engine), [engine]);
  const state = useController(controller);
  if (!state.hasBreadcrumbs) return null;
  const selected = state.facetBreadcrumbs.flatMap((facet) =>
    facet.values.map((breadcrumb) => ({
      facetId: facet.facetId,
      label: breadcrumb.value.value,
      deselect: () => breadcrumb.deselect(),
    })),
  );
  if (!selected.length) return null;
  return (
    <div className="breadcrumbs" aria-label="Active filters">
      {selected.map((item) => (
        <button key={`${item.facetId}-${item.label}`} type="button" className="chip" onClick={item.deselect}>
          {item.label}
          <span aria-hidden="true"> ×</span>
          <span className="visually-hidden">Remove {item.label}</span>
        </button>
      ))}
      <button type="button" className="link" onClick={() => controller.deselectAll()}>
        Clear filters
      </button>
    </div>
  );
}

export function DidYouMean({ engine }: { engine: SearchEngine }) {
  const controller = useMemo(
    () =>
      buildDidYouMean(engine, {
        options: { automaticallyCorrectQuery: false, queryCorrectionMode: 'legacy' },
      }),
    [engine],
  );
  const state = useController(controller);
  if (state.wasAutomaticallyCorrected && state.wasCorrectedTo) {
    return (
      <p className="did-you-mean" role="status">
        Showing results for <strong>{state.wasCorrectedTo}</strong>
        {state.originalQuery ? <> instead of {state.originalQuery}</> : null}.
      </p>
    );
  }
  if (!state.hasQueryCorrection || !state.queryCorrection.correctedQuery) return null;
  return (
    <p className="did-you-mean">
      Did you mean{' '}
      <button type="button" className="link" onClick={() => controller.applyCorrection()}>
        {state.queryCorrection.correctedQuery}
      </button>
      ?
    </p>
  );
}
