import { Router } from "express";
import product_routes from './product_routes.js'
import stock_routes from './stock_routes.js'
import view_routes from './view_routes.js'
import auth_routes from './auth_routes.js'
import user_routes from './user_routes.js'
import branch_routers from './branch_routes.js'
import location_routes from './location_routes.js'
import movements_routes from './movement_routes.js'
import statistic_routes from './statistic_routes.js'
import notification_routes from './notification_routes.js'

const router = Router()

router.use('/api/products', product_routes)
router.use('/api/stocks', stock_routes)
router.use('/api/users', user_routes)
router.use('/api/auth', auth_routes)
router.use('/api/branches', branch_routers)
router.use('/api/locations', location_routes)
router.use('/api/movements', movements_routes)
router.use('/api/statistics', statistic_routes)
router.use('/api/notifications', notification_routes)

router.use('/', view_routes)

export default router