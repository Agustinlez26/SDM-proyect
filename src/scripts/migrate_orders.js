import mysql from 'mysql2/promise'
import 'dotenv/config'

const migrationPassword = process.env.DB_MIGRATION_PASSWORD === '__EMPTY__'
    ? ''
    : (process.env.DB_MIGRATION_PASSWORD ?? process.env.DB_PASSWORD)

const db = await mysql.createConnection({
    host: process.env.DB_HOST,
    user: process.env.DB_MIGRATION_USER ?? process.env.DB_USER,
    password: migrationPassword,
    database: process.env.DB_NAME,
    port: Number(process.env.DB_PORT || 3306)
})

const columnExists = async (table, column) => {
    const [rows] = await db.query(`SELECT 1 FROM information_schema.columns WHERE table_schema = DATABASE() AND table_name = ? AND column_name = ?`, [table, column])
    return rows.length > 0
}

const indexExists = async (table, index) => {
    const [rows] = await db.query(`SELECT 1 FROM information_schema.statistics WHERE table_schema = DATABASE() AND table_name = ? AND index_name = ?`, [table, index])
    return rows.length > 0
}

try {
    if (!await columnExists('users', 'app_role')) await db.query("ALTER TABLE users ADD COLUMN app_role ENUM('admin','stock_manager','seller') NOT NULL DEFAULT 'seller' AFTER is_admin")
    if (!await columnExists('users', 'area')) await db.query("ALTER TABLE users ADD COLUMN area ENUM('general','wholesale','retail') NOT NULL DEFAULT 'retail' AFTER app_role")
    await db.query(`CREATE TABLE IF NOT EXISTS user_branch_access (
        user_id BINARY(16) NOT NULL, branch_id INT UNSIGNED NOT NULL,
        is_enabled BOOLEAN NOT NULL DEFAULT TRUE,
        PRIMARY KEY (user_id, branch_id),
        CONSTRAINT fk_access_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
        CONSTRAINT fk_access_branch FOREIGN KEY (branch_id) REFERENCES branches(id) ON DELETE CASCADE
    )`)
    if (!await columnExists('user_branch_access','is_enabled')) await db.query('ALTER TABLE user_branch_access ADD COLUMN is_enabled BOOLEAN NOT NULL DEFAULT TRUE')
    await db.query(`CREATE TABLE IF NOT EXISTS orders (
        id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
        order_number VARCHAR(60) NOT NULL UNIQUE,
        request_key VARCHAR(64) NULL,
        channel ENUM('mercado_libre','tienda_nube','mayorista','merchandising') NOT NULL,
        customer_reference VARCHAR(180) NOT NULL,
        branch_id INT UNSIGNED NOT NULL,
        status ENUM('reserved','completed','cancelled') NOT NULL DEFAULT 'reserved',
        notes TEXT NULL, movement_id INT UNSIGNED NULL, created_by BINARY(16) NOT NULL,
        created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        UNIQUE KEY uq_orders_request_key (request_key),
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
    if (!await columnExists('movements', 'request_key')) await db.query('ALTER TABLE movements ADD COLUMN request_key VARCHAR(64) NULL AFTER receipt_number')
    if (!await indexExists('movements', 'uq_movements_request_key')) await db.query('ALTER TABLE movements ADD UNIQUE INDEX uq_movements_request_key (request_key)')
    if (!await columnExists('orders', 'request_key')) await db.query('ALTER TABLE orders ADD COLUMN request_key VARCHAR(64) NULL AFTER order_number')
    if (!await columnExists('orders', 'delivery_type')) await db.query("ALTER TABLE orders ADD COLUMN delivery_type ENUM('pickup','shipping') NOT NULL DEFAULT 'pickup' AFTER customer_reference")
    if (!await columnExists('orders', 'shipping_method')) await db.query("ALTER TABLE orders ADD COLUMN shipping_method ENUM('via_cargo','uber','correo_argentino','other') NULL AFTER delivery_type")
    if (!await columnExists('orders', 'shipping_method_detail')) await db.query('ALTER TABLE orders ADD COLUMN shipping_method_detail VARCHAR(120) NULL AFTER shipping_method')
    if (!await indexExists('orders', 'uq_orders_request_key')) await db.query('ALTER TABLE orders ADD UNIQUE INDEX uq_orders_request_key (request_key)')
    if (!await indexExists('stock_reservations', 'idx_reservations_stock_lookup')) await db.query('ALTER TABLE stock_reservations ADD INDEX idx_reservations_stock_lookup (branch_id, product_id, status)')
    if (!await columnExists('movements', 'sale_channel')) await db.query("ALTER TABLE movements ADD COLUMN sale_channel ENUM('mercado_libre','tienda_nube','mayorista','merchandising','showroom') NULL AFTER egress_reason")
    if (!await columnExists('movements', 'explanation')) await db.query('ALTER TABLE movements ADD COLUMN explanation TEXT NULL AFTER sale_channel')
    if (!await columnExists('movements', 'order_id')) {
        await db.query('ALTER TABLE movements ADD COLUMN order_id INT UNSIGNED NULL AFTER egress_reason')
        await db.query('ALTER TABLE movements ADD INDEX idx_movements_order (order_id)')
        await db.query('ALTER TABLE movements ADD CONSTRAINT fk_movements_order FOREIGN KEY (order_id) REFERENCES orders(id)')
    }
    await db.query("ALTER TABLE orders MODIFY COLUMN channel ENUM('mercado_libre','tienda_nube','mayorista','merchandising','showroom') NOT NULL")
    if (!await columnExists('movements', 'movement_purpose')) await db.query("ALTER TABLE movements ADD COLUMN movement_purpose ENUM('standard','wholesale_order') NOT NULL DEFAULT 'standard' AFTER order_id")
    if (!await columnExists('movements', 'requested_by')) await db.query('ALTER TABLE movements ADD COLUMN requested_by BINARY(16) NULL AFTER movement_purpose')
    if (!await columnExists('movements', 'confirmed_by')) await db.query('ALTER TABLE movements ADD COLUMN confirmed_by BINARY(16) NULL AFTER requested_by')
    await db.query(`UPDATE movements m
        JOIN orders o ON o.id=m.order_id
        SET m.sale_channel=o.channel
        WHERE m.egress_reason='sale' AND m.sale_channel IS NULL`)
    await db.query(`CREATE TABLE IF NOT EXISTS order_audit_logs (
        id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
        order_id INT UNSIGNED NOT NULL,
        changed_by BINARY(16) NOT NULL,
        action ENUM('reservation_edit','admin_correction') NOT NULL,
        reason VARCHAR(500) NOT NULL,
        before_data JSON NOT NULL,
        after_data JSON NOT NULL,
        created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
        INDEX idx_order_audit_order (order_id,created_at),
        CONSTRAINT fk_order_audit_order FOREIGN KEY (order_id) REFERENCES orders(id),
        CONSTRAINT fk_order_audit_user FOREIGN KEY (changed_by) REFERENCES users(id)
    )`)
    console.log('Migracion de pedidos, reservas y motivos de egreso completada.')
} finally { await db.end() }
