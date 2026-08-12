import { describe, expect, test } from '@jest/globals'
import { buildSkuBase, normalizeSku, withSkuSuffix } from './sku-utils.js'

describe('SKU utilities', () => {
    test('builds a compact SKU from the product name', () => {
        expect(buildSkuBase('Mate SP')).toBe('MAT-SP')
        expect(buildSkuBase('Bombilla príncipe alpaca')).toBe('BOM-PRI-ALP')
    })

    test('normalizes an edited SKU and supports collision suffixes', () => {
        expect(normalizeSku(' mate sp plata ')).toBe('MATE-SP-PLATA')
        expect(withSkuSuffix('MAT-SP', 2)).toBe('MAT-SP-2')
    })
})
