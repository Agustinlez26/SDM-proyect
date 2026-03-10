import { z } from 'zod'
import { idSchema } from './shared-schema.js'

/**
 * Extiende el yearSchema del shared, forzando mínimo 2026 para estadísticas.
 */
const statsYearSchema = z.object({
    year: z.coerce
        .number({ invalid_type_error: 'El año debe ser un número' })
        .int({ message: 'El año debe ser un número entero' })
        .min(2026, { message: 'El año debe ser 2026 o posterior' })
        .max(2100, { message: 'El año debe ser menor a 2100' })
})

/**
 * Valida la barra de búsqueda de producto en la sección de estacionalidad.
 * String no vacío, máx. 100 caracteres, campo opcional.
 */
const productSearchSchema = z.object({
    search: z.string()
        .trim()
        .min(1, { message: 'El texto de búsqueda no puede estar vacío' })
        .max(100, { message: 'La búsqueda no puede superar los 100 caracteres' })
        .optional()
})

export function validateStatsYear(input) {
    return statsYearSchema.safeParse(input)
}

export function validateProductSearch(input) {
    return productSearchSchema.safeParse(input)
}

export { idSchema }
