import { defineConfig, devices } from '@playwright/test';

// E2E tests mock the API in the browser (see e2e/mockApi.ts), so they only need
// the Vite dev server. To test against the real API instead, start it and set
// E2E_REAL_API=1 (the mock is then skipped).
export default defineConfig({
  testDir: './e2e',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  reporter: [
    [process.env.CI ? 'github' : 'list'],
    ['html', { open: process.env.CI ? 'never' : 'on-failure' }],
  ],
  use: {
    baseURL: 'http://localhost:5173',
    // The API is mocked, so a click that takes longer than this is stuck, not slow.
    actionTimeout: 5_000,
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
    launchOptions: process.env.PW_CHROMIUM_PATH ? { executablePath: process.env.PW_CHROMIUM_PATH } : {},
  },
  projects: [
    { name: 'desktop', use: { ...devices['Desktop Chrome'] } },
    { name: 'phone', use: { ...devices['Pixel 7'] } },
  ],
  webServer: { command: 'npm run dev', url: 'http://localhost:5173', reuseExistingServer: !process.env.CI },
});
