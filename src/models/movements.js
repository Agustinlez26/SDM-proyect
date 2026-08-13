import { Database } from "../config/connection.js"
import { MovementDetailsDTO } from "../dtos/movements/movement-details-dto.js"
import { MovementRecentsDTO } from "../dtos/movements/movement-recents-dto.js"
import { MovementDTO } from "../dtos/movements/movements-dto.js"
import { ShipmentsDTO } from "../dtos/movements/shipments-dto.js"
import { runTransactionWithRetry, sortStockItems } from "../utils/transaction-retry.js"

/**
 * Modelo de Movimientos (MovementsModel).
 * * Se encarga de la persistencia y gestión de transacciones de inventario.
 * Maneja tres tipos de flujos:
 * 1. INGRESO: Entrada de producción (Suma stock directo).
 * 2. EGRESO: Venta a cliente (Resta stock directo).
 * 3. ENVIO: Traslado entre sucursales (Flujo secuencial: Pendiente [stock descuenta] -> En Proceso [solo estado] -> Entregado [suma en destino]).
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
                m.egress_reason,
                COALESCE(m.sale_channel, sale_order.channel) AS sale_channel,
                m.explanation,
                m.movement_purpose,
                sale_order.customer_reference,
                sale_order.delivery_type,
                sale_order.shipping_method,
                sale_order.shipping_method_detail,
                requester.full_name AS requested_by_name,
                confirmer.full_name AS confirmed_by_name,
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
                    WHEN m.type = 'EGRESO' AND m.egress_reason = 'sale' THEN COALESCE(sale_order.customer_reference, 'Cliente')
                    WHEN m.type = 'EGRESO' THEN 'Cliente / Consumo'
                END as destination_branch

            FROM ${this.#table} m
            JOIN users u ON m.user_id = u.id
            LEFT JOIN users requester ON requester.id=m.requested_by
            LEFT JOIN users confirmer ON confirmer.id=m.confirmed_by
            LEFT JOIN branches bo ON m.origin_branch_id = bo.id
            LEFT JOIN branches bd ON m.destination_branch_id = bd.id
            LEFT JOIN orders sale_order ON sale_order.id=m.order_id
            WHERE 1=1
        `

        const params = []

        if (search) {
            sql += ' AND (m.receipt_number LIKE ? OR sale_order.customer_reference LIKE ?)'
            params.push(`%${search}%`, `%${search}%`)
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

        if (filters.employee_branch_id) {
            sql += ` AND m.type != 'ingreso' AND (m.origin_branch_id = ? OR m.destination_branch_id = ?)`;
            params.push(filters.employee_branch_id, filters.employee_branch_id);
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
                m.egress_reason,
                COALESCE(m.sale_channel, sale_order.channel) AS sale_channel,
                m.explanation,
                m.movement_purpose,
                sale_order.customer_reference,
                sale_order.delivery_type,
                sale_order.shipping_method,
                sale_order.shipping_method_detail,
                requester.full_name AS requested_by_name,
                confirmer.full_name AS confirmed_by_name,
                m.date,
                COALESCE(m.arrival_date, m.date) as effective_date,
                m.status,
                m.origin_branch_id,
                m.destination_branch_id,
                BIN_TO_UUID(m.user_id) as user_id, u.full_name as user_name,
                
                CASE 
                    WHEN m.type = 'INGRESO' THEN 'Producción'
                    WHEN m.type = 'ENVIO' THEN bo.name
                    ELSE bo.name
                END as origin_branch,

                CASE 
                    WHEN m.type = 'ENVIO' THEN bd.name
                    WHEN m.type = 'INGRESO' THEN bd.name
                    WHEN m.type = 'EGRESO' AND m.egress_reason = 'sale' THEN COALESCE(sale_order.customer_reference, 'Cliente')
                    WHEN m.type = 'EGRESO' THEN 'Cliente / Consumo'
                END as destination_branch

            FROM ${this.#table} m
            JOIN users u ON m.user_id = u.id
            LEFT JOIN users requester ON requester.id=m.requested_by
            LEFT JOIN users confirmer ON confirmer.id=m.confirmed_by
            LEFT JOIN branches bo ON m.origin_branch_id = bo.id
            LEFT JOIN branches bd ON m.destination_branch_id = bd.id
            LEFT JOIN orders sale_order ON sale_order.id=m.order_id
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
                p.id as product_id,
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

    async findIdByRequestKey(requestKey) {
        if (!requestKey) return null
        const [rows] = await this.#db.query(`SELECT id FROM ${this.#table} WHERE request_key = ? LIMIT 1`, [requestKey])
        return rows[0]?.id || null
    }

    async findShipmentsInProcess(branch_id = null) {
        let sql = `
            SELECT
                m.id,
                m.status,
                m.receipt_number,
                m.origin_branch_id,
                m.destination_branch_id,
                bo.name AS origin_branch_name,
                bd.name AS destination_branch_name,
                (SELECT COUNT(*) FROM movement_details summary_md WHERE summary_md.movement_id=m.id) AS product_count,
                (SELECT COALESCE(SUM(summary_md.quantity),0) FROM movement_details summary_md WHERE summary_md.movement_id=m.id) AS total_units,
                (SELECT GROUP_CONCAT(CONCAT(summary_p.name, ' ×', summary_md.quantity) ORDER BY summary_p.name SEPARATOR ' · ')
                    FROM movement_details summary_md
                    JOIN products summary_p ON summary_p.id=summary_md.product_id
                    WHERE summary_md.movement_id=m.id) AS product_summary,
                m.date
            FROM ${this.#table} m
            JOIN ${this.#tableBranches} bo ON m.origin_branch_id = bo.id
            JOIN ${this.#tableBranches} bd ON m.destination_branch_id = bd.id
            WHERE m.type = 'envio' AND m.status != 'entregado'
        `

        const params = []

        if (branch_id) {
            sql += " AND ((m.origin_branch_id = ? AND m.status = 'pendiente') OR (m.destination_branch_id = ? AND m.status = 'en_proceso'))"
            params.push(branch_id, branch_id)
        }
        const [rows] = await this.#db.query(sql, params)
        return rows.map(row => new ShipmentsDTO(row))
    }

    /**
     * Obtiene los últimos 5 movimientos para un dashboard.
     * Opcionalmente filtrados por sucursal de destino.
     * * @param {number|null} branchId - Filtro opcional por sucursal.
     */
    async findRecent(branchId = null) {
        const params = []
        let sql = `
            SELECT
            m.id,
            m.type, 
            m.egress_reason,
            m.date, 
            m.status, 
            m.receipt_number
            FROM ${this.#table} m
        `
        if (branchId) {
            sql += " WHERE (m.type = 'envio' AND m.destination_branch_id = ? AND m.status = 'en_proceso') OR (m.type = 'egreso' AND m.origin_branch_id = ?)"
            params.push(branchId, branchId)
        }
        sql += ' ORDER BY m.created_at DESC LIMIT 5'

        const [rows] = await this.#db.query(sql, params)
        return rows.map(row => new MovementRecentsDTO(row))
    }

    /**
     * Crea la cabecera del movimiento, sus detalles y actualiza el stock (si corresponde).
     * * NOTA: Para ENVIO, el stock se resta en origen al crear el movimiento.
     * Al despachar solo se cambia el estado.
     * * @param {Object} data - Datos del movimiento (type, date, user_id, branches, status).
     * @param {Array} details - Array de productos y cantidades.
     * @param {string} stockAction - 'ADD', 'SUBTRACT' o 'NONE'.
     * @param {number} targetBranchId - Sucursal donde impactar el stock (si action != NONE).
     * @returns {Promise<number>} ID del nuevo movimiento.
     */
    async createTransaction(data, details, stockAction, targetBranchId) {
        const sortedDetails = sortStockItems(details)
        try {
            return await runTransactionWithRetry(this.#db, async connection => {
                const sqlHeader = `
                    INSERT INTO ${this.#table}
                    (receipt_number, request_key, type, egress_reason, sale_channel, explanation, date, user_id, origin_branch_id, destination_branch_id, status)
                    VALUES (?, ?, ?, ?, ?, ?, NOW(), UUID_TO_BIN(?), ?, ?, ?)
                `
                const [resultHeader] = await connection.query(sqlHeader, [
                    data.receipt_number, data.request_key, data.type, data.egress_reason || null, data.sale_channel || null,
                    data.explanation || null, data.user_id,
                    data.origin_branch_id, data.destination_branch_id, data.status
                ])
                const movementId = resultHeader.insertId

                const values = sortedDetails.map(d => [movementId, d.product_id, d.quantity])
                await connection.query(`INSERT INTO ${this.#tableDetails} (movement_id, product_id, quantity) VALUES ?`, [values])

                for (const item of sortedDetails) {
                    if (stockAction === 'ADD') {
                        const minQty = item.min_quantity || 0
                        await connection.query(`
                            INSERT INTO ${this.#tableStock} (branch_id, product_id, quantity, min_quantity)
                            VALUES (?, ?, ?, ?)
                            ON DUPLICATE KEY UPDATE quantity = quantity + ?
                        `, [targetBranchId, item.product_id, item.quantity, minQty, item.quantity])
                    } else if (stockAction === 'SUBTRACT') {
                        const [res] = await connection.query(`
                            UPDATE ${this.#tableStock}
                            SET quantity = quantity - ?
                            WHERE branch_id = ? AND product_id = ?
                              AND quantity - COALESCE((SELECT SUM(r.quantity) FROM stock_reservations r
                                  WHERE r.branch_id = ? AND r.product_id = ? AND r.status = 'active'), 0) >= ?
                        `, [item.quantity, targetBranchId, item.product_id, targetBranchId, item.product_id, item.quantity])

                        if (res.affectedRows === 0) throw new Error(`Stock insuficiente para el producto ID: ${item.product_id}`)
                    }
                }

                return movementId
            })
        } catch (error) {
            if (error?.code === 'ER_DUP_ENTRY' && data.request_key) {
                const existingId = await this.findIdByRequestKey(data.request_key)
                if (existingId) return existingId
            }
            throw error
        }
    }

    /**
     * FASE 1 ENVÍO: Despachar (Pendiente -> En Proceso).
     * Solo cambia el estado del envío a 'en_proceso'.
     * El stock ya fue descontado al crear el movimiento.
     * Utiliza 'FOR UPDATE' para evitar condiciones de carrera.
     * * @param {number} movementId 
     * @param {Array} details 
     */
    async dispatchShipment(movementId) {
        return runTransactionWithRetry(this.#db, async connection => {
            const [rows] = await connection.query(
                `SELECT status FROM ${this.#table} WHERE id = ? FOR UPDATE`,
                [movementId]
            )

            if (rows.length === 0 || rows[0].status !== 'pendiente') {
                throw new Error(`El envío no está en estado 'pendiente'. Estado actual: ${rows[0]?.status}`)
            }

            await connection.query(
                `UPDATE ${this.#table} SET status = 'en_proceso', date = NOW() WHERE id = ?`,
                [movementId]
            )

        })
    }

    /**
     * FASE 2 ENVÍO: Recibir (En Proceso -> Entregado).
     * Suma el stock a la sucursal de destino y marca la fecha de llegada.
     * * @param {number} movementId 
     * @param {Array} details 
     */
    async receiveShipment(movementId, details) {
        const sortedDetails = sortStockItems(details, () => 0, item => item.product.id)
        return runTransactionWithRetry(this.#db, async connection => {
            const [rows] = await connection.query(
                `SELECT status, origin_branch_id, destination_branch_id FROM ${this.#table} WHERE id = ? FOR UPDATE`,
                [movementId]
            )

            if (rows.length === 0 || rows[0].status !== 'en_proceso') {
                throw new Error(`El envío no está en tránsito. Debe estar 'en_proceso'. Estado actual: ${rows[0]?.status}`)
            }

            const destinationBranchId = rows[0].destination_branch_id
            const originBranchId = rows[0].origin_branch_id

            for (const item of sortedDetails) {

                const productId = item.product.id

                const [centralStock] = await connection.query(
                    `SELECT min_quantity FROM ${this.#tableStock} WHERE branch_id = ? AND product_id = ? LIMIT 1`,
                    [originBranchId, productId]
                );

                const inheritedMinQty = centralStock[0]?.min_quantity || 0

                const sqlUpsert = `
                    INSERT INTO ${this.#tableStock} (branch_id, product_id, quantity, min_quantity)
                    VALUES (?, ?, ?, ?)
                    ON DUPLICATE KEY UPDATE quantity = quantity + ?
                `
                await connection.query(sqlUpsert, [
                    destinationBranchId, item.product.id, item.quantity, inheritedMinQty, item.quantity
                ])
            }

            await connection.query(
                `UPDATE ${this.#table} SET status = 'entregado', arrival_date = NOW() WHERE id = ?`,
                [movementId]
            )

        })
    }
}
