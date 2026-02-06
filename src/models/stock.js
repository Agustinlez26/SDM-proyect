import { Stock_DTO } from "../dtos/stocks/stock_DTO.js"
import { Stock_list_DTO } from "../dtos/stocks/Stock_list_DTO.js"
import { Database } from "../config/connection.js"

/**
 * Modelo para gestionar el inventario (Stock) de productos en sucursales.
 * Maneja la tabla intermedia 'product_branch_stock'.
 */
export class StockModel {
    #db
    #table = 'product_branch_stock'
    #table2 = 'products'
    #table3 = 'branches'
    #fieldsToInsert = ['product_id', 'branch_id', 'quantity', 'min_quantity']
    #fieldsToUpdate = ['quantity', 'min_quantity']

    /**
         * @param {Object} dependencies
         * @param {Database} [dependencies.db] - Instancia de la base de datos.
         */
    constructor({ db }) {
        this.#db = db || Database.getInstance()
    }

    /**
         * Busca stock con filtros avanzados y paginación.
         * @param {Object} params - Parámetros de búsqueda.
         * @param {string|null} [params.search] - Texto para buscar por nombre o código.
         * @param {Object} [params.filters] - Filtros (category, branch, lowStock, outStock).
         * @param {number|null} [params.offset] - Offset para paginación.
         * @param {number|null} [params.limit] - Límite de registros.
         * @returns {Promise<Stock_list_DTO[]>} Lista de stocks formateada.
         */
    async findAll({ search = null, filters = {}, offset = null, limit = null } = {}) {
        let sql = `SELECT
        s.id,
        p.name,
        p.cod_bar,
        p.url_img_small as img,
        s.quantity
        FROM
        ${this.#table} s
        JOIN ${this.#table2} p
        ON s.product_id = p.id
        WHERE 1=1`

        const params = []

        if (search) {
            sql += ' AND (p.name LIKE ? OR p.cod_bar LIKE ?)'
            params.push(`%${search}%`, `%${search}%`)
        }

        if (filters.category) {
            sql += ' AND p.category_id = ?'
            params.push(filters.category)
        }

        if (filters.branch) {
            sql += ' AND s.branch_id = ?'
            params.push(filters.branch)
        }

        if (filters.lowStock) {
            sql += ' AND s.quantity <= s.min_quantity'
        }

        if (filters.outStock) {
            sql += ' AND s.quantity = 0'
        }

        sql += ' ORDER BY s.id DESC'

        if (Number.isFinite(limit) && Number.isFinite(offset) && offset >= 0) {
            sql += ` LIMIT ${limit} OFFSET ${offset}`
        }

        console.log('--- DEBUG QUERY ---');
        console.log('SQL:', sql);
        console.log('PARAMS:', params);
        console.log('-------------------');

        const [rows] = await this.#db.query(sql, params)
        return rows.map(row => new Stock_list_DTO(row))
    }

    /**
         * Busca un registro de stock por su ID único.
         * @param {number} id - ID de la tabla product_branch_stock.
         * @returns {Promise<Stock_DTO|null>} El DTO del stock o null si no existe.
         */
    async findById(id) {
        const sql = `
        SELECT
        s.id,
        p.name,
        p.cod_bar,
        b.name as branch,
        p.url_img_original as img,
        s.quantity,
        s.min_quantity
        FROM ${this.#table} s
        JOIN ${this.#table2} p
        ON s.product_id = p.id
        JOIN ${this.#table3} b
        ON s.branch_id = b.id
        WHERE s.id = ? LIMIT 1
        `

        const [row] = await this.#db.query(sql, [id])
        if (row.length === 0) return null
        return new Stock_DTO(row[0])
    }

    /**
         * Asigna un producto a una sucursal (Crea relación de stock).
         * @param {Object} stockData - Datos del stock (product_id, branch_id, quantity, min_quantity).
         * @returns {Promise<number>} ID del nuevo registro insertado.
         */
    async create(stockData) {
        const colums = this.#fieldsToInsert.join(', ')
        const placeholders = this.#fieldsToInsert.map(() => '?').join(', ')
        const values = this.#fieldsToInsert.map(field => stockData[field])

        const sql = `INSERT INTO ${this.#table} (${colums}) VALUES (${placeholders})`
        const [result] = await this.#db.query(sql, values)
        return result.insertId
    }

    /**
/**
     * Actualiza la cantidad o el mínimo de un stock existente.
     * @param {number} id - ID del registro de stock.
     * @param {Object} stockData - Datos a actualizar (quantity, min_quantity).
     * @returns {Promise<boolean>} True si se actualizó, False si no se encontró.
     */
    async update(id, stockData) {
        const keys = Object.keys(stockData);
        const allowedKeys = keys.filter(key => this.#fieldsToUpdate.includes(key));
        if (allowedKeys.length === 0) {
            return false;
        }

        const setClausule = allowedKeys.map(key => `${key} = ?`).join(', ')
        const values = allowedKeys.map(key => stockData[key])
        const parameters = [...values, id]

        const sql = `UPDATE ${this.#table} SET ${setClausule} WHERE id = ?`
        const [result] = await this.#db.query(sql, parameters)
        return result.affectedRows > 0
    }

    /**
         * Verifica si existe un registro de stock por ID.
         * @param {number} id 
         * @returns {Promise<boolean>}
         */
    async exists(id) {
        const sql = `SELECT 1 FROM ${this.#table} WHERE id = ?`
        const [rows] = await this.#db.query(sql, [id])
        return rows.length > 0
    }

    /**
         * Busca la relación exacta entre producto y sucursal.
         * @param {number} productId 
         * @param {number} branchId 
         * @returns {Promise<Object|undefined>} Objeto { id } o undefined.
         */
    async findByProductAndBranch(productId, branchId) {
        const sql = `SELECT id FROM ${this.#table} WHERE product_id = ? AND branch_id = ?`
        const [rows] = await this.#db.query(sql, [productId, branchId])
        return rows[0]
    }

    /**
         * Cuenta cuántos productos tienen stock bajo en una sucursal (o en todas).
         * @param {number|null} [id=null] - ID de la sucursal.
         * @returns {Promise<Object>} Objeto { count: number }.
         */
    async lowStock(id = null) {
        let sql = `SELECT COUNT(*) as count FROM ${this.#table} WHERE quantity <= min_quantity`
        const params = []
        if (id) {
            sql += ' AND branch_id = ?'
            params.push(id)
        }
        const [rows] = await this.#db.query(sql, params)
        return rows[0]
    }

    /**
         * Cuenta cuántos productos están sin stock.
         * @param {number|null} [id=null] - ID de la sucursal.
         * @returns {Promise<Object>} Objeto { count: number }.
         */
    async outStock(id = null) {
        let sql = `SELECT COUNT(*) as count FROM ${this.#table} WHERE quantity = 0`
        const params = []
        if (id) {
            sql += ' AND branch_id = ?'
            params.push(id)
        }
        const rows = await this.#db.query(sql, params)
        return rows[0]
    }

    /**
         * Elimina un registro de stock por su ID.
         * @param {number} id - ID de la tabla product_branch_stock.
         * @returns {Promise<boolean>} True si se eliminó.
         */
    async delete(id) {
        const sql = `DELETE FROM ${this.#table} WHERE id = ?`
        const [result] = await this.#db.query(sql, [id])
        return result.affectedRows > 0
    }
}