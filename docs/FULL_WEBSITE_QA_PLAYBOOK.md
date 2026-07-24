# HYTech LMS Full Website QA Playbook

Use this checklist before every production release and after any major authentication, database, routing, or UI change.

## 1. QA run information

Copy this block for each test cycle:

| Field | Value |
| --- | --- |
| Release/version | |
| Git commit | |
| Environment | Local / Staging / Production |
| Build URL | |
| Test date | |
| Tester(s) | |
| Browser/device | |
| Firebase project | |
| Result | Pass / Conditional pass / Fail |

### Result definitions

- **Pass:** Actual behavior matches the expected result.
- **Fail:** The feature is broken, inaccessible, misleading, or produces incorrect data.
- **Blocked:** Testing cannot continue because credentials, data, permissions, or an external service is unavailable.
- **Not applicable:** The use case is intentionally excluded from this release.

## 2. Required test accounts and data

Use temporary accounts. Never put passwords in this document or commit them to Git.

- [ ] One active admin account
- [ ] One active trainer account
- [ ] One enrolled trainee account
- [ ] One trainee with no enrollment
- [ ] One trainee with a pending enrollment request
- [ ] One disabled/inactive account
- [ ] One class with at least one enrolled trainee
- [ ] One class with no trainees
- [ ] One archived class
- [ ] One course with modules, topics, and materials
- [ ] One assignment with a future deadline
- [ ] One overdue assignment
- [ ] One assessment with several question types
- [ ] One announcement with comments and an attachment
- [ ] One ID request
- [ ] One incident report

## 3. Supported test matrix

### Browsers

- [ ] Current Chrome
- [ ] Current Edge
- [ ] Current Firefox
- [ ] Current Safari on macOS or iOS

### Viewports and devices

- [ ] 320 × 568 — small phone
- [ ] 360 × 800 — common Android phone
- [ ] 390 × 844 — modern iPhone
- [ ] 412 × 915 — large Android phone
- [ ] 768 × 1024 — tablet portrait
- [ ] 1024 × 768 — tablet landscape
- [ ] 1366 × 768 — common laptop
- [ ] 1440 × 900 — desktop
- [ ] 1920 × 1080 — large desktop
- [ ] Physical Android phone
- [ ] Physical iPhone, if available

### Network and browser conditions

- [ ] Normal connection
- [ ] Slow 4G simulation
- [ ] Offline after the page is loaded
- [ ] Fresh private/incognito session
- [ ] Existing session after browser restart
- [ ] Browser zoom at 200%
- [ ] Reduced-motion preference enabled

## 4. Release build and deployment checks

| ID | Test | Expected result | Status |
| --- | --- | --- | --- |
| REL-001 | Run `npm install` in `HYTech` on a clean environment. | Dependencies install without unresolved errors. | |
| REL-002 | Run `npm run build`. | Production build completes successfully. | |
| REL-003 | Run `npm run preview` and open the preview URL. | App loads without a blank page or fatal console error. | |
| REL-004 | Inspect production environment variables. | Firebase and other required variables point to the intended environment. | |
| REL-005 | Open the deployed root URL directly. | Landing page returns successfully over HTTPS. | |
| REL-006 | Refresh a nested route such as `/student/calendar`. | Hosting rewrites return the SPA instead of a 404. | |
| REL-007 | Open an unknown route. | App safely redirects to the landing page. | |
| REL-008 | Inspect browser console on public and protected pages. | No uncaught errors, repeated permission failures, or missing chunks. | |
| REL-009 | Confirm `robots.txt`, `llms.txt`, favicon, logo, and landing image. | Files load with the correct content type and no 404. | |
| REL-010 | Verify the deployed version/commit. | Tested deployment matches the intended release commit. | |

## 5. Public pages and authentication

