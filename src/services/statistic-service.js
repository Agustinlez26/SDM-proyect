import { NotFoundError } from "../utils/errors.js"

/**
 * @class StadisticService
 * @description Servicio encargado de manejar la lógica de negocio de las estadísticas.
 */
export class StatisticService {
    /**
     * @constructor
     * @param {Object} params - Dependencias inyectadas.
     * @param {Object} params.statisticsModel - Instancia del modelo de estadísticas.
     * @param {Object} params.productModel - Instancia del modelo de productos.
     */
    constructor({ statisticsModel, productModel }) {
        this.statisticsModel = statisticsModel
        this.productModel = productModel
    }

    /**
     * Obtiene los 5 productos con mayor cantidad de egresos históricos.
     * @returns {Promise<Array>} Ej: [{ product_name: 'Clavos', total_quantity: 500 }]
     */
    async getTopSellingProducts() {
        return await this.statisticsModel.getTopSellingProducts()
    }

    /**
     * Obtiene el total de artículos egresados agrupados por mes en un año específico.
     * @param {number|string} year - Año a consultar.
     * @returns {Promise<Array>} Ej: [{ month: 3, total_items_sold: 1250 }]
     */
    async getMonthlyEgresses(year) {
        return await this.statisticsModel.getMonthlyEgresses(year)
    }

    /**
     * Obtiene los egresos mensuales separados por sucursal en un año específico.
     * @param {number|string} year - Año a consultar.
     * @returns {Promise<Array>} Ej: [{ branch_name: 'Centro', month: 1, total_items_sold: 400 }]
     */
    async getBranchPerformanceByMonth(year) {
        return await this.statisticsModel.getBranchPerformanceByMonth(year)
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
            throw new NotFoundError('Producto no encontrado')
        }
        return await this.statisticsModel.getProductSeasonality(productId, year)
    }

    /**
     * Devuelve un producto activo elegido al azar para inicializar la sección de estacionalidad.
     * @throws {NotFoundError} Si no hay productos activos en la base de datos.
     * @returns {Promise<{id: number, name: string}>}
     */
    async getRandomProduct() {
        const product = await this.statisticsModel.getRandomProduct()
        if (!product) {
            throw new NotFoundError('No hay productos disponibles')
        }
        return product
    }


    // tarjetas del dashboard

    /**
     * Calcula la variación porcentual de egresos entre el mes actual y el mes anterior.
     * @param {number} [branchId=null] - (Opcional) ID de la sucursal a filtrar.
     * @returns {Promise<Array>} Ej: [15.5, 'subió']
     */
    async getComparationEgresses(branchId = null) {
        const currentMonthEgresses = await this.statisticsModel.getCurrentMonthEgresses(branchId);
        const previousMonthEgresses = await this.statisticsModel.getPreviousMonthEgresses(branchId);

        const possibilities = ['igual', 'bajó', 'subió'];
        let trend = possibilities[0];
        let averageVar = 0;

        const current = Number(currentMonthEgresses) || 0;
        const previous = Number(previousMonthEgresses) || 0;

        if (previous > 0) {
            averageVar = ((current - previous) / previous) * 100;
            averageVar = Math.round(averageVar * 10) / 10;
        } else if (current > 0) {
            averageVar = 100;
        }

        if (averageVar > 0) {
            trend = possibilities[2];
        } else if (averageVar < 0) {
            trend = possibilities[1];
        }

        averageVar = Math.abs(averageVar);

        return {
            total: current,
            variation: averageVar,
            trend: trend
        };
    }

    /**
     * Cuenta la cantidad total de movimientos de envío en estado 'pendiente' o 'en_progreso'.
     * @param {number} [branchId=null] - (Opcional) ID de la sucursal de destino a filtrar.
     * @returns {Promise<number>} Ej: 4
     */
    async getPendingShipmentsCount(branchId = null) {
        if (branchId) {
            const branchShipmentsCount = await this.statisticsModel.getPendingShipmentsCount(branchId)
            return branchShipmentsCount || 0
        }
        return await this.statisticsModel.getPendingShipmentsCount()
    }

    // --- NOTIFICACIONES PARA EMPLEADOS ---

    /**
     * Obtiene productos en stock crítico para un empleado de una sucursal específica.
     * @param {number} branchId - ID de la sucursal del empleado.
     * @returns {Promise<Array>} Ej: [{ product_name: 'Clavos', quantity: 5, min_quantity: 10 }]
     */
    async getEmployeeCriticalStock(branchId) {
        return await this.statisticsModel.getEmployeeCriticalStock(branchId)
    }

    /**
     * Obtiene productos agotados (cantidad = 0) en la sucursal de un empleado.
     * @param {number} branchId - ID de la sucursal del empleado.
     * @returns {Promise<Array>} Ej: [{ product_name: 'Tornillos' }]
     */
    async getEmployeeZeroStock(branchId) {
        return await this.statisticsModel.getEmployeeZeroStock(branchId)
    }

    /**
     * Obtiene los envíos en camino (estado 'en_proceso') hacia la sucursal de un empleado.
     * @param {number} branchId - ID de la sucursal del empleado (destino).
     * @returns {Promise<Array>} Ej: [{ id: 1, receipt_number: 'ENV-001', origin_name: 'Principal', date: '2026-02-27' }]
     */
    async getEmployeeIncomingShipments(branchId) {
        return await this.statisticsModel.getEmployeeIncomingShipments(branchId)
    }

    // --- NOTIFICACIONES PARA ADMINISTRADORES ---

    /**
     * Obtiene un resumen global de stock crítico agrupado por sucursal.
     * @returns {Promise<Array>} Ej: [{ branch_name: 'Centro', critical_count: 3 }]
     */
    async getAdminGlobalCriticalStock() {
        return await this.statisticsModel.getAdminGlobalCriticalStock()
    }

    /**
     * Obtiene envíos estancados (más de 48hs en transito sin ser entregados).
     * @returns {Promise<Array>} Ej: [{ id: 1, receipt_number: 'ENV-001', origin_name: 'Principal', dest_name: 'Centro', date: '2026-02-25' }]
     */
    async getAdminStalledShipments() {
        return await this.statisticsModel.getAdminStalledShipments()
    }

    /**
     * Obtiene los últimos 5 envíos entregados en las últimas 48 horas.
     * @returns {Promise<Array>} Ej: [{ id: 1, receipt_number: 'ENV-001', dest_name: 'Centro', arrival_date: '2026-02-27' }]
     */
    async getAdminRecentlyDeliveredShipments() {
        return await this.statisticsModel.getAdminRecentlyDeliveredShipments()
    }
}
