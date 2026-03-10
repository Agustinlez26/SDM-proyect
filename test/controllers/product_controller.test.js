import { jest } from '@jest/globals';

// -------------------------------------------------------------------------
// 1. MOCKS (Hoisted)
// -------------------------------------------------------------------------

// Mock de Errores
jest.unstable_mockModule('../../src/utils/errors.js', () => ({
    NotFoundError: class NotFoundError extends Error {
        constructor(message) {
            super(message);
            this.name = 'NotFoundError';
            this.statusCode = 404;
        }
    },
    ValidationError: class ValidationError extends Error {
        constructor(message) {
            super(message);
            this.name = 'ValidationError';
            this.statusCode = 400;
        }
    }
}));

// Mock de Product Schemas
jest.unstable_mockModule('../../src/schemas/product_schema.js', () => ({
    validateParams: jest.fn(),
    validateProduct: jest.fn(),
    validatePartialProduct: jest.fn()
}));

// Mock de Shared Schemas (AQUÍ ESTABA EL PROBLEMA DEL ID)
jest.unstable_mockModule('../../src/schemas/shared_schema.js', () => ({
    validateId: jest.fn()
}));

// -------------------------------------------------------------------------
// 2. IMPORTS
// -------------------------------------------------------------------------

const { ProductController } = await import('../../src/controllers/product_controller.js');
const { NotFoundError } = await import('../../src/utils/errors.js');
const { validateParams, validateProduct, validatePartialProduct } = await import('../../src/schemas/product_schema.js');
const { validateId } = await import('../../src/schemas/shared_schema.js'); // Importamos del shared

// -------------------------------------------------------------------------
// 3. TESTS
// -------------------------------------------------------------------------

describe('ProductController', () => {
    let productController;
    let mockProductService;
    let req;
    let res;

    beforeEach(() => {
        jest.clearAllMocks();

        // A. Mock del Servicio
        mockProductService = {
            findAll: jest.fn(),
            getById: jest.fn(),
            create: jest.fn(),
            update: jest.fn(),
            delete: jest.fn(),
            activate: jest.fn(),
            findById: jest.fn(),
            searchCatalog: jest.fn()
        };

        // B. Request y Response
        req = {
            params: {},
            query: {},
            body: {},
            file: undefined
        };

        res = {
            status: jest.fn().mockReturnThis(),
            json: jest.fn()
        };

        // C. Configuración Happy Path
        validateId.mockReturnValue({ success: true, data: 100 });
        validateParams.mockReturnValue({ success: true, data: {} });
        validateProduct.mockReturnValue({ success: true, data: {} });
        validatePartialProduct.mockReturnValue({ success: true, data: {} });

        // D. Instanciar Controlador
        // CORRECCIÓN CRÍTICA: Pasamos el servicio DIRECTAMENTE, sin llaves {}
        productController = new ProductController({ productService: mockProductService });
    });

    // --- TEST: GET ALL ---
    describe('getAll', () => {
        it('debe responder 200 y devolver productos', async () => {
            const mockProducts = [{ id: 1, name: 'Mate' }];
            mockProductService.findAll.mockResolvedValue(mockProducts);

            await productController.getAll(req, res);

            expect(mockProductService.findAll).toHaveBeenCalled();
            expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ data: mockProducts }));
        });
    });

    // --- TEST: CREATE ---
    describe('create', () => {
        it('debe responder 201 y crear el producto', async () => {
            req.file = { buffer: 'fake' };
            req.body = { name: 'Termo' };

            validateProduct.mockReturnValue({ success: true, data: req.body });
            mockProductService.create.mockResolvedValue(45);
            mockProductService.findById.mockResolvedValue({ id: 45, name: 'Termo' });

            await productController.create(req, res);

            expect(res.status).toHaveBeenCalledWith(201);
            expect(mockProductService.create).toHaveBeenCalled();
        });
    });

    // --- TEST: GET BY ID ---
    describe('getById', () => {
        it('debe responder 404 si el servicio no encuentra el ID', async () => {
            req.params.id = '999';
            validateId.mockReturnValue({ success: true, data: 999 });

            // Simulamos el error
            mockProductService.findById.mockRejectedValue(new NotFoundError('No encontrado'));

            await productController.getById(req, res);

            // Verificamos solo el status (y opcionalmente el mensaje de error)
            expect(res.status).toHaveBeenCalledWith(404);
            // NO verificamos mockProd aquí porque no existe en caso de error
        });

        it('debe responder 200 si existe', async () => {
            req.params.id = '50';
            validateId.mockReturnValue({ success: true, data: 50 });

            // Definimos mockProd AQUÍ dentro
            const mockProd = { id: 50, name: 'Bombilla' };
            mockProductService.findById.mockResolvedValue(mockProd);

            await productController.getById(req, res);

            // CORRECCIÓN: Esperamos la estructura exacta que devuelve tu controller
            expect(res.json).toHaveBeenCalledWith({
                status: 'success',
                data: mockProd
            });
        });


        it('debe responder 200 si existe', async () => {
            req.params.id = '50';
            validateId.mockReturnValue({ success: true, data: 50 });

            const mockProd = { id: 50, name: 'Bombilla' };
            mockProductService.findById.mockResolvedValue(mockProd);

            await productController.getById(req, res);

            expect(res.json).toHaveBeenCalledWith({
                status: 'success',
                data: mockProd
            });
        });
    });

    // --- TEST: UPDATE ---
    describe('update', () => {
        it('debe responder 400 si el ID es inválido', async () => {
            req.params.id = 'abc';
            validateId.mockReturnValue({
                success: false,
                error: { errors: ['Debe ser número'] }
            });

            await productController.update(req, res);

            expect(res.status).toHaveBeenCalledWith(400);
        });

        it('debe responder 404 si el servicio devuelve false', async () => {
            req.params.id = '50';
            validateId.mockReturnValue({ success: true, data: 50 });
            mockProductService.update.mockResolvedValue(false);

            await productController.update(req, res);

            expect(res.status).toHaveBeenCalledWith(404);
        });

        it('debe responder 200 si se actualiza', async () => {
            req.params.id = '50';
            validateId.mockReturnValue({ success: true, data: 50 });
            mockProductService.update.mockResolvedValue(true);

            await productController.update(req, res);

            expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ message: expect.stringContaining('actualizado') }));
        });
    });
});