import { processProductImage, deleteProductImage } from '../utils/image-processor.js'
import { ValidationError, NotFoundError } from '../utils/errors.js'
import { buildSkuBase, normalizeSku, withSkuSuffix } from '../utils/sku-utils.js'

export class ProductService {
    #PAGE_SIZE = 20
    /**
     * @param {ProductModel} productModelInstance - Instancia del modelo de productos (Inyección de Dependencias).
     */
    constructor({ productModel }) {
        this.productModel = productModel
    }

    /**
     * Crea un nuevo producto procesando su imagen.
     * @param {object} data - Datos del producto (ya validados).
     * @param {object} file - Archivo de imagen (req.file).
     * @returns {Promise<number>} ID del producto creado.
     */
    async create(file, data) {
        const validateName = await this.productModel.findByName(data.name)
        if (validateName) throw new ValidationError('Un producto ya existe con este nombre')

        let sku
        try {
            sku = await this.#generateUniqueSku(data.name)
        } catch (error) {
            throw new ValidationError(error.message)
        }

        const channels = await this.#validateSalesChannels(data.is_sellable, data.channels)
        let imagesPaths = await processProductImage(file.buffer, data.name)

        const producToSave = {
            ...data,
            channels,
            cod_bar: sku,
            ...imagesPaths,
            is_active: true
        }

        const productId = await this.productModel.create(producToSave)
        await this.productModel.saveOperationalConfig(productId, producToSave)
        return productId
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

        if (data.name && data.name !== currentProduct.name) {
            const existsName = await this.productModel.findByName(data.name, id)
            if (existsName) throw new ValidationError('Un producto ya existe con este nombre')
        }

        let skuToUpdate
        if (data.sku) {
            try {
                skuToUpdate = normalizeSku(data.sku)
            } catch (error) {
                throw new ValidationError(error.message)
            }

            if (skuToUpdate !== currentProduct.sku) {
                const existsSku = await this.productModel.findBySku(skuToUpdate, id)
                if (existsSku) throw new ValidationError('Ya existe un producto con este SKU')
            }
        }

        const isSellable = data.is_sellable ?? currentProduct.is_sellable
        const channels = await this.#validateSalesChannels(
            isSellable,
            data.channels ?? currentProduct.channels
        )

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
            is_sellable: isSellable,
            ...imgPaths
        }

        delete productToUpdate.sku
        if (skuToUpdate) productToUpdate.cod_bar = skuToUpdate

        // Preservar is_active si no se envía explícitamente
        if (productToUpdate.is_active === undefined) {
            productToUpdate.is_active = currentProduct.is_active
        }

        const updated = await this.productModel.update(id, productToUpdate)
        const operationalData = {
            is_manufacturable: data.is_manufacturable ?? currentProduct.is_manufacturable,
            is_customizable: data.is_customizable ?? currentProduct.is_customizable,
            channels,
            personalization_methods: data.personalization_methods ?? currentProduct.personalization_methods,
            recipe: data.recipe ?? currentProduct.recipe
        }
        await this.productModel.saveOperationalConfig(id, operationalData)
        return updated || true
    }

    async #validateSalesChannels(isSellable, channelIds) {
        if (!isSellable) return []

        const selectedIds = [...new Set((channelIds || []).map(Number))]
        if (selectedIds.length === 0) {
            throw new ValidationError('Un producto vendible debe tener al menos un canal de venta')
        }

        const activeIds = await this.productModel.findActiveSalesChannelIds(selectedIds)
        if (activeIds.length !== selectedIds.length) {
            throw new ValidationError('Uno o más canales de venta no existen o están deshabilitados')
        }
        return selectedIds
    }

    async #generateUniqueSku(productName) {
        const baseSku = buildSkuBase(productName)
        let candidate = baseSku
        let sequence = 2

        while (await this.productModel.findBySku(candidate)) {
            candidate = withSkuSuffix(baseSku, sequence)
            sequence += 1
        }

        return candidate
    }

    /**
     * Obtiene una lista paginada y filtrada de productos.
     * @param {object} params - { search, filters, offset }
     */
    async findAll({ page = 1, search, category, state }) {
        const limit = this.#PAGE_SIZE
        const pageNumber = Math.max(1, Number(page) || 1)
        const offset = Math.max(0, (pageNumber - 1) * limit)
        const filters = { category, state }
        return await this.productModel.findAll({ search, filters, offset, limit })
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
        if (!activated) throw new NotFoundError('Producto no encontrado para activar')
        return true
    }

    /**
     * Búsqueda optimizada para catálogo público.
     * @param {string} search 
     */
    async searchCatalog(search) {
        return await this.productModel.searchCatalog(search)
    }

    async getOperationalCatalogs() {
        return await this.productModel.getOperationalCatalogs()
    }

    /**
 * catálogo de categorias.
 */
    async findCategories() {
        return await this.productModel.findCategories()
    }

    /**
 * Crea una nueva categoría.
 * @param {string} name - Nombre de la categoría.
 *  
 * @return {Promise<number>} ID de la categoría creada.
 * @throws {ValidationError} Si el nombre ya existe o es inválido.
 */
    async createCategory(name) {
        const existingCategories = await this.productModel.findCategories()
        if (existingCategories.some(cat => cat.name.toLowerCase() === name.toLowerCase())) {
            throw new ValidationError('Ya existe una categoría con este nombre')
        }
        return await this.productModel.createCategory(name.trim())
    }

    /**
 * Elimina (desactiva) una categoría por ID.
 * @param {number} id - ID de la categoría a eliminar.
 * @return {Promise<boolean>} True si se eliminó, error si no se encuentra.
 * @throws {NotFoundError} Si la categoría no existe.
 */

    async deleteCategory(id) {
        const deleted = await this.productModel.deleteCategory(id)
        if (!deleted) throw new NotFoundError('Categoría no encontrada para eliminar')
        return true
    }
}
