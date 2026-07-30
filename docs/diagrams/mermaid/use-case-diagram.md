# HYTech LMS — Use Case Diagrams (design-level)

Mermaid has no native use-case diagram type, so these use flowcharts with the
conventional layout: actors outside, the system boundary as a subgraph,
`<<include>>` / `<<extend>>` as dashed edges.

Split into a context view plus six focused diagrams — a single frame holding all
sixty-odd use cases is unreadable at any zoom level.

Actor generalisation applies throughout: every role is an **Authenticated
User**, and an **Administrator** inherits everything a **Trainer** can do. Each
sub-diagram repeats only the actors it needs.

---

## 0 · Actors and capability areas

```mermaid
flowchart LR
    Guest(["Guest"])
    Base(["Authenticated<br/>User"])
    Student(["Trainee"])
    Trainer(["Trainer"])
    Admin(["Administrator"])

    Auth[["Identity<br/>Provider"]]
    Grader[["Grading<br/>Service"]]
    Notifier[["Notification<br/>Service"]]

    subgraph SYS["HYTech Learning Management System"]
        A(["Account &<br/>Access"])
        B(["Catalogue &<br/>System Administration"])
        C(["Class Management"])
        D(["Learning Content"])
        E(["Assessment &<br/>Grading"])
        F(["Records &<br/>Certification"])
        G(["Learner Support"])
    end

    Student -->|is a| Base
    Trainer -->|is a| Base
    Admin -->|is a| Trainer

    Guest --- A
    Base --- A
    Base --- D
    Base --- G
    Student --- E
    Student --- F
    Student --- G
    Trainer --- C
    Trainer --- D
    Trainer --- E
    Trainer --- F
    Admin --- B

    A -.-> Auth
    E -.-> Grader
    F -.-> Grader
    D -.-> Notifier
    E -.-> Notifier

    classDef actor fill:#EEF2FF,stroke:#4338CA,stroke-width:2px,color:#1E1B4B
    classDef system fill:#FEF3C7,stroke:#B45309,stroke-width:2px,color:#451A03
    class Guest,Base,Student,Trainer,Admin actor
    class Auth,Grader,Notifier system
```

---

## 1 · Account & Access

```mermaid
flowchart LR
    Guest(["Guest"])
    Base(["Authenticated<br/>User"])
    Admin(["Administrator"])
    Auth[["Identity<br/>Provider"]]

    subgraph ACC["Account & Access"]
        UC_Register(["Register as a trainee"])
        UC_Verify(["Verify email address"])
        UC_SignIn(["Sign in"])
        UC_Authn(["Authenticate credentials"])
        UC_Guard(["Enforce role and<br/>account status"])
        UC_SignOut(["Sign out"])
        UC_Profile(["Manage own profile"])
        UC_Password(["Change password"])
        UC_Notifications(["View notifications"])
        UC_Catalogue(["View public<br/>course catalogue"])
    end

    Guest --- UC_Register
    Guest --- UC_SignIn
    Guest --- UC_Catalogue
    Base --- UC_SignOut
    Base --- UC_Profile
    Base --- UC_Password
    Base --- UC_Notifications
    Admin --- UC_Guard
    UC_Authn --- Auth

    UC_SignIn -.->|include| UC_Authn
    UC_SignIn -.->|include| UC_Guard
    UC_Register -.->|include| UC_Authn
    UC_Verify -.->|extend| UC_Register

    classDef actor fill:#EEF2FF,stroke:#4338CA,stroke-width:2px,color:#1E1B4B
    classDef system fill:#FEF3C7,stroke:#B45309,stroke-width:2px,color:#451A03
    class Guest,Base,Admin actor
    class Auth system
```

Self-registration always produces a **student**. Trainer and admin accounts are
created or promoted by an administrator, and self-registration can be disabled
entirely in system settings.

*Enforce role and account status* is included by sign-in, but it is
independently re-applied by the security rules and by every privileged server
operation. A route guard on its own is never the control.

---

## 2 · Catalogue & System Administration

