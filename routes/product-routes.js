import { Router } from 'express'
import { productController } from '../src/config/dependencies.js'
import { upload } from '../src/middlewares/upload.js'
import { checkAuth, canManageStock } from '../src/middlewares/auth-middleware.js'

const router = Router()

router.get('/catalog', checkAuth, (req, res) => productController.getPublicCatalog(req, res))
router.get('/operational-catalogs', checkAuth, canManageStock, (req, res) => productController.getOperationalCatalogs(req, res))
router.get('/', checkAuth, canManageStock, (req, res) => productController.getAll(req, res))
router.post('/', checkAuth, canManageStock, upload.single('image'), (req, res) => productController.create(req, res))

router.get('/categories', checkAuth, (req, res) => productController.getCategories(req, res))
router.post('/categories', checkAuth, canManageStock, (req, res) => productController.createCategory(req, res))
router.delete('/categories/:id', checkAuth, canManageStock, (req, res) => productController.deleteCategory(req, res))

router.get('/:id', checkAuth, canManageStock, (req, res) => productController.getById(req, res))
router.patch('/:id', checkAuth, canManageStock, upload.single('image'), (req, res) => productController.update(req, res))
router.delete('/:id', checkAuth, canManageStock, (req, res) => productController.delete(req, res))
router.patch('/activate/:id', checkAuth, canManageStock, (req, res) => productController.activate(req, res))
export default router
