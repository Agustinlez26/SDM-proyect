import { Database } from '../config/connection.js'

export class OrderModel {
    #db
    constructor({ db } = {}) { this.#db = db || Database.getInstance() }

    async overview(branchId = null) {
        const params = []
        const where = branchId ? 'WHERE o.branch_id = ?' : ''
        if (branchId) params.push(branchId)
        const [orders] = await this.#db.query(`
            SELECT o.id, o.order_number, o.channel, o.customer_reference, o.status, o.notes,
                o.branch_id, b.name AS branch_name, o.created_at,
                GROUP_CONCAT(CONCAT(p.name, ' x', oi.quantity) ORDER BY p.name SEPARATOR ', ') AS items
            FROM orders o JOIN branches b ON b.id = o.branch_id
            JOIN order_items oi ON oi.order_id = o.id JOIN products p ON p.id = oi.product_id
            ${where} GROUP BY o.id ORDER BY o.id DESC
        `, params)
        const [branches] = await this.#db.query('SELECT id, name FROM branches WHERE is_active = TRUE ORDER BY name')
        return { orders, branches }
    }

    async catalog(branchId) {
        const [rows] = await this.#db.query(`
            SELECT p.id, p.name, p.cod_bar AS sku, p.url_img_small,
                GREATEST(s.quantity - COALESCE(r.quantity, 0), 0) AS available
            FROM product_branch_stock s JOIN products p ON p.id = s.product_id AND p.is_active = TRUE
            LEFT JOIN (SELECT product_id, branch_id, SUM(quantity) quantity FROM stock_reservations
                WHERE status = 'active' GROUP BY product_id, branch_id) r
                ON r.product_id = s.product_id AND r.branch_id = s.branch_id
            WHERE s.branch_id = ? ORDER BY p.name
        `, [branchId])
        return rows
    }

    async create(data, userId) {
        const connection = await this.#db.getConnection()
        try {
            await connection.beginTransaction()
            const [[branch]] = await connection.query('SELECT id FROM branches WHERE id = ? AND is_active = TRUE', [data.branch_id])
            if (!branch) throw new Error('La sucursal seleccionada no existe o esta inactiva')
            for (const item of data.items) {
                const [[stock]] = await connection.query(`SELECT s.quantity,
                    COALESCE((SELECT SUM(sr.quantity) FROM stock_reservations sr WHERE sr.product_id=s.product_id AND sr.branch_id=s.branch_id AND sr.status='active'),0) reserved
                    FROM product_branch_stock s WHERE s.branch_id=? AND s.product_id=? FOR UPDATE`, [data.branch_id, item.product_id])
                const available = stock ? Number(stock.quantity) - Number(stock.reserved) : 0
                if (available < item.quantity) throw new Error(`Stock disponible insuficiente para el producto ${item.product_id}. Disponible: ${available}`)
            }
            const orderNumber = `PED-${Date.now().toString(36).toUpperCase()}`
            const [result] = await connection.query(`INSERT INTO orders (order_number,channel,customer_reference,branch_id,notes,created_by)
                VALUES (?,?,?,?,?,UUID_TO_BIN(?))`, [orderNumber, data.channel, data.customer_reference.trim(), data.branch_id, data.notes || null, userId])
            for (const item of data.items) {
                await connection.query('INSERT INTO order_items (order_id,product_id,quantity) VALUES (?,?,?)', [result.insertId, item.product_id, item.quantity])
                await connection.query("INSERT INTO stock_reservations (product_id,branch_id,order_id,quantity,status) VALUES (?,?,?,?,'active')", [item.product_id, data.branch_id, result.insertId, item.quantity])
            }
            await connection.commit()
            return result.insertId
        } catch (error) { await connection.rollback(); throw error } finally { connection.release() }
    }

    async complete(id, userId, allowedBranchId = null) {
        const connection = await this.#db.getConnection()
        try {
            await connection.beginTransaction()
            const params = [id]
            let orderSql = "SELECT * FROM orders WHERE id=? AND status='reserved'"
            if (allowedBranchId) { orderSql += ' AND branch_id=?'; params.push(allowedBranchId) }
            orderSql += ' FOR UPDATE'
            const [[order]] = await connection.query(orderSql, params)
            if (!order) throw new Error('El pedido no existe o ya fue cerrado')
            const [items] = await connection.query('SELECT product_id,quantity FROM order_items WHERE order_id=?', [id])
            for (const item of items) {
                const [updated] = await connection.query('UPDATE product_branch_stock SET quantity=quantity-? WHERE branch_id=? AND product_id=? AND quantity>=?', [item.quantity, order.branch_id, item.product_id, item.quantity])
                if (!updated.affectedRows) throw new Error(`El stock fisico ya no alcanza para el producto ${item.product_id}`)
            }
            const [movement] = await connection.query(`INSERT INTO movements
                (receipt_number,type,egress_reason,order_id,date,user_id,origin_branch_id,destination_branch_id,status)
                VALUES (?,'egreso','sale',?,NOW(),UUID_TO_BIN(?),?,NULL,'entregado')`, [`MOV-${Date.now()}`, id, userId, order.branch_id])
            await connection.query('INSERT INTO movement_details (movement_id,product_id,quantity) VALUES ?', [items.map(item => [movement.insertId, item.product_id, item.quantity])])
            await connection.query("UPDATE stock_reservations SET status='fulfilled' WHERE order_id=? AND status='active'", [id])
            await connection.query("UPDATE orders SET status='completed',movement_id=? WHERE id=?", [movement.insertId, id])
            await connection.commit()
            return movement.insertId
        } catch (error) { await connection.rollback(); throw error } finally { connection.release() }
    }

    async cancel(id, allowedBranchId = null) {
        const connection = await this.#db.getConnection()
        try {
            await connection.beginTransaction()
            const params = [id]
            let sql = "UPDATE orders SET status='cancelled' WHERE id=? AND status='reserved'"
            if (allowedBranchId) { sql += ' AND branch_id=?'; params.push(allowedBranchId) }
            const [updated] = await connection.query(sql, params)
            if (!updated.affectedRows) throw new Error('El pedido no existe o ya fue cerrado')
            await connection.query("UPDATE stock_reservations SET status='released' WHERE order_id=? AND status='active'", [id])
            await connection.commit()
        } catch (error) { await connection.rollback(); throw error } finally { connection.release() }
    }
}
