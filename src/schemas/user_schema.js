import z from 'zod';

const params = z.object({
    search: z.string().optional(),
    rol: z.string().transform(val => val === 'true').optional(),
    active: z.string().transform(val => val === 'true').optional(),
}).transform((data) => {
    return {
        search: data.search,
        is_admin: data.rol,
        is_active: data.active
    }
})

const Userid = z.string().uuid()

const passwordRules = z.string()
    .min(6, { message: "La contraseña debe tener al menos 6 caracteres" })
    .max(100, { message: "La contraseña es muy larga" });

const confirmPasswordRules = z.string()
    .min(6, { message: "La confirmación debe tener al menos 6 caracteres" });

export const userSchema = z.object({
    full_name: z.string()
        .min(2, { message: "El nombre es muy corto" })
        .max(100),
    email: z.string()
        .email({ message: "Formato de email inválido" }),
    password: passwordRules,
    confirm_password: confirmPasswordRules,
    is_admin: z.boolean().default(false),
    phone: z.string()
        .min(7, { message: "El teléfono debe tener al menos 7 dígitos" })
        .max(15, { message: "El teléfono es muy largo" }),
    branch_id: z.coerce.number({ invalid_type_error: "Debes seleccionar una sucursal" })
        .int().positive(),
    is_active: z.boolean().default(true),
    requires_password_change: z.boolean().default(true),
}).refine((data) => data.password === data.confirm_password, {
    message: "Las constraseñas no coinciden",
    path: ["confirm_password"],
});

export const userProfileSchema = userSchema.pick({
    full_name: true,
    email: true,
    phone: true,
});

export const changePasswordSchema = z.object({
    password: passwordRules,
    confirm_password: confirmPasswordRules,
}).refine((data) => data.password === data.confirm_password, {
    message: "Las contraseñas no coinciden",
    path: ["confirm_password"],
});

export function validateUserId(input) {
    return Userid.safeParse(input)
}

export function validateParams(input) {
    return params.safeParse(input)
}

export function validateUserAdmin(input) {
    return userSchema.safeParse(input);
}

export function validateUserProfile(input) {
    return userProfileSchema.safeParse(input);
}

export function validateChangePassword(input) {
    return changePasswordSchema.safeParse(input);
}


