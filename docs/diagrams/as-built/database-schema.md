# HYTech LMS — Database Schema (as-built)

This is what is **actually in Firestore today**, including the legacy fields,
duplicated data and confusing names. It is deliberately not tidied up — use it
when you need to write a query, a security rule, or a migration and need to know
what really exists.

The cleaned-up target model is in
[../mermaid/database-schema.md](../mermaid/database-schema.md).

> Verified against `firestore.rules`, `src/utils/firestoreService.js` and
> `functions/src/index.js` on the `security/hardening-remediation` branch.

---

## 1. Actual document tree

```mermaid
flowchart LR
    ROOT(("Firestore<br/>root"))

    ROOT --> users["users/{uid}"]
    users --> u_priv["private/profile<br/><i>PII: phone, address, birthDate</i>"]
    users --> u_lms["lmsExperience/profile"]
    users --> u_cal["calendarEvents/{eventId}"]
    users --> u_prefs["classPrefs/{classId}<br/><i>nickname, color</i>"]

    ROOT --> usettings["userSettings/{uid}<br/>⚠ second home for avatar + prefs"]
    ROOT --> config["config/appSettings<br/><i>public read</i>"]
    ROOT --> config2["config/{otherDoc}<br/><i>staff read</i>"]

    ROOT --> sectors["sectors/{sectorId}"]

    ROOT --> courses["courses/{courseId}<br/>⚠ these are TEMPLATES"]
    courses --> c_top["topics/{topicId}"]
    courses --> c_mat["materials/{materialId}"]
    courses --> c_asg["assignments/{assignmentId}"]
    courses --> c_ass["assessments/{assessmentId}"]
    c_ass --> c_ass_key["private/answerKey<br/><i>no client read at all</i>"]

    ROOT --> classes["classes/{classId}<br/>the real running class"]
    classes --> cl_mem["members/{studentId}<br/>⚠ duplicates enrollments"]
    classes --> cl_act["activity/{eventId}"]
    classes --> cl_top["topics/{topicId}<br/>✔ what the UI renders"]
    classes --> cl_mod["modules/{moduleId}<br/>⚠ effectively dead"]
    cl_mod --> cl_mod_mat["materials/{materialId}"]
    classes --> cl_mat["materials/{materialId}<br/>⚠ second material home"]
    classes --> cl_ann["announcements/{announcementId}"]
    cl_ann --> cl_com["comments/{commentId}"]

    classes --> cl_ass["assessments/{assessmentId}<br/>path A: assessment builder"]
    cl_ass --> cl_ass_key["private/answerKey"]
    cl_ass --> cl_ass_att["attempts/{attemptId}"]

    classes --> cl_asg["assignments/{assignmentId}<br/>path B: form builder"]
    cl_asg --> cl_asg_key["private/answerKey"]
    cl_asg --> cl_asg_att["attempts/{attemptId}"]
    cl_asg --> cl_asg_sub["submissions/{studentId}"]

    ROOT --> cdir["classDirectory/{classId}<br/><i>trigger-written mirror, no client write</i>"]
    ROOT --> enroll["enrollments/{classId}_{studentId}"]
    ROOT --> students["students/{studentId}"]
    students --> prog["progress/{classId}<br/>⚠ also copied onto enrollment"]
    ROOT --> certs["certificates/{certificateId}"]
    ROOT --> notif["notifications/{notificationId}"]
    ROOT --> alogs["activityLogs/{logId}"]
    ROOT --> slogs["securityLogs/{logId}"]
    ROOT --> idreq["idRequests/{id}"]
    ROOT --> inc["incidentForms/{id}"]

    classDef warn fill:#FEF2F2,stroke:#DC2626,stroke-width:2px,color:#450A0A
    classDef server fill:#F0FDF4,stroke:#16A34A,stroke-width:2px,color:#052E16
    classDef root fill:#EEF2FF,stroke:#4338CA,stroke-width:2px,color:#1E1B4B
    class usettings,courses,cl_mem,cl_mod,cl_mod_mat,cl_mat,prog warn
    class cdir,slogs,certs,cl_ass_key,cl_asg_key,c_ass_key server
    class ROOT root
```

