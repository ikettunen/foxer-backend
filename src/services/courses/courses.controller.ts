import { Request, Response, NextFunction } from 'express'
import { CoursesService } from './courses.service'

export class CoursesController {
  static async list(req: Request, res: Response, next: NextFunction) {
    try {
      const includeUnpublished = req.user?.role === 'admin'
      const courses = await CoursesService.list(includeUnpublished)
      res.json(courses)
    } catch (err) { next(err) }
  }

  static async getById(req: Request, res: Response, next: NextFunction) {
    try {
      const course = await CoursesService.getById(req.params.id)
      res.json(course)
    } catch (err) { next(err) }
  }

  static async create(req: Request, res: Response, next: NextFunction) {
    try {
      const course = await CoursesService.create(req.body)
      res.status(201).json(course)
    } catch (err) { next(err) }
  }

  static async update(req: Request, res: Response, next: NextFunction) {
    try {
      const course = await CoursesService.update(req.params.id, req.body)
      res.json(course)
    } catch (err) { next(err) }
  }

  static async remove(req: Request, res: Response, next: NextFunction) {
    try {
      await CoursesService.remove(req.params.id)
      res.json({ message: 'Course deleted' })
    } catch (err) { next(err) }
  }

  static async getDays(req: Request, res: Response, next: NextFunction) {
    try {
      const days = await CoursesService.getDays(req.params.id)
      res.json(days)
    } catch (err) { next(err) }
  }

  static async addDay(req: Request, res: Response, next: NextFunction) {
    try {
      const day = await CoursesService.addDay(req.params.id, req.body)
      res.status(201).json(day)
    } catch (err) { next(err) }
  }

  static async updateDay(req: Request, res: Response, next: NextFunction) {
    try {
      const day = await CoursesService.updateDay(req.params.id, parseInt(req.params.dayNum, 10), req.body)
      res.json(day)
    } catch (err) { next(err) }
  }

  static async removeDay(req: Request, res: Response, next: NextFunction) {
    try {
      await CoursesService.removeDay(req.params.id, parseInt(req.params.dayNum, 10))
      res.json({ message: 'Day removed' })
    } catch (err) { next(err) }
  }
}
