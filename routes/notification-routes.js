import { Router } from "express"
import { notificationController } from "../src/config/dependencies.js"
import { checkAuth } from "../src/middlewares/auth-middleware.js"

const router = Router()

/**
 * GET /api/notifications
 * Obtiene todas las notificaciones personalizadas del usuario (admin o empleado).
 * * Requiere autenticación.
 * Responde con array de notificaciones estructuradas.
 */
router.get('/', checkAuth, notificationController.getNotifications)

export default router
