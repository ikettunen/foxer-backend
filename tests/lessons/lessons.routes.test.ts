import request from 'supertest'
import jwt from 'jsonwebtoken'
import app from '../../src/app'

jest.mock('../../src/config/db', () => require('../__mocks__/db'))
jest.mock('../../src/services/lessons/lessons.service')

import { LessonsService } from '../../src/services/lessons/lessons.service'

const MockLessonsService = LessonsService as jest.Mocked<typeof LessonsService>

const fakeLesson = {
  id: 'lesson-1',
  course_day_id: 1,
  title: 'Test Lesson',
  title_en: null,
  estimated_read_minutes: 30,
  sections: [],
  created_at: new Date(),
  updated_at: new Date(),
}

const fakeSection = {
  id: 1,
  lesson_id: 'lesson-1',
  heading: 'Section 1',
  heading_en: null,
  body: 'Content',
  body_en: null,
  safety_flag: false,
  sort_order: 0,
}

function makeToken(role: 'student' | 'admin' = 'student', userId = 1) {
  return jwt.sign({ userId, role, email: 'test@test.com' }, process.env.JWT_SECRET!, { expiresIn: '1h' })
}

describe('Lessons routes (issue #17)', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  // ─────────────────────────── GET /api/lessons/:id ───────────────────────────
  describe('GET /api/lessons/:id', () => {
    it('returns 401 without auth', async () => {
      const res = await request(app).get('/api/lessons/lesson-1')
      expect(res.status).toBe(401)
    })

    it('returns 200 with lesson + sections for authenticated user', async () => {
      MockLessonsService.getById.mockResolvedValueOnce(fakeLesson)

      const token = makeToken('student', 1)
      const res = await request(app)
        .get('/api/lessons/lesson-1')
        .set('Authorization', `Bearer ${token}`)

      expect(res.status).toBe(200)
      expect(res.body).toMatchObject({ id: 'lesson-1' })
      expect(MockLessonsService.getById).toHaveBeenCalledWith('lesson-1')
    })
  })

  // ─────────────────────────── POST /api/lessons ───────────────────────────
  describe('POST /api/lessons', () => {
    it('returns 401 without auth', async () => {
      const res = await request(app).post('/api/lessons').send({ id: 'l', title: 'L' })
      expect(res.status).toBe(401)
    })

    it('returns 403 for student role', async () => {
      const token = makeToken('student', 1)
      const res = await request(app)
        .post('/api/lessons')
        .set('Authorization', `Bearer ${token}`)
        .send({ id: 'lesson-1', course_day_id: 1 })

      expect(res.status).toBe(403)
    })

    it('returns 201 when admin creates a lesson', async () => {
      MockLessonsService.create.mockResolvedValueOnce(fakeLesson)

      const token = makeToken('admin', 2)
      const res = await request(app)
        .post('/api/lessons')
        .set('Authorization', `Bearer ${token}`)
        .send({ id: 'lesson-1', course_day_id: 1, title: 'Test Lesson' })

      expect(res.status).toBe(201)
      expect(MockLessonsService.create).toHaveBeenCalledTimes(1)
    })
  })

  // ─────────────────────────── PUT /api/lessons/:id ───────────────────────────
  describe('PUT /api/lessons/:id', () => {
    it('returns 401 without auth', async () => {
      const res = await request(app).put('/api/lessons/lesson-1').send({ title: 'X' })
      expect(res.status).toBe(401)
    })

    it('returns 403 for student', async () => {
      const token = makeToken('student', 1)
      const res = await request(app)
        .put('/api/lessons/lesson-1')
        .set('Authorization', `Bearer ${token}`)
        .send({ title: 'X' })

      expect(res.status).toBe(403)
    })

    it('returns 200 when admin updates a lesson', async () => {
      MockLessonsService.update.mockResolvedValueOnce({ ...fakeLesson, title: 'Updated' })

      const token = makeToken('admin', 2)
      const res = await request(app)
        .put('/api/lessons/lesson-1')
        .set('Authorization', `Bearer ${token}`)
        .send({ title: 'Updated' })

      expect(res.status).toBe(200)
      expect(MockLessonsService.update).toHaveBeenCalledWith('lesson-1', { title: 'Updated' })
    })
  })

  // ─────────────────────────── DELETE /api/lessons/:id ───────────────────────────
  describe('DELETE /api/lessons/:id', () => {
    it('returns 401 without auth', async () => {
      const res = await request(app).delete('/api/lessons/lesson-1')
      expect(res.status).toBe(401)
    })

    it('returns 403 for student', async () => {
      const token = makeToken('student', 1)
      const res = await request(app)
        .delete('/api/lessons/lesson-1')
        .set('Authorization', `Bearer ${token}`)

      expect(res.status).toBe(403)
    })

    it('returns 200 when admin deletes a lesson', async () => {
      MockLessonsService.remove.mockResolvedValueOnce(undefined)

      const token = makeToken('admin', 2)
      const res = await request(app)
        .delete('/api/lessons/lesson-1')
        .set('Authorization', `Bearer ${token}`)

      expect(res.status).toBe(200)
      expect(MockLessonsService.remove).toHaveBeenCalledWith('lesson-1')
    })
  })

  // ─────────────────────────── POST /api/lessons/:id/sections ───────────────────────────
  describe('POST /api/lessons/:id/sections', () => {
    it('returns 401 without auth', async () => {
      const res = await request(app).post('/api/lessons/lesson-1/sections').send({ heading: 'S' })
      expect(res.status).toBe(401)
    })

    it('returns 403 for student', async () => {
      const token = makeToken('student', 1)
      const res = await request(app)
        .post('/api/lessons/lesson-1/sections')
        .set('Authorization', `Bearer ${token}`)
        .send({ heading: 'S' })

      expect(res.status).toBe(403)
    })

    it('returns 201 when admin adds a section', async () => {
      MockLessonsService.addSection.mockResolvedValueOnce(fakeSection)

      const token = makeToken('admin', 2)
      const res = await request(app)
        .post('/api/lessons/lesson-1/sections')
        .set('Authorization', `Bearer ${token}`)
        .send({ heading: 'Section 1', body: 'Content' })

      expect(res.status).toBe(201)
      expect(MockLessonsService.addSection).toHaveBeenCalledWith('lesson-1', { heading: 'Section 1', body: 'Content' })
    })
  })

  // ─────────────────────────── PUT /api/lessons/:id/sections/:sectionId ───────────────────────────
  describe('PUT /api/lessons/:id/sections/:sectionId', () => {
    it('returns 200 when admin updates a section', async () => {
      MockLessonsService.updateSection.mockResolvedValueOnce({ ...fakeSection, heading: 'Updated' })

      const token = makeToken('admin', 2)
      const res = await request(app)
        .put('/api/lessons/lesson-1/sections/1')
        .set('Authorization', `Bearer ${token}`)
        .send({ heading: 'Updated' })

      expect(res.status).toBe(200)
      expect(MockLessonsService.updateSection).toHaveBeenCalledWith(1, { heading: 'Updated' })
    })
  })

  // ─────────────────────────── DELETE /api/lessons/:id/sections/:sectionId ───────────────────────────
  describe('DELETE /api/lessons/:id/sections/:sectionId', () => {
    it('returns 200 when admin removes a section', async () => {
      MockLessonsService.removeSection.mockResolvedValueOnce(undefined)

      const token = makeToken('admin', 2)
      const res = await request(app)
        .delete('/api/lessons/lesson-1/sections/1')
        .set('Authorization', `Bearer ${token}`)

      expect(res.status).toBe(200)
      expect(MockLessonsService.removeSection).toHaveBeenCalledWith(1)
    })
  })
})
