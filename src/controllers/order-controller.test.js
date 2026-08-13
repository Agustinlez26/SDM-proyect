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
    const normalizedBody = {
        ...validBody,
        delivery_type: 'pickup',
        shipping_method: null,
        shipping_method_detail: null
    }
    const app = { get: jest.fn(() => ({ emit: jest.fn() })) }

    test('allows the creator to edit a reserved order', async () => {
        const model = {
            orderInfo: jest.fn(async () => ({ id: 7, channel: 'mayorista', status: 'reserved', created_by: 'user-1' })),
            allowedBranches: jest.fn(async () => [{ id: 1, name: 'Taller' }]),
            productsBelongToChannel: jest.fn(async () => true),
            update: jest.fn(async () => ({ status: 'reserved' }))
        }
        const controller = new OrderController({ orderModel: model })
        const response = responseMock()
        await controller.update({ params:{id:'7'},body:validBody,user:{id:'user-1',app_role:'seller',area:'wholesale',branch_id:1},app },response)
        expect(model.update).toHaveBeenCalledWith(7,normalizedBody,'user-1',false)
        expect(response.json).toHaveBeenCalledWith({status:'success',data:{status:'reserved'}})
    })

    test('rejects a stock manager correction after confirmation', async () => {
        const model = {
            orderInfo: jest.fn(async () => ({ id: 7, channel: 'mayorista', status: 'completed', created_by: 'user-1' })),
            allowedBranches: jest.fn(async () => [{ id: 1, name: 'Taller' }]),
            productsBelongToChannel: jest.fn(async () => true),
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
            productsBelongToChannel: jest.fn(async () => true),
            update: jest.fn(async () => ({ status: 'completed' }))
        }
        const controller = new OrderController({ orderModel: model })
        const response = responseMock()
        await controller.update({params:{id:'7'},body:validBody,user:{id:'admin',is_admin:true,app_role:'admin',area:'general',branch_id:1},app},response)
        expect(model.update).toHaveBeenCalledWith(7,normalizedBody,'admin',true)
        expect(response.json).toHaveBeenCalledWith({status:'success',data:{status:'completed'}})
    })
})

describe('OrderController delivery data', () => {
    const app = { get: jest.fn(() => ({ emit: jest.fn() })) }
    const user = { id:'seller-1', app_role:'seller', area:'retail', branch_id:1 }
    const baseBody = {
        idempotency_key:'11111111-1111-4111-8111-111111111111',
        channel:'tienda_nube',
        fulfillment_mode:'reserve',
        customer_reference:'María Pérez',
        items:[{product_id:4,branch_id:1,quantity:1}]
    }

    test('keeps the selected shipping method on order creation', async () => {
        const model = {
            allowedBranches:jest.fn(async()=>[{id:1,name:'Taller'}]),
            productsBelongToChannel:jest.fn(async()=>true),
            create:jest.fn(async()=>({id:9,created:true,status:'reserved'}))
        }
        const response=responseMock()
        const controller=new OrderController({orderModel:model})
        await controller.create({body:{...baseBody,delivery_type:'shipping',shipping_method:'via_cargo'},user,app},response)
        expect(model.create).toHaveBeenCalledWith(expect.objectContaining({delivery_type:'shipping',shipping_method:'via_cargo',shipping_method_detail:null}),'seller-1')
        expect(response.status).toHaveBeenCalledWith(201)
    })

    test('rejects an unspecified custom shipping method', async () => {
        const model = {
            allowedBranches:jest.fn(async()=>[{id:1,name:'Taller'}]),
            create:jest.fn()
        }
        const response=responseMock()
        const controller=new OrderController({orderModel:model})
        await controller.create({body:{...baseBody,delivery_type:'shipping',shipping_method:'other',shipping_method_detail:''},user,app},response)
        expect(response.status).toHaveBeenCalledWith(400)
        expect(model.create).not.toHaveBeenCalled()
    })
})

describe('OrderController merchandising access', () => {
    const app = { get: jest.fn(() => ({ emit: jest.fn() })) }

    test('allows a merchandising seller to use only that channel', async () => {
        const model = {
            allowedBranches: jest.fn(async () => [{ id:1, name:'Taller' }]),
            overview: jest.fn(async () => ({ orders:[] }))
        }
        const controller = new OrderController({ orderModel:model })
        const allowedResponse = responseMock()
        await controller.overview({query:{channel:'merchandising'},user:{id:'merch-1',app_role:'seller',area:'merchandising',branch_id:1}},allowedResponse)
        expect(allowedResponse.json).toHaveBeenCalled()

        const deniedResponse = responseMock()
        await controller.overview({query:{channel:'mayorista'},user:{id:'merch-1',app_role:'seller',area:'merchandising',branch_id:1}},deniedResponse)
        expect(deniedResponse.status).toHaveBeenCalledWith(403)
    })

    test('rejects a product that is not enabled for the requested channel', async () => {
        const model = {
            allowedBranches:jest.fn(async()=>[{id:1,name:'Taller'}]),
            productsBelongToChannel:jest.fn(async()=>false),
            create:jest.fn()
        }
        const controller = new OrderController({ orderModel:model })
        const response = responseMock()
        await controller.create({body:{
            idempotency_key:'11111111-1111-4111-8111-111111111111',
            channel:'merchandising',customer_reference:'Cliente',
            items:[{product_id:4,branch_id:1,quantity:1}]
        },user:{id:'merch-1',app_role:'seller',area:'merchandising',branch_id:1},app},response)
        expect(response.status).toHaveBeenCalledWith(400)
        expect(model.create).not.toHaveBeenCalled()
    })
})
