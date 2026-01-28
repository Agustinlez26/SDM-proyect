import { jest } from '@jest/globals';
import { StockModel } from '../../src/models/stock.js';

// 1. Mockeamos los DTOs antes de importar nada
jest.unstable_mockModule('../../src/dtos/stocks/Stock_list_DTO.js', () => ({
    Stock_list_DTO: class { constructor(data) { Object.assign(this, data) } }
}));

jest.unstable_mockModule('../../src/dtos/stocks/stock_DTO.js', () => ({
    Stock_DTO: class { constructor(data) { Object.assign(this, data) } }
}));

// 2. Importamos la clase Stock dinámicamente
const { Stock } = await import('../../src/models/stock.js'); // Asegúrate que el nombre del archivo sea correcto (stock.js o stock_model.js)

describe('StockModel Tests', () => {
    let mockDb
    let stockModel

    beforeEach(() => {
        mockDb = {
            query: jest.fn()
        }
        stockModel = new StockModel({ db: mockDb })
    })

    describe('findAll', () => {
        test('debe generar SQL básico sin filtros', async () => {
            mockDb.query.mockResolvedValue([[]])
            await stockModel.findAll({})
            const lastCall = mockDb.query.mock.calls[0]
            expect(lastCall[0]).toContain('SELECT')
        })

        test('debe aplicar filtro de búsqueda y Sucursal', async () => {
            mockDb.query.mockResolvedValue([[]])
            await stockModel.findAll({ search: 'yerba', filters: { branch: 5 } })
            const [sql, params] = mockDb.query.mock.calls[0]
            expect(sql).toContain('LIKE ?')
            expect(sql).toContain('s.branch_id = ?')
            expect(params[0]).toBe('%yerba%')
            expect(params[2]).toBe(5)
        })
    })

    describe('create', () => {
        test('debe insertar los datos correctos', async () => {
            // Simulamos que values es plano (por la corrección que hicimos antes)
            mockDb.query.mockResolvedValue([{ insertId: 99 }])
            const data = { product_id: 1, branch_id: 2, quantity: 100, min_quantity: 10 }

            const result = await stockModel.create(data)

            const [sql, params] = mockDb.query.mock.calls[0]
            expect(result).toBe(99)
            expect(params).toEqual([1, 2, 100, 10])
        })
    })
})