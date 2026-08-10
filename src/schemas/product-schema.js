import { z } from 'zod'
import { pageSchema } from './shared-schema.js'

const categorySchema = z.object({
    name: z.string().min(3, 'El nombre debe ser mayor a 3 digitos').max(100),
})

const productFields = {
    name: z.string().trim().min(3, 'El nombre debe tener al menos 3 caracteres').max(100)
        .refine(value => /[\p{L}\p{N}]/u.test(value), 'El nombre debe contener letras o números'),
    description: z.string().min(5, 'La descripcion debe ser mas larga').max(200),
    category_id: z.coerce.number().int().positive(),
    is_active: z.string().optional().transform(val => {
        if (val === undefined || val === null) return undefined
        return val === 'true' || val === '1' || val === 1
    })
}

const productSchema = z.object(productFields)
const partialProductSchema = z.object({
    ...productFields,
    sku: z.string().trim().min(2, 'El SKU debe tener al menos 2 caracteres').max(50)
}).partial()

const params = z.object({
    search: z.string().optional(),
    category_id: z.coerce.number().int().positive().optional(),
    state: z.string().transform(val => val === 'true').optional(),
    page: pageSchema
}).transform((data) => {
    return {
        search: data.search || null,
        category: data.category_id,
        state: data.state,
        page: data.page || null,
    }
})

export function validateCategory(input) {
    return categorySchema.safeParse(input)
}

export function validateParams(input) {
    return params.safeParse(input)
}

export function validateProduct(input) {
    return productSchema.safeParse(input)
}

export function validatePartialProduct(input) {
    return partialProductSchema.safeParse(input)
}
