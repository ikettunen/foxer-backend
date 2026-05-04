-- Foxer Backend — Database Schema
-- MySQL

CREATE DATABASE IF NOT EXISTS foxer CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE foxer;

-- Users
CREATE TABLE users (
  id          INT AUTO_INCREMENT PRIMARY KEY,
  name        VARCHAR(100) NOT NULL,
  email       VARCHAR(150) NOT NULL UNIQUE,
  password    VARCHAR(255) NOT NULL,        -- bcrypt
  role        ENUM('student','admin') DEFAULT 'student',
  locale      VARCHAR(5) DEFAULT 'fi',
  active      BOOLEAN DEFAULT TRUE,
  created_at  TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at  TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- Courses
CREATE TABLE courses (
  id            VARCHAR(20) PRIMARY KEY,    -- e.g. 'pp1', 'pp2'
  title         VARCHAR(200) NOT NULL,
  title_en      VARCHAR(200),
  description   TEXT,
  days          INT NOT NULL DEFAULT 3,
  hours_per_day INT NOT NULL DEFAULT 8,
  published     BOOLEAN DEFAULT FALSE,
  locale        VARCHAR(5) DEFAULT 'fi',
  created_at    TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Course Days
CREATE TABLE course_days (
  id          INT AUTO_INCREMENT PRIMARY KEY,
  course_id   VARCHAR(20) NOT NULL REFERENCES courses(id),
  day_number  INT NOT NULL,
  title       VARCHAR(200),
  title_en    VARCHAR(200),
  description TEXT,
  UNIQUE KEY (course_id, day_number)
);

-- Lessons (pre-reading per day)
CREATE TABLE lessons (
  id                      VARCHAR(50) PRIMARY KEY,
  course_day_id           INT NOT NULL REFERENCES course_days(id),
  title                   VARCHAR(200),
  estimated_read_minutes  INT DEFAULT 20,
  created_at              TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Lesson Sections
CREATE TABLE lesson_sections (
  id           INT AUTO_INCREMENT PRIMARY KEY,
  lesson_id    VARCHAR(50) NOT NULL REFERENCES lessons(id),
  heading      VARCHAR(200),
  body         TEXT,
  safety_flag  BOOLEAN DEFAULT FALSE,
  sort_order   INT DEFAULT 0
);

-- Quizzes
CREATE TABLE quizzes (
  id          INT AUTO_INCREMENT PRIMARY KEY,
  lesson_id   VARCHAR(50) NOT NULL REFERENCES lessons(id),
  title       VARCHAR(200)
);

-- Quiz Questions
CREATE TABLE quiz_questions (
  id          INT AUTO_INCREMENT PRIMARY KEY,
  quiz_id     INT NOT NULL REFERENCES quizzes(id),
  question    TEXT NOT NULL,
  options     JSON NOT NULL,               -- {"a":"...","b":"...","c":"..."}
  answer      VARCHAR(5) NOT NULL,         -- correct option key
  explanation TEXT,
  sort_order  INT DEFAULT 0
);

-- Enrollments
CREATE TABLE enrollments (
  id            INT AUTO_INCREMENT PRIMARY KEY,
  user_id       INT NOT NULL REFERENCES users(id),
  course_id     VARCHAR(20) NOT NULL REFERENCES courses(id),
  course_dates  VARCHAR(100),              -- human-readable, e.g. "14–16.6.2026"
  enrolled_at   TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  email_sent    BOOLEAN DEFAULT FALSE,
  UNIQUE KEY (user_id, course_id)
);

-- Progress Tracking
CREATE TABLE progress (
  id            INT AUTO_INCREMENT PRIMARY KEY,
  user_id       INT NOT NULL REFERENCES users(id),
  course_id     VARCHAR(20) NOT NULL REFERENCES courses(id),
  day_number    INT NOT NULL,
  reading_done  BOOLEAN DEFAULT FALSE,
  reading_at    TIMESTAMP NULL,
  quiz_passed   BOOLEAN DEFAULT FALSE,
  quiz_score    INT,
  quiz_at       TIMESTAMP NULL,
  completed_at  TIMESTAMP NULL,
  UNIQUE KEY (user_id, course_id, day_number)
);

-- Products (synced from tuotteet.csv)
CREATE TABLE products (
  id              VARCHAR(30) PRIMARY KEY,
  name            VARCHAR(200) NOT NULL,
  short_desc      TEXT,
  category        VARCHAR(100),
  subcategory     VARCHAR(100),
  price           DECIMAL(10,2),
  sale_price      DECIMAL(10,2),
  manufacturer    VARCHAR(100),
  difficulty      VARCHAR(50),
  active          BOOLEAN DEFAULT TRUE,
  created_at      TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at      TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- Manufacturer Intros (written by @cath)
CREATE TABLE manufacturers (
  id          INT AUTO_INCREMENT PRIMARY KEY,
  name        VARCHAR(100) NOT NULL UNIQUE,
  tagline     VARCHAR(255),
  intro_fi    TEXT,
  intro_en    TEXT,
  website     VARCHAR(200),
  updated_at  TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);
