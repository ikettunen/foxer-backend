import pool from '../../config/db'
import { PublicUser, PaginatedResponse, PaginationQuery } from '../../types'

function toPublicUser(row: Record<string, unknown>): PublicUser {
  return {
    id:         row.id as number,
    name:       row.name as string,
    email:      row.email as string,
    role:       row.role as PublicUser['role'],
    phone:      row.phone as string | null,
    locale:     row.locale as PublicUser['locale'],
    active:     Boolean(row.active),
    last_login: row.last_login as Date | null,
    created_at: row.created_at as Date,
    updated_at: row.updated_at as Date,
  }
}

export class UsersService {
  static async list({ page, limit }: PaginationQuery): Promise<PaginatedResponse<PublicUser>> {
    const p = page  || 1
    const l = limit || 20
    const offset = (p - 1) * l

    const [rows]  = await pool.query('SELECT * FROM users ORDER BY created_at DESC LIMIT ? OFFSET ?', [l, offset]) as [any[], any]
    const [count] = await pool.query('SELECT COUNT(*) AS total FROM users') as [any[], any]

    return {
      data:  rows.map(toPublicUser),
      total: count[0].total,
      page:  p,
      limit: l,
    }
  }

  static async getById(id: number): Promise<PublicUser> {
    const [rows] = await pool.query('SELECT * FROM users WHERE id = ?', [id]) as [any[], any]
    if (rows.length === 0) throw Object.assign(new Error('User not found'), { statusCode: 404 })
    return toPublicUser(rows[0])
  }

  static async update(id: number, data: Partial<Pick<PublicUser, 'name' | 'phone' | 'locale'>>): Promise<PublicUser> {
    const allowed = ['name', 'phone', 'locale']
    const fields  = Object.keys(data).filter(k => allowed.includes(k))
    if (fields.length === 0) throw Object.assign(new Error('No valid fields to update'), { statusCode: 400 })

    const values = fields.map(f => (data as Record<string, unknown>)[f])
    const setClause = fields.map(f => `${f} = ?`).join(', ')
    await pool.execute(`UPDATE users SET ${setClause}, updated_at = NOW() WHERE id = ?`, [...values, id])
    return this.getById(id)
  }

  static async deactivate(id: number): Promise<void> {
    await pool.execute('UPDATE users SET active = 0, updated_at = NOW() WHERE id = ?', [id])
  }
}
