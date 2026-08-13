import { describe, expect, test } from '@jest/globals'
import { validateMovement } from './movement-schema.js'

const validKey = '7c953d5a-9f1b-4ed2-a683-7bf69ced1f25'

describe('movement idempotency validation', () => {
    test('requires a valid idempotency key', () => {
        const movement = {
            type: 'egreso',
            egress_reason: 'return',
            explanation: 'Producto defectuoso',
            origin_branch_id: 1,
            details: [{ product_id: 1, quantity: 1 }]
        }

        expect(validateMovement(movement).success).toBe(false)
        expect(validateMovement({ ...movement, idempotency_key: 'invalid' }).success).toBe(false)
        expect(validateMovement({ ...movement, idempotency_key: validKey }).success).toBe(true)
    })

    test('rejects a repeated product inside one movement', () => {
        const result = validateMovement({
            idempotency_key: validKey,
            type: 'envio',
            explanation: 'Reposición de stock',
            origin_branch_id: 1,
            destination_branch_id: 2,
            details: [
                { product_id: 8, quantity: 1 },
                { product_id: 8, quantity: 2 }
            ]
        })

        expect(result.success).toBe(false)
    })

    test('rejects product exchanges through Mercado Libre', () => {
        const result = validateMovement({
            idempotency_key: validKey,
            type: 'egreso',
            egress_reason: 'exchange',
            sale_channel: 'mercado_libre',
            explanation: 'El cliente solicita cambiar el producto',
            origin_branch_id: 1,
            details: [{ product_id: 8, quantity: 1 }]
        })

        expect(result.success).toBe(false)
        expect(result.error.issues).toEqual(expect.arrayContaining([
            expect.objectContaining({ path: ['sale_channel'], message: 'Mercado Libre no admite cambios de producto' })
        ]))
    })

    test('allows a product exchange through another sales channel', () => {
        const result = validateMovement({
            idempotency_key: validKey,
            type: 'egreso',
            egress_reason: 'exchange',
            sale_channel: 'tienda_nube',
            explanation: 'El cliente solicita cambiar el producto',
            origin_branch_id: 1,
            details: [{ product_id: 8, quantity: 1 }]
        })

        expect(result.success).toBe(true)
    })

    test('allows a Taller to Juncal shipment composed only of reserved orders', () => {
        const result = validateMovement({
            idempotency_key: validKey,
            type: 'envio',
            explanation: 'Pedidos preparados para llevar a Juncal',
            origin_branch_id: 1,
            destination_branch_id: 2,
            details: [],
            shipment_orders: [{ order_id: 15, package_count: 2 }]
        })

        expect(result.success).toBe(true)
    })

    test('rejects a duplicated order inside one shipment', () => {
        const result = validateMovement({
            idempotency_key: validKey,
            type: 'envio',
            explanation: 'Pedidos preparados para llevar a Juncal',
            origin_branch_id: 1,
            destination_branch_id: 2,
            shipment_orders: [
                { order_id: 15, package_count: 1 },
                { order_id: 15, package_count: 2 }
            ]
        })

        expect(result.success).toBe(false)
    })
})
