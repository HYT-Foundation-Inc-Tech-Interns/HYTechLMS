# Firebase environments

## Projects

| Environment | Firebase project | Hosting |
| --- | --- | --- |
| Production | `hyt-global-institute-lms` | Existing production site |
| Staging | `hytech-lms-staging` | https://hytech-lms-staging.web.app |

The default Firebase CLI alias remains production. Explicit aliases named
`production` and `staging` are also configured in `HYTech/.firebaserc`.

## Local commands

Run these commands from `HYTech`:

```powershell
npm run dev
npm run dev:staging
npm run build
npm run build:staging
npm run deploy:staging
npm run deploy:production
```

Normal `dev` and `build` use `.env.local` and therefore production. Staging
commands use `.env.staging.local`. That file is intentionally ignored by Git;
new developers should copy `.env.staging.example` to `.env.staging.local`.

Always test a staging build before deploying production. The deploy scripts
specify their Firebase alias explicitly to reduce accidental cross-environment
deployments.

## Provisioned on staging

- Firebase web app
- Firebase Hosting
- Email/Password Authentication
- Cloud Firestore in `asia-southeast1`
- Firestore security rules
- Firestore composite indexes
- Cloud Storage in `asia-southeast1`
- Cloud Storage security rules

## Optional billable setup

If the application needs Cloud Functions in staging, attach a billing account
first and then run:

```powershell
firebase deploy --only functions --project staging
```

Cloud Functions may require the Blaze plan. Do not attach a billing account
without the project owner's approval.

## Test data

Production Authentication users and Firestore data do not automatically copy
to staging. Create dedicated staging test users after Email/Password sign-in is
enabled, then seed only non-sensitive test data. Never copy live passwords or
production personal data into staging.
