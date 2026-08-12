import { describe, expect, test } from '@jest/globals'
import { canViewAllStock } from './stock-access.js'

describe('canViewAllStock', () => {
    test.each([
        { is_admin: true, app_role: 'admin', area: 'general' },
        { is_admin: false, app_role: 'stock_manager', area: 'general' },
        { is_admin: false, app_role: 'seller', area: 'wholesale' }
    ])('allows users with global stock visibility', user => {
        expect(canViewAllStock(user)).toBe(true)
    })

    test.each([
        null,
        { is_admin: false, app_role: 'seller', area: 'retail' }
    ])('limits users without global stock visibility', user => {
        expect(canViewAllStock(user)).toBe(false)
    })
})

