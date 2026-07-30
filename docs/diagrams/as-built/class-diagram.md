# HYTech LMS — Structure Diagram (as-built)

The clean [class diagram](../mermaid/class-diagram.md) shows a domain model with
`User` subclasses, an abstract `GradedItem`, and encapsulated behaviour. **None
of that exists in the code.** This is a React SPA: there are no domain classes,
no inheritance, and no repository objects. Behaviour lives in components, one
very large service module, and Cloud Functions.

This document shows the real structure. Use it when deciding where to put a
change; use the clean diagram when documenting the design intent.

> Line counts measured on the `security/hardening-remediation` branch.

---

## 1. What actually exists instead of classes

| Clean design says | Reality |
| --- | --- |
| `User` / `Administrator` / `Trainer` / `Student` classes | One `users/{uid}` document with a `role` string; role handled by `if` branches and `authRole.js` helpers |
| `GradedItem` ← `Assessment` / `Assignment` | Two unrelated Firestore collections with overlapping shapes and no shared code path |
| `Class.roster()`, `Enrollment.approve()` | Free functions exported from `firestoreService.js` |
| Repository per aggregate | One 5,149-line `firestoreService.js` |
| `AnswerKey.score()` | Scoring logic inlined in `functions/src/index.js` |
| Encapsulated `Attempt.finalise()` | `gradeAssessmentAttempt` callable |

---

## 2. Module structure

```mermaid
flowchart TB
    subgraph BROWSER["Browser — React 18 SPA (Vite)"]
        direction TB

        App["App.jsx<br/><i>160 lines — route table</i>"]

        subgraph CTX["Context & hooks — the closest thing to shared state"]
            direction LR
            Auth["AuthContext.jsx<br/>user, loading, error"]
            Toast["ToastContext.jsx"]
            HAppSet["useAppSettings.js"]
            HAvatar["useProfileAvatar.js"]
            HNotif["useRoleNotifications.js"]
            HUserSet["useUserSettings.js"]
            HQuery["useFirestoreQuery.js"]
        end

        subgraph GOD["⚠ God components — top maintainability risk"]
            direction LR
            CD["ClassDetail.jsx<br/><b>7,712 lines</b><br/>trainer class mgmt, builders,<br/>grading, gradebook"]
            SC["StudentCourse.jsx<br/><b>3,981 lines</b><br/>class experience, quiz runner,<br/>submissions"]
        end

        subgraph FEAT["Feature components"]
            direction LR
            AdminC["admin/Classes.jsx<br/>1,550"]
            UsersC["users/UserManagement.jsx<br/>1,415"]
            SectorsC["sectors/Sectors.jsx<br/>1,138"]
            TrainerH["trainer/TrainerHome.jsx<br/>965"]
            SettingsC["settings/Settings.jsx<br/>930"]
            LogsC["logs/SystemLogs.jsx<br/>726"]
            Rest["…auth, dashboard, hytbot,<br/>landing, layout, shared, student"]
        end

        subgraph UTIL["utils/"]
            direction LR
            FS["<b>firestoreService.js</b><br/><b>5,149 lines</b><br/>the entire data-access layer"]
            AuthRole["authRole.js"]
            Avatar["avatarStorage.js"]
            Helpers["answerFormat, courseColors,<br/>courseLabel, csv, nameFormat,<br/>notificationNavigation, phone"]
        end

        FB["firebase.js<br/><i>SDK init + App Check</i>"]
    end

    subgraph CLOUD["Firebase — asia-southeast1"]
        direction TB
        FAuth[("Authentication")]
        FStore[("Cloud Firestore")]
        FStorage[("Cloud Storage")]
        Fns["Cloud Functions<br/>functions/src/index.js<br/><i>1,949 lines</i>"]
        Rules["firestore.rules · storage.rules"]
    end

    App --> CTX
    App --> GOD
    App --> FEAT
    GOD --> FS
    FEAT --> FS
    CTX --> FS
    GOD --> Helpers
    FEAT --> Helpers
    FS --> FB
    Auth --> FB
    FB --> FAuth
    FB --> FStore
    FB --> FStorage
    FS -.->|httpsCallable| Fns
    FStore --- Rules
    FStorage --- Rules
    Fns --> FStore

    classDef god fill:#FEF2F2,stroke:#DC2626,stroke-width:3px,color:#450A0A
    classDef big fill:#FFF7ED,stroke:#EA580C,stroke-width:2px,color:#431407
    classDef cloud fill:#EFF6FF,stroke:#2563EB,stroke-width:2px,color:#172554
    class CD,SC god
    class FS big
    class FAuth,FStore,FStorage,Fns,Rules cloud
```

There is **no Redux and no central store**. State lives in component state,
`AuthContext`, `ToastContext`, custom hooks, and Firestore `onSnapshot`
listeners. `firestoreService.js` is the only data-access layer, and everything
imports from it directly — which is why it is 5,149 lines.

---

## 3. Cloud Functions — the real behaviour layer

These are the operations that genuinely cannot be expressed client-side. They
are the closest thing the system has to domain methods.

