import { buildGeneratedAnswer, type SearchEngine } from '@coveo/headless';
import { useMemo } from 'react';
import { useController } from '../hooks/useController';

/**
 * Coveo Relevance Generative Answering (RGA/CRGA).
 * Renders nothing until an RGA model is attached to the query pipeline in the org.
 */
export function GeneratedAnswer({ engine }: { engine: SearchEngine }) {
  const controller = useMemo(
    () =>
      buildGeneratedAnswer(engine, {
        fieldsToIncludeInCitations: ['pokemon_name', 'pokemon_image'],
      }),
    [engine],
  );
  const s = useController(controller);

  if (s.error || !s.isVisible || (!s.answer && !s.isStreaming && !s.isLoading)) return null;

  return (
    <section className="generated-answer" aria-live="polite">
      <header>
        <span className="ga-label">✨ Generated answer</span>
        {s.isAnswerGenerated && (
          <span className="ga-feedback">
            <button type="button" className={s.liked ? 'on' : ''} onClick={() => controller.like()} aria-label="Helpful">
              👍
            </button>
            <button
              type="button"
              className={s.disliked ? 'on' : ''}
              onClick={() => controller.dislike()}
              aria-label="Not helpful"
            >
              👎
            </button>
          </span>
        )}
      </header>
      {s.isLoading && !s.answer ? (
        <p className="ga-loading">Thinking…</p>
      ) : (
        <p className="ga-answer">{s.answer}</p>
      )}
      {s.citations.length > 0 && (
        <ol className="ga-citations">
          {s.citations.map((c) => (
            <li key={c.id}>
              <a href={c.clickUri ?? c.uri} target="_blank" rel="noreferrer" onClick={() => controller.logCitationClick(c.id)}>
                {c.title}
              </a>
            </li>
          ))}
        </ol>
      )}
    </section>
  );
}
