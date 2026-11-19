import {
  SortOrder,
  buildFieldSortCriterion,
  buildPager,
  buildQuerySummary,
  buildRelevanceSortCriterion,
  buildSort,
  type SearchEngine,
} from '@coveo/headless';
import { useMemo } from 'react';
import { FIELDS } from '../coveo/config';
import { useController } from '../hooks/useController';

export function QuerySummary({ engine }: { engine: SearchEngine }) {
  const controller = useMemo(() => buildQuerySummary(engine), [engine]);
  const s = useController(controller);
  if (!s.hasResults) return null;
  return (
    <p className="summary">
      {s.firstResult}–{s.lastResult} of {s.total.toLocaleString()} Pokémon
      {s.hasQuery && (
        <>
          {' '}for <strong>{s.query}</strong>
        </>
      )}
      <span className="duration"> · {s.durationInSeconds}s</span>
    </p>
  );
}

const SORTS = [
  { label: 'Relevance', criterion: buildRelevanceSortCriterion() },
  { label: 'Pokédex number', criterion: buildFieldSortCriterion(FIELDS.number, SortOrder.Ascending) },
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
