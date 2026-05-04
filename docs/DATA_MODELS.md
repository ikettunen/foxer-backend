# Foxer Backend — Data Models

## Entity Relationship Overview

```
users ──────────────────────────────────────────────────┐
  │                                                      │
  ├──< refresh_tokens                                    │
  ├──< password_resets                                   │
  ├──< enrollments >──── courses ──< course_days ──< lessons ──< lesson_sections
  ├──< progress ────────────────────────────────────────────────< quizzes ──< quiz_questions
  ├──< user_actions
  └──< location_sessions ──< location_points

products >── manufacturers (by name, not FK)
```

---

## Tables

### `users`
| Column | Type | Notes |
|---|---|---|
| id | INT PK | Auto increment |
| name | VARCHAR(100) | Display name |
| email | VARCHAR(150) UNIQUE | Login identifier |
| password_hash | VARCHAR(255) | bcrypt hash |
| role | ENUM | `student` \| `admin` |
| phone | VARCHAR(30) | Optional, for contact |
| locale | ENUM | `fi` \| `en` |
| active | BOOLEAN | Soft delete |
| last_login | TIMESTAMP | Updated on login |

### `refresh_tokens`
| Column | Type | Notes |
|---|---|---|
| token_hash | VARCHAR(255) UNIQUE | SHA-256 of actual token |
| expires_at | TIMESTAMP | 30d from issue |
| revoked | BOOLEAN | True after use (rotation) |

### `courses`
| Column | Type | Notes |
|---|---|---|
| id | VARCHAR(20) PK | e.g. `pp1`, `pp2`, `pp2mo` |
| title | VARCHAR(200) | Finnish title |
| title_en | VARCHAR(200) | English title |
| days | INT | Number of on-site days |
| hours_per_day | INT | e.g. 8 |
| published | BOOLEAN | Only published courses visible to students |
| image_url | VARCHAR(500) | Course hero image |

### `course_days`
| Column | Type | Notes |
|---|---|---|
| course_id | FK → courses | |
| day_number | INT | 1, 2, 3... |
| unlocked_after_day | INT | 0 = always unlocked, 1 = unlocked after day 1 complete |

**Note:** `(course_id, day_number)` unique — enforces no duplicate days per course.

### `lessons`
One lesson per course day (the pre-reading module).

| Column | Type | Notes |
|---|---|---|
| id | VARCHAR(50) PK | e.g. `pp1-day1-reading` |
| course_day_id | FK → course_days | |
| estimated_read_minutes | INT | Shown to student |

### `lesson_sections`
Individual content blocks within a lesson.

| Column | Type | Notes |
|---|---|---|
| heading | VARCHAR(200) | Section title |
| body | TEXT | Markdown content |
| safety_flag | BOOLEAN | ⚠️ Requires instructor review before publish |
| sort_order | INT | Display order |

### `quizzes` + `quiz_questions`
| Column | Type | Notes |
|---|---|---|
| options_json | JSON | `{"a":"...","b":"...","c":"..."}` |
| answer | VARCHAR(5) | Correct option key, e.g. `"b"` |
| explanation | TEXT | Shown after submit |

### `enrollments`
| Column | Type | Notes |
|---|---|---|
| course_dates | VARCHAR(100) | Human-readable, e.g. `"14–16.6.2026"` |
| email_sent | BOOLEAN | Triggers welcome email on insert |
| unenrolled_at | TIMESTAMP NULL | NULL = active enrollment |

**Unique constraint:** `(user_id, course_id)` — one active enrollment per course.

### `progress`
Tracks per-user, per-day reading + quiz completion.

| Column | Type | Notes |
|---|---|---|
| reading_done | BOOLEAN | Set by POST /progress/reading |
| quiz_passed | BOOLEAN | Set by POST /quizzes/:id/submit when score ≥ pass threshold |
| quiz_score | INT | Raw score (correct answers) |
| completed_at | TIMESTAMP | Set when both reading_done + quiz_passed |

**Progress %** = `(days with completed_at) / total_days * 100`

### `user_actions`
Lightweight analytics event log.

| Column | Type | Notes |
|---|---|---|
| action_type | ENUM | 11 types — see Architecture doc |
| course_id | VARCHAR(20) | Optional context |
| metadata_json | JSON | Extra data per action type |

Example metadata:
```json
// quiz_completed
{ "score": 3, "total": 5, "passed": true, "duration_seconds": 142 }

// checkin_site
{ "site": "Kellokoski", "lat": 60.5234, "lng": 25.1234 }
```

### `location_sessions`
Groups GPS points into a named session (flight, practice, ground handling).

| Column | Type | Notes |
|---|---|---|
| session_type | ENUM | `flight` \| `practice` \| `ground` |
| ended_at | TIMESTAMP NULL | NULL = session still active |
| site_name | VARCHAR(100) | e.g. "Kellokoski" |

### `location_points`
High-frequency GPS data. Uses BIGINT for id (could be millions of rows).

| Column | Type | Notes |
|---|---|---|
| lat / lng | DECIMAL(10,7) | ~1cm precision |
| altitude | DECIMAL(8,2) | Metres above sea level |
| accuracy | DECIMAL(6,2) | GPS accuracy in metres |
| speed | DECIMAL(6,2) | m/s |
| heading | DECIMAL(5,2) | 0–360 degrees |
| recorded_at | TIMESTAMP(3) | Millisecond precision |

**Index strategy:** `(session_id)` + `(recorded_at)` for time-range queries.
**Retention:** Consider archiving / summarising old location data after 90 days.

### `products`
Synced from `tuotteet.csv` (185 products). Manufacturer is a VARCHAR (denormalised) for simplicity — references `manufacturers.name`.

### `manufacturers`
Written by @cath. One row per brand (PHI, Advance, BGD, etc.).

---

## Indexing Strategy

| Table | Index | Reason |
|---|---|---|
| users | email | Login lookup |
| users | role | Admin list filter |
| refresh_tokens | token_hash | Token verification |
| user_actions | user_id, action_type, created_at | Analytics queries |
| location_points | session_id, recorded_at | Trail queries |
| progress | user_id, course_id | Progress summary |
| products | category+subcategory | Shop filtering |
| products | manufacturer | Manufacturer filter |

---

## Design Decisions

1. **Course ID as string** (`pp1`, `pp2`) not INT — more readable in URLs and logs, stable
2. **Soft deletes** on users (active=0) and products (active=0) — never hard delete
3. **location_points uses BIGINT** — high-frequency data, INT would overflow at scale
4. **refresh_tokens stores hash** — never store raw tokens, always SHA-256 hash
5. **options_json as JSON** — quiz options vary in count, JSON avoids option_a/b/c/d columns
6. **progress UNIQUE on (user_id, course_id, day_number)** — INSERT ... ON DUPLICATE KEY UPDATE pattern for idempotent progress updates
7. **No soft deletes on enrollments** — use `unenrolled_at` timestamp instead for audit trail
