import request from 'supertest'
import jwt from 'jsonwebtoken'
import app from '../../src/app'

jest.mock('../../src/config/db', () => require('../__mocks__/db'))
jest.mock('../../src/services/courses/courses.service')

import { CoursesService } from '../../src/services/courses/courses.service'

const MockCoursesService = CoursesService as jest.Mocked<typeof CoursesService>

const fakeCourse = {
  id: 'course-1',
  title: 'Test Course',
  title_en: null,
  description: 'A test',
  description_en: null,
  days: 3,
  hours_per_day: 8,
  published: true,
  locale: 'fi' as const,
  image_url: null,
  created_at: new Date(),
  updated_at: new Date(),
}

const fakeDay = {
  id: 1,
  course_id: 'course-1',
  day_number: 1,
  title: 'Day 1',
  title_en: null,
  description: null,
  description_en: null,
  unlocked_after_day: null,
}

function makeToken(role: 'student' | 'admin' = 'student', userId = 1) {
  return jwt.sign({ userId, role, email: 'test@test.com' }, process.env.JWT_SECRET!, { expiresIn: '1h' })
}

describe('Courses routes (issue #16)', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  // ─────────────────────────── GET /api/courses ───────────────────────────
  describe('GET /api/courses', () => {
    it('returns 401 without auth (authenticate middleware applies)', async () => {
      const res = await request(app).get('/api/courses')
      expect(res.status).toBe(401)
    })

    it('returns 200 with list for authenticated user', async () => {
      MockCoursesService.list.mockResolvedValueOnce([fakeCourse])

      const token = makeToken('student', 1)
      const res = await request(app)
        .get('/api/courses')
        .set('Authorization', `Bearer ${token}`)

      expect(res.status).toBe(200)
      expect(Array.isArray(res.body)).toBe(true)
      expect(MockCoursesService.list).toHaveBeenCalledTimes(1)
    })
  })

  // ─────────────────────────── GET /api/courses/:id ───────────────────────────
  describe('GET /api/courses/:id', () => {
    it('returns 401 without auth', async () => {
      const res = await request(app).get('/api/courses/course-1')
      expect(res.status).toBe(401)
    })

    it('returns 200 with course data', async () => {
      MockCoursesService.getById.mockResolvedValueOnce(fakeCourse)

      const token = makeToken('student', 1)
      const res = await request(app)
        .get('/api/courses/course-1')
        .set('Authorization', `Bearer ${token}`)

      expect(res.status).toBe(200)
      expect(res.body).toMatchObject({ id: 'course-1' })
    })
  })

  // ─────────────────────────── POST /api/courses ───────────────────────────
  describe('POST /api/courses', () => {
    it('returns 401 without auth', async () => {
      const res = await request(app).post('/api/courses').send({ id: 'c', title: 'C' })
      expect(res.status).toBe(401)
    })

    it('returns 403 for student role', async () => {
      const token = makeToken('student', 1)
      const res = await request(app)
        .post('/api/courses')
        .set('Authorization', `Bearer ${token}`)
        .send({ id: 'c', title: 'Course' })

      expect(res.status).toBe(403)
    })

    it('returns 201 when admin creates a course', async () => {
      MockCoursesService.create.mockResolvedValueOnce(fakeCourse)

      const token = makeToken('admin', 2)
      const res = await request(app)
        .post('/api/courses')
        .set('Authorization', `Bearer ${token}`)
        .send({ id: 'course-1', title: 'Test Course' })

      expect(res.status).toBe(201)
      expect(MockCoursesService.create).toHaveBeenCalledTimes(1)
    })
  })

  // ─────────────────────────── PUT /api/courses/:id ───────────────────────────
  describe('PUT /api/courses/:id', () => {
    it('returns 401 without auth', async () => {
      const res = await request(app).put('/api/courses/course-1').send({ title: 'X' })
      expect(res.status).toBe(401)
    })

    it('returns 403 for student', async () => {
      const token = makeToken('student', 1)
      const res = await request(app)
        .put('/api/courses/course-1')
        .set('Authorization', `Bearer ${token}`)
        .send({ title: 'X' })

      expect(res.status).toBe(403)
    })

    it('returns 200 when admin updates', async () => {
      MockCoursesService.update.mockResolvedValueOnce({ ...fakeCourse, title: 'Updated' })

      const token = makeToken('admin', 2)
      const res = await request(app)
        .put('/api/courses/course-1')
        .set('Authorization', `Bearer ${token}`)
        .send({ title: 'Updated' })

      expect(res.status).toBe(200)
      expect(MockCoursesService.update).toHaveBeenCalledWith('course-1', { title: 'Updated' })
    })
  })

  // ─────────────────────────── DELETE /api/courses/:id ───────────────────────────
  describe('DELETE /api/courses/:id', () => {
    it('returns 401 without auth', async () => {
      const res = await request(app).delete('/api/courses/course-1')
      expect(res.status).toBe(401)
    })

    it('returns 403 for student', async () => {
      const token = makeToken('student', 1)
      const res = await request(app)
        .delete('/api/courses/course-1')
        .set('Authorization', `Bearer ${token}`)

      expect(res.status).toBe(403)
    })

    it('returns 200 when admin deletes', async () => {
      MockCoursesService.remove.mockResolvedValueOnce(undefined)

      const token = makeToken('admin', 2)
      const res = await request(app)
        .delete('/api/courses/course-1')
        .set('Authorization', `Bearer ${token}`)

      expect(res.status).toBe(200)
      expect(MockCoursesService.remove).toHaveBeenCalledWith('course-1')
    })
  })

  // ─────────────────────────── POST /api/courses/:id/days ───────────────────────────
  describe('POST /api/courses/:id/days', () => {
    it('returns 401 without auth', async () => {
      const res = await request(app).post('/api/courses/course-1/days').send({ day_number: 1 })
      expect(res.status).toBe(401)
    })

    it('returns 403 for student', async () => {
      const token = makeToken('student', 1)
      const res = await request(app)
        .post('/api/courses/course-1/days')
        .set('Authorization', `Bearer ${token}`)
        .send({ day_number: 1 })

      expect(res.status).toBe(403)
    })

    it('returns 201 when admin adds a day', async () => {
      MockCoursesService.addDay.mockResolvedValueOnce(fakeDay)

      const token = makeToken('admin', 2)
      const res = await request(app)
        .post('/api/courses/course-1/days')
        .set('Authorization', `Bearer ${token}`)
        .send({ day_number: 1, title: 'Day 1' })

      expect(res.status).toBe(201)
      expect(MockCoursesService.addDay).toHaveBeenCalledWith('course-1', { day_number: 1, title: 'Day 1' })
    })
  })

  // ─────────────────────────── PUT /api/courses/:id/days/:dayNum ───────────────────────────
  describe('PUT /api/courses/:id/days/:dayNum', () => {
    it('returns 200 when admin updates a day', async () => {
      MockCoursesService.updateDay.mockResolvedValueOnce({ ...fakeDay, title: 'Updated Day' })

      const token = makeToken('admin', 2)
      const res = await request(app)
        .put('/api/courses/course-1/days/1')
        .set('Authorization', `Bearer ${token}`)
        .send({ title: 'Updated Day' })

      expect(res.status).toBe(200)
      expect(MockCoursesService.updateDay).toHaveBeenCalledWith('course-1', 1, { title: 'Updated Day' })
    })
  })

  // ─────────────────────────── DELETE /api/courses/:id/days/:dayNum ───────────────────────────
  describe('DELETE /api/courses/:id/days/:dayNum', () => {
    it('returns 200 when admin removes a day', async () => {
      MockCoursesService.removeDay.mockResolvedValueOnce(undefined)

      const token = makeToken('admin', 2)
      const res = await request(app)
        .delete('/api/courses/course-1/days/1')
        .set('Authorization', `Bearer ${token}`)

      expect(res.status).toBe(200)
      expect(MockCoursesService.removeDay).toHaveBeenCalledWith('course-1', 1)
    })
  })
})
