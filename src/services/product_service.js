import { processProductImage, deleteProductImage } from '../utils/imageProcessor.js'
import { ProductModel } from '../models/product.js'
import { ValidationError, NotFoundError } from '../utils/errors.js'

/**
 * @param {ProductModel} productModelInstance - Instancia del modelo de productos (Inyección de Dependencias).
 */
export class ProductService {
    constructor(ProductModel) {
        this.productModel = ProductModel
    }

    /**
     * Crea un nuevo producto procesando su imagen.
     * @param {object} data - Datos del producto (ya validados).
     * @param {object} file - Archivo de imagen (req.file).
     * @returns {Promise<number>} ID del producto creado.
     */
    async create(data, file) {
        let imagesPaths = await processProductImage(file.buffer, data.name)

        const producToSave = {
            ...data,
            ...imagesPaths,
            is_active: data.is_active ?? true
        }

        return await this.productModel.create(producToSave)
    }

    /**
     * Actualiza un producto existente y gestiona el reemplazo de imágenes.
     * @param {number} id - ID del producto.
     * @param {object} data - Datos parciales a actualizar.
     * @param {object|undefined} file - Nueva imagen (opcional).
     * @returns {Promise<boolean>} True si se actualizó, error si no se encuentra.
     */
    async update(id, data, file) {
        const currentProduct = await this.productModel.findById(id)
        if (!currentProduct) throw new NotFoundError('Producto no encontrado')

        let imgPaths = {
            url_img_original: currentProduct.url_img_original,
            url_img_small: currentProduct.url_img_small
        }

        if (file) {
            await deleteProductImage(currentProduct.url_img_original, currentProduct.url_img_small)
            const newName = data.name || currentProduct.name
            imgPaths = await processProductImage(file.buffer, newName)
        }

        const productToUpdate = {
            ...data,
            ...imgPaths
        }

        return await this.productModel.update(id, productToUpdate)
    }

    /**
     * Obtiene una lista paginada y filtrada de productos.
     * @param {object} params - { search, filters, offset }
     */
    async findAll({ search, filters, offset }) {
        return await this.productModel.findAll({ search, filters, offset })
    }

    /**
     * Busca un producto por ID.
     * @param {number} id 
     * @throws {Error} Si el producto no existe.
     */
    async findById(id) {
        const product = await this.productModel.findById(id)
        if (!product) throw new NotFoundError('Producto no encontrado')
        return product
    }

    /**
     * Realiza un borrado lógico (Desactivar).
     * @param {number} id 
     */
    async delete(id) {
        const deleted = await this.productModel.updateStatus(id, false)
        if (!deleted) throw new NotFoundError('Producto no encontrado para eliminar')
        return true
    }

    /**
     * Reactiva un producto eliminado.
     * @param {number} id 
     */
    async activate(id) {
        const activated = await this.productModel.updateStatus(id, true)
        if(!activated) throw new NotFoundError('Producto no encontrado para activar')
        return true
    }

    /**
     * Búsqueda optimizada para catálogo público.
     * @param {string} search 
     */
    async searchCatalog(search) {
        return await this.productModel.searchCatalog(search)
    }
}