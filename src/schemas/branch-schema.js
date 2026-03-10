import z from 'zod'

const branchSchema = z.object({
    name: z.string({
        invalid_type_error: 'El nombre debe ser un texto',
        required_error: 'El nombre es obligatorio'
    }).min(3, 'El nombre debe ser mayor a 3 digitos').max(100),
    address: z.string({
        invalid_type_error: 'La dirección debe ser un texto',
        required_error: 'La dirección es obligatoria'
    }).min(4, 'La dirección no puede ser tan corta').max(100),
    city_id: z.coerce.number({
        invalid_type_error: 'El ID de ciudad debe ser un número'
    }).int().positive('El ID de ciudad no es válido'),
    province_id: z.coerce.number({
        invalid_type_error: 'El ID de provincia debe ser un número'
    }).int().positive('El ID de provincia no es válido'),
    branch_type_id: z.coerce.number({
        invalid_type_error: 'El tipo de sucursal debe ser un número'
    }).int().positive('El tipo de sucursal no es válido'),
    is_active: z.boolean().default(true)
})

export function validateBranch(input) {
    return branchSchema.safeParse(input)
}

export function validateUpdateBranch(input) {
    return branchSchema.partial().safeParse(input)
}
