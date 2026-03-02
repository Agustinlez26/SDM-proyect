import { validateLogin } from '../schemas/user-schema.js';
import { handleError } from '../utils/error-handler.js'

/**
 * Controlador de Autenticación.
 * Gestiona el inicio y cierre de sesión utilizando JWT y Cookies HTTP-Only.
 * Este controlador es Stateless: delega la lógica al servicio y gestiona la capa HTTP.
 */
export class AuthController {

    /**
     * @param {import('../services/auth_service.js').AuthService} authService - Servicio de autenticación.
     */
    constructor({ authService }) {
        this.authService = authService;
    }

    /**
     * Inicia sesión en el sistema.
     * 1. Valida el formato del email y password.
     * 2. Llama al servicio para verificar credenciales.
     * 3. Genera una Cookie segura con el token JWT.
     * * @param {import('express').Request} req - Body: { email, password }
     * @param {import('express').Response} res - Retorna el usuario (sin password) y setea la cookie.
     */
    login = async (req, res) => {
        const validate = validateLogin(req.body)
        if (!validate.success) {
            return res.status(400).json({
                status: 'error',
                message: 'Datos invalidos',
                errors: validate.error.errors
            })
        }

        try {
            const { user, token } = await this.authService.login(validate.data.email, validate.data.password);

            res.cookie('access_token', token, {
                httpOnly: true,
                secure: process.env.NODE_ENV === 'production',
                sameSite: 'strict',
                maxAge: 1000 * 60 * 60 * 8
            });

            res.status(200).json({
                message: 'Inicio de sesión exitoso'
            });

        } catch (error) {
            handleError(res, error);
        }
    }

    /**
     * Cierra la sesión del usuario.
     * Elimina la cookie 'access_token' del navegador con las mismas opciones que se usaron para crearla.
     * @param {import('express').Request} req 
     * @param {import('express').Response} res 
     */
    logout = async (req, res) => {
        try {
            res.clearCookie('access_token', {
                httpOnly: true,
                secure: process.env.NODE_ENV === 'production',
                sameSite: 'strict',
                path: '/'
            });
            
            // Si viene de un formulario, redirige a login
            // Si es una petición AJAX, devuelve JSON
            if (req.headers.accept && req.headers.accept.includes('application/json')) {
                return res.status(200).json({ message: 'Sesión cerrada correctamente' });
            }
            
            return res.redirect('/login');
        } catch (error) {
            console.error('Error en logout:', error);
            return res.status(500).json({ status: 'error', message: 'Error al cerrar sesión' });
        }
    }
}