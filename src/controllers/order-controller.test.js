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
            details: jest.fn(async () => details),
            auditHistory: jest.fn(async () => [])
        }
        const controller = new OrderController({ orderModel: model })
        const response = responseMock()

        await controller.details({
            params: { id: '7' },
            user: { id: 'user-1', app_role: 'seller', area: 'wholesale', branch_id: 1 }
        }, response)

        expect(response.json).toHaveBeenCalledWith({ status: 'success', data: { items: details, audit: [] } })
    })

    test('rejects details allocated to a branch unavailable to the seller', async () => {
        const model = {
            orderInfo: jest.fn(async () => ({ id: 7, channel: 'mayorista' })),
            allowedBranches: jest.fn(async () => [{ id: 1, name: 'Taller' }]),
            details: jest.fn(async () => [{ product_id: 4, branch_id: 2 }]),
            auditHistory: jest.fn(async () => [])
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

describe('OrderController update permissions', () => {
    const validBody = {
        customer_reference: 'Cliente de prueba',
        notes: '',
        reason: 'Corrección documentada',
        items: [{ product_id: 4, branch_id: 1, quantity: 2 }]
    }
    const app = { get: jest.fn(() => ({ emit: jest.fn() })) }

    test('allows the creator to edit a reserved order', async () => {
        const model = {
            orderInfo: jest.fn(async () => ({ id: 7, channel: 'mayorista', status: 'reserved', created_by: 'user-1' })),
            allowedBranches: jest.fn(async () => [{ id: 1, name: 'Taller' }]),
            update: jest.fn(async () => ({ status: 'reserved' }))
        }
        const controller = new OrderController({ orderModel: model })
        const response = responseMock()
        await controller.update({ params:{id:'7'},body:validBody,user:{id:'user-1',app_role:'seller',area:'wholesale',branch_id:1},app },response)
        expect(model.update).toHaveBeenCalledWith(7,validBody,'user-1',false)
        expect(response.json).toHaveBeenCalledWith({status:'success',data:{status:'reserved'}})
    })

    test('rejects a stock manager correction after confirmation', async () => {
        const model = {
            orderInfo: jest.fn(async () => ({ id: 7, channel: 'mayorista', status: 'completed', created_by: 'user-1' })),
            allowedBranches: jest.fn(async () => [{ id: 1, name: 'Taller' }]),
            update: jest.fn()
        }
        const controller = new OrderController({ orderModel: model })
        const response = responseMock()
        await controller.update({params:{id:'7'},body:validBody,user:{id:'manager',is_admin:false,app_role:'stock_manager',area:'general',branch_id:1},app},response)
        expect(response.status).toHaveBeenCalledWith(403)
        expect(model.update).not.toHaveBeenCalled()
    })

    test('allows an administrator correction with a reason', async () => {
        const model = {
            orderInfo: jest.fn(async () => ({ id: 7, channel: 'mayorista', status: 'completed', created_by: 'user-1' })),
            allowedBranches: jest.fn(async () => [{ id: 1, name: 'Taller' }]),
            update: jest.fn(async () => ({ status: 'completed' }))
        }
        const controller = new OrderController({ orderModel: model })
        const response = responseMock()
        await controller.update({params:{id:'7'},body:validBody,user:{id:'admin',is_admin:true,app_role:'admin',area:'general',branch_id:1},app},response)
        expect(model.update).toHaveBeenCalledWith(7,validBody,'admin',true)
        expect(response.json).toHaveBeenCalledWith({status:'success',data:{status:'completed'}})
    })
})
