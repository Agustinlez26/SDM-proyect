import { Router } from 'express'
import { userController } from '../src/config/dependencies.js'
import { checkAuth, isAdmin } from '../src/middlewares/auth_middleware.js'

const router = Router()

router.patch('/change-password', checkAuth, (req, res) => userController.changePass(req, res))
router.get('/me', checkAuth, (req, res) => userController.getProfile(req, res))
router.patch('/:id', checkAuth, (req, res) => userController.update(req, res))


// --- RUTAS DE GESTIÓN (SOLO ADMIN) ---

router.get('/list', checkAuth, isAdmin, (req, res) => userController.getListUsers(req, res))
router.get('/', checkAuth, isAdmin, (req, res) => userController.getAll(req, res))
router.get('/:id', checkAuth, isAdmin, (req, res) => userController.getById(req, res))
router.post('/', checkAuth, isAdmin, (req, res) => userController.create(req, res))
router.patch('/:id/status', checkAuth, isAdmin, (req, res) => userController.toggleActive(req, res))
router.patch('/reset-password/:id', checkAuth, isAdmin, (req, res) => userController.resetPass(req, res))

export default router