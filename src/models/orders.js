import { Database } from '../config/connection.js'

export class OrderModel {
    #db
    constructor({ db } = {}) { this.#db = db || Database.getInstance() }

    async allowedBranches(userId, globalAccess = false) {
        const [rows] = globalAccess
            ? await this.#db.query('SELECT id,name FROM branches WHERE is_active=TRUE ORDER BY id')
            : await this.#db.query(`SELECT b.id,b.name FROM user_branch_access uba JOIN branches b ON b.id=uba.branch_id WHERE uba.user_id=UUID_TO_BIN(?) AND uba.is_enabled=TRUE AND b.is_active=TRUE ORDER BY b.id`, [userId])
        return rows
    }

    async orderInfo(id) {
        const [[row]] = await this.#db.query('SELECT id,channel,BIN_TO_UUID(created_by) created_by,branch_id,status FROM orders WHERE id=?', [id])
        return row
    }

    async reservationBranchIds(orderId) {
        const [rows] = await this.#db.query("SELECT DISTINCT branch_id FROM stock_reservations WHERE order_id=? AND status='active'", [orderId])
        return rows.map(row => Number(row.branch_id))
    }

    async overview(channel, allowedBranchIds = null) {
        const params = [channel]
        let where = 'WHERE o.channel=?'
        if (allowedBranchIds?.length) {
            where += ` AND NOT EXISTS (SELECT 1 FROM stock_reservations access_sr WHERE access_sr.order_id=o.id AND access_sr.branch_id NOT IN (${allowedBranchIds.map(() => '?').join(',')}))`
            params.push(...allowedBranchIds)
        }
        const [orders] = await this.#db.query(`
            SELECT o.id,o.order_number,o.channel,o.customer_reference,o.status,o.notes,o.branch_id,
                b.name branch_name,o.created_at,
                GROUP_CONCAT(DISTINCT CONCAT(p.name,' x',sr.quantity,' — ',rb.name) ORDER BY p.name,rb.name SEPARATOR ', ') items
            FROM orders o JOIN branches b ON b.id=o.branch_id
            JOIN stock_reservations sr ON sr.order_id=o.id
            JOIN products p ON p.id=sr.product_id JOIN branches rb ON rb.id=sr.branch_id
            ${where} GROUP BY o.id ORDER BY o.id DESC
        `, params)
        return { orders }
    }

    async catalog(branchId) {
        const [rows] = await this.#db.query(`
            SELECT p.id,p.name,p.cod_bar sku,p.url_img_small,s.quantity physical,
                COALESCE(r.quantity,0) reserved,GREATEST(s.quantity-COALESCE(r.quantity,0),0) available
            FROM product_branch_stock s JOIN products p ON p.id=s.product_id AND p.is_active=TRUE
            LEFT JOIN (SELECT product_id,branch_id,SUM(quantity) quantity FROM stock_reservations WHERE status='active' GROUP BY product_id,branch_id) r
                ON r.product_id=s.product_id AND r.branch_id=s.branch_id
            WHERE s.branch_id=? ORDER BY p.name
        `, [branchId])
        return rows
    }

    async create(data, userId) {
        const connection = await this.#db.getConnection()
        try {
            await connection.beginTransaction()
            for (const item of data.items) {
                const [[stock]] = await connection.query(`SELECT s.quantity,
                    COALESCE((SELECT SUM(sr.quantity) FROM stock_reservations sr WHERE sr.product_id=s.product_id AND sr.branch_id=s.branch_id AND sr.status='active'),0) reserved
                    FROM product_branch_stock s WHERE s.branch_id=? AND s.product_id=? FOR UPDATE`, [item.branch_id,item.product_id])
                const available = stock ? Number(stock.quantity)-Number(stock.reserved) : 0
                if (available < item.quantity) throw new Error(`Stock disponible insuficiente para el producto ${item.product_id} en la ubicación ${item.branch_id}. Disponible: ${available}`)
            }
            const orderNumber = `PED-${Date.now().toString(36).toUpperCase()}`
            const [result] = await connection.query(`INSERT INTO orders (order_number,channel,customer_reference,branch_id,notes,created_by) VALUES (?,?,?,?,?,UUID_TO_BIN(?))`,
                [orderNumber,data.channel,data.customer_reference.trim(),data.items[0].branch_id,data.notes||null,userId])
            const totals = new Map()
            for (const item of data.items) totals.set(Number(item.product_id),(totals.get(Number(item.product_id))||0)+Number(item.quantity))
            for (const [productId,quantity] of totals) await connection.query('INSERT INTO order_items (order_id,product_id,quantity) VALUES (?,?,?)',[result.insertId,productId,quantity])
            for (const item of data.items) await connection.query("INSERT INTO stock_reservations (product_id,branch_id,order_id,quantity,status) VALUES (?,?,?,?,'active')",[item.product_id,item.branch_id,result.insertId,item.quantity])
            await connection.commit()
            return result.insertId
        } catch (error) { await connection.rollback(); throw error } finally { connection.release() }
    }

    async complete(id, userId) {
        const connection = await this.#db.getConnection()
        try {
            await connection.beginTransaction()
            const [[order]] = await connection.query("SELECT * FROM orders WHERE id=? AND status='reserved' FOR UPDATE",[id])
            if (!order) throw new Error('El pedido no existe o ya fue cerrado')
            const [allocations] = await connection.query("SELECT product_id,branch_id,quantity FROM stock_reservations WHERE order_id=? AND status='active' FOR UPDATE",[id])
            for (const item of allocations) {
                const [updated] = await connection.query('UPDATE product_branch_stock SET quantity=quantity-? WHERE branch_id=? AND product_id=? AND quantity>=?',[item.quantity,item.branch_id,item.product_id,item.quantity])
                if (!updated.affectedRows) throw new Error(`El stock físico ya no alcanza para el producto ${item.product_id}`)
            }
            const byBranch = new Map()
            for (const item of allocations) { if (!byBranch.has(item.branch_id)) byBranch.set(item.branch_id,[]); byBranch.get(item.branch_id).push(item) }
            let firstMovementId = null
            const purpose = order.channel==='mayorista' ? 'wholesale_order' : 'standard'
            for (const [branchId,items] of byBranch) {
                const [movement] = await connection.query(`INSERT INTO movements
                    (receipt_number,type,egress_reason,order_id,movement_purpose,requested_by,confirmed_by,date,user_id,origin_branch_id,destination_branch_id,status)
                    VALUES (?,'egreso','sale',?,?,?,UUID_TO_BIN(?),NOW(),UUID_TO_BIN(?),?,NULL,'entregado')`,
                    [`MOV-${Date.now()}-${branchId}`,id,purpose,order.created_by,userId,userId,branchId])
                firstMovementId ||= movement.insertId
                await connection.query('INSERT INTO movement_details (movement_id,product_id,quantity) VALUES ?',[items.map(item=>[movement.insertId,item.product_id,item.quantity])])
            }
            await connection.query("UPDATE stock_reservations SET status='fulfilled' WHERE order_id=? AND status='active'",[id])
            await connection.query("UPDATE orders SET status='completed',movement_id=? WHERE id=?",[firstMovementId,id])
            await connection.commit()
            return firstMovementId
        } catch (error) { await connection.rollback(); throw error } finally { connection.release() }
    }

    async cancel(id) {
        const connection = await this.#db.getConnection()
        try {
            await connection.beginTransaction()
            const [updated] = await connection.query("UPDATE orders SET status='cancelled' WHERE id=? AND status='reserved'",[id])
            if (!updated.affectedRows) throw new Error('El pedido no existe o ya fue cerrado')
            await connection.query("UPDATE stock_reservations SET status='released' WHERE order_id=? AND status='active'",[id])
            await connection.commit()
        } catch (error) { await connection.rollback(); throw error } finally { connection.release() }
    }
}
