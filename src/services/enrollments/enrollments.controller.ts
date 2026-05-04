import { Request, Response, NextFunction } from 'express'
import { EnrollmentsService } from './enrollments.service'

export class EnrollmentsController {
  static async enroll(req: Request, res: Response, next: NextFunction) {
    try {
      // Admin can enroll any user_id; students enroll themselves
      const userId = req.user!.role === 'admin' && req.body.user_id
        ? req.body.user_id
        : req.user!.userId
      const enrollment = await EnrollmentsService.enroll(userId, req.body.course_id, req.body.course_dates)
      res.status(201).json(enrollment)
    } catch (err) { next(err) }
  }

  static async getMine(req: Request, res: Response, next: NextFunction) {
    try {
      const enrollments = await EnrollmentsService.getByUser(req.user!.userId)
      res.json(enrollments)
    } catch (err) { next(err) }
  }

  static async list(req: Request, res: Response, next: NextFunction) {
    try {
      const page  = parseInt(req.query.page  as string || '1', 10)
      const limit = parseInt(req.query.limit as string || '50', 10)
      const enrollments = await EnrollmentsService.list({ page, limit })
      res.json(enrollments)
    } catch (err) { next(err) }
  }

  static async unenroll(req: Request, res: Response, next: NextFunction) {
    try {
      await EnrollmentsService.unenroll(parseInt(req.params.id, 10))
      res.json({ message: 'Unenrolled' })
    } catch (err) { next(err) }
  }
}
