import { test, expect } from '@playwright/test';
import { captureRuntimeErrors, gotoRoute } from './helpers.js';

const staticAssets = [
  ['/robots.txt', /text\/plain/],
  ['/llms.txt', /text\/plain/],
  ['/images/hyt_logo.png', /image\/png/],
  ['/images/landing_page.png', /image\/png/],
];

test.describe('release integrity', () => {
  test('REL-003 preview loads without a fatal runtime error', async ({ page }) => {
    const errors = captureRuntimeErrors(page);
    await gotoRoute(page, '/');
    await expect(page.locator('body')).toBeVisible();
    expect(errors).toEqual([]);
  });

  test('REL-006 nested routes use the SPA rewrite', async ({ request }) => {
    const response = await request.get('/student/calendar');
    expect(response.status()).toBe(200);
    expect(response.headers()['content-type']).toContain('text/html');
    expect(await response.text()).toContain('<div id="root">');
  });

  test('REL-007 unknown routes fail safely in the client', async ({ page }) => {
    await gotoRoute(page, '/qa-unknown-route');
    await expect(page).toHaveURL(/\/$/);
  });

  for (const [asset, contentType] of staticAssets) {
    test(`REL-009 ${asset} is published with the correct type`, async ({ request }) => {
      const response = await request.get(asset);
      expect(response.status()).toBe(200);
      expect(response.headers()['content-type']).toMatch(contentType);
    });
  }
});
