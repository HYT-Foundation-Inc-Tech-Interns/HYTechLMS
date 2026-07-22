# HYTech LMS — Feature Roadmap & Implementation Plan

## Context

The app has a working spine: multi-role auth (admin/trainer/student), sectors → course
templates → classes, class content (modules, topics, materials, announcements, quizzes),
students joining by code, taking auto-graded quizzes, and real notifications + audit logs.
This document plans the features needed to make it a **complete vocational/competency-based
LMS** (HYT runs TESDA-style NC II programs).

**Grounding facts (verified in code):**
- Assignments live at `classes/{classId}/assignments` ([createAssignment](../HYTech/src/utils/firestoreService.js) line ~2351) but there is **no submissions subcollection** — students cannot submit work today.
- Quiz attempts: `classes/{classId}/assessments/{id}/attempts` ([submitQuizAttempt](../HYTech/src/utils/firestoreService.js)), scores are client-computed.
- Enrollments carry `progress` (`{ attendanceRate, tasksCompleted, totalTasks }`), `status`, `finalGrade`, `certificateId` — but `finalGrade`/`certificateId` are **never computed or set**; attendance is **never recorded**.
- Certificates page ([StudentCertificates.jsx](../HYTech/src/components/student/StudentCertificates.jsx)) just derives a card from `enrollment.status === 'completed'`; no PDF, no verification.
- `users/{uid}/lmsExperience/profile` ([initializeLmsExperience](../HYTech/src/utils/firestoreService.js) line ~116) holds an `achievements` block (`coursesCompleted`, `totalHoursLearned`, `certificatesEarned`, `streak`) — data model exists, no UI, no XP.
- Files are base64 in Firestore, ~300 KB cap ([compressAndStoreFile](../HYTech/src/utils/firestoreService.js) line ~1607).

## ⚠️ Rule that applies to EVERY feature below

Firestore rules are now **default-deny** (locked down in `HYTech/firestore.rules`). **Any new
collection or subcollection must get an explicit `match` block with rules, or all reads/writes
fail with `permission-denied`.** Each feature section lists its required rules. After editing
rules: `firebase deploy --only firestore:rules --project hyt-global-institute-lms`, and add
matching assertions to `HYTech/scripts/test-rules.ps1`.

**Plan/build convention per feature:** (1) add service functions1 to `firestoreService.js`,
(2) add/modify components, (3) add Firestore rules, (4) `npm run build`, (5) deploy rules,
(6) extend the test matrix, (7) manual smoke test per role.

---

# PHASE 1 — Complete the core learning loop (FREE plan)

The single biggest gap: the teaching loop stops at auto-graded quizzes. Students can't submit
work, trainers can't grade it, and no one sees a consolidated grade.

## 1.1 Student assignment submissions

**Data model** — new subcollection:
```
classes/{classId}/assignments/{assignmentId}/submissions/{studentId}   // doc id = studentId (deterministic → one submission per student, rule-friendly)
  {
    studentId, studentName,
    text: string,                 // typed answer / notes
    filesBase64: string[],        // reuse compressAndStoreFile (≤300KB each, free tier)
    attachments: [{ name, type, size }],
    status: 'submitted' | 'graded' | 'returned',
    submittedAt, updatedAt,
    grade: number|null, feedback: string, gradedBy, gradedAt   // filled by trainer in 1.2
  }
```
Using **doc id = studentId** is deliberate: it enforces one submission per student and lets
security rules `get()` it deterministically (unlike random IDs).

**Service functions** (`firestoreService.js`):
- `submitAssignment(classId, assignmentId, studentId, { text, files })` — compress files via existing `compressAndStoreFile`, `setDoc` at deterministic path, `status:'submitted'`.
- `getMySubmission(classId, assignmentId, studentId)`
- `getAssignmentSubmissions(classId, assignmentId)` — trainer view (list).
- `subscribeToMySubmission(...)` for live status.

