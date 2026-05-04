# Foxer Backend — Architecture

## Overview

**Modular monolith** — a single deployable Node.js/Express process, internally divided into service modules. Each module owns its routes, controller, and service layer. Clean enough to split into microservices later if needed, simple enough to run on a single VPS now.

```
Client (fApp / foxer-web)
         │
         ▼
   [ API Gateway ]         ← CORS, rate limiting, helmet, morgan
         │
   [ Auth Middleware ]     ← JWT verify on protected routes
         │
   [ Role Middleware ]     ← requireRole('admin') on admin routes
         │
    ┌────┴────────────────────────────────────────┐
    │              Service Modules                 │
    │  auth │ users │ tracking │ courses │ lessons  │
    │  quizzes │ progress │ enrollments │ products  │
    └────┬────────────────────────────────────────┘
         │
   [ MySQL Connection Pool ]
         │
   [ MySQL Database ]
```

---

## Folder Structure

```
foxer-backend/
├── src/
│   ├── index.ts              # Entry — starts server
│   ├── app.ts                # Express app — middleware + routes
│   ├── config/
│   │   └── db.ts             # MySQL pool
│   ├── middleware/
│   │   ├── auth.ts           # JWT verification
│   │   ├── role.ts           # requireRole()
│   │   ├── validate.ts       # Zod request validation
│   │   └── errorHandler.ts   # Global error handler
│   ├── services/
│   │   ├── auth/             # Login, register, refresh, reset
│   │   ├── users/            # User CRUD + /me
│   │   ├── tracking/         # User actions + GPS location
│   │   ├── courses/          # Course + days CRUD
│   │   ├── lessons/          # Lesson content + sections
│   │   ├── quizzes/          # Quiz questions + submit
│   │   ├── progress/         # Progress tracking
│   │   ├── enrollments/      # Enrollment + email trigger
│   │   ├── products/         # Product catalog
│   │   └── notifications/    # Email (nodemailer) — internal only
│   └── types/
│       └── index.ts          # Shared TypeScript interfaces
├── db/
│   ├── schema.sql            # MySQL schema
│   └── seed.sql              # Dev seed data
├── templates/
│   └── enrollment.html       # Welcome email template
├── docs/
│   ├── openapi.yaml          # OpenAPI 3.0 spec
│   ├── ARCHITECTURE.md       # This file
│   └── DATA_MODELS.md        # Data model reference
└── .env.example
```

---

## Request Lifecycle

```
POST /api/auth/login
  → app.ts: authLimiter → express.json() → authRoutes
  → auth.routes.ts: router.post('/login', controller.login)
  → auth.controller.ts: validate body → call service
  → auth.service.ts: query DB, bcrypt compare, sign JWT
  → response: { token, refreshToken, user }
```

```
GET /api/courses (protected)
  → app.ts: limiter → coursesRoutes
  → middleware/auth.ts: verify Bearer JWT → attach req.user
  → courses.routes.ts: router.get('/', controller.listCourses)
  → courses.controller.ts: call service
  → courses.service.ts: pool.query('SELECT ...')
  → response: Course[]
```

---

## Auth Flow

```
Register:
  POST /api/auth/register
  → validate email+password+name
  → check email unique
  → bcrypt.hash(password, 12)
  → INSERT users
  → sign JWT (15min) + refresh token (30d)
  → store hashed refresh token in refresh_tokens
  → return { token, refreshToken, user }

Login:
  POST /api/auth/login
  → find user by email
  → bcrypt.compare(password, hash)
  → sign JWT + refresh token
  → return { token, refreshToken, user }

Refresh:
  POST /api/auth/refresh
  → find refresh_token by hash
  → check not revoked + not expired
  → sign new JWT
  → rotate refresh token (revoke old, issue new)

Protected route:
  Authorization: Bearer <jwt>
  → middleware/auth.ts: jwt.verify(token, JWT_SECRET)
  → attach req.user = { id, role }
  → next()
```

---

## Location Tracking Design

Used for **student safety** during paragliding practice and **instructor oversight**.

```
Student opens app → POST /tracking/location/session/start
  → creates location_sessions row (type: 'flight' | 'practice')

Every 5-10 seconds → POST /tracking/location
  → inserts location_points (lat, lng, alt, accuracy, speed, heading)

Student ends session → POST /tracking/location/session/end
  → updates location_sessions.ended_at

Instructor dashboard → GET /tracking/location/live
  → returns latest point per active session (ended_at IS NULL)
  → used to confirm all students are safe on the ground
```

**Privacy:** Location data is only accessible to the student themselves and admins. Never exposed publicly.

---

## Error Handling

All errors flow through `middleware/errorHandler.ts`:

```json
// Validation error (400)
{ "error": "Validation Error", "details": [{ "field": "email", "message": "Invalid email" }] }

// Auth error (401)
{ "error": "Unauthorized", "message": "Invalid or expired token" }

// Forbidden (403)
{ "error": "Forbidden", "message": "Admin access required" }

// Not found (404)
{ "error": "Not Found", "message": "Course not found" }

// Server error (500)
{ "error": "Internal Server Error", "message": "Something went wrong" }
```

---

## Clients

| Client | Origin | Auth | Access |
|---|---|---|---|
| foxer-web (React admin) | GH Pages | admin JWT | Full CRUD |
| fApp (Flutter mobile) | Native app | student JWT | Read + own progress + tracking |

CORS allows both origins. Mobile app sends no `Origin` header — allowed through.

---

## Database

- **MySQL 8.0** (already running locally on dell-ubuntu)
- Connection pool via `mysql2/promise`
- All queries use parameterised statements (no string interpolation)
- Timestamps: UTC, returned as ISO strings

---

## Environment Variables

See `.env.example` for full list. Key vars:
- `JWT_SECRET` — long random string
- `JWT_EXPIRES_IN` — `15m` recommended
- `JWT_REFRESH_EXPIRES_IN` — `30d`
- `DB_HOST`, `DB_NAME`, `DB_USER`, `DB_PASS`
- `SMTP_*` — email config
- `CORS_ORIGIN` — additional allowed origin
