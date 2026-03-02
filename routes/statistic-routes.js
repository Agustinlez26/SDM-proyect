import { Router } from 'express'
import { statisticController } from '../src/config/dependencies.js'
import { checkAuth, isAdmin } from '../src/middlewares/auth_middleware.js'

const router = Router()

router.get('/top-selling-products', checkAuth, isAdmin, (req, res) => statisticController.getTopSellingProducts(req, res))
router.get('/monthly-egresses', checkAuth, isAdmin, (req, res) => statisticController.getMonthlyEgresses(req, res))
router.get('/branch-performance', checkAuth, isAdmin, (req, res) => statisticController.getBranchPerformanceByMonth(req, res))
router.get('/product-seasonality/:id', checkAuth, isAdmin, (req, res) => statisticController.getProductSeasonality(req, res))

router.get('/comparation-egresses', checkAuth, (req, res) => statisticController.getComparationEgresses(req, res))
router.get('/pending-shipments-count', checkAuth, (req, res) => statisticController.getPendingShipmentsCount(req, res))

export default router
