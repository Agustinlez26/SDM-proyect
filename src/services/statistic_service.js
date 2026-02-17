import { notFoundError } from "../utils/errors.js"

/**
 * @class StadisticService
 * @description Servicio encargado de manejar la lógica de negocio de las estadísticas.
 */
export class StatisticService {
    /**
     * @constructor
     * @param {Object} params - Dependencias inyectadas.
     * @param {Object} params.stadisticsModel - Instancia del modelo de estadísticas.
     * @param {Object} params.productModel - Instancia del modelo de productos.
     */
    constructor({ stadisticsModel, productModel }) {
        this.stadisticsModel = stadisticsModel
        this.productModel = productModel
    }

    /**
     * Obtiene los 5 productos con mayor cantidad de egresos históricos.
     * @returns {Promise<Array>} Ej: [{ product_name: 'Clavos', total_quantity: 500 }]
     */
    async getTopSellingProducts() {
        return await this.stadisticsModel.getTopSellingProducts()
    }

    /**
     * Obtiene el total de artículos egresados agrupados por mes en un año específico.
     * @param {number|string} year - Año a consultar.
     * @returns {Promise<Array>} Ej: [{ month: 3, total_items_sold: 1250 }]
     */
    async getMonthlyEgresses(year) {
        return await this.stadisticsModel.getMonthlyEgresses(year)
    }

    /**
     * Obtiene los egresos mensuales separados por sucursal en un año específico.
     * @param {number|string} year - Año a consultar.
     * @returns {Promise<Array>} Ej: [{ branch_name: 'Centro', month: 1, total_items_sold: 400 }]
     */
    async getBranchPerformanceByMonth(year) {
        return await this.stadisticsModel.getBranchPerformanceByMonth(year)
    }

    /**
     * Valida la existencia de un producto y obtiene su historial de egresos agrupado por mes.
     * @param {number} productId - ID del producto a consultar.
     * @param {number|string} year - Año a consultar.
     * @throws {Error} Si el producto no es encontrado.
     * @returns {Promise<Array>} Ej: [{ month: 5, total_sold: 200 }]
     */
    async getProductSeasonality(productId, year) {
        const product = await this.productModel.findById(productId)
        if (!product) {
            throw notFoundError('Producto no encontrado')
        }
        return await this.stadisticsModel.getProductSeasonality(productId, year)
    }

    // tarjetas del dashboard

    /**
     * Calcula la variación porcentual de egresos entre el mes actual y el mes anterior.
     * @param {number} [branchId=null] - (Opcional) ID de la sucursal a filtrar.
     * @returns {Promise<Array>} Ej: [15.5, 'subió']
     */
    async getComparationEgresses(branchId = null) {
        const currentMonthEgresses = await this.stadisticsModel.getCurrentMonthEgresses(branchId)
        const previousMonthEgresses = await this.stadisticsModel.getPreviousMonthEgresses(branchId)
        const posilities = ['igual', 'bajó', 'subió']

        let trend = posilities[0]
        let averageVar = 0

        if (previousMonthEgresses > 0) {
            averageVar = ((currentMonthEgresses - previousMonthEgresses) / previousMonthEgresses) * 100
            averageVar = Math.round(averageVar * 10) / 10
        } else if (currentMonthEgresses > 0) {
            averageVar = 100
        }

        if (averageVar > 0) trend = posilities[2]
        else if (averageVar < 0) trend = posilities[1]

        averageVar = Math.abs(averageVar)

        return [averageVar, trend]
    }

    /**
     * Cuenta cuántos productos tienen un stock actual menor o igual a su stock mínimo permitido.
     * @param {number} [branchId=null] - (Opcional) ID de la sucursal a filtrar.
     * @returns {Promise<number>} Ej: 12
     */
    async getCriticalStockCount(branchId = null) {
        return await this.stadisticsModel.getCriticalStockCount(branchId)
    }

    /**
     * Cuenta la cantidad total de movimientos de envío en estado 'pendiente' o 'en_progreso'.
     * @param {number} [branchId=null] - (Opcional) ID de la sucursal de destino a filtrar.
     * @returns {Promise<number>} Ej: 4
     */
    async getPendingShipmentsCount(branchId = null) {
        return await this.stadisticsModel.getPendingShipmentsCount(branchId)
    }
}