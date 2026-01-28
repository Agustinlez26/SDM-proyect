import { z } from 'zod'

export const idSchema = z.coerce.number().int().positive({
    message: "El ID debe ser un número positivo"
});

export function validateId(input) {
    return id.safeParse(input)
}