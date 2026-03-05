import { BranchPerformanceDTO } from '../dtos/statistics/branch-performance-dto.js';
import { MonthlyEgressesDTO } from '../dtos/statistics/monthly-egresses-dto.js';
import { ProductSeasonalityDTO } from '../dtos/statistics/product-seasonality-dto.js';
import { SellingProductsDTO } from '../dtos/statistics/selling-products-dto.js';
import { Database } from '../config/connection.js'

/**
 * @class StatisticsModel
 * @description Modelo encargado de gestionar las consultas a la base de datos 
 * para el panel de estadísticas y reportes del sistema de stock.
 */
export class StatisticModel {
    #db;

    /**
     * @constructor
     * @param {Object} params - Parámetros de inyección de dependencias.
     * @param {Object} [params.db] - Instancia de la conexión a la base de datos.
     */
    constructor({ db }) {
        this.#db = db || Database.getInstance();
    }

    /**
     * Obtiene los 5 productos con mayor cantidad de egresos históricos.
     * @returns {Promise<Array>} Lista de objetos con 'product_name' y 'total_quantity'.
     */
    async getTopSellingProducts() {
        const query = `
            SELECT 
                p.name AS product_name, 
                SUM(md.quantity) AS total_quantity
            FROM movement_details md
            JOIN movements m ON md.movement_id = m.id
            JOIN products p ON md.product_id = p.id
            WHERE m.type = 'egreso' 
            AND m.status = 'entregado'
            GROUP BY md.product_id, p.name
            ORDER BY total_quantity DESC
            LIMIT 5;
        `;
        const [rows] = await this.#db.query(query);
        return rows.map(row => new SellingProductsDTO(row))
    }

    /**
     * Obtiene la cantidad total de productos egresados por mes en un año específico.
     * @param {number|string} year - El año a consultar (ej: 2026).
     * @returns {Promise<Array>} Lista de objetos con 'month' (1-12) y 'total_items_sold'.
     */
    async getMonthlyEgresses(year) {
        const query = `
            SELECT 
                MONTH(m.date) AS month,
                SUM(md.quantity) AS total_items_sold
            FROM movements m
            JOIN movement_details md ON m.id = md.movement_id
            WHERE m.type = 'egreso' 
            AND m.status = 'entregado'
            AND YEAR(m.date) = ?
            GROUP BY MONTH(m.date)
            ORDER BY month ASC;
        `;
        const [rows] = await this.#db.query(query, [year]);
        return rows.map(row => new MonthlyEgressesDTO(row))
    }

    /**
     * Compara el rendimiento de egresos entre distintas sucursales mes a mes.
     * @param {number|string} year - El año a consultar (ej: 2026).
     * @returns {Promise<Array>} Lista con 'branch_name', 'month', y 'total_items_sold'.
     */
    async getBranchPerformanceByMonth(year) {
        const query = `
            SELECT 
                b.name AS branch_name,
                MONTH(m.date) AS month,
                SUM(md.quantity) AS total_items_sold
            FROM movements m
            JOIN movement_details md ON m.id = md.movement_id
            JOIN branches b ON m.origin_branch_id = b.id
            WHERE m.type = 'egreso' 
              AND m.status = 'entregado'
              AND YEAR(m.date) = ?
            GROUP BY b.id, b.name, MONTH(m.date)
            ORDER BY b.name ASC, month ASC;
        `;
        const [rows] = await this.#db.query(query, [year]);
        return rows.map(row => new BranchPerformanceDTO(row))
    }

