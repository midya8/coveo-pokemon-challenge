import { useEffect, useState } from 'react';
import { API_KEY, IS_SAMPLE_ORG, ORG_ID, SEARCH_HUB } from '../coveo/config';
import { interpretPassageResponse, type PassageInterpretation } from '../coveo/passages';
import { UnavailableNotice } from './UnavailableNotice';

const PROBE_QUERY = 'What type is Charizard?';

let cached: PassageInterpretation | null = null;

/**
 * One probe per page load. A 403 is remembered so the Fire + Flying demo does
 * not call an unlicensed API on every facet click.
 */
export function PassageRetrieval() {
  const [status, setStatus] = useState<PassageInterpretation | null>(cached);

  useEffect(() => {
    if (IS_SAMPLE_ORG || !API_KEY || cached) return;
    const controller = new AbortController();
    const timeout = AbortSignal.timeout(8000);
    const signal = AbortSignal.any([controller.signal, timeout]);
    let cancelled = false;
    fetch(
      `https://platform.cloud.coveo.com/rest/search/v3/passages/retrieve?organizationId=${encodeURIComponent(ORG_ID)}`,
      {
        method: 'POST',
        signal,
        headers: {
          Authorization: `Bearer ${API_KEY}`,
          'Content-Type': 'application/json',
          Accept: 'application/json',
        },
        body: JSON.stringify({ query: PROBE_QUERY, searchHub: SEARCH_HUB, maxPassages: 3 }),
      },
    )
      .then(async (response) => {
        const body = (await response.json().catch(() => null)) as unknown;
        if (cancelled) return;
        const next = interpretPassageResponse(response.status, body);
        cached = next;
        setStatus(next);
      })
      .catch(() => {
        if (cancelled) return;
        const next = interpretPassageResponse(503, null);
        cached = next;
        setStatus(next);
      });
    return () => {
      cancelled = true;
      controller.abort();
    };
  }, []);

  if (!status || status.state === 'empty') return null;
  if (status.state === 'available') {
    return (
      <section className="passages" aria-label="Passages">
        <h2>Passages</h2>
        <ul>
          {status.passages.map((passage) => (
            <li key={passage.uri ?? passage.text}>
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
        detail="Passage Retrieval didn't respond. Search results are unaffected."
      />
    );
  }
  return (
    <UnavailableNotice
      title="Passage Retrieval"
      detail="Passage Retrieval is not licensed on this trial, so this panel stays closed instead of reporting an error. Relevance Generative Answering appears above the results only when the pipeline actually returns an answer."
    />
  );
}
