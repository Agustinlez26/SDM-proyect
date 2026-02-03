import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
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

        let tokenPayload;

        if (user.requires_password_change) {
            tokenPayload = {
                id: user.id,
                requires_password_change: true
            };
        } else {
            tokenPayload = {
                id: user.id,
                is_admin: user.is_admin,
                branch_id: user.branch_id
            };
        }

        const token = jwt.sign(tokenPayload, process.env.JWT_SECRET, {
            expiresIn: '8h'
        });

        const { password: _, ...userWithoutPassword } = user;

        return {
            user: userWithoutPassword,
            token
        };
    }
}