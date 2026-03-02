import z from 'zod'
import { pageSchema, dateValidation } from './shared-schema.js'

const MOVEMENT_TYPES = ['ingreso', 'egreso', 'envio']
const STATUS_TYPES = ['pendiente', 'en_progreso', 'entregado']
const MAIN_BRANCH_ID = 1

const movementSchema = z.object({
    receip_number: z.string().min(5),
    type: z.enum(MOVEMENT_TYPES),
    user_id: z.string().uuid(),
    origin_branch_id: z.coerce.number().int().positive(),
    destination_branch_id: z.coerce.number().int().positive(),
    status: z.enum(STATUS_TYPES).optional()
}).superRefine((data, ctx) => {

    if (data.type === 'envio') {
        if (!data.destination_branch_id) {
            ctx.addIssue({
                code: z.ZodIssueCode.custom,
                message: "El envío requiere una sucursal de destino",
                path: ["destination_branch_id"]
            });
        }

        if (data.origin_branch_id !== MAIN_BRANCH_ID) {
            ctx.addIssue({
                code: z.ZodIssueCode.custom,
                message: `Los envíos deben salir obligatoriamente de la Sucursal Principal (ID ${MAIN_BRANCH_ID})`,
                path: ["origin_branch_id"]
            });
        }
    }

    if (data.type === 'ingreso') {
        if (!data.destination_branch_id) {
            ctx.addIssue({
                code: z.ZodIssueCode.custom,
                message: "El ingreso requiere una sucursal de destino",
                path: ["destination_branch_id"]
            });
        }
    }

    if (data.type === 'egreso') {
        if (!data.origin_branch_id) {
            ctx.addIssue({
                code: z.ZodIssueCode.custom,
                message: "El egreso requiere una sucursal de origen",
                path: ["origin_branch_id"]
            });
        }
    }
});

const params = z.object({
    search: z.string().optional(),
    type: z.enum(MOVEMENT_TYPES).optional(),
    origin: z.coerce.number().int().positive().optional(),
    destination: z.coerce.number().int().positive().optional(),
    user: z.string().uuid().optional(),
    date_start: dateValidation.optional(),
    date_end: dateValidation.optional(),
    page: pageSchema
})


const movementDetailSchema = z.object({
    product_id: z.coerce.number().int().positive(),
    quantity: z.coerce.number().int().positive()
}
)

export function validateMovement(input) {
    return movementSchema.safeParse(input)
}

export function validateDetailMovement(input) {
    return movementDetailSchema.safeParse(input)
}

export function validateParams(input) {
    return params.safeParse(input)
}