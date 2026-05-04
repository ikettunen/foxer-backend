import { Router } from 'express'
import { ProgressController } from './progress.controller'
import { authenticate } from '../../middleware/auth'
import { requireRole } from '../../middleware/role'

const router = Router()
router.use(authenticate)

router.get('/',                           ProgressController.getMine)
router.get('/course/:courseId',           ProgressController.getCourse)
router.get('/:userId', requireRole('admin'), ProgressController.getByUser)
router.post('/reading',                   ProgressController.markReading)
router.post('/day',                       ProgressController.markDay)

export default router
