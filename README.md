# Taskora — INTE 21323

A full-stack task management app (**Taskora**) built for INTE 21323 Group Assignment. Similar to Trello/Jira — teams can create, assign, track, and collaborate on tasks in real time.

## Live Demo

| Service | URL |
|---------|-----|
| Frontend | https://taskora.vendra.best |
| Backend API | https://task-management-system-backend-z9y4.onrender.com |
| Swagger Docs | https://task-management-system-backend-z9y4.onrender.com/api-docs |

> Frontend is also reachable at the Vercel default domain: https://task-management-system-pi-five.vercel.app

---

## Features

- User registration, login, and JWT-based authentication
- Role-Based Access Control (Admin, Project Manager, Collaborator) with object-level authorization
- Create, assign, and manage tasks with priorities and deadlines
- Track task progress: To Do → In Progress → Completed
- Real-time notifications using Socket.IO (WebSockets)
- Deadline reminder notifications via a scheduled job
- Secure API: bcrypt password hashing, Helmet security headers, and rate limiting
- SQL injection prevention using parameterized queries
- Swagger/OpenAPI documentation for the REST endpoints
- Fully Dockerized with docker-compose
- CI/CD pipeline using GitHub Actions

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | React + Vite |
| Backend | Node.js + Express |
| Database | PostgreSQL (hosted on Supabase) |
| ORM / Migrations | Prisma (schema + migrations) |
| Real-Time | Socket.IO |
| Authentication | JWT + bcrypt |
| Email | Resend |
| Containerization | Docker + docker-compose |
| CI/CD | GitHub Actions |
| Deployment | Render (backend), Vercel (frontend), Supabase (database) |
| API Docs | Swagger / OpenAPI |

---

## Getting Started (Local Setup)

### Prerequisites
- Node.js v20+
- PostgreSQL 16 (local) **or** a Supabase project
- Docker (optional but recommended)

### Option 1 — Run with Docker (Recommended)

```bash
git clone https://github.com/jayathilakasewmini440-beep/[repo-name].git
cd [repo-name]
docker compose up --build
```

The compose stack ships a bundled PostgreSQL service and sensible defaults, so it
runs without any manual configuration. To override secrets (e.g. a real
`RESEND_API_KEY` or a production `JWT_SECRET`), create an optional `backend/.env`
(copy from `backend/.env.example`) — it is loaded if present.

- Frontend: http://localhost:5173
- Backend: http://localhost:5000
- Swagger: http://localhost:5000/api-docs

### Option 2 — Run Manually

**Database** — the schema lives in Prisma + SQL migrations (`supabase/migrations/`), not a `database/` folder.

```bash
cd backend
cp .env.example .env
# Edit .env with your PostgreSQL/Supabase credentials (DB_HOST, DB_USER, ...)

# Apply the schema and seed demo data into your database:
npm run db:setup        # = prisma db push && prisma db seed
```

For a Supabase project, the SQL migrations under `supabase/migrations/` are applied
via the Supabase CLI / the `supabase-deploy` GitHub Action.

**Backend**
```bash
cd backend
npm install
npm run dev
```
> `JWT_SECRET` is **required** — the server refuses to start without it.

**Frontend**
```bash
cd frontend
cp .env.example .env
# Set VITE_API_BASE=http://localhost:5000/api
npm install
npm run dev
```

---

## Environment Variables

Create `backend/.env` based on `backend/.env.example`:

```
# PostgreSQL (split vars recommended; avoids @ in password breaking a URL)
DB_HOST=localhost
DB_PORT=5432
DB_USER=postgres
DB_PASSWORD=postgres
DB_NAME=tms_db
DB_SSL=false
# Alternatively a single connection string:
# DATABASE_URL=postgresql://user:password@host:5432/postgres

JWT_SECRET=your_secret_key_here   # required — server exits if unset
PORT=5000
CLIENT_ORIGIN=http://localhost:5173
# Email (Resend) — optional locally
RESEND_API_KEY=
EMAIL_FROM=Taskora <noreply@example.com>
```

---

## API Documentation

REST endpoints are documented with Swagger (JSDoc `@swagger` annotations).

- Local: http://localhost:5000/api-docs
- Live: https://task-management-system-backend-z9y4.onrender.com/api-docs

