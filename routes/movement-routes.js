import { Router } from 'express'
import { movementController } from '../src/config/dependencies.js'
import { checkAuth, isAdmin } from '../src/middlewares/auth-middleware.js'

const router = Router()

router.get('/', checkAuth, (req, res) => movementController.getAll(req, res))
router.get('/recent', checkAuth, (req, res) => movementController.getRecent(req, res))
router.get('/shipments', checkAuth, (req, res) => movementController.getShipmentsInProcess(req, res))

router.post('/', checkAuth, (req, res) => movementController.create(req, res))
router.get('/:id', checkAuth, (req, res) => movementController.getById(req, res))
router.get('/details/:id', checkAuth, (req, res) => movementController.getDetails(req, res))
router.patch('/changeStatus/:id', checkAuth, (req, res) => movementController.changeStatus(req, res))

export default router