import { validateId, validateParams, validatePartialProduct, validateProduct } from '../schemas/product_schema.js'
import { handleError } from '../utils/error_handler.js'
/**
 * Controlador para la gestión de Productos.
 * Actúa como intermediario entre las peticiones HTTP y la lógica de negocio (Servicio).
 * Se encarga de validar entradas, gestionar códigos de estado HTTP y formatear respuestas.
 */
export class ProductController {
    /**
         * @param {Object} dependencies
         * @param {import('../services/product_service.js').ProductService} dependencies.productService
         */
    constructor({ productService }) {
        this.productService = productService
    }

    /**
     * Crea un nuevo producto. Requiere imagen obligatoria.
     * @param {import('express').Request} req - Body con datos y File con la imagen.
     * @param {import('express').Response} res 
     */
    create = async (req, res) => {
        if (!req.file) {
            return res.status(400).json({
                status: 'error',
                message: 'La imagen del producto es obligatoria'
            })
        }

        const result = validateProduct(req.body)
        if (!result.success) {
            return res.status(400).
                json({
                    status: 'error',
                    message: 'Datos invalidos',
                    errors: result.error.errors
                })
        }

        try {
            const idProductCreated = await this.productService.create(req.file, result.data)
            const newProduct = await this.productService.findById(idProductCreated)

            return res.status(201).json({
                status: 'success',
                message: 'Producto creado correctamente',
                data: newProduct
            })
        } catch (error) {
            handleError(res, error)
        }
    }

    /**
     * Obtiene el listado de productos con soporte para paginación y filtros.
     * @param {import('express').Request} req - Objeto de petición HTTP (query params: page, limit, search, etc).
     * @param {import('express').Response} res - Objeto de respuesta HTTP.
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
            const products = await this.productService.findAll(result.data)
            res.json({ status: 'success', data: products })
        } catch (error) {
            handleError(res, error)
        }
    }

    /**
     * Obtiene un producto específico por su ID.
     * @param {import('express').Request} req - Petición con el ID en params.
     * @param {import('express').Response} res - Respuesta HTTP.
     */
    getById = async (req, res) => {
        const result = validateId(req.params.id)
        if (!result.success) return res.status(400).json({ status: 'error', message: 'ID invalido' })

        try {
            const product = await this.productService.findById(result.data)
            res.json({ status: 'success', data: product })
        } catch (error) {
            handleError(res, error)
        }
    }

    /**
     * Catálogo público optimizado (búsqueda ligera).
     * @param {import('express').Request} req 
     * @param {import('express').Response} res 
     */
    getPublicCatalog = async (req, res) => {
        const result = validateParams(req.query)
        if (!result.success) {
            return res.status(400).json({
                status: 'error',
                message: 'Parametros invalidos',
                errors: result.error.errors
            })
        }

        try {
            const catalog = await this.productService.searchCatalog(result.data?.search)
            return res.json({ status: 'success', data: catalog })
        } catch (error) {
            handleError(res, error)
        }
    }

    /**
     * Actualiza un producto existente.
     * @param {import('express').Request} req 
     * @param {import('express').Response} res 
     */
    update = async (req, res) => {
        const idResult = validateId(req.params.id)
        if (!idResult.success) {
            return res.status(400).json({
                status: 'error',
                message: 'el ID es invalido'
            })
        }

        const result = validatePartialProduct(req.body)
        if (!result.success) {
            return res.status(400).json({
                status: 'error',
                message: 'Datos invalidos',
                errors: result.error.errors
            })
        }

        try {
            const updated = await this.productService.update(
                idResult.data,
                result.data,
                req.file
            )

            if (!updated) {
                return res.status(404).json({ message: 'No se pudo actualizar' })
            }

            res.json({ status: 'success', message: 'Producto actualizado correctamente' })
        } catch (error) {
            handleError(res, error)
        }
    }

    /**
     * Realiza un borrado lógico (Soft Delete).
     * @param {import('express').Request} req 
     * @param {import('express').Response} res 
     */
    delete = async (req, res) => {
        const idResult = validateId(req.params.id)
        if (!idResult.success) {
            return res.status(400).json({
                status: 'error',
                message: 'el ID es invalido'
            })
        }

        try {
            const deleted = await this.productService.delete(idResult.data)
            if (!deleted) return res.status(404).json({
                status: 'error',
                message: 'No se pudo eliminar el producto de la base de datos'
            })

            res.status(200).json({
                status: 'success',
                message: 'Producto eliminado correctamente'
            })
        } catch (error) {
            handleError(res, error)
        }
    }

    /**
     * Reactiva un producto eliminado.
     * @param {import('express').Request} req 
     * @param {import('express').Response} res 
     */
    activate = async (req, res) => {
        const idResult = validateId(req.params.id)
        if (!idResult.success) {
            return res.status(400).json({
                status: 'error',
                message: 'el ID es invalido'
            })
        }

        try {
            const activate = await this.productService.activate(idResult.data)
            if (!activate) return res.status(404).json({
                status: 'error',
                message: 'No se pudo activar el producto en la base de datos'
            })

            res.status(200).json({
                status: 'success',
                message: 'Producto activado correctamente'
            })
        } catch (error) {
            handleError(res, error)
        }
    }

}