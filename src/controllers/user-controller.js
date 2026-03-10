import {
    validateUserAdmin,
    validateUserId,
    validateParams,
    validateUpdateAdmin,
    validateUserProfile,
    validateChangePassword,
    validateFirstChangePassword
} from "../schemas/user-schema.js";
import { handleError } from '../utils/error-handler.js'

/**
 * Controlador de Usuarios.
 * Gestiona las peticiones HTTP relacionadas con la entidad Usuario.
 * Actúa como intermediario entre la vista (API) y la lógica de negocio (Servicio).
 */
export class UserController {

    /**
     * @param {import('../services/user_service.js').UserService} userService - Instancia del servicio de usuarios.
     */
    constructor({ userService }) {
        this.userService = userService;
    }

    /**
     * Obtiene una lista de usuarios paginados o filtrados.
     * Valida los parámetros de consulta (query params) antes de llamar al servicio.
     * * @param {import('express').Request} req - Petición HTTP (query params: search, rol, active).
     * @param {import('express').Response} res - Respuesta HTTP.
     * @returns {Promise<void>} JSON con la lista de usuarios.
     */
    getAll = async (req, res) => {
        const result = validateParams(req.query);

        if (!result.success) {
            return res.status(400).json({
                status: 'error',
                message: 'Datos invalidos',
                errors: result.error.errors
            })
        }

        try {
            const users = await this.userService.findAll(result.data);
            res.json({ message: 'success', data: users });
        } catch (error) {
            handleError(res, error);
        }
    }

    /**
     * Obtiene una lista de usuarios activos.
     * Este método es específico para cargar opciones en formularios, por eso devuelve un DTO simplificado.
     * * @param {import('express').Request} req - Petición HTTP.
     * @param {import('express').Response} res - Respuesta HTTP.
     * @returns {Promise<void>} JSON con la lista de usuarios activos.
     */
    getListUsers = async (req, res) => {
        try {
            const users = await this.userService.listUsers();
            res.json({ message: 'success', data: users });
        } catch (error) {
            handleError(res, error);
        }
    }

    /**
     * Busca un usuario por su ID único.
     * * @param {import('express').Request} req - Petición HTTP (params: id).
     * @param {import('express').Response} res - Respuesta HTTP.
     * @returns {Promise<void>} JSON con el usuario encontrado o error 404.
     */
    getById = async (req, res) => {
        const { id } = req.params;

        const idValidation = validateUserId(id);
        if (!idValidation.success) {
            return res.status(400).json({
                status: 'error',
                message: 'Datos invalidos',
                errors: idValidation.error.errors
            })

        }

        try {
            const user = await this.userService.findById(id);
            res.json({ message: 'success', data: user });
        } catch (error) {
            handleError(res, error);
        }
    }

    getProfile = async (req, res) => {
        const { id } = req.user;

        const idValidation = validateUserId(id);
        if (!idValidation.success) {
            return res.status(400).json({
                status: 'error',
                message: 'Datos invalidos',
                errors: idValidation.error.errors
            })

        }

        try {
            const user = await this.userService.findProfile(id);
            res.json({ message: 'success', data: user });
        } catch (error) {
            handleError(res, error);
        }
    }
    /**
     * Crea un nuevo usuario en el sistema.
     * Verifica si el creador es admin para asignar permisos elevados.
     * * @param {import('express').Request} req - Petición HTTP (body: datos del usuario).
     * @param {import('express').Response} res - Respuesta HTTP.
     * @returns {Promise<void>} JSON con el ID del nuevo usuario y código 201.
     */
    create = async (req, res) => {
        const result = validateUserAdmin(req.body);
        if (!result.success) {
            return res.status(400).json({
                status: 'error',
                message: 'Datos invalidos',
                errors: result.error.errors
            })
        }

        try {
            const createdByAdmin = req.user?.is_admin || false;
            const newId = await this.userService.create(result.data, createdByAdmin);

            const socket = req.app.get('io')
            socket.emit('new_user')

            res.status(201).json({
                message: 'Usuario creado exitosamente',
                id: newId
            });

        } catch (error) {
            handleError(res, error);
        }
    }

