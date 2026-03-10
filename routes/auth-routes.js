import { Router } from 'express'
import { authController } from '../src/config/dependencies.js'
import { loginLimiter } from '../src/middlewares/rate-limit-middleware.js'
import { checkAuth } from '../src/middlewares/auth-middleware.js'

const router = Router()

router.post('/login', loginLimiter, (req, res) => authController.login(req, res))
router.post('/logout', checkAuth, (req, res) => authController.logout(req, res))

export default router