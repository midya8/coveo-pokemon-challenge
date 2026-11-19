import { describe, expect, it } from 'vitest';
import { engineConfiguration } from './engine';

describe('engineConfiguration', () => {
  it('sends legacy analytics on the Pokémon search hub', () => {
    const config = engineConfiguration({
      organizationId: 'org',
      accessToken: 'not-a-real-key',
      searchHub: 'PokemonSearch',
    });
    expect(config.organizationId).toBe('org');
    expect(config.accessToken).toBe('not-a-real-key');
    expect(config.search).toMatchObject({ searchHub: 'PokemonSearch' });
    expect(config.search?.pipeline).toBeUndefined();
    expect(config.organizationEndpoints?.search).toMatch(/^https:/);
    expect(config.analytics).toMatchObject({
      enabled: true,
      analyticsMode: 'legacy',
      originContext: 'Search',
      anonymous: true,
    });
    expect(config.analytics).not.toHaveProperty('trackingId');
  });

  it('keeps an explicit pipeline when one is configured', () => {
    const config = engineConfiguration({
      organizationId: 'org',
      accessToken: 'not-a-real-key',
      searchHub: 'PokemonSearch',
      pipeline: 'Pokemon Search',
    });
    expect(config.search).toMatchObject({ searchHub: 'PokemonSearch', pipeline: 'Pokemon Search' });
  });

  it('falls back to the public sample organization without a token', () => {
    const config = engineConfiguration({ organizationId: 'org', searchHub: 'PokemonSearch' });
    expect(config.accessToken).not.toBe('not-a-real-key');
    expect(config.organizationId).not.toBe('');
  });
});