```mermaid
flowchart LR
    Admin(["Administrator"])
    Trainer(["Trainer"])

    subgraph CAT["Catalogue Administration"]
        UC_Sectors(["Manage sectors"])
        UC_Templates(["Manage course templates"])
        UC_PublishCourse(["Publish course to catalogue"])
        UC_Promote(["Promote class to template"])
    end

    subgraph ADM["User & System Administration"]
        UC_CreateUser(["Create user account"])
        UC_AssignRole(["Assign or change role"])
        UC_SetStatus(["Activate / deactivate account"])
        UC_Settings(["Configure system settings"])
        UC_Logs(["Review activity logs"])
        UC_SecurityLogs(["Review security audit trail"])
    end

    Admin --- UC_Sectors
    Admin --- UC_Templates
    Admin --- UC_PublishCourse
    Admin --- UC_CreateUser
    Admin --- UC_AssignRole
    Admin --- UC_SetStatus
    Admin --- UC_Settings
    Admin --- UC_Logs
    Admin --- UC_SecurityLogs
    Trainer --- UC_Promote

    classDef actor fill:#EEF2FF,stroke:#4338CA,stroke-width:2px,color:#1E1B4B
    class Admin,Trainer actor
```

*Configure system settings* controls self-registration and whether enrolment
requires trainer approval — both change how other use cases behave.

---

## 3 · Class Management

```mermaid
flowchart LR
    Student(["Trainee"])
    Trainer(["Trainer"])
    Admin(["Administrator"])

    subgraph CLS["Class Management"]
        UC_CreateClass(["Create class"])
        UC_Clone(["Clone template content"])
        UC_ClassCode(["Generate class code"])
        UC_CoTrainers(["Manage co-trainers"])
        UC_Transfer(["Transfer class ownership"])
        UC_Join(["Enrol by class code"])
        UC_Approve(["Approve enrolment request"])
        UC_DirectEnrol(["Enrol trainee directly"])
        UC_Roster(["View class roster"])
        UC_Remove(["Remove trainee from class"])
        UC_Archive(["Archive class"])
    end

    Student --- UC_Join
    Trainer --- UC_CreateClass
    Trainer --- UC_CoTrainers
    Trainer --- UC_Transfer
    Trainer --- UC_Approve
    Trainer --- UC_DirectEnrol
    Trainer --- UC_Roster
    Trainer --- UC_Remove
    Trainer --- UC_Archive
    Admin --- UC_CreateClass
    Admin --- UC_DirectEnrol

    UC_CreateClass -.->|include| UC_ClassCode
    UC_Clone -.->|extend| UC_CreateClass
    UC_Join -.->|include| UC_Approve

    classDef actor fill:#EEF2FF,stroke:#4338CA,stroke-width:2px,color:#1E1B4B
    class Student,Trainer,Admin actor
```

*Enrol by class code* includes approval under the default policy. When an
administrator turns enrolment approval off, the enrolment activates immediately
and the approval step is skipped.

*Clone template content* copies content **server-side** so private answer keys
never reach the trainer's browser.

Co-trainers gain full content powers; managing co-trainers and transferring
ownership stay with the lead trainer.

---

## 4 · Learning Content

```mermaid
flowchart LR
    Student(["Trainee"])
    Trainer(["Trainer"])
    Notifier[["Notification<br/>Service"]]

    subgraph CON["Learning Content"]
        UC_Topics(["Organise topics and modules"])
        UC_Upload(["Upload learning material"])
        UC_Announce(["Post announcement"])
        UC_Comment(["Comment on announcement"])
        UC_Browse(["Browse class content"])
        UC_Download(["Download material"])
    end

    Trainer --- UC_Topics
    Trainer --- UC_Upload
    Trainer --- UC_Announce
    Student --- UC_Browse
    Student --- UC_Download
    Student --- UC_Comment
    Student --- UC_Announce
    UC_Announce --- Notifier

    classDef actor fill:#EEF2FF,stroke:#4338CA,stroke-width:2px,color:#1E1B4B
    classDef system fill:#FEF3C7,stroke:#B45309,stroke-width:2px,color:#451A03
    class Student,Trainer actor
    class Notifier system
```

Trainees may post to the class feed and edit their own post. Staff may remove an
inappropriate post but cannot rewrite someone else's.

---

## 5 · Assessment & Grading

