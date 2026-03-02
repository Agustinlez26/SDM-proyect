import { z } from 'zod'
import { idSchema ,pageSchema } from './shared-schema.js'

const stock_schema = z.object({
    product_id: idSchema,
    branch_id: idSchema,
    quantity: z.coerce.number().int().min(0),
    min_quantity: z.coerce.number().int().min(0),
})

const update_stock_schema = stock_schema.pick({
    quantity: true,
    min_quantity: true
}).partial()

const params = z.object({
    search: z.string().optional(),
    category_id: z.coerce.number().int().positive().optional(),
    branch_id: z.coerce.number().int().positive().optional(),
    low_stock: z.string().transform(val => val === 'true').optional(),
    out_stock: z.string().transform(val => val === 'true').optional(),
    page: pageSchema
}).transform((data) => {
    return {
        search: data.search,
        category: data.category_id,
        branch: data.branch_id,
        low_stock: data.low_stock,
        out_stock: data.out_stock,
        page: data.page
    }
})

/**
 * Tipo para crear stock (Assign)
 * @typedef {z.infer<typeof stock_schema>} StockDTO
 */

/**
 * Tipo para los filtros de búsqueda
 * @typedef {z.infer<typeof params>} StockParamsDTO
 */

export function validateStock(input) {
    return stock_schema.safeParse(input)
}

export function validateUpdateStock(input) {
    return update_stock_schema.safeParse(input)
}

export function validateParams(input) {
    return params.safeParse(input)
}