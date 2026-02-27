import { Database } from "../config/connection.js"
import { BranchDTO } from "../dtos/branches/branch_DTO.js"
import { BranchListDTO } from "../dtos/branches/branch_list_DTO.js"
import { BranchTypeDTO } from "../dtos/branches/branch_type_DTO.js"
import { CityDTO } from "../dtos/city/city_DTO.js"
import { ProvinceDTO } from "../dtos/province/province_DTO.js"

/**
 * Modelo de Sucursales.
 * Gestiona la interacción con la tabla 'branches' y sus tablas auxiliares
 * (ciudades, provincias, tipos de sucursal).
 */
export class BranchModel {
    #db
    #table = 'branches'
    #table2 = 'branch_types'
    #table3 = 'cities'
    #table4 = 'provinces'
    // Campos permitidos para inserción masiva y actualizaciones
    #fields = ['name', 'address', 'city_id', 'branch_type_id', 'is_active']

    /**
     * Inicializa el modelo con una instancia de la base de datos.
     * @param {Object} dependencies - Inyección de dependencias.
     * @param {Object} [dependencies.db] - Instancia de la base de datos (opcional).
     */
    constructor({ db }) {
        this.#db = db || Database.getInstance()
    }

    /**
     * Crea una nueva sucursal en la base de datos.
     * Mapea dinámicamente los valores basados en los campos permitidos.
     * * @param {Object} BranchData - Objeto con los datos de la sucursal.
     * @param {string} BranchData.name - Nombre de la sucursal.
     * @param {string} BranchData.address - Dirección física.
     * @param {number} BranchData.city_id - ID de la ciudad.
     * @param {number} BranchData.branch_type_id - ID del tipo de sucursal.
     * @returns {Promise<number>} ID de la sucursal insertada (insertId).
     */
    async create(BranchData) {
        const fields = this.#fields.join(', ')
        const placeholders = this.#fields.map(() => '?').join(', ')
        const values = this.#fields.map(value => BranchData[value])

        const sql = `INSERT INTO ${this.#table} (${fields}) VALUES (${placeholders})`
        const [result] = await this.#db.query(sql, values)
        return result.insertId
    }

    /**
     * Obtiene todas las sucursales con información enriquecida.
     * Realiza JOINs para traer los nombres de Ciudad, Provincia y Tipo.
     * * @returns {Promise<BranchDTO[]>} Lista de DTOs de sucursales.
     */
    async getAll() {
        const sql = `SELECT
        b.id,
        b.name,
        b.address,
        c.name as city,
        p.name as province,
        t.name as type,
        b.is_active
        FROM ${this.#table} b
        JOIN ${this.#table3} c ON b.city_id = c.id 
        JOIN ${this.#table4} p ON c.province_id = p.id
        JOIN ${this.#table2} t on b.branch_type_id = t.id`

        const [rows] = await this.#db.query(sql)
        return rows.map(row => new BranchDTO(row))
    }

    /**
     * Busca una sucursal específica por su ID.
     * * @param {number|string} id - ID de la sucursal.
     * @returns {Promise<BranchDTO>} DTO de la sucursal encontrada.
     */
    async getById(id) {
        const sql = `SELECT 
        b.id,
        b.name,
        b.address,
        c.name as city,
        p.name as province,
        t.name as type,
        b.is_active
        FROM ${this.#table} b
        JOIN ${this.#table3} c ON b.city_id = c.id 
        JOIN ${this.#table4} p ON c.province_id = p.id
        JOIN ${this.#table2} t on b.branch_type_id = t.id
        WHERE b.id = ? LIMIT 1`

        const [rows] = await this.#db.query(sql, [id])
        return new BranchDTO(rows[0])
    }

    async getCatalog() {
        const sql = `SELECT id, name FROM ${this.#table} WHERE is_active != 0 AND id != 1 ORDER BY name ASC`
        const [rows] = await this.#db.query(sql)
        return rows.map(row => new BranchListDTO(row))
    }

