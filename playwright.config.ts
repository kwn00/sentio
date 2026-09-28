import { defineConfig } from '@playwright/test';
export default defineConfig({
  testDir: './tests',
  use: { baseURL: 'http://localhost:3107' },
  webServer: {
    command: 'npm run start -- --port 3107',
    url: 'http://localhost:3107',
    env: { TYPESAFE_API_KEY: '' },
    reuseExistingServer: false,
    timeout: 30_000,
  },
});
