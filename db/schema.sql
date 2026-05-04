-- Foxer Backend — Database Schema v2
-- MySQL 8.0+

CREATE DATABASE IF NOT EXISTS foxer CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE foxer;

-- ─────────────────────────────────────────
-- AUTH & USERS
-- ─────────────────────────────────────────

CREATE TABLE users (
  id            INT AUTO_INCREMENT PRIMARY KEY,
  name          VARCHAR(100) NOT NULL,
  email         VARCHAR(150) NOT NULL UNIQUE,
  password_hash VARCHAR(255) NOT NULL,
  role          ENUM('student','admin') DEFAULT 'student',
  phone         VARCHAR(30),
  locale        ENUM('fi','en') DEFAULT 'fi',
  active        BOOLEAN DEFAULT TRUE,
  last_login    TIMESTAMP NULL,
  created_at    TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at    TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_email (email),
  INDEX idx_role (role)
);

CREATE TABLE refresh_tokens (
  id          INT AUTO_INCREMENT PRIMARY KEY,
  user_id     INT NOT NULL,
  token_hash  VARCHAR(255) NOT NULL UNIQUE,
  expires_at  TIMESTAMP NOT NULL,
  revoked     BOOLEAN DEFAULT FALSE,
  created_at  TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  INDEX idx_token (token_hash),
  INDEX idx_user (user_id)
);

