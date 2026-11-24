import { buildQuerySummary } from '@coveo/headless';
import { useEffect, useMemo, useState } from 'react';
import { API_KEY, IS_SAMPLE_ORG, ORG_ID, SEARCH_HUB } from '../coveo/config';
import { searchEngine } from '../coveo/engine';
import { interpretPassageResponse, type PassageInterpretation } from '../coveo/passages';
import { useController } from '../hooks/useController';
import { UnavailableNotice } from './UnavailableNotice';

/** Remembered for the page's lifetime so an unlicensed org isn't probed on every search. */
let unavailable: PassageInterpretation | null = null;

/**
 * Coveo Passage Retrieval (CPR) for the current query: the most relevant passages from the index,
 * the grounding an external LLM or agent would use. Calls `/rest/search/v3/passages/retrieve`.
 */
export function PassageRetrieval() {
  const summaryController = useMemo(() => buildQuerySummary(searchEngine), []);
  const summary = useController(summaryController);
  const query = summary.query.trim();
  const [result, setResult] = useState<{ query: string; status: PassageInterpretation } | null>(null);

  useEffect(() => {
    if (IS_SAMPLE_ORG || !API_KEY || unavailable || !query) return;
    const controller = new AbortController();
    const signal = AbortSignal.any([controller.signal, AbortSignal.timeout(8000)]);
    fetch(`https://platform.cloud.coveo.com/rest/search/v3/passages/retrieve?organizationId=${encodeURIComponent(ORG_ID)}`, {
      method: 'POST',
      signal,
      headers: { Authorization: `Bearer ${API_KEY}`, 'Content-Type': 'application/json', Accept: 'application/json' },
      body: JSON.stringify({
        query,
        localization: { locale: 'en' },
        searchHub: SEARCH_HUB,
        maxPassages: 3,
        additionalFields: ['pokemon_name'],
      }),
    })
      .then(async (response) => {
        const body = (await response.json().catch(() => null)) as unknown;
        const next = interpretPassageResponse(response.status, body);
        if (next.state === 'unavailable') unavailable = next;
        setResult({ query, status: next });
      })
      .catch((error: unknown) => {
        if (error instanceof DOMException && error.name === 'AbortError' && controller.signal.aborted) return;
        setResult({ query, status: interpretPassageResponse(503, null) });
      });
    return () => controller.abort();
  }, [query]);

  // Only show the result that belongs to the current query (a stale one is hidden while the next loads).
  const status = unavailable ?? (result && result.query === query ? result.status : null);
  if (!status || status.state === 'empty') return null;
  if (status.state === 'available') {
    return (
      <section className="passages" aria-label="Passages">
        <h2>Passages for “{query}”</h2>
        <p className="passages-note">Coveo Passage Retrieval: the grounding an LLM or agent would receive for this question.</p>
        <ul>
          {status.passages.map((passage) => (
            <li key={`${passage.uri ?? ''}-${passage.text.slice(0, 40)}`}>
              {passage.title && <strong>{passage.title}. </strong>}
              {passage.text}
            </li>
          ))}
        </ul>
      </section>
    );
  }
  if (status.state === 'error') {
    return (
      <UnavailableNotice
        title="Passage Retrieval"
        detail="Passage Retrieval didn't respond for this query. Search results are unaffected."
      />
    );
  }
  return (
    <UnavailableNotice
      title="Passage Retrieval"
      detail="Passage Retrieval isn't enabled on this organization, so this panel stays closed instead of reporting an error."
    />
  );
}
