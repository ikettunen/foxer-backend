import { Router } from 'express'
import { CoursesController } from './courses.controller'
import { authenticate } from '../../middleware/auth'
import { requireRole } from '../../middleware/role'

const router = Router()
router.use(authenticate)

router.get('/',                         CoursesController.list)
router.get('/:id',                      CoursesController.getById)
router.post('/',   requireRole('admin'), CoursesController.create)
router.put('/:id', requireRole('admin'), CoursesController.update)
router.delete('/:id', requireRole('admin'), CoursesController.remove)

// Days sub-resource
router.get('/:id/days',                   CoursesController.getDays)
router.post('/:id/days',                  requireRole('admin'), CoursesController.addDay)
router.put('/:id/days/:dayNum',           requireRole('admin'), CoursesController.updateDay)
router.delete('/:id/days/:dayNum',        requireRole('admin'), CoursesController.removeDay)

export default router
