import { Database } from "../config/connection.js"
import { MovementDetailsDTO } from "../dtos/movements/movement_details_DTO.js"
import { MovementRecentsDTO } from "../dtos/movements/movement_recents_DTO.js"
import { MovementDTO } from "../dtos/movements/movements_DTO.js"
import { ShipmentsDTO } from "../dtos/movements/shipments_DTO.js"

/**
 * Modelo de Movimientos (MovementsModel).
 * * Se encarga de la persistencia y gestión de transacciones de inventario.
 * Maneja tres tipos de flujos:
 * 1. INGRESO: Entrada de producción (Suma stock directo).
 * 2. EGRESO: Venta a cliente (Resta stock directo).
 * 3. ENVIO: Traslado entre sucursales (Flujo secuencial: Pendiente -> En Proceso -> Entregado).
 */
export class MovementModel {
    #db
    #table = 'movements'
    #tableDetails = 'movement_details'
    #tableStock = 'product_branch_stock'
    #tableBranches = 'branches'

    constructor({ db }) {
        this.#db = db || Database.getInstance
    }

    /**
     * Busca movimientos con filtros avanzados y paginación.
     * Normaliza los nombres de origen/destino para visualización (ej: muestra "Producción" o "Cliente").
     * * @param {Object} options - Opciones de búsqueda.
     * @param {string|null} options.search - Búsqueda por número de comprobante.
     * @param {Object} options.filters - Filtros (type, origin_branch_id, etc).
     * @param {number|null} options.offset - Paginación (salto).
     * @param {number|null} options.limit - Paginación (límite).
     * @returns {Promise<MovementDTO[]>} Lista de DTOs de movimientos.
     */
    async findAll({ search = null, filters = {}, offset = null, limit = null } = {}) {
        let sql = `
            SELECT 
                m.id,
                m.receipt_number,
                m.type,
                m.date,
                COALESCE(m.arrival_date, m.date) as effective_date,
                m.status,
                BIN_TO_UUID(m.user_id) as user_id,
                u.full_name as user_name,
                
                CASE 
                    WHEN m.type = 'INGRESO' THEN 'Producción'
                    WHEN m.type = 'ENVIO' THEN bo.name
                    ELSE bo.name -- En Egresos, el origen somos nosotros
                END as origin_branch,

                CASE 
                    WHEN m.type = 'ENVIO' THEN bd.name
                    WHEN m.type = 'INGRESO' THEN bd.name -- En Ingresos, el destino somos nosotros
                    WHEN m.type = 'EGRESO' THEN 'Cliente / Consumo'
                END as destination_branch

            FROM ${this.#table} m
            JOIN users u ON m.user_id = u.id
            LEFT JOIN branches bo ON m.origin_branch_id = bo.id
            LEFT JOIN branches bd ON m.destination_branch_id = bd.id
            WHERE 1=1
        `

        const params = []

        if (search) {
            sql += ' AND m.receipt_number LIKE ?'
            params.push(`%${search}%`)
        }

        if (filters.type) {
            sql += ' AND m.type = ?'
            params.push(filters.type)
        }

        if (filters.origin_branch_id) {
            sql += ' AND m.origin_branch_id = ?'
            params.push(filters.origin_branch_id)
        }

        if (filters.destination_branch_id) {
            sql += ' AND m.destination_branch_id = ?'
            params.push(filters.destination_branch_id)
        }

        if (filters.date_start) {
            sql += ' AND m.date >= ?'
            params.push(filters.date_start)
        }

        if (filters.date_end) {
            sql += ' AND m.date <= ?'
            params.push(filters.date_end)
        }

        if (filters.user_id) {
            sql += ' AND m.user_id = UUID_TO_BIN(?)'
            params.push(filters.user_id)
        }

        sql += ' ORDER BY m.date DESC, m.id DESC'

        if (Number.isFinite(limit) && Number.isFinite(offset) && offset >= 0) {
            sql += ` LIMIT ${limit} OFFSET ${offset}`
        }

        const [rows] = await this.#db.query(sql, params)
        return rows.map(row => new MovementDTO(row))
    }

