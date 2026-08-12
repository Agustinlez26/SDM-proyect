const RETRYABLE_TRANSACTION_ERRORS = new Set([
    'ER_LOCK_DEADLOCK',
    'ER_LOCK_WAIT_TIMEOUT'
])

const wait = milliseconds => new Promise(resolve => setTimeout(resolve, milliseconds))

export const isRetryableTransactionError = error =>
    RETRYABLE_TRANSACTION_ERRORS.has(error?.code) || [1205, 1213].includes(Number(error?.errno))

export const sortStockItems = (items, branchSelector = item => item.branch_id || 0, productSelector = item => item.product_id) =>
    [...items].sort((left, right) => {
        const branchDifference = Number(branchSelector(left)) - Number(branchSelector(right))
        return branchDifference || Number(productSelector(left)) - Number(productSelector(right))
    })

export async function runTransactionWithRetry(db, operation, { maxAttempts = 3, baseDelayMs = 30 } = {}) {
    let lastError

    for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
        const connection = await db.getConnection()
        try {
            await connection.beginTransaction()
            const result = await operation(connection, attempt)
            await connection.commit()
            return result
        } catch (error) {
            lastError = error
            try {
                await connection.rollback()
            } catch {
                // Preserve the original transaction error.
            }

            if (!isRetryableTransactionError(error) || attempt === maxAttempts) throw error
        } finally {
            connection.release()
        }

        await wait(baseDelayMs * attempt)
    }

    throw lastError
}
