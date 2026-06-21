# Task Management System — INTE 21323

A full-stack Task Management System (TMS) built for INTE 21323 Group Assignment. Similar to Trello/Jira — teams can create, assign, track, and collaborate on tasks in real time.

## Live Demo

| Service | URL |
|---------|-----|
| Frontend | _Add Vercel URL here after deployment_ |
| Backend API | _Add Render URL here after deployment_ |
| Swagger Docs | _Add Render URL here_ + `/api-docs` |

---

## Features

- User registration, login, and JWT-based authentication
- Role-Based Access Control (Admin, Project Manager, Collaborator)
- Create, assign, and manage tasks with priorities and deadlines
- Track task progress: To Do → In Progress → Completed
- Real-time notifications using Socket.IO (WebSockets)
- Deadline reminder notifications via scheduled cron jobs
- Secure API with bcrypt password hashing, Helmet, and rate limiting
- SQL injection prevention using parameterized queries
- Swagger/OpenAPI documentation for all REST endpoints
- Fully Dockerized with docker-compose
- CI/CD pipeline using GitHub Actions

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | React + Vite |
| Backend | Node.js + Express |
| Database | MySQL 8 |
| Real-Time | Socket.IO |
| Authentication | JWT + bcrypt |
| Containerization | Docker + docker-compose |
| CI/CD | GitHub Actions |
| Deployment | Render (backend), Vercel (frontend) |
| API Docs | Swagger / OpenAPI |

---

## Getting Started (Local Setup)

### Prerequisites
- Node.js v20+
- MySQL 8
- Docker (optional but recommended)

### Option 1 — Run with Docker (Recommended)

```bash
git clone https://github.com/jayathilakasewmini440-beep/[repo-name].git
cd [repo-name]
cp backend/.env.example backend/.env
docker compose up --build
```

- Frontend: http://localhost:5173
- Backend: http://localhost:5000
- Swagger: http://localhost:5000/api-docs

### Option 2 — Run Manually

**Database**
```bash
# Run in MySQL:
source database/schema.sql
source database/seed_data.sql
```

**Backend**
```bash
cd backend
cp .env.example .env
# Edit .env with your MySQL credentials
npm install
npm run dev
```

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

Create `backend/.env` based on `.env.example`:

```
DB_HOST=localhost
DB_USER=root
DB_PASSWORD=root
DB_NAME=tms_db
JWT_SECRET=your_secret_key_here
PORT=5000
CLIENT_ORIGIN=http://localhost:5173
```

---

## API Documentation

All REST endpoints are documented with Swagger.

- Local: http://localhost:5000/api-docs
- Live: _Add Render URL_ + `/api-docs`

### Key Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/auth/login` | Login and receive JWT |
| POST | `/api/auth/reset-password` | Reset password |
| GET | `/api/tasks` | Get all tasks |
| POST | `/api/tasks` | Create a task |
| PUT | `/api/tasks/:id` | Update task status |
| DELETE | `/api/tasks/:id` | Delete a task |
| GET | `/api/notifications` | Get user notifications |
| PATCH | `/api/notifications/:id/read` | Mark notification as read |
| GET | `/api/users` | List all users (Admin only) |

---

## Folder Structure

```
task-management-system/
├── .github/
│   └── workflows/
│       └── ci.yml              # GitHub Actions CI/CD
├── backend/
│   ├── config/                 # DB + Swagger config
│   ├── controllers/            # Business logic
│   ├── middleware/             # Auth + role checks
│   ├── models/                 # Data models
│   ├── routes/                 # API routes
│   ├── server.js               # Main entry point
│   └── Dockerfile
├── frontend/
│   ├── src/
│   │   ├── App.jsx             # Main React component
│   │   └── api.js              # API helper
│   ├── nginx.conf              # Production nginx config
│   └── Dockerfile
├── database/
│   ├── schema.sql              # Table definitions
│   └── seed_data.sql           # Sample data
├── docker-compose.yml
└── README.md
```

---

## Git Workflow

This project follows feature-branch workflow:

- `main` — production-ready code only
- `feature/auth` — Person 1: Authentication & User Management
- `feature/tasks` — Person 2: Task Management API
- `feature/frontend` — Person 3: Frontend UI
- `feature/database` — Person 4: Database Design & Security
- `feature/deployment` — Person 5: Real-Time & DevOps

---

## Team Contributions

| Member | Branch | Contribution |
|--------|--------|-------------|
| [Person 1 Name] | feature/auth | Authentication APIs, JWT, bcrypt, RBAC, User Management |
| [Person 2 Name] | feature/tasks | Task CRUD APIs, Comments, Attachments, Swagger docs |
| [Person 3 Name] | feature/frontend | React UI, Kanban board, Login, role-based views |
| [Person 4 Name] | feature/database | Database schema, ER diagram, Security, OWASP compliance |
| [Your Name] | feature/deployment | Socket.IO real-time notifications, deadline cron job, Docker, GitHub Actions CI/CD, Render + Vercel deployment, README |

---

## Security

- Passwords hashed with bcrypt (never stored as plain text)
- JWT tokens for stateless session management
- Helmet.js HTTP security headers
- Rate limiting (300 requests per 15 minutes)
- Parameterized SQL queries (no SQL injection)
- Input validation and sanitization on frontend and backend
- HTTPS enforced in production (Render provides SSL)
- CORS configured for production domain only
- Follows OWASP Top 10 recommendations
