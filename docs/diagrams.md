# Taskora — System Diagrams

Design diagrams for the Task Management System (INTE 21323), covering the SRS
*Deliverables* requirement: **ER diagram, Class diagram, DB design, and Deployment
diagram**. Each section shows the **authored diagram** (image, with a high-resolution
PDF where available) alongside a **text-based [Mermaid](https://mermaid.js.org/)
version** that renders natively on GitHub. Sources of truth:
[`backend/prisma/schema.prisma`](../backend/prisma/schema.prisma),
[`supabase/migrations/`](../supabase/migrations), and [`render.yaml`](../render.yaml).

---

## 1. Entity–Relationship (ER) Diagram

Ten entities. `roles → users` is one-to-many; `project_members` and
`task_assignments` are many-to-many join tables; `notifications` link optionally to
a task and/or project.

**Authored ER diagram** — high-resolution source: [er-diagram.pdf](diagrams/er-diagram.pdf)

![ER Diagram](diagrams/er-diagram.png)

A text-based (Mermaid) version of the same model, for quick reference on GitHub:

```mermaid
erDiagram
    ROLES ||--o{ USERS : "assigned to"
    USERS ||--o{ PASSWORD_RESETS : "requests"
    USERS ||--o{ PROJECTS : "creates"
    USERS ||--o{ PROJECT_MEMBERS : "member of"
    PROJECTS ||--o{ PROJECT_MEMBERS : "has"
    USERS ||--o{ TASKS : "creates"
    PROJECTS ||--o{ TASKS : "contains"
    TASKS ||--o{ TASK_ASSIGNMENTS : "assigned via"
    USERS ||--o{ TASK_ASSIGNMENTS : "works on"
    TASKS ||--o{ COMMENTS : "has"
    USERS ||--o{ COMMENTS : "writes"
    TASKS ||--o{ ATTACHMENTS : "has"
    USERS ||--o{ ATTACHMENTS : "uploads"
    USERS ||--o{ NOTIFICATIONS : "receives"
    TASKS  |o--o{ NOTIFICATIONS : "about"
    PROJECTS |o--o{ NOTIFICATIONS : "about"

    ROLES {
        int id PK
        varchar role_name UK "Admin | Project Manager | Collaborator"
    }
    USERS {
        int id PK
        int role_id FK
        varchar full_name
        varchar email UK
        varchar password_hash "bcrypt"
        bool is_first_login "forces password reset"
        bool is_active
        varchar profile_image "nullable"
        timestamp created_at
        timestamp updated_at
    }
    PASSWORD_RESETS {
        int id PK
        int user_id FK
        varchar reset_token
        timestamp expires_at
        bool used
    }
    PROJECTS {
        int id PK
        varchar project_name
        text description "nullable"
        int created_by FK
        date start_date "nullable"
        date end_date "nullable"
        varchar status "default Active"
        timestamp created_at
        timestamp updated_at
    }
    PROJECT_MEMBERS {
        int id PK
        int project_id FK
        int user_id FK
        timestamp joined_at
    }
    TASKS {
        int id PK
        int project_id FK
        varchar title
        text description "nullable"
        varchar priority "Low | Medium | High"
        varchar status "To Do | In Progress | Completed"
        date due_date "nullable"
        int created_by FK
        timestamp created_at
        timestamp updated_at
    }
    TASK_ASSIGNMENTS {
        int id PK
        int task_id FK
        int user_id FK
        timestamp assigned_at
    }
    COMMENTS {
        int id PK
        int task_id FK
        int user_id FK
        text comment_text
        timestamp created_at
    }
    ATTACHMENTS {
        int id PK
        int task_id FK
        int uploaded_by FK
        varchar file_name
        varchar file_url
        bytea file_data "nullable"
        varchar file_mime "nullable"
        int file_size "nullable"
        timestamp uploaded_at
    }
    NOTIFICATIONS {
        int id PK
        int user_id FK
        varchar title
        text message
        varchar type
        int task_id FK "nullable"
        int project_id FK "nullable"
        bool is_read
        timestamp created_at
    }
```

**Cardinality notes**

- `project_members` enforces `UNIQUE(project_id, user_id)` — a user joins a project once.
- `task_assignments` enforces `UNIQUE(task_id, user_id)` — a task is assigned to a user once (supports multi-assignee).
- `notifications.task_id` / `notifications.project_id` are nullable FKs with `ON DELETE SET NULL`, so deleting a task/project preserves the notification history.

---

## 2. Class Diagram

Domain model as classes (mirrors the Prisma models) with the key persistence
operations each is exercised through. The backend follows an **MVC + service**
layering: `routes → controllers → services/models → database`.

```mermaid
classDiagram
    class Role {
        +int id
        +string roleName
        +User[] users
    }
    class User {
        +int id
        +int roleId
        +string fullName
        +string email
        +string passwordHash
        +bool isFirstLogin
        +bool isActive
        +authenticate(password) JWT
        +resetPassword(newPassword)
    }
    class PasswordReset {
        +int id
        +int userId
        +string resetToken
        +datetime expiresAt
        +bool used
    }
    class Project {
        +int id
        +string projectName
        +string description
        +int createdBy
        +date startDate
        +date endDate
        +string status
        +addMember(user)
        +listTasks()
    }
    class ProjectMember {
        +int id
        +int projectId
        +int userId
        +datetime joinedAt
    }
    class Task {
        +int id
        +int projectId
        +string title
        +string description
        +string priority
        +string status
        +date dueDate
        +int createdBy
        +assign(user)
        +updateStatus(status)
    }
    class TaskAssignment {
        +int id
        +int taskId
        +int userId
        +datetime assignedAt
    }
    class Comment {
        +int id
        +int taskId
        +int userId
        +string commentText
    }
    class Attachment {
        +int id
        +int taskId
        +int uploadedBy
        +string fileName
        +bytes fileData
        +string fileMime
        +int fileSize
    }
    class Notification {
        +int id
        +int userId
        +string title
        +string message
        +string type
        +bool isRead
        +markRead()
    }

    Role "1" --> "*" User : has
    User "1" --> "*" PasswordReset : requests
    User "1" --> "*" Project : creates
    Project "1" --> "*" ProjectMember : has
    User "1" --> "*" ProjectMember : joins
    Project "1" --> "*" Task : contains
    User "1" --> "*" Task : creates
    Task "1" --> "*" TaskAssignment : has
    User "1" --> "*" TaskAssignment : on
    Task "1" --> "*" Comment : has
    User "1" --> "*" Comment : writes
    Task "1" --> "*" Attachment : has
    User "1" --> "*" Attachment : uploads
    User "1" --> "*" Notification : receives
```

**Backend layering (MVC + service)**

```mermaid
flowchart LR
    R["routes/*.js<br/>(REST endpoints + Swagger)"] --> C["controllers/*.js<br/>(request handling, validation)"]
    C --> S["services/*.js<br/>(notificationService, socketService)"]
    C --> M["models/*.js<br/>(data access, parameterized SQL)"]
    S --> M
    M --> DB[("PostgreSQL<br/>Supabase")]
    MW["middleware<br/>(authMiddleware, rateLimiters,<br/>requirePasswordReset, upload)"] -.guards.-> C
```

---

## 3. Database Design

PostgreSQL (Supabase). Engine-level integrity is enforced with primary keys,
foreign keys, unique constraints, `CHECK` constraints, and indexes. The application
layer never concatenates SQL — all access is via parameterized queries / the Prisma
schema (defense in depth).

**Authored schema diagram** — high-resolution source: [database-design.pdf](diagrams/database-design.pdf)

![Database Design](diagrams/database-design.png)

### Tables

| Table | Primary Key | Foreign Keys (on delete) | Unique | Notable columns / constraints |
|---|---|---|---|---|
| `roles` | `id` | — | `role_name` | Seeded: Admin, Project Manager, Collaborator |
| `users` | `id` | `role_id → roles.id` | `email` | `password_hash` (bcrypt), `is_first_login`, `is_active` |
| `password_resets` | `id` | `user_id → users.id` (CASCADE) | — | `reset_token`, `expires_at`, `used` |
| `projects` | `id` | `created_by → users.id` | — | `status` default `Active` |
| `project_members` | `id` | `project_id` (CASCADE), `user_id` (CASCADE) | `(project_id, user_id)` | join table |
| `tasks` | `id` | `project_id` (CASCADE), `created_by → users.id` | — | **CHECK** `priority ∈ {Low,Medium,High}`, **CHECK** `status ∈ {To Do,In Progress,Completed}` |
| `task_assignments` | `id` | `task_id` (CASCADE), `user_id` (CASCADE) | `(task_id, user_id)` | join table (multi-assignee) |
| `comments` | `id` | `task_id` (CASCADE), `user_id → users.id` | — | `comment_text` |
| `attachments` | `id` | `task_id` (CASCADE), `uploaded_by → users.id` | — | `file_data` (bytea), `file_mime`, `file_size` |
| `notifications` | `id` | `user_id` (CASCADE), `task_id` (SET NULL), `project_id` (SET NULL) | — | `type`, `is_read` |

### Integrity & performance

- **CHECK constraints** — `tasks.priority` and `tasks.status` are validated at the DB level (`20260626120000_task_enum_checks.sql`), rejecting bad values even on a direct write.
- **Cascade deletes** — removing a task/project cleans up its assignments, comments, and attachments; notifications keep their history via `SET NULL`.
- **Indexes** — every FK is indexed, plus composite indexes for hot paths: `idx_tasks_project_status`, `idx_notif_user_unread`, `idx_projects_dates`.
- **Migrations** — versioned under [`supabase/migrations/`](../supabase/migrations) and applied in CI ([`.github/workflows/supabase-deploy.yml`](../.github/workflows/supabase-deploy.yml)).

---

## 4. Deployment Diagram

Cloud topology. The frontend is a static Render site that **rewrites** `/api/*` and
`/socket.io/*` to the Render backend container, so the browser talks to a single
origin (clean CORS, real-time over WSS). Backend runs as a Docker container; data
lives in Supabase Postgres; transactional email goes through Resend.

**Authored deployment diagram** (UML deployment view):

![Deployment Diagram](diagrams/deployment-diagram.png)

A text-based (Mermaid) version:

```mermaid
flowchart TB
    subgraph Client
        B["User Browser<br/>React SPA (Vite)"]
    end

    subgraph Render["Render Cloud"]
        FE["Static Site<br/>taskora.vendra.best<br/>(serves built dist/)"]
        BE["Docker Web Service<br/>task-management-system-backend<br/>Express + Socket.IO<br/>:onrender.com"]
    end

    subgraph Supabase["Supabase"]
        PG[("PostgreSQL<br/>session pooler<br/>ap-southeast-1")]
    end

    EMAIL["Resend<br/>(transactional email)"]
    GH["GitHub Actions CI/CD<br/>build + migrate"]

    B -->|HTTPS| FE
    FE -->|"rewrite /api/*"| BE
    FE -->|"rewrite /socket.io/* (WSS)"| BE
    BE -->|"SQL over TLS"| PG
    BE -->|"temp passwords, resets"| EMAIL
    GH -->|"deploy image"| BE
    GH -->|"apply migrations"| PG

    B -. "mirror: Vercel / Netlify" .-> FE
```

**Production configuration**

- **HTTPS/WSS everywhere** — TLS terminated at Render; Socket.IO upgrades to secure WebSocket.
- **CORS** — backend `CLIENT_ORIGIN` allow-lists the production domains (`render.yaml`).
- **Secrets via env** — `DATABASE_URL`, `RESEND_API_KEY`, JWT secret set in the Render dashboard, never committed.
- **Cold start** — Render free tier idles; the first request after inactivity takes ~30–60 s (warm the URL before demoing).
- **Mirrors** — `frontend/vercel.json` and `netlify.toml` provide equivalent rewrites for the Vercel/Netlify deployments.
