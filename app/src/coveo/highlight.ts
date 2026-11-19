export interface TextHighlight {
  offset: number;
  length: number;
}

export interface TextSegment {
  text: string;
  highlighted: boolean;
}

/** Split Coveo offset/length highlights into safe text segments. */
export function highlightSegments(text: string, highlights: TextHighlight[] | undefined): TextSegment[] {
  if (!text) return [];
  const ranges = (highlights ?? [])
    .filter((h) => h.offset >= 0 && h.length > 0 && h.offset < text.length)
    .map((h) => ({ start: h.offset, end: Math.min(h.offset + h.length, text.length) }))
    .sort((a, b) => a.start - b.start);

  if (!ranges.length) return [{ text, highlighted: false }];

  const segments: TextSegment[] = [];
  let cursor = 0;
  for (const range of ranges) {
    const start = Math.max(range.start, cursor);
    if (start > cursor) segments.push({ text: text.slice(cursor, start), highlighted: false });
    if (range.end > start) segments.push({ text: text.slice(start, range.end), highlighted: true });
    cursor = Math.max(cursor, range.end);
  }
  if (cursor < text.length) segments.push({ text: text.slice(cursor), highlighted: false });
  return segments;
}
