import { ValidationError, NotFoundError } from '../utils/errors.js'

/**
 * Servicio de Lógica de Negocio para Sucursales.
 * Se encarga de coordinar validaciones de integridad, verificaciones de existencia
 * y operaciones de persistencia a través del modelo.
 */
export class BranchService {

    /**
     * @param {Object} dependencies
     * @param {import('../models/branch.js').BranchModel} dependencies.branchModel
     */
    constructor({ branchModel }) {
        this.branchModel = branchModel
    }

    /**
     * Crea una nueva sucursal verificando la consistencia geográfica.
     * Valida que la ciudad pertenezca a la provincia indicada antes de guardar.
     * * @param {Object} data - Datos de la sucursal (name, address, city_id, province_id, type_id).
     * @returns {Promise<number>} El ID de la nueva sucursal.
     * @throws {ValidationError} Si la provincia no existe o la ciudad no coincide con la provincia.
     */
    async create(data) {
        // Validamos integridad antes de insertar
        await this.#validateLocation(data.city_id, data.province_id)

        const newId = await this.branchModel.create(data)
        return newId
    }

    /**
     * Obtiene el listado de sucursales.
     * * @param {Object} [filters] - Opciones de filtrado (ej: activeOnly).
     * @returns {Promise<import('../dtos/branches/branch_DTO.js').BranchDTO[]>} Lista de sucursales.
     */
    async getAll(filters) {
        return await this.branchModel.getAll(filters)
    }

    async getCatalog() {
        return await this.branchModel.getCatalog()
    }

    /**
     * Busca una sucursal por ID.
     * * @param {number|string} id - ID de la sucursal.
     * @returns {Promise<import('../dtos/branches/branch_DTO.js').BranchDTO>} La sucursal encontrada.
     * @throws {NotFoundError} Si no se encuentra la sucursal.
     */
    async getById(id) {
        const branch = await this.branchModel.getById(id)
        if (!branch) {
            throw new NotFoundError('La sucursal solicitada no existe')
        }
        return branch
    }

    /**
     * Obtiene el listado de tipos de sucursal.
     * @returns {Promise<Array>} Lista de tipos de sucursal.
     */ 
    async getTypes() {
        return await this.branchModel.getTypes()
    }

    /**
     * Actualiza datos de una sucursal.
     * Incluye lógica de seguridad para cambios de ubicación: obliga a enviar provincia si se cambia la ciudad.
     * * @param {number|string} id - ID de la sucursal.
     * @param {Object} data - Datos a actualizar.
     * @returns {Promise<boolean>} True si la actualización fue exitosa.
     * @throws {NotFoundError} Si la sucursal no existe.
     * @throws {ValidationError} Si hay inconsistencia geográfica o faltan datos requeridos.
     */
    async update(id, data) {
        const exists = await this.branchModel.exists(id)
        if (!exists) throw new NotFoundError('La sucursal no existe o está inactiva')

        // Lógica de integridad geográfica en actualización
        if (data.city_id && data.province_id) {
            // Caso ideal: Envían ambos, validamos relación.
            await this.#validateLocation(data.city_id, data.province_id)
        } else if (data.city_id && !data.province_id) {
            // Caso inseguro: Envían ciudad pero no provincia. 
            // No podemos validar si la ciudad 5 pertenece a la provincia original sin hacer query extra.
            // Regla de negocio: Obligar a mandar ambos.
            throw new ValidationError('Para cambiar la ciudad debes enviar también la provincia')
        }

        const updated = await this.branchModel.update(id, data)
        if (!updated) throw new ValidationError('No se pudo actualizar la sucursal')

        return true
    }

    /**
     * Realiza un borrado lógico de la sucursal.
     * * @param {number|string} id - ID de la sucursal.
     * @returns {Promise<boolean>} True si se eliminó.
     * @throws {NotFoundError} Si la sucursal no existe.
     */
    async delete(id) {
        const exists = await this.branchModel.exists(id)
        if (!exists) throw new NotFoundError('La sucursal no existe')
            
        const newStatus = false
        return await this.branchModel.setStatus(id, newStatus)
    }

    /**
     * Invierte el estado de actividad de una sucursal (Activo <-> Inactivo).
     * * @param {number|string} id - ID de la sucursal.
     * @returns {Promise<boolean>} True si el cambio de estado fue exitoso.
     * @throws {NotFoundError} Si la sucursal no existe.
     */
    async active(id) {
        const branch = await this.branchModel.getById(id)
        if (!branch) throw new NotFoundError('La sucursal no existe')

        const newStatus = true
        return await this.branchModel.setStatus(id, newStatus)
    }

    // --- MÉTODOS AUXILIARES (Selectores para el Frontend) ---

    /**
     * Obtiene todas las provincias.
     * @returns {Promise<Array>} Lista de provincias.
     */
    async getProvinces() {
        return await this.branchModel.getProvinces()
    }

    /**
     * Obtiene ciudades filtradas por provincia.
     * Valida previamente que la provincia sea válida.
     * * @param {number|string} provinceId - ID de la provincia.
     * @returns {Promise<Array>} Lista de ciudades.
     * @throws {ValidationError} Si no se envía ID o la provincia no existe.
     */
    async getCities(provinceId) {
        if (!provinceId) throw new ValidationError('Debes especificar una provincia')

        const provExists = await this.branchModel.existProvince(provinceId)
        if (!provExists) throw new ValidationError('La provincia indicada no existe')

        return await this.branchModel.getCities(provinceId)
    }

    // --- LÓGICA PRIVADA DE VALIDACIÓN ---

    /**
     * Verifica la integridad de los datos geográficos en la BD.
     * Lanza un error si la provincia no existe o si la ciudad no corresponde.
     * Método privado (#) usado por create y update.
     * * @param {number} cityId 
     * @param {number} provinceId 
     * @throws {ValidationError}
     */
    async #validateLocation(cityId, provinceId) {
        const provExists = await this.branchModel.existProvince(provinceId)
        if (!provExists) {
            throw new ValidationError('La provincia seleccionada no es válida')
        }

        const isValidRelation = await this.branchModel.validateCityInProvince(cityId, provinceId)
        if (!isValidRelation) {
            throw new ValidationError('La ciudad seleccionada no pertenece a la provincia indicada')
        }
    }
}
