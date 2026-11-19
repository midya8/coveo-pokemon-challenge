/** Coveo returns multi-value fields as arrays, single values as strings. */
export function asList(value: unknown): string[] {
  if (Array.isArray(value)) return value.map(String);
  if (value === undefined || value === null || value === '') return [];
  return [String(value)];
}
