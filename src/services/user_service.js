import { NotFoundError, ValidationError } from "../utils/errors.js"
import bcrypt from 'bcryptjs';

/**
 * Servicio de Usuarios.
 * Contiene toda la lógica de negocio para la administración de usuarios.
 * Se encarga de validaciones, encriptación y coordinación con el modelo.
 */
export class UserService {

    /**
     * @param {import('../models/user_model').User} userModel - Instancia del modelo User.
     */
    constructor(userModel) {
        this.userModel = userModel
    }

    /**
     * Crea un nuevo usuario en el sistema.
     * Valida unicidad de email y encripta la contraseña.
     * @param {Object} data - Datos del usuario (incluye password en texto plano).
     * @param {boolean} createdByAdmin - Flag que viene del controlador
     * @returns {Promise<number>} ID del usuario creado.
     * @throws {ValidationError} Si el email ya está registrado.
     */
    async create(data, createdByAdmin = false) {
        const validate = await this.userModel.findByEmail(data.email)
        if (validate) throw new ValidationError('Ya existe un usuario con este email')
        const validateBranch = await this.userModel.existsInBranch(data.branch_id)
        if (validateBranch) throw new ValidationError('Ya existe un usuario en esta sucursal')

        const hashedPassword = await bcrypt.hash(data.password, 10);

        const isAdminValue = createdByAdmin ? (data.is_admin || false) : false;

        const userToCreate = {
            ...data,
            password: hashedPassword,
            is_admin: isAdminValue,
            is_active: true
        };

        return await this.userModel.create(userToCreate)
    }

    /**
     * Busca usuarios con filtros aplicados.
     * @param {Object} params
     * @param {string} [params.search] - Búsqueda por texto.
     * @param {boolean|number} [params.is_admin] - Filtro de rol.
     * @param {boolean|number} [params.is_active] - Filtro de estado.
     * @returns {Promise<Array>} Lista de usuarios (DTOs).
     */
    async findAll({ search, is_admin, is_active }) {
        const filters = {
            is_admin,
            is_active
        }

        return await this.userModel.findAll({ search, filters })
    }

    /**
     * Busca un usuario por ID.
     * @param {number} id 
     * @returns {Promise<Object>} Usuario encontrado.
     * @throws {NotFoundError} Si no existe.
     */
    async findById(id) {
        const user = await this.userModel.findById(id)
        if (!user) throw new NotFoundError('No existe un usuario con ese Identificador')
        return user
    }

    /**
     * Actualiza datos del perfil de un usuario.
     * @param {number} id 
     * @param {Object} data - Datos a actualizar.
     * @returns {Promise<boolean>} True si se actualizó.
     * @throws {NotFoundError} Si el usuario no existe.
     */
    async update(id, data) {
        const validation = await this.userModel.exists(id)
        if (!validation) throw new NotFoundError('No existe un usuario con ese Identificador')
        const updateData = {
            ...data
        }

        return await this.userModel.update(id, updateData)
    }

    /**
     * Gestiona el cambio de contraseña OBLIGATORIO (primer login).
     * @param {number} id 
     * @param {string} newPassword - Nueva contraseña en texto plano.
     * @returns {Promise<boolean>}
     */
    async firstChangePass(id, newPassword) {
        const validation = await this.userModel.exists(id)
        if (!validation) throw new NotFoundError('No existe un usuario con ese Identificador')

        const hashedPassword = await bcrypt.hash(newPassword, 10);
        return await this.userModel.changePassword(id, hashedPassword, true)
    }

    /**
     * Gestiona el cambio de contraseña VOLUNTARIO (perfil).
     * @param {number} id 
     * @param {string} newPassword - Nueva contraseña en texto plano.
     * @returns {Promise<boolean>}
     */
    async changePass(id, newPassword) {
        const validation = await this.userModel.exists(id)
        if (!validation) throw new NotFoundError('No existe un usuario con ese Identificador')

        const hashedPassword = await bcrypt.hash(newPassword, 10);
        return await this.userModel.changePassword(id, hashedPassword, false)
    }

    /**
     * Activa un usuario (Borrado lógico inverso).
     * @param {number} id 
     */
    async activate(id) {
        const validation = await this.userModel.exists(id)
        if (!validation) throw new NotFoundError('No existe un usuario con ese Identificador')
        return await this.userModel.updateStatus(id, true)
    }

    /**
     * Desactiva un usuario (Borrado lógico).
     * @param {number} id 
     */
    async deactivate(id) {
        const validation = await this.userModel.exists(id)
        if (!validation) throw new NotFoundError('No existe un usuario con ese Identificador')
        return await this.userModel.updateStatus(id, false)
    }
}