import request from 'supertest'
import app from '../../src/app'

jest.mock('../../src/config/db', () => require('../__mocks__/db'))

describe('App middleware (issue #11)', () => {
  describe('GET /health', () => {
    it('should return 200 with status ok', async () => {
      const res = await request(app).get('/health')
      expect(res.status).toBe(200)
      expect(res.body).toMatchObject({ status: 'ok' })
    })
  })

  describe('GET /nonexistent', () => {
    it('should return 404 for unknown routes', async () => {
      const res = await request(app).get('/this-route-does-not-exist')
      expect(res.status).toBe(404)
    })
  })

  describe('Security headers (helmet)', () => {
    it('should include security headers from helmet', async () => {
      const res = await request(app).get('/health')
      const hasSecurityHeader =
        res.headers['x-frame-options'] !== undefined ||
        res.headers['x-content-type-options'] !== undefined ||
        res.headers['x-dns-prefetch-control'] !== undefined
      expect(hasSecurityHeader).toBe(true)
    })
  })

  describe('CORS', () => {
    it('should allow requests from https://ilkkavesa.github.io', async () => {
      const res = await request(app)
        .get('/health')
        .set('Origin', 'https://ilkkavesa.github.io')
      expect(res.headers['access-control-allow-origin']).toBe('https://ilkkavesa.github.io')
    })

    it('should not include CORS header for disallowed origins', async () => {
      const res = await request(app)
        .get('/health')
        .set('Origin', 'https://evil.attacker.com')
      expect(res.headers['access-control-allow-origin']).toBeUndefined()
    })
  })

  describe('Invalid JSON body', () => {
    it('should return 400 or 422 for invalid JSON body on POST', async () => {
      const res = await request(app)
        .post('/api/auth/login')
        .set('Content-Type', 'application/json')
        .send('{ this is not valid json }')
      expect([400, 422]).toContain(res.status)
    })
  })
})
