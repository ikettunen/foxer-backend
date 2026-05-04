import { Router } from 'express'
import { QuizzesController } from './quizzes.controller'
import { authenticate } from '../../middleware/auth'
import { requireRole } from '../../middleware/role'

const router = Router()
router.use(authenticate)

router.get('/:lessonId',          QuizzesController.getByLesson)
router.post('/:lessonId/submit',  QuizzesController.submit)
router.get('/:lessonId/results',  QuizzesController.getResults)
router.post('/',   requireRole('admin'), QuizzesController.create)
router.put('/:id', requireRole('admin'), QuizzesController.update)

export default router
