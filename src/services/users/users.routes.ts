import { Router } from 'express'
import { UsersController } from './users.controller'
import { authenticate } from '../../middleware/auth'
import { requireRole } from '../../middleware/role'

const router = Router()

router.use(authenticate)

router.get('/',       requireRole('admin'), UsersController.list)
router.get('/me',     UsersController.getMe)
router.put('/me',     UsersController.updateMe)
router.get('/:id',    UsersController.getById)
router.put('/:id',    UsersController.update)
router.delete('/:id', requireRole('admin'), UsersController.deactivate)

export default router
