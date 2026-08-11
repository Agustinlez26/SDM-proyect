import z from 'zod';

const userIdRule = z.string().uuid({ message: "ID inválido (Debe ser formato UUID)" });

const passwordRule = z.string()
    .min(10, { message: "La contrasena debe tener al menos 10 caracteres" })
    .max(100, { message: "La contrasena es muy larga" })
    .regex(/[a-z]/, { message: "La contrasena debe incluir una minuscula" })
    .regex(/[A-Z]/, { message: "La contrasena debe incluir una mayuscula" })
    .regex(/[0-9]/, { message: "La contrasena debe incluir un numero" })
    .regex(/[^A-Za-z0-9]/, { message: "La contrasena debe incluir un simbolo" });

const confirmPasswordRule = z.string()
    .min(10, { message: "La confirmacion debe tener al menos 10 caracteres" });

const baseUserSchema = z.object({
    full_name: z.string()
        .min(2, { message: "El nombre es muy corto" })
        .max(100),

    email: z.string()
        .email({ message: "Formato de email inválido" }),

    password: passwordRule,
    confirm_password: confirmPasswordRule,

    is_admin: z.boolean().optional(),
    app_role: z.enum(['admin','stock_manager','seller']).optional(),
    area: z.enum(['general','wholesale','retail']).optional(),
    branch_ids: z.array(z.coerce.number().int().positive()).min(1).optional(),

    branch_id: z.coerce.number({ invalid_type_error: "Debes seleccionar una sucursal" })
        .int().positive(),

    is_active: z.boolean().optional(),
    requires_password_change: z.boolean().optional(),
});


// -------------------------------------------------------------------------
// 3. SCHEMAS DERIVADOS
// -------------------------------------------------------------------------

/**
 * A. CREACIÓN (ADMIN)
 * Base + Validación de passwords coinciden.
 */
const createUserSchemaBase = baseUserSchema.extend({
    is_admin: z.boolean().default(false),
    is_active: z.boolean().default(true),
    requires_password_change: z.boolean().default(true),
});

const createUserSchema = createUserSchemaBase.refine((data) => data.password === data.confirm_password, {
    message: "Las contraseñas no coinciden",
    path: ["confirm_password"],
});

/**
 * B. ACTUALIZACIÓN (ADMIN)
 * Base - Passwords -> Partial
 */
const updateUserSchema = baseUserSchema
    .omit({ password: true, confirm_password: true})
    .partial();

/**
 * C. PERFIL (USUARIO)
 * Solo nombre y email son editables por el propio usuario.
 */
const userProfileSchema = baseUserSchema
    .pick({ full_name: true, email: true })
    .partial();

/**
 * D. QUERY PARAMS
 */
const queryParamsSchema = z.object({
    search: z.string().optional(),
    rol: z.enum(['true', 'false']).transform(val => val === 'true').optional(),
    active: z.enum(['true', 'false']).transform(val => val === 'true').optional(),
}).transform((data) => {
    return {
        search: data.search,
        is_admin: data.rol,
        is_active: data.active
    }
});

/**
 * E. LOGIN Y PASSWORD
 */
const loginSchema = z.object({
    email: z.string().email(),
    password: z.string().min(1)
});

const firstchangePasswordSchema = z.object({
    password: passwordRule,
    confirm_password: confirmPasswordRule,
}).refine((data) => data.password === data.confirm_password, {
    message: "Las contraseñas no coinciden",
    path: ["confirm_password"],
});

const changePasswordSchema = z.object({
    old_password: passwordRule,
    password: passwordRule,
    confirm_password: confirmPasswordRule,
}).refine((data) => data.password === data.confirm_password, {
    message: "Las contraseñas no coinciden",
    path: ["confirm_password"],
});


// -------------------------------------------------------------------------
// 4. FUNCIONES EXPORTADAS
// -------------------------------------------------------------------------

export function validateUserId(input) {
    return userIdRule.safeParse(input)
}

export function validateLogin(input) {
    return loginSchema.safeParse(input)
}

export function validateParams(input) {
    return queryParamsSchema.safeParse(input)
}

export function validateUserAdmin(input) {
    return createUserSchema.safeParse(input);
}

export function validateUpdateAdmin(input) {
    return updateUserSchema.safeParse(input);
}

export function validateUserProfile(input) {
    return userProfileSchema.safeParse(input);
}

export function validateFirstChangePassword(input) {
    return firstchangePasswordSchema.safeParse(input);
}

export function validateChangePassword(input) {
    return changePasswordSchema.safeParse(input);
}
