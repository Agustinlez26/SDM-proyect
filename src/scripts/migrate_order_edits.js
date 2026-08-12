import mysql from 'mysql2/promise'
import 'dotenv/config'

const db = await mysql.createConnection({
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_NO_PASSWORD === '1' ? undefined : process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
    port: Number(process.env.DB_PORT)
})

try {
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
    console.log('Migración de edición y auditoría de pedidos completada.')
} finally {
    await db.end()
}
