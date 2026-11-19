export interface PassageHit {
  text: string;
  title?: string;
  uri?: string;
}

export type PassageInterpretation =
  | { state: 'available'; passages: PassageHit[] }
  | { state: 'unavailable'; reason: string }
  | { state: 'empty'; reason: string }
  | { state: 'error'; reason: string };

const UNAVAILABLE = 'Passage Retrieval is not licensed on this organization.';

/** Turn a Passage Retrieval HTTP response into something the UI can render without an error banner. */
export function interpretPassageResponse(status: number, body: unknown): PassageInterpretation {
  if (status === 401 || status === 403) {
    return { state: 'unavailable', reason: UNAVAILABLE };
  }
  if (status !== 200 || !body || typeof body !== 'object') {
    return { state: 'error', reason: 'Passage Retrieval did not respond.' };
  }
  const passages = extractPassages(body);
  if (!passages.length) return { state: 'empty', reason: 'No passages for that question.' };
  return { state: 'available', passages };
}

function extractPassages(body: object): PassageHit[] {
  const record = body as Record<string, unknown>;
  for (const key of ['passages', 'items', 'results'] as const) {
    const list = record[key];
    if (!Array.isArray(list)) continue;
    const hits = list.map(toHit).filter((hit): hit is PassageHit => hit !== null);
    if (hits.length) return hits;
  }
  return [];
}

function toHit(value: unknown): PassageHit | null {
  if (!value || typeof value !== 'object') return null;
  const record = value as Record<string, unknown>;
  const text = firstString(record, ['text', 'passage', 'content', 'body']);
  if (!text) return null;
  const title = firstString(record, ['title', 'documentTitle']);
  const uri = firstString(record, ['clickUri', 'uri', 'url']);
  return { text, title, uri };
}

function firstString(record: Record<string, unknown>, keys: string[]): string | undefined {
  for (const key of keys) {
    const value = record[key];
    if (typeof value === 'string' && value.trim()) return value.trim();
  }
  return undefined;
}
