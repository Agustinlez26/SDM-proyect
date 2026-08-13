import 'dotenv/config'
import mysql from 'mysql2/promise'

const migrationPassword = process.env.DB_MIGRATION_PASSWORD === '__EMPTY__'
    ? ''
    : (process.env.DB_MIGRATION_PASSWORD ?? process.env.DB_PASSWORD)

const connection = await mysql.createConnection({
    host: process.env.DB_HOST,
    user: process.env.DB_MIGRATION_USER ?? process.env.DB_USER,
    password: migrationPassword,
    database: process.env.DB_NAME,
    port: Number(process.env.DB_PORT || 3306),
    multipleStatements: true
})

const addColumnIfMissing = async (table, column, definition) => {
    const [rows] = await connection.execute(`
        SELECT COUNT(*) total FROM information_schema.COLUMNS
        WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME=? AND COLUMN_NAME=?
    `, [table, column])
    if (!Number(rows[0].total)) await connection.query(`ALTER TABLE \`${table}\` ADD COLUMN \`${column}\` ${definition}`)
}

const normalizeChannel = async (legacyCode, code, name) => {
    const [rows] = await connection.execute('SELECT id,code FROM sales_channels WHERE code IN (?,?) ORDER BY code=? DESC', [legacyCode, code, code])
    const current = rows.find(row => row.code === code)
    const legacy = rows.find(row => row.code === legacyCode)
    if (!current && legacy) {
        await connection.execute('UPDATE sales_channels SET code=?,name=?,is_active=TRUE WHERE id=?', [code,name,legacy.id])
        return
    }
    if (current && legacy && current.id !== legacy.id) {
        await connection.query(`INSERT INTO product_sales_channels (product_id,channel_id,is_enabled)
            SELECT product_id,?,is_enabled FROM product_sales_channels WHERE channel_id=?
            ON DUPLICATE KEY UPDATE is_enabled=GREATEST(is_enabled,VALUES(is_enabled))`, [current.id,legacy.id])
        await connection.execute('DELETE FROM product_sales_channels WHERE channel_id=?', [legacy.id])
        await connection.execute('DELETE FROM sales_channels WHERE id=?', [legacy.id])
    }
    if (current) await connection.execute('UPDATE sales_channels SET name=?,is_active=TRUE WHERE id=?', [name,current.id])
    else await connection.execute('INSERT INTO sales_channels (code,name,is_active) VALUES (?,?,TRUE)', [code,name])
}

try {
    await addColumnIfMissing('products','item_type',"ENUM('finished','raw_material','merchandising') NOT NULL DEFAULT 'finished'")
    await addColumnIfMissing('products','is_sellable','BOOLEAN NOT NULL DEFAULT TRUE')
    await addColumnIfMissing('products','is_manufacturable','BOOLEAN NOT NULL DEFAULT FALSE')
    await addColumnIfMissing('products','is_customizable','BOOLEAN NOT NULL DEFAULT FALSE')
    await addColumnIfMissing('products','production_method',"ENUM('purchased','internal_workshop','artisan') NOT NULL DEFAULT 'purchased'")
    await addColumnIfMissing('products','production_branch_id','INT UNSIGNED NULL')

    await connection.query("UPDATE products SET item_type='raw_material' WHERE item_type='component'")
    await connection.query("ALTER TABLE products MODIFY COLUMN item_type ENUM('finished','raw_material','merchandising') NOT NULL DEFAULT 'finished'")

    await connection.query(`
        CREATE TABLE IF NOT EXISTS sales_channels (
            id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
            code VARCHAR(30) NOT NULL UNIQUE,
            name VARCHAR(80) NOT NULL,
            is_active BOOLEAN NOT NULL DEFAULT TRUE
        );
        CREATE TABLE IF NOT EXISTS product_sales_channels (
            product_id INT UNSIGNED NOT NULL,
            channel_id INT UNSIGNED NOT NULL,
            is_enabled BOOLEAN NOT NULL DEFAULT TRUE,
            PRIMARY KEY(product_id,channel_id),
            CONSTRAINT fk_psc_product FOREIGN KEY(product_id) REFERENCES products(id),
            CONSTRAINT fk_psc_channel FOREIGN KEY(channel_id) REFERENCES sales_channels(id)
        );
        CREATE TABLE IF NOT EXISTS product_recipes (
            output_product_id INT UNSIGNED NOT NULL,
            material_product_id INT UNSIGNED NOT NULL,
            quantity_per_unit DECIMAL(10,3) NOT NULL,
            is_active BOOLEAN NOT NULL DEFAULT TRUE,
            PRIMARY KEY(output_product_id,material_product_id),
            CONSTRAINT fk_recipe_output FOREIGN KEY(output_product_id) REFERENCES products(id),
            CONSTRAINT fk_recipe_material FOREIGN KEY(material_product_id) REFERENCES products(id)
        );
        CREATE TABLE IF NOT EXISTS product_personalization_methods (
            product_id INT UNSIGNED NOT NULL,
            method ENUM('laser_internal','artisan_metalwork') NOT NULL,
            is_enabled BOOLEAN NOT NULL DEFAULT TRUE,
            PRIMARY KEY(product_id,method),
            CONSTRAINT fk_personalization_product FOREIGN KEY(product_id) REFERENCES products(id)
        )
    `)
    await addColumnIfMissing('product_recipes','is_active','BOOLEAN NOT NULL DEFAULT TRUE')
    await addColumnIfMissing('product_personalization_methods','is_enabled','BOOLEAN NOT NULL DEFAULT TRUE')

    await normalizeChannel('retail','showroom','Minorista / Showroom')
    await normalizeChannel('wholesale','mayorista','Mayorista')
    await normalizeChannel('mercadolibre','mercado_libre','Mercado Libre')
    await normalizeChannel('tiendanube','tienda_nube','Tienda Nube')
    await normalizeChannel('__none__','merchandising','Merchandising')

    await connection.query(`INSERT IGNORE INTO product_sales_channels(product_id,channel_id,is_enabled)
        SELECT p.id,c.id,TRUE FROM products p CROSS JOIN sales_channels c WHERE c.is_active=TRUE`)
    await connection.query(`UPDATE product_sales_channels psc
        JOIN products p ON p.id=psc.product_id
        JOIN product_categories pc ON pc.id=p.category_id
        JOIN sales_channels sc ON sc.id=psc.channel_id
        SET psc.is_enabled=FALSE
        WHERE LOWER(pc.name)='indumentaria' AND sc.code='mayorista'`)
    await connection.query(`UPDATE product_sales_channels psc
        JOIN products p ON p.id=psc.product_id
        JOIN product_categories pc ON pc.id=p.category_id
        JOIN sales_channels sc ON sc.id=psc.channel_id
        SET psc.is_enabled=TRUE
        WHERE LOWER(pc.name)='indumentaria' AND sc.code IN ('merchandising','tienda_nube','mercado_libre','showroom')`)
    console.log('Metadatos de productos y canales actualizados correctamente.')
} finally {
    await connection.end()
}
