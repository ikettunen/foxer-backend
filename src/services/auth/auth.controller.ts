import { Request, Response, NextFunction } from 'express'
import { AuthService } from './auth.service'
import { RegisterRequest, LoginRequest, RefreshRequest, ForgotPasswordRequest, ResetPasswordRequest } from '../../types'

export class AuthController {
  static async register(req: Request, res: Response, next: NextFunction) {
    try {
      const body = req.body as RegisterRequest
      const result = await AuthService.register(body)
      res.status(201).json(result)
    } catch (err) { next(err) }
  }

  static async login(req: Request, res: Response, next: NextFunction) {
    try {
      const body = req.body as LoginRequest
      const result = await AuthService.login(body)
      res.json(result)
    } catch (err) { next(err) }
  }

  static async refresh(req: Request, res: Response, next: NextFunction) {
    try {
      const body = req.body as RefreshRequest
      const result = await AuthService.refresh(body.refreshToken)
      res.json(result)
    } catch (err) { next(err) }
  }

  static async logout(req: Request, res: Response, next: NextFunction) {
    try {
      const refreshToken = req.body?.refreshToken as string | undefined
      await AuthService.logout(req.user!.userId, refreshToken)
      res.json({ message: 'Logged out' })
    } catch (err) { next(err) }
  }

  static async forgotPassword(req: Request, res: Response, next: NextFunction) {
    try {
      const body = req.body as ForgotPasswordRequest
      await AuthService.forgotPassword(body.email)
      res.json({ message: 'If that email exists, a reset link has been sent' })
    } catch (err) { next(err) }
  }

  static async resetPassword(req: Request, res: Response, next: NextFunction) {
    try {
      const body = req.body as ResetPasswordRequest
      await AuthService.resetPassword(body.token, body.password)
      res.json({ message: 'Password updated' })
    } catch (err) { next(err) }
  }
}