---

## 2. The naming trap

This is the single most common source of wrong queries in this codebase:

```mermaid
flowchart LR
    A["<b>courses</b> collection"] --> A1["holds COURSE TEMPLATES"]
    B["<b>classes</b> collection"] --> B1["holds ACTUAL CLASSES"]

    F1["getCoursesTemplates()"] -.reads.-> A
    F2["getCourses()"] -.reads.-> B
    F3["getClassesForTrainer()"] -.reads.-> B
    F4["getCourseById()"] -.reads.-> B
    F5["getCourseTemplateById()"] -.reads.-> A

    classDef bad fill:#FEF2F2,stroke:#DC2626,stroke-width:2px,color:#450A0A
    classDef ok fill:#F0FDF4,stroke:#16A34A,stroke-width:2px,color:#052E16
    class F2,F4 bad
    class F1,F3,F5 ok
```

`getCourses()` and `getCourseById()` read **`classes`**, not `courses`. A course
template only becomes visible on the admin Classes page once a trainer spins a
class up from it — which is exactly the reported "I added a course and it did
not show up" bug (QA item admin#4).

---

## 3. Entities with real field names

```mermaid
erDiagram
    users ||--o{ enrollments : "studentId"
    users ||--o{ classes : "trainerId"
    classes ||--o{ enrollments : "classId"
    classes ||--o{ members : "subcollection"
    classes ||--o{ assessments : "subcollection"
    classes ||--o{ assignments : "subcollection"
    classes ||--|| classDirectory : "mirrored by trigger"
    courses ||--o{ classes : "courseId (was courseTemplateId)"
    sectors ||--o{ courses : "sectorId"
    sectors ||--o{ classes : "sectorId"
    assessments ||--o{ attempts : "subcollection"
    assignments ||--o{ submissions : "subcollection"
    enrollments ||--|| progress : "duplicated both ways"

    users {
        string uid PK
        string email
        string role "admin|trainer|student"
        string status "'Active' — capital A"
        string createdBy "self-registration | admin"
        string displayName "DUP with name"
        string name "DUP with displayName"
        string firstName "DUP with profile.firstName"
        string middleName "DUP"
        string lastName "DUP"
        string nameExtension "DUP"
        map profile "nested COPY of the 4 name fields"
        string idNumber
        boolean profileComplete
        string photoURL "avatar candidate 1"
        string avatarUrl "avatar candidate 2"
        string avatarBase64 "avatar candidate 3"
        string avatarPreview "avatar candidate 4"
        timestamp createdAt
        timestamp updatedAt
    }

    sectors {
        string id PK
        string name
        string description
        string status "'Active' capital"
        string icon
        string color
        string bgImage
        timestamp createdAt
    }

    courses {
        string id PK "TEMPLATE, not a class"
        string sectorId FK
        string name
        string level
        string description
        array subjects "seeds class topics"
        string bgImage
        boolean available "NOT status - drives sector sync"
        timestamp createdAt
    }

    classes {
        string id PK
        string name
        string nameKey "lowercased duplicate guard"
        string classCode "join code"
        string trainerId FK "lead"
        array coTrainerIds "denormalised, not a join table"
        string sectorId FK "nullable"
        string courseId FK "renamed from courseTemplateId"
        string courseTemplateId "LEGACY - migration deletes it"
        string status "'Active'|'active'|'Provisioning'|'Archived'"
        string creationMode "empty | template"
        string templateCloneStatus "complete | failed"
        int currentEnrollments "maintained by trigger"
        string level
        string trainerName "denormalised copy"
        string bgImage
        string color
        int capacity "aka maxStudents"
        int maxStudents "LEGACY alias of capacity"
        string expiresAt "aka expiryDate aka endDate"
        string expiryDate "LEGACY alias"
        string endDate "LEGACY alias"
    }

    classDirectory {
        string classId PK "same id as classes"
        string name
        string nameKey
        string classCode
        string courseId
        string sectorId
        string trainerId
        string trainerName
        string level
        string status
        string bgImage
        string color
        int capacity "coalesced from maxStudents"
        int currentEnrollments
        string enrollmentDeadline
        string expiresAt "coalesced from expiryDate/endDate"
        timestamp updatedAt
    }

    members {
        string studentId PK "doc id = uid"
        string enrollmentId FK
        string status "lowercased"
        timestamp updatedAt
    }

    enrollments {
        string id PK "classId_studentId — composed"
        string classId FK
        string studentId FK
        string trainerId FK
        string courseId FK
        string status "'pending'|'active'|'ongoing'|'completed' lowercase"
        string className "denormalised copy"
        string trainerName "denormalised copy"
        string level "denormalised copy"
        string bgImage "denormalised copy"
        string color "denormalised copy"
        map progress "COPY of students/{id}/progress/{classId}"
        string requestedAt "ISO string, not Timestamp"
        string joinedAt "ISO string, not Timestamp"
        timestamp completedAt "Timestamp — inconsistent"
        string certificateId FK
    }

    progress {
        string classId PK "path: students/{studentId}/progress/{classId}"
        int completedItems
        int totalItems
        int overallProgress
        boolean requirementsSatisfied
        string source "authoritative-recalculation"
        timestamp lastUpdated
    }

    assessments {
        string id PK "path A: assessment builder"
        string title
        string status "draft | active"
        int points
        int passingScore
        boolean required
        boolean acceptResponses
        string availableFrom "ISO instant OR bare YYYY-MM-DD"
        string dueDate "ISO instant OR bare YYYY-MM-DD"
        int timeLimit
        map settings "oneResponsePerUser, attemptLimit, shuffle..."
        boolean showCorrectAnswers
        array questions "embedded, not a subcollection"
    }

    assignments {
        string id PK "path B: form builder"
        string title
        string type "Quiz | Submission"
        string status "draft | active"
        boolean acceptResponses
        boolean allowLateSubmissions
        string dueDate
        array questions "embedded when quiz-like"
    }

    attempts {
        string id PK "= studentId IF oneResponsePerUser ELSE auto-id"
        string studentId FK
        map answers
        int score "percent"
        int earnedPoints
        int totalPoints
        int correctCount
        int totalQuestions
        int timeTaken
        int passingScore
        boolean passed
        boolean requiresManualGrading
        boolean timedOut
        string status "submitted | pending_review"
        timestamp submittedAt
    }

    submissions {
        string studentId PK "doc id = uid"
        array files
        string status
        int grade "client may never write this"
        string feedback
        string gradedBy
        timestamp gradedAt
    }

    idRequests {
        string id PK
        string studentId FK
        string studentName "denormalised"
        string studentEmail "denormalised"
        string classId FK
        string className "denormalised"
        string trainerId FK
        string type "New | Replacement | Renewal"
        string status "pending|approved|rejected|completed"
        map details "PII SNAPSHOT copied out of users/{uid}/private"
        string notes
    }

    incidentForms {
        string id PK
        string filedBy FK
        string filedByName
        string filedByRole
        string involvedStudentId FK
        string involvedStudentName
        string classId FK
        string className
        string type
        string severity "Low | Medium | High"
        string status "open | reviewed | resolved"
        string description
        string date "YYYY-MM-DD string"
        timestamp createdAt
    }
```

