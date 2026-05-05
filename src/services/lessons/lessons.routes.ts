import { Router } from 'express'
import { LessonsController } from './lessons.controller'
import { authenticate } from '../../middleware/auth'
import { requireRole } from '../../middleware/role'

const router = Router()
router.use(authenticate)

router.get('/:id',                                  LessonsController.getById)
router.post('/',                 requireRole('admin'), LessonsController.create)
router.put('/:id',               requireRole('admin'), LessonsController.update)
router.delete('/:id',            requireRole('admin'), LessonsController.remove)
router.post('/:id/sections',     requireRole('admin'), LessonsController.addSection)
router.put('/:id/sections/:sectionId',  requireRole('admin'), LessonsController.updateSection)
router.delete('/:id/sections/:sectionId', requireRole('admin'), LessonsController.removeSection)
router.patch('/:id/sections/reorder',   requireRole('admin'), LessonsController.reorderSections)

export default router
