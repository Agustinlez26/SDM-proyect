import { Database } from "../config/connection.js";
import { AuthDTO } from "../dtos/auth/auth_DTO.js";
import { User_DTO } from "../dtos/users/User_DTO.js";
import { User_list_DTO } from "../dtos/users/User_list_DTO.js";
import { randomUUID } from 'node:crypto'

/**
 * Modelo de Usuario.
 * Gestiona la interacción con la tabla 'users' y su relación con 'branches'.
 */
export class User {
    #db
    #table = 'users'
    #table2 = 'branches'
    #fieldsToInsert = ['full_name', 'email', 'password', 'is_admin', 'branch_id', 'is_active', 'requires_password_change']
    #fieldsToUpdate = ['full_name', 'email', 'is_admin', 'branch_id', 'is_active']

    /**
     * Inicializa el modelo con una instancia de la base de datos.
     * @param {Object} [db] - Instancia opcional de la base de datos (Inyección de dependencias).
     */
    constructor(db) {
        this.#db = db || Database.getInstance();
    }

    /**
     * Obtiene una lista de usuarios con filtros y búsqueda opcionales.
     * Realiza un JOIN con sucursales para mostrar el nombre de la sucursal.
     * * @param {Object} options - Opciones de búsqueda.
     * @param {string|null} [options.search] - Término de búsqueda (Nombre, Email o Teléfono).
     * @param {Object} [options.filter] - Filtros exactos.
     * @param {boolean|number} [options.filter.is_admin] - Filtrar por rol (Admin/User).
     * @param {boolean|number} [options.filter.is_active] - Filtrar por estado.
     * @returns {Promise<User_list_DTO[]>} Array de DTOs de lista de usuarios.
     */
    async findAll({ search = null, filters = {} }) {
        let sql = `SELECT 
        BIN_TO_UUID(u.id) as id,
        u.full_name,
        b.name as branch,
        u.is_admin,
        u.is_active
        FROM ${this.#table} u
        JOIN ${this.#table2} b
        ON u.branch_id = b.id    
        WHERE 1=1`

        const params = []

        if (search) {
            sql += ' AND (u.full_name LIKE ? OR u.email LIKE ? OR u.phone LIKE ?)'
            params.push(`%${search}%`, `%${search}%`, `%${search}%`)
        }

        if (filters.is_admin !== undefined) {
            sql += ' AND is_admin = ?'
            params.push(filters.is_admin)
        }

        if (filters.is_active !== undefined) {
            sql += ' AND is_active = ?'
            params.push(filters.is_active)
        }

        sql += ' ORDER BY u.full_name ASC'

        const [rows] = await this.#db.query(sql, params)
        return rows.map(row => new User_list_DTO(row))
    }

    /**
     * Busca un usuario por su ID.
     * * @param {number} id - ID del usuario.
     * @returns {Promise<User_DTO|null>} DTO del usuario o null si no existe.
     */
    async findById(id) {
        const sql =
            `SELECT 
        BIN_TO_UUID(u.id) as id,
        u.full_name,
        u.email,
        b.name as branch,
        u.is_admin,
        u.is_active
        FROM ${this.#table} u
        JOIN ${this.#table2} b
        ON u.branch_id = b.id    
        WHERE u.id = UUID_TO_BIN(?)`

        const [rows] = await this.#db.query(sql, [id])
        if (rows.length === 0) return null
        return new User_DTO(rows[0])
    }

    /**
     * Busca un usuario por email para el proceso de Login.
     * * @warning Este método retorna datos sensibles (password hash) a través de AuthDTO.
     * Solo debe ser utilizado por el AuthService.
     * * @param {string} email - Email del usuario.
     * @returns {Promise<AuthDTO|null>} DTO de autenticación o null si no existe.
     */
    async findByEmail(email) {
        const sql = `
        SELECT BIN_TO_UUID(id) as id,
            full_name,
            email,
            password,
            is_admin,
            branch_id,
            is_active,
            requires_password_change
            FROM ${this.#table} WHERE email = ? LIMIT 1`
        const [rows] = await this.#db.query(sql, [email])
        if (rows.length === 0) return null;
        return new AuthDTO(rows[0])
    }

