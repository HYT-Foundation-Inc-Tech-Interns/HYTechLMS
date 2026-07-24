import { expect } from '@playwright/test';

export const roleCredentials = {
  admin: {
    email: process.env.E2E_ADMIN_EMAIL,
    password: process.env.E2E_ADMIN_PASSWORD,
    homePath: '/admin',
  },
  trainer: {
    email: process.env.E2E_TRAINER_EMAIL,
    password: process.env.E2E_TRAINER_PASSWORD,
    homePath: '/trainer',
  },
  student: {
    email: process.env.E2E_STUDENT_EMAIL,
    password: process.env.E2E_STUDENT_PASSWORD,
    homePath: '/student',
  },
};

export async function gotoRoute(page, route) {
  await page.goto(route, { waitUntil: 'domcontentloaded' });
}

export function hasCredentials(role) {
  const credentials = roleCredentials[role];
  return Boolean(credentials?.email && credentials?.password);
}

export async function signInAs(page, role) {
  const credentials = roleCredentials[role];
  if (!credentials?.email || !credentials?.password) {
    throw new Error(`Missing E2E credentials for ${role}.`);
  }

  await gotoRoute(page, '/signin');
  await page.getByLabel('Email', { exact: true }).fill(credentials.email);
  await page.getByLabel('Password', { exact: true }).fill(credentials.password);
  await page.getByRole('button', { name: /sign in/i }).click();
  await expect(page).toHaveURL(new RegExp(`${credentials.homePath}(?:/|$|\\?)`));
}

export function captureRuntimeErrors(page) {
  const errors = [];

  page.on('pageerror', (error) => errors.push(`pageerror: ${error.message}`));
  page.on('console', (message) => {
    if (message.type() === 'error') {
      errors.push(`console: ${message.text()}`);
    }
  });

  return errors;
}

export async function expectNoHorizontalOverflow(page) {
  const overflow = await page.evaluate(() => ({
    viewportWidth: document.documentElement.clientWidth,
    scrollWidth: document.documentElement.scrollWidth,
  }));

  expect(
    overflow.scrollWidth,
    `Document width ${overflow.scrollWidth}px exceeds viewport ${overflow.viewportWidth}px`
  ).toBeLessThanOrEqual(overflow.viewportWidth + 1);
}

export async function expectInteractiveControlsInViewport(page) {
  const outside = await page.locator(
    'a[href], button, input, select, textarea, [role="button"], [tabindex]:not([tabindex="-1"])'
  ).evaluateAll((elements) => elements
    .filter((element) => {
      const style = window.getComputedStyle(element);
      const rect = element.getBoundingClientRect();
      return style.visibility !== 'hidden'
        && style.display !== 'none'
        && rect.width > 0
        && rect.height > 0;
    })
    .map((element) => {
      const rect = element.getBoundingClientRect();
      return {
        label:
          element.getAttribute('aria-label')
          || element.textContent?.trim().slice(0, 80)
          || element.getAttribute('name')
          || element.tagName,
        left: Math.round(rect.left),
        right: Math.round(rect.right),
      };
    })
    .filter(({ left, right }) => left < -1 || right > window.innerWidth + 1));

  expect(outside, `Interactive controls outside viewport: ${JSON.stringify(outside)}`).toEqual([]);
}

export const publicRoutes = ['/', '/signin', '/signup'];

export const protectedRoutes = [
  '/admin',
  '/admin/users',
  '/admin/sectors',
  '/admin/classes',
  '/admin/logs',
  '/admin/id-requests',
  '/admin/incident-forms',
  '/admin/settings',
  '/admin/notifications',
  '/trainer',
  '/trainer/tasks',
  '/trainer/archived',
  '/trainer/settings',
  '/trainer/notifications',
  '/student',
  '/student/enroll',
  '/student/calendar',
  '/student/request-id',
  '/student/incident-form',
  '/student/tasks',
  '/student/archived',
  '/student/settings',
  '/student/notifications',
];
