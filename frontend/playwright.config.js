import { defineConfig, devices } from '@playwright/test'

// Visual pass over the redesign. Every /api call is answered from fixtures
// (e2e/fixtures.js), so no backend or database is needed.
export default defineConfig({
  testDir: './e2e',
  timeout: 60_000,
  fullyParallel: false,
  reporter: 'list',
  use: {
    baseURL: 'http://localhost:5174',
    locale: 'ru-RU',
    timezoneId: 'Europe/Moscow',
  },
  webServer: {
    command: 'npx vite --port 5174 --strictPort',
    url: 'http://localhost:5174',
    reuseExistingServer: true,
  },
  projects: [
    {
      name: 'mobile-390',
      use: { ...devices['iPhone 13'], viewport: { width: 390, height: 844 }, browserName: 'chromium' },
    },
    {
      name: 'desktop-1440',
      use: { viewport: { width: 1440, height: 900 }, browserName: 'chromium' },
    },
  ],
})
