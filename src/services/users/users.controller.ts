import { Request, Response, NextFunction } from 'express'
import { UsersService } from './users.service'

export class UsersController {
  static async list(req: Request, res: Response, next: NextFunction) {
    try {
      const page  = parseInt(req.query.page  as string || '1', 10)
      const limit = parseInt(req.query.limit as string || '20', 10)
      const result = await UsersService.list({ page, limit })
      res.json(result)
    } catch (err) { next(err) }
  }

  static async getMe(req: Request, res: Response, next: NextFunction) {
    try {
      const user = await UsersService.getById(req.user!.userId)
      res.json(user)
    } catch (err) { next(err) }
  }

  static async updateMe(req: Request, res: Response, next: NextFunction) {
    try {
      const user = await UsersService.update(req.user!.userId, req.body)
      res.json(user)
    } catch (err) { next(err) }
  }

  static async getById(req: Request, res: Response, next: NextFunction) {
    try {
      const id = parseInt(req.params.id, 10)
      // Admin can view any; students can only view themselves
      if (req.user!.role !== 'admin' && req.user!.userId !== id) {
        res.status(403).json({ error: 'Forbidden', message: 'Cannot view other users' })
        return
      }
      const user = await UsersService.getById(id)
      res.json(user)
    } catch (err) { next(err) }
  }

  static async update(req: Request, res: Response, next: NextFunction) {
    try {
      const id = parseInt(req.params.id, 10)
      if (req.user!.role !== 'admin' && req.user!.userId !== id) {
        res.status(403).json({ error: 'Forbidden', message: 'Cannot update other users' })
        return
      }
      const user = await UsersService.update(id, req.body)
      res.json(user)
    } catch (err) { next(err) }
  }

  static async deactivate(req: Request, res: Response, next: NextFunction) {
    try {
      const id = parseInt(req.params.id, 10)
      await UsersService.deactivate(id)
      res.json({ message: 'User deactivated' })
    } catch (err) { next(err) }
  }
}
