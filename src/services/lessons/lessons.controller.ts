import { Request, Response, NextFunction } from 'express'
import { LessonsService } from './lessons.service'

export class LessonsController {
  static async getById(req: Request, res: Response, next: NextFunction) {
    try {
      const lesson = await LessonsService.getById(req.params.id)
      res.json(lesson)
    } catch (err) { next(err) }
  }

  static async update(req: Request, res: Response, next: NextFunction) {
    try {
      const lesson = await LessonsService.update(req.params.id, req.body)
      res.json(lesson)
    } catch (err) { next(err) }
  }

  static async addSection(req: Request, res: Response, next: NextFunction) {
    try {
      const section = await LessonsService.addSection(req.params.id, req.body)
      res.status(201).json(section)
    } catch (err) { next(err) }
  }

  static async updateSection(req: Request, res: Response, next: NextFunction) {
    try {
      const section = await LessonsService.updateSection(parseInt(req.params.sectionId, 10), req.body)
      res.json(section)
    } catch (err) { next(err) }
  }

  static async removeSection(req: Request, res: Response, next: NextFunction) {
    try {
      await LessonsService.removeSection(parseInt(req.params.sectionId, 10))
      res.json({ message: 'Section removed' })
    } catch (err) { next(err) }
  }

  static async reorderSections(req: Request, res: Response, next: NextFunction) {
    try {
      // body: { order: [sectionId, sectionId, ...] }
      await LessonsService.reorderSections(req.params.id, req.body.order)
      res.json({ message: 'Sections reordered' })
    } catch (err) { next(err) }
  }
}
