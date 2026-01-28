import { jest } from '@jest/globals';

const { ValidationError, NotFoundError } = await import('../../src/utils/errors.js');
const { StockService } = await import('../../src/services/stock_service.js');

describe('StockService Tests', () => {
    let stockService;
    let mockStockModel;

    beforeEach(() => {
        jest.clearAllMocks();

        mockStockModel = {
            findByProductAndBranch: jest.fn(),
            create: jest.fn(),
            exists: jest.fn(),
            update: jest.fn(),
            findAll: jest.fn(),
            findById: jest.fn(),
            delete: jest.fn(),
            lowStock: jest.fn(),
            outStock: jest.fn()
        };

        stockService = new StockService({ stockModel: mockStockModel });
    });

    describe('create', () => {
        it('debe crear un stock si no existe duplicado', async () => {
            const data = { product_id: 1, branch_id: 2, quantity: 10 };
            mockStockModel.findByProductAndBranch.mockResolvedValue(null);
            mockStockModel.create.mockResolvedValue(5);

            const result = await stockService.create(data);

            expect(mockStockModel.findByProductAndBranch).toHaveBeenCalledWith(1, 2);
            expect(result).toBe(5);
        });

        it('debe lanzar ValidationError si ya existe el stock', async () => {
            const data = { product_id: 1, branch_id: 2 };
            mockStockModel.findByProductAndBranch.mockResolvedValue({ id: 99 });

            await expect(stockService.create(data)).rejects.toThrow(ValidationError);
        });
    });

    describe('update', () => {
        it('debe actualizar si el ID existe', async () => {
            const id = 10;
            const data = { quantity: 50 };

            // Simulamos que existe
            mockStockModel.exists.mockResolvedValue(true);
            mockStockModel.update.mockResolvedValue(true);

            const result = await stockService.update(id, data);

            expect(mockStockModel.exists).toHaveBeenCalledWith(id);
            expect(mockStockModel.update).toHaveBeenCalledWith(id, data);
            expect(result).toBe(true);
        });

        it('debe lanzar NotFoundError si el ID no existe', async () => {
            mockStockModel.exists.mockResolvedValue(false);

            await expect(stockService.update(999, {}))
                .rejects
                .toThrow(NotFoundError);

            expect(mockStockModel.update).not.toHaveBeenCalled();
        });
    });

    describe('findAll', () => {
        it('debe calcular paginación y filtros correctamente', async () => {
            // Probamos página 2, size 20 (default) -> offset debería ser 20
            const params = {
                page: 2,
                search: 'teclado',
                branch: 5,
                outStock: true
            };

            const mockResult = [{ id: 1, quantity: 0 }];
            mockStockModel.findAll.mockResolvedValue(mockResult);

            const result = await stockService.findAll(params);

            // Verificamos que llamó al modelo con los argumentos posicionales correctos
            // findAll(search, filters, offset, limit)
            expect(mockStockModel.findAll).toHaveBeenCalledWith(
                'teclado', // search
                { category: undefined, branch: 5, lowStock: undefined, outStock: true }, // filters
                20, // offset ((page 2 - 1) * 20)
                20  // limit
            );
            expect(result).toBe(mockResult);
        });
    });

    describe('findById', () => {
        it('debe retornar el stock si existe', async () => {
            const mockStock = { id: 1, quantity: 10 };
            mockStockModel.findById.mockResolvedValue(mockStock);

            const result = await stockService.findById(1);
            expect(result).toEqual(mockStock);
        });

        it('debe lanzar NotFoundError si no existe', async () => {
            mockStockModel.findById.mockResolvedValue(null);

            await expect(stockService.findById(999))
                .rejects
                .toThrow(NotFoundError);
        });
    });

    describe('delete', () => {
        it('debe eliminar si el registro existe', async () => {
            mockStockModel.exists.mockResolvedValue(true);
            mockStockModel.delete.mockResolvedValue(true);

            const result = await stockService.delete(5);

            expect(result).toBe(true);
            expect(mockStockModel.delete).toHaveBeenCalledWith(5);
        });

        it('debe lanzar NotFoundError si el registro no existe', async () => {
            mockStockModel.exists.mockResolvedValue(false);

            await expect(stockService.delete(5))
                .rejects
                .toThrow(NotFoundError);

            expect(mockStockModel.delete).not.toHaveBeenCalled();
        });
    });

    // Tests simples de pasamanos
    describe('Contadores (lowStock / outStock)', () => {
        it('lowStock debe llamar al modelo', async () => {
            mockStockModel.lowStock.mockResolvedValue({ count: 5 });
            const result = await stockService.lowStock(2);
            expect(mockStockModel.lowStock).toHaveBeenCalledWith(2);
            expect(result).toEqual({ count: 5 });
        });

        it('outStock debe llamar al modelo', async () => {
            mockStockModel.outStock.mockResolvedValue({ count: 0 });
            const result = await stockService.outStock(null);
            expect(mockStockModel.outStock).toHaveBeenCalledWith(null);
            expect(result).toEqual({ count: 0 });
        });
    });
});