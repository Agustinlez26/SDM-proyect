import { jest } from '@jest/globals';
const { NotFoundError } = await import('../../src/utils/errors.js');

jest.unstable_mockModule('../../src/schemas/product_schema.js', () => ({
    validateId: jest.fn(),
    validateParams: jest.fn(),
    validateProduct: jest.fn(),
    validatePartialProduct: jest.fn()
}));

jest.unstable_mockModule('../../src/schemas/shared_schema.js', () => ({
    validateId: jest.fn() // Agregamos esto por si lo moviste a shared_schema
}));

// 2. IMPORTS DINÁMICOS
const { ProductController } = await import('../../src/controllers/product_controller.js');
const { validateId, validateParams, validateProduct, validatePartialProduct } = await import('../../src/schemas/product_schema.js');

describe('ProductController', () => {
    let productController;
    let mockProductService;
    let req;
    let res;

    beforeEach(() => {
        jest.clearAllMocks();

        // A. Mock del Servicio
        mockProductService = {
            findAll: jest.fn(), // CORRECCIÓN: Tu servicio usa findAll, no getAll
            getById: jest.fn(),
            create: jest.fn(),
            update: jest.fn(),
            delete: jest.fn(),
            activate: jest.fn(),
            findById: jest.fn(),
            searchCatalog: jest.fn()
        };

        // B. Mock de Request y Response
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

        // C. Valores por defecto de los Mocks (Happy Path)
        validateId.mockReturnValue({ success: true, data: 1 });
        validateParams.mockReturnValue({ success: true, data: {} });
        validateProduct.mockReturnValue({ success: true, data: {} });
        validatePartialProduct.mockReturnValue({ success: true, data: {} });

        productController = new ProductController({ productService: mockProductService });
        // NOTA: Asegúrate de pasar el objeto { productService: ... } si tu constructor usa desestructuración.
        // Si tu constructor es: constructor(productService) {...}, usa la línea de abajo:
        // productController = new ProductController(mockProductService);
    });

    // --- TEST: GET ALL ---
    describe('getAll', () => {
        it('debe responder 200 y devolver productos si los parámetros son válidos', async () => {
            validateParams.mockReturnValue({ success: true, data: {} });
            const mockProducts = [{ id: 1, name: 'Mate' }];

            // CORRECCIÓN: Usamos findAll
            mockProductService.findAll.mockResolvedValue(mockProducts);

            await productController.getAll(req, res);

            expect(mockProductService.findAll).toHaveBeenCalled();
            // Asumo que corregiste el typo 'succes' a 'success' en tu controller
            expect(res.json).toHaveBeenCalledWith({ status: 'success', data: mockProducts });
        });

        it('debe responder 400 si los parámetros son inválidos', async () => {
            validateParams.mockReturnValue({
                success: false,
                error: { errors: ['Error filtro'] } // Zod devuelve esto normalmente
            });

            await productController.getAll(req, res);

            expect(res.status).toHaveBeenCalledWith(400);
            expect(mockProductService.findAll).not.toHaveBeenCalled();
        });

        it('debe responder 500 si el servicio falla', async () => {
            validateParams.mockReturnValue({ success: true, data: {} });
            mockProductService.findAll.mockRejectedValue(new Error('DB Error'));

            await productController.getAll(req, res);

            expect(res.status).toHaveBeenCalledWith(500);
        });
    });

    // --- TEST: CREATE ---
    describe('create', () => {
        it('debe responder 400 si no se envía imagen', async () => {
            req.file = undefined;
            await productController.create(req, res);
            expect(res.status).toHaveBeenCalledWith(400);
            expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ message: 'La imagen del producto es obligatoria' }));
        });

        it('debe responder 400 si la validación del body falla', async () => {
            req.file = { buffer: 'fake' };

            // CORRECCIÓN VITAL: Agregamos la función .format() al error
            // Tu controlador hace: result.error.format()
            validateProduct.mockReturnValue({
                success: false,
                error: {
                    format: jest.fn().mockReturnValue({ name: { _errors: ['Nombre inválido'] } })
                }
            });

            await productController.create(req, res);

            expect(res.status).toHaveBeenCalledWith(400);
            // Verificamos que no se llamó al servicio
            expect(mockProductService.create).not.toHaveBeenCalled();
        });

        it('debe responder 201 y crear el producto si todo es válido', async () => {
            req.file = { buffer: 'fake' };
            req.body = { name: 'Nuevo' };

            validateProduct.mockReturnValue({ success: true, data: req.body });

            // Simulamos que create devuelve el ID del nuevo producto
            mockProductService.create.mockResolvedValue(1);
            // Y que findById devuelve el objeto completo
            mockProductService.findById.mockResolvedValue({ id: 1, name: 'Nuevo' });

            await productController.create(req, res);

            expect(res.status).toHaveBeenCalledWith(201);
            expect(mockProductService.create).toHaveBeenCalled();
        });
    });

    // --- TEST: GET BY ID ---
    describe('getById', () => {
        it('debe responder 404 si el servicio lanza un error con statusCode', async () => {
            req.params.id = '999';
            validateId.mockReturnValue({ success: true, data: 999 });

            const errorReal = new NotFoundError('No encontrado');

            mockProductService.findById.mockRejectedValue(errorReal);

            await productController.getById(req, res);

            // Verificamos
            expect(res.status).toHaveBeenCalledWith(404);
            expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ message: 'No encontrado' }));
        });
    });

    // --- TEST: UPDATE ---
    describe('update', () => {
        it('debe responder 400 si el ID es inválido', async () => {
            // CORRECCIÓN VITAL: Devolvemos un objeto, NO null
            // Tu código hace: if (!idResult.success)
            validateId.mockReturnValue({ success: false });

            await productController.update(req, res);

            expect(res.status).toHaveBeenCalledWith(400);
        });

        it('debe responder 404 si el servicio devuelve false (no actualizado)', async () => {
            validateId.mockReturnValue({ success: true, data: 1 });
            validatePartialProduct.mockReturnValue({ success: true, data: { name: 'Edit' } });

            mockProductService.update.mockResolvedValue(false);

            await productController.update(req, res);

            expect(res.status).toHaveBeenCalledWith(404);
        });
    });
});