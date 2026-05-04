import pool from '../../config/db'
import { LogActionRequest, PostLocationRequest, StartSessionRequest, EndSessionRequest, LocationSession, LocationPoint, JwtPayload } from '../../types'

export class TrackingService {
  static async logAction(userId: number, data: LogActionRequest): Promise<void> {
    await pool.execute(
      'INSERT INTO user_actions (user_id, action_type, metadata_json, course_id, day_number) VALUES (?, ?, ?, ?, ?)',
      [userId, data.action_type, data.metadata ? JSON.stringify(data.metadata) : null, data.course_id || null, data.day_number || null],
    )
  }

  static async getActions(opts: {
    user_id?: number
    action_type?: string
    from?: string
    to?: string
    page: number
    limit: number
  }) {
    const conditions: string[] = []
    const params: unknown[] = []

    if (opts.user_id)     { conditions.push('user_id = ?');      params.push(opts.user_id) }
    if (opts.action_type) { conditions.push('action_type = ?');  params.push(opts.action_type) }
    if (opts.from)        { conditions.push('created_at >= ?');  params.push(opts.from) }
    if (opts.to)          { conditions.push('created_at <= ?');  params.push(opts.to) }

    const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : ''
    const offset = (opts.page - 1) * opts.limit

    const [rows]  = await pool.query(`SELECT * FROM user_actions ${where} ORDER BY created_at DESC LIMIT ? OFFSET ?`, [...params, opts.limit, offset]) as [any[], any]
    const [count] = await pool.query(`SELECT COUNT(*) AS total FROM user_actions ${where}`, params) as [any[], any]

    return { data: rows, total: count[0].total, page: opts.page, limit: opts.limit }
  }

  static async postLocation(userId: number, data: PostLocationRequest): Promise<void> {
    await pool.execute(
      'INSERT INTO location_points (session_id, user_id, lat, lng, altitude, accuracy, speed, heading, recorded_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)',
      [
        data.session_id, userId, data.lat, data.lng,
        data.altitude ?? null, data.accuracy ?? null, data.speed ?? null, data.heading ?? null,
        data.recorded_at ? new Date(data.recorded_at) : new Date(),
      ],
    )
  }

  static async getLatestLocation(userId: number): Promise<LocationPoint | null> {
    const [rows] = await pool.query(
      'SELECT * FROM location_points WHERE user_id = ? ORDER BY recorded_at DESC LIMIT 1',
      [userId],
    ) as [any[], any]
    return rows[0] ?? null
  }

  static async getSessionTrail(sessionId: number, requester: JwtPayload): Promise<LocationPoint[]> {
    const [sessions] = await pool.query('SELECT * FROM location_sessions WHERE id = ?', [sessionId]) as [any[], any]
    if (sessions.length === 0) throw Object.assign(new Error('Session not found'), { statusCode: 404 })

    const session = sessions[0] as LocationSession
    if (requester.role !== 'admin' && session.user_id !== requester.userId) {
      throw Object.assign(new Error('Access denied'), { statusCode: 403 })
    }

    const [rows] = await pool.query(
      'SELECT * FROM location_points WHERE session_id = ? ORDER BY recorded_at ASC',
      [sessionId],
    ) as [any[], any]
    return rows
  }

  static async startSession(userId: number, data: StartSessionRequest): Promise<LocationSession> {
    const [result] = await pool.execute(
      'INSERT INTO location_sessions (user_id, session_type, started_at, site_name) VALUES (?, ?, NOW(), ?)',
      [userId, data.session_type, data.site_name || null],
    ) as [any, any]
    const [rows] = await pool.query('SELECT * FROM location_sessions WHERE id = ?', [result.insertId]) as [any[], any]
    return rows[0]
  }

  static async endSession(userId: number, data: EndSessionRequest): Promise<void> {
    const [sessions] = await pool.query(
      'SELECT * FROM location_sessions WHERE id = ? AND user_id = ?',
      [data.session_id, userId],
    ) as [any[], any]
    if (sessions.length === 0) throw Object.assign(new Error('Session not found'), { statusCode: 404 })

    await pool.execute(
      'UPDATE location_sessions SET ended_at = NOW(), notes = ? WHERE id = ?',
      [data.notes || null, data.session_id],
    )
  }

  static async getLive(): Promise<LocationSession[]> {
    const [rows] = await pool.query(
      'SELECT * FROM location_sessions WHERE ended_at IS NULL ORDER BY started_at DESC',
    ) as [any[], any]
    return rows
  }
}
