import type { TextHighlight } from '../coveo/highlight';
import { highlightSegments } from '../coveo/highlight';

export function HighlightedText({ text, highlights }: { text: string; highlights?: TextHighlight[] }) {
  return (
    <>
      {highlightSegments(text, highlights).map((segment, index) =>
        segment.highlighted ? <mark key={index}>{segment.text}</mark> : <span key={index}>{segment.text}</span>,
      )}
    </>
  );
}
