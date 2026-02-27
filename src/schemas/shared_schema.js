import { z } from 'zod'

export const dateValidation = z.coerce.date()

export const idSchema = z.coerce.number().int().positive({
    message: "El ID debe ser un número positivo"
})

export const pageSchema = z.coerce.number().int().min(1).positive({
    message: 'El numero de paginacion debe ser positivo'
}).default(1).optional()

export const yearSchema = z.object({
    year: z.coerce.number().int().min(1900).max(2100, {
        message: "El año debe estar entre 1900 y 2100"
    })
})

export function validateId(input) {
    return idSchema.safeParse(input)
}

export function validateDate(input) {
    return dateValidation.safeParse(input)
}

export function validateYear(input) {
    return yearSchema.safeParse(input)
}