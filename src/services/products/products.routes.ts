import { Router } from 'express'
import { authenticate } from '../../middleware/auth'
import { requireRole } from '../../middleware/role'
import * as c from './products.controller'

const router = Router()

router.get('/',           c.listProducts)
router.get('/categories', c.listCategories)
router.get('/:id',        c.getProduct)
router.post('/',          authenticate, requireRole('admin'), c.createProduct)
router.put('/:id',        authenticate, requireRole('admin'), c.updateProduct)
router.delete('/:id',     authenticate, requireRole('admin'), c.deactivateProduct)

export default router
