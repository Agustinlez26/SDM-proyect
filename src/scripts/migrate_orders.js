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
    const [rows] = await db.query(`SELECT 1 FROM information_schema.columns WHERE table_schema = DATABASE() AND table_name = ? AND column_name = ?`, [table, column])
    return rows.length > 0
}

try {
    await db.query(`CREATE TABLE IF NOT EXISTS orders (
        id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
        order_number VARCHAR(60) NOT NULL UNIQUE,
        channel ENUM('mercado_libre','tienda_nube','mayorista','merchandising') NOT NULL,
        customer_reference VARCHAR(180) NOT NULL,
        branch_id INT UNSIGNED NOT NULL,
        status ENUM('reserved','completed','cancelled') NOT NULL DEFAULT 'reserved',
        notes TEXT NULL, movement_id INT UNSIGNED NULL, created_by BINARY(16) NOT NULL,
        created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        CONSTRAINT fk_orders_branch FOREIGN KEY (branch_id) REFERENCES branches(id),
        CONSTRAINT fk_orders_movement FOREIGN KEY (movement_id) REFERENCES movements(id),
        CONSTRAINT fk_orders_user FOREIGN KEY (created_by) REFERENCES users(id)
    )`)
    await db.query(`CREATE TABLE IF NOT EXISTS order_items (
        id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY, order_id INT UNSIGNED NOT NULL,
        product_id INT UNSIGNED NOT NULL, quantity INT NOT NULL,
        UNIQUE KEY uq_order_product (order_id, product_id),
        CONSTRAINT fk_order_items_order FOREIGN KEY (order_id) REFERENCES orders(id) ON DELETE CASCADE,
        CONSTRAINT fk_order_items_product FOREIGN KEY (product_id) REFERENCES products(id)
    )`)
    await db.query(`CREATE TABLE IF NOT EXISTS stock_reservations (
        id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY, product_id INT UNSIGNED NOT NULL,
        branch_id INT UNSIGNED NOT NULL, order_id INT UNSIGNED NULL, quantity INT NOT NULL,
        status ENUM('active','fulfilled','released') NOT NULL DEFAULT 'active',
        created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
        CONSTRAINT fk_res_product FOREIGN KEY (product_id) REFERENCES products(id),
        CONSTRAINT fk_res_branch FOREIGN KEY (branch_id) REFERENCES branches(id),
        CONSTRAINT fk_res_order FOREIGN KEY (order_id) REFERENCES orders(id)
    )`)
    if (!await columnExists('stock_reservations', 'order_id')) {
        await db.query('ALTER TABLE stock_reservations ADD COLUMN order_id INT UNSIGNED NULL')
        await db.query('ALTER TABLE stock_reservations ADD INDEX idx_res_order (order_id)')
        await db.query('ALTER TABLE stock_reservations ADD CONSTRAINT fk_res_order FOREIGN KEY (order_id) REFERENCES orders(id)')
    }
    if (!await columnExists('movements', 'egress_reason')) await db.query("ALTER TABLE movements ADD COLUMN egress_reason ENUM('sale','return','exchange') NULL AFTER type")
    if (!await columnExists('movements', 'order_id')) {
        await db.query('ALTER TABLE movements ADD COLUMN order_id INT UNSIGNED NULL AFTER egress_reason')
        await db.query('ALTER TABLE movements ADD INDEX idx_movements_order (order_id)')
        await db.query('ALTER TABLE movements ADD CONSTRAINT fk_movements_order FOREIGN KEY (order_id) REFERENCES orders(id)')
    }
    console.log('Migracion de pedidos, reservas y motivos de egreso completada.')
} finally { await db.end() }
