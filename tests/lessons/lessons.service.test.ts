import { LessonsService } from '../../src/services/lessons/lessons.service'

jest.mock('../../src/config/db', () => require('../__mocks__/db'))

import pool from '../../src/config/db'

const mockPool = pool as jest.Mocked<typeof pool>

const fakeLessonRow = {
  id: 'lesson-1',
  course_day_id: 1,
  title: 'Test Lesson',
  title_en: null,
  estimated_read_minutes: 30,
  created_at: new Date('2024-01-01'),
  updated_at: new Date('2024-01-01'),
}

const fakeSectionRow = {
  id: 1,
  lesson_id: 'lesson-1',
  heading: 'Section 1',
  heading_en: null,
  body: 'Content here',
  body_en: null,
  safety_flag: false,
  sort_order: 0,
}

describe('LessonsService (issue #17)', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  // ─────────────────────────── getById ───────────────────────────
  describe('getById', () => {
    it('returns lesson with sections', async () => {
      mockPool.query
        .mockResolvedValueOnce([[fakeLessonRow], {}] as any)
        .mockResolvedValueOnce([[fakeSectionRow], {}] as any)

      const lesson = await LessonsService.getById('lesson-1')

      expect(lesson).toMatchObject({ id: 'lesson-1', title: 'Test Lesson' })
      expect(lesson.sections).toHaveLength(1)
      expect(lesson.sections[0]).toMatchObject({ id: 1, heading: 'Section 1' })
    })

    it('throws 404 if lesson not found', async () => {
      mockPool.query.mockResolvedValueOnce([[], {}] as any)

      await expect(LessonsService.getById('nonexistent')).rejects.toMatchObject({ statusCode: 404 })
    })
  })

  // ─────────────────────────── create ───────────────────────────
  describe('create', () => {
    it('inserts lesson and returns it', async () => {
      mockPool.execute.mockResolvedValueOnce([{ insertId: 1 }, {}] as any)
      mockPool.query.mockResolvedValueOnce([[fakeLessonRow], {}] as any)

      const lesson = await LessonsService.create({
        id: 'lesson-1',
        course_day_id: 1,
        title: 'Test Lesson',
        estimated_read_minutes: 30,
      } as any)

      expect(mockPool.execute).toHaveBeenCalledTimes(1)
      const call = mockPool.execute.mock.calls[0]
      expect(call[0]).toContain('INSERT INTO lessons')
      expect(lesson).toMatchObject({ id: 'lesson-1' })
    })
  })

  // ─────────────────────────── update ───────────────────────────
  describe('update', () => {
    it('updates allowed fields and returns updated lesson', async () => {
      mockPool.execute.mockResolvedValueOnce([{ affectedRows: 1 }, {}] as any)
      mockPool.query.mockResolvedValueOnce([[{ ...fakeLessonRow, title: 'Updated' }], {}] as any)

      const lesson = await LessonsService.update('lesson-1', { title: 'Updated' })

      expect(lesson.title).toBe('Updated')
      const call = mockPool.execute.mock.calls[0]
      expect(call[0]).toContain('UPDATE lessons SET')
    })

    it('throws 400 when no valid fields provided', async () => {
      await expect(
        LessonsService.update('lesson-1', { bad_field: 'x' } as any)
      ).rejects.toMatchObject({ statusCode: 400 })
    })
  })

  // ─────────────────────────── remove ───────────────────────────
  describe('remove', () => {
    it('deletes a lesson', async () => {
      mockPool.execute.mockResolvedValueOnce([{ affectedRows: 1 }, {}] as any)

      await LessonsService.remove('lesson-1')

      expect(mockPool.execute).toHaveBeenCalledTimes(1)
      const call = mockPool.execute.mock.calls[0]
      expect(call[0]).toContain('DELETE FROM lessons')
    })
  })

  // ─────────────────────────── addSection ───────────────────────────
  describe('addSection', () => {
    it('inserts section and returns it', async () => {
      mockPool.execute.mockResolvedValueOnce([{ insertId: 1 }, {}] as any)
      mockPool.query.mockResolvedValueOnce([[fakeSectionRow], {}] as any)

      const section = await LessonsService.addSection('lesson-1', {
        heading: 'Section 1',
        body: 'Content here',
        sort_order: 0,
      })

      expect(mockPool.execute).toHaveBeenCalledTimes(1)
      const call = mockPool.execute.mock.calls[0]
      expect(call[0]).toContain('INSERT INTO lesson_sections')
      expect(section).toMatchObject({ id: 1, heading: 'Section 1' })
    })
  })

  // ─────────────────────────── updateSection ───────────────────────────
  describe('updateSection', () => {
    it('updates section fields', async () => {
      mockPool.execute.mockResolvedValueOnce([{ affectedRows: 1 }, {}] as any)
      mockPool.query.mockResolvedValueOnce([[{ ...fakeSectionRow, heading: 'Updated' }], {}] as any)

      const section = await LessonsService.updateSection(1, { heading: 'Updated' })

      expect(section.heading).toBe('Updated')
    })

    it('throws 400 when no valid fields', async () => {
      await expect(
        LessonsService.updateSection(1, { bad_field: 'x' } as any)
      ).rejects.toMatchObject({ statusCode: 400 })
    })
  })

  // ─────────────────────────── removeSection ───────────────────────────
  describe('removeSection', () => {
    it('deletes a section', async () => {
      mockPool.execute.mockResolvedValueOnce([{ affectedRows: 1 }, {}] as any)

      await LessonsService.removeSection(1)

      expect(mockPool.execute).toHaveBeenCalledTimes(1)
      const call = mockPool.execute.mock.calls[0]
      expect(call[0]).toContain('DELETE FROM lesson_sections')
    })
  })
})
