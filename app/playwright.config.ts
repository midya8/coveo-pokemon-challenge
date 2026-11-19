import { defineConfig, devices } from '@playwright/test';

const port = 4178;

export default defineConfig({
  testDir: './e2e',
  timeout: 30_000,
  fullyParallel: false,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  reporter: process.env.CI ? 'github' : 'list',
  use: {
    baseURL: `http://127.0.0.1:${port}`,
    ...devices['Desktop Chrome'],
    // The dev machine has Chrome. CI installs Playwright's Chromium.
    channel: process.env.CI ? undefined : 'chrome',
  },
  webServer: {
    command: `npm run dev -- --host 127.0.0.1 --port ${port}`,
    url: `http://127.0.0.1:${port}`,
    reuseExistingServer: !process.env.CI,
    env: {
      VITE_COVEO_ORG_ID: 'voljzmfhemcvoorg',
      VITE_COVEO_API_KEY: 'playwright-not-a-real-key',
      VITE_COVEO_SEARCH_HUB: 'PokemonSearch',
    },
  },
});
