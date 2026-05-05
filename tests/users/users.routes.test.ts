import request from 'supertest'
import jwt from 'jsonwebtoken'
import app from '../../src/app'

jest.mock('../../src/config/db', () => require('../__mocks__/db'))
jest.mock('../../src/services/users/users.service')

import { UsersService } from '../../src/services/users/users.service'

const MockUsersService = UsersService as jest.Mocked<typeof UsersService>

const fakeUser = {
  id: 1,
  name: 'Test User',
  email: 'test@test.com',
  role: 'student' as const,
  phone: null,
  locale: 'fi' as const,
  active: true,
  last_login: null,
  created_at: new Date(),
  updated_at: new Date(),
}

const fakeAdmin = { ...fakeUser, id: 2, role: 'admin' as const, email: 'admin@test.com' }

function makeToken(role: 'student' | 'admin' = 'student', userId = 1) {
  return jwt.sign({ userId, role, email: 'test@test.com' }, process.env.JWT_SECRET!, { expiresIn: '1h' })
}

describe('Users routes (issue #15)', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  // ─────────────────────────── GET /api/users/me ───────────────────────────
  describe('GET /api/users/me', () => {
    it('returns 401 without auth', async () => {
      const res = await request(app).get('/api/users/me')
      expect(res.status).toBe(401)
    })

    it('returns 200 with current user data', async () => {
      MockUsersService.getById.mockResolvedValueOnce(fakeUser)

      const token = makeToken('student', 1)
      const res = await request(app)
        .get('/api/users/me')
        .set('Authorization', `Bearer ${token}`)

      expect(res.status).toBe(200)
      expect(res.body).toMatchObject({ id: 1, email: 'test@test.com' })
      expect(MockUsersService.getById).toHaveBeenCalledWith(1)
    })
  })

  // ─────────────────────────── GET /api/users ───────────────────────────
  describe('GET /api/users', () => {
    it('returns 401 without auth', async () => {
      const res = await request(app).get('/api/users')
      expect(res.status).toBe(401)
    })

    it('returns 403 for student role', async () => {
      const token = makeToken('student', 1)
      const res = await request(app)
        .get('/api/users')
        .set('Authorization', `Bearer ${token}`)

      expect(res.status).toBe(403)
    })

    it('returns 200 with paginated list for admin', async () => {
      MockUsersService.list.mockResolvedValueOnce({
        data: [fakeAdmin],
        total: 1,
        page: 1,
        limit: 20,
      })

      const token = makeToken('admin', 2)
      const res = await request(app)
        .get('/api/users')
        .set('Authorization', `Bearer ${token}`)

      expect(res.status).toBe(200)
      expect(res.body).toHaveProperty('data')
      expect(res.body).toHaveProperty('total')
      expect(MockUsersService.list).toHaveBeenCalledTimes(1)
    })
  })

  // ─────────────────────────── GET /api/users/:id ───────────────────────────
  describe('GET /api/users/:id', () => {
    it('returns 401 without auth', async () => {
      const res = await request(app).get('/api/users/1')
      expect(res.status).toBe(401)
    })

    it('returns 403 when student tries to view another user', async () => {
      const token = makeToken('student', 1)
      const res = await request(app)
        .get('/api/users/99')
        .set('Authorization', `Bearer ${token}`)

      expect(res.status).toBe(403)
    })

    it('returns 200 for admin viewing any user', async () => {
      MockUsersService.getById.mockResolvedValueOnce(fakeUser)

      const token = makeToken('admin', 2)
      const res = await request(app)
        .get('/api/users/1')
        .set('Authorization', `Bearer ${token}`)

      expect(res.status).toBe(200)
    })

    it('returns 200 for student viewing themselves', async () => {
      MockUsersService.getById.mockResolvedValueOnce(fakeUser)

      const token = makeToken('student', 1)
      const res = await request(app)
        .get('/api/users/1')
        .set('Authorization', `Bearer ${token}`)

      expect(res.status).toBe(200)
    })
  })

  // ─────────────────────────── PATCH /api/users/:id (PUT) ───────────────────────────
  describe('PUT /api/users/:id', () => {
    it('returns 401 without auth', async () => {
      const res = await request(app).put('/api/users/1').send({ name: 'New' })
      expect(res.status).toBe(401)
    })

    it('returns 200 when admin updates a user', async () => {
      MockUsersService.update.mockResolvedValueOnce({ ...fakeUser, name: 'Updated' })

      const token = makeToken('admin', 2)
      const res = await request(app)
        .put('/api/users/1')
        .set('Authorization', `Bearer ${token}`)
        .send({ name: 'Updated' })

      expect(res.status).toBe(200)
      expect(MockUsersService.update).toHaveBeenCalledWith(1, { name: 'Updated' })
    })

    it('returns 200 when a student updates themselves', async () => {
      MockUsersService.update.mockResolvedValueOnce({ ...fakeUser, phone: '+1234' })

      const token = makeToken('student', 1)
      const res = await request(app)
        .put('/api/users/1')
        .set('Authorization', `Bearer ${token}`)
        .send({ phone: '+1234' })

      expect(res.status).toBe(200)
    })

    it('returns 403 when student tries to update another user', async () => {
      const token = makeToken('student', 1)
      const res = await request(app)
        .put('/api/users/99')
        .set('Authorization', `Bearer ${token}`)
        .send({ name: 'Hacker' })

      expect(res.status).toBe(403)
    })
  })

  // ─────────────────────────── DELETE /api/users/:id ───────────────────────────
  describe('DELETE /api/users/:id', () => {
    it('returns 401 without auth', async () => {
      const res = await request(app).delete('/api/users/1')
      expect(res.status).toBe(401)
    })

    it('returns 403 for student role', async () => {
      const token = makeToken('student', 1)
      const res = await request(app)
        .delete('/api/users/1')
        .set('Authorization', `Bearer ${token}`)

      expect(res.status).toBe(403)
    })

    it('returns 200 when admin deactivates a user', async () => {
      MockUsersService.deactivate.mockResolvedValueOnce(undefined)

      const token = makeToken('admin', 2)
      const res = await request(app)
        .delete('/api/users/1')
        .set('Authorization', `Bearer ${token}`)

      expect(res.status).toBe(200)
      expect(MockUsersService.deactivate).toHaveBeenCalledWith(1)
    })
  })
})
