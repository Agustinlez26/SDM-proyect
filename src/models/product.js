import { Database } from '../config/connection.js'
import { ProductListDTO } from '../dtos/products/productListDTO.js'
import { ProductDTO } from '../dtos/products/productDTO.js'
import { ProductCatalogDTO } from '../dtos/products/productCatalogDTO.js'

export class ProductModel {
    #db
    #table = 'products'
    #fielsToInsert = ['name', 'cod_bar', 'description', 'category_id', 'url_img_original', 'url_img_small', 'is_active']

    constructor(db) {
        this.#db = Database.getInstance()
    }

    async findAll({ search = null, filters = {}, offset = null }) {
        let sql = `
        SELECT 
        p.name, 
        p.cod_bar, 
        p.description, 
        c.name as category, 
        p.url_img_small
        FROM products p
        JOIN product_categories c 
        ON p.category_id = c.id
        WHERE 1=1`

        const params = []

        if (search) {
            sql += ' AND ('
            const isNumeric = /^\d+$/.test(search)

            if (isNumeric) {
                sql += 'p.cod_bar LIKE ?'
            } else {
                sql += 'p.name LIKE ?'
            }

            params.push(`%${search}%`)
            sql += ')'
        }

        if (filters.category) {
            sql += ' AND category = ?'
            params.push(filters.category)
        }

        if (filters.state !== undefined) {
            sql += ' AND p.is_active = ?'
            params.push(filters.state)
        }

        sql += ' ORDER BY p.id DESC'

        if (offset !== null) {
            sql += ' LIMIT ? OFFSET ?'
            params.push(20)
            params.push(parseInt(offset))
        }

        try {
            const rows = await this.#db.query(sql, params)
            return rows.map(row => new ProductListDTO(row))
        } catch (error) {
            console.log(error)
        }
    }

    async findById(id) {
        const sql = `
        SELECT 
        p.id,
        p.name,
        p.cod_bar,
        p.description,
        c.name as category,
        p.url_img_original,
        p.is_active
        FROM ${this.#table} p
        JOIN product_categories c
        ON p.category_id = c.id
        WHERE p.id = ? LIMIT 1`

        try {
            const rows = await this.#db.query(sql, [id])

            if (rows.length === 0) return null

            return new ProductDTO(rows[0])
        } catch (error) {
            console.log(error)
        }
    }

    async create(productData) {
        const columns = this.#fielsToInsert.join(', ')

        const placeholders = this.#fielsToInsert.map(() => '?').join(', ')

        const values = this.#fielsToInsert.map(field => productData[field])

        try {
            const sql = `INSERT INTO ${this.#table} (${columns}) VALUES (${placeholders})`
            const result = await this.#db.query(sql, values)
            return result.insertId
        } catch (error) {
            console.log(error)
        }
    }

    async update(id, productData) {
        const setClausule = this.#fielsToInsert.map(field => `${field} = ?`).join(', ')

        const values = this.#fielsToInsert.map(field => productData[field])

        const parameters = [...values, id]

        try {
            const sql = `UPDATE ${this.#table} SET ${setClausule} WHERE id = ?`
            const result = await this.#db.query(sql, parameters)
            return result.affectedRows > 0
        } catch (error) {
            console.log(error)
        }
    }

    async updateStatus(id, newStatus) {
        const sql = `UPDATE ${this.#table} SET is_active = ? WHERE id = ?`
        try {
            const result = await this.#db.query(sql, [newStatus, id])
            return result.affectedRows > 0
        } catch (error) {
            console.log(error)
        }
    }

    async searchCatalog(search = null) {
        let sql = `SELECT id, name, cod_bar, url_img_small FROM ${this.#table} WHERE 1=1`
        const params = []
        if (search) {
            sql += ' AND ('
            const isNumeric = /^\d+$/.test(search)

            if (isNumeric) {
                sql += 'cod_bar LIKE ?'
            } else {
                sql += 'name LIKE ?'
            }

            params.push(`%${search}%`)
            sql += ')'
        }

        try {
            const results = await this.#db.query(sql, params)
            return results.map(row => new ProductCatalogDTO(row))
        } catch (error) {
            console.log(error)
        }
    }
}
