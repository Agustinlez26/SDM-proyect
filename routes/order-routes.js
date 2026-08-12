import { Router } from 'express'
import { orderController } from '../src/config/dependencies.js'
import { checkAuth } from '../src/middlewares/auth-middleware.js'

const router = Router()
router.get('/', checkAuth, orderController.overview)
router.get('/catalog', checkAuth, orderController.catalog)
router.get('/:id/details', checkAuth, orderController.details)
router.post('/', checkAuth, orderController.create)
router.patch('/:id', checkAuth, orderController.update)
router.post('/:id/complete', checkAuth, orderController.complete)
router.post('/:id/cancel', checkAuth, orderController.cancel)
export default router
