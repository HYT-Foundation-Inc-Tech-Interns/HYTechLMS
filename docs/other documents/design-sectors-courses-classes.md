# Design scope: Sectors / Courses / Classes restructure

Covers QA items **admin#3, admin#4, admin#6**. These are not isolated bugs — they
are symptoms of the current three-collection data model being confusing. This
doc maps the current model, states the problems, and proposes options with a
recommendation.

> **Status: Option B implemented (2026-07-21).** The admin "Classes" page is now
> "Courses & Classes" with two tabs — **Courses** (templates, so a course added
> under a sector now appears here → fixes admin#4) and **Classes** (running
> sessions) — plus a top-level **New Course** button with a category dropdown so
> admins no longer have to drill into a sector first (→ admin#3). Status is read
> case-insensitively so nothing is hidden by `Active` vs `active`. The full
> restructure (Option A) remains available as a follow-up; see §5.

---

## 1. Current model (as built)

Three separate Firestore collections plus enrollments:

| Collection | Created by | Meaning | Read on |
|---|---|---|---|
| `sectors` | Admin (Sectors page) | Top-level grouping (e.g. "Food & Beverage") | Sectors page, Student "Available" filter |
| `courses` | Admin (**inside** a sector) | **Course template** — name, level (NC I/II), description, image | Sectors page (per sector), Student "Available Courses" |
| `classes` | Trainer (from a template) | An actual running class — has `classCode`, `trainerId`, `sectorId`, `courseId` | Admin **Classes** page, trainer home, student class view |
| `enrollments` | Student/trainer/admin | A student's seat in a `class` | Everywhere student-facing |

Key service functions:
- `getCoursesTemplates()` → reads `courses` (templates)
- `getCourses()` → reads `classes` (actual classes) — **note the confusing name**
- A course template must be created **under** a sector (`createCourseTemplate(data, { sectorId })`).

## 2. The problems reported

- **admin#3 — "have to access the sectors first to add courses; maybe merge them?"**
  Creating a course *template* is only possible by drilling into a sector first
  (`Sectors → pick sector → Add Course`). There is no top-level "create a
  class/course" entry point. Sectors are a mandatory grouping layer.

- **admin#4 — "after adding a sector and a course, the course does not show up"**
  The admin adds a **course template** (→ `courses` collection) under a sector.
  The admin **Classes** page reads `getCourses({status:'Active'})` → the
  **`classes`** collection. Templates never appear there because a template is
  not a class until a *trainer* spins one up from it. So the newly added item
  genuinely "doesn't show up" on the page the admin is looking at. (There is
  also a latent case-sensitivity trap: queries filter `status == 'Active'`
  while some code paths write/compare lowercase `'active'`.)

- **admin#6 — "sector should just be a category/filter, not a group that needs
  classes. Classes can be made individually, then attach a category."**
  This is a direct request to demote `sectors` from a structural parent to a
  simple tag/label on a class.

## 3. Proposed target model

Make **sector a category (tag) on a class**, and let a class be created directly.
Collapse the template/class split (or keep templates optional).

```
classes (single source of truth for "a class")
  ├─ name, classCode, trainerId
  ├─ sectorId        → just a category reference (optional, filterable)
  ├─ level, description, bgImage   (fields that used to live on the template)
  └─ status ('active' | 'inactive')   ← standardize on lowercase everywhere

sectors  → renamed conceptually to "categories"; only { name, icon, status }
enrollments → unchanged
```

Changes implied:
1. **Creation flow**: add a top-level "Create Class" action (admin + trainer)
   with a **sector/category dropdown** ("attach a category") instead of
   requiring sector drill-down. `createCourseTemplate` becomes optional or is
   removed.
2. **Admin Classes page**: show `classes` (already does) and, if templates are
   retired, that page becomes the single list — fixing admin#4 because the thing
   you create is the thing you see.
3. **Sectors page**: becomes "Categories" management (rename), no nested course
   creation.
4. **Student browse**: "Available Classes" filters by category (already close to
   this — it filters courses by `sectorId`).
5. **Standardize `status`** to lowercase `'active'` and migrate existing docs.

## 4. Migration considerations (why this needs care)

- Existing `courses` (templates) and `classes` docs must be reconciled. A
  migration script would either (a) fold template fields onto their derived
  classes, or (b) keep templates read-only for history.
- `enrollments` reference `classId` + `courseId` — must stay valid.
- Firestore **security rules** and any **composite indexes** for
  `courses`/`classes` queries need updating.
- `status` casing migration touches queries in `Dashboard`, `StudentHome`,
  `Classes`, `Sectors`, and `firestoreService`.
- There is an existing `migrateClassesCoursTemplateIdToCourseId()` run on app
  load — a new migration would sit alongside it.

## 5. Options

| Option | Effort | Risk | Notes |
|---|---|---|---|
| **A. Full restructure** (recommended target) | High | Med–High (migration) | Sector→category, classes created directly, retire template split. Best UX, matches admin#6 exactly. |
| **B. Minimal clarity fix** | Low | Low | Keep model; add a top-level "Create Class" shortcut; surface course *templates* on the admin Classes page (or rename pages) so "added course" is visible → directly addresses admin#4 & the admin#3 friction without a migration. |
| **C. Do nothing** | — | — | Leaves the confusion. |

**Recommendation:** Start with **Option B** (low-risk, removes the day-to-day
confusion and fixes admin#4 quickly), and schedule **Option A** as a follow-up
once we agree on the migration plan. If you'd rather go straight to A, we should
first write the migration script + updated rules and test on a copy.

## 6. Open questions for the team
1. Retire course **templates** entirely, or keep them as reusable presets?
2. Should a class be allowed with **no** category, or is category required?
3. Who can create classes — trainers only, or admins too?
4. OK to run a one-time `status` lowercase migration across all docs?