**Components:**
- **Student** — extend [StudentCourse.jsx](../HYTech/src/components/student/StudentCourse.jsx) assignments tab: a "Submit work" panel (text + file picker reusing the existing upload UI), showing submitted/graded status and returned feedback.
- **Trainer** — extend [ClassDetail.jsx](../HYTech/src/components/trainer/ClassDetail.jsx) "Responses" area: list submissions per assignment.

**Rules** (`classes/{classId}/assignments/{assignmentId}/submissions/{studentId}`):
```
allow read: if isAdmin() || classTrainer(classId) || isSelf(studentId);
allow create, update: if isSelf(studentId)
  && request.resource.data.get('studentId','') == request.auth.uid
  && !changedKeys().hasAny(['grade','feedback','gradedBy','gradedAt']);   // student can't grade self
allow update: if (isAdmin() || classTrainer(classId));                    // trainer grades (1.2)
```
(Merge the two updates into one `allow update` with an OR; keep the "student may not touch grade fields" guard on the student branch.)

**Effort:** ~1–2 days. **Plan: FREE.**

## 1.2 Manual grading + feedback + rubric

**Data model** — grading fields already on the submission doc (1.1). Optional rubric on the
assignment: `classes/{classId}/assignments/{id}.rubric: [{ criterion, maxPoints }]`.

**Service:** `gradeSubmission(classId, assignmentId, studentId, { grade, feedback, rubricScores })`
→ `updateDoc` submission `status:'graded'`, and `createNotification({ toUid: studentId, type:'grade_posted', ... })` (student→trainer notify already allowed; trainer→student allowed).

**Components:** Trainer grading modal in ClassDetail (score input, feedback textarea, optional
rubric grid). Student sees grade + feedback in StudentCourse.

**Rules:** the trainer `allow update` branch in 1.1 covers it. Add rubric writes under the
existing assignment write rule (already trainer/admin-only).

**Effort:** ~1–2 days. **Plan: FREE.**

## 1.3 Gradebook

**Concept:** aggregate every graded item (quiz attempts + assignment submissions) per student
per class into one view. No new storage — compute client-side from existing data.

**Service:**
- `getClassGradebook(classId)` — for each enrolled student, gather quiz attempt scores
  (`getAssessmentAttempts`) + assignment grades (`getAssignmentSubmissions`), compute totals,
  percentage, pass/fail vs a class `passingScore`.
- `getStudentGrades(classId, studentId)` — student's own summary.

**Components:**
- **Trainer** — new "Grades" tab in ClassDetail: matrix of students × assessments with a final
  column. Export-to-CSV button (client-side, no backend).
- **Student** — "My Grades" section in StudentCourse: their scores + running average.

**Rules:** none new (reads existing attempts/submissions, already permitted).

**Effort:** ~2 days. **Plan: FREE.** Depends on 1.1–1.2.

---

# PHASE 2 — Attendance (FREE plan)

Critical for competency-based vocational certification.

**Data model** — new subcollection:
```
classes/{classId}/attendance/{sessionId}
  { date, title, createdBy, createdAt,
    records: { [studentId]: 'present'|'absent'|'late'|'excused' } }
```
(One doc per class session; a map of studentId→status keeps it to a single doc per session.)

**Service:** `createAttendanceSession(classId, {date,title})`, `markAttendance(classId, sessionId, records)`,
`getAttendanceForClass(classId)`, `getStudentAttendance(classId, studentId)`. On save, recompute
and write `enrollment.progress.attendanceRate` via existing `updateEnrollmentProgress`.

**Components:** Trainer "Attendance" tab in ClassDetail (roster with per-student toggle per
session). Student sees their attendance % in StudentCourse overview.

**Rules:**
```
match /classes/{classId}/attendance/{sessionId} {
  allow read: if isSignedIn();                 // students see their own status; roster is authed-readable already
  allow write: if isAdmin() || classTrainer(classId);
}
```

**Effort:** ~2 days. **Plan: FREE.**

---

# PHASE 3 — Real certificates on completion (FREE plan)

