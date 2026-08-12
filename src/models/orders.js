import { Database } from '../config/connection.js'
import { runTransactionWithRetry, sortStockItems } from '../utils/transaction-retry.js'

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
        const [[row]] = await this.#db.query('SELECT id,channel,BIN_TO_UUID(created_by) created_by,branch_id,status,movement_id,request_key FROM orders WHERE id=?', [id])
        return row
    }

    async findByRequestKey(requestKey) {
        const [[row]] = await this.#db.query('SELECT id,status,movement_id FROM orders WHERE request_key=? LIMIT 1', [requestKey])
        return row || null
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
                BIN_TO_UUID(o.created_by) created_by,
                b.name branch_name,o.created_at,
                COUNT(*) item_count
            FROM orders o JOIN branches b ON b.id=o.branch_id
            JOIN stock_reservations sr ON sr.order_id=o.id
            ${where} GROUP BY o.id ORDER BY o.id DESC
        `, params)
        return { orders }
    }

    async details(id) {
        const [rows] = await this.#db.query(`
            SELECT sr.product_id,p.cod_bar sku,p.name,sr.quantity,sr.branch_id,b.name branch_name
            FROM stock_reservations sr
            JOIN products p ON p.id=sr.product_id
            JOIN branches b ON b.id=sr.branch_id
            WHERE sr.order_id=?
            ORDER BY p.name,b.name
        `, [id])
        return rows
    }

    async auditHistory(id) {
        const [rows] = await this.#db.query(`
            SELECT a.id,a.action,a.reason,a.before_data,a.after_data,a.created_at,
                BIN_TO_UUID(a.changed_by) changed_by,u.full_name changed_by_name
            FROM order_audit_logs a
            JOIN users u ON u.id=a.changed_by
            WHERE a.order_id=? ORDER BY a.id DESC
        `, [id])
        return rows.map(row => ({
            ...row,
            before_data: typeof row.before_data === 'string' ? JSON.parse(row.before_data) : row.before_data,
            after_data: typeof row.after_data === 'string' ? JSON.parse(row.after_data) : row.after_data
        }))
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
        const sortedItems = sortStockItems(data.items)
        try {
            return await runTransactionWithRetry(this.#db, async connection => {
                const orderNumber = `PED-${Date.now().toString(36).toUpperCase()}`
                const [result] = await connection.query(`INSERT INTO orders (order_number,request_key,channel,customer_reference,branch_id,notes,created_by) VALUES (?,?,?,?,?,?,UUID_TO_BIN(?))`,
                    [orderNumber,data.idempotency_key,data.channel,data.customer_reference.trim(),sortedItems[0].branch_id,data.notes||null,userId])

                for (const item of sortedItems) {
                    const [[stock]] = await connection.query(`SELECT s.quantity,
                        COALESCE((SELECT SUM(sr.quantity) FROM stock_reservations sr WHERE sr.product_id=s.product_id AND sr.branch_id=s.branch_id AND sr.status='active'),0) reserved
                        FROM product_branch_stock s WHERE s.branch_id=? AND s.product_id=? FOR UPDATE`, [item.branch_id,item.product_id])
                    const available = stock ? Number(stock.quantity)-Number(stock.reserved) : 0
                    if (available < item.quantity) throw new Error(`Stock disponible insuficiente para el producto ${item.product_id} en la ubicación ${item.branch_id}. Disponible: ${available}`)
                }

                const totals = new Map()
                for (const item of sortedItems) totals.set(Number(item.product_id),(totals.get(Number(item.product_id))||0)+Number(item.quantity))
                for (const [productId,quantity] of [...totals.entries()].sort((a,b)=>a[0]-b[0])) {
                    await connection.query('INSERT INTO order_items (order_id,product_id,quantity) VALUES (?,?,?)',[result.insertId,productId,quantity])
                }
                for (const item of sortedItems) {
                    await connection.query("INSERT INTO stock_reservations (product_id,branch_id,order_id,quantity,status) VALUES (?,?,?,?,'active')",[item.product_id,item.branch_id,result.insertId,item.quantity])
                }
                return { id: result.insertId, created: true, status: 'reserved', movement_id: null }
            })
        } catch (error) {
            if (error?.code === 'ER_DUP_ENTRY' && data.idempotency_key) {
                const existing = await this.findByRequestKey(data.idempotency_key)
                if (existing) return { ...existing, created: false }
            }
            throw error
        }
    }

    async update(id, data, actorId, isAdmin) {
        const newItems = sortStockItems(data.items)
        return runTransactionWithRetry(this.#db, async connection => {
            const [[order]] = await connection.query('SELECT *,BIN_TO_UUID(created_by) created_by_uuid FROM orders WHERE id=? FOR UPDATE', [id])
            if (!order) throw new Error('El pedido no existe')
            if (order.status === 'cancelled') throw new Error('Un pedido cancelado no se puede modificar')
            if (order.status === 'completed' && !isAdmin) throw new Error('Solo el administrador puede corregir un pedido confirmado')

            const [oldItems] = await connection.query('SELECT product_id,branch_id,quantity,status FROM stock_reservations WHERE order_id=? ORDER BY branch_id,product_id FOR UPDATE', [id])
            const beforeData = { customer_reference:order.customer_reference,notes:order.notes,status:order.status,items:oldItems.map(({product_id,branch_id,quantity})=>({product_id,branch_id,quantity})) }
            const itemKey = item => `${Number(item.branch_id)}:${Number(item.product_id)}`
            const oldMap = new Map(oldItems.map(item => [itemKey(item), Number(item.quantity)]))
            const newMap = new Map(newItems.map(item => [itemKey(item), Number(item.quantity)]))
            const stockKeys = [...new Set([...oldMap.keys(), ...newMap.keys()])].sort((a,b) => {
                const [ab,ap]=a.split(':').map(Number),[bb,bp]=b.split(':').map(Number)
                return ab-bb || ap-bp
            })

            for (const key of stockKeys) {
                const [branchId,productId] = key.split(':').map(Number)
                const [[stock]] = await connection.query('SELECT quantity FROM product_branch_stock WHERE branch_id=? AND product_id=? FOR UPDATE', [branchId,productId])
                if (!stock) throw new Error(`No existe stock para el producto ${productId} en la ubicación ${branchId}`)

                if (order.status === 'reserved') {
                    const [[reservation]] = await connection.query("SELECT COALESCE(SUM(quantity),0) reserved FROM stock_reservations WHERE branch_id=? AND product_id=? AND status='active' AND (order_id IS NULL OR order_id<>?)", [branchId,productId,id])
                    const available = Number(stock.quantity)-Number(reservation.reserved)
                    if ((newMap.get(key)||0)>available) throw new Error(`Stock disponible insuficiente para el producto ${productId}. Disponible: ${available}`)
                } else {
                    const delta=(newMap.get(key)||0)-(oldMap.get(key)||0)
                    if (delta>0) {
                        const [updated]=await connection.query('UPDATE product_branch_stock SET quantity=quantity-? WHERE branch_id=? AND product_id=? AND quantity>=?', [delta,branchId,productId,delta])
                        if (!updated.affectedRows) throw new Error(`El stock físico no alcanza para agregar ${delta} unidades del producto ${productId}`)
                    } else if (delta<0) {
                        await connection.query('UPDATE product_branch_stock SET quantity=quantity+? WHERE branch_id=? AND product_id=?', [-delta,branchId,productId])
                    }
                }
            }

            if (order.status === 'completed') {
                const corrections = new Map()
                for (const key of stockKeys) {
                    const [branchId,productId]=key.split(':').map(Number)
                    const delta=(newMap.get(key)||0)-(oldMap.get(key)||0)
                    if (!delta) continue
                    const type=delta>0?'egreso':'ingreso'
                    const groupKey=`${type}:${branchId}`
                    if(!corrections.has(groupKey)) corrections.set(groupKey,{type,branchId,items:[]})
                    corrections.get(groupKey).items.push({productId,quantity:Math.abs(delta)})
                }
                for (const correction of corrections.values()) {
                    const isEgress=correction.type==='egreso'
                    const [movement]=await connection.query(`INSERT INTO movements
                        (receipt_number,type,egress_reason,sale_channel,explanation,order_id,movement_purpose,requested_by,confirmed_by,date,user_id,origin_branch_id,destination_branch_id,status)
                        VALUES (?,?,?,?,?,?,?,UUID_TO_BIN(?),UUID_TO_BIN(?),NOW(),UUID_TO_BIN(?),?,?,'entregado')`,
                        [`COR-${id}-${Date.now()}-${correction.branchId}-${correction.type}`,correction.type,isEgress?'sale':null,order.channel,data.reason,id,order.channel==='mayorista'?'wholesale_order':'standard',actorId,actorId,actorId,isEgress?correction.branchId:null,isEgress?null:correction.branchId])
                    await connection.query('INSERT INTO movement_details (movement_id,product_id,quantity) VALUES ?', [correction.items.map(item=>[movement.insertId,item.productId,item.quantity])])
                }
            }

            await connection.query('DELETE FROM stock_reservations WHERE order_id=?', [id])
            await connection.query('DELETE FROM order_items WHERE order_id=?', [id])
            const reservationStatus=order.status==='completed'?'fulfilled':'active'
            for (const item of newItems) await connection.query('INSERT INTO stock_reservations (product_id,branch_id,order_id,quantity,status) VALUES (?,?,?,?,?)', [item.product_id,item.branch_id,id,item.quantity,reservationStatus])
            const totals=new Map()
            for(const item of newItems) totals.set(Number(item.product_id),(totals.get(Number(item.product_id))||0)+Number(item.quantity))
            for(const [productId,quantity] of totals) await connection.query('INSERT INTO order_items (order_id,product_id,quantity) VALUES (?,?,?)',[id,productId,quantity])
            await connection.query('UPDATE orders SET customer_reference=?,notes=?,branch_id=? WHERE id=?',[data.customer_reference.trim(),data.notes||null,newItems[0].branch_id,id])

            const afterData={customer_reference:data.customer_reference.trim(),notes:data.notes||null,status:order.status,items:newItems.map(({product_id,branch_id,quantity})=>({product_id,branch_id,quantity}))}
            await connection.query('INSERT INTO order_audit_logs (order_id,changed_by,action,reason,before_data,after_data) VALUES (?,UUID_TO_BIN(?),?,?,?,?)', [id,actorId,order.status==='completed'?'admin_correction':'reservation_edit',data.reason||'Actualización de pedido reservado',JSON.stringify(beforeData),JSON.stringify(afterData)])
            return { status:order.status }
        })
    }

    async complete(id, userId) {
        return runTransactionWithRetry(this.#db, async connection => {
            const [[order]] = await connection.query('SELECT * FROM orders WHERE id=? FOR UPDATE',[id])
            if (!order) throw new Error('El pedido no existe')
            if (order.status === 'completed') return order.movement_id
            if (order.status !== 'reserved') throw new Error('El pedido ya fue cancelado')

            const [allocationRows] = await connection.query("SELECT product_id,branch_id,quantity FROM stock_reservations WHERE order_id=? AND status='active' ORDER BY branch_id,product_id FOR UPDATE",[id])
            const allocations = sortStockItems(allocationRows)
            if (!allocations.length) throw new Error('El pedido no tiene reservas activas')

            for (const item of allocations) {
                const [updated] = await connection.query('UPDATE product_branch_stock SET quantity=quantity-? WHERE branch_id=? AND product_id=? AND quantity>=?',[item.quantity,item.branch_id,item.product_id,item.quantity])
                if (!updated.affectedRows) throw new Error(`El stock físico ya no alcanza para el producto ${item.product_id}`)
            }
            const byBranch = new Map()
            for (const item of allocations) { if (!byBranch.has(item.branch_id)) byBranch.set(item.branch_id,[]); byBranch.get(item.branch_id).push(item) }
            let firstMovementId = null
            const purpose = order.channel==='mayorista' ? 'wholesale_order' : 'standard'
            for (const [branchId,items] of [...byBranch.entries()].sort((a,b)=>Number(a[0])-Number(b[0]))) {
                const [movement] = await connection.query(`INSERT INTO movements
                    (receipt_number,type,egress_reason,sale_channel,order_id,movement_purpose,requested_by,confirmed_by,date,user_id,origin_branch_id,destination_branch_id,status)
                    VALUES (?,'egreso','sale',?,?,?,?,UUID_TO_BIN(?),NOW(),UUID_TO_BIN(?),?,NULL,'entregado')`,
                    [`MOV-${Date.now()}-${branchId}`,order.channel,id,purpose,order.created_by,userId,userId,branchId])
                firstMovementId ||= movement.insertId
                await connection.query('INSERT INTO movement_details (movement_id,product_id,quantity) VALUES ?',[items.map(item=>[movement.insertId,item.product_id,item.quantity])])
            }
            await connection.query("UPDATE stock_reservations SET status='fulfilled' WHERE order_id=? AND status='active'",[id])
            await connection.query("UPDATE orders SET status='completed',movement_id=? WHERE id=?",[firstMovementId,id])
            return firstMovementId
        })
    }

    async cancel(id) {
        return runTransactionWithRetry(this.#db, async connection => {
            const [[order]] = await connection.query('SELECT status FROM orders WHERE id=? FOR UPDATE',[id])
            if (!order) throw new Error('El pedido no existe')
            if (order.status === 'cancelled') return false
            if (order.status !== 'reserved') throw new Error('Un pedido completado no se puede cancelar')
            await connection.query("UPDATE orders SET status='cancelled' WHERE id=?",[id])
            await connection.query("UPDATE stock_reservations SET status='released' WHERE order_id=? AND status='active'",[id])
            return true
        })
    }
}
