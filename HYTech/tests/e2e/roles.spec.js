import { test, expect } from '@playwright/test';
import {
  expectNoHorizontalOverflow,
  gotoRoute,
  hasCredentials,
  roleCredentials,
  signInAs,
} from './helpers.js';

const roleRoutes = {
  admin: ['/admin', '/admin/users', '/admin/sectors', '/admin/classes', '/admin/settings'],
  trainer: ['/trainer', '/trainer/tasks', '/trainer/archived', '/trainer/settings'],
  student: ['/student', '/student/enroll', '/student/calendar', '/student/tasks', '/student/settings'],
};

for (const [role, routes] of Object.entries(roleRoutes)) {
  test.describe(`${role} smoke tests`, () => {
    test.skip(!hasCredentials(role), `Set ${role.toUpperCase()} E2E credentials to enable this suite.`);

    test.beforeEach(async ({ page }) => {
      await signInAs(page, role);
    });

    for (const route of routes) {
      test(`${route} loads without page overflow`, async ({ page }) => {
        await gotoRoute(page, route);
        await expect(page).toHaveURL(new RegExp(`${route}(?:$|\\?)`));
        await expect(page.locator('body')).toBeVisible();
        await expectNoHorizontalOverflow(page);
      });
    }

    test('cannot remain on another role dashboard', async ({ page }) => {
      const foreignRoute =
        role === 'admin'
          ? '/trainer'
          : '/admin';
      await gotoRoute(page, foreignRoute);
      await expect(page).toHaveURL(new RegExp(`${roleCredentials[role].homePath}(?:$|\\?)`));
    });
  });
}
