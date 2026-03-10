import { handleError } from "../utils/error-handler.js"
import { validateStatsYear, validateProductSearch } from "../schemas/stats-schema.js"
import { validateId } from "../schemas/shared-schema.js"

/**
 * @class StatisticController
 * @description Controlador para gestionar las solicitudes HTTP de estadísticas.
 */
export class StatisticController {
    /**
     * @constructor
     * @param {Object} params - Dependencias inyectadas.
     * @param {Object} params.statisticService - Instancia del servicio de estadísticas.
     */
    constructor({ statisticService }) {
        this.statisticService = statisticService
    }

    /**
     * Responde con los 5 productos más vendidos.
     * @param {Object} req - Objeto de solicitud de Express.
     * @param {Object} res - Objeto de respuesta de Express.
     * @returns {Promise<Object>} JSON con el listado de productos.
     */
    getTopSellingProducts = async (req, res) => {
        try {
            const SellingProducts = await this.statisticService.getTopSellingProducts()
            return res.json({ status: 'success', data: SellingProducts })
        } catch (error) {
            handleError(res, error)
        }
    }

    /**
     * Responde con el historial mensual de egresos de un año.
     * @param {Object} req - Objeto de solicitud de Express.
     * @param {Object} res - Objeto de respuesta de Express.
     * @returns {Promise<Object>} JSON con el historial de egresos.
     */
    getMonthlyEgresses = async (req, res) => {
        const yearValidation = validateStatsYear(req.query)
        if (!yearValidation.success) {
            return res.status(400).json({
                status: 'error',
                message: 'El año es inválido',
                error: yearValidation.error.errors
            })
        }

        try {
            const monthlyEgresses = await this.statisticService.getMonthlyEgresses(yearValidation.data.year)
            return res.json({ status: 'success', data: monthlyEgresses })
        } catch (error) {
            handleError(res, error)
        }
    }

    /**
     * Responde con el historial mensual de egresos separado por sucursal.
     * @param {Object} req - Objeto de solicitud de Express.
     * @param {Object} res - Objeto de respuesta de Express.
     * @returns {Promise<Object>} JSON con el historial de rendimiento por sucursal.
     */
    getBranchPerformanceByMonth = async (req, res) => {
        const yearValidation = validateStatsYear(req.query)
        if (!yearValidation.success) {
            return res.status(400).json({
                status: 'error',
                message: 'El año es inválido',
                error: yearValidation.error.errors
            })
        }

        try {
            const branchPerformance = await this.statisticService.getBranchPerformanceByMonth(yearValidation.data.year)
            return res.json({ status: 'success', data: branchPerformance })
        } catch (error) {
            handleError(res, error)
        }

    }

    /**
     * Responde con el historial de egresos de un producto específico.
     * @param {Object} req - Objeto de solicitud de Express.
     * @param {Object} res - Objeto de respuesta de Express.
     * @returns {Promise<Object>} JSON con la estacionalidad del producto.
     */
    getProductSeasonality = async (req, res) => {
        const yearValidation = validateStatsYear(req.query)
        if (!yearValidation.success) {
            return res.status(400).json({
                status: 'error',
                message: 'El año es inválido',
                error: yearValidation.error.errors
            })
        }

        const searchValidation = validateProductSearch(req.query)
        if (!searchValidation.success) {
            return res.status(400).json({
                status: 'error',
                message: 'El parámetro de búsqueda es inválido',
                error: searchValidation.error.errors
            })
        }

        const idValidation = validateId(req.params.id)
        if (!idValidation.success) {
            return res.status(400).json({
                status: 'error',
                message: 'El id del producto es inválido',
                error: idValidation.error.errors
            })
        }

        try {
            const productSeasonality = await this.statisticService.getProductSeasonality(idValidation.data, yearValidation.data.year)
            return res.json({ status: 'success', data: productSeasonality })
        } catch (error) {
            handleError(res, error)
        }
    }

    /**
     * Devuelve un producto activo elegido al azar para la sección de estacionalidad.
     * @param {Object} req - Objeto de solicitud de Express.
     * @param {Object} res - Objeto de respuesta de Express.
     * @returns {Promise<Object>} JSON con { id, name } del producto seleccionado.
     */
    getRandomProduct = async (req, res) => {
        try {
            const randomProduct = await this.statisticService.getRandomProduct()
            return res.json({ status: 'success', data: randomProduct })
        } catch (error) {
            handleError(res, error)
        }
    }

    /**
     * Responde con la variación porcentual y tendencia de egresos vs mes anterior.
     * @param {Object} req - Objeto de solicitud de Express.
     * @param {Object} res - Objeto de respuesta de Express.
     * @returns {Promise<Object>} JSON con la variación y la tendencia.
     */
    getComparationEgresses = async (req, res) => {
        let branchId = null
        if (!req.user.is_admin) {
            branchId = req.user.branch_id
        }

        try {
            const comparationEgresses = await this.statisticService.getComparationEgresses(branchId)
            return res.json({ status: 'success', data: comparationEgresses })
        } catch (error) {
            handleError(res, error)
        }
    }

    /**
     * Responde con la cantidad de envíos en estado pendiente o en progreso.
     * @param {Object} req - Objeto de solicitud de Express.
     * @param {Object} res - Objeto de respuesta de Express.
     * @returns {Promise<Object>} JSON con el conteo de envíos pendientes.
     */
    getPendingShipmentsCount = async (req, res) => {
        let branchId = null
        if (!req.user.is_admin) {
            branchId = req.user.branch_id
        }

        try {
            const pendingShipmentsCount = await this.statisticService.getPendingShipmentsCount(branchId)
            return res.json({ status: 'success', data: pendingShipmentsCount })

        } catch (error) {
            handleError(res, error)
        }
    }
}
