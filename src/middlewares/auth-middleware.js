import jwt from 'jsonwebtoken';
import { userModel } from '../config/dependencies.js';

/**
 * Middleware de Autenticación.
 * Verifica la existencia y validez del JWT en la cookie 'access_token'.
 * Si no existe token, redirige a /login.
 */
export const checkAuth = async (req, res, next) => {
    try {
        const token = req.cookies.access_token;

        if (!token) {
            return res.redirect('/login');
        }

        const payload = jwt.verify(token, process.env.JWT_SECRET);

        const userInDb = await userModel.checkSession(payload.id);

        if (!userInDb || userInDb.current_session_id !== payload.session_id) {

            res.clearCookie('access_token', { path: '/' })

            if (req.originalUrl.startsWith('/api')) {
                return res.status(401).json({
                    status: 'error',
                    message: 'Sesión caducada porque ingresaste desde otro dispositivo.'
                });
            }

            // Si estaba navegando normal (HTML), lo mandamos al login con un aviso
            return res.redirect('/login?error=sesion_concurrente');
        }

        req.user = payload;
        next();

    } catch (error) {
        if (error.name === 'TokenExpiredError' || error.name === 'JsonWebTokenError') {
            res.clearCookie('access_token', { path: '/' });

            if (req.originalUrl.startsWith('/api')) {
                return res.status(401).json({ status: 'error', message: 'Token inválido o expirado' });
            }
            return res.redirect('/login');
        }
        return res.status(500).json({ status: 'error', message: 'Error interno de autenticación' });
    }
};

/**
 * Middleware que redirige a /firstpass si el usuario necesita cambiar contraseña.
 * DEBE usarse después de checkAuth.
 */
export const requirePasswordChange = (req, res, next) => {
    if (req.user && req.user.requires_password_change) {
        return res.redirect('/firstpass');
    }
    next();
};

/**
 * Middleware que redirige a dashboard si el usuario NO necesita cambiar contraseña.
 * Usarlo solo en /firstpass para asegurar que solo pueda acceder si realmente necesita cambiar pass.
 * DEBE usarse después de checkAuth.
 */
export const allowPasswordChangeOnly = (req, res, next) => {
    if (req.user && !req.user.requires_password_change) {
        return res.redirect('/');
    }
    next();
};

/**
 * Middleware de Autorización (Solo Admin).
 * DEBE usarse después de checkAuth.
 */
export const isAdmin = (req, res, next) => {
    if (!req.user || !req.user.is_admin) {
        return res.status(403).json({
            status: 'error',
            message: 'Acceso denegado: Se requieren permisos de administrador'
        });
    }

    next();
};
