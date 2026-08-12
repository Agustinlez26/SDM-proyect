import mysql from 'mysql2/promise'
import 'dotenv/config'

const db = await mysql.createConnection({
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_NO_PASSWORD === '1' ? undefined : process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
    port: Number(process.env.DB_PORT)
})

const columnExists = async (column) => {
    const [rows] = await db.query(
        'SELECT 1 FROM information_schema.columns WHERE table_schema = DATABASE() AND table_name = ? AND column_name = ?',
        ['movements', column]
    )
    return rows.length > 0
}

try {
    if (!await columnExists('sale_channel')) {
        await db.query("ALTER TABLE movements ADD COLUMN sale_channel ENUM('mercado_libre','tienda_nube','mayorista','merchandising','showroom') NULL AFTER egress_reason")
    }
    if (!await columnExists('explanation')) {
        await db.query('ALTER TABLE movements ADD COLUMN explanation TEXT NULL AFTER sale_channel')
    }
    console.log('Metadatos de movimientos migrados correctamente.')
} finally {
    await db.end()
}
