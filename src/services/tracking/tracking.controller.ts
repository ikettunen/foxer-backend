import { Request, Response, NextFunction } from 'express'
import { TrackingService } from './tracking.service'

export class TrackingController {
  static async logAction(req: Request, res: Response, next: NextFunction) {
    try {
      await TrackingService.logAction(req.user!.userId, req.body)
      res.status(201).json({ message: 'Action logged' })
    } catch (err) { next(err) }
  }

  static async getActions(req: Request, res: Response, next: NextFunction) {
    try {
      const { user_id, action_type, from, to, page, limit } = req.query as Record<string, string>
      const result = await TrackingService.getActions({
        user_id:     user_id     ? parseInt(user_id, 10) : undefined,
        action_type: action_type as string | undefined,
        from, to,
        page:  page  ? parseInt(page, 10)  : 1,
        limit: limit ? parseInt(limit, 10) : 50,
      })
      res.json(result)
    } catch (err) { next(err) }
  }

  static async postLocation(req: Request, res: Response, next: NextFunction) {
    try {
      await TrackingService.postLocation(req.user!.userId, req.body)
      res.status(201).json({ message: 'Location recorded' })
    } catch (err) { next(err) }
  }

  static async getLatestLocation(req: Request, res: Response, next: NextFunction) {
    try {
      const userId = parseInt(req.params.userId, 10)
      const point  = await TrackingService.getLatestLocation(userId)
      res.json(point)
    } catch (err) { next(err) }
  }

  static async getSessionTrail(req: Request, res: Response, next: NextFunction) {
    try {
      const sessionId = parseInt(req.params.sessionId, 10)
      // Students can only see own sessions; admin sees all
      const points = await TrackingService.getSessionTrail(sessionId, req.user!)
      res.json(points)
    } catch (err) { next(err) }
  }

  static async startSession(req: Request, res: Response, next: NextFunction) {
    try {
      const session = await TrackingService.startSession(req.user!.userId, req.body)
      res.status(201).json(session)
    } catch (err) { next(err) }
  }

  static async endSession(req: Request, res: Response, next: NextFunction) {
    try {
      await TrackingService.endSession(req.user!.userId, req.body)
      res.json({ message: 'Session ended' })
    } catch (err) { next(err) }
  }

  static async getLive(_req: Request, res: Response, next: NextFunction) {
    try {
      const sessions = await TrackingService.getLive()
      res.json(sessions)
    } catch (err) { next(err) }
  }
}
