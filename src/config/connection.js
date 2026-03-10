import mysql from 'mysql2/promise'
import 'dotenv/config'

export class Database {
    static #instance = null
    #pool = null

    constructor() {
        if (Database.#instance) {
            return Database.#instance
        }

        this.#pool = mysql.createPool({
            host: process.env.DB_HOST,
            user: process.env.DB_USER,
            password: process.env.DB_PASSWORD,
            database: process.env.DB_NAME,
            port: parseInt(process.env.DB_PORT),
            waitForConnections: true,
            connectionLimit: 10
        })

        Database.#instance = this

    }

    static getInstance() {
        if (!Database.#instance) {
            new Database()
        }
        return Database.#instance
    }

    async query(sql, params) {
        try {
            return await this.#pool.execute(sql, params)
        } catch (e) {
            console.error('Error en la query', e.message)
            throw e
        }
    }

    async getConnection() {
        return await this.#pool.getConnection()
    }
}
