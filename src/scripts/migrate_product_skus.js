import 'dotenv/config'
import mysql from 'mysql2/promise'
import { buildSkuBase, withSkuSuffix } from '../utils/sku-utils.js'

if (!process.argv.includes('--apply')) {
    console.error('Usá --apply para confirmar la migración de códigos numéricos a SKU.')
    process.exit(1)
}

const db = await mysql.createConnection({
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
    port: Number(process.env.DB_PORT)
})

try {
    const [products] = await db.query('SELECT id, name, cod_bar FROM products ORDER BY id')
    const productsToMigrate = products.filter(product => /^\d+$/.test(product.cod_bar))
    const reservedSkus = new Set(
        products
            .filter(product => !/^\d+$/.test(product.cod_bar))
            .map(product => product.cod_bar.toUpperCase())
    )

    const changes = productsToMigrate.map(product => {
        const baseSku = buildSkuBase(product.name)
        let sku = baseSku
        let sequence = 2

        while (reservedSkus.has(sku)) {
            sku = withSkuSuffix(baseSku, sequence)
            sequence += 1
        }

        reservedSkus.add(sku)
        return { id: product.id, name: product.name, sku }
    })

    await db.beginTransaction()
    for (const change of changes) {
        await db.execute('UPDATE products SET cod_bar = ? WHERE id = ?', [change.sku, change.id])
    }
    await db.commit()

    console.log(JSON.stringify({ migrated: changes.length, products: changes }, null, 2))
} catch (error) {
    await db.rollback()
    throw error
} finally {
    await db.end()
}
