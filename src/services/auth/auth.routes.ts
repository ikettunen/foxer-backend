import { Router } from 'express'
import { AuthController } from './auth.controller'
import { validate } from '../../middleware/validate'
import { authenticate } from '../../middleware/auth'
import { z } from 'zod'

const router = Router()

const registerSchema = z.object({
  name:     z.string().min(2).max(100),
  email:    z.string().email(),
  password: z.string().min(8).max(100),
  locale:   z.enum(['fi', 'en']).optional(),
})

const loginSchema = z.object({
  email:    z.string().email(),
  password: z.string().min(1),
})

const refreshSchema = z.object({
  refreshToken: z.string().min(1),
})

const forgotSchema = z.object({
  email: z.string().email(),
})

const resetSchema = z.object({
  token:    z.string().min(1),
  password: z.string().min(8).max(100),
})

router.post('/register',        validate(registerSchema), AuthController.register)
router.post('/login',           validate(loginSchema),    AuthController.login)
router.post('/refresh',         validate(refreshSchema),  AuthController.refresh)
router.post('/logout',          authenticate,             AuthController.logout)
router.post('/forgot-password', validate(forgotSchema),   AuthController.forgotPassword)
router.post('/reset-password',  validate(resetSchema),    AuthController.resetPassword)

export default router
