import bcrypt from 'bcryptjs'
import jwt from 'jsonwebtoken'
import crypto from 'crypto'
import pool from '../../config/db'
import { RegisterRequest, LoginRequest, AuthResponse, PublicUser, JwtPayload } from '../../types'
import { sendPasswordResetEmail } from '../notifications/notifications.service'

function signAccess(payload: JwtPayload): string {
  return jwt.sign(payload, process.env.JWT_SECRET!, { expiresIn: process.env.JWT_EXPIRES_IN || '1h' } as jwt.SignOptions)
}

function signRefresh(payload: JwtPayload): string {
  return jwt.sign(payload, process.env.JWT_REFRESH_SECRET!, { expiresIn: '30d' } as jwt.SignOptions)
}

function toPublicUser(row: Record<string, unknown>): PublicUser {
  return {
    id:          row.id as number,
    name:        row.name as string,
    email:       row.email as string,
    role:        row.role as PublicUser['role'],
    phone:       row.phone as string | null,
    locale:      row.locale as PublicUser['locale'],
    active:      Boolean(row.active),
    last_login:  row.last_login as Date | null,
    created_at:  row.created_at as Date,
    updated_at:  row.updated_at as Date,
  }
}

export class AuthService {
  static async register(data: RegisterRequest): Promise<AuthResponse> {
    const [existing] = await pool.query('SELECT id FROM users WHERE email = ?', [data.email]) as [any[], any]
    if (existing.length > 0) {
      const err = Object.assign(new Error('Email already in use'), { statusCode: 409 })
      throw err
    }

    const hash = await bcrypt.hash(data.password, 12)
    const [result] = await pool.execute(
      'INSERT INTO users (name, email, password_hash, role, locale) VALUES (?, ?, ?, ?, ?)',
      [data.name, data.email, hash, 'student', data.locale || 'fi'],
    ) as [any, any]

    const userId = result.insertId
    const [rows] = await pool.query('SELECT * FROM users WHERE id = ?', [userId]) as [any[], any]
    const user = toPublicUser(rows[0])

    const jwtPayload: JwtPayload = { userId, role: user.role, email: user.email }
    const token = signAccess(jwtPayload)
    const refreshToken = signRefresh(jwtPayload)

    const tokenHash = crypto.createHash('sha256').update(refreshToken).digest('hex')
    const expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)
    await pool.execute(
      'INSERT INTO refresh_tokens (user_id, token_hash, expires_at) VALUES (?, ?, ?)',
      [userId, tokenHash, expiresAt],
    )

    return { token, refreshToken, user }
  }

  static async login(data: LoginRequest): Promise<AuthResponse> {
    const [rows] = await pool.query('SELECT * FROM users WHERE email = ? AND active = 1', [data.email]) as [any[], any]
    if (rows.length === 0) {
      throw Object.assign(new Error('Invalid credentials'), { statusCode: 401 })
    }
    const row = rows[0]
    const valid = await bcrypt.compare(data.password, row.password_hash)
    if (!valid) throw Object.assign(new Error('Invalid credentials'), { statusCode: 401 })

    await pool.execute('UPDATE users SET last_login = NOW() WHERE id = ?', [row.id])

    const jwtPayload: JwtPayload = { userId: row.id, role: row.role, email: row.email }
    const token = signAccess(jwtPayload)
    const refreshToken = signRefresh(jwtPayload)

    const tokenHash = crypto.createHash('sha256').update(refreshToken).digest('hex')
    const expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)
    await pool.execute(
      'INSERT INTO refresh_tokens (user_id, token_hash, expires_at) VALUES (?, ?, ?)',
      [row.id, tokenHash, expiresAt],
    )

    return { token, refreshToken, user: toPublicUser(row) }
  }

  static async refresh(refreshToken: string): Promise<{ token: string }> {
    let payload: JwtPayload
    try {
      payload = jwt.verify(refreshToken, process.env.JWT_REFRESH_SECRET!) as JwtPayload
    } catch {
      throw Object.assign(new Error('Invalid refresh token'), { statusCode: 401 })
    }

    const tokenHash = crypto.createHash('sha256').update(refreshToken).digest('hex')
    const [rows] = await pool.query(
      'SELECT * FROM refresh_tokens WHERE token_hash = ? AND revoked = 0 AND expires_at > NOW()',
      [tokenHash],
    ) as [any[], any]
    if (rows.length === 0) throw Object.assign(new Error('Refresh token expired or revoked'), { statusCode: 401 })

    const token = signAccess({ userId: payload.userId, role: payload.role, email: payload.email })
    return { token }
  }

  static async logout(userId: number, refreshToken?: string): Promise<void> {
    if (refreshToken) {
      const tokenHash = crypto.createHash('sha256').update(refreshToken).digest('hex')
      await pool.execute('UPDATE refresh_tokens SET revoked = 1 WHERE token_hash = ?', [tokenHash])
    } else {
      await pool.execute('UPDATE refresh_tokens SET revoked = 1 WHERE user_id = ?', [userId])
    }
  }

  static async forgotPassword(email: string): Promise<void> {
    const [rows] = await pool.query('SELECT id FROM users WHERE email = ? AND active = 1', [email]) as [any[], any]
    if (rows.length === 0) return   // silent — don't leak existence

    const token = crypto.randomBytes(32).toString('hex')
    const tokenHash = crypto.createHash('sha256').update(token).digest('hex')
    const expiresAt = new Date(Date.now() + 60 * 60 * 1000)  // 1h

    await pool.execute(
      'INSERT INTO password_resets (user_id, token_hash, expires_at) VALUES (?, ?, ?)',
      [rows[0].id, tokenHash, expiresAt],
    )

    await sendPasswordResetEmail(email, token)
  }

  static async resetPassword(token: string, newPassword: string): Promise<void> {
    const tokenHash = crypto.createHash('sha256').update(token).digest('hex')
    const [rows] = await pool.query(
      'SELECT * FROM password_resets WHERE token_hash = ? AND used = 0 AND expires_at > NOW()',
      [tokenHash],
    ) as [any[], any]
    if (rows.length === 0) throw Object.assign(new Error('Invalid or expired reset token'), { statusCode: 400 })

    const hash = await bcrypt.hash(newPassword, 12)
    await pool.execute('UPDATE users SET password_hash = ?, updated_at = NOW() WHERE id = ?', [hash, rows[0].user_id])
    await pool.execute('UPDATE password_resets SET used = 1 WHERE id = ?', [rows[0].id])
  }
}
