import mysql from 'mysql2/promise'
import 'dotenv/config'

const db = await mysql.createConnection({
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_NO_PASSWORD === '1' ? undefined : process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
    port: Number(process.env.DB_PORT)
})

const columnExists = async (table, column) => {
    const [rows] = await db.query(
        'SELECT 1 FROM information_schema.columns WHERE table_schema = DATABASE() AND table_name = ? AND column_name = ?',
        [table, column]
    )
    return rows.length > 0
}

const indexExists = async (table, index) => {
    const [rows] = await db.query(
        'SELECT 1 FROM information_schema.statistics WHERE table_schema = DATABASE() AND table_name = ? AND index_name = ?',
        [table, index]
    )
    return rows.length > 0
}

try {
    if (!await columnExists('movements', 'request_key')) {
        await db.query('ALTER TABLE movements ADD COLUMN request_key VARCHAR(64) NULL AFTER receipt_number')
    }
    if (!await indexExists('movements', 'uq_movements_request_key')) {
        await db.query('ALTER TABLE movements ADD UNIQUE INDEX uq_movements_request_key (request_key)')
    }
    if (!await columnExists('orders', 'request_key')) {
        await db.query('ALTER TABLE orders ADD COLUMN request_key VARCHAR(64) NULL AFTER order_number')
    }
    if (!await indexExists('orders', 'uq_orders_request_key')) {
        await db.query('ALTER TABLE orders ADD UNIQUE INDEX uq_orders_request_key (request_key)')
    }
    if (!await indexExists('stock_reservations', 'idx_reservations_stock_lookup')) {
        await db.query('ALTER TABLE stock_reservations ADD INDEX idx_reservations_stock_lookup (branch_id, product_id, status)')
    }
    console.log('Protecciones transaccionales e idempotencia migradas correctamente.')
} finally {
    await db.end()
}
