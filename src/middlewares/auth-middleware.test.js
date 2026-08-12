import { describe, expect, jest, test } from '@jest/globals'
import { canManageStock } from './auth-middleware.js'

const responseMock = () => {
    const response = {}
    response.status = jest.fn(() => response)
    response.json = jest.fn(() => response)
    return response
}

describe('canManageStock', () => {
    test.each([
        { is_admin: true, app_role: 'admin' },
        { is_admin: false, app_role: 'stock_manager' }
    ])('allows stock management roles', user => {
        const next = jest.fn()
        canManageStock({ user }, responseMock(), next)
        expect(next).toHaveBeenCalledTimes(1)
    })

    test.each([
        null,
        { is_admin: false, app_role: 'seller' }
    ])('rejects users without stock management access', user => {
        const response = responseMock()
        const next = jest.fn()
        canManageStock({ user }, response, next)
        expect(next).not.toHaveBeenCalled()
        expect(response.status).toHaveBeenCalledWith(403)
    })
})