    /**
     * Obtiene el listado de tipos de sucursal disponibles (ej: Depósito, Punto de Venta).
     * Útil para poblar selectores en el Frontend.
     * * @returns {Promise<BranchTypeDTO[]>} Lista de tipos de sucursal.
     */
    async getTypes() {
        const sql = `SELECT id, name FROM ${this.#table2} ORDER BY id ASC`;
        const [rows] = await this.#db.query(sql);
        return rows.map(row => new BranchTypeDTO(row));
    }

    /**
     * Verifica si una sucursal existe Y está activa.
     * Se utiliza principalmente para validar operaciones de negocio (ej: crear stock).
     * * @param {number|string} id - ID de la sucursal.
     * @returns {Promise<boolean>} True si existe y está activa.
     */
    async exists(id) {
        const sql = `SELECT 1 FROM ${this.#table} WHERE is_active != 0 AND id = ?`
        const [rows] = await this.#db.query(sql, [id])
        return rows.length > 0
    }

    /**
     * Obtiene la lista completa de provincias.
     * * @returns {Promise<ProvinceDTO[]>} Lista de provincias ordenadas alfabéticamente.
     */
    async getProvinces() {
        const sql = `SELECT * FROM ${this.#table4} ORDER BY name ASC`;
        const [rows] = await this.#db.query(sql);
        return rows.map(row => new ProvinceDTO(row));
    }

    /**
     * Verifica si una provincia existe por su ID.
     * * @param {number|string} id - ID de la provincia.
     * @returns {Promise<boolean>} True si existe.
     */
    async existProvince(id) {
        const sql = `SELECT 1 FROM ${this.#table4} WHERE id = ? LIMIT 1`;
        const [rows] = await this.#db.query(sql, [id]);
        return rows.length > 0;
    }

    /**
     * Obtiene las ciudades pertenecientes a una provincia específica.
     * Implementa el patrón "Cascading Dropdown".
     * * @param {number|string} provinceId - ID de la provincia seleccionada.
     * @returns {Promise<CityDTO[]>} Lista de ciudades filtradas.
     */
    async getCities(provinceId) {
        const sql = `SELECT * FROM ${this.#table3} WHERE province_id = ? ORDER BY name ASC`;
        const [rows] = await this.#db.query(sql, [provinceId]);
        return rows.map(row => new CityDTO(row));
    }

    /**
     * Valida la integridad referencial geográfica.
     * Asegura que una ciudad pertenezca realmente a la provincia indicada.
     * * @param {number|string} cityId - ID de la ciudad.
     * @param {number|string} provinceId - ID de la provincia.
     * @returns {Promise<boolean>} True si la relación es válida.
     */
    async validateCityInProvince(cityId, provinceId) {
        const sql = `SELECT 1 FROM ${this.#table3} WHERE id = ? AND province_id = ?`;
        const [rows] = await this.#db.query(sql, [cityId, provinceId]);
        return rows.length > 0;
    }

    /**
     * Actualiza parcialmente los datos de una sucursal.
     * Filtra dinámicamente los campos para evitar inyecciones o campos no permitidos.
     * * @param {number|string} id - ID de la sucursal.
     * @param {Object} updateData - Objeto con los campos a actualizar.
     * @returns {Promise<boolean>} True si se actualizó al menos una fila.
     */
    async update(id, updateData) {
        const keys = Object.keys(updateData);
        const allowedKeys = keys.filter(key => this.#fields.includes(key));

        if (allowedKeys.length === 0) {
            return false;
        }

        const setClausule = allowedKeys.map(key => `${key} = ?`).join(', ')
        const values = allowedKeys.map(key => updateData[key])

        const parameters = [...values, id]
        const sql = `UPDATE ${this.#table} SET ${setClausule} WHERE id = ?`
        const [result] = await this.#db.query(sql, parameters)
        return result.affectedRows > 0
    }

    /**
     * Cambia el estado de actividad de una sucursal (Soft Delete / Reactivación).
     * * @param {number|string} id - ID de la sucursal.
     * @param {number|boolean} status - 1 para activar, 0 para desactivar.
     * @returns {Promise<boolean>} True si se realizó el cambio.
     */
    async setStatus(id, status) {
        const values = [status, id]
        const sql = `UPDATE ${this.#table} SET is_active = ? WHERE id = ?`
        const [result] = await this.#db.query(sql, values)
        return result.affectedRows > 0
    }
}