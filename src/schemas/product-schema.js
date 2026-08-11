import { z } from 'zod'
import { pageSchema } from './shared-schema.js'

const categorySchema = z.object({
    name: z.string().min(3, 'El nombre debe ser mayor a 3 digitos').max(100),
})

const parseJson = value => {
    if (typeof value !== 'string') return value
    try { return JSON.parse(value) } catch { return value }
}

const formBoolean = z.union([z.boolean(), z.number(), z.string()]).transform(value =>
    value === true || value === 1 || value === '1' || value === 'true'
)

const optionalBranch = z.preprocess(
    value => value === '' || value === 'null' || value === undefined ? null : value,
    z.coerce.number().int().positive().nullable()
)

const channelsSchema = z.preprocess(parseJson, z.array(z.coerce.number().int().positive()))
const personalizationSchema = z.preprocess(
    parseJson,
    z.array(z.enum(['laser_internal', 'artisan_metalwork']))
)
const recipeSchema = z.preprocess(parseJson, z.array(z.object({
    product_id: z.coerce.number().int().positive(),
    quantity: z.coerce.number().positive()
})))

const productFields = {
    name: z.string().trim().min(3, 'El nombre debe tener al menos 3 caracteres').max(100)
        .refine(value => /[\p{L}\p{N}]/u.test(value), 'El nombre debe contener letras o números'),
    description: z.string().min(5, 'La descripcion debe ser mas larga').max(200),
    category_id: z.coerce.number().int().positive(),
    is_active: z.string().optional().transform(val => {
        if (val === undefined || val === null) return undefined
        return val === 'true' || val === '1' || val === 1
    }),
}

const operationalFields = {
    item_type: z.enum(['finished', 'raw_material', 'merchandising']),
    is_sellable: formBoolean,
    is_manufacturable: formBoolean,
    is_customizable: formBoolean,
    production_method: z.enum(['purchased', 'internal_workshop', 'artisan']),
    production_branch_id: optionalBranch,
    channels: channelsSchema,
    personalization_methods: personalizationSchema,
    recipe: recipeSchema
}

const productSchema = z.object({
    ...productFields,
    item_type: operationalFields.item_type.default('finished'),
    is_sellable: operationalFields.is_sellable.default(true),
    is_manufacturable: operationalFields.is_manufacturable.default(false),
    is_customizable: operationalFields.is_customizable.default(false),
    production_method: operationalFields.production_method.default('purchased'),
    production_branch_id: operationalFields.production_branch_id.default(null),
    channels: operationalFields.channels.default([]),
    personalization_methods: operationalFields.personalization_methods.default([]),
    recipe: operationalFields.recipe.default([])
})
const partialProductSchema = z.object({
    ...productFields,
    ...operationalFields,
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
