# QA HYT-GI — Comments (retrieved from PDF)

Source: `QA HYT-GI - Comments.pdf`. Status column tracks resolution in the current codebase.

## Resolution log (2026-07-21)

**Fixed in code (build verified):**
- admin#2 — verified already live (`subscribeToActivityLogs`), not hardcoded.
- admin#5 — per-user action menu was clipped by table `overflow`/low z-index; now fixed-position, overlays correctly.
- student1#1 — mojibake `📚` in activity feed → replaced with icon; whole project swept clean.
- student1#2 — post avatars now resolve the author's *current* photo, not the stored snapshot.
- student3#1 — added a Change-Password modal to the waiting room (usable before joining a class).
- student3#2 — `autoComplete="off"` on phone/location to stop browser autofill.
- student3#3 — "Member since" / "Last login" now from real Firebase Auth metadata.
- student3#4 — navbar falls back to the sign-up name (AuthContext) instead of "Student User".
- trainer#1 & trainer#7 — announcement posting failed on `undefined` fields; service now coerces to null/defaults.
- trainer#2 — hardcoded "AU" avatar → derived initials; navbar name fallback too.
- trainer#3 — notification clicks now route by type.
- trainer#4 — date inputs capped (min/max) + save-time year guards.
- trainer#5 — "View Details" now opens a per-student response modal.
- trainer#6 — submission-task Instructions are now required (the prompt); student modal shows a fallback.

**Behavior changes (per product decision):**
- admin#1 — single-active-enrollment restriction lifted; students can hold multiple enrollments.
- student2#1 — class-code joins now create a **pending** request the class trainer approves (rules + service + trainer roster UI + student pending state).

**admin#3, admin#4, admin#6 — Option B implemented:** admin Classes page is now
"Courses & Classes" with Courses/Classes tabs (course templates now visible →
admin#4), a top-level "New Course" button with a category dropdown (no sector
drill-down → admin#3), and case-insensitive status. Full restructure (Option A)
deferred — see `design-sectors-courses-classes.md`.


## admin@hyt.com
1. Only one subject shows up when student1 and student has 2 diff subjects
2. Recent activity is hardcoded
3. Could add new courses, but have to access the sectors first. Maybe merge them?
4. After adding sector and adding a course, the course does not show up
5. User management - the setting per user does not overlay properly
6. Sector should just be a category/filter, not a group that needs its own classes. Classes can be made individually, then just attach a category.

## student1@hyt.com
1. Error under barista course (garbled text `ðŸ"š` in Recent Activity feed)
2. Error under barista course when posting — despite changing user icon, the icon on the post itself hasn't changed, but clicking the spotlight shows the updated version

## student2@hyt.com
1. Joining the class did not require any approval — is this on purpose?

## student3@hyt.com
1. New accounts can't change their password when not yet in a class
2. Phone and location automatically filled out, that must not happen
3. "Member since" is not accurate. Account created today, it says January 2024.
4. Top right says "Student User" when name is set.

## trainer@hyt.com
1. Under barista course - Test student announcement does not work
2. Temporary profile photo does not reflect the user initials (shows "AU" for Test Trainer)
3. "please add me" notification is odd; clicking the notification does not redirect anywhere
4. Year is beyond what the world is capable of (Upcoming Deadline shows "Due: 7/21/203243")
5. View details in submission does not work
6. Create submission task — since there are no questions/prompts, it ends up empty
7. When creating an announcement: "Failed to post announcement: Function addDoc() Unsupported field value: undefined (found in field ... classes/<id>/announcements/...)" — happens with or without an attachment