---

## 4. Known divergences, ranked by how much they will bite you

| # | Divergence | Where | Consequence |
| --- | --- | --- | --- |
| 1 | **`courses` means templates; `getCourses()` reads `classes`** | `firestoreService.js` | Wrong collection queried; admin#4 "course does not appear" |
| 2 | **Two graded-item collections** — `assessments` (assessment builder) and `assignments` (form builder) | `classes/{id}/…` | Anything resolving a graded item must check **both**, and read attempts from the same parent that authored the item |
| 3 | **`status` casing is split** — 17 occurrences of `'Active'` vs 16 of `'active'` | throughout | Equality queries silently return nothing; rules compensate with `in ['Active','active']` |
| 4 | **Progress stored twice** — `students/{uid}/progress/{classId}` *and* `enrollments.progress` | Cloud Functions | Two sources of truth; only the Function keeps them in step |
| 5 | **Membership stored twice** — `classes/{id}/members/{uid}` *and* `enrollments` | rules + service | `classMember()` accepts either; an orphaned member doc grants access |
| 6 | **Materials have two homes** — `classes/{id}/materials` and `classes/{id}/modules/{id}/materials` | `firestoreService.js` | The `modules` subcollection is effectively dead; the UI renders `topics`. Seeded subjects "vanished" because of this |
| 7 | **Four avatar fields + a fallback collection** — `photoURL`, `avatarUrl`, `avatarBase64`, `avatarPreview`, then `userSettings/{uid}` | users, components | Every avatar read is a coalesce chain |
| 8 | **Name fields duplicated** — flat `firstName…nameExtension` *and* nested `profile.{…}` | `createRegisteredUserProfile` | Updating one and not the other desynchronises the display name |
| 9 | **Legacy field aliases** — `courseTemplateId`→`courseId`, `maxStudents`→`capacity`, `expiryDate`/`endDate`→`expiresAt` | classes | `migrateClassesCoursTemplateIdToCourseId()` (note the typo) runs on app load |
| 10 | **Mixed date storage** — ISO instants, bare `YYYY-MM-DD`, and Firestore `Timestamp` all in use | enrollments, assessments | A bare date resolves to end-of-day for a deadline and start-of-day for an open date; client and Function must apply this identically |
| 11 | **Attempt document ID is conditional** — `studentId` when `oneResponsePerUser`, otherwise auto-ID | `submitAssessmentAttempt` | You cannot assume a stable attempt path |
| 12 | **Questions are embedded arrays**, not a subcollection | assessments, assignments | No per-question query; whole item must be read |
| 13 | **A missed-deadline zero is derived, never stored** | client + Function | "No attempt + deadline passed" ⇒ 0. Do not look for a zero attempt document |
| 14 | **`classDirectory` is overwritten with `merge: false`** by an `onWrite` trigger | `syncClassDirectory` | Any field not in `toClassDirectoryEntry()` is destroyed on every class write |
| 15 | **Deletes are disabled in rules** for sectors, courses, classes, assessments | `firestore.rules` | Deletion only happens through `delete*Secure` Cloud Functions, which cascade |

