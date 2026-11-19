/** Browser tab title. The subject is the query or the Pokémon name. */
export function documentTitle(subject?: string): string {
  const base = 'Pokédex Search';
  const trimmed = subject?.trim();
  return trimmed ? `${trimmed} · ${base}` : `${base} · Coveo`;
}
