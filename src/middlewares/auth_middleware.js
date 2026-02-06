import jwt from 'jsonwebtoken';

/**
 * Middleware de Autenticación.
 * Verifica la existencia y validez del JWT en la cookie 'access_token'.
 */
export const checkAuth = (req, res, next) => {
    try {
        const token = req.cookies.access_token;

        if (!token) {
            return res.status(401).json({ 
                status: 'error',
                message: 'No autorizado: No se encontró token de sesión' 
            });
        }
        const payload = jwt.verify(token, process.env.JWT_SECRET);
        req.user = payload;

        if (payload.requires_password_change) {

            const isChangePasswordRoute = req.originalUrl.includes('/password');

            if (!isChangePasswordRoute) {
                return res.status(403).json({
                    status: 'error',
                    message: 'Debe cambiar su contraseña obligatoriamente',
                    code: 'PASSWORD_CHANGE_REQUIRED'
                });
            }
        }

        next();

    } catch (error) {
        if (error.name === 'TokenExpiredError') {
            return res.status(401).json({ status: 'error', message: 'La sesión ha expirado' });
        }
        if (error.name === 'JsonWebTokenError') {
            return res.status(401).json({ status: 'error', message: 'Token inválido' });
        }
        
        return res.status(500).json({ status: 'error', message: 'Error interno de autenticación' });
    }
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