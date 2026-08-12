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
})
