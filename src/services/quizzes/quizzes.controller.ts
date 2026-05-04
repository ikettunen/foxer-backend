import { Request, Response, NextFunction } from 'express'
import { QuizzesService } from './quizzes.service'

export class QuizzesController {
  static async getByLesson(req: Request, res: Response, next: NextFunction) {
    try {
      const quiz = await QuizzesService.getByLesson(req.params.lessonId)
      res.json(quiz)
    } catch (err) { next(err) }
  }

  static async submit(req: Request, res: Response, next: NextFunction) {
    try {
      const result = await QuizzesService.submit(req.user!.userId, req.params.lessonId, req.body.answers)
      res.json(result)
    } catch (err) { next(err) }
  }

  static async getResults(req: Request, res: Response, next: NextFunction) {
    try {
      const results = await QuizzesService.getResults(req.user!.userId, req.params.lessonId)
      res.json(results)
    } catch (err) { next(err) }
  }

  static async create(req: Request, res: Response, next: NextFunction) {
    try {
      const quiz = await QuizzesService.create(req.body)
      res.status(201).json(quiz)
    } catch (err) { next(err) }
  }

  static async update(req: Request, res: Response, next: NextFunction) {
    try {
      const quiz = await QuizzesService.update(parseInt(req.params.id, 10), req.body)
      res.json(quiz)
    } catch (err) { next(err) }
  }
}
