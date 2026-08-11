import { Router } from 'express'
import { operationsController } from '../src/config/dependencies.js'
import { checkAuth, isAdmin } from '../src/middlewares/auth-middleware.js'

const router = Router()
router.use(checkAuth, isAdmin)

router.get('/overview', operationsController.overview)
router.get('/catalogs', operationsController.catalogs)
router.post('/artisans', operationsController.createArtisan)
router.post('/work-orders', operationsController.createWorkOrder)
router.get('/work-orders/:id', operationsController.getWorkOrder)
router.post('/work-orders/:id/send', operationsController.sendWorkOrder)
router.post('/work-orders/:id/receive', operationsController.receiveWorkOrder)
router.post('/wholesale-orders', operationsController.createWholesaleOrder)
router.post('/wholesale-orders/:id/deliver', operationsController.deliverWholesaleOrder)
router.post('/packages', operationsController.createPackage)
router.patch('/products/:id', operationsController.updateProductOperations)

export default router
