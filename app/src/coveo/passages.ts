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
  // v3 puts the item's fields under `document` (title, plus any `additionalFields` requested).
  const document = record.document && typeof record.document === 'object' ? (record.document as Record<string, unknown>) : {};
  const title = firstString(record, ['title', 'documentTitle']) ?? firstString(document, ['pokemon_name', 'title']);
  const uri = firstString(record, ['clickUri', 'uri', 'url']) ?? firstString(document, ['clickUri', 'uri']);
  return { text, title, uri };
}

const STOPWORDS = new Set([
  'what', 'which', 'who', 'how', 'does', 'did', 'are', 'the', 'and', 'for', 'into', 'with', 'its', 'from', 'pokemon', 'pokémon',
]);

/**
 * Passages arrive as Markdown chunks of ~12k characters (tables, link targets, in-page navigation).
 * Flatten them to plain text: link labels only, table rows as "a · b · c", no anchor-only nav lines.
 */
export function cleanPassageText(text: string): string {
  return text
    .replace(/&amp;/g, '&')
    .split('\n')
    .map((line) => line.trim())
    .filter((line) => {
      if (!line || line === '- Contents') return false;
      if (/^\|?[\s|:-]*-{3,}[\s|:-]*$/.test(line)) return false; // table separator row
      return !/^(?:-\s+)?\[[^\]]*\]\(#[^)]*\)$/.test(line); // "Skip to main content", table-of-contents links
    })
    .map((line) => {
      const plain = line.replace(/\[([^\]]*)\]\([^)]*\)/g, '$1').replace(/\*\*?([^*]+)\*\*?/g, '$1');
      if (plain.startsWith('|')) {
        return plain
          .split('|')
          .map((cell) => cell.trim())
          .filter(Boolean)
          .join(' · ');
      }
      return plain.replace(/^#{1,6}\s+/, '').replace(/^[-*]\s+/, '');
    })
    .join(' ')
    .replace(/\s+/g, ' ')
    .trim();
}

/** The window of a passage that mentions the most distinct query terms, trimmed to word boundaries. */
export function passageExcerpt(text: string, query: string, maxLength = 300): string {
  const clean = cleanPassageText(text);
  if (clean.length <= maxLength) return clean;
  const lower = clean.toLowerCase();
  const terms = [
    ...new Set(
      query
        .toLowerCase()
        .split(/[^\p{L}\p{N}]+/u)
        .filter((term) => term.length > 2 && !STOPWORDS.has(term)),
    ),
  ];
  let best = { start: 0, score: 0 };
  for (const term of terms) {
    for (let at = lower.indexOf(term); at !== -1; at = lower.indexOf(term, at + term.length)) {
      const start = Math.max(0, at - 40);
      const window = lower.slice(start, start + maxLength);
      const score = terms.filter((t) => window.includes(t)).length;
      if (score > best.score || (score === best.score && start < best.start)) best = { start, score };
    }
  }
  let start = best.start;
  if (start > 0) {
    const space = clean.indexOf(' ', start);
    if (space !== -1) start = space + 1;
  }
  let end = Math.min(clean.length, start + maxLength);
  if (end < clean.length) {
    const space = clean.lastIndexOf(' ', end);
    if (space > start) end = space;
  }
  return `${start > 0 ? '…' : ''}${clean.slice(start, end)}${end < clean.length ? '…' : ''}`;
}

function firstString(record: Record<string, unknown>, keys: string[]): string | undefined {
  for (const key of keys) {
    const value = record[key];
    if (typeof value === 'string' && value.trim()) return value.trim();
  }
  return undefined;
}
