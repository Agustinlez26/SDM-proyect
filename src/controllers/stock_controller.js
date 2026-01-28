import { validateParams, validateStock, validateUpdateStock } from '../schemas/stock_schema.js'
import { validateId } from '../schemas/shared_schema.js'
import { handleError } from '../utils/error_handler.js'

/**
 * Controlador para la gestión de Inventario (Stock).
 * Maneja las peticiones HTTP relacionadas con la asignación, consulta y actualización de stock en sucursales.
 */
export class StockController {

    /**
     * Inicializa el controlador con sus dependencias.
     * @param {Object} dependencies
     * @param {import('../services/stock_service.js').StockService} dependencies.stockService - Servicio de lógica de negocio de stock.
     */
    constructor({ stockService }) {
        this.stockService = stockService
    }

    /**
     * Crea un nuevo registro de stock (Asigna un producto a una sucursal).
     * @param {import('express').Request} req - Petición HTTP con los datos en el body.
     * @param {import('express').Response} res - Respuesta HTTP.
     * @returns {Promise<void>} Retorna 201 si se crea, o 400/500 en caso de error.
     */
    create = async (req, res) => {
        const result = validateStock(req.body)
        if (!result.success) {
            return res.status(400).json({
                status: 'error',
                message: 'Datos invalidos',
                errors: result.error.errors
            })
        }

        try {
            const newStockId = await this.stockService.create(result.data)
            const newStock = await this.stockService.getById(newStockId)
            res.status(201).json({
                status: 'success',
                message: 'Stock creado exitosamente',
                data: { newStock }
            })
        } catch (error) {
            handleError(res, error)
        }
    }

    /**
     * Obtiene el listado de stock con filtros y paginación.
     * @param {import('express').Request} req - Petición con query params (page, search, branch, etc).
     * @param {import('express').Response} res - Respuesta con la lista de datos.
     */
    getAll = async (req, res) => {
        const result = validateParams(req.query)
        if (!result.success) {
            return res.status(400).json({
                status: 'error',
                message: 'Parametros invalidos',
                errors: result.error.errors
            })
        }

        try {
            const stocks = await this.stockService.findAll(result.data)
            res.json({ status: 'success', data: stocks })
        } catch (error) {
            handleError(res, error)
        }
    }

    /**
     * Obtiene un registro de stock específico por su ID.
     * @param {import('express').Request} req - Petición con el ID en params.
     * @param {import('express').Response} res - Respuesta con el objeto stock.
     */
    getById = async (req, res) => {
        const result = validateId(req.params.id)
        if (!result.success) return res.status(400).json({
            status: 'error',
            message: 'ID invalido'
        })

        try {
            const stock = await this.stockService.getById(result.data)
            res.json({ status: 'success', data: stock })
        } catch (error) {
            handleError(res, error)
        }
    }

    /**
     * Obtiene la cantidad de productos con stock bajo (<= mínimo).
     * Permite filtrar por sucursal opcionalmente.
     * @param {import('express').Request} req - Query param opcional `branch_id`.
     * @param {import('express').Response} res - Respuesta con el conteo.
     */
    getLowStockCount = async (req, res) => {
        let branch_id = null

        if (req.query.branch_id) {
            const result = validateId(req.query.branch_id)
            if (!result.success) {
                return res.status(400).json({
                    status: 'error',
                    message: 'ID de sucursal invalido'
                })
            }

            branch_id = result.data
        }

        try {
            const count = await this.stockService.lowStock(branch_id)
            res.json({ status: 'success', data: count })
        } catch (error) {
            handleError(res, error)
        }
    }

    /**
     * Obtiene la cantidad de productos agotados (stock = 0).
     * Permite filtrar por sucursal opcionalmente.
     * @param {import('express').Request} req - Query param opcional `branch_id`.
     * @param {import('express').Response} res - Respuesta con el conteo.
     */
    getOutStockCount = async (req, res) => {
        let branch_id = null

        if (req.query.branch_id) {
            const result = validateId(req.query.branch_id)
            if (!result.success) {
                return res.status(400).json({
                    status: 'error',
                    message: 'ID de sucursal invalido'
                })
            }

            branch_id = result.data
        }

        try {
            const count = await this.stockService.outStock(branch_id)
            res.json({ status: 'success', data: count })
        } catch (error) {
            handleError(res, error)
        }
    }

    /**
     * Actualiza la cantidad o el stock mínimo de un registro.
     * @param {import('express').Request} req - Params con ID y Body con datos a actualizar.
     * @param {import('express').Response} res - Respuesta con mensaje de éxito.
     */
    update = async (req, res) => {
        const idResult = validateId(req.params.id)
        if (!idResult.success) {
            return res.status(400).json({
                status: 'error',
                message: 'El ID es invalido'
            })
        }
        const updateResult = validateUpdateStock(req.body)
        if (!updateResult.success) {
            return res.status(400).json({
                status: 'error',
                message: 'Datos invalidos',
                errors: updateResult.error.errors
            })
        }

        try {
            const updated = await this.stockService.update(
                idResult.data,
                updateResult.data
            )

            if (!updated) {
                return res.status(404).json({ message: 'No se pudo actualizar' })
            }

            res.json({ status: 'success', message: 'Stock actualizado correctamente' })
        } catch (error) {
            handleError(res, error)
        }
    }

    /**
     * Elimina un registro de stock.
     * @param {import('express').Request} req - Params con ID.
     * @param {import('express').Response} res - Respuesta con mensaje de éxito.
     */
    delete = async (req, res) => {
        const idResult = validateId(req.params.id)
        if (!idResult.success) {
            return res.status(400).json({
                status: 'error',
                message: 'El ID es invalido'
            })
        }

        try {
            const deleted = await this.stockService.delete(idResult.data)

            if (!deleted) {
                return res.status(404).json({ message: 'No se pudo eliminar' })
            }

            res.json({ status: 'success', message: 'Stock eliminado correctamente' })

        } catch (error) {
            handleError(res, error)
        }
    }

}