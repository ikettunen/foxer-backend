import bcrypt from 'bcryptjs'
import jwt from 'jsonwebtoken'
import { AuthService } from '../../src/services/auth/auth.service'

jest.mock('../../src/config/db', () => require('../__mocks__/db'))
jest.mock('../../src/services/notifications/notifications.service', () => require('../__mocks__/notifications'))

import pool from '../../src/config/db'
import { sendPasswordResetEmail } from '../../src/services/notifications/notifications.service'

const mockPool = pool as jest.Mocked<typeof pool>
const mockSendPasswordResetEmail = sendPasswordResetEmail as jest.Mock

describe('AuthService (issues #13, #14)', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  // ─────────────────────────── register ───────────────────────────
  describe('register', () => {
    it('throws 409 if email already exists', async () => {
      mockPool.query.mockResolvedValueOnce([[{ id: 1 }], {}] as any)

      await expect(
        AuthService.register({ name: 'Test', email: 'exists@test.com', password: 'password123' })
      ).rejects.toMatchObject({ statusCode: 409 })
    })

    it('creates user, hashes password, stores refresh token, returns token and user', async () => {
      // 1st query: check existing -> not found
      mockPool.query.mockResolvedValueOnce([[], {}] as any)
      // execute: INSERT INTO users
      mockPool.execute.mockResolvedValueOnce([{ insertId: 42 }, {}] as any)
      // 2nd query: SELECT * FROM users WHERE id = 42
      mockPool.query.mockResolvedValueOnce([[{
        id: 42, name: 'New User', email: 'new@test.com', role: 'student',
        phone: null, locale: 'fi', active: 1, last_login: null,
        created_at: new Date(), updated_at: new Date(),
      }], {}] as any)
      // execute: INSERT INTO refresh_tokens
      mockPool.execute.mockResolvedValueOnce([{ insertId: 1 }, {}] as any)

      const result = await AuthService.register({
        name: 'New User',
        email: 'new@test.com',
        password: 'Password123!',
        locale: 'fi',
      })

      expect(result).toHaveProperty('token')
      expect(result).toHaveProperty('refreshToken')
      expect(result.user).toMatchObject({ id: 42, email: 'new@test.com', role: 'student' })

      // Verify bcrypt was used (execute called with a hash, not plaintext)
      const insertCall = mockPool.execute.mock.calls[0]
      const storedHash = (insertCall[1] as any)[2] as string
      expect(storedHash).not.toBe('Password123!')
      expect(await bcrypt.compare('Password123!', storedHash)).toBe(true)
    })
  })

  // ─────────────────────────── login ───────────────────────────
  describe('login', () => {
    it('throws 401 for unknown email', async () => {
      mockPool.query.mockResolvedValueOnce([[], {}] as any)

      await expect(
        AuthService.login({ email: 'unknown@test.com', password: 'pass' })
      ).rejects.toMatchObject({ statusCode: 401 })
    })

    it('throws 401 for wrong password', async () => {
      const hash = await bcrypt.hash('correct-password', 1)
      mockPool.query.mockResolvedValueOnce([[{
        id: 1, email: 'user@test.com', password_hash: hash,
        name: 'User', role: 'student', phone: null, locale: 'fi',
        active: 1, last_login: null, created_at: new Date(), updated_at: new Date(),
      }], {}] as any)

      await expect(
        AuthService.login({ email: 'user@test.com', password: 'wrong-password' })
      ).rejects.toMatchObject({ statusCode: 401 })
    })

    it('returns tokens and user on valid credentials', async () => {
      const hash = await bcrypt.hash('good-password', 1)
      const userRow = {
        id: 5, email: 'user@test.com', password_hash: hash,
        name: 'User', role: 'student', phone: null, locale: 'fi',
        active: 1, last_login: null, created_at: new Date(), updated_at: new Date(),
      }
      mockPool.query.mockResolvedValueOnce([[userRow], {}] as any)
      mockPool.execute.mockResolvedValueOnce([{ affectedRows: 1 }, {}] as any) // UPDATE last_login
      mockPool.execute.mockResolvedValueOnce([{ insertId: 10 }, {}] as any)   // INSERT refresh token

      const result = await AuthService.login({ email: 'user@test.com', password: 'good-password' })

      expect(result).toHaveProperty('token')
      expect(result).toHaveProperty('refreshToken')
      expect(result.user.id).toBe(5)
    })
  })

  // ─────────────────────────── refresh ───────────────────────────
  describe('refresh', () => {
    it('throws 401 for an invalid (non-JWT) refresh token', async () => {
      await expect(
        AuthService.refresh('not-a-valid-token')
      ).rejects.toMatchObject({ statusCode: 401 })
    })

    it('throws 401 when token is revoked or expired in DB', async () => {
      const validToken = jwt.sign(
        { userId: 1, role: 'student', email: 'u@test.com' },
        process.env.JWT_REFRESH_SECRET!,
        { expiresIn: '1d' }
      )
      // DB returns no rows (revoked / expired)
      mockPool.query.mockResolvedValueOnce([[], {}] as any)

      await expect(
        AuthService.refresh(validToken)
      ).rejects.toMatchObject({ statusCode: 401 })
    })

    it('returns new access token for a valid refresh token', async () => {
      const validToken = jwt.sign(
        { userId: 1, role: 'student', email: 'u@test.com' },
        process.env.JWT_REFRESH_SECRET!,
        { expiresIn: '1d' }
      )
      mockPool.query.mockResolvedValueOnce([[{ id: 1, user_id: 1 }], {}] as any)

      const result = await AuthService.refresh(validToken)
      expect(result).toHaveProperty('token')

      // Verify the returned access token is valid
      const decoded = jwt.verify(result.token, process.env.JWT_SECRET!) as any
      expect(decoded.userId).toBe(1)
    })
  })

  // ─────────────────────────── logout ───────────────────────────
  describe('logout', () => {
    it('revokes specific token when refreshToken is provided', async () => {
      mockPool.execute.mockResolvedValueOnce([{ affectedRows: 1 }, {}] as any)

      await AuthService.logout(1, 'some-refresh-token')

      const call = mockPool.execute.mock.calls[0]
      expect(call[0]).toContain('token_hash')
      expect(call[0]).not.toContain('user_id')
    })

    it('revokes all user tokens when no refreshToken is provided', async () => {
      mockPool.execute.mockResolvedValueOnce([{ affectedRows: 3 }, {}] as any)

      await AuthService.logout(5)

      const call = mockPool.execute.mock.calls[0]
      expect(call[0]).toContain('user_id')
    })
  })

  // ─────────────────────────── forgotPassword ───────────────────────────
  describe('forgotPassword', () => {
    it('returns void without error even when email is not found', async () => {
      mockPool.query.mockResolvedValueOnce([[], {}] as any)

      await expect(
        AuthService.forgotPassword('notfound@test.com')
      ).resolves.toBeUndefined()

      expect(mockSendPasswordResetEmail).not.toHaveBeenCalled()
    })

    it('stores reset token and sends email when user is found', async () => {
      mockPool.query.mockResolvedValueOnce([[{ id: 7 }], {}] as any)
      mockPool.execute.mockResolvedValueOnce([{ insertId: 1 }, {}] as any)
      mockSendPasswordResetEmail.mockResolvedValueOnce(undefined)

      await AuthService.forgotPassword('user@test.com')

      expect(mockPool.execute).toHaveBeenCalledTimes(1)
      const insertCall = mockPool.execute.mock.calls[0]
      expect(insertCall[0]).toContain('password_resets')

      expect(mockSendPasswordResetEmail).toHaveBeenCalledTimes(1)
      const emailCall = mockSendPasswordResetEmail.mock.calls[0][0]
      expect(emailCall.to).toBe('user@test.com')
      expect(emailCall.resetUrl).toContain('reset-password')
    })
  })

  // ─────────────────────────── resetPassword ───────────────────────────
  describe('resetPassword', () => {
    it('throws 400 for invalid or expired token', async () => {
      mockPool.query.mockResolvedValueOnce([[], {}] as any)

      await expect(
        AuthService.resetPassword('invalid-token', 'newpass123')
      ).rejects.toMatchObject({ statusCode: 400 })
    })

    it('updates password hash and marks token as used', async () => {
      mockPool.query.mockResolvedValueOnce([[{
        id: 3, user_id: 10, token_hash: 'hash', used: 0, expires_at: new Date(Date.now() + 60000)
      }], {}] as any)
      mockPool.execute
        .mockResolvedValueOnce([{ affectedRows: 1 }, {}] as any)  // UPDATE users
        .mockResolvedValueOnce([{ affectedRows: 1 }, {}] as any)  // UPDATE password_resets

      await expect(
        AuthService.resetPassword('valid-token', 'NewPassword123!')
      ).resolves.toBeUndefined()

      // First execute: UPDATE users SET password_hash
      const updateUsersCall = mockPool.execute.mock.calls[0]
      expect(updateUsersCall[0]).toContain('UPDATE users')
      const newHash = (updateUsersCall[1] as any)[0] as string
      expect(await bcrypt.compare('NewPassword123!', newHash)).toBe(true)

      // Second execute: mark token used
      const markUsedCall = mockPool.execute.mock.calls[1]
      expect(markUsedCall[0]).toContain('used = 1')
    })
  })
})
