import { z } from 'zod'

const productSchema = z.object({
    name: z.string().min(3, 'El nombre debe ser mayor a 3 digitos').max(100),
    description: z.string().min(10, 'La descripcion debe ser mas larga').max(200),
    category_id: z.string().transform((val => parseInt(val, 10))).refine((val) => !isNaN(val),
        {
            message: "ID de categoria no valido"
        }),
    url_img_original: z.string().url(),
    is_active: z.string().optional().transform(val => val === 'true')
})

const params = z.object({
    search: z.string().optional(),
    category: z.string().transform(val => parseInt(val, 10)).optional,
    state: z.string().transform(val => val === 'true').optional(),
    offset: z.string().transform(val => parseInt(val, 10)).optional(),
}).transform((data) => {
    return {
        search: data.search || null,
        filter: {
            category: data.category,
            state: data.state
        },
        offset: data.offset || null,
    }
})

const id = z.string().transform(val => parseInt(val, 10)).refine(val => !isNaN(val) && val > 0, {
    message: "El ID debe ser un número positivo"
});

export function validateParams(input) {
    return params.partial().safeParse(input)
}

export function validateId(input) {
    return id.safeParse(input)
}
export function validateProduct(input) {
    return productSchema.safeParse(input)
}

export function validatePartialProduct(input) {
    return productSchema.partial().safeParse(input)
}