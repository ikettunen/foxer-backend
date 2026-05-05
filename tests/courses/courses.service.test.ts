import { CoursesService } from '../../src/services/courses/courses.service'

jest.mock('../../src/config/db', () => require('../__mocks__/db'))

import pool from '../../src/config/db'

const mockPool = pool as jest.Mocked<typeof pool>

const fakeCourseRow = {
  id: 'course-1',
  title: 'Test Course',
  title_en: 'Test Course EN',
  description: 'A test course',
  description_en: null,
  days: 3,
  hours_per_day: 8,
  published: 1,
  locale: 'fi',
  image_url: null,
  created_at: new Date('2024-01-01'),
  updated_at: new Date('2024-01-01'),
}

const fakeDayRow = {
  id: 1,
  course_id: 'course-1',
  day_number: 1,
  title: 'Day 1',
  title_en: null,
  description: 'First day',
  description_en: null,
  unlocked_after_day: null,
}

describe('CoursesService (issue #16)', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  // ─────────────────────────── list ───────────────────────────
  describe('list', () => {
    it('returns published courses only by default', async () => {
      mockPool.query.mockResolvedValueOnce([[fakeCourseRow], {}] as any)

      const courses = await CoursesService.list()

      expect(courses).toHaveLength(1)
      const call = mockPool.query.mock.calls[0]
      expect(call[0]).toContain('WHERE published = 1')
    })

    it('returns all courses (including unpublished) when includeUnpublished=true', async () => {
      const unpublished = { ...fakeCourseRow, id: 'course-2', published: 0 }
      mockPool.query.mockResolvedValueOnce([[fakeCourseRow, unpublished], {}] as any)

      const courses = await CoursesService.list(true)

      expect(courses).toHaveLength(2)
      const call = mockPool.query.mock.calls[0]
      expect(call[0]).not.toContain('WHERE published = 1')
    })
  })

  // ─────────────────────────── getById ───────────────────────────
  describe('getById', () => {
    it('returns a course by id', async () => {
      mockPool.query.mockResolvedValueOnce([[fakeCourseRow], {}] as any)

      const course = await CoursesService.getById('course-1')

      expect(course).toMatchObject({ id: 'course-1', title: 'Test Course' })
    })

    it('throws 404 if course not found', async () => {
      mockPool.query.mockResolvedValueOnce([[], {}] as any)

      await expect(CoursesService.getById('nonexistent')).rejects.toMatchObject({ statusCode: 404 })
    })
  })

  // ─────────────────────────── create ───────────────────────────
  describe('create', () => {
    it('inserts course and returns created course', async () => {
      mockPool.execute.mockResolvedValueOnce([{ insertId: 1 }, {}] as any)
      mockPool.query.mockResolvedValueOnce([[fakeCourseRow], {}] as any) // getById

      const course = await CoursesService.create({
        id: 'course-1',
        title: 'Test Course',
        days: 3,
        hours_per_day: 8,
        published: true,
        locale: 'fi',
      } as any)

      expect(mockPool.execute).toHaveBeenCalledTimes(1)
      const call = mockPool.execute.mock.calls[0]
      expect(call[0]).toContain('INSERT INTO courses')
      expect(course).toMatchObject({ id: 'course-1' })
    })
  })

  // ─────────────────────────── update ───────────────────────────
  describe('update', () => {
    it('updates allowed fields and returns updated course', async () => {
      mockPool.execute.mockResolvedValueOnce([{ affectedRows: 1 }, {}] as any)
      mockPool.query.mockResolvedValueOnce([[{ ...fakeCourseRow, title: 'Updated Title' }], {}] as any)

      const course = await CoursesService.update('course-1', { title: 'Updated Title' })

      expect(course.title).toBe('Updated Title')
      const call = mockPool.execute.mock.calls[0]
      expect(call[0]).toContain('UPDATE courses SET')
    })

    it('throws 400 when no valid fields provided', async () => {
      await expect(
        CoursesService.update('course-1', { some_invalid_field: 'x' } as any)
      ).rejects.toMatchObject({ statusCode: 400 })
    })

    it('throws 404 if course not found after update', async () => {
      mockPool.execute.mockResolvedValueOnce([{ affectedRows: 0 }, {}] as any)
      mockPool.query.mockResolvedValueOnce([[], {}] as any)

      await expect(
        CoursesService.update('nonexistent', { title: 'X' })
      ).rejects.toMatchObject({ statusCode: 404 })
    })
  })

  // ─────────────────────────── remove ───────────────────────────
  describe('remove', () => {
    it('sets published=0 for the course', async () => {
      mockPool.execute.mockResolvedValueOnce([{ affectedRows: 1 }, {}] as any)

      await CoursesService.remove('course-1')

      expect(mockPool.execute).toHaveBeenCalledTimes(1)
      const call = mockPool.execute.mock.calls[0]
      expect(call[0]).toContain('published = 0')
    })
  })

  // ─────────────────────────── addDay ───────────────────────────
  describe('addDay', () => {
    it('inserts a day and returns it', async () => {
      mockPool.execute.mockResolvedValueOnce([{ insertId: 1 }, {}] as any)
      mockPool.query.mockResolvedValueOnce([[fakeDayRow], {}] as any)

      const day = await CoursesService.addDay('course-1', {
        day_number: 1,
        title: 'Day 1',
      })

      expect(mockPool.execute).toHaveBeenCalledTimes(1)
      const call = mockPool.execute.mock.calls[0]
      expect(call[0]).toContain('INSERT INTO course_days')
      expect(day).toMatchObject({ id: 1, day_number: 1 })
    })
  })

  // ─────────────────────────── updateDay ───────────────────────────
  describe('updateDay', () => {
    it('updates day fields', async () => {
      mockPool.execute.mockResolvedValueOnce([{ affectedRows: 1 }, {}] as any)
      mockPool.query.mockResolvedValueOnce([[{ ...fakeDayRow, title: 'Updated Day' }], {}] as any)

      const day = await CoursesService.updateDay('course-1', 1, { title: 'Updated Day' })

      expect(day.title).toBe('Updated Day')
    })

    it('throws 400 when no valid fields', async () => {
      await expect(
        CoursesService.updateDay('course-1', 1, { some_bad_field: 'x' } as any)
      ).rejects.toMatchObject({ statusCode: 400 })
    })
  })

  // ─────────────────────────── removeDay ───────────────────────────
  describe('removeDay', () => {
    it('deletes a day', async () => {
      mockPool.execute.mockResolvedValueOnce([{ affectedRows: 1 }, {}] as any)

      await CoursesService.removeDay('course-1', 1)

      expect(mockPool.execute).toHaveBeenCalledTimes(1)
      const call = mockPool.execute.mock.calls[0]
      expect(call[0]).toContain('DELETE FROM course_days')
    })
  })
})
