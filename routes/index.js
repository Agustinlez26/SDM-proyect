import { Router } from "express";
import product_routes from './product-routes.js'
import stock_routes from './stock-routes.js'
import view_routes from './view-routes.js'
import auth_routes from './auth-routes.js'
import user_routes from './user-routes.js'
import branch_routers from './branch-routes.js'
import location_routes from './location-routes.js'
import movements_routes from './movement-routes.js'
import statistic_routes from './statistic-routes.js'
import notification_routes from './notification-routes.js'

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