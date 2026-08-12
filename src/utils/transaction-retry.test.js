import { describe, expect, jest, test } from '@jest/globals'
import { isRetryableTransactionError, runTransactionWithRetry, sortStockItems } from './transaction-retry.js'

const connectionMock = () => ({
    beginTransaction: jest.fn().mockResolvedValue(undefined),
    commit: jest.fn().mockResolvedValue(undefined),
    rollback: jest.fn().mockResolvedValue(undefined),
    release: jest.fn()
})

describe('transaction safety', () => {
    test('orders stock items by branch and product', () => {
        const items = [
            { branch_id: 2, product_id: 3 },
            { branch_id: 1, product_id: 9 },
            { branch_id: 1, product_id: 2 }
        ]

        expect(sortStockItems(items)).toEqual([
            { branch_id: 1, product_id: 2 },
            { branch_id: 1, product_id: 9 },
            { branch_id: 2, product_id: 3 }
        ])
        expect(items[0]).toEqual({ branch_id: 2, product_id: 3 })
    })

    test('retries a deadlock and commits the successful attempt', async () => {
        const first = connectionMock()
        const second = connectionMock()
        const db = { getConnection: jest.fn().mockResolvedValueOnce(first).mockResolvedValueOnce(second) }
        const operation = jest.fn()
            .mockRejectedValueOnce(Object.assign(new Error('deadlock'), { code: 'ER_LOCK_DEADLOCK', errno: 1213 }))
            .mockResolvedValueOnce('ok')

        await expect(runTransactionWithRetry(db, operation, { baseDelayMs: 0 })).resolves.toBe('ok')
        expect(first.rollback).toHaveBeenCalledTimes(1)
        expect(first.commit).not.toHaveBeenCalled()
        expect(second.commit).toHaveBeenCalledTimes(1)
        expect(operation).toHaveBeenCalledTimes(2)
        expect(first.release).toHaveBeenCalledTimes(1)
        expect(second.release).toHaveBeenCalledTimes(1)
    })

    test('does not retry a business validation error', async () => {
        const connection = connectionMock()
        const db = { getConnection: jest.fn().mockResolvedValue(connection) }
        const operation = jest.fn().mockRejectedValue(new Error('stock insuficiente'))

        await expect(runTransactionWithRetry(db, operation, { baseDelayMs: 0 })).rejects.toThrow('stock insuficiente')
        expect(operation).toHaveBeenCalledTimes(1)
        expect(connection.rollback).toHaveBeenCalledTimes(1)
    })

    test('recognizes both MySQL retryable transaction errors', () => {
        expect(isRetryableTransactionError({ code: 'ER_LOCK_DEADLOCK' })).toBe(true)
        expect(isRetryableTransactionError({ errno: 1205 })).toBe(true)
        expect(isRetryableTransactionError({ code: 'ER_DUP_ENTRY' })).toBe(false)
    })
})
