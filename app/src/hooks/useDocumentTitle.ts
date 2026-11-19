import { useEffect } from 'react';
import { documentTitle } from '../coveo/documentTitle';

/** Keep the browser tab in sync with the query or the open Pokémon. */
export function useDocumentTitle(subject?: string) {
  const title = documentTitle(subject);
  useEffect(() => {
    const previous = document.title;
    document.title = title;
    return () => {
      document.title = previous;
    };
  }, [title]);
}
