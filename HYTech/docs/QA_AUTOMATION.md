# QA automation

The release workflow is intentionally strict. It builds the staging application,
validates that all three role accounts are configured, and runs Playwright against
Chromium (Chrome), Microsoft Edge, Firefox, and WebKit (Safari's browser engine).
Missing credentials fail the workflow; authenticated tests are never silently
counted as passing.

## Commands

From `HYTech`:

```powershell
npm ci
npx playwright install
npm run build:staging
npm run test:qa:full
```

For local work, put credentials in `.env.e2e.local`:

```text
E2E_BASE_URL=http://127.0.0.1:4173
E2E_ALLOW_LOCAL=true
E2E_REQUIRE_AUTH=true
E2E_ADMIN_EMAIL=...
E2E_ADMIN_PASSWORD=...
E2E_TRAINER_EMAIL=...
E2E_TRAINER_PASSWORD=...
E2E_STUDENT_EMAIL=...
E2E_STUDENT_PASSWORD=...
```

The file is ignored by Git. Never commit test passwords.

## Staging fixture commands

Set the service-account path in each new PowerShell session:

```powershell
$env:GOOGLE_APPLICATION_CREDENTIALS = "C:\Users\Gbert\.credentials\hytech-lms-staging-qa.json"
$env:GOOGLE_CLOUD_PROJECT = "hytech-lms-staging"
```

Then provision and verify the reusable staging fixtures:

```powershell
npm run qa:seed:identities
npm run qa:credentials
npm run qa:seed:data
npm run qa:verify-seed
```

`qa:credentials` preserves existing generated passwords in the ignored
`.env.e2e.local` file, so rerunning it is safe and does not unexpectedly rotate
CI credentials. `qa:seed:data` uses stable document IDs and merge writes.

Cleanup is a dry run by default:

```powershell
npm run qa:cleanup
```

Only after reviewing its count should transient run data be removed:

```powershell
npm run qa:cleanup:apply
```

Cleanup never removes the stable seed and selects only records explicitly marked
as QA-managed with a non-stable run ID.

## Automated on every push and pull request

- Staging production build and preview startup.
- Public landing, sign-in, signup, password visibility, unknown-route handling,
  and every protected-route redirect.
- Authenticated route smoke checks and cross-role route protection for admin,
  trainer, and trainee accounts.
- SPA nested-route rewrite and required public-asset/content-type checks.
- Serious and critical WCAG axe checks on public routes.
- Responsive checks at all nine playbook viewport sizes.
- Chrome, Edge, Firefox, and WebKit execution.
- Trace, screenshot, video, and HTML report upload when a check fails.

WebKit is a strong Safari-engine regression check, but it is not a substitute for
Safari running on Apple hardware.

## Required external evidence

These playbook requirements cannot be honestly completed by headless CI and remain
release-blocking evidence:

- A physical Android phone run.
- A physical iPhone/Safari run.
- A basic NVDA or VoiceOver screen-reader run.
- Human QA, product, engineering, and deployment-owner approvals.

Store that evidence with the release. CI passing does not manufacture or imply
those approvals.

## Current authenticated workflow limitation

The three configured role accounts provide deterministic route and permission
coverage. Full create/edit/archive/enrollment/assessment/submission/grading and
real-time two-session workflows additionally require disposable seeded staging
records and dedicated accounts (unenrolled, pending, disabled). Until that seed
harness exists, those cases must not be reported as automated. The workflow now
fails when the existing role credentials are absent, preventing the previous false
green caused by skipped role suites.
