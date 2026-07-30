# Turnover risk register

Prepared: 2026-07-29
Prepared by: Gbert Pilapil
Projects: `hyt-global-institute-lms` (production), `hytech-lms-staging` (staging)

This records the security posture at handover. Controls listed under "Completed"
are in place and verified. Everything under "Open" is a known, accepted risk that
transfers to the receiving team. Nothing here is speculative — each item was
observed directly against the live projects on the date above.

---

## Completed and verified

| Control | Evidence |
|---|---|
| Role-aware Firestore and Storage rules | 10 authorization tests, green in CI |
| Answer keys and certificate records server-only | Enforced in rules; production has **zero** inline answer keys |
| Trainer-approved enrollment (no self-escalation) | Rules + Functions + roster UI |
| App Check enforced on all 3 callables | `enforceAppCheck: true` |
| reCAPTCHA v3 registered, both projects | Site keys wired to GitHub environments |
| CSV export hardening | 8 unit tests, green in CI |
| Repo-wide secret scanner | Runs on every push, covers the whole repository |
| Deploy gated on QA + environment approval | `production` environment, `main`-only, 4 reviewers |
| Firestore PITR | `POINT_IN_TIME_RECOVERY_ENABLED`, 7-day window |
| Firestore delete protection | `DELETE_PROTECTION_ENABLED` |
| Daily Firestore backups | Schedule `2ba29693…`, 14-day retention |
| Point-in-time data export | `C:\secure\`, 2026-07-29: 625 documents, 17 auth accounts, 4 Storage objects |

---

## Open risks

### 1. Production App Check is registered but NOT enforced — HIGH
Firestore and Storage accept unattested requests. Enforcement was deliberately
deferred: Firebase guidance is to watch metrics before enforcing, and enforcing
without a monitoring period risks locking out legitimate users.

**Next action:** confirm App Check metrics show verified traffic, then enforce
Cloud Firestore, test, then Cloud Storage, test. Monitor one business day.
**Owner:** IT / system owner

### 2. Test accounts remain live in production — HIGH
Enabled, with privileged roles:

| Account | UID | Last sign-in |
|---|---|---|
| admin@hytech.test | JLnYg09pbGTg9jvewgbDuPisOpY2 | 2026-07-27 |
| trainer@hytech.test | 7oUchmIV21enAWSCcFmHjt107s12 | 2026-07-27 |
| student1/2/3@hytech.test | see `C:\secure\phase1-account-inventory.md` | various |
| student0002/0003/0004@hyt.com | ” | various |

Plus three malformed signups: `-@32.xc`, `11@w.aah`, `11@w.as`.

Deletion was deferred because testing was still in progress. Passwords were never
committed, so these are not part of the historical credential exposure.

**Next action:** disable, verify nothing legitimate breaks, then delete. Also
delete the corresponding `users/{uid}` and `enrollments` documents — see risk 6.
**Owner:** IT / system owner

### 3. Historical credential exposure in a public repository — HIGH
The repository is **public**. A hardcoded demo-account array published eight
credential pairs across two domains (`admin@hytech.com/admin1234` and
`@hyt.com` variants with `123` passwords, including a `supervisor` role).
Removed from the working tree in `f2f777d` (2026-07-20); **still in git history**,
and history rewriting cannot recall public clones or forks.

None of the eight addresses currently resolve to Firebase accounts. Two orphaned
profile documents (`student1@hyt.com`, `trainer@hyt.com`) show some did exist.

**Residual risk:** an attacker could register the unclaimed addresses.
**Next action:** confirm the repository is intended to be public. Consider
pre-registering or blocking the eight addresses.
**Owner:** DPO / security

### 4. Cloud Data Access audit logging — HIGH
Data Access audit logs are off by default and **cannot be enabled retroactively**.
If they were never enabled, there is no record of historical sign-ins or Firestore
reads/writes, and the activity review for risk 3 cannot be completed from Cloud
Logging. The application's own `activityLogs` collection is the fallback evidence
source and has been recording throughout.

**Next action:** enable Admin Read / Data Read / Data Write on Identity Toolkit
and Cloud Firestore APIs. Document the gap in historical coverage.
**Owner:** IT / system owner

### 5. Unverified legacy academic progress — MEDIUM
7 progress documents and 14 enrollments carry client-derived progress not produced
by authoritative recalculation, belonging to real learners. Any completion or
certificate resting on them is not backed by trusted evidence.

Production has **no** inline answer keys, so the answer-key migration is not needed.

**Next action:** recalculate through the trusted graduation workflow; review or
revoke anything unverifiable.
**Owner:** Academic director / registrar

### 6. Deleting an Auth account orphans its Firestore data — MEDIUM
No `onAuthUser.onDelete` trigger exists. Two orphaned `users` documents already
demonstrate this. Deleting accounts without manual cleanup leaves profile,
enrollment, and progress records behind.

**Next action:** add a cleanup Function, or document manual cleanup in the
offboarding runbook.
**Owner:** IT / system owner

### 7. No malware scanning on uploads — MEDIUM
MIME type, size, and authorization are enforced. File *content* is not scanned.
Acceptable for a controlled cohort; not acceptable for uncontrolled public upload.

**Next action:** integrate a scanning service with quarantine before opening
uploads beyond known learners.
**Owner:** IT / product

### 8. Backup restore never exercised — MEDIUM
Backups, PITR, and delete protection are configured but no restore has been
performed. An unexercised backup is an assumption. RPO and RTO are undefined.

**Next action:** restore into a scratch database, verify contents, record the
duration as RTO, and get RPO/RTO approved.
**Owner:** IT / system owner

### 9. Long-lived deployment credential — MEDIUM
Deployment uses `FIREBASE_TOKEN`, a long-lived secret. Workload Identity
Federation with short-lived OIDC credentials is the better design.

**Next action:** migrate to WIF; remove `FIREBASE_TOKEN` only after it succeeds.
**Owner:** IT / system owner

### 10. Service-account key on an operator workstation — MEDIUM
`C:\secure\hytech-prod-backup.json` grants Datastore and Storage read on
production. The containing folder is ACL-restricted to the operator and SYSTEM.

**Next action:** delete the key when the migration work concludes; add to the
offboarding checklist.
**Owner:** IT / security

### 11. Storage soft-delete not confirmed — LOW
Firestore protection is verified. The Cloud Storage bucket's soft-delete policy
was not confirmed at handover. Recent buckets default to 7 days.

**Next action:** confirm on the bucket Protection tab; consider 30 days for
academic files.
**Owner:** IT / system owner

### 12. Governance sign-offs outstanding — varies
No named-owner approvals recorded for: grading and mastery formula, attendance
and competency evidence, certificate issuance and revocation, TESDA/TVET
applicability, privacy notice and lawful basis, data-subject requests, retention
and legal hold, vendor processing, backup RPO/RTO, incident response,
accessibility, staff offboarding.

**Next action:** complete the register in `SECURITY_REMEDIATION_OPERATIONS.md`.
**Owner:** as listed per row

---

## Acceptance

By accepting this turnover the receiving party acknowledges the open risks above,
in particular items 1–4, which are rated HIGH and remain unmitigated.

Handed over by: ____________________  Date: __________
Accepted by: ______________________  Date: __________
Role: _____________________________
