# HYTech LMS — Database Schema (design-level)

The production store is Cloud Firestore, a document database. This is the
**normalised logical schema** — one entity per concept, explicit keys, no
denormalised display copies. It is the model to reason about and the model to
migrate toward, not a literal dump of the collections.

For the literal as-built layout, including legacy fields and duplicated data,
see [../as-built/database-schema.md](../as-built/database-schema.md).

## Core: identity, catalogue, delivery

```mermaid
erDiagram
    USER ||--o| USER_PRIVATE : "has"
    USER ||--o| LMS_EXPERIENCE : "has"
    USER ||--o{ CLASS_SESSION : "leads"
    USER ||--o{ CLASS_CO_TRAINER : "assists"
    USER ||--o{ ENROLLMENT : "enrols via"
    SECTOR ||--o{ COURSE_TEMPLATE : "categorises"
    SECTOR ||--o{ CLASS_SESSION : "categorises"
    COURSE_TEMPLATE ||--o{ CLASS_SESSION : "instantiated as"
    CLASS_SESSION ||--o{ CLASS_CO_TRAINER : "shares"
    CLASS_SESSION ||--o{ TOPIC : "contains"
    CLASS_SESSION ||--o{ MATERIAL : "contains"
    CLASS_SESSION ||--o{ ANNOUNCEMENT : "hosts"
    CLASS_SESSION ||--o{ CLASS_ACTIVITY : "records"
    CLASS_SESSION ||--o{ ENROLLMENT : "admits"
    TOPIC ||--o{ MATERIAL : "groups"
    ANNOUNCEMENT ||--o{ COMMENT : "receives"

    USER {
        string uid PK
        string email UK "lowercased"
        string role "admin | trainer | student"
        string status "Active | Inactive | Suspended"
        string id_number UK "learner ID"
        string display_name
        string first_name
        string middle_name
        string last_name
        string name_extension
        string photo_url
        boolean profile_complete
        string created_by "self-registration | admin"
        timestamp created_at
        timestamp updated_at
    }

    USER_PRIVATE {
        string uid PK "FK to USER"
        string phone
        string address
        date birth_date
        string emergency_name
        string emergency_relation
        string emergency_phone
        timestamp updated_at
    }

    LMS_EXPERIENCE {
        string uid PK "FK to USER"
        string headline
        text about
        json skills
        json education
        json certifications
        string visibility "private | public"
    }

    SECTOR {
        string sector_id PK
        string name
        string status "Active | Inactive"
        text description
        string icon
        string color
        string bg_image
        timestamp created_at
    }

    COURSE_TEMPLATE {
        string course_id PK
        string sector_id FK
        string name
        string level "NC I..NC IV"
        text description
        json subjects
        string bg_image
        boolean available
        timestamp created_at
    }

    CLASS_SESSION {
        string class_id PK
        string trainer_id FK "lead trainer"
        string sector_id FK "nullable"
        string course_id FK "nullable"
        string name
        string name_key UK "lowercased, duplicate guard"
        string class_code UK "join code"
        string status "Draft|Provisioning|Active|Archived"
        string level
        text description
        string schedule
        string bg_image
        string creation_mode "empty | template"
        int current_enrollments "maintained by trigger"
        timestamp created_at
    }

    CLASS_CO_TRAINER {
        string class_id PK "FK to CLASS_SESSION"
        string trainer_id PK "FK to USER"
        timestamp added_at
    }

    TOPIC {
        string class_id PK "FK to CLASS_SESSION"
        string topic_id PK
        string title
        text description
        int order
        boolean is_published
        string author_id FK
        timestamp created_at
    }

    MATERIAL {
        string class_id PK "FK to CLASS_SESSION"
        string material_id PK
        string topic_id FK "nullable"
        string title
        text description
        string file_url
        string file_type
        bigint file_size
        string external_link
        string author_id FK
        timestamp created_at
    }

    ANNOUNCEMENT {
        string class_id PK "FK to CLASS_SESSION"
        string announcement_id PK
        string author_id FK
        string title
        text message
        json attachments
        timestamp created_at
    }

    COMMENT {
        string class_id PK "FK to CLASS_SESSION"
        string announcement_id PK "FK to ANNOUNCEMENT"
        string comment_id PK
        string author_id FK
        text message
        timestamp created_at
    }

    CLASS_ACTIVITY {
        string class_id PK "FK to CLASS_SESSION"
        string event_id PK
        string student_id FK
        string type "class_opened|class_closed|tab_switch"
        string assessment_id FK "nullable"
        timestamp created_at
    }
```

