// Browser tests run against the production build (`vite preview` serving dist), at phone
// width, since that is the layout most visitors get. `npm run e2e` builds first.
import { defineConfig, devices } from '@playwright/test';

const isCI = Boolean(process.env.CI);

export default defineConfig({
  testDir: 'e2e',
  forbidOnly: isCI,
  retries: isCI ? 1 : 0,
  reporter: isCI ? [['github'], ['html', { open: 'never' }]] : 'list',
  use: { baseURL: 'http://localhost:4183', trace: 'retain-on-failure' },
  projects: [
    {
      name: 'phone',
      use: { ...devices['Desktop Chrome'], viewport: { width: 375, height: 812 }, isMobile: true, hasTouch: true },
    },
  ],
  webServer: { command: 'npx vite preview --port 4183 --strictPort', url: 'http://localhost:4183', reuseExistingServer: false },
});
