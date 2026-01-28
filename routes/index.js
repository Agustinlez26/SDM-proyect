import { Router } from "express";
import product_routes from './product_routes.js'
import stock_routes from './stock_routes.js'

const router = Router()

router.use('/api/products', product_routes)
router.use('/api/stocks', stock_routes)

export default router