    /**
     * Crea un nuevo usuario en la base de datos.
     * * @param {Object} userData - Objeto con los datos del usuario.
     * @returns {Promise<number>} ID del usuario creado (insertId).
     */
    async create(userData) {
        const newId = randomUUID()
        const columns = ['id', ...this.#fieldsToInsert].join(', ');
        const placeholders = ['UUID_TO_BIN(?)', ...this.#fieldsToInsert.map(() => '?')].join(', ')
        const values = [newId, ...this.#fieldsToInsert.map(field => userData[field])]
        const sql = `INSERT INTO ${this.#table} (${columns}) VALUES (${placeholders})`
        await this.#db.query(sql, values)
        return newId
    }

    /**
     * Actualiza parcialmente los datos de un usuario.
     * Filtra dinámicamente los campos recibidos para evitar Mass Assignment.
     * * @param {number} id - ID del usuario a actualizar.
     * @param {Object} updateData - Objeto con los campos a modificar.
     * @returns {Promise<boolean>} True si se actualizó al menos una fila.
     */
    async update(id, updateData) {
        const keys = Object.keys(updateData);
        const allowedKeys = keys.filter(key => this.#fieldsToUpdate.includes(key));
        if (allowedKeys.length === 0) {
            return false;
        }

        const setClausule = allowedKeys.map(key => `${key} = ?`).join(', ')
        const values = allowedKeys.map(key => updateData[key])
        const parameters = [...values, id]

        const sql = `UPDATE ${this.#table} SET ${setClausule} WHERE id = UUID_TO_BIN(?)`
        const [result] = await this.#db.query(sql, parameters)
        return result.affectedRows > 0
    }

    /**
     * Cambia el estado (activo/inactivo) de un usuario.
     * * @param {number} id - ID del usuario.
     * @param {boolean|number} status - Nuevo estado (1/true o 0/false).
     * @returns {Promise<boolean>} True si se realizó el cambio.
     */
    async updateStatus(id, status) {
        const parameters = [status, id]
        const sql = `UPDATE ${this.#table} SET is_active = ? WHERE id = UUID_TO_BIN(?)`
        const [result] = await this.#db.query(sql, parameters)
        return result.affectedRows > 0
    }

    /**
     * Verifica si un usuario existe (optimizado con SELECT 1).
     * * @param {number} id - ID del usuario.
     * @returns {Promise<boolean>} True si existe.
     */
    async exists(id) {
        const sql = `SELECT 1 FROM ${this.#table} WHERE id = UUID_TO_BIN(?)`
        const [rows] = await this.#db.query(sql, [id])
        return rows.length > 0
    }

    async existsInBranch(id) {
        const sql = `SELECT 1 FROM ${this.#table} WHERE branch_id = ?`
        const [rows] = await this.#db.query(sql, [id])
        return rows.length > 0
    }

    /**
     * Cambia la contraseña de un usuario.
     * Si es el primer login, también desactiva la bandera 'requires_password_change'.
     * * @param {number} id - ID del usuario.
     * @param {string} newPassword - Hash de la nueva contraseña.
     * @param {boolean} [firstLogin=false] - Indica si es el cambio obligatorio inicial.
     * @returns {Promise<boolean>} True si se actualizó correctamente.
     */
    async changePassword(id, newPassword, firstLogin = false) {
        const parameters = [newPassword]
        const setClausule = ['password = ?']
        if (firstLogin) {
            setClausule.push('requires_password_change = ?')
            parameters.push(0)
        }
        parameters.push(id)
        const sql = `UPDATE ${this.#table} SET ${setClausule.join(', ')} WHERE id = UUID_TO_BIN(?)`
        const [result] = await this.#db.query(sql, parameters)
        return result.affectedRows > 0
    }
}