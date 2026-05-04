import pool from '../../config/db'
import { Progress } from '../../types'

export class ProgressService {
  static async getByUser(userId: number): Promise<Progress[]> {
    const [rows] = await pool.query(
      'SELECT * FROM progress WHERE user_id = ? ORDER BY course_id ASC, day_number ASC',
      [userId],
    ) as [any[], any]
    return rows
  }

  static async getCourseProgress(userId: number, courseId: string): Promise<{ percent: number; days: Progress[] }> {
    const [days]  = await pool.query('SELECT day_number FROM course_days WHERE course_id = ?', [courseId]) as [any[], any]
    const total   = days.length
    const [rows]  = await pool.query(
      'SELECT * FROM progress WHERE user_id = ? AND course_id = ? ORDER BY day_number ASC',
      [userId, courseId],
    ) as [any[], any]
    const done    = rows.filter((r: any) => r.completed_at).length
    const percent = total > 0 ? Math.round((done / total) * 100) : 0
    return { percent, days: rows }
  }

  static async markReading(userId: number, courseId: string, dayNumber: number): Promise<void> {
    await pool.execute(
      `INSERT INTO progress (user_id, course_id, day_number, reading_done, reading_at)
       VALUES (?, ?, ?, 1, NOW())
       ON DUPLICATE KEY UPDATE reading_done = 1, reading_at = NOW()`,
      [userId, courseId, dayNumber],
    )
  }

  static async markDay(userId: number, courseId: string, dayNumber: number): Promise<void> {
    await pool.execute(
      `INSERT INTO progress (user_id, course_id, day_number, completed_at)
       VALUES (?, ?, ?, NOW())
       ON DUPLICATE KEY UPDATE completed_at = NOW()`,
      [userId, courseId, dayNumber],
    )
  }
}
