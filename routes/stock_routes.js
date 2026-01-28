import { Router } from "express";
import { stockController } from "../src/config/dependencies.js";

const router = Router();

router.get('/',  (req, res) => stockController.getAll(req, res));
router.get('/:id', (req, res) => stockController.getById(req, res));
router.get('/low-stock/count', (req, res) => stockController.getLowStockCount(req, res));
router.get('/out-stock/count', (req, res) => stockController.getOutStockCount(req, res));

router.post('/', (req, res) => stockController.create(req, res));
router.patch('/:id', (req, res) => stockController.update(req, res));
router.delete('/:id', (req, res) => stockController.delete(req, res));

export default router;