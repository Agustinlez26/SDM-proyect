import { validateId, validateParams, validatePartialProduct, validateProduct } from '../schemas/product_schema.js'

/**
 * Controlador para la gestión de Productos.
 * Actúa como intermediario entre las peticiones HTTP y la lógica de negocio (Servicio).
 * Se encarga de validar entradas, gestionar códigos de estado HTTP y formatear respuestas.
 */
export class ProductController {
    /**
         * @param {import('../services/ProductService').ProductService} productService 
         */
    constructor(productService) {
        this.productService = productService
    }

    /**
     * Obtiene el listado de productos con soporte para paginación y filtros.
     * @param {import('express').Request} req - Objeto de petición HTTP (query params: page, limit, search, etc).
     * @param {import('express').Response} res - Objeto de respuesta HTTP.
     */
    async getAll(req, res) {
        const result = validateParams(req.query)
        if (!result.success) {
            return res.status(400).json({
                status: 'error',
                message: 'Parametros invalidos',
                errors: result.error.errors
            })
        }

        try {
            const products = await this.productService.getAll(result.data)
            res.json({ status: 'succes', data: products })
        } catch (error) {
            this.#handleError(res, error)
        }
    }

    /**
     * Obtiene un producto específico por su ID.
     * @param {import('express').Request} req - Petición con el ID en params.
     * @param {import('express').Response} res - Respuesta HTTP.
     */
    async getById(req, res) {
        const result = validateId(req.params.id)
        if (!result.success) return res.status(400).json({ status: 'error', message: 'ID invalido' })

        try {
            const product = await this.productService.getById(result.data)
            res.json({ status: 'succes', data: product })
        } catch (error) {
            this.#handleError(res, error)
            return res.status(500).json({ message: error.message })
        }
    }

    /**
     * Catálogo público optimizado (búsqueda ligera).
     * @param {import('express').Request} req 
     * @param {import('express').Response} res 
     */
    async getPublicCatalog(req, res) {
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
            this.#handleError(res, error)
        }
    }

    /**
     * Crea un nuevo producto. Requiere imagen obligatoria.
     * @param {import('express').Request} req - Body con datos y File con la imagen.
     * @param {import('express').Response} res 
     */
    async create(req, res) {
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
            this.#handleError(res, error)
        }
    }

    /**
     * Actualiza un producto existente.
     * @param {import('express').Request} req 
     * @param {import('express').Response} res 
     */
    async update(req, res) {
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
            this.#handleError(res, error)
        }
    }

    /**
     * Realiza un borrado lógico (Soft Delete).
     * @param {import('express').Request} req 
     * @param {import('express').Response} res 
     */
    async delete(req, res) {
        const idResult = validateId(req.params.id)
        if (!idResult) {
            return res.status(400).json({
                status: 'error',
                message: 'el ID es invalido'
            })
        }

        try {
            const deleted = await this.productService.delete(idResult)
            if (!deleted) return res.status(404).json({
                status: 'error',
                message: 'No se pudo eliminar el producto de la base de datos'
            })

            res.status(200).json({
                status: 'success',
                message: 'Producto eliminado correctamente'
            })
        } catch (error) {
            this.#handleError(res, error)
        }
    }

    /**
     * Reactiva un producto eliminado.
     * @param {import('express').Request} req 
     * @param {import('express').Response} res 
     */
    async activate(req, res) {
        const idResult = validateId(req.params.id)
        if (!idResult) {
            return res.status(400).json({
                status: 'error',
                message: 'el ID es invalido'
            })
        }

        try {
            const activate = await this.productService.activate(idResult)
            if (!activate) return res.status(404).json({
                status: 'error',
                message: 'No se pudo activar el producto en la base de datos'
            })

            res.status(200).json({
                status: 'success',
                message: 'Producto eliminado correctamente'
            })
        } catch (error) {
            this.#handleError(res, error)
        }
    }

    /**
     * Manejador centralizado de errores.
     * Discrimina entre errores operacionales (4xx) y errores de sistema (500).
     * @private
     * @param {import('express').Response} res 
     * @param {Error} error 
     */
    #handleError(res, error) {
        if (error.statusCode) {
            return res.status(error.statusCode).json({
                status: 'error',
                message: error.message
            })
        }

        console.error("[Critical Error]:", error)

        res.status(500).json({
            status: 'error',
            message: 'Error interno del servidor'
        })
    }
}