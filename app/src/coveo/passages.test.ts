import { describe, expect, it } from 'vitest';
import { interpretPassageResponse } from './passages';

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

  it('does not invent passages when the body is empty', () => {
    expect(interpretPassageResponse(200, { passages: [] }).state).toBe('empty');
  });

  it('hides transport failures behind a neutral message', () => {
    expect(interpretPassageResponse(500, null).state).toBe('error');
  });
});
