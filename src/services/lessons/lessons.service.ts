import pool from '../../config/db'
import { Lesson, LessonSection } from '../../types'

export class LessonsService {
  static async getById(id: string): Promise<Lesson & { sections: LessonSection[] }> {
    const [rows] = await pool.query('SELECT * FROM lessons WHERE id = ?', [id]) as [any[], any]
    if (rows.length === 0) throw Object.assign(new Error('Lesson not found'), { statusCode: 404 })
    const [sections] = await pool.query('SELECT * FROM lesson_sections WHERE lesson_id = ? ORDER BY sort_order ASC', [id]) as [any[], any]
    return { ...rows[0], sections }
  }

  static async update(id: string, data: Partial<Lesson>): Promise<Lesson> {
    const allowed = ['title', 'title_en', 'estimated_read_minutes']
    const fields  = Object.keys(data).filter(k => allowed.includes(k))
    if (fields.length === 0) throw Object.assign(new Error('No valid fields'), { statusCode: 400 })
    const values  = fields.map(f => (data as Record<string, unknown>)[f])
    const set     = fields.map(f => `${f} = ?`).join(', ')
    await pool.execute(`UPDATE lessons SET ${set}, updated_at = NOW() WHERE id = ?`, [...values, id])
    const [rows] = await pool.query('SELECT * FROM lessons WHERE id = ?', [id]) as [any[], any]
    return rows[0]
  }

  static async addSection(lessonId: string, data: Partial<LessonSection>): Promise<LessonSection> {
    const [result] = await pool.execute(
      'INSERT INTO lesson_sections (lesson_id, heading, heading_en, body, body_en, safety_flag, sort_order) VALUES (?, ?, ?, ?, ?, ?, ?)',
      [lessonId, data.heading ?? null, data.heading_en ?? null, data.body ?? null, data.body_en ?? null, data.safety_flag ? 1 : 0, data.sort_order ?? 0],
    ) as [any, any]
    const [rows] = await pool.query('SELECT * FROM lesson_sections WHERE id = ?', [result.insertId]) as [any[], any]
    return rows[0]
  }

  static async updateSection(sectionId: number, data: Partial<LessonSection>): Promise<LessonSection> {
    const allowed = ['heading', 'heading_en', 'body', 'body_en', 'safety_flag', 'sort_order']
    const fields  = Object.keys(data).filter(k => allowed.includes(k))
    if (fields.length === 0) throw Object.assign(new Error('No valid fields'), { statusCode: 400 })
    const values  = fields.map(f => (data as Record<string, unknown>)[f])
    const set     = fields.map(f => `${f} = ?`).join(', ')
    await pool.execute(`UPDATE lesson_sections SET ${set} WHERE id = ?`, [...values, sectionId])
    const [rows] = await pool.query('SELECT * FROM lesson_sections WHERE id = ?', [sectionId]) as [any[], any]
    return rows[0]
  }

  static async removeSection(sectionId: number): Promise<void> {
    await pool.execute('DELETE FROM lesson_sections WHERE id = ?', [sectionId])
  }

  static async reorderSections(lessonId: string, order: number[]): Promise<void> {
    // order is an array of section IDs in desired sort order
    const updates = order.map((id, idx) =>
      pool.execute('UPDATE lesson_sections SET sort_order = ? WHERE id = ? AND lesson_id = ?', [idx, id, lessonId]),
    )
    await Promise.all(updates)
  }
}
