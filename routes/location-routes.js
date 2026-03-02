import { Router } from 'express'
import { branchController } from '../src/config/dependencies.js'
import { checkAuth, isAdmin } from '../src/middlewares/auth_middleware.js'

const router = Router()

router.get('/cities/', checkAuth, isAdmin, (req, res) => branchController.getCities(req, res))
router.get('/provinces/', checkAuth, isAdmin, (req, res) => branchController.getProvinces(req, res))

export default router