    /**
     * Muestra la estacionalidad de un producto específico (cuánto salió cada mes).
     * Si un mes no tuvo ventas, la base de datos devuelve 0 en lugar de nulo.
     * @param {number} productId - ID del producto a analizar.
     * @param {number|string} year - El año a consultar.
     * @returns {Promise<Array>} Lista con 'month' (1-12) y 'total_egresos'.
     */
    async getProductSeasonality(productId, year) {
        const query = `
            SELECT 
                MONTH(m.date) AS month,
                COALESCE(SUM(md.quantity), 0) AS total_sold
            FROM movements m
            JOIN movement_details md ON m.id = md.movement_id
            WHERE m.type = 'egreso' 
              AND m.status = 'entregado'
              AND md.product_id = ?
              AND YEAR(m.date) = ?
            GROUP BY MONTH(m.date)
            ORDER BY month ASC;
        `
        const [rows] = await this.#db.query(query, [productId, year]);
        return rows.map(row => new ProductSeasonalityDTO(row))
    }

    /**
     * Calcula la suma total de artículos egresados en el mes calendario actual.
     * Usado para la tarjeta principal del Dashboard.
     * @returns {Promise<number>} Cantidad total de egresos del mes actual.
     */
    async getCurrentMonthEgresses(branchId = null) {
        let sql = `
            SELECT COALESCE(SUM(md.quantity), 0) AS total_egresos
            FROM movements m
            JOIN movement_details md ON m.id = md.movement_id
            WHERE m.type = 'egreso' 
              AND m.status = 'entregado'
              AND MONTH(m.date) = MONTH(CURRENT_DATE()) 
              AND YEAR(m.date) = YEAR(CURRENT_DATE())
        `
        const param = []

        if (branchId) {
            sql += ' AND origin_branch_id = ?'
            param.push(branchId)
        }
        const [rows] = await this.#db.query(sql, param)
        return rows[0].total_egresos
    }

    /**
     * Calcula la suma total de artículos egresados en el mes anterior.
     * @returns {Promise<number>} Cantidad total de egresos del mes anterior.
     */
    async getPreviousMonthEgresses(branchId = null) {
        let sql = `
            SELECT COALESCE(SUM(md.quantity), 0) AS total_egresos
            FROM movements m
            JOIN movement_details md ON m.id = md.movement_id
            WHERE m.type = 'egreso' 
              AND m.status = 'entregado'
              AND MONTH(m.date) = MONTH(CURRENT_DATE() - INTERVAL 1 MONTH) 
              AND YEAR(m.date) = YEAR(CURRENT_DATE() - INTERVAL 1 MONTH)
        `

        const param = []

        if (branchId) {
            sql += ' AND origin_branch_id = ?'
            param.push(branchId)
        }
        const [rows] = await this.#db.query(sql, param);
        return rows[0].total_egresos;
    }

    /**
     * Obtiene la cantidad de movimientos de tipo 'envio' que aún no fueron entregados.
     * @returns {Promise<number>} Total de envíos en estado 'pendiente' o 'en_proceso'.
     */
    async getPendingShipmentsCount(branchId = null) {
        let sql = `
            SELECT COUNT(*) AS total_pendientes
            FROM movements
            WHERE type = 'envio' 
            AND status IN ('pendiente', 'en_proceso')
        `

        const param = []

        if (branchId) {
            sql += ' AND destination_branch_id = ?'
            param.push(branchId)
        }
        const [rows] = await this.#db.query(sql, param);
        return rows[0].total_pendientes;
    }

    // --- NOTIFICACIONES PARA EMPLEADOS ---

    /**
     * Obtiene productos de una sucursal que están en stock crítico (cantidad <= mínimo permitido).
     * El producto solo se incluye si aún tiene stock (cantidad > 0).
     * @param {number} branchId - ID de la sucursal.
     * @returns {Promise<Array>} Lista con 'product_name', 'quantity', 'min_quantity'.
     */
    async getEmployeeCriticalStock(branchId) {
        const sql = `
        SELECT p.name AS product_name, pbs.quantity, pbs.min_quantity
        FROM product_branch_stock pbs
        JOIN products p ON pbs.product_id = p.id
        WHERE pbs.branch_id = ? 
          AND pbs.quantity <= pbs.min_quantity 
          AND pbs.quantity > 0
    `;
        const [rows] = await this.#db.query(sql, [branchId]);
        return rows;
    }

