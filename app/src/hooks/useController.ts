import { useEffect, useState } from 'react';

interface Subscribable<S> {
  state: S;
  subscribe(listener: () => void): () => void;
}

/**
 * Subscribe a component to a Headless controller and re-render on state changes.
 * Headless invokes the listener once on subscribe, so a swapped controller syncs immediately.
 */
export function useController<S>(controller: Subscribable<S>): S {
  const [state, setState] = useState<S>(() => controller.state);
  useEffect(() => controller.subscribe(() => setState(controller.state)), [controller]);
  return state;
}
