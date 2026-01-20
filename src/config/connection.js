import mysql from 'mysql2/promise'
import dotenv from 'dotenv'

dotenv.config()

class Database {
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
            port: process.env.DB_PORT ?? 3306,
            waitForConnections: true,
            connectionLimit: 10
        })

        Database.#instance = this
        console.log('Pool de conexiones inicializada por primera vez')
    }

    static getInstance() {
        if(!Database.#instance) {
            new Database()
        }
        return Database.#instance
    }

    async query(sql, params) {
        try {
            const [results] = await this.#pool.execute(sql,params)
            return results
        } catch (e) {
            console.error('Error en la query', e.message)
            throw e
        }
    }
}

export default Database

