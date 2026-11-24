import type { ReactNode } from 'react';

/** Render **bold** spans as <strong>, everything else as text (no HTML is ever injected). */
function inline(text: string, keyPrefix: string): ReactNode[] {
  return text.split(/(\*\*[^*]+\*\*)/g).map((part, i) =>
    part.startsWith('**') && part.endsWith('**') && part.length > 4 ? (
      <strong key={`${keyPrefix}-${i}`}>{part.slice(2, -2)}</strong>
    ) : (
      part
    ),
  );
}

/**
 * Minimal, safe Markdown for RGA answers: paragraphs, "- " / "* " bullet lists, numbered lists and **bold**.
 * Built as React elements, so model output can never inject markup.
 */
export function renderMarkdownLite(markdown: string): ReactNode[] {
  const blocks: ReactNode[] = [];
  let list: { ordered: boolean; items: string[] } | null = null;
  const flush = () => {
    if (!list) return;
    const items = list.items.map((item, i) => <li key={i}>{inline(item, `li-${blocks.length}-${i}`)}</li>);
    blocks.push(list.ordered ? <ol key={blocks.length}>{items}</ol> : <ul key={blocks.length}>{items}</ul>);
    list = null;
  };
  for (const raw of markdown.split('\n')) {
    const line = raw.trim();
    const bullet = /^[-*]\s+(.*)$/.exec(line);
    const numbered = /^\d+[.)]\s+(.*)$/.exec(line);
    if (bullet || numbered) {
      const ordered = Boolean(numbered);
      if (!list || list.ordered !== ordered) {
        flush();
        list = { ordered, items: [] };
      }
      list.items.push((bullet ?? numbered)![1]);
      continue;
    }
    flush();
    const heading = /^#{1,6}\s+(.*)$/.exec(line);
    if (heading) {
      blocks.push(
        <p key={blocks.length} className="ga-heading">
          <strong>{inline(heading[1], `h-${blocks.length}`)}</strong>
        </p>,
      );
      continue;
    }
    if (line) blocks.push(<p key={blocks.length}>{inline(line, `p-${blocks.length}`)}</p>);
  }
  flush();
  return blocks;
}
