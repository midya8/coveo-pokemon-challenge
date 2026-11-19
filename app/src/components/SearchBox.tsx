import { buildSearchBox, type SearchEngine } from '@coveo/headless';
import { useMemo, useState } from 'react';
import { useController } from '../hooks/useController';

export function SearchBox({ engine }: { engine: SearchEngine }) {
  const controller = useMemo(
    () =>
      buildSearchBox(engine, {
        options: {
          numberOfSuggestions: 6,
          highlightOptions: {
            notMatchDelimiters: { open: '<strong>', close: '</strong>' },
            correctionDelimiters: { open: '<em>', close: '</em>' },
          },
        },
      }),
    [engine],
  );
  const state = useController(controller);
  const [focused, setFocused] = useState(false);
  const [active, setActive] = useState(-1);
  const open = focused && state.suggestions.length > 0;

  const onKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'ArrowDown' && open) {
      e.preventDefault();
      setActive((i) => (i + 1) % state.suggestions.length);
    } else if (e.key === 'ArrowUp' && open) {
      e.preventDefault();
      setActive((i) => (i <= 0 ? state.suggestions.length - 1 : i - 1));
    } else if (e.key === 'Enter') {
      if (open && active >= 0) {
        controller.selectSuggestion(state.suggestions[active].rawValue);
      } else {
        controller.submit();
      }
      setActive(-1);
      (e.target as HTMLInputElement).blur();
    } else if (e.key === 'Escape') {
      setFocused(false);
    }
  };

  return (
    <div className="searchbox" role="search">
      <input
        type="search"
        aria-label="Search Pokémon"
        placeholder="Search Pokémon, e.g. “fire dragon” or “Pikachu”"
        value={state.value}
        onChange={(e) => {
          controller.updateText(e.target.value);
          setActive(-1);
        }}
        onFocus={() => {
          setFocused(true);
          controller.showSuggestions();
        }}
        onBlur={() => setTimeout(() => setFocused(false), 120)}
        onKeyDown={onKeyDown}
        aria-expanded={open}
        aria-controls="search-suggestions"
        aria-autocomplete="list"
        role="combobox"
      />
      <button type="button" onClick={() => controller.submit()} disabled={state.isLoading}>
        Search
      </button>
      {open && (
        <ul id="search-suggestions" className="suggestions" role="listbox">
          {state.suggestions.map((s, i) => (
            <li
              key={s.rawValue}
              role="option"
              aria-selected={i === active}
              className={i === active ? 'active' : undefined}
              onMouseDown={(e) => {
                e.preventDefault();
                controller.selectSuggestion(s.rawValue);
                setFocused(false);
              }}
              // Highlight markup is produced by Headless from our own delimiters above.
              dangerouslySetInnerHTML={{ __html: s.highlightedValue }}
            />
          ))}
        </ul>
      )}
    </div>
  );
}
