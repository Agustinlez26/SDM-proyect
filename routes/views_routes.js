// src/routes/views_routes.js
import { Router } from 'express'
import { ViewsController } from '../src/controllers/views_controller.js'

const router = Router()
const viewsController = new ViewsController()

router.get('/', viewsController.renderDashboard)

router.get('/stock', viewsController.renderStock)
router.get('/products', viewsController.renderProducts)
router.get('/movements', viewsController.renderMovements)
router.get('/users', viewsController.renderUsers)

router.get('/products/new', (req, res) => res.send('Aquí irá el formulario de Crear Producto'))
router.get('/stock/entry', (req, res) => res.send('Aquí irá el formulario de Ingreso'))

export default router