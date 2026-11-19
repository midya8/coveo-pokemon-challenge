import { expect, test } from '@playwright/test';
import { fulfillCoveo, resultsMustMatch, selectedTypes } from './coveo-fixture';

test.beforeEach(async ({ page }) => {
  await page.route('**://*.coveo.com/**', fulfillCoveo);
  await page.route('**://platform.cloud.coveo.com/**', fulfillCoveo);
});

test('Fire and Flying is a conjunction and shows Charizard', async ({ page }) => {
  const searches: { selected: string[]; match: string | undefined }[] = [];
  page.on('request', (request) => {
    if (!request.url().includes('/rest/search/v2') || request.method() !== 'POST') return;
    if (request.url().includes('querySuggest')) return;
    const body = JSON.parse(request.postData() || '{}') as Parameters<typeof selectedTypes>[0];
    if (!body.facets?.some((facet) => facet.field === 'pokemon_type')) return;
    searches.push({ selected: selectedTypes(body), match: resultsMustMatch(body) });
  });

  await page.goto('/');
  const type = page.locator('section', { has: page.getByRole('heading', { name: 'Type' }) });
  await type.getByText('Fire', { exact: true }).click();
  await type.getByText('Flying', { exact: true }).click();

  await expect(page.getByRole('heading', { name: 'Charizard', exact: true })).toBeVisible();
  await expect(page.locator('.summary')).toContainText('of 2 Pokémon');
  expect(searches.at(-1)).toEqual({ selected: expect.arrayContaining(['Fire', 'Flying']), match: 'allValues' });
  expect(searches.at(-1)?.selected).toHaveLength(2);

  await page.getByRole('link', { name: /Charizard/ }).click();
  await expect(page.getByRole('heading', { level: 1, name: 'Charizard' })).toBeVisible();
  await page.getByRole('link', { name: 'Back to search' }).click();
  await expect(page.getByRole('heading', { name: 'Charizard', exact: true })).toBeVisible();
});

test('an empty query-suggestion list falls back to index matches', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('heading', { name: 'Type' }).waitFor();
  const box = page.getByRole('combobox', { name: 'Search Pokémon' });
  await box.fill('zzznone');
  await expect(page.getByText('No query suggestions for that text')).toBeVisible();
  await expect(page.getByRole('listbox', { name: 'Search suggestions' })).toBeVisible();
});
