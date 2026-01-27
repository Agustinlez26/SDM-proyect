import { Router } from 'express'
import { productController } from '../src/config/dependencies.js'
import { upload } from '../src/middlewares/upload.js'

const router = Router()

router.get('/catalog', (req, res) => productController.getPublicCatalog(req, res))
router.get('/', (req, res) => productController.getAll(req, res))
router.get('/:id', (req, res) => productController.getById(req, res))

router.post('/', upload.single('image'), (req, res) => productController.create(req, res))
router.put('/:id', upload.single('image'), (req, res) => productController.update(req, res))
router.delete('/:id', (req, res) => productController.delete(req, res))
router.patch('/:id/activate', (req, res) => productController.activate(req, res))

export default router
