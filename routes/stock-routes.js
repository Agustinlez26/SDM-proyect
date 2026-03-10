import { Router } from "express";
import { stockController } from "../src/config/dependencies.js";
import { checkAuth, isAdmin } from '../src/middlewares/auth-middleware.js'

const router = Router();

router.get('/',checkAuth, (req, res) => stockController.getAll(req, res))
router.get('/catalog',checkAuth, (req, res) => stockController.getCatalog(req, res))
router.get('/low-stock/count',checkAuth, (req, res) => stockController.getLowStockCount(req, res))
router.get('/out-stock/count',checkAuth, (req, res) => stockController.getOutStockCount(req, res))

router.get('/:id',checkAuth, (req, res) => stockController.getById(req, res))
router.patch('/:id',checkAuth, isAdmin, (req, res) => stockController.update(req, res))
router.delete('/:id',checkAuth, isAdmin, (req, res) => stockController.delete(req, res))

export default router;