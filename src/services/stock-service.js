import { NotFoundError, ValidationError } from "../utils/errors.js"

/**
 * Servicio encargado de la lógica de negocio para el control de inventario (Stock).
 * Gestiona la asignación de productos a sucursales, actualizaciones de cantidades y consultas.
 */
export class StockService {
    #PAGE_SIZE = 20

    /**
     * @param {Object} dependencies
     * @param {import('../models/stock.js').Stock} dependencies.stockModel - Instancia del modelo de Stock.
     */
    constructor({ stockModel, branchModel }) {
        this.stockModel = stockModel
        this.branchModel = branchModel
    }

    /**
     * Asigna un producto a una sucursal creando un registro de stock inicial.
     * Valida que no exista ya una relación entre ese producto y esa sucursal.
     * * @param {Object} data - Datos para la creación.
     * @param {number} data.product_id - ID del producto.
     * @param {number} data.branch_id - ID de la sucursal.
     * @param {number} data.quantity - Cantidad inicial.
     * @param {number} data.min_quantity - Stock mínimo de alerta.
     * @returns {Promise<number>} ID del nuevo registro creado.
     * @throws {ValidationError} Si el producto ya está asignado a la sucursal.
     */
    async create(data) {
        const validateBranch = await this.branchModel.exists(data.branch_id)
        if (!validateBranch) throw new ValidationError('esta sucursal no existe')
        const validate = await this.stockModel.findByProductAndBranch(data.product_id, data.branch_id)
        if (validate) throw new ValidationError('El producto ya tiene un registro de stock en esta sucursal')
        const stockToSave = {
            ...data
        }

        return await this.stockModel.create(stockToSave)
    }

    /**
     * Obtiene una lista paginada de stocks con filtros opcionales.
     * * @param {Object} params - Parámetros de búsqueda y paginación.
     * @param {number} [params.page=1] - Número de página actual.
     * @param {string} [params.search] - Texto para buscar por nombre o código de barra.
     * @param {number} [params.category] - ID de categoría para filtrar.
     * @param {number} [params.branch] - ID de sucursal para filtrar.
     * @param {boolean} [params.lowStock] - Filtrar solo stock bajo.
     * @param {boolean} [params.outStock] - Filtrar solo stock agotado.
     * @returns {Promise<Array>} Lista de objetos de stock (DTOs).
     */
    async findAll({ page = 1, search, category, branch, lowStock, outStock, }) {
        const limit = this.#PAGE_SIZE
        const pageNumber = Math.max(1, Number(page) || 1)
        const offset = Math.max(0, (pageNumber - 1) * limit)
        const filters = { category, branch, lowStock, outStock };
        return await this.stockModel.findAll({ search, filters, offset, limit })
    }

    /**
     * 
     * Busca productos con soporte para filtros, búsqueda y paginación.
     * * @param {object} params - Objeto de parámetros.
     * @param {string|null} [params.search] - Texto para buscar por nombre o código de barras.
     * @param {object} [params.filters] - Filtros específicos (category, branch, lowStock, outStock).
     * @param {number|null} [params.offset] - Desplazamiento para paginación (SQL OFFSET).
     * @returns {Promise<ProductCatalogDTO[]>} Retorna una lista de DTOs de productos.
     * @throws {ValidationError} Si se proporcionan filtros inválidos.
     */
    async findCatalog({ page = 1, search, category, branch, lowStock, outStock, }) {
        const limit = this.#PAGE_SIZE
        const pageNumber = Math.max(1, Number(page) || 1)
        const offset = Math.max(0, (pageNumber - 1) * limit)
        const filters = { category, branch, lowStock, outStock };
        return await this.stockModel.findCatalog({ search, filters, offset, limit })
    }

    /**
     * Busca un registro de stock específico por su ID.
     * * @param {number} id - ID del registro de stock.
     * @returns {Promise<Object>} Datos detallados del stock.
     * @throws {NotFoundError} Si no se encuentra el registro.
     */
    async findById(id) {
        const stock = await this.stockModel.findById(id)
        if (!stock) throw new NotFoundError('stock no encontrado')
        return stock
    }

    /**
 * Cuenta cuántos productos tienen stock bajo (menor o igual al mínimo).
 * * @param {number} [branch_id] - ID opcional de sucursal para filtrar el conteo.
 * @returns {Promise<Object>} Objeto con el conteo { count: number }.
 */
    async lowStock(branch_id) {
        return await this.stockModel.lowStock(branch_id)
    }

    /**
     * Cuenta cuántos productos están agotados (cantidad 0).
     * * @param {number} [branch_id] - ID opcional de sucursal para filtrar el conteo.
     * @returns {Promise<Object>} Objeto con el conteo { count: number }.
     */
    async outStock(branch_id) {
        return await this.stockModel.outStock(branch_id)
    }

    /**
     * Actualiza la cantidad o el stock mínimo de un registro existente.
     * * @param {number} id - ID del registro de stock (tabla intermedia).
     * @param {Object} data - Datos a actualizar.
     * @param {number} [data.quantity] - Nueva cantidad.
     * @param {number} [data.min_quantity] - Nuevo mínimo.
     * @returns {Promise<boolean>} True si la actualización fue exitosa.
     * @throws {NotFoundError} Si el registro de stock no existe.
     */
    async update(id, data) {
        const validate = await this.stockModel.exists(id)
        if (!validate) throw new NotFoundError('El registro con este id no existe')

        const stockToUpdate = {
            ...data
        }

        return await this.stockModel.update(id, stockToUpdate)
    }


    /**
     * Elimina (física o lógicamente) un registro de stock.
     * * @param {number} id - ID del registro a eliminar.
     * @returns {Promise<boolean>} True si se eliminó correctamente.
     * @throws {NotFoundError} Si el ID no corresponde a un registro existente.
     */
    async delete(id) {
        const validate = await this.stockModel.exists(id)
        if (!validate) throw new NotFoundError('El registro de stock con este id no existe')

        return await this.stockModel.delete(id)
    }
}