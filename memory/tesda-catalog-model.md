---
name: tesda-catalog-model
description: How the TESDA Sector/Program/Subject taxonomy maps onto the LMS data model
metadata:
  type: project
---

The TESDA catalog (Sector → Program → Subject) maps onto the existing 3-collection model as decided by the user (2026-07-22):

- **Sector** → `sectors` collection.
- **Program** (e.g. "Plumbing NC II") → `courses` collection ("course template"). This is the class-able unit — a trainer turns a Program into a class. Program docs carry `subjects[]` (editable module templates), a parsed `level`, `available` (default **false**), and `source: 'tesda-catalog'`.
- **Subject** (e.g. "Introduction to Plumbing") → becomes an ordered doc in `classes/{id}/modules` (the collapsible sections) when a class is created. Copied by `createCourse` in firestoreService.

**Editing subjects** (shared `SubjectListEditor` component, `components/shared/`):
- Admin edits the program template's `subjects[]` via an "Edit Subjects" modal on each course card (saved with `updateCourseTemplate`) — the reusable default.
- Trainer edits the subject list inline in the create-class flow (TrainerHome); the edited list is passed as `subjects` to `createCourse` and seeds *that class's* modules only, without touching the shared template (trainers can't write `courses` per rules).

**Availability workflow:** Programs are seeded OFF. Admin flips per-program availability (`setCourseAvailability`) in the admin "Courses & Classes" page. Only `available: true` programs show to trainers (`getCoursesTemplates({ availableOnly: true })` — filtered in-memory to avoid a composite index).

**Seeding:** `seedTesdaCatalog()` (admin-only, idempotent, keys programs by `sectorId|name`) is triggered by the "Import TESDA Catalog" button on the admin page. Source data: `HYTech/src/data/tesdaCatalog.js`.

Design background lives in [design-sectors-courses-classes.md](../docs/design-sectors-courses-classes.md).