### Key Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/auth/login` | Login and receive JWT (rate-limited) |
| POST | `/api/auth/forgot-password` | Request a temporary password by email/name |
| POST | `/api/auth/reset-password` | Reset password (first login) |
| GET | `/api/tasks` | Get tasks (scoped by role) |
| POST | `/api/tasks` | Create a task (Admin/PM) |
| PUT | `/api/tasks/:id` | Update a task (Collaborators: status only) |
| DELETE | `/api/tasks/:id` | Delete a task (Admin/PM) |
| GET | `/api/comments/:task_id` | Comments for a task (object-level authz) |
| GET | `/api/attachments/:task_id` | Attachments for a task (object-level authz) |
| GET | `/api/notifications` | Get user notifications |
| PATCH | `/api/notifications/:id/read` | Mark a notification as read |
| GET | `/api/users` | List all users (Admin only) |

---

## Folder Structure

```
task-management-system/
├── .github/
│   └── workflows/              # GitHub Actions CI/CD + supabase deploy
├── backend/
│   ├── config/                 # DB (pg) + Swagger config
│   ├── controllers/            # Request handlers / business logic
│   ├── middleware/             # Auth, role checks, rate limiters, upload, reset gate
│   ├── models/                 # Data access (parameterized SQL)
│   ├── routes/                 # API routes (+ @swagger docs)
│   ├── services/               # Socket.IO + notification services
│   ├── utils/                  # errors, sanitize, temp-password, email
│   ├── prisma/                 # Prisma schema + seed
│   ├── server.js               # Main entry point
│   └── Dockerfile
├── frontend/
│   ├── src/
│   │   ├── App.jsx             # Main React component
│   │   └── api.js              # API helper
│   ├── nginx.conf              # Production nginx config
│   └── Dockerfile
├── supabase/
│   └── migrations/             # SQL schema + migrations (source of truth for DDL)
├── docker-compose.yml
└── README.md
```

---

## Git Workflow

This project follows a feature-branch workflow:

- `main` — production-ready code only
- `feature/auth` — Authentication & User Management
- `feature/tasks` — Task Management API
- `feature/frontend` — Frontend UI
- `feature/database` — Database Design & Security
- `feature/deployment` — Real-Time & DevOps

---

## Team Contributions

| Member | Branch | Contribution |
|--------|--------|-------------|
| Andrina Fernando | feature/auth | Authentication APIs (register/login), JWT issuance, bcrypt password hashing, RBAC middleware, and user welcome emails |
| Sewmini Jayathilaka | feature/tasks | Task, Comments, Attachments & Projects CRUD APIs; role/permission middleware, validation & sorting, structured error responses, Swagger/OpenAPI docs; repo owner & branch integration |
| Osanda Senevirathna | feature/frontend | Frontend UI/UX & Taskora design system (dashboard, kanban board, tables, role-based views, theming); plus backend security hardening — rate limiting, object-level authorization, CSPRNG temp passwords, input/rich-text sanitization, real-time assignment notifications |
| Yasith Mavinda | feature/database | Initial PostgreSQL database schema and seed data |
| Thaveesha Weerasinghe | feature/deployment | DevOps & deployment — Docker, GitHub Actions CI/CD, Render/Vercel/Supabase; MySQL→PostgreSQL migration with Prisma; Resend email & forgot-password flow; plus React frontend (account page, attachments, drag-and-drop) and real-time features |

---

## Security

- Passwords hashed with bcrypt (never stored as plain text)
- JWT tokens for stateless sessions; `is_active` + role re-checked from the DB on every request
- Object-level authorization on tasks, comments, attachments, and projects
- Helmet HTTP security headers
- Rate limiting: 300 requests / 15 min globally, with a stricter limiter on login
- Parameterized SQL queries (no SQL injection)
- File-upload MIME/extension allowlist; downloads served as `application/octet-stream` with `nosniff`
- Input validation and rich-text sanitization on the backend (in addition to the frontend)
- Cryptographically-secure temporary passwords (`crypto.randomInt`)
- HTTPS enforced in production (Render provides SSL)
- CORS allowlist (ad-hoc localhost permitted only outside production)
- Follows OWASP Top 10 recommendations
```