## Assessment, grading and records

```mermaid
erDiagram
    CLASS_SESSION ||--o{ GRADED_ITEM : "sets"
    GRADED_ITEM ||--o{ QUESTION : "asks"
    GRADED_ITEM ||--o| ANSWER_KEY : "scored by"
    GRADED_ITEM ||--o{ ATTEMPT : "receives"
    GRADED_ITEM ||--o{ SUBMISSION : "collects"
    USER ||--o{ ATTEMPT : "attempts"
    USER ||--o{ SUBMISSION : "submits"
    ENROLLMENT ||--|| PROGRESS : "measured by"
    ENROLLMENT ||--o| CERTIFICATE : "awards"
    USER ||--o{ CERTIFICATE : "holds"

    CLASS_SESSION {
        string class_id PK
        string name
        string status
    }

    ENROLLMENT {
        string enrollment_id PK "classId_studentId"
        string class_id FK
        string student_id FK
        string trainer_id FK
        string course_id FK
        string status "pending|active|ongoing|completed|rejected"
        timestamp requested_at
        timestamp joined_at
        timestamp completed_at
        string certificate_id FK "nullable"
        timestamp updated_at
    }

    PROGRESS {
        string student_id PK "FK to USER"
        string class_id PK "FK to CLASS_SESSION"
        int completed_items
        int total_items
        int overall_progress "percent"
        boolean requirements_satisfied
        string source "authoritative-recalculation"
        timestamp last_updated
    }

    CERTIFICATE {
        string certificate_id PK
        string certificate_number UK "HYT-YYYY-XXXXXXXX"
        string verification_token UK
        string student_id FK
        string class_id FK
        string course_id FK
        json qualification_snapshot
        string status "valid | revoked"
        timestamp issued_at
        string issued_by FK
        timestamp revoked_at
        text revoked_reason
    }

    GRADED_ITEM {
        string class_id PK "FK to CLASS_SESSION"
        string item_id PK
        string kind "assessment | assignment"
        string type "Quiz | Submission"
        string title
        text instructions
        string status "draft | active | closed"
        int points
        int passing_score
        boolean required
        boolean accept_responses
        timestamp available_from
        timestamp due_at
        int time_limit_minutes
        int attempt_limit "0 = unlimited"
        boolean one_response_per_user
        boolean allow_late_submissions
        boolean shuffle_questions
        boolean show_correct_answers
        string created_by FK
        timestamp created_at
    }

    QUESTION {
        string class_id PK "FK to CLASS_SESSION"
        string item_id PK "FK to GRADED_ITEM"
        string question_id PK
        string type "multiple_choice|checkbox|true_false|short_answer|paragraph"
        text prompt
        json options
        int points
        int order
    }

    ANSWER_KEY {
        string class_id PK "FK to CLASS_SESSION"
        string item_id PK "FK to GRADED_ITEM"
        json correct_answers "RESTRICTED - server-only"
        text rubric
        timestamp updated_at
    }

    ATTEMPT {
        string class_id PK "FK to CLASS_SESSION"
        string item_id PK "FK to GRADED_ITEM"
        string attempt_id PK "= student_id when one response per user"
        string student_id FK
        json answers
        int score "percent"
        int earned_points
        int total_points
        int correct_count
        int total_questions
        int time_taken "seconds"
        int passing_score
        boolean passed
        boolean requires_manual_grading
        boolean timed_out
        string status "submitted | pending_review | graded"
        timestamp submitted_at
        string graded_by FK "nullable"
        timestamp graded_at
    }

    SUBMISSION {
        string class_id PK "FK to CLASS_SESSION"
        string item_id PK "FK to GRADED_ITEM"
        string student_id PK "FK to USER"
        json files
        text note
        string status "submitted | accepted | returned"
        int grade "nullable"
        text feedback
        string graded_by FK
        timestamp graded_at
        timestamp submitted_at
    }
```

