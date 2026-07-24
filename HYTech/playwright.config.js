import { defineConfig } from '@playwright/test';
import { existsSync } from 'node:fs';

if (existsSync('.env.e2e.local')) {
  process.loadEnvFile('.env.e2e.local');
}

const baseURL = process.env.E2E_BASE_URL || 'https://hytech-lms-staging.web.app';
const target = new URL(baseURL);
const isStaging = target.hostname === 'hytech-lms-staging.web.app';
const isLocal =
  target.hostname === 'localhost'
  || target.hostname === '127.0.0.1';

if (!isStaging && !(isLocal && process.env.E2E_ALLOW_LOCAL === 'true')) {
  throw new Error(
    `Refusing to run E2E tests against ${target.hostname}. `
    + 'Use hytech-lms-staging.web.app or explicitly allow a local server.'
  );
}

export default defineConfig({
  testDir: './tests/e2e',
  fullyParallel: true,
  forbidOnly: Boolean(process.env.CI),
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 2 : 4,
  timeout: 30_000,
  expect: {
    timeout: 8_000,
  },
  reporter: [
    ['list'],
    ['html', { outputFolder: 'playwright-report', open: 'never' }],
  ],
  use: {
    baseURL,
    browserName: 'chromium',
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
    actionTimeout: 10_000,
    navigationTimeout: 20_000,
    reducedMotion: 'reduce',
  },
  webServer: isLocal
    ? {
        command: 'npm run preview -- --host 127.0.0.1 --port 4173',
        url: baseURL,
        reuseExistingServer: !process.env.CI,
        timeout: 120_000,
      }
    : undefined,
  outputDir: 'test-results',
});
