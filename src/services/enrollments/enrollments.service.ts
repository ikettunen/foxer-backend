import pool from '../../config/db'

export const createEnrollment = async (data: { user_id: number; course_id: string; course_dates?: string }) => {
  const [result]: any = await pool.query(
    'INSERT INTO enrollments (user_id, course_id, course_dates) VALUES (?, ?, ?)',
    [data.user_id, data.course_id, data.course_dates ?? null]
  )
  return { id: result.insertId, ...data }
}

export const getEnrollments = async () => {
  const [rows] = await pool.query(`
    SELECT e.*, u.name AS user_name, u.email AS user_email
    FROM enrollments e
    JOIN users u ON u.id = e.user_id
    ORDER BY e.enrolled_at DESC
  `)
  return rows
}

export const getEnrollmentsByUser = async (userId: number) => {
  const [rows] = await pool.query(
    'SELECT * FROM enrollments WHERE user_id = ? AND unenrolled_at IS NULL',
    [userId]
  )
  return rows
}

export const unenroll = async (id: number) => {
  await pool.query('UPDATE enrollments SET unenrolled_at = NOW() WHERE id = ?', [id])
}

export const markEmailSent = async (id: number) => {
  await pool.query('UPDATE enrollments SET email_sent = 1, email_sent_at = NOW() WHERE id = ?', [id])
}

// Class wrapper for controller compatibility
export class EnrollmentsService {
  static async enroll(userId: number, courseId: string, courseDates?: string) {
    return createEnrollment({ user_id: userId, course_id: courseId, course_dates: courseDates })
  }
  static async getByUser(userId: number) {
    return getEnrollmentsByUser(userId)
  }
  static async list({ page, limit }: { page: number; limit: number }) {
    return getEnrollments()
  }
  static async unenroll(id: number) {
    return unenroll(id)
  }
}
