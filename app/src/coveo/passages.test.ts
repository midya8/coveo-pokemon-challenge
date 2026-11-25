import { describe, expect, it } from 'vitest';
import { cleanPassageText, interpretPassageResponse, passageExcerpt } from './passages';

describe('interpretPassageResponse', () => {
  it('treats a license refusal as unavailable rather than a search failure', () => {
    const result = interpretPassageResponse(403, {
      statusCode: 403,
      errorCode: 'UNAUTHORIZED_ACCESS_TO_FEATURE',
      message: "You don't have access to 'Passage Retrieval'.",
    });
    expect(result.state).toBe('unavailable');
  });

  it('reads passage text from a successful payload', () => {
    const result = interpretPassageResponse(200, {
      passages: [{ text: 'Charizard is Fire and Flying.', title: 'Charizard', clickUri: 'https://pokemondb.net/pokedex/charizard' }],
    });
    expect(result).toEqual({
      state: 'available',
      passages: [
        {
          text: 'Charizard is Fire and Flying.',
          title: 'Charizard',
          uri: 'https://pokemondb.net/pokedex/charizard',
        },
      ],
    });
  });

  it('reads the title from the v3 document fields', () => {
    const result = interpretPassageResponse(200, {
      items: [{ text: 'Lucario is Fighting and Steel.', relevanceScore: 0.2, document: { title: 'Lucario Pokédex', pokemon_name: 'Lucario' } }],
    });
    expect(result).toEqual({ state: 'available', passages: [{ text: 'Lucario is Fighting and Steel.', title: 'Lucario', uri: undefined }] });
  });

  it('does not invent passages when the body is empty', () => {
    expect(interpretPassageResponse(200, { passages: [] }).state).toBe('empty');
  });

  it('hides transport failures behind a neutral message', () => {
    expect(interpretPassageResponse(500, null).state).toBe('error');
  });
});

describe('cleanPassageText', () => {
  it('drops in-page navigation, link targets and table rules', () => {
    const markdown = [
      '# Lucario Pokédex: stats &amp; moves',
      '[Skip to main content](#main)',
      '- Contents',
      '- [Info](#dex-basics)',
      '*Lucario* is a [Fighting](/type/fighting) / [Steel](/type/steel) type Pokémon.',
      '| Move | Type |',
      '|------|------|',
      '| [Aura Sphere](/move/aura-sphere) | [Fighting](/type/fighting) |',
    ].join('\n');
    expect(cleanPassageText(markdown)).toBe(
      'Lucario Pokédex: stats & moves Lucario is a Fighting / Steel type Pokémon. Move · Type Aura Sphere · Fighting',
    );
  });
});

describe('passageExcerpt', () => {
  it('centres on the part of a long passage that matches the most query terms', () => {
    const text = `${'Filler about moves. '.repeat(40)}Lucario is a Fighting / Steel type Pokémon. ${'More filler. '.repeat(40)}`;
    const excerpt = passageExcerpt(text, 'what type is lucario', 120);
    expect(excerpt).toContain('Lucario is a Fighting / Steel type');
    expect(excerpt.startsWith('…')).toBe(true);
    expect(excerpt.length).toBeLessThanOrEqual(122);
  });

  it('returns short passages whole', () => {
    expect(passageExcerpt('Pikachu is Electric.', 'pikachu')).toBe('Pikachu is Electric.');
  });
});
