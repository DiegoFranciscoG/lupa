import {defineConfig, devices} from '@playwright/test';

// End-to-end tests run against the production build served by `vite preview`,
// with the real published data in public/data.
export default defineConfig({
  testDir: './e2e',
  timeout: 120_000,
  expect: {timeout: 60_000},
  fullyParallel: false,
  workers: 1,
  reporter: [['list']],
  use: {baseURL: 'http://localhost:4173/', trace: 'off'},
  projects: [
    {name: 'desktop', use: {...devices['Desktop Chrome']}},
    {name: 'mobile', use: {...devices['Pixel 7']}, grep: /@mobile/},
  ],
  webServer: {
    command: 'npx vite preview --port 4173 --strictPort',
    url: 'http://localhost:4173/',
    reuseExistingServer: true,
    timeout: 60_000,
  },
});