| ID | Use case | Steps | Expected result | Status |
| --- | --- | --- | --- | --- |
| AUTH-001 | View landing page | Open `/`. | Logo, headline, description, and both actions display correctly. | |
| AUTH-002 | Navigate to sign in | Select “Sign In” from the landing page. | `/signin` loads and keyboard focus is usable. | |
| AUTH-003 | Navigate to signup | Select “Get Started” or the signup link. | `/signup` loads without horizontal overflow. | |
| AUTH-004 | Sign in successfully | Enter a valid account and submit. | User reaches the correct role dashboard. | |
| AUTH-005 | Invalid credentials | Enter an invalid password. | Clear nontechnical error appears; password is not exposed. | |
| AUTH-006 | Empty sign-in form | Submit without required values. | Required fields are identified and submission is prevented. | |
| AUTH-007 | Password visibility | Toggle password visibility twice. | Value visibility changes; control has an accessible name. | |
| AUTH-008 | Forgot password | Submit a registered email. | Confirmation is clear and does not expose whether sensitive accounts exist. | |
| AUTH-009 | Create trainee account | Complete both signup steps with valid unique data. | Account is created as a trainee/student only. | |
| AUTH-010 | Signup validation | Try invalid email, phone, date, mismatched passwords, and weak password. | Each invalid value receives a specific message. | |
| AUTH-011 | Duplicate signup | Register an existing email. | Safe error appears; duplicate account is not created. | |
| AUTH-012 | Clear signup form | Enter values and select “Clear Form.” | All steps and fields reset after confirmation if required. | |
| AUTH-013 | Verify email route | Follow the intended verification flow. | Success, expired, and invalid-link states are understandable. | |
| AUTH-014 | Forced password change | Sign in with an account requiring a password change. | User cannot bypass the change and can complete it successfully. | |
| AUTH-015 | Session persistence | Sign in, close the browser, then reopen the site. | Session behavior matches product policy. | |
| AUTH-016 | Sign out | Sign out from each role. | Session is cleared and protected routes redirect to sign in. | |
| AUTH-017 | Role protection | Manually open another role’s URL. | Access is denied or redirected; protected data never appears. | |
| AUTH-018 | Public-only protection | While signed in, open `/signin` or `/signup`. | User is redirected appropriately. | |

## 6. Shared dashboard shell

| ID | Use case | Expected result | Status |
| --- | --- | --- | --- |
| SHELL-001 | Open and close the mobile menu. | Drawer opens above content, background does not scroll, and overlay closes it. | |
| SHELL-002 | Press Escape while the drawer is open. | Drawer closes. | |
| SHELL-003 | Select a navigation item from the mobile drawer. | Route changes and drawer closes. | |
| SHELL-004 | Collapse and expand the desktop sidebar. | Content resizes correctly and active navigation remains identifiable. | |
| SHELL-005 | Use a long page/class title. | Title truncates or wraps without covering navbar actions. | |
| SHELL-006 | Open notifications. | Panel stays inside the viewport and can be closed by keyboard and pointer. | |
| SHELL-007 | Open the profile menu. | Menu remains inside the viewport and all actions work. | |
| SHELL-008 | Open HYTrix/HYTBot. | Panel fits the viewport; messages and composer remain usable. | |
| SHELL-009 | Navigate using keyboard only. | Focus order is logical and focus is visibly indicated. | |
| SHELL-010 | Test at 200% zoom. | Navigation and content remain reachable with no page-level horizontal scrolling. | |

## 7. Admin use cases

### Dashboard

- [ ] ADM-001: Dashboard counts match the underlying users, sectors, courses, and classes.
- [ ] ADM-002: Recent activity entries have correct user, action, and time.
- [ ] ADM-003: Sector summaries display correctly with long sector names.
- [ ] ADM-004: Empty/loading/error states do not leave blank sections.

### User management

- [ ] ADM-010: Search users by name and email.
- [ ] ADM-011: Filter users by role and status.
- [ ] ADM-012: Create a trainer account with valid data.
- [ ] ADM-013: Create a trainee account with valid data.
- [ ] ADM-014: Required and duplicate values are rejected.
- [ ] ADM-015: View a user’s complete details.
- [ ] ADM-016: Edit allowed user fields and confirm persistence after refresh.
- [ ] ADM-017: Change a user’s role and verify new route permissions.
- [ ] ADM-018: Disable a user and confirm they cannot continue using protected features.
- [ ] ADM-019: Reactivate a user and confirm access is restored.
- [ ] ADM-020: Reset/change a temporary password using the intended workflow.
- [ ] ADM-021: Row menus stay visible on mobile and near the bottom of the page.
- [ ] ADM-022: Mobile table/card content preserves identity, role, status, and actions.

### Sectors, courses, and classes

