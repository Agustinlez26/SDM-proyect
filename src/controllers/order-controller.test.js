import { describe, expect, jest, test } from '@jest/globals'
import { OrderController } from './order-controller.js'

const responseMock = () => {
    const response = {}
    response.status = jest.fn(() => response)
    response.json = jest.fn(() => response)
    return response
}

describe('OrderController details', () => {
    test('returns order products for an authorized branch', async () => {
        const details = [{ product_id: 4, sku: 'MAT-SP', name: 'Mate SP', quantity: 2, branch_id: 1, branch_name: 'Taller' }]
        const model = {
            orderInfo: jest.fn(async () => ({ id: 7, channel: 'mayorista' })),
            allowedBranches: jest.fn(async () => [{ id: 1, name: 'Taller' }]),
            details: jest.fn(async () => details)
        }
        const controller = new OrderController({ orderModel: model })
        const response = responseMock()

        await controller.details({
            params: { id: '7' },
            user: { id: 'user-1', app_role: 'seller', area: 'wholesale', branch_id: 1 }
        }, response)

        expect(response.json).toHaveBeenCalledWith({ status: 'success', data: details })
    })

    test('rejects details allocated to a branch unavailable to the seller', async () => {
        const model = {
            orderInfo: jest.fn(async () => ({ id: 7, channel: 'mayorista' })),
            allowedBranches: jest.fn(async () => [{ id: 1, name: 'Taller' }]),
            details: jest.fn(async () => [{ product_id: 4, branch_id: 2 }])
        }
        const controller = new OrderController({ orderModel: model })
        const response = responseMock()

        await controller.details({
            params: { id: '7' },
            user: { id: 'user-1', app_role: 'seller', area: 'wholesale', branch_id: 1 }
        }, response)

        expect(response.status).toHaveBeenCalledWith(403)
    })
})
