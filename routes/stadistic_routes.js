import { Router } from 'express'
import { stadisticController } from '../src/config/dependencies.js'
import { checkAuth, isAdmin } from '../src/middlewares/auth_middleware.js'

const router = Router()

router.get('/top-selling-products', checkAuth, isAdmin, (req, res) => stadisticController.getTopSellingProducts(req, res))
router.get('/monthly-egresses', checkAuth, isAdmin, (req, res) => stadisticController.getMonthlyEgresses(req, res))
router.get('/branch-performance', checkAuth, isAdmin, (req, res) => stadisticController.getBranchPerformanceByMonth(req, res))
router.get('/product-seasonality/:id', checkAuth, isAdmin, (req, res) => stadisticController.getProductSeasonality(req, res))

router.get('/comparation-egresses', checkAuth, (req, res) => stadisticController.getComparationEgresses(req, res))
router.get('/critical-stock-count', checkAuth, (req, res) => stadisticController.getCriticalStockCount(req, res))
router.get('/pending-shipments-count', checkAuth, (req, res) => stadisticController.getPendingShipmentsCount(req, res))

export default router
