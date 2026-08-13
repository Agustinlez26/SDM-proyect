import { z } from 'zod'
import { pageSchema, dateValidation } from './shared-schema.js'

const MOVEMENT_TYPES = ['ingreso', 'egreso', 'envio']
const STATUS_TYPES = ['pendiente', 'en_proceso', 'entregado']
const EGRESS_REASONS = ['sale', 'return', 'exchange']
const SALE_CHANNELS = ['mercado_libre', 'tienda_nube', 'mayorista', 'merchandising', 'showroom']

const movementDetailSchema = z.object({
    product_id: z.coerce.number().int().positive(),
    quantity: z.coerce.number().int().positive(),
    min_quantity: z.coerce.number().int().nonnegative().optional()
})

const shipmentOrderSchema = z.object({
    order_id: z.coerce.number().int().positive(),
    package_count: z.coerce.number().int().min(1).max(99)
})

export const movementSchema = z.object({
    idempotency_key: z.string().uuid('La identificación de la operación no es válida'),
    type: z.enum(MOVEMENT_TYPES),
    origin_branch_id: z.coerce.number().int().positive().optional().nullable(),
    destination_branch_id: z.coerce.number().int().positive().optional().nullable(),
    egress_reason: z.enum(EGRESS_REASONS).optional().nullable(),
    sale_channel: z.enum(SALE_CHANNELS).optional().nullable(),
    explanation: z.string().trim().max(1000, 'La explicación no puede superar los 1000 caracteres').optional().nullable(),
    details: z.array(movementDetailSchema).default([]),
    shipment_orders: z.array(shipmentOrderSchema).max(100).default([])

}).superRefine((data, ctx) => {
    if (!data.details.length && !(data.type === 'envio' && data.shipment_orders.length)) {
        ctx.addIssue({ code: z.ZodIssueCode.custom, message: 'Debe incluir al menos un producto o pedido', path: ['details'] })
    }
    if (data.type === 'envio' && !data.destination_branch_id) {
        ctx.addIssue({
            code: z.ZodIssueCode.custom,
            message: "El envío requiere una sucursal de destino",
            path: ["destination_branch_id"]
        });
    }
    if (data.type === 'envio' && data.origin_branch_id && data.origin_branch_id === data.destination_branch_id) {
        ctx.addIssue({
            code: z.ZodIssueCode.custom,
            message: "La sucursal de destino debe ser diferente del origen",
            path: ["destination_branch_id"]
        });
    }
    if (data.type === 'egreso' && !data.egress_reason) {
        ctx.addIssue({ code: z.ZodIssueCode.custom, message: 'El egreso requiere un motivo', path: ['egress_reason'] })
    }
    if (data.type === 'egreso' && data.egress_reason === 'exchange' && !data.sale_channel) {
        ctx.addIssue({ code: z.ZodIssueCode.custom, message: 'El cambio requiere indicar el canal de venta', path: ['sale_channel'] })
    }
    if (data.type === 'egreso' && data.egress_reason === 'exchange' && data.sale_channel === 'mercado_libre') {
        ctx.addIssue({ code: z.ZodIssueCode.custom, message: 'Mercado Libre no admite cambios de producto', path: ['sale_channel'] })
    }
    if ((data.type === 'envio' || (data.type === 'egreso' && ['return', 'exchange'].includes(data.egress_reason))) && !data.explanation?.trim()) {
        ctx.addIssue({ code: z.ZodIssueCode.custom, message: 'La explicación de la operación es obligatoria', path: ['explanation'] })
    }
    const productIds = data.details.map(detail => detail.product_id)
    if (new Set(productIds).size !== productIds.length) {
        ctx.addIssue({ code: z.ZodIssueCode.custom, message: 'Un producto no puede repetirse dentro del mismo movimiento', path: ['details'] })
    }
    const orderIds = data.shipment_orders.map(item => item.order_id)
    if (new Set(orderIds).size !== orderIds.length) {
        ctx.addIssue({ code: z.ZodIssueCode.custom, message: 'Un pedido no puede repetirse dentro del envío', path: ['shipment_orders'] })
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
