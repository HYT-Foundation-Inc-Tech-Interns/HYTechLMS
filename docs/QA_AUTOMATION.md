# QA automation

The Playwright suite runs against the isolated Firebase staging deployment:

`https://hytech-lms-staging.web.app`

The configuration rejects other remote hostnames. A local target is accepted
only when `E2E_ALLOW_LOCAL=true` is explicitly set.

## Install

From `HYTech`:

```powershell
npm install
npx playwright install chromium
```

## Commands

```powershell
npm run test:e2e
npm run test:e2e:public
npm run test:e2e:responsive
npm run test:e2e:roles
npm run test:e2e:ui
npm run test:e2e:report
```

The HTML report is written to `HYTech/playwright-report`. Failed tests retain a
screenshot, video, and browser trace under `HYTech/test-results`. Both folders
are ignored by Git.

## Authenticated role tests

Copy `.env.e2e.example` to `.env.e2e.local` and add dedicated staging-only
credentials:

```dotenv
E2E_BASE_URL=https://hytech-lms-staging.web.app
E2E_ADMIN_EMAIL=
E2E_ADMIN_PASSWORD=
E2E_TRAINER_EMAIL=
E2E_TRAINER_PASSWORD=
E2E_STUDENT_EMAIL=
E2E_STUDENT_PASSWORD=
```

Never reuse production accounts or commit `.env.e2e.local`. A missing role is
reported as skipped rather than failed so public checks can still run.

Each account needs an active Firebase Authentication user and a matching
Firestore `users/{uid}` document with `status: "Active"` and the expected
`role`. Student accounts must be email-verified unless their profile is marked
as admin-created by the supported application workflow.

## Current automated coverage

- Landing, sign-in, and sign-up smoke tests
- Password visibility behavior
- Unauthenticated redirects for every static protected route
- Unknown-route fallback
- Serious and critical WCAG 2/2.1 axe violations on public pages
- Horizontal overflow and off-screen interactive controls at:
  - 360 × 800
  - 390 × 844
  - 768 × 1024
  - 1366 × 768
  - 1920 × 1080
- Admin, trainer, and student dashboard route smoke tests when credentials exist
- Cross-role dashboard redirection

The manual workflow and destructive feature coverage remains in
`FULL_WEBSITE_QA_PLAYBOOK.md`. Playwright should detect and prove regressions;
production deployment still requires human approval.

## GitHub Actions

`.github/workflows/qa.yml` runs the staging build and complete Playwright suite
on every push and pull request. It serves the exact pushed build locally while
the application connects only to the staging Firebase project.

Public and responsive tests run without repository secrets. To activate the
authenticated role suite, add these GitHub repository Actions secrets:

- `E2E_ADMIN_EMAIL`
- `E2E_ADMIN_PASSWORD`
- `E2E_TRAINER_EMAIL`
- `E2E_TRAINER_PASSWORD`
- `E2E_STUDENT_EMAIL`
- `E2E_STUDENT_PASSWORD`

Use dedicated staging-only accounts. Failed workflow runs upload the HTML
report, screenshots, videos, and traces as a private workflow artifact retained
for 14 days.