    /**
     * Busca un movimiento por ID.
     * Incluye la lógica de COALESCE para fechas y CASE para nombres de sucursales.
     * * @param {number} id - ID del movimiento.
     * @returns {Promise<MovementDTO|null>} El movimiento encontrado o null.
     */
    async findById(id) {
        const sql = `
            SELECT 
                m.id,
                m.receipt_number,
                m.type, 
                m.date,
                COALESCE(m.arrival_date, m.date) as effective_date,
                m.status,
                BIN_TO_UUID(m.user_id) as user_id, u.full_name as user_name,
                
                CASE 
                    WHEN m.type = 'INGRESO' THEN 'Producción'
                    WHEN m.type = 'ENVIO' THEN bo.name
                    ELSE bo.name
                END as origin_branch,

                CASE 
                    WHEN m.type = 'ENVIO' THEN bd.name
                    WHEN m.type = 'INGRESO' THEN bd.name
                    WHEN m.type = 'EGRESO' THEN 'Cliente / Consumo'
                END as destination_branch

            FROM ${this.#table} m
            JOIN users u ON m.user_id = u.id
            LEFT JOIN branches bo ON m.origin_branch_id = bo.id
            LEFT JOIN branches bd ON m.destination_branch_id = bd.id
            WHERE m.id = ? LIMIT 1
        `

        const [rows] = await this.#db.query(sql, [id])
        if (rows.length === 0) return null
        return new MovementDTO(rows[0])
    }

    /**
     * Obtiene los productos (detalles) asociados a un movimiento.
     * * @param {number} movementId 
     * @returns {Promise<MovementDetailsDTO[]>} Lista de detalles.
     */
    async findDetails(movementId) {
        const sql = `
            SELECT 
                md.id,
                p.name as product_name,
                p.cod_bar,
                p.url_img_small as product_img,
                md.quantity
            FROM ${this.#tableDetails} md
            JOIN products p ON md.product_id = p.id
            WHERE md.movement_id = ?
        `
        const [rows] = await this.#db.query(sql, [movementId])
        return rows.map(row => new MovementDetailsDTO(row))
    }

    async findShipmentsInProcess(branch_id = null) {
        let sql = `
            SELECT
                m.id
                m.status,
                m.receipt_number,
                b.name as branch
                m.date
            FROM ${this.#table} m
            JOIN ${this.#tableBranches} b ON m.destination_branch_id = b.id
            WHERE m.type = 'envio'
        `

        const params = []

        if (branch_id) {
            sql += ' AND m.destination_branch_id = ?'
            params.push(branch_id)
        }
        const [rows] = await this.#db.query(sql, params)
        return rows.map(row => new ShipmentsDTO(row))
    }

    /**
     * Obtiene los últimos 5 movimientos para un dashboard.
     * Opcionalmente filtrados por sucursal de destino.
     * * @param {number|null} branchId - Filtro opcional por sucursal.
     */
    async getRecent(branchId = null) {
        const params = []
        let sql = `
            SELECT
            m.id,
            m.type, 
            m.date, 
            m.status, 
            m.receipt_number
            FROM ${this.#table} m
        `
        if (branchId) {
            sql += ' WHERE m.destination_branch_id = ?'
            params.push(branchId)
        }
        sql += ' ORDER BY m.created_at DESC LIMIT 5'

        const [rows] = await this.#db.query(sql, params)
        return rows.map(row => new MovementRecentsDTO)
    }

    /**
     * Crea la cabecera del movimiento, sus detalles y actualiza el stock (si corresponde).
     * * NOTA: Si el tipo es 'ENVIO', esta función NO actualiza el stock, solo crea el registro en estado 'pendiente'.
     * El stock se descontará posteriormente en dispatchShipment.
     * * @param {Object} data - Datos del movimiento (type, date, user_id, branches, status).
     * @param {Array} details - Array de productos y cantidades.
     * @param {string} stockAction - 'ADD', 'SUBTRACT' o 'NONE'.
     * @param {number} targetBranchId - Sucursal donde impactar el stock (si action != NONE).
     * @returns {Promise<number>} ID del nuevo movimiento.
     */
    async createTransaction(data, details, stockAction, targetBranchId) {
        const connection = await this.#db.getConnection()
        try {
            await connection.beginTransaction()

            const sqlHeader = `
                INSERT INTO ${this.#table} 
                (receipt_number, type, date, user_id, origin_branch_id, destination_branch_id, status) 
                VALUES (?, ?, NOW(), UUID_TO_BIN(?), ?, ?, ?)
            `
            const [resultHeader] = await connection.query(sqlHeader, [
                data.receipt_number, data.type, data.user_id,
                data.origin_branch_id, data.destination_branch_id, data.status
            ])
            const movementId = resultHeader.insertId

            const values = details.map(d => [movementId, d.product_id, d.quantity])
            await connection.query(`INSERT INTO ${this.#tableDetails} (movement_id, product_id, quantity) VALUES ?`, [values])

            if (data.type !== 'ENVIO') {
                for (const item of details) {
                    if (stockAction === 'ADD') {
                        const sqlUpsert = `
                            INSERT INTO ${this.#tableStock} (branch_id, product_id, quantity)
                            VALUES (?, ?, ?) 
                            ON DUPLICATE KEY UPDATE quantity = quantity + ?
                        `
                        await connection.query(sqlUpsert, [targetBranchId, item.product_id, item.quantity, item.quantity])

                    } else if (stockAction === 'SUBTRACT') {
                        const sqlUpdate = `
                            UPDATE ${this.#tableStock} 
                            SET quantity = quantity - ? 
                            WHERE branch_id = ? AND product_id = ? AND quantity >= ?
                        `
                        const [res] = await connection.query(sqlUpdate, [item.quantity, targetBranchId, item.product_id, item.quantity])

                        if (res.affectedRows === 0) {
                            throw new Error(`Stock insuficiente para el producto ID: ${item.product_id}`)
                        }
                    }
                }
            }

            await connection.commit()
            return movementId
        } catch (error) {
            await connection.rollback()
            throw error
        } finally {
            connection.release()
        }
    }

