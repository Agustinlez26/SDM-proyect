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
        SELECT COUNT(*) AS total
        FROM information_schema.COLUMNS
        WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = ? AND COLUMN_NAME = ?
    `, [table, column])
    if (!Number(rows[0].total)) {
        await connection.query(`ALTER TABLE \`${table}\` ADD COLUMN \`${column}\` ${definition}`)
        console.log(`Columna creada: ${table}.${column}`)
    }
}

try {
    await addColumnIfMissing('products', 'item_type', "ENUM('finished','raw_material','component') NOT NULL DEFAULT 'finished'")
    await addColumnIfMissing('products', 'is_sellable', 'BOOLEAN NOT NULL DEFAULT TRUE')
    await addColumnIfMissing('products', 'is_manufacturable', 'BOOLEAN NOT NULL DEFAULT FALSE')
    await addColumnIfMissing('products', 'is_customizable', 'BOOLEAN NOT NULL DEFAULT FALSE')
    await addColumnIfMissing('products', 'production_branch_id', 'INT UNSIGNED NULL')
    await addColumnIfMissing('products', 'production_method', "ENUM('purchased','internal_workshop','artisan') NOT NULL DEFAULT 'purchased'")

    await connection.query("UPDATE products SET item_type = 'raw_material' WHERE item_type = 'component'")
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
            PRIMARY KEY (product_id, channel_id),
            CONSTRAINT fk_psc_product FOREIGN KEY (product_id) REFERENCES products(id),
            CONSTRAINT fk_psc_channel FOREIGN KEY (channel_id) REFERENCES sales_channels(id)
        );

        CREATE TABLE IF NOT EXISTS product_recipes (
            output_product_id INT UNSIGNED NOT NULL,
            material_product_id INT UNSIGNED NOT NULL,
            quantity_per_unit DECIMAL(10,3) NOT NULL,
            PRIMARY KEY (output_product_id, material_product_id),
            CONSTRAINT fk_recipe_output FOREIGN KEY (output_product_id) REFERENCES products(id),
            CONSTRAINT fk_recipe_material FOREIGN KEY (material_product_id) REFERENCES products(id)
        );

        CREATE TABLE IF NOT EXISTS product_personalization_methods (
            product_id INT UNSIGNED NOT NULL,
            method ENUM('laser_internal','artisan_metalwork') NOT NULL,
            PRIMARY KEY (product_id, method),
            CONSTRAINT fk_personalization_product FOREIGN KEY (product_id) REFERENCES products(id)
        );

        CREATE TABLE IF NOT EXISTS artisans (
            id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
            name VARCHAR(150) NOT NULL,
            phone VARCHAR(50) NULL,
            branch_id INT UNSIGNED NOT NULL,
            specialty VARCHAR(180) NULL,
            notes TEXT NULL,
            is_active BOOLEAN NOT NULL DEFAULT TRUE,
            created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
            CONSTRAINT fk_artisan_branch FOREIGN KEY (branch_id) REFERENCES branches(id)
        );

        CREATE TABLE IF NOT EXISTS wholesale_orders (
            id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
            order_number VARCHAR(50) NOT NULL UNIQUE,
            customer_reference VARCHAR(180) NOT NULL,
            pickup_branch_id INT UNSIGNED NOT NULL,
            status ENUM('draft','partial','reserved','in_transit','ready','delivered','cancelled') NOT NULL DEFAULT 'draft',
            notes TEXT NULL,
            created_by BINARY(16) NOT NULL,
            created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
            CONSTRAINT fk_wholesale_pickup_branch FOREIGN KEY (pickup_branch_id) REFERENCES branches(id),
            CONSTRAINT fk_wholesale_user FOREIGN KEY (created_by) REFERENCES users(id)
        );

        CREATE TABLE IF NOT EXISTS wholesale_order_items (
            id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
            order_id INT UNSIGNED NOT NULL,
            product_id INT UNSIGNED NOT NULL,
            quantity INT NOT NULL,
            quantity_reserved INT NOT NULL DEFAULT 0,
            quantity_delivered INT NOT NULL DEFAULT 0,
            CONSTRAINT fk_wholesale_item_order FOREIGN KEY (order_id) REFERENCES wholesale_orders(id),
            CONSTRAINT fk_wholesale_item_product FOREIGN KEY (product_id) REFERENCES products(id)
        );

        CREATE TABLE IF NOT EXISTS work_orders (
            id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
            code VARCHAR(50) NOT NULL UNIQUE,
            type ENUM('manufacturing','customization','external_commission') NOT NULL,
            origin_branch_id INT UNSIGNED NOT NULL,
            artisan_id INT UNSIGNED NOT NULL,
            wholesale_order_id INT UNSIGNED NULL,
            status ENUM('draft','sent','in_progress','partial','completed','cancelled') NOT NULL DEFAULT 'draft',
            due_date DATE NULL,
            artisan_cost DECIMAL(12,2) NULL,
            cost_currency CHAR(3) NOT NULL DEFAULT 'ARS',
            notes TEXT NULL,
            created_by BINARY(16) NOT NULL,
            created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
            CONSTRAINT fk_wo_branch FOREIGN KEY (origin_branch_id) REFERENCES branches(id),
            CONSTRAINT fk_wo_artisan FOREIGN KEY (artisan_id) REFERENCES artisans(id),
            CONSTRAINT fk_wo_wholesale FOREIGN KEY (wholesale_order_id) REFERENCES wholesale_orders(id),
            CONSTRAINT fk_wo_user FOREIGN KEY (created_by) REFERENCES users(id)
        );

        CREATE TABLE IF NOT EXISTS work_order_materials (
            id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
            work_order_id INT UNSIGNED NOT NULL,
            product_id INT UNSIGNED NOT NULL,
            quantity_sent INT NOT NULL DEFAULT 0,
            quantity_consumed INT NOT NULL DEFAULT 0,
            quantity_returned INT NOT NULL DEFAULT 0,
            quantity_discarded INT NOT NULL DEFAULT 0,
            CONSTRAINT fk_wom_order FOREIGN KEY (work_order_id) REFERENCES work_orders(id),
            CONSTRAINT fk_wom_product FOREIGN KEY (product_id) REFERENCES products(id)
        );

        CREATE TABLE IF NOT EXISTS work_order_outputs (
            id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
            work_order_id INT UNSIGNED NOT NULL,
            product_id INT UNSIGNED NOT NULL,
            quantity_requested INT NOT NULL,
            quantity_received INT NOT NULL DEFAULT 0,
            quantity_rejected INT NOT NULL DEFAULT 0,
            CONSTRAINT fk_woo_order FOREIGN KEY (work_order_id) REFERENCES work_orders(id),
            CONSTRAINT fk_woo_product FOREIGN KEY (product_id) REFERENCES products(id)
        );

        CREATE TABLE IF NOT EXISTS stock_reservations (
            id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
            product_id INT UNSIGNED NOT NULL,
            branch_id INT UNSIGNED NOT NULL,
            wholesale_order_id INT UNSIGNED NULL,
            work_order_id INT UNSIGNED NULL,
            quantity INT NOT NULL,
            status ENUM('active','fulfilled','released') NOT NULL DEFAULT 'active',
            created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
            CONSTRAINT fk_res_product FOREIGN KEY (product_id) REFERENCES products(id),
            CONSTRAINT fk_res_branch FOREIGN KEY (branch_id) REFERENCES branches(id),
            CONSTRAINT fk_res_wholesale FOREIGN KEY (wholesale_order_id) REFERENCES wholesale_orders(id),
            CONSTRAINT fk_res_work_order FOREIGN KEY (work_order_id) REFERENCES work_orders(id)
        );

        CREATE TABLE IF NOT EXISTS shipment_packages (
            id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
            package_code VARCHAR(50) NOT NULL UNIQUE,
            movement_id INT UNSIGNED NULL,
            package_type ENUM('wholesale_order','replenishment','work_order','other') NOT NULL,
            wholesale_order_id INT UNSIGNED NULL,
            status ENUM('prepared','in_transit','received','delivered') NOT NULL DEFAULT 'prepared',
            notes TEXT NULL,
            created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
            CONSTRAINT fk_package_movement FOREIGN KEY (movement_id) REFERENCES movements(id),
            CONSTRAINT fk_package_wholesale FOREIGN KEY (wholesale_order_id) REFERENCES wholesale_orders(id)
        );

        CREATE TABLE IF NOT EXISTS shipment_package_items (
            id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
            package_id INT UNSIGNED NOT NULL,
            product_id INT UNSIGNED NOT NULL,
            quantity INT NOT NULL,
            CONSTRAINT fk_package_item_package FOREIGN KEY (package_id) REFERENCES shipment_packages(id),
            CONSTRAINT fk_package_item_product FOREIGN KEY (product_id) REFERENCES products(id)
        );

        INSERT INTO sales_channels (code, name) VALUES
            ('retail', 'Minorista'),
            ('wholesale', 'Mayorista'),
            ('mercadolibre', 'Mercado Libre'),
            ('tiendanube', 'Tienda Nube')
        ON DUPLICATE KEY UPDATE name = VALUES(name), is_active = TRUE;

        INSERT INTO product_categories (name, is_active)
        SELECT 'Materias primas', TRUE
        WHERE NOT EXISTS (SELECT 1 FROM product_categories WHERE name = 'Materias primas');

        UPDATE product_categories SET is_active = TRUE WHERE name = 'Materias primas';

        INSERT INTO products
            (cod_bar, name, description, category_id, url_img_original, url_img_small, is_active,
             item_type, is_sellable, is_manufacturable, is_customizable)
        VALUES
            ('CAL-CLA', 'Calabaza clasica', 'Calabaza comun para SP, criollos y coquitos', (SELECT MIN(id) FROM product_categories WHERE name = 'Materias primas'), '', '', TRUE, 'raw_material', FALSE, FALSE, FALSE),
            ('CAL-SEL', 'Calabaza seleccionada', 'Calabaza seleccionada para mates con terminacion artesanal', (SELECT MIN(id) FROM product_categories WHERE name = 'Materias primas'), '', '', TRUE, 'raw_material', FALSE, FALSE, FALSE),
            ('CAL-GAL', 'Calabaza galleta', 'Calabaza tipo galleta', (SELECT MIN(id) FROM product_categories WHERE name = 'Materias primas'), '', '', TRUE, 'raw_material', FALSE, FALSE, FALSE),
            ('BAS-CUE-CRU', 'Base de cuero crudo', 'Base utilizada para armar Mate SP', (SELECT MIN(id) FROM product_categories WHERE name = 'Materias primas'), '', '', TRUE, 'raw_material', FALSE, FALSE, FALSE)
        ON DUPLICATE KEY UPDATE
            item_type = VALUES(item_type), is_sellable = FALSE, is_active = TRUE;

        INSERT INTO product_sales_channels (product_id, channel_id, is_enabled)
        SELECT p.id, c.id, TRUE FROM products p CROSS JOIN sales_channels c WHERE 1 = 1
        ON DUPLICATE KEY UPDATE is_enabled = product_sales_channels.is_enabled;

        UPDATE product_sales_channels psc
        JOIN products p ON p.id = psc.product_id
        SET psc.is_enabled = FALSE
        WHERE p.item_type = 'raw_material';
    `)

    await addColumnIfMissing('work_orders', 'personalization_method', "ENUM('laser_internal','artisan_metalwork') NULL")
    await addColumnIfMissing('shipment_packages', 'customer_reference', 'VARCHAR(180) NULL')
    await addColumnIfMissing('product_recipes', 'is_active', 'BOOLEAN NOT NULL DEFAULT TRUE')
    await addColumnIfMissing('product_personalization_methods', 'is_enabled', 'BOOLEAN NOT NULL DEFAULT TRUE')
    await connection.query('ALTER TABLE work_orders MODIFY COLUMN artisan_id INT UNSIGNED NULL')

    await connection.query(`
        UPDATE products
        SET item_type = 'raw_material', production_method = 'purchased'
        WHERE cod_bar IN ('CAL-CLA', 'CAL-SEL', 'CAL-GAL', 'BAS-CUE-CRU');

        UPDATE products
        SET is_sellable = TRUE
        WHERE cod_bar = 'CAL-CLA';

        UPDATE products
        SET is_manufacturable = FALSE,
            production_method = 'purchased',
            production_branch_id = NULL
        WHERE category_id = (SELECT id FROM product_categories WHERE name = 'Mates' LIMIT 1);

        UPDATE products
        SET is_manufacturable = TRUE,
            production_method = 'artisan',
            production_branch_id = (SELECT id FROM branches WHERE name LIKE '%Mercedes%' LIMIT 1)
        WHERE cod_bar IN ('MAT-SDM', 'MAT-URU-CC', 'CIN', 'TER-CC');

        UPDATE products
        SET is_manufacturable = FALSE, production_method = 'purchased'
        WHERE cod_bar = 'IMP-ALG' OR cod_bar LIKE 'RAN-%' OR name LIKE '%ALGARROBO%RANCHERO%';

        UPDATE products
        SET is_manufacturable = TRUE, production_method = 'internal_workshop',
            production_branch_id = (SELECT id FROM branches WHERE name LIKE '%Mercedes%' LIMIT 1)
        WHERE cod_bar = 'LLA' OR name LIKE 'LLAVERO%CINTA%';

        UPDATE products
        SET is_manufacturable = TRUE, production_method = 'artisan',
            production_branch_id = (SELECT id FROM branches WHERE name LIKE '%Juncal%' LIMIT 1)
        WHERE name LIKE 'MATERA MORRAL%' OR name LIKE 'CARTERA MORRAL%' OR cod_bar = 'CAR-ASU-SUE';

        UPDATE products p
        JOIN product_categories c ON c.id = p.category_id
        SET p.is_customizable = TRUE
        WHERE c.name IN ('Mates', 'Bombillas', 'Termos', 'Marroquinería', 'Materas', 'Mochilas / Materas', 'Yerberos')
           OR p.cod_bar IN ('CIN', 'LLA');

        INSERT IGNORE INTO product_personalization_methods (product_id, method)
        SELECT p.id, 'laser_internal'
        FROM products p JOIN product_categories c ON c.id = p.category_id
        WHERE c.name IN ('Mates', 'Termos', 'Marroquinería', 'Materas', 'Mochilas / Materas', 'Yerberos')
           OR p.cod_bar IN ('CIN', 'LLA');

        INSERT IGNORE INTO product_personalization_methods (product_id, method)
        SELECT p.id, 'artisan_metalwork'
        FROM products p JOIN product_categories c ON c.id = p.category_id
        WHERE c.name IN ('Mates', 'Bombillas');

        INSERT INTO product_recipes (output_product_id, material_product_id, quantity_per_unit)
        SELECT output.id, material.id, recipe.qty
        FROM (
            SELECT 'MAT-SP' output_sku, 'CAL-CLA' material_sku, 1.000 qty UNION ALL
            SELECT 'MAT-SP', 'BAS-CUE-CRU', 1.000 UNION ALL
            SELECT 'MAT-COQ', 'CAL-CLA', 1.000 UNION ALL
            SELECT 'MAT-COQ', 'BAS-CUE-CRU', 1.000 UNION ALL
            SELECT 'SP-COQ', 'CAL-CLA', 1.000 UNION ALL
            SELECT 'SP-COQ', 'BAS-CUE-CRU', 1.000 UNION ALL
            SELECT 'SP-CRI', 'CAL-CLA', 1.000 UNION ALL
            SELECT 'SP-CRI', 'BAS-CUE-CRU', 1.000 UNION ALL
            SELECT 'MAT-GAL', 'CAL-GAL', 1.000 UNION ALL
            SELECT 'MAT-GAL', 'BAS-CUE-CRU', 1.000 UNION ALL
            SELECT 'MAT-SP-PRI', 'CAL-SEL', 1.000 UNION ALL
            SELECT 'MAT-SP-PRI', 'BAS-CUE-CRU', 1.000 UNION ALL
            SELECT 'SP-PRI-ALP-BOR', 'CAL-SEL', 1.000 UNION ALL
            SELECT 'SP-PRI-ALP-BOR', 'BAS-CUE-CRU', 1.000 UNION ALL
            SELECT 'SP-PRI-ALP-MAR', 'CAL-SEL', 1.000 UNION ALL
            SELECT 'SP-PRI-ALP-MAR', 'BAS-CUE-CRU', 1.000 UNION ALL
            SELECT 'SP-VIR-ALU', 'CAL-SEL', 1.000 UNION ALL
            SELECT 'SP-VIR-ALU', 'BAS-CUE-CRU', 1.000
        ) recipe
        JOIN products output ON output.cod_bar = recipe.output_sku
        JOIN products material ON material.cod_bar = recipe.material_sku
        ON DUPLICATE KEY UPDATE quantity_per_unit = VALUES(quantity_per_unit), is_active = TRUE;

        UPDATE products
        SET is_manufacturable = TRUE,
            production_method = 'internal_workshop',
            production_branch_id = (SELECT id FROM branches WHERE name LIKE '%Mercedes%' LIMIT 1)
        WHERE cod_bar IN ('MAT-SP', 'MAT-COQ', 'SP-COQ', 'SP-CRI', 'MAT-GAL');

        UPDATE products
        SET is_manufacturable = TRUE,
            production_method = 'artisan',
            production_branch_id = (SELECT id FROM branches WHERE name LIKE '%Mercedes%' LIMIT 1)
        WHERE cod_bar IN ('MAT-SP-PRI', 'SP-PRI-ALP-BOR', 'SP-PRI-ALP-MAR', 'SP-VIR-ALU');

        UPDATE product_sales_channels psc
        JOIN products p ON p.id = psc.product_id
        JOIN sales_channels sc ON sc.id = psc.channel_id
        SET psc.is_enabled = (sc.code = 'wholesale')
        WHERE p.cod_bar = 'CAL-CLA';
    `)

    console.log('Migracion de produccion, artesanos y mayorista completada.')
} finally {
    await connection.end()
}
