import pool from '../../config/db'
import { Course, CourseDay } from '../../types'

export class CoursesService {
  static async list(includeUnpublished = false): Promise<Course[]> {
    const where = includeUnpublished ? '' : 'WHERE published = 1'
    const [rows] = await pool.query(`SELECT * FROM courses ${where} ORDER BY id ASC`) as [any[], any]
    return rows
  }

  static async getById(id: string): Promise<Course> {
    const [rows] = await pool.query('SELECT * FROM courses WHERE id = ?', [id]) as [any[], any]
    if (rows.length === 0) throw Object.assign(new Error('Course not found'), { statusCode: 404 })
    return rows[0]
  }

  static async create(data: Partial<Course>): Promise<Course> {
    const { id, title, title_en, description, description_en, days, hours_per_day, published, locale, image_url } = data as Course
    await pool.execute(
      'INSERT INTO courses (id, title, title_en, description, description_en, days, hours_per_day, published, locale, image_url) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
      [id, title, title_en ?? null, description ?? null, description_en ?? null, days ?? 3, hours_per_day ?? 8, published ? 1 : 0, locale ?? 'fi', image_url ?? null],
    )
    return this.getById(id)
  }

  static async update(id: string, data: Partial<Course>): Promise<Course> {
    const allowed = ['title', 'title_en', 'description', 'description_en', 'days', 'hours_per_day', 'published', 'locale', 'image_url']
    const fields  = Object.keys(data).filter(k => allowed.includes(k))
    if (fields.length === 0) throw Object.assign(new Error('No valid fields'), { statusCode: 400 })
    const values  = fields.map(f => (data as Record<string, unknown>)[f])
    const set     = fields.map(f => `${f} = ?`).join(', ')
    await pool.execute(`UPDATE courses SET ${set}, updated_at = NOW() WHERE id = ?`, [...values, id])
    return this.getById(id)
  }

  static async remove(id: string): Promise<void> {
    await pool.execute('UPDATE courses SET published = 0, updated_at = NOW() WHERE id = ?', [id])
  }

  static async getDays(courseId: string): Promise<CourseDay[]> {
    const [rows] = await pool.query('SELECT * FROM course_days WHERE course_id = ? ORDER BY day_number ASC', [courseId]) as [any[], any]
    return rows
  }

  static async addDay(courseId: string, data: Partial<CourseDay>): Promise<CourseDay> {
    const [result] = await pool.execute(
      'INSERT INTO course_days (course_id, day_number, title, title_en, description, description_en, unlocked_after_day) VALUES (?, ?, ?, ?, ?, ?, ?)',
      [courseId, data.day_number, data.title ?? null, data.title_en ?? null, data.description ?? null, data.description_en ?? null, data.unlocked_after_day ?? null],
    ) as [any, any]
    const [rows] = await pool.query('SELECT * FROM course_days WHERE id = ?', [result.insertId]) as [any[], any]
    return rows[0]
  }

  static async updateDay(courseId: string, dayNumber: number, data: Partial<CourseDay>): Promise<CourseDay> {
    const allowed = ['title', 'title_en', 'description', 'description_en', 'unlocked_after_day']
    const fields  = Object.keys(data).filter(k => allowed.includes(k))
    if (fields.length === 0) throw Object.assign(new Error('No valid fields'), { statusCode: 400 })
    const values  = fields.map(f => (data as Record<string, unknown>)[f])
    const set     = fields.map(f => `${f} = ?`).join(', ')
    await pool.execute(`UPDATE course_days SET ${set} WHERE course_id = ? AND day_number = ?`, [...values, courseId, dayNumber])
    const [rows] = await pool.query('SELECT * FROM course_days WHERE course_id = ? AND day_number = ?', [courseId, dayNumber]) as [any[], any]
    return rows[0]
  }

  static async removeDay(courseId: string, dayNumber: number): Promise<void> {
    await pool.execute('DELETE FROM course_days WHERE course_id = ? AND day_number = ?', [courseId, dayNumber])
  }
}