**Data model** — new top-level collection for verifiability:
```
certificates/{certificateId}    // certificateId = generated, e.g. HYT-<year>-<seq/hash>
  { studentId, studentName, classId, className, courseName, level,
    finalGrade, issuedBy (trainerId), issuedAt, verificationCode }
```
Also set `enrollment.certificateId`, `enrollment.finalGrade`, `enrollment.completedAt` when a
trainer marks completion (extend existing `updateEnrollmentStatus`).

**Service:**
- `issueCertificate(enrollmentId)` — trainer action: compute final grade from gradebook (Phase 1.3),
  create `certificates/{id}`, stamp the enrollment.
- `getCertificate(certificateId)` / `verifyCertificate(code)` — public-ish read for a verify page.

**PDF generation:** client-side, no backend. Render an HTML certificate template to canvas/PDF.
Use a **self-contained** approach (inline SVG/HTML → `html2canvas`+`jsPDF`, or a print-to-PDF
button). Since the build must stay dependency-light, a print-optimized certificate page +
"Save as PDF" is the zero-dependency option; `jsPDF` if a true download is required.

**Components:** Trainer "Issue Certificate" button on a completed enrollment. Student
[StudentCertificates.jsx](../HYTech/src/components/student/StudentCertificates.jsx) → download/print real cert. Optional public `/verify/:code` route.

**Rules:**
```
match /certificates/{certificateId} {
  allow read: if isSignedIn();                 // (or public read if you want external verification)
  allow create, update: if isAdmin() || isTrainer();   // trainer issues for their class
  allow delete: if isAdmin();
}
```
(If public verification is wanted, relax read to `if true` for this collection only — decide
consciously; it exposes cert metadata.)

**Effort:** ~2–3 days. **Plan: FREE.** Depends on Phase 1.3 for the final grade.

---

# PHASE 4 — Real progress & completion tracking (FREE plan)

Make progress bars reflect reality and support module sequencing.

**Data model:**
- `students/{studentId}/progress/{classId}` (already in rules) → `{ modulesCompleted: string[], topicsCompleted: string[], percentage }`.
- Optional per-module `order` + `prerequisiteId` on `classes/{classId}/modules/{id}` (add fields).

**Service:** `markTopicComplete(studentId, classId, topicId)`, `getStudentProgress` (exists),
recompute `percentage` from published topics/modules. Gate "next module" in UI on prerequisites.

**Components:** Student course view — completion checkboxes per topic, accurate progress bar,
locked modules until prerequisite done. Trainer sees per-student progress (feeds Phase 5).

**Rules:** `students/{studentId}/progress/{classId}` already allows owner + class trainer + admin.
No new collection. If adding module `order/prerequisiteId`, they fall under existing module write rules.

**Effort:** ~2 days. **Plan: FREE.**

---

# PHASE 5 — Admin reporting & analytics (FREE plan)

The legitimate need the removed supervisor pages were faking.

**Concept:** compute dashboards client-side from existing collections (users, classes,
enrollments, attempts, submissions, attendance). No new storage.

**Service:** `getAdminAnalytics()` → totals (users by role, active classes), completion rates
per class/sector, at-risk students (low attendance/grades/inactivity), per-trainer load.
`getClassAnalytics(classId)` for trainers.

**Components:** Extend admin [Dashboard.jsx](../HYTech/src/components/dashboard/Dashboard.jsx) with real charts (use the **dataviz** skill for chart design; keep any chart lib self-contained
or render SVG). Trainer class analytics in ClassDetail.

**Rules:** none new (aggregates already-readable data). Note: large aggregations = many reads;
watch free-tier read quota (50K/day) — cache results in component state, avoid re-querying.

**Effort:** ~3 days. **Plan: FREE** (mind read volume).

---

# PHASE 6 — Engagement: gamification + discussions (FREE plan)

## 6.1 Surface gamification (data model already exists)

`users/{uid}/lmsExperience/profile.achievements` already tracks `coursesCompleted`,
`certificatesEarned`, `streak`, `totalHoursLearned`. **Wire it up:** increment on real events
(course completed, cert issued, quiz passed, daily login streak), add **badges** array, show a
profile/achievements panel, and a per-class **leaderboard** (top scores from the gradebook —
read-only aggregation).

