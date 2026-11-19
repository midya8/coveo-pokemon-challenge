import {
  buildInstantResults,
  buildInteractiveInstantResult,
  buildSearchBox,
  type Result,
  type SearchEngine,
} from '@coveo/headless';
import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { slugFromUri } from '../coveo/config';
import { SEARCH_BOX_ID, SEARCH_BOX_OPTIONS } from '../coveo/searchBoxOptions';
import { typeaheadMode } from '../coveo/typeahead';
import { useController } from '../hooks/useController';

export function SearchBox({ engine }: { engine: SearchEngine }) {
  const navigate = useNavigate();
  const controller = useMemo(() => buildSearchBox(engine, { options: SEARCH_BOX_OPTIONS }), [engine]);
  const instantResults = useMemo(
    () =>
      buildInstantResults(engine, {
        options: { searchBoxId: SEARCH_BOX_ID, maxResultsPerQuery: 4 },
      }),
    [engine],
  );
  const state = useController(controller);
  const instant = useController(instantResults);
  const [focused, setFocused] = useState(false);
  const [active, setActive] = useState(-1);
  const mode = typeaheadMode(state.suggestions.length, state.value, state.isLoadingSuggestions);
  const [trackedQuery, setTrackedQuery] = useState({ value: state.value, mode });
  if (trackedQuery.value !== state.value || trackedQuery.mode !== mode) {
    setTrackedQuery({ value: state.value, mode });
    setActive(-1);
  }

  useEffect(() => {
    if (mode !== 'index-fallback') return;
    instantResults.updateQuery(state.value);
  }, [instantResults, mode, state.value]);

  const suggestionRows = mode === 'suggestions' ? state.suggestions : [];
  const instantRows = mode === 'index-fallback' ? instant.results.slice(0, 4) : [];
  const rowCount = suggestionRows.length + instantRows.length;
  const open = focused && (rowCount > 0 || mode === 'index-fallback');

  const activate = (index: number) => {
    if (mode === 'suggestions') {
      const suggestion = suggestionRows[index];
      if (!suggestion) return;
      controller.selectSuggestion(suggestion.rawValue);
    } else {
      const result = instantRows[index];
      if (!result) return;
      buildInteractiveInstantResult(engine, { options: { result } }).select();
      const slug = slugFromUri(result.clickUri);
      if (slug) navigate(`/pokemon/${slug}`);
      else window.open(result.clickUri, '_blank', 'noopener,noreferrer');
    }
    setFocused(false);
    setActive(-1);
  };

  const onKeyDown = (event: React.KeyboardEvent<HTMLInputElement>) => {
    if (event.key === 'ArrowDown' && open && rowCount) {
      event.preventDefault();
      setActive((index) => (index + 1) % rowCount);
    } else if (event.key === 'ArrowUp' && open && rowCount) {
      event.preventDefault();
      setActive((index) => (index <= 0 ? rowCount - 1 : index - 1));
    } else if (event.key === 'Enter') {
      if (open && active >= 0) activate(active);
      else controller.submit();
      setActive(-1);
      event.currentTarget.blur();
    } else if (event.key === 'Escape') {
      setFocused(false);
    }
  };

  return (
    <div className="searchbox" role="search">
      <input
        type="search"
        aria-label="Search Pokémon"
        placeholder="Search Pokémon, e.g. “fire lizard” or “Pikachu”"
        value={state.value}
        onChange={(event) => controller.updateText(event.target.value)}
        onFocus={() => {
          setFocused(true);
          controller.showSuggestions();
        }}
        onBlur={() => setTimeout(() => setFocused(false), 150)}
        onKeyDown={onKeyDown}
        aria-expanded={open}
        aria-controls="search-suggestions"
        aria-autocomplete="list"
        aria-activedescendant={active >= 0 ? `suggestion-${active}` : undefined}
        role="combobox"
      />
      <button type="button" onClick={() => controller.submit()} disabled={state.isLoading}>
        Search
      </button>
      {open && (
        <ul id="search-suggestions" className="suggestions" role="listbox" aria-label="Search suggestions">
          {mode === 'suggestions' && (
            <li className="suggestion-label" role="presentation">
              Suggestions
            </li>
          )}
          {mode === 'index-fallback' && (
            <li className="suggestion-note" role="presentation">
              No query suggestions for that text. Showing matches from the index.
            </li>
          )}
          {suggestionRows.map((suggestion, index) => (
            <li
              key={suggestion.rawValue}
              id={`suggestion-${index}`}
              role="option"
              aria-selected={index === active}
              className={index === active ? 'active' : undefined}
              onMouseDown={(event) => {
                event.preventDefault();
                activate(index);
              }}
            >
              {/* Highlight markup is produced by Headless from delimiters we set. */}
              <span dangerouslySetInnerHTML={{ __html: suggestion.highlightedValue }} />
            </li>
          ))}
          {instantRows.map((result, index) => (
            <InstantOption
              key={result.uniqueId}
              result={result}
              active={index === active}
              id={`suggestion-${index}`}
              onPick={() => activate(index)}
            />
          ))}
          {mode === 'index-fallback' && !instant.isLoading && instantRows.length === 0 && (
            <li className="suggestion-note" role="presentation">
              Nothing in the index matched that text.
            </li>
          )}
        </ul>
      )}
    </div>
  );
}

function InstantOption({
  result,
  active,
  id,
  onPick,
}: {
  result: Result;
  active: boolean;
  id: string;
  onPick: () => void;
}) {
  const raw = result.raw as Record<string, unknown>;
  const name = (typeof raw.pokemon_name === 'string' && raw.pokemon_name) || result.title;
  const image = typeof raw.pokemon_image === 'string' ? raw.pokemon_image : undefined;
  return (
    <li
      id={id}
      role="option"
      aria-selected={active}
      className={active ? 'active instant-hit' : 'instant-hit'}
      onMouseDown={(event) => {
        event.preventDefault();
        onPick();
      }}
    >
      {image ? <img src={image} alt="" /> : <span className="instant-fallback" aria-hidden="true" />}
      <span>{name}</span>
    </li>
  );
}