- [ ] ADM-030: Create, edit, and delete a sector.
- [ ] ADM-031: Prevent deleting a sector when business rules disallow it.
- [ ] ADM-032: Upload/change a sector image.
- [ ] ADM-033: Create and edit a course under a sector.
- [ ] ADM-034: Create a class from a course.
- [ ] ADM-035: Validate class name, code, dates, capacity, level, and trainer.
- [ ] ADM-036: Assign and change a trainer.
- [ ] ADM-037: Archive and restore a class.
- [ ] ADM-038: Open admin trainee/class preview.
- [ ] ADM-039: Very long names and descriptions do not break cards or dialogs.

### Requests, incidents, logs, and settings

- [ ] ADM-040: View, approve, and reject an ID request.
- [ ] ADM-041: Open and update an incident report.
- [ ] ADM-042: Incident permissions and status transitions are enforced.
- [ ] ADM-043: Search, filter, sort, and paginate system logs.
- [ ] ADM-044: Export logs to CSV and verify file contents.
- [ ] ADM-045: Test purge only with disposable staging data and explicit approval.
- [ ] ADM-046: Update account settings and verify persistence.
- [ ] ADM-047: Update organization appearance/logo and verify all role navbars.
- [ ] ADM-048: Notification preferences behave as configured.

## 8. Trainer use cases

### Home and classes

- [ ] TRN-001: Trainer sees only assigned/owned classes.
- [ ] TRN-002: Available course cards render without a blank-screen error.
- [ ] TRN-003: Create a class and confirm it appears immediately.
- [ ] TRN-004: Edit class appearance and details.
- [ ] TRN-005: Archive and restore a class.
- [ ] TRN-006: Class counts and status badges are accurate.

### Class detail

- [ ] TRN-010: Overview tab loads class data and activity.
- [ ] TRN-011: Copy class code and join with it using a trainee account.
- [ ] TRN-012: Create, edit, reorder, and delete modules/topics.
- [ ] TRN-013: Upload, download, replace, and remove a material.
- [ ] TRN-014: Reject unsupported or oversized uploads with a useful message.
- [ ] TRN-015: Post, edit, and delete an announcement.
- [ ] TRN-016: Add and remove an announcement attachment.
- [ ] TRN-017: Add and delete allowed comments.
- [ ] TRN-018: Create an assessment with every supported question type.
- [ ] TRN-019: Configure points, passing score, duration, and deadline.
- [ ] TRN-020: Preview the assessment before publishing.
- [ ] TRN-021: Edit, duplicate, publish/unpublish, and delete an assessment.
- [ ] TRN-022: Review trainee attempts and calculated scores.
- [ ] TRN-023: Review assignment submissions and attachments.
- [ ] TRN-024: Grade a submission and verify the trainee sees the result.
- [ ] TRN-025: Add/remove trainees according to enrollment rules.
- [ ] TRN-026: Start or open the configured meeting link.
- [ ] TRN-027: Tabs remain reachable and active tab stays visible on mobile.
- [ ] TRN-028: Wide response/grade tables preserve row identity and actions.

### Trainer tasks and settings

- [ ] TRN-030: Task filters and deadline ordering are correct.
- [ ] TRN-031: Opening a task navigates to the intended class/item.
- [ ] TRN-032: Profile and security changes persist.
- [ ] TRN-033: Notification settings affect actual notification delivery/display.

## 9. Trainee/student use cases

### Enrollment and home

- [ ] STU-001: Enrolled trainee sees the correct current class and metrics.
- [ ] STU-002: Trainee with no class sees the waiting room.
- [ ] STU-003: Submit a valid class code.
- [ ] STU-004: Invalid, expired, full, or archived class code is rejected clearly.
- [ ] STU-005: Pending enrollment shows the correct waiting state.
- [ ] STU-006: Trainer approval unlocks the dashboard without requiring a new account.
- [ ] STU-007: Personalize a class card and verify persistence.

### Course participation

- [ ] STU-010: Open overview, modules, assessments, and assignments tabs.
- [ ] STU-011: Sequential module/topic rules are enforced.
- [ ] STU-012: View/download each supported material type.
- [ ] STU-013: Read announcements and add a comment.
- [ ] STU-014: Edit/delete only comments the trainee is allowed to manage.
- [ ] STU-015: Start and submit an assessment.
- [ ] STU-016: Test unanswered required questions.
- [ ] STU-017: Test multiple choice, checkbox, text, and matrix/grid questions.
- [ ] STU-018: Timer behavior is correct after refresh/backgrounding.
- [ ] STU-019: Score, pass/fail result, and attempt history are correct.
- [ ] STU-020: Retry rules and best-score calculations are correct.
- [ ] STU-021: Submit an assignment with text and attachments.
- [ ] STU-022: Prevent submission after deadline when policy requires it.
- [ ] STU-023: View trainer feedback and grade.
- [ ] STU-024: Course progress updates after completing required work.
- [ ] STU-025: Fullscreen quiz and dialogs fit mobile portrait and landscape.

