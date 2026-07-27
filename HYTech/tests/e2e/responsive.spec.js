import { test, expect } from '@playwright/test';
import {
  expectInteractiveControlsInViewport,
  expectNoHorizontalOverflow,
  gotoRoute,
  publicRoutes,
} from './helpers.js';

const viewports = [
  { name: 'small-phone', width: 320, height: 568 },
  { name: 'small-phone', width: 360, height: 800 },
  { name: 'iphone', width: 390, height: 844 },
  { name: 'large-android', width: 412, height: 915 },
  { name: 'tablet-portrait', width: 768, height: 1024 },
  { name: 'tablet-landscape', width: 1024, height: 768 },
  { name: 'laptop', width: 1366, height: 768 },
  { name: 'desktop', width: 1440, height: 900 },
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
        const offCenterIcons = await page.locator(
          'button:has(> svg:only-child), [role="button"]:has(> svg:only-child)'
        ).evaluateAll((controls) => controls
          .filter((control) => {
            const style = window.getComputedStyle(control);
            const rect = control.getBoundingClientRect();
            return style.visibility !== 'hidden'
              && style.display !== 'none'
              && rect.width > 0
              && rect.height > 0;
          })
          .map((control) => {
            const controlRect = control.getBoundingClientRect();
            const iconRect = control.querySelector(':scope > svg').getBoundingClientRect();
            return {
              label: control.getAttribute('aria-label') || 'icon button',
              horizontalOffset: Math.abs(
                (iconRect.left + iconRect.width / 2)
                - (controlRect.left + controlRect.width / 2)
              ),
              verticalOffset: Math.abs(
                (iconRect.top + iconRect.height / 2)
                - (controlRect.top + controlRect.height / 2)
              ),
            };
          })
          .filter(({ horizontalOffset, verticalOffset }) =>
            horizontalOffset > 1 || verticalOffset > 1));

        expect(
          offCenterIcons,
          `Single-symbol controls are not centered: ${JSON.stringify(offCenterIcons)}`
        ).toEqual([]);
        await expect(page.locator('body')).toBeVisible();
      });
    }
  });
}
