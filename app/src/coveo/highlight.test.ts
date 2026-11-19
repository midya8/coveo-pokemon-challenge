import { describe, expect, it } from 'vitest';
import { highlightSegments } from './highlight';

describe('highlightSegments', () => {
  it('returns the whole string when nothing is highlighted', () => {
    expect(highlightSegments('Charizard', [])).toEqual([{ text: 'Charizard', highlighted: false }]);
  });

  it('splits a Coveo offset highlight out of the surrounding text', () => {
    expect(highlightSegments('Fire Flying', [{ offset: 5, length: 6 }])).toEqual([
      { text: 'Fire ', highlighted: false },
      { text: 'Flying', highlighted: true },
    ]);
  });

  it('ignores highlights that start past the end of the text', () => {
    expect(highlightSegments('Moltres', [{ offset: 40, length: 3 }])).toEqual([
      { text: 'Moltres', highlighted: false },
    ]);
  });

  it('does not emit markup for an empty string', () => {
    expect(highlightSegments('', [{ offset: 0, length: 1 }])).toEqual([]);
  });
});