### Student utilities

- [ ] STU-030: Task list shows correct pending/completed/overdue items.
- [ ] STU-031: Calendar month navigation, day selection, and event list work.
- [ ] STU-032: Calendar dates are usable with keyboard and touch.
- [ ] STU-033: Submit an ID request and view its status.
- [ ] STU-034: Submit an incident report and view only owned reports.
- [ ] STU-035: Archived classes appear with correct read-only behavior.
- [ ] STU-036: Profile, password, and notification settings persist.

## 10. Notifications and real-time behavior

| ID | Test | Expected result | Status |
| --- | --- | --- | --- |
| NOT-001 | Trainer posts an announcement while trainee is online. | Trainee receives the update without a full refresh. | |
| NOT-002 | Trainer publishes an assessment. | Relevant trainees receive one notification. | |
| NOT-003 | Trainee submits work. | Trainer receives the intended notification. | |
| NOT-004 | Mark one notification as read. | Badge/count and item update consistently. | |
| NOT-005 | Mark all as read. | All relevant items update and persist after refresh. | |
| NOT-006 | Open a notification. | User reaches the exact referenced class/item. | |
| NOT-007 | Delete or revoke referenced content. | Old notification fails safely without a blank page. | |
| NOT-008 | Use two sessions simultaneously. | Updates do not duplicate, disappear, or overwrite newer data. | |

## 11. Responsive UI checklist

Run this on every route listed in `src/App.jsx`.

- [ ] No document-level horizontal scrollbar.
- [ ] Header actions remain visible.
- [ ] Long titles, names, emails, codes, and filenames wrap or truncate safely.
- [ ] Sidebar/drawer does not cover unreachable content.
- [ ] Tables scroll inside a labeled region or become mobile cards.
- [ ] Active tab remains visible in a horizontal tab strip.
- [ ] Forms use one column when multiple columns no longer fit.
- [ ] Buttons do not overlap or leave the viewport.
- [ ] All meaningful controls have at least a 44 × 44 px hit area.
- [ ] Fixed elements respect phone safe areas.
- [ ] Dialog header/footer remain reachable on a 320 × 400 viewport.
- [ ] Dialog content scrolls without scrolling the background.
- [ ] Virtual keyboard does not cover the focused field or submit action.
- [ ] Images and media stay within their containers.
- [ ] Empty, loading, validation, success, and error states fit mobile screens.
- [ ] Portrait-to-landscape rotation does not lose state or controls.

## 12. Accessibility checklist

- [ ] Page has one meaningful H1 where appropriate.
- [ ] Heading order is logical.
- [ ] Every input has a programmatic label.
- [ ] Every icon-only button has an accessible name.
- [ ] Keyboard focus is always visible.
- [ ] All features work without a mouse.
- [ ] Focus order follows the visual order.
- [ ] Dialogs trap focus, close with Escape, and restore focus.
- [ ] Mobile drawers expose correct expanded/collapsed state.
- [ ] Color is not the only status indicator.
- [ ] Text and controls meet WCAG AA contrast.
- [ ] Status and validation messages are announced to assistive technology.
- [ ] Tables have meaningful headers.
- [ ] Images have appropriate alternative text.
- [ ] Decorative images are ignored by assistive technology.
- [ ] Content remains usable at 200% zoom.
- [ ] Reduced-motion preference removes nonessential movement.
- [ ] Automated Lighthouse accessibility score is reviewed, not used as the only test.
- [ ] Basic screen-reader test is completed with NVDA, VoiceOver, or equivalent.

## 13. Security and privacy checklist

Perform destructive tests only against staging or disposable data.