---

## 5. Write-path reality

Which paths a browser can write is not obvious from the tree, so:

```mermaid
flowchart TB
    subgraph CW["Client-writable"]
        direction LR
        w1["users/{uid} — own profile fields only"]
        w2["enrollments — self-join as 'pending'"]
        w3["classes/* content — trainer & co-trainer"]
        w4["announcements + comments — own author"]
        w5["submissions/{uid} — never grade fields"]
        w6["classes/{id}/activity — own events"]
        w7["idRequests — own, always 'pending'"]
        w8["incidentForms — own filing"]
        w9["notifications — student may only notify staff"]
        w10["activityLogs — 5 allowlisted actions only"]
    end

    subgraph SW["Server-only (allow write: if false)"]
        direction LR
        s1["assessments/*/attempts"]
        s2["assignments/*/attempts"]
        s3["students/{uid}/progress/{classId}"]
        s4["certificates"]
        s5["securityLogs"]
        s6["classDirectory"]
        s7["courses/*/assessments/*/private"]
    end

    classDef ok fill:#F0FDF4,stroke:#16A34A,color:#052E16
    classDef srv fill:#EFF6FF,stroke:#2563EB,color:#172554
    class w1,w2,w3,w4,w5,w6,w7,w8,w9,w10 ok
    class s1,s2,s3,s4,s5,s6,s7 srv
```

Everything in the right-hand group has **no client write path whatsoever**.
Granting one is a security regression, not a convenience fix — attempts and
certificates are the anti-tampering boundary of the whole grading model.