    /**
     * Obtiene productos de una sucursal que se han agotado (cantidad = 0).
     * @param {number} branchId - ID de la sucursal.
     * @returns {Promise<Array>} Lista con 'product_name'.
     */
    async getEmployeeZeroStock(branchId) {
        const sql = `
        SELECT p.name AS product_name
        FROM product_branch_stock pbs
        JOIN products p ON pbs.product_id = p.id
        WHERE pbs.branch_id = ? 
          AND pbs.quantity = 0
    `;
        const [rows] = await this.#db.query(sql, [branchId]);
        return rows;
    }

    /**
     * Obtiene los envíos en estado 'en_proceso' destinados a una sucursal específica.
     * @param {number} branchId - ID de la sucursal destino.
     * @returns {Promise<Array>} Lista con 'id', 'receipt_number', 'origin_name', 'date'.
     */
    async getEmployeeIncomingShipments(branchId) {
        const sql = `
        SELECT m.id, m.receipt_number, b.name AS origin_name, m.date
        FROM movements m
        JOIN branches b ON m.origin_branch_id = b.id
        WHERE m.destination_branch_id = ? 
          AND m.type = 'envio' 
          AND m.status = 'en_proceso'
    `;
        const [rows] = await this.#db.query(sql, [branchId]);
        return rows;
    }


    // --- NOTIFICACIONES PARA ADMINISTRADORES ---

    /**
     * Obtiene un resumen global de stock crítico por sucursal.
     * Muestra cuántos productos están por debajo del mínimo en cada sucursal.
     * @returns {Promise<Array>} Lista con 'branch_name', 'critical_count'.
     */
    async getAdminGlobalCriticalStock() {
        const sql = `
        SELECT b.name AS branch_name, COUNT(*) AS critical_count
        FROM product_branch_stock pbs
        JOIN branches b ON pbs.branch_id = b.id
        WHERE pbs.quantity <= pbs.min_quantity
        GROUP BY pbs.branch_id
    `;
        const [rows] = await this.#db.query(sql);
        return rows;
    }

    /**
     * Obtiene envíos que llevan más de 48 horas en estado 'en_proceso' (estancados).
     * Útil para alertar al administrador sobre envíos que podrían tener problemas.
     * @returns {Promise<Array>} Lista con 'id', 'receipt_number', 'origin_name', 'dest_name', 'date'.
     */
    async getAdminStalledShipments() {
        const sql = `
        SELECT m.id, m.receipt_number, 
               orig.name AS origin_name, dest.name AS dest_name, 
               m.date
        FROM movements m
        JOIN branches orig ON m.origin_branch_id = orig.id
        JOIN branches dest ON m.destination_branch_id = dest.id
        WHERE m.type = 'envio' 
          AND m.status = 'en_proceso'
          AND m.date < NOW() - INTERVAL 48 HOUR
    `;
        const [rows] = await this.#db.query(sql);
        return rows;
    }

    /**
     * Obtiene los últimos 5 envíos entregados en las últimas 48 horas.
     * Muestra los envíos confirmados recientemente por las sucursales.
     * @returns {Promise<Array>} Lista con 'id', 'receipt_number', 'dest_name', 'arrival_date'.
     */
    async getAdminRecentlyDeliveredShipments() {
        const sql = `
        SELECT m.id, m.receipt_number, dest.name AS dest_name, m.arrival_date
        FROM movements m
        JOIN branches dest ON m.destination_branch_id = dest.id
        WHERE m.type = 'envio' 
          AND m.status = 'entregado'
          AND m.arrival_date >= NOW() - INTERVAL 48 HOUR
        ORDER BY m.arrival_date DESC
        LIMIT 5
    `;
        const [rows] = await this.#db.query(sql);
        return rows;
    }
}