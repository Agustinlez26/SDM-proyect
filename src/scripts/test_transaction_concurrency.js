import mysql from 'mysql2/promise'
import 'dotenv/config'
import { runTransactionWithRetry } from '../utils/transaction-retry.js'

const pool = mysql.createPool({
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
    port: Number(process.env.DB_PORT),
    connectionLimit: 4
})

const pause = milliseconds => new Promise(resolve => setTimeout(resolve, milliseconds))

try {
    const [rows] = await pool.query('SELECT id FROM product_branch_stock ORDER BY id LIMIT 2')
    if (rows.length < 2) throw new Error('Se necesitan dos filas de stock para ejecutar la prueba')

    const stockIds = rows.map(row => Number(row.id))
    const runLockSequence = order => runTransactionWithRetry(pool, async (connection, attempt) => {
        const lockOrder = attempt === 1 ? order : [...stockIds].sort((left, right) => left - right)
        await connection.query('SELECT id FROM product_branch_stock WHERE id = ? FOR UPDATE', [lockOrder[0]])
        if (attempt === 1) await pause(120)
        await connection.query('SELECT id FROM product_branch_stock WHERE id = ? FOR UPDATE', [lockOrder[1]])
        return attempt
    }, { maxAttempts: 3, baseDelayMs: 10 })

    const attempts = await Promise.all([
        runLockSequence(stockIds),
        runLockSequence([...stockIds].reverse())
    ])

    console.log(`Prueba de concurrencia superada. Intentos utilizados: ${attempts.join(', ')}. No se modificó stock.`)
} finally {
    await pool.end()
}
