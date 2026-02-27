import { handleError } from "../utils/error_handler.js"

/**
 * Controlador de Notificaciones (NotificationController).
 * * Responsabilidades:
 * 1. Recibir peticiones HTTP GET de notificaciones.
 * 2. Bifurcar la lógica según el rol del usuario (admin vs empleado).
 * 3. Orquestar llamadas al servicio de estadísticas para obtener datos.
 * 4. Formatear las notificaciones estandarizadas para el frontend.
 * 5. Responder con JSON estructurado.
 */
export class NotificationController {
    /**
     * Inyección de dependencias.
     * @param {Object} dependencies
     * @param {StatisticService} dependencies.statisticService
     */
    constructor({ statisticService }) {
        this.statisticService = statisticService
    }

    /**
     * Endpoint principal: Obtiene todas las notificaciones personalizadas para el usuario.
     * * Bifurcación:
     * - Admin: Notificaciones globales (stock crítico global, envíos estancados, entregas recientes).
     * - Empleado: Notificaciones de su sucursal (stock crítico, stock agotado, envíos entrantes).
     * * @param {Object} req - Request (Usuario en req.user { is_admin, branch_id }).
     * @param {Object} res - Response.
     */
    getNotifications = async (req, res) => {
        try {
            const { is_admin, branch_id } = req.user
            let notifications = []

            if (is_admin) {
                notifications = await this.#getAdminNotifications()
            } else {
                notifications = await this.#getEmployeeNotifications(branch_id)
            }

            res.json({ 
                status: 'success', 
                data: notifications 
            })
        } catch (error) {
            handleError(res, error)
        }
    }

    /**
     * Método Privado: Construye notificaciones específicas para administradores.
     * * Tipos de notificaciones que obtiene:
     * 1. Envíos Estancados (más de 48hs en tránsito).
     * 2. Stock Crítico Global (por sucursal).
     * 3. Entregas Recientes (últimos 5 envíos).
     * * @returns {Promise<Array>} Array de notificaciones formateadas.
     * @private
     */
    async #getAdminNotifications() {
        const notifications = []

        try {
            // Envíos estancados: peligro potencial
            const stalledShipments = await this.statisticService.getAdminStalledShipments()
            stalledShipments.forEach(ship => {
                notifications.push({
                    type: 'danger',
                    icon: 'gpp_maybe',
                    title: 'Envío Estancado',
                    message: `El envío #${ship.receipt_number} de ${ship.origin_name} a ${ship.dest_name} lleva más de 48hs sin ser recibido.`,
                    date: ship.date,
                    movementId: ship.id
                })
            })

            // Stock crítico por sucursal: advertencia
            const criticalStock = await this.statisticService.getAdminGlobalCriticalStock()
            criticalStock.forEach(branch => {
                notifications.push({
                    type: 'warning',
                    icon: 'inventory_2',
                    title: 'Stock Crítico Global',
                    message: `Hay ${branch.critical_count} productos por debajo del mínimo en ${branch.branch_name}.`
                })
            })

            // Entregas recientes: éxito
            const delivered = await this.statisticService.getAdminRecentlyDeliveredShipments()
            delivered.forEach(ship => {
                notifications.push({
                    type: 'success',
                    icon: 'check_circle',
                    title: 'Envío Confirmado',
                    message: `${ship.dest_name} ha recibido y confirmado el envío #${ship.receipt_number}.`,
                    date: ship.arrival_date,
                    movementId: ship.id
                })
            })
        } catch (error) {
            console.error('Error obteniendo notificaciones admin:', error)
            throw error
        }

        return notifications
    }

    /**
     * Método Privado: Construye notificaciones específicas para empleados de una sucursal.
     * * Tipos de notificaciones que obtiene:
     * 1. Quiebre de Stock (productos agotados).
     * 2. Stock Bajo (cantidad <= mínimo).
     * 3. Envíos en Camino (llegando a la sucursal).
     * * @param {number} branchId - ID de la sucursal del empleado.
     * @returns {Promise<Array>} Array de notificaciones formateadas.
     * @private
     */
    async #getEmployeeNotifications(branchId) {
        const notifications = []

        try {
            // Stock agotado: crítico
            const zeroStock = await this.statisticService.getEmployeeZeroStock(branchId)
            zeroStock.forEach(item => {
                notifications.push({
                    type: 'danger',
                    icon: 'error',
                    title: 'Quiebre de Stock',
                    message: `El producto '${item.product_name}' se ha agotado por completo en tu sucursal.`
                })
            })

            // Stock bajo: advertencia
            const criticalStock = await this.statisticService.getEmployeeCriticalStock(branchId)
            criticalStock.forEach(item => {
                notifications.push({
                    type: 'warning',
                    icon: 'warning',
                    title: 'Stock Bajo',
                    message: `Quedan solo ${item.quantity} unidades de '${item.product_name}' (mínimo: ${item.min_quantity}).`
                })
            })

            // Envíos entrantes: info
            const incoming = await this.statisticService.getEmployeeIncomingShipments(branchId)
            incoming.forEach(ship => {
                notifications.push({
                    type: 'info',
                    icon: 'local_shipping',
                    title: 'Envío en Camino',
                    message: `Ha llegado un nuevo envío (#${ship.receipt_number}) desde ${ship.origin_name}. Revisa la mercadería y confirma la recepción.`,
                    date: ship.date,
                    movementId: ship.id
                })
            })
        } catch (error) {
            console.error('Error obteniendo notificaciones empleado:', error)
            throw error
        }

        return notifications
    }
}
