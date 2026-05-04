# Foxer Backend — API Design

## Base URL
- Dev: `http://localhost:3001/api`
- Prod: `https://api.foxerparagliding.fi/api` (TBD)

## Auth
All protected routes require:
```
Authorization: Bearer <jwt_token>
```
Two roles: `student` (read + own progress) and `admin` (full CRUD).

---

## Auth `/api/auth`

| Method | Path | Role | Description |
|---|---|---|---|
| POST | `/auth/login` | public | Email + password → JWT |
| POST | `/auth/register` | public | New student account |
| POST | `/auth/refresh` | student | Refresh JWT token |
| POST | `/auth/logout` | student | Invalidate token |

### POST /auth/login
```json
// Request
{ "email": "student@example.com", "password": "..." }

// Response
{
  "token": "eyJ...",
  "refreshToken": "eyJ...",
  "user": { "id": 1, "name": "Mikael", "email": "...", "role": "student" }
}
```

---

## Courses `/api/courses`

| Method | Path | Role | Description |
|---|---|---|---|
| GET | `/courses` | student | List all published courses |
| GET | `/courses/:id` | student | Course detail + days |
| POST | `/courses` | admin | Create course |
| PUT | `/courses/:id` | admin | Update course |
| DELETE | `/courses/:id` | admin | Delete course |
| GET | `/courses/:id/days` | student | List days for course |
| POST | `/courses/:id/days` | admin | Add day to course |
| PUT | `/courses/:id/days/:dayNum` | admin | Update day |

### GET /courses/:id
```json
{
  "id": "pp1",
  "title": "PP1 — Varjoliitokurssi",
  "description": "...",
  "days": 3,
  "hoursPerDay": 8,
  "published": true,
  "locale": "fi"
}
```

---

## Lessons `/api/lessons`

| Method | Path | Role | Description |
|---|---|---|---|
| GET | `/lessons/:id` | student | Full lesson with sections |
| PUT | `/lessons/:id` | admin | Update lesson content |
| POST | `/lessons/:id/sections` | admin | Add section |
| PUT | `/lessons/:id/sections/:sectionId` | admin | Edit section |
| DELETE | `/lessons/:id/sections/:sectionId` | admin | Remove section |

---

## Quizzes `/api/quizzes`

| Method | Path | Role | Description |
|---|---|---|---|
| GET | `/quizzes/:dayId` | student | Quiz questions for a day |
| POST | `/quizzes/:dayId/submit` | student | Submit answers → score |
| GET | `/quizzes/:dayId/results/:userId` | student | Own quiz result |
| POST | `/quizzes` | admin | Create quiz |
| PUT | `/quizzes/:id` | admin | Update quiz |

### POST /quizzes/:dayId/submit
```json
// Request
{ "answers": { "q1": "b", "q2": "a", "q3": "c" } }

// Response
{ "score": 2, "total": 3, "passed": true, "correctAnswers": { "q1": "b", "q3": "a" } }
```

---

## Progress `/api/progress`

| Method | Path | Role | Description |
|---|---|---|---|
| GET | `/progress` | student | Own full progress |
| GET | `/progress/:userId` | admin | Any user's progress |
| POST | `/progress/reading` | student | Mark reading complete |
| POST | `/progress/day` | student | Mark day complete |
| GET | `/progress/course/:courseId` | student | Progress % for a course |

### GET /progress
```json
{
  "userId": 1,
  "courses": [
    {
      "courseId": "pp1",
      "progressPct": 67,
      "days": [
        { "day": 1, "readingDone": true, "quizPassed": true, "completedAt": "2026-03-15" },
        { "day": 2, "readingDone": true, "quizPassed": false, "completedAt": null },
        { "day": 3, "readingDone": false, "quizPassed": false, "completedAt": null }
      ]
    }
  ]
}
```

---

## Users `/api/users`

| Method | Path | Role | Description |
|---|---|---|---|
| GET | `/users` | admin | List all users (paginated) |
| GET | `/users/:id` | admin | User detail + progress |
| PUT | `/users/:id` | admin | Update user |
| DELETE | `/users/:id` | admin | Deactivate user |
| GET | `/users/me` | student | Own profile |
| PUT | `/users/me` | student | Update own profile |

---

## Enrollments `/api/enrollments`

| Method | Path | Role | Description |
|---|---|---|---|
| POST | `/enrollments` | student/admin | Enroll user in course |
| GET | `/enrollments` | admin | All enrollments |
| GET | `/enrollments/:userId` | student | Own enrollments |
| DELETE | `/enrollments/:id` | admin | Unenroll |

### POST /enrollments
Enrolling a student triggers the welcome email (template: `email_enrollment.html`).
```json
// Request
{ "userId": 1, "courseId": "pp1", "courseDates": "14–16.6.2026" }

// Response
{ "id": 42, "userId": 1, "courseId": "pp1", "enrolledAt": "2026-05-04", "emailSent": true }
```

---

## Products `/api/products`

| Method | Path | Role | Description |
|---|---|---|---|
| GET | `/products` | public | List products (filter by category) |
| GET | `/products/:id` | public | Product detail |
| POST | `/products` | admin | Create product |
| PUT | `/products/:id` | admin | Update product |
| DELETE | `/products/:id` | admin | Delete product |
| GET | `/products/categories` | public | List categories |

---

## Error Format
```json
{
  "error": {
    "code": "UNAUTHORIZED",
    "message": "Invalid or expired token"
  }
}
```

## HTTP Status Codes
- `200` OK
- `201` Created
- `400` Bad Request (validation)
- `401` Unauthorized
- `403` Forbidden (wrong role)
- `404` Not Found
- `500` Internal Server Error