CREATE TABLE password_resets (
  id          INT AUTO_INCREMENT PRIMARY KEY,
  user_id     INT NOT NULL,
  token_hash  VARCHAR(255) NOT NULL UNIQUE,
  expires_at  TIMESTAMP NOT NULL,
  used        BOOLEAN DEFAULT FALSE,
  created_at  TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- ─────────────────────────────────────────
-- COURSES
-- ─────────────────────────────────────────

CREATE TABLE courses (
  id              VARCHAR(20) PRIMARY KEY,
  title           VARCHAR(200) NOT NULL,
  title_en        VARCHAR(200),
  description     TEXT,
  description_en  TEXT,
  days            INT NOT NULL DEFAULT 3,
  hours_per_day   INT NOT NULL DEFAULT 8,
  published       BOOLEAN DEFAULT FALSE,
  locale          ENUM('fi','en') DEFAULT 'fi',
  image_url       VARCHAR(500),
  created_at      TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at      TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

CREATE TABLE course_days (
  id                  INT AUTO_INCREMENT PRIMARY KEY,
  course_id           VARCHAR(20) NOT NULL,
  day_number          INT NOT NULL,
  title               VARCHAR(200),
  title_en            VARCHAR(200),
  description         TEXT,
  description_en      TEXT,
  unlocked_after_day  INT DEFAULT 0,   -- 0 = always unlocked
  FOREIGN KEY (course_id) REFERENCES courses(id) ON DELETE CASCADE,
  UNIQUE KEY uq_course_day (course_id, day_number)
);

-- ─────────────────────────────────────────
-- LESSONS
-- ─────────────────────────────────────────

CREATE TABLE lessons (
  id                      VARCHAR(50) PRIMARY KEY,
  course_day_id           INT NOT NULL,
  title                   VARCHAR(200),
  title_en                VARCHAR(200),
  estimated_read_minutes  INT DEFAULT 20,
  created_at              TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at              TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (course_day_id) REFERENCES course_days(id) ON DELETE CASCADE
);

CREATE TABLE lesson_sections (
  id          INT AUTO_INCREMENT PRIMARY KEY,
  lesson_id   VARCHAR(50) NOT NULL,
  heading     VARCHAR(200),
  heading_en  VARCHAR(200),
  body        TEXT,
  body_en     TEXT,
  safety_flag BOOLEAN DEFAULT FALSE,
  sort_order  INT DEFAULT 0,
  FOREIGN KEY (lesson_id) REFERENCES lessons(id) ON DELETE CASCADE,
  INDEX idx_lesson (lesson_id)
);

-- ─────────────────────────────────────────
-- QUIZZES
-- ─────────────────────────────────────────

CREATE TABLE quizzes (
  id        INT AUTO_INCREMENT PRIMARY KEY,
  lesson_id VARCHAR(50) NOT NULL,
  title     VARCHAR(200),
  FOREIGN KEY (lesson_id) REFERENCES lessons(id) ON DELETE CASCADE
);

CREATE TABLE quiz_questions (
  id           INT AUTO_INCREMENT PRIMARY KEY,
  quiz_id      INT NOT NULL,
  question     TEXT NOT NULL,
  question_en  TEXT,
  options_json JSON NOT NULL,   -- {"a":"...", "b":"...", "c":"..."}
  answer       VARCHAR(5) NOT NULL,
  explanation  TEXT,
  sort_order   INT DEFAULT 0,
  FOREIGN KEY (quiz_id) REFERENCES quizzes(id) ON DELETE CASCADE
);

-- ─────────────────────────────────────────
-- ENROLLMENTS & PROGRESS
-- ─────────────────────────────────────────

CREATE TABLE enrollments (
  id              INT AUTO_INCREMENT PRIMARY KEY,
  user_id         INT NOT NULL,
  course_id       VARCHAR(20) NOT NULL,
  course_dates    VARCHAR(100),
  enrolled_at     TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  email_sent      BOOLEAN DEFAULT FALSE,
  email_sent_at   TIMESTAMP NULL,
  unenrolled_at   TIMESTAMP NULL,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (course_id) REFERENCES courses(id),
  UNIQUE KEY uq_enrollment (user_id, course_id)
);

CREATE TABLE progress (
  id            INT AUTO_INCREMENT PRIMARY KEY,
  user_id       INT NOT NULL,
  course_id     VARCHAR(20) NOT NULL,
  day_number    INT NOT NULL,
  reading_done  BOOLEAN DEFAULT FALSE,
  reading_at    TIMESTAMP NULL,
  quiz_passed   BOOLEAN DEFAULT FALSE,
  quiz_score    INT,
  quiz_at       TIMESTAMP NULL,
  completed_at  TIMESTAMP NULL,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (course_id) REFERENCES courses(id),
  UNIQUE KEY uq_progress (user_id, course_id, day_number),
  INDEX idx_user_course (user_id, course_id)
);

-- ─────────────────────────────────────────
-- TRACKING (actions + location)
-- ─────────────────────────────────────────

CREATE TABLE user_actions (
  id            INT AUTO_INCREMENT PRIMARY KEY,
  user_id       INT NOT NULL,
  action_type   ENUM(
    'lesson_opened','lesson_completed',
    'quiz_started','quiz_completed',
    'day_completed','course_enrolled','course_completed',
    'checkin_site','checkout_site',
    'app_opened','app_backgrounded'
  ) NOT NULL,
  course_id     VARCHAR(20),
  day_number    INT,
  metadata_json JSON,
  created_at    TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  INDEX idx_user (user_id),
  INDEX idx_type (action_type),
  INDEX idx_created (created_at)
);

CREATE TABLE location_sessions (
  id            INT AUTO_INCREMENT PRIMARY KEY,
  user_id       INT NOT NULL,
  session_type  ENUM('flight','practice','ground') DEFAULT 'practice',
  started_at    TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  ended_at      TIMESTAMP NULL,
  site_name     VARCHAR(100),
  notes         TEXT,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  INDEX idx_user (user_id),
  INDEX idx_active (ended_at)
);

CREATE TABLE location_points (
  id          BIGINT AUTO_INCREMENT PRIMARY KEY,
  session_id  INT NOT NULL,
  user_id     INT NOT NULL,
  lat         DECIMAL(10, 7) NOT NULL,
  lng         DECIMAL(10, 7) NOT NULL,
  altitude    DECIMAL(8, 2),      -- metres
  accuracy    DECIMAL(6, 2),      -- metres
  speed       DECIMAL(6, 2),      -- m/s
  heading     DECIMAL(5, 2),      -- degrees
  recorded_at TIMESTAMP(3) NOT NULL,
  FOREIGN KEY (session_id) REFERENCES location_sessions(id) ON DELETE CASCADE,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  INDEX idx_session (session_id),
  INDEX idx_recorded (recorded_at)
);

-- ─────────────────────────────────────────
-- PRODUCTS & MANUFACTURERS
-- ─────────────────────────────────────────

CREATE TABLE manufacturers (
  id          INT AUTO_INCREMENT PRIMARY KEY,
  name        VARCHAR(100) NOT NULL UNIQUE,
  tagline     VARCHAR(255),
  intro_fi    TEXT,
  intro_en    TEXT,
  website     VARCHAR(200),
  logo_url    VARCHAR(500),
  updated_at  TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

CREATE TABLE products (
  id            VARCHAR(30) PRIMARY KEY,
  name          VARCHAR(200) NOT NULL,
  short_desc    TEXT,
  category      VARCHAR(100),
  subcategory   VARCHAR(100),
  price         DECIMAL(10,2),
  sale_price    DECIMAL(10,2),
  manufacturer  VARCHAR(100),
  difficulty    VARCHAR(50),
  image_url     VARCHAR(500),
  active        BOOLEAN DEFAULT TRUE,
  created_at    TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at    TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_category (category, subcategory),
  INDEX idx_manufacturer (manufacturer),
  INDEX idx_active (active)
);
