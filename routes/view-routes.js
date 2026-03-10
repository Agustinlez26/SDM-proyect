// src/routes/views_routes.js
import { Router } from 'express'
import { ViewsController } from '../src/controllers/view-controller.js'
import { checkAuth, requirePasswordChange, allowPasswordChangeOnly } from '../src/middlewares/auth-middleware.js'

const router = Router()
const viewsController = new ViewsController()

router.get('/', checkAuth, requirePasswordChange, viewsController.renderDashboard)

router.get('/login', viewsController.renderLogIn)
router.get('/firstpass', checkAuth, allowPasswordChangeOnly, viewsController.renderFirstPass)

router.get('/stock', checkAuth, requirePasswordChange, viewsController.renderStock)
router.get('/products', checkAuth, requirePasswordChange, viewsController.renderProducts)
router.get('/movements', checkAuth, requirePasswordChange, viewsController.renderMovements)
router.get('/operations', checkAuth, requirePasswordChange, viewsController.renderOperations)
router.get('/stats', checkAuth, requirePasswordChange, viewsController.renderStats)
router.get('/branches', checkAuth, requirePasswordChange, viewsController.renderBranches)
router.get('/users', checkAuth, requirePasswordChange, viewsController.renderUsers)
router.get('/profile', checkAuth, requirePasswordChange, viewsController.renderProfile)

export default router