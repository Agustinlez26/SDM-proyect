import { Router } from "express";
import  product_routes from './product_routes.js'

const router = Router()

router.use('/api/products', product_routes)

export default router