    /**
     * Actualiza los datos de un usuario existente.
     * Implementa lógica híbrida de seguridad:
     * - Admins: Pueden editar cualquier perfil usando `validateUpdateAdmin`.
     * - Usuarios: Solo pueden editar su propio perfil usando `validateUserProfile`.
     * * @param {import('express').Request} req - Petición HTTP (params: id, body: datos a actualizar).
     * @param {import('express').Response} res - Respuesta HTTP.
     */
    update = async (req, res) => {
        const { id } = req.params;
        const requester = req.user;

        const idValidation = validateUserId(id);
        if (!idValidation.success) {
            return res.status(400).json({
                status: 'error',
                message: 'ID inválido',
                errors: idValidation.error.errors
            });
        }

        let result;

        if (requester.is_admin) {
            result = validateUpdateAdmin(req.body);
        } else {

            if (id !== requester.id) {
                return res.status(403).json({
                    status: 'error',
                    message: 'No tienes permiso para editar este perfil'
                })
            }

            result = validateUserProfile(req.body)
        }

        if (!result.success) {
            return res.status(400).json({
                status: 'error',
                message: 'Datos inválidos',
                errors: result.error.errors
            });
        }

        if (Object.keys(result.data).length === 0) {
            return res.status(200).json({
                message: 'No se enviaron datos nuevos para actualizar'
            });
        }

        try {
            const updated = await this.userService.update(id, result.data);

            if (!updated) return res.status(404).json({ message: 'No se pudo actualizar' })

            const socket = req.app.get('io')
            socket.emit('user_updated')

            res.json({ message: 'Usuario actualizado correctamente' });
        } catch (error) {
            handleError(res, error);
        }
    }

    /**
         * BLANQUEO DE CONTRASEÑA (Admin).
         * Permite a un administrador forzar una nueva contraseña temporal para un usuario.
         * Esto activará el flag `requires_password_change` en la BD.
         * * @param {import('express').Request} req - Params: { id }, Body: { password, confirm_password }
         * @param {import('express').Response} res
         */
    resetPass = async (req, res) => {
        const { id } = req.params;

        const idValidation = validateUserId(id);
        if (!idValidation.success) {
            return res.status(400).json({
                status: 'error',
                message: 'ID inválido',
                errors: idValidation.error.errors
            });
        }

        const result = validateFirstChangePassword(req.body)
        if (!result.success) {
            return res.status(400).json({
                status: 'error',
                message: 'Datos inválidos',
                errors: result.error.errors
            });
        }

        try {
            const updated = await this.userService.resetPass(idValidation.data, result.data.password);

            if (!updated) return res.status(404).json({ message: 'No se pudo actualizar. Usuario no encontrado.' })

            res.json({ message: 'Contraseña reseteada. El usuario deberá cambiarla al ingresar.' });

        } catch (error) {
            this.handleError(res, error);
        }
    }

    /**
     * CAMBIO DE CONTRASEÑA (Usuario).
     * Maneja inteligentemente dos situaciones basándose en el estado del usuario:
     * 1. **Primer Login:** Si `requires_password_change` es true, solo pide pass nueva y desactiva el flag.
     * 2. **Voluntario:** Si ya está activo, pide pass actual + nueva para mayor seguridad.
     * * @param {import('express').Request} req - User (token), Body: { password, confirm_password, [old_password] }
     * @param {import('express').Response} res
     */
    changePass = async (req, res) => {
        const { id } = req.user;
        const requester = req.user;

        const idValidation = validateUserId(id);
        if (!idValidation.success) {
            return res.status(400).json({
                status: 'error',
                message: 'ID inválido',
                errors: idValidation.error.errors
            });
        }

        const isFirstLogin = Boolean(requester.requires_password_change)

        let updated;

        try {

            if (isFirstLogin) {
                const result = validateFirstChangePassword(req.body)

                if (!result.success) {
                    return res.status(400).json({
                        status: 'error',
                        message: 'Datos inválidos',
                        errors: result.error.errors
                    });
                }

                updated = await this.userService.firstChangePass(idValidation.data, result.data.password);
                res.clearCookie('access_token', { path: '/' });
            } else {

                const result = validateChangePassword(req.body)

                if (!result.success) {
                    return res.status(400).json({
                        status: 'error',
                        message: 'Datos inválidos',
                        errors: result.error.errors
                    });
                }
                updated = await this.userService.changePass(idValidation.data, result.data.old_password, result.data.password);
            }

            if (!updated) return res.status(404).json({ message: 'No se pudo actualizar' })
            const message = isFirstLogin
                ? 'Cuenta activada y contraseña establecida correctamente'
                : 'Contraseña actualizada correctamente';

            res.json({ message });

        } catch (error) {
            handleError(res, error);
        }
    }

    /**
     * Cambia el estado de un usuario (Activo/Inactivo).
     * Nota: Falta validación estricta de Admin en este bloque de código.
     * Se recomienda agregar `if (!req.user.is_admin)` al inicio.
     * * @param {import('express').Request} req - Petición HTTP (params: id, body: status).
     * @param {import('express').Response} res - Respuesta HTTP.
     */
    toggleActive = async (req, res) => {
        const { id } = req.params;
        const { status } = req.body;

        try {
            if (status === true) {
                await this.userService.activate(id);
            } else {
                await this.userService.deactivate(id);
            }

            const socket = req.app.get('io')
            socket.emit('user_toggle')
            res.json({ message: `Usuario ${status ? 'activado' : 'desactivado'} correctamente` });
        } catch (error) {
            handleError(res, error);
        }
    }
}