```mermaid
flowchart LR
    subgraph TRIG["Firestore triggers"]
        direction TB
        T1["syncClassDirectory<br/><i>onWrite classes/{id}</i><br/>overwrites mirror, merge:false"]
        T2["syncClassEnrollmentCount<br/>maintains currentEnrollments"]
        T3["notifyTraineesOnAnnouncement"]
        T4["notifyTraineesOnAssessmentPublish"]
        T5["notifyTraineesOnAssignmentPublish"]
    end

    subgraph GRADE["Grading & progress — server-authoritative"]
        direction TB
        G1["<b>submitAssessmentAttempt</b><br/>validates caller, enrolment,<br/>publication, window, time limit;<br/>grades; writes immutable attempt"]
        G2["gradeAssessmentAttempt<br/>trainer finalises pending_review"]
        G3["recalculateMyProgress"]
        G4["graduateEnrollment<br/>→ issues certificate in a transaction"]
        G5["revokeCertificate"]
        G6["verifyCertificate<br/><i>unauthenticated</i>"]
    end

    subgraph ADMINF["Privileged administration"]
        direction TB
        A1["adminUpdateUserAccount"]
        A2["changeEnrollmentStatus"]
        A3["promoteClassToTemplate"]
        A4["cloneTemplateToClass<br/><i>copies answer keys server-side</i>"]
    end

    subgraph DEL["Cascading deletes — rules forbid client delete"]
        direction TB
        D1["deleteAssessmentSecure"]
        D2["deleteClassSecure"]
        D3["deleteCourseTemplateSecure"]
        D4["deleteSectorSecure"]
    end

    subgraph MIG["Migrations"]
        direction TB
        M1["migrateClassDirectory"]
        M2["migrateAssessmentAnswerKeys"]
        M3["migrateClassesCoursTemplateIdToCourseId<br/><i>client-side; note the typo; runs on app load</i>"]
    end

    classDef crit fill:#FEF2F2,stroke:#DC2626,stroke-width:2px,color:#450A0A
    class G1 crit
```

---

## 4. The dual assessment path, as built

This is the structural wart most likely to cause a bug. There is no shared
abstraction — two builders write to two sibling collections, and every consumer
must handle both.

```mermaid
flowchart TB
    AB["Assessment builder<br/><i>ClassDetail.jsx</i>"] -->|writes| ASS["classes/{id}/<b>assessments</b>/{aid}"]
    FB["Form builder<br/><i>ClassDetail.jsx</i>"] -->|writes| ASG["classes/{id}/<b>assignments</b>/{aid}"]

    ASS --> ASSK["private/answerKey"]
    ASS --> ASSA["attempts/{attemptId}"]
    ASG --> ASGK["private/answerKey"]
    ASG --> ASGA["attempts/{attemptId}"]
    ASG --> ASGS["submissions/{studentId}<br/><i>type = Submission only</i>"]

    ASG -->|type = Quiz| QUIZ{{"behaves like an assessment"}}
    ASG -->|type = Submission| MANUAL{{"trainer grades manually"}}

    RESOLVE["Any consumer:<br/>gradebook, progress, student view"]
    RESOLVE -.->|"must check BOTH"| ASS
    RESOLVE -.->|"must check BOTH"| ASG

    NOTE["⚠ Attempts must be read from the<br/>same parent that authored the item.<br/>The callable returns a <b>kind</b> field<br/>telling the client which one."]

    classDef warn fill:#FEF2F2,stroke:#DC2626,stroke-width:2px,color:#450A0A
    class RESOLVE,NOTE warn
```

---

## 5. Access-control layers, as built

Authentication and authorisation are deliberately separate, and each layer
re-checks independently. A route guard is **not** a security control — a hostile
client can call the Firebase APIs directly.

```mermaid
flowchart LR
    U(["User"]) --> L1["1 · Firebase Auth<br/><i>proves identity only</i>"]
    L1 --> L2["2 · users/{uid}<br/><i>role + status + createdBy</i>"]
    L2 --> L3["3 · Route guards<br/><i>App.jsx — navigation only, NOT security</i>"]
    L3 --> L4["4 · Firestore & Storage rules<br/><i>independent enforcement</i>"]
    L4 --> L5["5 · Cloud Functions<br/><i>recheck auth, role, status,<br/>ownership, input</i>"]
    L5 --> DATA[("Data")]

    classDef weak fill:#FEF2F2,stroke:#DC2626,stroke-width:2px,color:#450A0A
    classDef strong fill:#F0FDF4,stroke:#16A34A,stroke-width:2px,color:#052E16
    class L3 weak
    class L4,L5 strong
```

Note the `canUseLms()` waiver in `firestore.rules`: an account with
`createdBy == 'admin'` bypasses the email-verification gate. This is why a
self-registering user must never be able to set that field — the create rule
explicitly forbids it.

---

## 6. If you are refactoring toward the clean model

Rough order of value, cheapest and safest first:

1. **Standardise `status` casing** to lowercase and migrate existing documents —
   removes a whole class of silent query failures.
2. **Extract the graded-item resolver** into one module both builders and all
   consumers call, even before the collections merge.
3. **Collapse the duplicate avatar and name fields** to one canonical each.
4. **Split `ClassDetail.jsx`** along its tabs (roster, content, builders,
   grading, gradebook) — 7,712 lines is the single largest maintenance risk.
5. **Split `firestoreService.js`** per aggregate (users, classes, enrolments,
   assessments, support) — this is the step that makes the clean class diagram
   plausible rather than aspirational.
6. **Retire `classes/{id}/modules`** and the duplicate materials home.
7. **Merge `assessments` and `assignments`** behind a `kind` discriminator. This
   one needs a migration, updated rules, and new indexes — do it last.