- [ ] Protected pages reject unauthenticated requests.
- [ ] Each role is blocked from unauthorized Firestore reads and writes.
- [ ] Changing a URL or document ID cannot expose another user’s private data.
- [ ] Disabled accounts lose access promptly.
- [ ] Passwords and tokens never appear in URLs, logs, or client error messages.
- [ ] Firebase keys/configuration are treated according to Firebase security guidance; security relies on rules, not hidden client configuration.
- [ ] Firestore and Storage rules are deployed and tested independently.
- [ ] Uploads enforce allowed type and size.
- [ ] Uploaded filenames/content cannot inject HTML or script.
- [ ] User text and comments render safely.
- [ ] CSV export prevents formula injection.
- [ ] Delete/archive actions require appropriate confirmation.
- [ ] Sensitive actions are logged with actor and timestamp.
- [ ] Logs avoid unnecessary personal or secret data.
- [ ] Password reset and authentication messages do not reveal sensitive account information.
- [ ] Sessions are invalidated appropriately after password or role changes.
- [ ] Rate limiting/abuse protection is verified for public forms and authentication.

## 14. Data integrity and concurrency

- [ ] Refresh immediately after every create/edit/delete action; data remains correct.
- [ ] Open the same record in two sessions and perform conflicting edits.
- [ ] Duplicate clicks do not create duplicate classes, submissions, comments, or attempts.
- [ ] Interrupted uploads fail safely and can be retried.
- [ ] Deleted parent records do not leave harmful orphaned data.
- [ ] Counts and progress recalculate after enrollment, submission, grading, archive, and deletion.
- [ ] Date/time values display correctly in the Philippines timezone and around midnight.
- [ ] Deadlines behave correctly for late submissions.
- [ ] Sorting and pagination remain stable while real-time data changes.

## 15. Performance checks

- [ ] Record a mobile performance trace on landing, sign in, and one dashboard.
- [ ] LCP is below 2.5 seconds under the agreed test conditions.
- [ ] CLS is below 0.1.
- [ ] Key interactions remain responsive and do not freeze the UI.
- [ ] Route chunks load successfully after a new deployment.
- [ ] Large lists remain usable with realistic production-size data.
- [ ] Images are appropriately sized/compressed.
- [ ] No repeated runaway Firestore subscriptions or duplicate network requests.
- [ ] Leaving a route cleans up subscriptions/listeners.
- [ ] Slow-loading states show progress and do not flash blank screens.

## 16. Fast post-deployment smoke test

Run this immediately after every production deployment:

1. [ ] Open landing page on a phone and desktop.
2. [ ] Sign in as admin; open dashboard and user management.
3. [ ] Sign in as trainer; open trainer home and one class.
4. [ ] Sign in as trainee; open home, calendar, and one class.
5. [ ] Create a disposable announcement as trainer.
6. [ ] Confirm the trainee sees it.
7. [ ] Add a disposable trainee comment.
8. [ ] Confirm the trainer sees it.
9. [ ] Delete the disposable test data.
10. [ ] Confirm mobile navigation, notifications, and sign out.
11. [ ] Check console and network panels for new errors.
12. [ ] Confirm direct refresh of a protected nested route.

## 17. Bug report template

```markdown
### [Severity] Short bug title

- Test ID:
- Environment/build:
- Role/account type:
- Browser/device:
- Viewport:
- Preconditions:

Steps:
1.
2.
3.

Expected:

Actual:

Frequency: Always / Intermittent / Once

Evidence:
- Screenshot/video:
- Console error:
- Network request:
- Related record IDs:

Notes:
```

### Severity guide

- **Critical:** Security/data-loss issue, widespread outage, or no role can complete a core workflow.
- **High:** A role cannot complete a key workflow and no reasonable workaround exists.
- **Medium:** Feature works incorrectly or is difficult to use, but a workaround exists.
- **Low:** Minor visual, copy, accessibility, or edge-case defect with limited impact.

## 18. Release sign-off

- [ ] All critical and high-severity tests pass.
- [ ] No unresolved security or data-integrity defect.
- [ ] Known medium/low defects are documented and accepted.
- [ ] Production build passed.
- [ ] Automated and manual accessibility checks completed.
- [ ] Mobile and desktop smoke tests completed.
- [ ] Admin, trainer, and trainee owners signed off.
- [ ] Rollback plan is documented and available.
- [ ] QA evidence and final report are stored with the release.

| Role | Name | Decision | Date |
| --- | --- | --- | --- |
| QA | | Approve / Reject | |
| Product owner | | Approve / Reject | |
| Engineering | | Approve / Reject | |
| Deployment owner | | Approve / Reject | |

