import { z } from 'zod'

export const idSchema = z.coerce.number().int().positive({
    message: "El ID debe ser un número positivo"
})

export const pageSchema = z.coerce.number().int().min(1).positive({
    message: 'El numero de paginacion debe ser positivo'
}).default(1).optional()

export function validateId(input) {
    return idSchema.safeParse(input)
}