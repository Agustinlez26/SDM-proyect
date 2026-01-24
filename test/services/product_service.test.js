import { jest } from '@jest/globals';

// 1. MOCKING ESM (Debe ir antes de los imports)
// Usamos unstable_mockModule que es la forma nativa de Jest para ESM
jest.unstable_mockModule('../../src/utils/image_processor.js', () => ({
    processProductImage: jest.fn(),
    deleteProductImage: jest.fn()
}));

// 2. IMPORTS DINÁMICOS (Top-Level Await)
// Importamos los módulos DESPUÉS de definir el mock para que Jest pueda interceptarlos
const { ProductService } = await import('../../src/services/product_service.js');
const { processProductImage, deleteProductImage } = await import('../../src/utils/image_processor.js');
const { NotFoundError } = await import('../../src/utils/errors.js');

describe('ProductService', () => {
    let productService;
    let mockProductModel;

    beforeEach(() => {
        jest.clearAllMocks();

        mockProductModel = {
            create: jest.fn(),
            update: jest.fn(),
            findAll: jest.fn(),
            findById: jest.fn(),
            updateStatus: jest.fn(),
            searchCatalog: jest.fn()
        };

        productService = new ProductService(mockProductModel);
    });

    describe('create', () => {
        it('debe procesar la imagen y guardar el producto', async () => {
            const mockData = { name: 'Mate', price: 100 };
            const mockFile = { buffer: Buffer.from('fake-image') };
            const mockImagePaths = { url_img_original: 'path/orig', url_img_small: 'path/small' };
            const expectedId = 1;

            // Configuramos los mocks
            processProductImage.mockResolvedValue(mockImagePaths);
            mockProductModel.create.mockResolvedValue(expectedId);

            // Ejecutamos
            const result = await productService.create(mockData, mockFile);

            // Verificamos
            expect(processProductImage).toHaveBeenCalledWith(mockFile.buffer, mockData.name);
            expect(mockProductModel.create).toHaveBeenCalledWith({
                ...mockData,
                ...mockImagePaths,
                is_active: true
            });
            expect(result).toBe(expectedId);
        });
    });

    describe('update', () => {
        const mockId = 1;
        const currentProduct = {
            id: 1,
            name: 'Viejo',
            url_img_original: 'old/orig',
            url_img_small: 'old/small'
        };

        it('debe lanzar NotFoundError si el producto no existe', async () => {
            mockProductModel.findById.mockResolvedValue(null);

            await expect(productService.update(mockId, {}, null))
                .rejects
                .toThrow(NotFoundError);
        });

        it('debe actualizar datos sin cambiar imágenes si no se envía archivo', async () => {
            mockProductModel.findById.mockResolvedValue(currentProduct);
            mockProductModel.update.mockResolvedValue(true);

            const updateData = { name: 'Nuevo Nombre' };

            await productService.update(mockId, updateData, undefined);

            expect(deleteProductImage).not.toHaveBeenCalled();
            expect(processProductImage).not.toHaveBeenCalled();

            expect(mockProductModel.update).toHaveBeenCalledWith(mockId, {
                ...updateData,
                url_img_original: currentProduct.url_img_original,
                url_img_small: currentProduct.url_img_small
            });
        });

        it('debe borrar imágenes viejas y crear nuevas si se envía archivo', async () => {
            mockProductModel.findById.mockResolvedValue(currentProduct);
            mockProductModel.update.mockResolvedValue(true);

            const newPaths = { url_img_original: 'new/orig', url_img_small: 'new/small' };
            processProductImage.mockResolvedValue(newPaths);

            const mockFile = { buffer: Buffer.from('new-img') };
            const updateData = { name: 'Mate Nuevo' };

            await productService.update(mockId, updateData, mockFile);

            expect(deleteProductImage).toHaveBeenCalledWith(currentProduct.url_img_original, currentProduct.url_img_small);
            expect(processProductImage).toHaveBeenCalledWith(mockFile.buffer, updateData.name);
            expect(mockProductModel.update).toHaveBeenCalledWith(mockId, {
                ...updateData,
                ...newPaths
            });
        });
    });

    describe('delete', () => {
        it('debe retornar true si el modelo actualiza el estado', async () => {
            mockProductModel.updateStatus.mockResolvedValue(true);
            const result = await productService.delete(1);
            expect(result).toBe(true);
        });

        it('debe lanzar NotFoundError si el modelo devuelve false', async () => {
            mockProductModel.updateStatus.mockResolvedValue(false);
            await expect(productService.delete(999)).rejects.toThrow(NotFoundError);
        });
    });

    describe('findById', () => {
        it('debe devolver el producto si existe', async () => {
            const mockProduct = { id: 1, name: 'Test' };
            mockProductModel.findById.mockResolvedValue(mockProduct);
            const result = await productService.findById(1);
            expect(result).toEqual(mockProduct);
        });

        it('debe lanzar NotFoundError si no existe', async () => {
            mockProductModel.findById.mockResolvedValue(null);
            await expect(productService.findById(999)).rejects.toThrow(NotFoundError);
        });
    });
});