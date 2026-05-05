import { UsersService } from '../../src/services/users/users.service'

jest.mock('../../src/config/db', () => require('../__mocks__/db'))

import pool from '../../src/config/db'

const mockPool = pool as jest.Mocked<typeof pool>

const fakeUserRow = {
  id: 1,
  name: 'Test User',
  email: 'test@test.com',
  role: 'student',
  phone: null,
  locale: 'fi',
  active: 1,
  last_login: null,
  created_at: new Date('2024-01-01'),
  updated_at: new Date('2024-01-01'),
}

describe('UsersService (issue #15)', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  // ─────────────────────────── list ───────────────────────────
  describe('list', () => {
    it('returns paginated user list with defaults', async () => {
      mockPool.query
        .mockResolvedValueOnce([[fakeUserRow, { ...fakeUserRow, id: 2, name: 'User 2' }], {}] as any)
        .mockResolvedValueOnce([[{ total: 2 }], {}] as any)

      const result = await UsersService.list({})

      expect(result.data).toHaveLength(2)
      expect(result.total).toBe(2)
      expect(result.page).toBe(1)
      expect(result.limit).toBe(20)
    })

    it('applies page and limit correctly', async () => {
      mockPool.query
        .mockResolvedValueOnce([[fakeUserRow], {}] as any)
        .mockResolvedValueOnce([[{ total: 10 }], {}] as any)

      const result = await UsersService.list({ page: 2, limit: 5 })

      expect(result.page).toBe(2)
      expect(result.limit).toBe(5)

      // Verify OFFSET is passed correctly
      const queryCall = mockPool.query.mock.calls[0]
      expect(queryCall[1]).toEqual([5, 5]) // limit=5, offset=(2-1)*5=5
    })

    it('maps rows to PublicUser correctly', async () => {
      mockPool.query
        .mockResolvedValueOnce([[fakeUserRow], {}] as any)
        .mockResolvedValueOnce([[{ total: 1 }], {}] as any)

      const result = await UsersService.list({})

      expect(result.data[0]).toMatchObject({
        id: 1,
        name: 'Test User',
        email: 'test@test.com',
        role: 'student',
        active: true,
      })
      // Should not expose password_hash
      expect(result.data[0]).not.toHaveProperty('password_hash')
    })
  })

  // ─────────────────────────── getById ───────────────────────────
  describe('getById', () => {
    it('returns a user by id', async () => {
      mockPool.query.mockResolvedValueOnce([[fakeUserRow], {}] as any)

      const user = await UsersService.getById(1)

      expect(user).toMatchObject({ id: 1, email: 'test@test.com' })
    })

    it('throws 404 if user not found', async () => {
      mockPool.query.mockResolvedValueOnce([[], {}] as any)

      await expect(UsersService.getById(999)).rejects.toMatchObject({ statusCode: 404 })
    })
  })

  // ─────────────────────────── update ───────────────────────────
  describe('update', () => {
    it('updates allowed fields and returns updated user', async () => {
      mockPool.execute.mockResolvedValueOnce([{ affectedRows: 1 }, {}] as any)
      mockPool.query.mockResolvedValueOnce([[{ ...fakeUserRow, name: 'Updated Name' }], {}] as any)

      const user = await UsersService.update(1, { name: 'Updated Name' })

      expect(user.name).toBe('Updated Name')
      expect(mockPool.execute).toHaveBeenCalledTimes(1)
      const call = mockPool.execute.mock.calls[0]
      expect(call[0]).toContain('UPDATE users SET')
      expect(call[0]).toContain('updated_at')
    })

    it('throws 400 when no valid fields are provided', async () => {
      await expect(
        UsersService.update(1, { email: 'new@test.com' } as any)
      ).rejects.toMatchObject({ statusCode: 400 })

      expect(mockPool.execute).not.toHaveBeenCalled()
    })

    it('throws 404 if user not found after update', async () => {
      mockPool.execute.mockResolvedValueOnce([{ affectedRows: 0 }, {}] as any)
      mockPool.query.mockResolvedValueOnce([[], {}] as any) // getById returns nothing

      await expect(
        UsersService.update(999, { name: 'Ghost' })
      ).rejects.toMatchObject({ statusCode: 404 })
    })
  })

  // ─────────────────────────── deactivate ───────────────────────────
  describe('deactivate', () => {
    it('calls execute with active=0', async () => {
      mockPool.execute.mockResolvedValueOnce([{ affectedRows: 1 }, {}] as any)

      await UsersService.deactivate(1)

      expect(mockPool.execute).toHaveBeenCalledTimes(1)
      const call = mockPool.execute.mock.calls[0]
      expect(call[0]).toContain('active = 0')
      expect(call[1]).toContain(1)
    })

    it('resolves without error even when user does not exist', async () => {
      mockPool.execute.mockResolvedValueOnce([{ affectedRows: 0 }, {}] as any)

      await expect(UsersService.deactivate(999)).resolves.toBeUndefined()
    })
  })
})
