import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import crypto from 'crypto'
import { AuthenticationError } from '../utils/errors.js';

export class AuthService {
    constructor({ userModel }) {
        this.userModel = userModel
    }

    /**
     * Verifica las credenciales del usuario y genera un token de sesión.
     * @param {string} email 
     * @param {string} password 
     * @returns {Promise<{user: Object, token: string}>} Usuario (sin pass) y Token.
     * @throws {AuthenticationError} Si las credenciales son inválidas o el usuario está inactivo.
     */
    async login(email, password) {
        const user = await this.userModel.findByEmail(email);

        if (!user) {
            throw new AuthenticationError('Credenciales inválidas');
        }

        if (!user.is_active) {
            throw new AuthenticationError('El usuario está desactivado. Contacte al administrador.');
        }

        const isValid = await bcrypt.compare(password, user.password);

        if (!isValid) {
            throw new AuthenticationError('Credenciales inválidas');
        }

        const sessionId = crypto.randomUUID();
        const resultSession = await this.userModel.login(user.id, sessionId)

        if (!resultSession) throw new AuthenticationError('Ocurrio un error en asignacion de sesion');

        let tokenPayload;

        if (user.requires_password_change) {
            tokenPayload = {
                id: user.id,
                session_id: sessionId,
                requires_password_change: true,
                name: user.full_name,
                email: user.email
            };
        } else {
            tokenPayload = {
                id: user.id,
                session_id: sessionId,
                name: user.full_name,
                email: user.email,
                is_admin: user.is_admin,
                branch_id: user.branch_id,
                role: user.is_admin ? 'admin' : 'empleado'
            };
        }

        const token = jwt.sign(tokenPayload, process.env.JWT_SECRET, {
            expiresIn: '4h'
        });

        const { password: _, ...userWithoutPassword } = user;

        return {
            user: userWithoutPassword,
            token
        };
    }

    /**
     * Cierra la sesión del usuario eliminando el session_id de la base de datos.
     * @param {string} userId 
     * @returns {Promise<boolean>}
     */
    async logout(userId) {
        const resultLogout = await this.userModel.logout(userId);
        if (!resultLogout) throw new AuthenticationError('Error al cerrar sesión');
    }
}
