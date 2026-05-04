import { Request, Response, NextFunction } from 'express'
import { ProgressService } from './progress.service'

export class ProgressController {
  static async getMine(req: Request, res: Response, next: NextFunction) {
    try {
      const progress = await ProgressService.getByUser(req.user!.userId)
      res.json(progress)
    } catch (err) { next(err) }
  }

  static async getByUser(req: Request, res: Response, next: NextFunction) {
    try {
      const userId = parseInt(req.params.userId, 10)
      const progress = await ProgressService.getByUser(userId)
      res.json(progress)
    } catch (err) { next(err) }
  }

  static async getCourse(req: Request, res: Response, next: NextFunction) {
    try {
      const result = await ProgressService.getCourseProgress(req.user!.userId, req.params.courseId)
      res.json(result)
    } catch (err) { next(err) }
  }

  static async markReading(req: Request, res: Response, next: NextFunction) {
    try {
      await ProgressService.markReading(req.user!.userId, req.body.course_id, req.body.day_number)
      res.json({ message: 'Reading marked complete' })
    } catch (err) { next(err) }
  }

  static async markDay(req: Request, res: Response, next: NextFunction) {
    try {
      await ProgressService.markDay(req.user!.userId, req.body.course_id, req.body.day_number)
      res.json({ message: 'Day marked complete' })
    } catch (err) { next(err) }
  }
}
