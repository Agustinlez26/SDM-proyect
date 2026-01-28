import { jest } from '@jest/globals';

// 1. MOCKS DE DEPENDENCIAS
// Mockeamos los esquemas de validación
jest.unstable_mockModule('../../src/schemas/stock_schema.js', () => ({
    validateStock: jest.fn(),
    validateUpdateStock: jest.fn(),
    validateParams: jest.fn()
}));

// Mockeamos el esquema compartido (validateId)
jest.unstable_mockModule('../../src/schemas/shared_schema.js', () => ({
    validateId: jest.fn()
}));

// Mockeamos el manejador de errores
jest.unstable_mockModule('../../src/utils/error_handler.js', () => ({
    handleError: jest.fn()
}));

// 2. IMPORTS DINÁMICOS
const { StockController } = await import('../../src/controllers/stock_controller.js');
const { validateStock, validateUpdateStock, validateParams } = await import('../../src/schemas/stock_schema.js');
const { validateId } = await import('../../src/schemas/shared_schema.js');
const { handleError } = await import('../../src/utils/error_handler.js');

describe('StockController Tests', () => {
    let stockController;
    let mockStockService;
    let req, res;

    beforeEach(() => {
        jest.clearAllMocks();

        // Mock del Servicio
        mockStockService = {
            create: jest.fn(),
            getById: jest.fn(),
            findAll: jest.fn(),
            lowStock: jest.fn(),
            outStock: jest.fn(),
            update: jest.fn(),
            delete: jest.fn()
        };

        // Instancia del Controlador con Inyección de Dependencias
        stockController = new StockController({ stockService: mockStockService });

        // Mocks de Request y Response
        req = {
            body: {},
            params: {},
            query: {}
        };

        res = {
            status: jest.fn().mockReturnThis(), // Permite encadenar .status().json()
            json: jest.fn()
        };
    });

    describe('create', () => {
        it('debe responder 201 y crear el stock si los datos son válidos', async () => {
            req.body = { product_id: 1, quantity: 10 };
            const mockData = { id: 1, ...req.body };

            // Simulamos validación exitosa
            validateStock.mockReturnValue({ success: true, data: req.body });
            // Simulamos creación y obtención
            mockStockService.create.mockResolvedValue(1);
            mockStockService.getById.mockResolvedValue(mockData);

            await stockController.create(req, res);

            expect(res.status).toHaveBeenCalledWith(201);
            expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
                status: 'success',
                data: { newStock: mockData }
            }));
        });

        it('debe responder 400 si la validación falla', async () => {
            validateStock.mockReturnValue({ success: false, error: { errors: [] } });

            await stockController.create(req, res);

            expect(res.status).toHaveBeenCalledWith(400);
            expect(mockStockService.create).not.toHaveBeenCalled();
        });
    });

    describe('getAll', () => {
        it('debe responder 200 con la lista de stocks', async () => {
            validateParams.mockReturnValue({ success: true, data: {} });
            mockStockService.findAll.mockResolvedValue([]);

            await stockController.getAll(req, res);

            expect(res.json).toHaveBeenCalledWith({ status: 'success', data: [] });
        });
    });

    describe('getLowStockCount', () => {
        it('debe llamar al servicio con NULL si no se envía branch_id', async () => {
            req.query = {}; // Sin parámetros

            mockStockService.lowStock.mockResolvedValue({ count: 5 });

            await stockController.getLowStockCount(req, res);

            // Verificamos que no se validó nada porque no había parámetro
            expect(validateId).not.toHaveBeenCalled();
            // El servicio debe recibir null
            expect(mockStockService.lowStock).toHaveBeenCalledWith(null);
            expect(res.json).toHaveBeenCalledWith({ status: 'success', data: { count: 5 } });
        });

        it('debe validar y llamar al servicio con ID si se envía branch_id', async () => {
            req.query = { branch_id: '5' };
            validateId.mockReturnValue({ success: true, data: 5 });
            mockStockService.lowStock.mockResolvedValue({ count: 2 });

            await stockController.getLowStockCount(req, res);

            expect(validateId).toHaveBeenCalledWith('5');
            expect(mockStockService.lowStock).toHaveBeenCalledWith(5);
        });

        it('debe responder 400 si el branch_id enviado es inválido', async () => {
            req.query = { branch_id: 'texto_invalido' };
            validateId.mockReturnValue({ success: false });

            await stockController.getLowStockCount(req, res);

            expect(res.status).toHaveBeenCalledWith(400);
            expect(mockStockService.lowStock).not.toHaveBeenCalled();
        });
    });

    describe('update', () => {
        it('debe responder 200 si se actualiza correctamente', async () => {
            req.params.id = '1';
            req.body = { quantity: 50 };

            validateId.mockReturnValue({ success: true, data: 1 });
            validateUpdateStock.mockReturnValue({ success: true, data: req.body });
            mockStockService.update.mockResolvedValue(true);

            await stockController.update(req, res);

            expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
                status: 'success',
                message: 'Stock actualizado correctamente'
            }));
        });

        it('debe responder 404 si el servicio devuelve false', async () => {
            req.params.id = '999';
            validateId.mockReturnValue({ success: true, data: 999 });
            validateUpdateStock.mockReturnValue({ success: true, data: {} });
            mockStockService.update.mockResolvedValue(false);

            await stockController.update(req, res);

            expect(res.status).toHaveBeenCalledWith(404);
        });
    });

    describe('delete', () => {
        it('debe responder 200 si se elimina correctamente', async () => {
            req.params.id = '1';
            validateId.mockReturnValue({ success: true, data: 1 });
            mockStockService.delete.mockResolvedValue(true);

            await stockController.delete(req, res);

            expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
                status: 'success',
                message: 'Stock eliminado correctamente'
            }));
        });
    });

    describe('Error Handling', () => {
        it('debe llamar a handleError si el servicio falla', async () => {
            const error = new Error('DB Error');
            validateParams.mockReturnValue({ success: true, data: {} });
            
            // Simulamos fallo en el servicio
            mockStockService.findAll.mockRejectedValue(error);

            await stockController.getAll(req, res);

            expect(handleError).toHaveBeenCalledWith(res, error);
        });
    });
});