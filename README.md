# foxer-backend

REST API backend for the **Foxer Paragliding** platform — serves both the Flutter mobile app (`fApp`) and the React web admin (`foxer-web`).

## Stack

- **Node.js + Express** (TypeScript)
- **MySQL** (already running on this machine)
- **JWT** authentication
- **REST API** — JSON, OpenAI-compatible error format

## Architecture

```
foxer-backend/
├── src/
│   ├── routes/         # API route handlers
│   ├── controllers/    # Business logic
│   ├── models/         # DB models / queries
│   ├── middleware/     # Auth, validation, error handling
│   ├── services/       # Email, file upload, etc.
│   └── index.ts        # Entry point
├── db/
│   ├── schema.sql      # Database schema
│   └── seed.sql        # Sample data
├── docs/
│   └── API.md          # Full API reference
└── .env.example
```

## API Domains

| Domain | Prefix | Description |
|---|---|---|
| Auth | `/api/auth` | Login, register, JWT refresh |
| Courses | `/api/courses` | Course catalogue, days, sections |
| Lessons | `/api/lessons` | Reading content, sections |
| Quizzes | `/api/quizzes` | Questions, answers, scoring |
| Progress | `/api/progress` | User progress tracking |
| Users | `/api/users` | Admin user management |
| Enrollments | `/api/enrollments` | Course enrollment, email trigger |
| Products | `/api/products` | Shop product catalog |

## Clients

- **foxer-web** (React admin) — full CRUD, admin JWT
- **fApp** (Flutter) — read + progress, student JWT

## Quick Start

```bash
npm install
cp .env.example .env   # fill in DB creds + JWT secret
npm run db:migrate     # run schema.sql
npm run dev            # ts-node-dev, port 3001
```
