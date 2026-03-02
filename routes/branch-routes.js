import { Router } from 'express'
import { branchController } from '../src/config/dependencies.js'
import { checkAuth, isAdmin } from '../src/middlewares/auth-middleware.js'

const router = Router()

router.get('/cities', checkAuth, (req, res) => branchController.getCities(req, res))
router.get('/provinces', checkAuth, (req, res) => branchController.getProvinces(req, res))

router.get('/', checkAuth, isAdmin, (req, res) => branchController.getAll(req, res))
router.get('/catalog', checkAuth, (req, res) => branchController.getCatalog(req, res))
router.get('/types', checkAuth, (req, res) => branchController.getTypes(req, res))
router.get('/:id', checkAuth, isAdmin, (req, res) => branchController.getById(req, res))

router.post('/', checkAuth, isAdmin, (req, res) => branchController.create(req, res))
router.patch('/:id', checkAuth, isAdmin, (req, res) => branchController.update(req, res))
router.delete('/:id', checkAuth, isAdmin, (req, res) => branchController.delete(req, res))
router.patch('/active/:id', checkAuth, isAdmin, (req, res) => branchController.active(req, res))

export default router