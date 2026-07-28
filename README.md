# HYTech Learning Management System

A browser-based LMS for **HYT Global Institute**, built as a React single-page
application on Firebase. It supports three roles — Administrator, Trainer, and
Student/Trainee — covering TESDA-aligned sectors, course templates, live classes,
learning content, assessments, submissions, grading, and notifications.

> **New developer?** Start with
> [HYTECH_LMS_DEVELOPER_TURNOVER_GUIDE.md](HYTECH_LMS_DEVELOPER_TURNOVER_GUIDE.md).
> It is the authoritative reference for setup, operations, security posture, and
> the improvement roadmap. This README is the short orientation.

---

## Table of contents

- [Architecture](#architecture)
- [Environments](#environments)
- [Technology stack](#technology-stack)
- [Repository layout](#repository-layout)
- [Getting started](#getting-started)
- [Available scripts](#available-scripts)
- [Roles and routes](#roles-and-routes)
- [Data model](#data-model)
- [Assessments and grading](#assessments-and-grading)
- [Security model](#security-model)
- [Testing and QA](#testing-and-qa)
- [Deployment](#deployment)
- [Troubleshooting](#troubleshooting)
- [Contributing](#contributing)

---

## Architecture

```text
Browser
  |
  +-- React + React Router + Tailwind (Vite build)
  |
  +-- Firebase Authentication      identity
  +-- Cloud Firestore              application data + real-time listeners
  +-- Cloud Storage                materials, avatars, submissions
  +-- Cloud Functions              privileged writes, secure grading, triggers
  |
Firebase Hosting serves the production build
```

There is no Redux or central store. State lives in component state,
`AuthContext`, `ToastContext`, custom hooks, and Firestore `onSnapshot`
listeners. `src/utils/firestoreService.js` is the browser-side data-access layer.

Two components carry a large share of product behavior and are the top
maintainability priority: `StudentCourse.jsx` (student class experience, quiz
runner, submissions) and `ClassDetail.jsx` (trainer class management, builders,
grading, gradebook).

## Environments

| Environment | Firebase project | Purpose |
| --- | --- | --- |
| Production | `hyt-global-institute-lms` | Live application and real data |
| Staging | `hytech-lms-staging` | QA and safe integration testing |

Both deploy to region `asia-southeast1`. **Never use production learner data or
production credentials for local testing.** Prefer staging for development.

## Technology stack

| Layer | Technology |
| --- | --- |
| UI | React 18, React Router 7, Tailwind CSS 3, Lucide React |
| Build | Vite 8 (output: `dist/`) |
| Client SDK | Firebase Web SDK 12 (Auth, Firestore, Storage, Functions, App Check) |
| Backend | Cloud Functions, Node.js 22, `firebase-functions` + `firebase-admin` |
| Testing | Playwright, `@axe-core/playwright` |
| CI/CD | GitHub Actions |

## Repository layout

The deployable application lives in `HYTech/`. Run all npm and Firebase commands
from there.

```text
HYTechLMS/
|-- .github/workflows/
|   |-- qa.yml                  # Build + Playwright QA (push, pull_request)
|   `-- deploy.yml              # Firebase production deploy (push to main)
|-- docs/                       # Architecture, QA playbook, roadmap, audits
|-- HYTech/                     # Application root
|   |-- functions/src/index.js  # All Cloud Functions
|   |-- scripts/                # QA seeding, provisioning, validation, cleanup
|   |-- src/
|   |   |-- components/         # admin, auth, dashboard, hytbot, landing,
|   |   |                       # layout, logs, sectors, settings, shared,
|   |   |                       # student, trainer, users
|   |   |-- context/            # AuthContext, ToastContext, hooks
|   |   |-- data/               # Local TESDA catalog
|   |   |-- hooks/
|   |   |-- utils/              # firestoreService.js, authRole, avatarStorage
|   |   |-- App.jsx             # Route table
|   |   `-- firebase.js         # Firebase client initialization
|   |-- tests/e2e/              # public, roles, responsive, accessibility, release
|   |-- firebase.json           # Hosting, headers, rules wiring
|   |-- firestore.rules
|   |-- storage.rules
|   |-- playwright.config.js
|   `-- vite.config.js
`-- HYTECH_LMS_DEVELOPER_TURNOVER_GUIDE.md
```

## Getting started

### Prerequisites

- **Node.js 22 LTS** (matches the Cloud Functions runtime)
- Git
- Firebase CLI
- Access to the staging Firebase project

### Install

```powershell
git clone <authorized-repository-url>
Set-Location HYTechLMS/HYTech

npm ci
npm ci --prefix functions
npx playwright install chromium
```

Use `npm ci`, not `npm install`, for reproducible installs. Dependency upgrades
belong in isolated, reviewed commits.

### Configure environment

Vite exposes `VITE_`-prefixed variables to browser code. Firebase web config
values identify a project but are **not** authorization secrets — security rests
on Auth, Security Rules, App Check, and backend validation.

```powershell
Copy-Item .env.staging.example .env.staging.local
```

| Variable | Notes |
| --- | --- |
| `VITE_FIREBASE_API_KEY` | Public identifier; restrict in Google Cloud |
| `VITE_FIREBASE_AUTH_DOMAIN` | |
| `VITE_FIREBASE_PROJECT_ID` | Must match the intended environment |
| `VITE_FIREBASE_STORAGE_BUCKET` | |
| `VITE_FIREBASE_MESSAGING_SENDER_ID` | |
| `VITE_FIREBASE_APP_ID` | |
| `VITE_RECAPTCHA_SITE_KEY` | App Check site key |

`npm run dev` reads `.env.local` — **verify that file does not silently point at
production.**

Never commit `.env.local`, `.env.staging.local`, `.env.e2e.local`,
service-account JSON, Firebase CI tokens, or real passwords.

### Run

```powershell
npm run dev            # uses .env.local
npm run dev:staging    # uses .env.staging.local
```

Vite prefers port `3000` and will pick another if it is taken — use the URL
printed in the terminal.

### Test accounts

There are no shared built-in credentials. Provision dedicated **staging**
identities with the guarded seeding scripts, covering active admin, active
trainer, enrolled student, unenrolled student, pending student, and disabled
student:

```powershell
npm run qa:seed:identities
npm run qa:seed:data
npm run qa:verify-seed
```

Read each script and confirm its target project before running it.

## Available scripts

Run from `HYTech/`.

| Command | Purpose |
| --- | --- |
| `npm run dev` / `dev:staging` | Development server |
| `npm run build` / `build:staging` | Production bundle to `dist/` |
| `npm run preview` | Serve the built bundle locally |
| `npm run test:e2e` | Playwright, Chromium only |
| `npm run test:e2e:public` | Public pages + accessibility |
| `npm run test:e2e:responsive` | Responsive/layout checks |
| `npm run test:e2e:roles` | Authenticated role journeys |
| `npm run test:qa:full` | Validate QA env, then all four browsers |
| `npm run test:e2e:ui` / `:report` | Playwright UI mode / HTML report |
| `npm run qa:seed:*`, `qa:verify-seed`, `qa:cleanup` | Staging fixture management |
| `npm run deploy:staging` / `deploy:production` | Hosting-only deploy |

## Roles and routes

Three active roles. Route protection combines Firebase Auth state, the Firestore
user profile, account status, email verification, and the stored role.

```text
/                      Public landing page
/signin                Sign in
/signup                Student self-registration
/verify-email          Email verification

/admin/*               users, sectors, classes, logs, id-requests,
                       incident-forms, settings, notifications
/trainer/*             classes, :className, tasks, sectors/:sectorId,
                       archived, settings, notifications
/student/*             enroll, :classname, tasks, calendar, request-id,
                       incident-form, archived, settings, notifications
/class/:className      Shared/legacy class entry
```

Unknown routes redirect to `/`. Self-registration always produces a student;
trainer and admin accounts must be created or promoted by an administrator.

## Data model

Key top-level collections: `users`, `sectors`, `courses`, `classes`,
`classDirectory`, `enrollments`, `notifications`, `activityLogs`, `idRequests`,
`incidentForms`, `config/appSettings`, `students/{uid}/progress/{classId}`.

```text
classes/{classId}/
|-- members/{studentId}
|-- activity/{eventId}
|-- topics/{topicId}
|-- modules/{moduleId}/materials/{materialId}
|-- materials/{materialId}
|-- announcements/{announcementId}/comments/{commentId}
|-- assessments/{assessmentId}
|   |-- private/answerKey
|   `-- attempts/{attemptId}
`-- assignments/{assignmentId}
    |-- private/answerKey
    |-- attempts/{attemptId}
    `-- submissions/{studentId}
```

## Assessments and grading

**Two authoring paths produce quiz-like items:** the assessment builder writes to
`classes/{id}/assessments`, and the form builder writes to
`classes/{id}/assignments`. Anything resolving a graded item must check **both**
collections, and attempts must be read from the same parent that authored the
item. Submission-type assignments collect uploaded work instead and are graded by
a trainer.

**Correct answers live in the private `answerKey` document**, never in the
trainee-readable assessment/assignment document.

**Grading is server-side.** `submitAssessmentAttempt` validates the caller,
enrollment, publication state, availability window, and time limit, then grades
and writes an immutable attempt. Browser clients cannot create or alter attempts.
Paragraph answers land in `pending_review`; trainers finalize them through
`gradeAssessmentAttempt`.

**Deadlines carry a time of day.** Availability and due dates are authored with
`datetime-local` pickers and stored as absolute ISO instants. Legacy records hold
a bare `YYYY-MM-DD`, which resolves to the end of that day for a deadline and the
start of it for an open date — client and Cloud Function apply this identically.
Once a deadline passes, an unattempted assessment is closed and scored 0; that
zero is derived from "no attempt + deadline passed" rather than stored. Submission
tasks flagged `allowLateSubmissions` are exempt.

## Security model

Authentication and authorization are deliberately separate. Firebase Auth proves
identity; `users/{uid}` holds the application role and status; route guards
control navigation; Firestore and Storage rules independently enforce access; and
Cloud Functions recheck auth, role, status, ownership, and input.

**Route guards are not security.** A hostile client can call Firebase APIs
directly. Every sensitive operation must be enforced in rules or in a validated
Cloud Function.

Currently in place: role- and status-aware guards, Firestore/Storage rules,
secure callable submission, private answer keys, server-authorized grading,
raster-only avatar MIME types, and hosting headers (HSTS, `X-Frame-Options`,
`X-Content-Type-Options`, Referrer-Policy, Permissions-Policy, COOP, and a
**report-only** CSP).

Known gaps are tracked in [section 11 of the turnover
guide](HYTECH_LMS_DEVELOPER_TURNOVER_GUIDE.md) — including student-writable
progress, unvalidated external URL protocols, unenforced App Check, QA not
gating deployment, and the long-lived `FIREBASE_TOKEN`. Read it before making
security-adjacent changes.

## Testing and QA

Before committing:

```powershell
npm run build
node --check functions/src/index.js
npm run test:e2e:public
npm run test:e2e:responsive
```

For authenticated tests, copy `.env.e2e.example` to `.env.e2e.local` and fill in
**staging-only** accounts. The Playwright config refuses arbitrary remote
targets: it allows `hytech-lms-staging.web.app`, or localhost with
`E2E_ALLOW_LOCAL=true`.

CI runs [`.github/workflows/qa.yml`](.github/workflows/qa.yml) on every push and
pull request — seeding staging fixtures, building, then running Chromium, Edge,
Firefox, and WebKit. A failure fails the check. On failure the run uploads a
`playwright-evidence-<run>` artifact containing the HTML report plus traces,
screenshots, and video (retained 14 days); open a trace with
`npx playwright show-trace <path>`. Passing runs upload nothing. CI retries a
failing test twice, so flakiness can hide behind a green check.

For assessment or class changes, also run the manual smoke flow in
[docs/FULL_WEBSITE_QA_PLAYBOOK.md](docs/FULL_WEBSITE_QA_PLAYBOOK.md).

## Deployment

Verify the target project before every deploy — a local build can point at a
different project than the CLI deploy target:

```powershell
firebase use
firebase projects:list
```

**Pushing to `main` deploys production automatically.**
[`deploy.yml`](.github/workflows/deploy.yml) runs a bare `firebase deploy` with
no `--only`, shipping Hosting, Firestore rules and indexes, Storage rules, **and**
Cloud Functions together.

> ⚠️ **QA does not gate deployment.** The QA and deploy workflows react to the
> same push independently, and deploy usually finishes first. A failing QA run
> can coexist with a successful production deploy. Making deploy depend on QA is
> a Phase 0 roadmap item.

Manual staging release:

```powershell
npm run build:staging
npm run test:qa:full
firebase deploy --project staging --dry-run
firebase deploy --project staging
```

Deploy rules, indexes, and functions **before** Hosting when the frontend depends
on new backend behavior. Rollback: use Hosting release history, redeploy the last
known-good functions or rules. There is no automatic rollback for destructive
Firestore mutations — use exports and tested migrations.

## Troubleshooting

**"Firebase configuration is missing"** — check the right `.env.*.local` exists in
`HYTech/`, all `VITE_FIREBASE_*` values are populated, and the dev server was
restarted after the change.

**"Missing or insufficient permissions"** — verify the user is signed in,
`users/{uid}` exists with the expected role and status, email verification state
is correct, and the latest rules were deployed to the *same* project the frontend
targets. Do not weaken rules globally to make the error go away.

**Callable function not found** — confirm the client uses region
`asia-southeast1`, the function is exported from `functions/src/index.js`, and
functions were deployed after the code change.

**Quiz submission fails** — check the assessment is published and accepting
responses; the availability window and deadline are valid; the student has an
active enrollment; the item may live under `assessments` *or* `assignments`; and
functions and rules were deployed together. The exact `HttpsError` code appears
in the function logs.

**Production UI did not change** — confirm the build ran, Hosting deployed
`dist/`, the correct project was targeted, and backend-dependent changes also had
functions and rules deployed.

More detail in [section 13 of the turnover
guide](HYTECH_LMS_DEVELOPER_TURNOVER_GUIDE.md).

## Contributing

Keep changes scoped and reversible. Never mix an unrelated dependency upgrade
into a feature fix. Avoid browser-side writes for authoritative security or
grading data. Use transactions or batches for multi-document consistency.

**Pull-request checklist:**

- [ ] Requirement and acceptance criteria stated
- [ ] Security impact reviewed
- [ ] Verified against staging, not production
- [ ] Production build passes
- [ ] Relevant Playwright tests pass
- [ ] Mobile, tablet, and desktop checked
- [ ] Keyboard access and labels checked for UI changes
- [ ] Functions, rules, and indexes included when the frontend depends on them
- [ ] Migration and rollback documented
- [ ] No credentials, personal data, or internal audit files added

A change is done when rules and functions support the behavior, failure states
are understandable, tests cover the risky path, staging verification passes, and
rollback is possible — not when it merely works locally.

---

## License

Proprietary to HYT Global Institute. Unauthorized copying or distribution is
prohibited.

---

*Last updated: July 27, 2026 · See the turnover guide for the authoritative
technical reference.*
