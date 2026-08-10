import { Database } from '../config/connection.js'

const rowsOnly = result => result[0]

export class OperationsModel {
    #db

    constructor({ db } = {}) {
        this.#db = db || Database.getInstance()
    }

    async getCatalogs() {
        const [products, branches, channels] = await Promise.all([
            this.#db.query(`SELECT id, name, cod_bar AS sku, item_type, is_sellable, is_manufacturable, is_customizable FROM products WHERE is_active = TRUE ORDER BY name`),
            this.#db.query(`SELECT id, name FROM branches WHERE is_active = TRUE ORDER BY name`),
            this.#db.query(`SELECT id, code, name FROM sales_channels WHERE is_active = TRUE ORDER BY id`)
        ])
        return { products: rowsOnly(products), branches: rowsOnly(branches), channels: rowsOnly(channels) }
    }

    async getArtisans() {
        const [rows] = await this.#db.query(`
            SELECT a.*, b.name AS branch_name
            FROM artisans a JOIN branches b ON b.id = a.branch_id
            ORDER BY a.is_active DESC, a.name
        `)
        return rows
    }

    async createArtisan(data) {
        const [result] = await this.#db.query(`
            INSERT INTO artisans (name, phone, branch_id, specialty, notes)
            VALUES (?, ?, ?, ?, ?)
        `, [data.name, data.phone || null, data.branch_id, data.specialty || null, data.notes || null])
        return result.insertId
    }

    async getWorkOrders() {
        const [rows] = await this.#db.query(`
            SELECT wo.*, a.name AS artisan_name, b.name AS branch_name,
                GROUP_CONCAT(DISTINCT CONCAT(pm.name, ' x', wm.quantity_sent - wm.quantity_consumed - wm.quantity_returned - wm.quantity_discarded) SEPARATOR ', ') AS custody,
                GROUP_CONCAT(DISTINCT CONCAT(po.name, ' ', ow.quantity_received, '/', ow.quantity_requested) SEPARATOR ', ') AS outputs
            FROM work_orders wo
            JOIN artisans a ON a.id = wo.artisan_id
            JOIN branches b ON b.id = wo.origin_branch_id
            LEFT JOIN work_order_materials wm ON wm.work_order_id = wo.id
            LEFT JOIN products pm ON pm.id = wm.product_id
            LEFT JOIN work_order_outputs ow ON ow.work_order_id = wo.id
            LEFT JOIN products po ON po.id = ow.product_id
            GROUP BY wo.id
            ORDER BY wo.id DESC
        `)
        return rows
    }

    async createWorkOrder(data, userId) {
        const connection = await this.#db.getConnection()
        try {
            await connection.beginTransaction()
            const code = `OT-${Date.now().toString(36).toUpperCase()}`
            const [result] = await connection.execute(`
                INSERT INTO work_orders
                    (code, type, origin_branch_id, artisan_id, wholesale_order_id, due_date, artisan_cost, notes, created_by)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, UUID_TO_BIN(?))
            `, [code, data.type, data.origin_branch_id, data.artisan_id, data.wholesale_order_id || null,
                data.due_date || null, data.artisan_cost ?? null, data.notes || null, userId])

            for (const material of data.materials || []) {
                await connection.execute(`
                    INSERT INTO work_order_materials (work_order_id, product_id, quantity_sent)
                    VALUES (?, ?, ?)
                `, [result.insertId, material.product_id, material.quantity])
            }
            for (const output of data.outputs || []) {
                await connection.execute(`
                    INSERT INTO work_order_outputs (work_order_id, product_id, quantity_requested)
                    VALUES (?, ?, ?)
                `, [result.insertId, output.product_id, output.quantity])
            }
            await connection.commit()
            return result.insertId
        } catch (error) {
            await connection.rollback()
            throw error
        } finally {
            connection.release()
        }
    }

    async sendWorkOrder(id) {
        const connection = await this.#db.getConnection()
        try {
            await connection.beginTransaction()
            const [[order]] = await connection.execute('SELECT * FROM work_orders WHERE id = ? FOR UPDATE', [id])
            if (!order) throw new Error('Orden de trabajo inexistente')
            if (order.status !== 'draft') throw new Error('Solo se puede enviar una orden en borrador')

            const [materials] = await connection.execute('SELECT * FROM work_order_materials WHERE work_order_id = ?', [id])
            for (const material of materials) {
                const [[stock]] = await connection.execute(`
                    SELECT id, quantity FROM product_branch_stock
                    WHERE branch_id = ? AND product_id = ? FOR UPDATE
                `, [order.origin_branch_id, material.product_id])
                if (!stock || stock.quantity < material.quantity_sent) {
                    throw new Error('Stock insuficiente para enviar los materiales al artesano')
                }
                await connection.execute('UPDATE product_branch_stock SET quantity = quantity - ? WHERE id = ?', [material.quantity_sent, stock.id])
            }
            await connection.execute("UPDATE work_orders SET status = 'sent' WHERE id = ?", [id])
            await connection.commit()
        } catch (error) {
            await connection.rollback()
            throw error
        } finally {
            connection.release()
        }
    }

    async receiveWorkOrder(id, data) {
        const connection = await this.#db.getConnection()
        try {
            await connection.beginTransaction()
            const [[order]] = await connection.execute('SELECT * FROM work_orders WHERE id = ? FOR UPDATE', [id])
            if (!order || !['sent', 'in_progress', 'partial'].includes(order.status)) {
                throw new Error('La orden no esta enviada o ya fue cerrada')
            }

            for (const item of data.materials || []) {
                const [[material]] = await connection.execute('SELECT * FROM work_order_materials WHERE id = ? AND work_order_id = ? FOR UPDATE', [item.id, id])
                if (!material) throw new Error('Material invalido')
                const consumed = Number(item.consumed || 0)
                const returned = Number(item.returned || 0)
                const discarded = Number(item.discarded || 0)
                const custody = material.quantity_sent - material.quantity_consumed - material.quantity_returned - material.quantity_discarded
                if (consumed + returned + discarded > custody) throw new Error('La rendicion supera el material en poder del artesano')
                await connection.execute(`
                    UPDATE work_order_materials SET
                        quantity_consumed = quantity_consumed + ?,
                        quantity_returned = quantity_returned + ?,
                        quantity_discarded = quantity_discarded + ?
                    WHERE id = ?
                `, [consumed, returned, discarded, material.id])
                if (returned > 0) {
                    await connection.execute(`
                        INSERT INTO product_branch_stock (product_id, branch_id, quantity, min_quantity)
                        VALUES (?, ?, ?, 0)
                        ON DUPLICATE KEY UPDATE quantity = quantity + VALUES(quantity)
                    `, [material.product_id, order.origin_branch_id, returned])
                }
            }

            for (const item of data.outputs || []) {
                const [[output]] = await connection.execute('SELECT * FROM work_order_outputs WHERE id = ? AND work_order_id = ? FOR UPDATE', [item.id, id])
                if (!output) throw new Error('Producto terminado invalido')
                const received = Number(item.received || 0)
                const rejected = Number(item.rejected || 0)
                const pending = output.quantity_requested - output.quantity_received - output.quantity_rejected
                if (received + rejected > pending) throw new Error('La recepcion supera la cantidad pendiente')
                await connection.execute(`
                    UPDATE work_order_outputs SET
                        quantity_received = quantity_received + ?, quantity_rejected = quantity_rejected + ?
                    WHERE id = ?
                `, [received, rejected, output.id])
                if (received > 0) {
                    await connection.execute(`
                        INSERT INTO product_branch_stock (product_id, branch_id, quantity, min_quantity)
                        VALUES (?, ?, ?, 0)
                        ON DUPLICATE KEY UPDATE quantity = quantity + VALUES(quantity)
                    `, [output.product_id, order.origin_branch_id, received])
                }
            }

            const [[pending]] = await connection.execute(`
                SELECT
                    (SELECT COALESCE(SUM(quantity_sent - quantity_consumed - quantity_returned - quantity_discarded), 0) FROM work_order_materials WHERE work_order_id = ?) AS materials,
                    (SELECT COALESCE(SUM(quantity_requested - quantity_received - quantity_rejected), 0) FROM work_order_outputs WHERE work_order_id = ?) AS outputs
            `, [id, id])
            const status = Number(pending.materials) === 0 && Number(pending.outputs) === 0 ? 'completed' : 'partial'
            await connection.execute('UPDATE work_orders SET status = ? WHERE id = ?', [status, id])
            await connection.commit()
            return status
        } catch (error) {
            await connection.rollback()
            throw error
        } finally {
            connection.release()
        }
    }

    async getWorkOrderDetail(id) {
        const [[order], [materials], [outputs]] = await Promise.all([
            this.#db.query('SELECT * FROM work_orders WHERE id = ?', [id]),
            this.#db.query(`SELECT wm.*, p.name AS product_name FROM work_order_materials wm JOIN products p ON p.id = wm.product_id WHERE work_order_id = ?`, [id]),
            this.#db.query(`SELECT wo.*, p.name AS product_name FROM work_order_outputs wo JOIN products p ON p.id = wo.product_id WHERE work_order_id = ?`, [id])
        ])
        return { order: order[0] || null, materials, outputs }
    }

    async getWholesaleOrders() {
        const [rows] = await this.#db.query(`
            SELECT o.*, b.name AS pickup_branch,
                GROUP_CONCAT(CONCAT(p.name, ' ', i.quantity_reserved, '/', i.quantity) SEPARATOR ', ') AS items
            FROM wholesale_orders o
            JOIN branches b ON b.id = o.pickup_branch_id
            JOIN wholesale_order_items i ON i.order_id = o.id
            JOIN products p ON p.id = i.product_id
            GROUP BY o.id ORDER BY o.id DESC
        `)
        return rows
    }

    async createWholesaleOrder(data, userId) {
        const connection = await this.#db.getConnection()
        try {
            await connection.beginTransaction()
            const orderNumber = data.order_number || `MAY-${Date.now().toString(36).toUpperCase()}`
            const [result] = await connection.execute(`
                INSERT INTO wholesale_orders (order_number, customer_reference, pickup_branch_id, notes, created_by)
                VALUES (?, ?, ?, ?, UUID_TO_BIN(?))
            `, [orderNumber, data.customer_reference, data.pickup_branch_id, data.notes || null, userId])

            let fullyReserved = true
            for (const item of data.items) {
                const [[stock]] = await connection.execute(`
                    SELECT s.quantity, s.min_quantity,
                        COALESCE((SELECT SUM(r.quantity) FROM stock_reservations r
                            WHERE r.product_id = s.product_id AND r.branch_id = s.branch_id AND r.status = 'active'), 0) AS reserved
                    FROM product_branch_stock s
                    WHERE s.product_id = ? AND s.branch_id = ? FOR UPDATE
                `, [item.product_id, data.pickup_branch_id])
                const available = stock ? Math.max(0, Number(stock.quantity) - Number(stock.min_quantity) - Number(stock.reserved)) : 0
                const reserved = Math.min(Number(item.quantity), available)
                if (reserved < Number(item.quantity)) fullyReserved = false
                await connection.execute(`
                    INSERT INTO wholesale_order_items (order_id, product_id, quantity, quantity_reserved)
                    VALUES (?, ?, ?, ?)
                `, [result.insertId, item.product_id, item.quantity, reserved])
                if (reserved > 0) {
                    await connection.execute(`
                        INSERT INTO stock_reservations (product_id, branch_id, wholesale_order_id, quantity)
                        VALUES (?, ?, ?, ?)
                    `, [item.product_id, data.pickup_branch_id, result.insertId, reserved])
                }
            }
            await connection.execute('UPDATE wholesale_orders SET status = ? WHERE id = ?', [fullyReserved ? 'reserved' : 'partial', result.insertId])
            await connection.commit()
            return result.insertId
        } catch (error) {
            await connection.rollback()
            throw error
        } finally {
            connection.release()
        }
    }

    async deliverWholesaleOrder(id) {
        const connection = await this.#db.getConnection()
        try {
            await connection.beginTransaction()
            const [[order]] = await connection.execute('SELECT * FROM wholesale_orders WHERE id = ? FOR UPDATE', [id])
            if (!order || !['reserved', 'ready', 'partial'].includes(order.status)) throw new Error('El pedido no tiene stock reservado para entregar')
            const [items] = await connection.execute('SELECT * FROM wholesale_order_items WHERE order_id = ? FOR UPDATE', [id])
            let pending = false
            for (const item of items) {
                const toDeliver = item.quantity_reserved - item.quantity_delivered
                if (toDeliver > 0) {
                    const [updated] = await connection.execute(`
                        UPDATE product_branch_stock SET quantity = quantity - ?
                        WHERE product_id = ? AND branch_id = ? AND quantity >= ?
                    `, [toDeliver, item.product_id, order.pickup_branch_id, toDeliver])
                    if (!updated.affectedRows) throw new Error('El stock fisico ya no alcanza para completar la entrega')
                    await connection.execute('UPDATE wholesale_order_items SET quantity_delivered = quantity_delivered + ? WHERE id = ?', [toDeliver, item.id])
                }
                if (item.quantity_reserved < item.quantity) pending = true
            }
            await connection.execute("UPDATE stock_reservations SET status = 'fulfilled' WHERE wholesale_order_id = ? AND status = 'active'", [id])
            await connection.execute('UPDATE wholesale_orders SET status = ? WHERE id = ?', [pending ? 'partial' : 'delivered', id])
            await connection.commit()
        } catch (error) {
            await connection.rollback()
            throw error
        } finally {
            connection.release()
        }
    }

    async getPackages() {
        const [rows] = await this.#db.query(`
            SELECT sp.*, wo.order_number,
                GROUP_CONCAT(CONCAT(p.name, ' x', spi.quantity) SEPARATOR ', ') AS items
            FROM shipment_packages sp
            LEFT JOIN wholesale_orders wo ON wo.id = sp.wholesale_order_id
            LEFT JOIN shipment_package_items spi ON spi.package_id = sp.id
            LEFT JOIN products p ON p.id = spi.product_id
            GROUP BY sp.id ORDER BY sp.id DESC
        `)
        return rows
    }

    async createPackage(data) {
        const connection = await this.#db.getConnection()
        try {
            await connection.beginTransaction()
            const code = `BUL-${Date.now().toString(36).toUpperCase()}`
            const [result] = await connection.execute(`
                INSERT INTO shipment_packages (package_code, movement_id, package_type, wholesale_order_id, notes)
                VALUES (?, ?, ?, ?, ?)
            `, [code, data.movement_id || null, data.package_type, data.wholesale_order_id || null, data.notes || null])
            for (const item of data.items || []) {
                await connection.execute('INSERT INTO shipment_package_items (package_id, product_id, quantity) VALUES (?, ?, ?)', [result.insertId, item.product_id, item.quantity])
            }
            if (data.wholesale_order_id) {
                await connection.execute("UPDATE wholesale_orders SET status = 'in_transit' WHERE id = ? AND status = 'partial'", [data.wholesale_order_id])
            }
            await connection.commit()
            return result.insertId
        } catch (error) {
            await connection.rollback()
            throw error
        } finally {
            connection.release()
        }
    }

    async updateProductOperations(productId, data) {
        await this.#db.query(`
            UPDATE products SET item_type = ?, is_sellable = ?, is_manufacturable = ?, is_customizable = ?, production_branch_id = ?
            WHERE id = ?
        `, [data.item_type, data.is_sellable, data.is_manufacturable, data.is_customizable, data.production_branch_id || null, productId])
        for (const channel of data.channels || []) {
            await this.#db.query(`
                INSERT INTO product_sales_channels (product_id, channel_id, is_enabled)
                VALUES (?, ?, ?) ON DUPLICATE KEY UPDATE is_enabled = VALUES(is_enabled)
            `, [productId, channel.id, Boolean(channel.is_enabled)])
        }
    }
}
