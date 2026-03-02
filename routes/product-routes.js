import { Router } from 'express'
import { productController } from '../src/config/dependencies.js'
import { upload } from '../src/middlewares/upload.js'
import { checkAuth, isAdmin } from '../src/middlewares/auth-middleware.js'

const router = Router()

router.get('/catalog', checkAuth, isAdmin, (req, res) => productController.getPublicCatalog(req, res))
router.get('/', checkAuth, isAdmin, (req, res) => productController.getAll(req, res))
router.post('/', checkAuth, isAdmin, upload.single('image'), (req, res) => productController.create(req, res))

router.get('/categories', checkAuth, isAdmin, (req, res) => productController.getCategories(req, res))
router.post('/categories', checkAuth, isAdmin, (req, res) => productController.createCategory(req, res))
router.delete('/categories/:id', checkAuth, isAdmin, (req, res) => productController.deleteCategory(req, res))

router.get('/:id', checkAuth, isAdmin, (req, res) => productController.getById(req, res))
router.patch('/:id', checkAuth, isAdmin, upload.single('image'), (req, res) => productController.update(req, res))
router.delete('/:id', checkAuth, isAdmin, (req, res) => productController.delete(req, res))
router.patch('/activate/:id', checkAuth, isAdmin, (req, res) => productController.activate(req, res))
export default router
