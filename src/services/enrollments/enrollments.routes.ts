import { Router } from 'express'
import { EnrollmentsController } from './enrollments.controller'
import { authenticate } from '../../middleware/auth'
import { requireRole } from '../../middleware/role'

const router = Router()
router.use(authenticate)

router.post('/',       EnrollmentsController.enroll)
router.get('/me',      EnrollmentsController.getMine)
router.get('/',        requireRole('admin'), EnrollmentsController.list)
router.delete('/:id',  requireRole('admin'), EnrollmentsController.unenroll)

export default router
