import { z } from 'zod'
import { pageSchema, dateValidation } from './shared-schema.js'

const MOVEMENT_TYPES = ['ingreso', 'egreso', 'envio']
const STATUS_TYPES = ['pendiente', 'en_proceso', 'entregado']
const EGRESS_REASONS = ['sale', 'return', 'exchange']

const movementDetailSchema = z.object({
    product_id: z.coerce.number().int().positive(),
    quantity: z.coerce.number().int().positive(),
    min_quantity: z.coerce.number().int().nonnegative().optional()
})

export const movementSchema = z.object({
    type: z.enum(MOVEMENT_TYPES),
    origin_branch_id: z.coerce.number().int().positive().optional().nullable(),
    destination_branch_id: z.coerce.number().int().positive().optional().nullable(),
    egress_reason: z.enum(EGRESS_REASONS).optional().nullable(),
    details: z.array(movementDetailSchema).min(1, "Debe incluir al menos un producto")

}).superRefine((data, ctx) => {
    if (data.type === 'envio' && !data.destination_branch_id) {
        ctx.addIssue({
            code: z.ZodIssueCode.custom,
            message: "El envío requiere una sucursal de destino",
            path: ["destination_branch_id"]
        });
    }
    if (data.type === 'egreso' && !data.egress_reason) {
        ctx.addIssue({ code: z.ZodIssueCode.custom, message: 'El egreso requiere un motivo', path: ['egress_reason'] })
    }
});

const params = z.object({
    search: z.string().optional(),
    type: z.enum(MOVEMENT_TYPES).optional(),
    origin_branch_id: z.coerce.number().int().positive().optional(),
    destination_branch_id: z.coerce.number().int().positive().optional(),
    user: z.string().uuid().optional(),
    date_start: dateValidation.optional(),
    date_end: dateValidation.optional(),
    page: pageSchema
})

export function validateMovement(input) {
    return movementSchema.safeParse(input)
}

export function validateDetailMovement(input) {
    return movementDetailSchema.safeParse(input)
}

export function validateParams(input) {
    return params.safeParse(input)
}
