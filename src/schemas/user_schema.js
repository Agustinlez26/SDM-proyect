import z from 'zod';

/**
 * =========================================================================
 * SCHEMAS DE VALIDACIÓN - ZOD
 * =========================================================================
 * Este módulo contiene todas las reglas de validación para la entidad Usuario.
 * Se encarga de sanitizar entradas, transformar tipos de datos y asegurar
 * la integridad de la información antes de llegar al controlador.
 */

// -------------------------------------------------------------------------
// REGLAS REUTILIZABLES
// -------------------------------------------------------------------------

/**
 * Regla base para validar UUIDs.
 * Se utiliza para validar parámetros de ruta (ej: /users/:id).
 */
const Userid = z.string().uuid({ message: "ID inválido (Debe ser formato UUID)" });

/**
 * Reglas de seguridad para contraseñas.
 * Min: 6 caracteres, Max: 100 caracteres.
 */
const passwordRules = z.string()
    .min(6, { message: "La contraseña debe tener al menos 6 caracteres" })
    .max(100, { message: "La contraseña es muy larga" });

/**
 * Regla simple para confirmación de contraseña.
 */
const confirmPasswordRules = z.string()
    .min(6, { message: "La confirmación debe tener al menos 6 caracteres" });

// -------------------------------------------------------------------------
// SCHEMAS DEFINITIVOS
// -------------------------------------------------------------------------

/**
 * Schema para validar Query Params en listados (GET /users).
 * * @description
 * Recibe los datos como 'string' (porque vienen de la URL) y los transforma:
 * 1. 'rol=true' -> is_admin: true
 * 2. 'active=true' -> is_active: true
 * 3. Mapea los nombres de la URL a los nombres de la base de datos.
 */
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
});

/**
 * Schema Maestro de Usuario (Creación / Admin).
 * * @description
 * Valida todos los campos necesarios para crear un usuario completo.
 * Incluye validación cruzada para asegurar que password === confirm_password.
 * Convierte automáticamente 'branch_id' a número.
 */
const userSchema = z.object({
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
    // Coerce convierte el string del select HTML a número
    branch_id: z.coerce.number({ invalid_type_error: "Debes seleccionar una sucursal" })
        .int().positive(),
    is_active: z.boolean().default(true),
    requires_password_change: z.boolean().default(true),
}).refine((data) => data.password === data.confirm_password, {
    message: "Las constraseñas no coinciden",
    path: ["confirm_password"],
});

/**
 * Schema para Actualización por Administrador.
 * * @description
 * Derivado de userSchema, pero:
 * 1. Elimina password y confirm_password (tienen su propio endpoint).
 * 2. Hace todos los campos OPCIONALES (.partial) para permitir actualizaciones parciales.
 */
const userSchemaPartial = userSchema.omit({ password: true, confirm_password: true })
    .partial();

/**
 * Schema para Perfil de Usuario (Self-Update).
 * * @description
 * Define qué campos tiene permitido editar un usuario común sobre su propio perfil.
 * Restringe cambios de rol, sucursal o estado.
 */
const userProfileSchema = userSchema.pick({
    full_name: true,
    email: true,
});

/**
 * Schema exclusivo para Login.
 * Nota: No validamos longitud máxima ni complejidad de password aquí,
 * solo que vengan los datos. Dejamos que el AuthService decida si es correcto.
 */
const loginSchema = z.object({
    email: z.string().email({ message: "Debe ser un email válido" }),
    password: z.string().min(1, { message: "La contraseña es requerida" })
});

/**
 * Schema exclusivo para cambio de contraseña.
 */
const changePasswordSchema = z.object({
    password: passwordRules,
    confirm_password: confirmPasswordRules,
}).refine((data) => data.password === data.confirm_password, {
    message: "Las contraseñas no coinciden",
    path: ["confirm_password"],
});

// -------------------------------------------------------------------------
// FUNCIONES DE VALIDACIÓN (EXPORTS)
// -------------------------------------------------------------------------

/**
 * Valida si un ID cumple con el formato UUID.
 * @param {unknown} input - ID a validar.
 */
export function validateUserId(input) {
    return Userid.safeParse(input)
}

/**
 * Valida los datos para el logue de usuarios.
 * @param {unknown} input - Datos del body (req.body).
 */
export function validateLogin(input) {
    return loginSchema.safeParse(input)
}

/**
 * Valida y transforma los parámetros de búsqueda de la URL.
 * @param {unknown} input - Query params (req.query).
 */
export function validateParams(input) {
    return params.safeParse(input)
}

/**
 * Valida la creación de un usuario (requiere todos los campos obligatorios).
 * @param {unknown} input - Datos del body (req.body).
 */
export function validateUserAdmin(input) {
    return userSchema.safeParse(input);
}

/**
 * Valida la actualización de un usuario por un Administrador.
 * Permite campos parciales y acceso a campos sensibles (rol, sucursal).
 * @param {unknown} input - Datos del body.
 */
export function validateUpdateAdmin(input) {
    return userSchemaPartial.safeParse(input);
}

/**
 * Valida la actualización de perfil propio (Usuario Común).
 * Aplica .partial() para permitir enviar solo uno o varios campos permitidos.
 * @param {unknown} input - Datos del body.
 */
export function validateUserProfile(input) {
    // IMPORTANTE: partial() permite que el usuario envíe solo { email: "..." } sin enviar el nombre.
    return userProfileSchema.partial().safeParse(input);
}

/**
 * Valida el cambio de contraseña.
 * Verifica reglas de seguridad y coincidencia de confirmación.
 * @param {unknown} input - Datos del body.
 */
export function validateChangePassword(input) {
    return changePasswordSchema.safeParse(input);
}