import { Router } from 'express'
import { movementController } from '../src/config/dependencies.js'
import { checkAuth, isAdmin } from '../src/middlewares/auth_middleware.js'

const router = Router()

router.get('/', checkAuth, (req, res) => movementController.getAll(req, res))
router.get('/:id', checkAuth, (req, res) => movementController.getById(req, res))
router.get('/details/:id', checkAuth, (req, res) => movementController.getDetails(req, res))
router.get('/recent', checkAuth, (req, res) => movementController.getRecent(req, res))

router.post('/', checkAuth, (req, res) => movementController.getById(req, res))
router.post('/chageStatus/:id', checkAuth, (req, res) => movementController.getById(req, res))

export default router