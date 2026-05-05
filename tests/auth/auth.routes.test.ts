import request from 'supertest'
import jwt from 'jsonwebtoken'
import app from '../../src/app'

jest.mock('../../src/config/db', () => require('../__mocks__/db'))
jest.mock('../../src/services/notifications/notifications.service', () => require('../__mocks__/notifications'))

// Mock AuthService
jest.mock('../../src/services/auth/auth.service')

import { AuthService } from '../../src/services/auth/auth.service'

const MockAuthService = AuthService as jest.Mocked<typeof AuthService>

const fakeUser = {
  id: 1, name: 'Test User', email: 'test@test.com', role: 'student' as const,
  phone: null, locale: 'fi' as const, active: true, last_login: null,
  created_at: new Date(), updated_at: new Date(),
}

const fakeAuthResponse = {
  token: 'access-token',
  refreshToken: 'refresh-token',
  user: fakeUser,
}

function makeValidAccessToken(): string {
  return jwt.sign(
    { userId: 1, role: 'student', email: 'test@test.com' },
    process.env.JWT_SECRET!,
    { expiresIn: '15m' }
  )
}

describe('Auth routes (issues #13, #14)', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  // ─────────────────────────── POST /api/auth/register ───────────────────────────
  describe('POST /api/auth/register', () => {
    it('calls AuthService.register and returns 201 with valid body', async () => {
      MockAuthService.register.mockResolvedValueOnce(fakeAuthResponse)

      const res = await request(app)
        .post('/api/auth/register')
        .send({ name: 'Test User', email: 'test@test.com', password: 'password123' })

      expect(res.status).toBe(201)
      expect(MockAuthService.register).toHaveBeenCalledTimes(1)
      expect(res.body).toHaveProperty('token')
      expect(res.body).toHaveProperty('refreshToken')
    })

    it('returns 422 when required fields are missing', async () => {
      const res = await request(app)
        .post('/api/auth/register')
        .send({ email: 'test@test.com' }) // missing name and password

      expect(res.status).toBe(422)
      expect(MockAuthService.register).not.toHaveBeenCalled()
    })

    it('returns 422 when email is invalid', async () => {
      const res = await request(app)
        .post('/api/auth/register')
        .send({ name: 'Test', email: 'not-an-email', password: 'password123' })

      expect(res.status).toBe(422)
    })
  })

  // ─────────────────────────── POST /api/auth/login ───────────────────────────
  describe('POST /api/auth/login', () => {
    it('calls AuthService.login and returns 200 with valid body', async () => {
      MockAuthService.login.mockResolvedValueOnce(fakeAuthResponse)

      const res = await request(app)
        .post('/api/auth/login')
        .send({ email: 'test@test.com', password: 'password123' })

      expect(res.status).toBe(200)
      expect(MockAuthService.login).toHaveBeenCalledTimes(1)
      expect(res.body).toHaveProperty('token')
    })

    it('returns 422 when required fields are missing', async () => {
      const res = await request(app)
        .post('/api/auth/login')
        .send({ email: 'test@test.com' }) // missing password

      expect(res.status).toBe(422)
      expect(MockAuthService.login).not.toHaveBeenCalled()
    })
  })

  // ─────────────────────────── POST /api/auth/refresh ───────────────────────────
  describe('POST /api/auth/refresh', () => {
    it('calls AuthService.refresh and returns 200 with valid body', async () => {
      MockAuthService.refresh.mockResolvedValueOnce({ token: 'new-access-token' })

      const res = await request(app)
        .post('/api/auth/refresh')
        .send({ refreshToken: 'valid-refresh-token' })

      expect(res.status).toBe(200)
      expect(MockAuthService.refresh).toHaveBeenCalledWith('valid-refresh-token')
      expect(res.body).toHaveProperty('token')
    })
  })

  // ─────────────────────────── POST /api/auth/logout ───────────────────────────
  describe('POST /api/auth/logout', () => {
    it('returns 401 when no Authorization header is provided', async () => {
      const res = await request(app)
        .post('/api/auth/logout')
        .send({})

      expect(res.status).toBe(401)
      expect(MockAuthService.logout).not.toHaveBeenCalled()
    })

    it('calls AuthService.logout and returns 200 with valid auth token', async () => {
      MockAuthService.logout.mockResolvedValueOnce(undefined)

      const token = makeValidAccessToken()
      const res = await request(app)
        .post('/api/auth/logout')
        .set('Authorization', `Bearer ${token}`)
        .send({})

      expect(res.status).toBe(200)
      expect(MockAuthService.logout).toHaveBeenCalledTimes(1)
    })
  })

  // ─────────────────────────── POST /api/auth/forgot-password ───────────────────────────
  describe('POST /api/auth/forgot-password', () => {
    it('returns 200 with valid email', async () => {
      MockAuthService.forgotPassword.mockResolvedValueOnce(undefined)

      const res = await request(app)
        .post('/api/auth/forgot-password')
        .send({ email: 'user@test.com' })

      expect(res.status).toBe(200)
      expect(MockAuthService.forgotPassword).toHaveBeenCalledWith('user@test.com')
    })

    it('returns 422 when email is invalid', async () => {
      const res = await request(app)
        .post('/api/auth/forgot-password')
        .send({ email: 'not-an-email' })

      expect(res.status).toBe(422)
      expect(MockAuthService.forgotPassword).not.toHaveBeenCalled()
    })
  })

  // ─────────────────────────── POST /api/auth/reset-password ───────────────────────────
  describe('POST /api/auth/reset-password', () => {
    it('returns 200 with valid token and password', async () => {
      MockAuthService.resetPassword.mockResolvedValueOnce(undefined)

      const res = await request(app)
        .post('/api/auth/reset-password')
        .send({ token: 'valid-reset-token', password: 'newpassword123' })

      expect(res.status).toBe(200)
      expect(MockAuthService.resetPassword).toHaveBeenCalledWith('valid-reset-token', 'newpassword123')
    })

    it('returns 422 when password is too short (less than 8 chars)', async () => {
      const res = await request(app)
        .post('/api/auth/reset-password')
        .send({ token: 'valid-reset-token', password: 'short' })

      expect(res.status).toBe(422)
      expect(MockAuthService.resetPassword).not.toHaveBeenCalled()
    })
  })
})