**Service:** `awardAchievement(userId, key)`, `updateStreak(userId)`, `getLeaderboard(classId)`.
**Rules:** `lmsExperience` already owner+admin. A leaderboard reads gradebook data (permitted).
**Effort:** ~2 days. **FREE.**

## 6.2 Discussions / class forum (optional)

**Data model:** `classes/{classId}/threads/{threadId}` + `.../posts/{postId}` (mirror the
announcement/comments rules: authed read, author-or-staff write/delete).
**Effort:** ~2–3 days. **FREE.** Lower priority than 1–5.

---

# PHASE 7 — Cohorts, batches & bulk operations (FREE plan)

**Cohorts/batches:** add `batchName`, `startDate`, `endDate`, `status(open/ongoing/graduated)`
to `classes`. UI to manage intakes and graduate a whole batch (bulk `updateEnrollmentStatus`).

**Bulk student import:** admin CSV upload → parse client-side → create users via the existing
secondary-app pattern in [UserManagement.jsx](../HYTech/src/components/users/UserManagement.jsx). Bulk enroll into a class.

**Rules:** class field additions fall under existing class write rules. Bulk user creation uses
the existing admin-create path (already permitted).

**Effort:** ~2–3 days. **Plan: FREE.**

---

# PHASE 8 — Requires the Blaze (pay-as-you-go) plan

These cannot be done on the free Spark plan. Blaze keeps the free quotas as a monthly
allowance, so cost is typically ~$0 at this scale, but it needs a billing account.

## 8.1 Video & large file support (Firebase Storage)
Replace base64-in-Firestore for large content. Enable Storage, deploy the already-written
`HYTech/storage.rules` (re-add the `storage` key to `firebase.json`), switch material uploads to
`uploadBytes` → store download URL instead of base64. Lifts the 300 KB cap; enables video.
**Effort:** ~2–3 days once Blaze is on. Migration of existing base64 materials optional.

## 8.2 Email notifications (Cloud Functions + email service)
Deadline reminders, grade-posted, enrollment confirmations, waiting-room alerts. Use the
Firebase "Trigger Email" extension or a Function calling Resend/SendGrid. Mirror in-app
notifications to email.
**Effort:** ~2–3 days. Needs a transactional email provider.

## 8.3 Server-side quiz grading (closes the score-tampering risk)
Cloud Function re-grades `attempts` from stored `answers` against the assessment key and writes
the authoritative score, making client scores untrusted input. The real fix for the documented
integrity gap.
**Effort:** ~2 days.

## 8.4 App Check (recommended before public launch — free-ish, but easier with Blaze)
reCAPTCHA v3 App Check to block non-app API abuse. Closes the "authenticated user can spam"
residual risks (notifications/enrollment/announcement abuse) noted in the security review.
**Effort:** ~1 day.

---

# Recommended build order

1. **Phase 1** (submissions → grading → gradebook) — biggest functional hole, all free.
2. **Phase 2** (attendance) — high value for vocational certification, free.
3. **Phase 3** (real certificates) — the institute's core deliverable, free, needs Phase 1.3.
4. **Phase 4** (real progress) — free, improves UX and feeds Phase 5.
5. **Phase 5** (admin analytics) — free, restores the real oversight need.
6. **Phase 6–7** (engagement, cohorts/bulk) — free, quality-of-life & scale.
7. **Phase 8** (Blaze: video, email, server grading, App Check) — when ready to upgrade.

# Cross-cutting reminders

- **Every new collection needs rules** (default-deny) — never skip, or the feature 404s silently.
- **Watch Firestore free quota** (50K reads/day) — analytics/gradebook aggregations are read-heavy; cache in state.
- **Files stay ≤300 KB** until Phase 8.1 (Storage).
- **Redeploy rules + extend `test-rules.ps1`** with each phase that adds rules.
- **Auto-deploy**: once the GitHub Action runner issue is resolved, merges to `main` ship each phase automatically.
