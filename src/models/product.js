import { Database } from '../config/connection.js'
import { ProductListDTO } from '../dtos/products/product-list-dto.js'
import { ProductDTO } from '../dtos/products/product-dto.js'
import { ProductCatalogDTO } from '../dtos/products/product-catalog-dto.js'
import { CategoryDTO } from '../dtos/products/category-dto.js'

export class ProductModel {
    #db
    #table = 'products'
    #table2 = 'product_categories'
    #fieldsToInsert = [
        'name', 'cod_bar', 'description', 'category_id', 'url_img_original', 'url_img_small', 'is_active',
        'item_type', 'is_sellable', 'is_manufacturable', 'is_customizable', 'production_method', 'production_branch_id'
    ]

    /**
         * Inicializa el modelo con una instancia de base de datos.
         * @param {Object} dependencies
         * @param {Database} [dependencies.db] - Instancia opcional para inyección de dependencias.
         */
    constructor({ db }) {
        this.#db = db || Database.getInstance()
    }

    /**
     * Busca productos con soporte para filtros, búsqueda y paginación.
     * * @param {object} params - Objeto de parámetros.
     * @param {string|null} [params.search] - Texto para buscar por nombre o SKU.
     * @param {object} [params.filters] - Filtros específicos (category, state).
     * @param {number|null} [params.offset] - Desplazamiento para paginación (SQL OFFSET).
     * @returns {Promise<ProductListDTO[]>} Retorna una lista de DTOs de productos.
     */
    async findAll({ search = null, filters = {}, offset = null, limit = null }) {
        let sql = `
        SELECT 
        p.id,
        p.name,
        p.cod_bar AS sku,
        p.description,
        c.name as category,
        p.url_img_small,
        p.item_type,
        p.is_sellable,
        p.is_manufacturable,
        p.is_customizable,
        p.production_method
        FROM ${this.#table} p
        JOIN ${this.#table2} c
        ON p.category_id = c.id
        WHERE 1=1`

        const params = []

        if (search) {
            sql += ' AND (p.name LIKE ? OR p.cod_bar LIKE ?)'
            params.push(`%${search}%`, `%${search}%`)
        }

        if (filters.category) {
            sql += ' AND c.id = ?'
            params.push(filters.category)
        }

        if (filters.state !== undefined) {
            // Convertir boolean a 0/1 para MySQL
            const stateValue = filters.state ? 1 : 0
            sql += ' AND p.is_active = ?'
            params.push(stateValue)
        }

        sql += ' ORDER BY p.id DESC'

        if (Number.isFinite(limit) && Number.isFinite(offset) && offset >= 0) {
            sql += ` LIMIT ${limit} OFFSET ${offset}`
        }

        const [rows] = await this.#db.query(sql, params)
        return rows.map(row => new ProductListDTO(row))
    }

    /**
     * Busca un producto por su ID único.
     * * @param {number} id - ID del producto.
     * @returns {Promise<ProductDTO|null>} Retorna el DTO del producto o null si no existe.
     */
    async findById(id) {
        const sql = `
        SELECT 
        p.id,
        p.name,
        p.cod_bar AS sku,
        p.description,
        p.category_id,
        c.name as category,
        p.url_img_original,
        p.is_active,
        p.item_type,
        p.is_sellable,
        p.is_manufacturable,
        p.is_customizable,
        p.production_method,
        p.production_branch_id
        FROM ${this.#table} p
        JOIN ${this.#table2} c
        ON p.category_id = c.id
        WHERE p.id = ? LIMIT 1`

        const [row] = await this.#db.query(sql, [id])

        if (row.length === 0) return null

        const [[channels], [recipe], [personalizationMethods]] = await Promise.all([
            this.#db.query(`SELECT channel_id FROM product_sales_channels WHERE product_id = ? AND is_enabled = TRUE`, [id]),
            this.#db.query(`
                SELECT pr.material_product_id AS product_id, p.name, p.cod_bar AS sku, pr.quantity_per_unit AS quantity
                FROM product_recipes pr JOIN products p ON p.id = pr.material_product_id
                WHERE pr.output_product_id = ? AND pr.is_active = TRUE ORDER BY p.name
            `, [id]),
            this.#db.query(`SELECT method FROM product_personalization_methods WHERE product_id = ? AND is_enabled = TRUE`, [id])
        ])

        return new ProductDTO({
            ...row[0],
            channels: channels.map(item => item.channel_id),
            recipe,
            personalization_methods: personalizationMethods.map(item => item.method)
        })
    }

    async findBySku(sku, excludeId = null) {
        let sql = `SELECT 1 FROM ${this.#table} WHERE cod_bar = ?`
        const params = [sku]
        if (excludeId) {
            sql += ' AND id != ?'
            params.push(excludeId)
        }
        const [rows] = await this.#db.query(sql, params)
        return rows.length > 0
    }

    async findByName(name, excludeId = null) {
        let sql = `SELECT 1 FROM ${this.#table} WHERE name = ?`
        const params = [name]
        if (excludeId) {
            sql += ' AND id != ?'
            params.push(excludeId)
        }
        const [rows] = await this.#db.query(sql, params)
        return rows.length > 0
    }

    /**
     * Crea un nuevo producto en la base de datos.
     * * @param {object} productData - Objeto con los datos crudos del producto (validados previamente).
     * @returns {Promise<number>} ID del nuevo producto insertado.
     */
    async create(productData) {
        const columns = this.#fieldsToInsert.join(', ')

        const placeholders = this.#fieldsToInsert.map(() => '?').join(', ')

        const values = this.#fieldsToInsert.map(field => {
            const value = productData[field];
            // Convertir boolean a 0/1 para MySQL
            if (field === 'is_active' && typeof value === 'boolean') {
                return value ? 1 : 0;
            }
            return value;
        })

        const sql = `INSERT INTO ${this.#table} (${columns}) VALUES (${placeholders})`
        const [result] = await this.#db.query(sql, values)
        return result.insertId
    }

    /**
    * Modificar los datos de un producto 
    * * @param {number} id - ID del producto.
    * * @param {object} productData - Objeto con los datos crudos del producto (validados previamente).
    * @returns {boolean} True o false si las filas fueron afectadas
    */
    async update(id, productData) {
        const cleanData = Object.fromEntries(
            Object.entries(productData).filter(([_, v]) => v !== undefined)
        );

        const keys = Object.keys(cleanData);
        const allowedKeys = keys.filter(key => this.#fieldsToInsert.includes(key));

        if (allowedKeys.length === 0) {
            return false;
        }

        const setClausule = allowedKeys.map(key => `${key} = ?`).join(', ');

        const values = allowedKeys.map(key => {
            const value = cleanData[key];
            if (key === 'is_active' && typeof value === 'boolean') {
                return value ? 1 : 0;
            }
            return value;
        });

        const parameters = [...values, id]

        const sql = `UPDATE ${this.#table} SET ${setClausule} WHERE id = ?`
        const [result] = await this.#db.query(sql, parameters)
        return result.affectedRows > 0

    }

    async saveOperationalConfig(productId, data) {
        const connection = await this.#db.getConnection()
        try {
            await connection.beginTransaction()
            await connection.execute('UPDATE product_sales_channels SET is_enabled = FALSE WHERE product_id = ?', [productId])
            for (const channelId of data.channels || []) {
                await connection.execute(`
                    INSERT INTO product_sales_channels (product_id, channel_id, is_enabled)
                    VALUES (?, ?, TRUE) ON DUPLICATE KEY UPDATE is_enabled = TRUE
                `, [productId, channelId])
            }

            await connection.execute('UPDATE product_personalization_methods SET is_enabled = FALSE WHERE product_id = ?', [productId])
            if (data.is_customizable) {
                for (const method of data.personalization_methods || []) {
                    await connection.execute(`
                        INSERT INTO product_personalization_methods (product_id, method, is_enabled) VALUES (?, ?, TRUE)
                        ON DUPLICATE KEY UPDATE is_enabled = TRUE
                    `, [productId, method])
                }
            }

            await connection.execute('UPDATE product_recipes SET is_active = FALSE WHERE output_product_id = ?', [productId])
            if (data.is_manufacturable) {
                for (const item of data.recipe || []) {
                    if (Number(item.product_id) === Number(productId)) continue
                    await connection.execute(`
                        INSERT INTO product_recipes (output_product_id, material_product_id, quantity_per_unit, is_active)
                        VALUES (?, ?, ?, TRUE)
                        ON DUPLICATE KEY UPDATE quantity_per_unit = VALUES(quantity_per_unit), is_active = TRUE
                    `, [productId, item.product_id, item.quantity])
                }
            }
            await connection.commit()
            return true
        } catch (error) {
            await connection.rollback()
            throw error
        } finally {
            connection.release()
        }
    }

    async getOperationalCatalogs() {
        const [productsResult, branchesResult, channelsResult] = await Promise.all([
            this.#db.query(`SELECT id, name, cod_bar AS sku, item_type FROM products WHERE is_active = TRUE ORDER BY name`),
            this.#db.query(`SELECT id, name FROM branches WHERE is_active = TRUE ORDER BY name`),
            this.#db.query(`SELECT id, code, name FROM sales_channels WHERE is_active = TRUE ORDER BY id`)
        ])
        return {
            products: productsResult[0],
            branches: branchesResult[0],
            channels: channelsResult[0]
        }
    }

    /**
     * Actualiza el estado de activo/inactivo de un producto.
     * Se utiliza para el borrado lógico (Soft Delete) o reactivación.
     * * @param {number} id - El ID del producto a modificar.
     * @param {boolean|number} newStatus - Nuevo estado (true/1 para activar, false/0 para desactivar).
     * @returns {Promise<boolean>} Retorna `true` si se encontró y actualizó el producto, `false` si el ID no existe.
     * @throws {Error} Si ocurre un fallo en la conexión o la query.
     */
    async updateStatus(id, newStatus) {
        // Convertir boolean a 0/1 para MySQL
        const statusValue = typeof newStatus === 'boolean' ? (newStatus ? 1 : 0) : newStatus;
        const sql = `UPDATE ${this.#table} SET is_active = ? WHERE id = ?`
        const [result] = await this.#db.query(sql, [statusValue, id])
        return result.affectedRows > 0
    }

    /**
     * Realiza una búsqueda ligera optimizada para la vista de catálogo público.
     * Solo retorna los campos esenciales para mostrar tarjetas (Cards) de productos.
     * * @param {string|null} [search=null] - Término opcional para buscar por nombre o SKU.
     * @returns {Promise<ProductCatalogDTO[]>} Retorna una lista de DTOs optimizados para el catálogo.
     * @throws {Error} Si ocurre un fallo en la base de datos.
     */
    async searchCatalog(search = null) {
        let sql = `SELECT 
            p.id, 
            p.name,
            p.cod_bar AS sku,
            p.url_img_small,
            IF(s.product_id IS NULL, 0, 1) AS is_registered
        FROM ${this.#table} p
        LEFT JOIN product_branch_stock s 
            ON p.id = s.product_id AND s.branch_id = 1
        WHERE p.is_active = 1`

        const params = []
        if (search) {
            sql += ' AND ('
            sql += 'p.name LIKE ? OR p.cod_bar LIKE ?)'
            params.push(`%${search}%`, `%${search}%`)
        }

        const [rows] = await this.#db.query(sql, params)
        return rows.map(row => new ProductCatalogDTO(row))
    }

    async findCategories() {
        const sql = `SELECT id, name FROM ${this.#table2} WHERE is_active = 1 ORDER BY name ASC`
        const [rows] = await this.#db.query(sql)
        return rows.map(row => new CategoryDTO(row))
    }

    async createCategory(name) {
        const sql = `INSERT INTO ${this.#table2} (name) VALUES (?)`
        const [result] = await this.#db.query(sql, [name])
        return result.insertId
    }

    async deleteCategory(id) {
        const sql = `UPDATE ${this.#table2} SET is_active = 0 WHERE id = ?`
        const [result] = await this.#db.query(sql, [id])
        return result.affectedRows > 0
    }
}