    /**
     * FASE 1 ENVÍO: Despachar (Pendiente -> En Proceso).
     * Resta el stock de la sucursal de origen.
     * Utiliza 'FOR UPDATE' para evitar condiciones de carrera.
     * * @param {number} movementId 
     * @param {Array} details 
     */
    async dispatchShipment(movementId, details) {
        const connection = await this.#db.getConnection()
        try {
            await connection.beginTransaction()

            const [rows] = await connection.query(
                `SELECT status, origin_branch_id FROM ${this.#table} WHERE id = ? FOR UPDATE`,
                [movementId]
            )

            if (rows.length === 0 || rows[0].status !== 'pendiente') {
                throw new Error(`El envío no está en estado 'pendiente'. Estado actual: ${rows[0]?.status}`)
            }

            const originBranchId = rows[0].origin_branch_id

            for (const item of details) {
                const sqlSubtract = `
                    UPDATE ${this.#tableStock} 
                    SET quantity = quantity - ? 
                    WHERE branch_id = ? AND product_id = ? AND quantity >= ?
                `
                const [result] = await connection.query(sqlSubtract, [
                    item.quantity, originBranchId, item.product_id, item.quantity
                ])

                if (result.affectedRows === 0) {
                    throw new Error(`Stock insuficiente en origen (ID: ${item.product_id}) para realizar el despacho.`)
                }
            }

            await connection.query(
                `UPDATE ${this.#table} SET status = 'en_proceso', set date = NOW() WHERE id = ?`,
                [movementId]
            )

            await connection.commit()
        } catch (error) {
            await connection.rollback()
            throw error
        } finally {
            connection.release()
        }
    }

    /**
     * FASE 2 ENVÍO: Recibir (En Proceso -> Entregado).
     * Suma el stock a la sucursal de destino y marca la fecha de llegada.
     * * @param {number} movementId 
     * @param {Array} details 
     */
    async receiveShipment(movementId, details) {
        const connection = await this.#db.getConnection()
        try {
            await connection.beginTransaction()

            const [rows] = await connection.query(
                `SELECT status, destination_branch_id FROM ${this.#table} WHERE id = ? FOR UPDATE`,
                [movementId]
            )

            if (rows.length === 0 || rows[0].status !== 'en_proceso') {
                throw new Error(`El envío no está en tránsito. Debe estar 'en_proceso'. Estado actual: ${rows[0]?.status}`)
            }

            const destinationBranchId = rows[0].destination_branch_id

            for (const item of details) {
                const sqlUpsert = `
                    INSERT INTO ${this.#tableStock} (branch_id, product_id, quantity)
                    VALUES (?, ?, ?)
                    ON DUPLICATE KEY UPDATE quantity = quantity + ?
                `
                await connection.query(sqlUpsert, [
                    destinationBranchId, item.product_id, item.quantity, item.quantity
                ])
            }

            await connection.query(
                `UPDATE ${this.#table} SET status = 'entregado', arrival_date = NOW() WHERE id = ?`,
                [movementId]
            )

            await connection.commit()
        } catch (error) {
            await connection.rollback()
            throw error
        } finally {
            connection.release()
        }
    }

    async shipmentsPendings(branchID = null) {

    }
}