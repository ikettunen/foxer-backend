// ============================================================
// Foxer Backend — Shared TypeScript Types
// ============================================================

// ------- Enums -------

export type UserRole = 'student' | 'admin'
export type UserLocale = 'fi' | 'en'

export type ActionType =
  | 'lesson_opened'
  | 'lesson_completed'
  | 'quiz_started'
  | 'quiz_completed'
  | 'day_completed'
  | 'course_enrolled'
  | 'course_completed'
  | 'checkin_site'
  | 'checkout_site'
  | 'app_opened'
  | 'app_backgrounded'

export type SessionType = 'flight' | 'practice' | 'ground'

// ------- Core Entities -------

export interface User {
  id: number
  name: string
  email: string
  password_hash: string
  role: UserRole
  phone?: string | null
  locale: UserLocale
  active: boolean
  last_login?: Date | null
  created_at: Date
  updated_at: Date
}

export interface PublicUser {
  id: number
  name: string
  email: string
  role: UserRole
  phone?: string | null
  locale: UserLocale
  active: boolean
  last_login?: Date | null
  created_at: Date
  updated_at: Date
}

export interface RefreshToken {
  id: number
  user_id: number
  token_hash: string
  expires_at: Date
  revoked: boolean
  created_at: Date
}

export interface PasswordReset {
  id: number
  user_id: number
  token_hash: string
  expires_at: Date
  used: boolean
  created_at: Date
}

// ------- Courses -------

export interface Course {
  id: string
  title: string
  title_en?: string | null
  description?: string | null
  description_en?: string | null
  days: number
  hours_per_day: number
  published: boolean
  locale: UserLocale
  image_url?: string | null
  created_at: Date
  updated_at: Date
}

export interface CourseDay {
  id: number
  course_id: string
  day_number: number
  title?: string | null
  title_en?: string | null
  description?: string | null
  description_en?: string | null
  unlocked_after_day?: number | null
}

export interface Lesson {
  id: string
  course_day_id: number
  title?: string | null
  title_en?: string | null
  estimated_read_minutes: number
  created_at: Date
  updated_at: Date
}

export interface LessonSection {
  id: number
  lesson_id: string
  heading?: string | null
  heading_en?: string | null
  body?: string | null
  body_en?: string | null
  safety_flag: boolean
  sort_order: number
}

export interface Quiz {
  id: number
  lesson_id: string
  title?: string | null
}

export interface QuizQuestion {
  id: number
  quiz_id: number
  question: string
  question_en?: string | null
  options_json: Record<string, string>   // {"a":"...","b":"...","c":"..."}
  answer: string
  explanation?: string | null
  sort_order: number
}

// ------- Enrollments & Progress -------

export interface Enrollment {
  id: number
  user_id: number
  course_id: string
  course_dates?: string | null
  enrolled_at: Date
  email_sent: boolean
  email_sent_at?: Date | null
  unenrolled_at?: Date | null
}

export interface Progress {
  id: number
  user_id: number
  course_id: string
  day_number: number
  reading_done: boolean
  reading_at?: Date | null
  quiz_passed: boolean
  quiz_score?: number | null
  quiz_at?: Date | null
  completed_at?: Date | null
}

// ------- Tracking -------

export interface UserAction {
  id: number
  user_id: number
  action_type: ActionType
  metadata_json?: Record<string, unknown> | null
  course_id?: string | null
  day_number?: number | null
  created_at: Date
}

export interface LocationSession {
  id: number
  user_id: number
  session_type: SessionType
  started_at: Date
  ended_at?: Date | null
  site_name?: string | null
  notes?: string | null
}

export interface LocationPoint {
  id: number
  session_id: number
  user_id: number
  lat: number
  lng: number
  altitude?: number | null
  accuracy?: number | null
  speed?: number | null
  heading?: number | null
  recorded_at: Date
}

// ------- Products -------

export interface Product {
  id: string
  name: string
  short_desc?: string | null
  category?: string | null
  subcategory?: string | null
  price?: number | null
  sale_price?: number | null
  manufacturer?: string | null
  difficulty?: string | null
  image_url?: string | null
  active: boolean
  created_at: Date
  updated_at: Date
}

export interface Manufacturer {
  id: number
  name: string
  tagline?: string | null
  intro_fi?: string | null
  intro_en?: string | null
  website?: string | null
  logo_url?: string | null
  updated_at: Date
}

// ------- Request / Response Types -------

// Auth
export interface RegisterRequest {
  name: string
  email: string
  password: string
  locale?: UserLocale
}

export interface LoginRequest {
  email: string
  password: string
}

export interface RefreshRequest {
  refreshToken: string
}

export interface ForgotPasswordRequest {
  email: string
}

export interface ResetPasswordRequest {
  token: string
  password: string
}

export interface AuthResponse {
  token: string
  refreshToken: string
  user: PublicUser
}

// Common
export interface PaginationQuery {
  page?: number
  limit?: number
}

export interface PaginatedResponse<T> {
  data: T[]
  total: number
  page: number
  limit: number
}

export interface ApiError {
  error: string
  message: string
  statusCode: number
}

// Tracking
export interface LogActionRequest {
  action_type: ActionType
  metadata?: Record<string, unknown>
  course_id?: string
  day_number?: number
}

export interface PostLocationRequest {
  session_id: number
  lat: number
  lng: number
  altitude?: number
  accuracy?: number
  speed?: number
  heading?: number
  recorded_at?: string
}

export interface StartSessionRequest {
  session_type: SessionType
  site_name?: string
}

export interface EndSessionRequest {
  session_id: number
  notes?: string
}

// Progress
export interface MarkReadingRequest {
  course_id: string
  day_number: number
}

export interface MarkDayRequest {
  course_id: string
  day_number: number
}

// Quiz submission
export interface QuizSubmitRequest {
  answers: Record<number, string>  // questionId -> option key
}

export interface QuizResult {
  score: number
  total: number
  passed: boolean
  answers: Array<{
    question_id: number
    correct: boolean
    correct_answer: string
  }>
}

// Enrollments
export interface EnrollRequest {
  user_id: number
  course_id: string
  course_dates?: string
}

// JWT Payload
export interface JwtPayload {
  userId: number
  role: UserRole
  email: string
  iat?: number
  exp?: number
}

// Express request extension
declare global {
  namespace Express {
    interface Request {
      user?: JwtPayload
    }
  }
}
