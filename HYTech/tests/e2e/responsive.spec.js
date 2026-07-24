import { test, expect } from '@playwright/test';
import {
  expectInteractiveControlsInViewport,
  expectNoHorizontalOverflow,
  gotoRoute,
  publicRoutes,
} from './helpers.js';

const viewports = [
  { name: 'small-phone', width: 360, height: 800 },
  { name: 'phone', width: 390, height: 844 },
  { name: 'tablet', width: 768, height: 1024 },
  { name: 'laptop', width: 1366, height: 768 },
  { name: 'desktop', width: 1920, height: 1080 },
];

for (const viewport of viewports) {
  test.describe(`${viewport.name} ${viewport.width}x${viewport.height}`, () => {
    test.use({ viewport });

    for (const route of publicRoutes) {
      test(`${route} fits the viewport`, async ({ page }) => {
        await gotoRoute(page, route);
        await page.locator('body').waitFor({ state: 'visible' });
        await expectNoHorizontalOverflow(page);
        await expectInteractiveControlsInViewport(page);
        await expect(page.locator('body')).toBeVisible();
      });
    }
  });
}
