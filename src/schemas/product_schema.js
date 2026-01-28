import { z } from 'zod'

const productSchema = z.object({
    name: z.string().min(3, 'El nombre debe ser mayor a 3 digitos').max(100),
    cod_bar: z.string().max(50),
    description: z.string().min(10, 'La descripcion debe ser mas larga').max(200),
    category_id: z.coerce.number().int().positive(),
    is_active: z.string().optional().transform(val => val === 'true')
})

const params = z.object({
    search: z.string().optional(),
    category_id: z.coerce.number().int().positive().optional(),
    state: z.string().transform(val => val === 'true').optional(),
    page: z.coerce.number().int().min(1).optional().default(1),
}).transform((data) => {
    return {
        search: data.search || null,
        category: data.category_id,
        state: data.state,
        page: data.page || null,
    }
})

export function validateParams(input) {
    return params.safeParse(input)
}

export function validateProduct(input) {
    return productSchema.safeParse(input)
}

export function validatePartialProduct(input) {
    return productSchema.partial().safeParse(input)
}