```mermaid
flowchart LR
    Student(["Trainee"])
    Trainer(["Trainer"])
    Grader[["Grading<br/>Service"]]
    Notifier[["Notification<br/>Service"]]

    subgraph AUTH["Authoring"]
        UC_Author(["Author assessment"])
        UC_AnswerKey(["Define answer key"])
        UC_Window(["Set availability window and deadline"])
        UC_Publish(["Publish assessment"])
    end

    subgraph TAKE["Taking & grading"]
        UC_Take(["Take assessment"])
        UC_SubmitWork(["Submit deliverable"])
        UC_Eligibility(["Validate eligibility and window"])
        UC_AutoGrade(["Grade attempt automatically"])
        UC_RecordAttempt(["Record immutable attempt"])
        UC_Review(["Review pending paragraph answers"])
        UC_ManualGrade(["Grade submission manually"])
        UC_Gradebook(["View gradebook"])
        UC_OwnResults(["View own results"])
        UC_Progress(["Track learning progress"])
    end

    Trainer --- UC_Author
    Trainer --- UC_Publish
    Trainer --- UC_Review
    Trainer --- UC_ManualGrade
    Trainer --- UC_Gradebook
    Student --- UC_Take
    Student --- UC_SubmitWork
    Student --- UC_OwnResults
    Student --- UC_Progress

    UC_AutoGrade --- Grader
    UC_RecordAttempt --- Grader
    UC_Publish --- Notifier

    UC_Author -.->|include| UC_AnswerKey
    UC_Author -.->|include| UC_Window
    UC_Take -.->|include| UC_Eligibility
    UC_Take -.->|include| UC_AutoGrade
    UC_AutoGrade -.->|include| UC_RecordAttempt
    UC_SubmitWork -.->|include| UC_Eligibility
    UC_Review -.->|extend| UC_AutoGrade
    UC_ManualGrade -.->|include| UC_Gradebook

    classDef actor fill:#EEF2FF,stroke:#4338CA,stroke-width:2px,color:#1E1B4B
    classDef system fill:#FEF3C7,stroke:#B45309,stroke-width:2px,color:#451A03
    class Student,Trainer actor
    class Grader,Notifier system
```

**Grading is server-authoritative.** A trainee never scores their own work.
*Take assessment* hands answers to the Grading Service, which owns scoring and
writes an attempt the client can neither create nor alter. Paragraph answers
land in a pending state and are finalised by a trainer.

*Validate eligibility and window* checks caller, enrolment, publication state,
availability window, attempt limit and time limit. A missed deadline scores zero
without any stored attempt.

Correct answers live in a private document, never in the trainee-readable
assessment.

---

## 6 · Records, Certification & Learner Support

```mermaid
flowchart LR
    Guest(["Guest"])
    Student(["Trainee"])
    Trainer(["Trainer"])
    Admin(["Administrator"])
    Grader[["Grading<br/>Service"]]

    subgraph REC["Records & Certification"]
        UC_Recalc(["Recalculate authoritative progress"])
        UC_Graduate(["Graduate trainee"])
        UC_Issue(["Issue certificate"])
        UC_Revoke(["Revoke certificate"])
        UC_VerifyCert(["Verify certificate"])
    end

    subgraph SUP["Learner Support"]
        UC_IdRequest(["Request ID card"])
        UC_IdProcess(["Process ID card request"])
        UC_Incident(["File incident report"])
        UC_IncidentReview(["Review incident report"])
        UC_Calendar(["Manage personal calendar"])
    end

    Guest --- UC_VerifyCert
    Student --- UC_IdRequest
    Student --- UC_Calendar
    Student --- UC_Incident
    Trainer --- UC_Graduate
    Trainer --- UC_Incident
    Trainer --- UC_IncidentReview
    Admin --- UC_IdProcess
    Admin --- UC_Revoke

    UC_Recalc --- Grader
    UC_Issue --- Grader

    UC_Graduate -.->|include| UC_Recalc
    UC_Graduate -.->|include| UC_Issue
    UC_Revoke -.->|extend| UC_Issue
    UC_IdProcess -.->|extend| UC_IdRequest
    UC_IncidentReview -.->|extend| UC_Incident

    classDef actor fill:#EEF2FF,stroke:#4338CA,stroke-width:2px,color:#1E1B4B
    classDef system fill:#FEF3C7,stroke:#B45309,stroke-width:2px,color:#451A03
    class Guest,Student,Trainer,Admin actor
    class Grader system
```

*Graduate trainee* refuses unless every required item is satisfied by
recalculated progress; certificate issue and enrolment completion happen in one
transaction.

A trainer may only move an incident report through the workflow — they cannot
rewrite the incident details. ID card requests are handled by an administrator;
the trainer is not involved.