## Support, messaging and audit

```mermaid
erDiagram
    USER ||--o{ ID_REQUEST : "raises"
    USER ||--o{ INCIDENT_FORM : "files"
    USER ||--o{ NOTIFICATION : "receives"
    USER ||--o{ ACTIVITY_LOG : "generates"
    USER ||--o{ SECURITY_LOG : "is subject of"
    USER ||--o{ CALENDAR_EVENT : "owns"
    USER ||--o{ CLASS_PREFERENCE : "sets"
    CLASS_SESSION ||--o{ ID_REQUEST : "context for"
    CLASS_SESSION ||--o{ INCIDENT_FORM : "context for"
    CLASS_SESSION ||--o{ CLASS_PREFERENCE : "styled by"

    USER {
        string uid PK
        string role
        string status
    }

    CLASS_SESSION {
        string class_id PK
        string name
    }

    ID_REQUEST {
        string request_id PK
        string student_id FK
        string class_id FK
        string trainer_id FK
        string type "New | Replacement | Renewal"
        string status "pending|approved|rejected|completed"
        json details "PII snapshot - owner and admin only"
        text notes
        string reviewed_by FK
        timestamp reviewed_at
        timestamp created_at
    }

    INCIDENT_FORM {
        string incident_id PK
        string filed_by FK
        string filed_by_role "admin | trainer | student"
        string involved_student_id FK
        string class_id FK
        string type
        string severity "Low | Medium | High"
        string status "open | reviewed | resolved"
        text description
        date occurred_on
        string reviewed_by FK
        timestamp reviewed_at
        timestamp created_at
    }

    NOTIFICATION {
        string notification_id PK
        string to_uid FK
        string from_uid FK
        string type
        text message
        json metadata
        boolean unread
        timestamp created_at
    }

    ACTIVITY_LOG {
        string log_id PK
        string user_id FK
        string action "user_signup|user_login|join_class|id_request|incident_filed"
        string entity_type
        string entity_id
        json metadata
        timestamp created_at
    }

    SECURITY_LOG {
        string log_id PK
        string actor_uid FK
        string actor_role
        string action
        string entity_type
        string entity_id
        json metadata
        timestamp created_at
    }

    CALENDAR_EVENT {
        string uid PK "FK to USER"
        string event_id PK
        string title
        text description
        timestamp starts_at
        timestamp ends_at
    }

    CLASS_PREFERENCE {
        string uid PK "FK to USER"
        string class_id PK "FK to CLASS_SESSION"
        string nickname "max 100 chars"
        string color "allowlisted gradient"
        timestamp updated_at
    }

    APP_SETTINGS {
        string id PK "always 'appSettings'"
        json branding
        boolean allow_self_registration
        boolean require_enrollment_approval
        json notification_toggles
        timestamp updated_at
    }
```

## Design notes

**Composite keys reflect physical nesting.** Firestore stores topics, materials,
graded items, attempts and submissions as child documents of their class, so the
parent identifier is genuinely part of the key rather than a conventional
foreign key alone.

**`enrollment_id` is deterministic:** `{class_id}_{student_id}`. In a store with
no unique constraints, that composed document ID is what enforces one enrolment
per learner per class.

**`GRADED_ITEM` unifies two collections.** The application currently splits quiz
authoring across sibling `assessments` and `assignments` collections; the
`kind` discriminator collapses them. This is the single biggest simplification
this model proposes over the as-built schema.

**Three tables are server-write-only:** `ATTEMPT`, `CERTIFICATE` and
`SECURITY_LOG` have no client write path at all, and `PROGRESS` is derived. Any
design that lets a browser write these is a security regression.
