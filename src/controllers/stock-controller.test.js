import { describe, expect, jest, test } from '@jest/globals'
import { StockController } from './stock-controller.js'

const responseMock = () => {
    const response = {}
    response.status = jest.fn(() => response)
    response.json = jest.fn(() => response)
    return response
}

const globalUsers = [
    { is_admin: true, app_role: 'admin', area: 'general', branch_id: 1 },
    { is_admin: false, app_role: 'stock_manager', area: 'general', branch_id: 1 },
    { is_admin: false, app_role: 'seller', area: 'wholesale', branch_id: 1 }
]

describe('StockController permissions', () => {
    test.each(globalUsers)('global viewers can request stock from another branch', async user => {
        const stockService = { findAll: jest.fn(async () => []) }
        const controller = new StockController({ stockService })
        const response = responseMock()

        await controller.getAll({ query: { branch_id: '2' }, user }, response)

        expect(stockService.findAll).toHaveBeenCalledWith(expect.objectContaining({ branch: 2 }))
        expect(response.status).not.toHaveBeenCalledWith(403)
    })

    test('retail sellers are restricted to their assigned branch', async () => {
        const stockService = { findAll: jest.fn(async () => []) }
        const controller = new StockController({ stockService })

        await controller.getAll({
            query: { branch_id: '2' },
            user: { is_admin: false, app_role: 'seller', area: 'retail', branch_id: 1 }
        }, responseMock())

        expect(stockService.findAll).toHaveBeenCalledWith(expect.objectContaining({ branch: 1 }))
    })

    test.each(globalUsers)('global viewers can open stock records from another branch', async user => {
        const stockService = { findById: jest.fn(async () => ({ id: 7, branch_id: 2 })) }
        const controller = new StockController({ stockService })
        const response = responseMock()

        await controller.getById({ params: { id: '7' }, user }, response)

        expect(stockService.findById).toHaveBeenCalledWith(7)
        expect(response.json).toHaveBeenCalledWith({ status: 'success', data: { id: 7, branch_id: 2 } })
    })

    test('retail sellers cannot open stock records from another branch', async () => {
        const stockService = { findById: jest.fn(async () => ({ id: 7, branch_id: 2 })) }
        const controller = new StockController({ stockService })
        const response = responseMock()

        await controller.getById({
            params: { id: '7' },
            user: { is_admin: false, app_role: 'seller', area: 'retail', branch_id: 1 }
        }, response)

        expect(response.status).toHaveBeenCalledWith(403)
    })
})
