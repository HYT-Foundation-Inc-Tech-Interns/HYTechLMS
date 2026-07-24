import { test, expect } from '@playwright/test';
import {
  captureRuntimeErrors,
  expectNoHorizontalOverflow,
  gotoRoute,
  protectedRoutes,
} from './helpers.js';

test.describe('public smoke tests', () => {
  test('landing page links to sign up and sign in', async ({ page }) => {
    const errors = captureRuntimeErrors(page);
    await gotoRoute(page, '/');

    await expect(page.getByRole('heading', { name: /building skills/i })).toBeVisible();
    await page.getByRole('button', { name: 'Sign In' }).click();
    await expect(page).toHaveURL(/\/signin$/);
    await expect(page.getByRole('heading', { name: 'Welcome Back', exact: true })).toBeVisible();
    await expectNoHorizontalOverflow(page);
    expect(errors).toEqual([]);
  });

  test('sign-up page is reachable', async ({ page }) => {
    await gotoRoute(page, '/');
    await page.getByRole('button', { name: 'Get Started' }).click();
    await expect(page).toHaveURL(/\/signup$/);
    await expect(page.locator('form')).toBeVisible();
    await expectNoHorizontalOverflow(page);
  });

  test('password visibility control works', async ({ page }) => {
    await gotoRoute(page, '/signin');
    const password = page.getByLabel('Password', { exact: true });
    await password.fill('temporary-value');
    await page.getByRole('button', { name: 'Show password' }).click();
    await expect(password).toHaveAttribute('type', 'text');
    await page.getByRole('button', { name: 'Hide password' }).click();
    await expect(password).toHaveAttribute('type', 'password');
  });

  for (const route of protectedRoutes) {
    test(`unauthenticated ${route} redirects to sign in`, async ({ page }) => {
      await gotoRoute(page, route);
      await expect(page).toHaveURL(/\/signin$/);
    });
  }

  test('unknown routes return safely to landing', async ({ page }) => {
    await gotoRoute(page, '/this-route-does-not-exist');
    await expect(page).toHaveURL(/\/$/);
  });
});
