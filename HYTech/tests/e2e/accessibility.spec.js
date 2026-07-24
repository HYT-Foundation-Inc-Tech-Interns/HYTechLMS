import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import { gotoRoute, publicRoutes } from './helpers.js';

for (const route of publicRoutes) {
  test(`${route} has no serious or critical accessibility violations`, async ({ page }) => {
    await gotoRoute(page, route);
    await page.locator('main, form, h1').first().waitFor({ state: 'visible' });
    await page.addStyleTag({
      content: `
        *, *::before, *::after {
          animation: none !important;
          transition: none !important;
        }
      `,
    });
    const results = await new AxeBuilder({ page })
      .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'])
      .analyze();

    const blocking = results.violations.filter(
      (violation) => violation.impact === 'critical' || violation.impact === 'serious'
    );

    expect(
      blocking,
      blocking.map((violation) => (
        `${violation.id}: ${violation.help} (${violation.nodes.length} nodes)`
      )).join('\n')
    ).toEqual([]);
  });
}
