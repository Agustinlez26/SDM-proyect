import { NotFoundError, ValidationError } from "../utils/errors.js"
import bcrypt from 'bcryptjs';

/**
 * Servicio de Usuarios.
 * Contiene toda la lógica de negocio para la administración de usuarios.
 * Se encarga de validaciones, encriptación y coordinación con el modelo.
 */
export class UserService {

    /**
     * @param {import('../models/user.js').User} userModel - Instancia del modelo User.
     * @param {import('../models/branch.js').Branch} branchModel - Instancia del modelo User.
     */
    constructor({ userModel, branchModel }) {
        this.userModel = userModel
        this.branchModel = branchModel
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
        const existsBranch = await this.branchModel.exists(data.branch_id)
        if (!existsBranch) throw new ValidationError('No existe esta sucursal')
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

    async findProfile(id) {
        const user = await this.userModel.findProfile(id)
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
         *  CAMBIO OBLIGATORIO (First Login)
         * Se ejecuta cuando el usuario ingresa por primera vez o tras un blanqueo.
         * * LÓGICA:
         * - Valida que el usuario exista.
         * - Hashea la nueva contraseña.
         * - Actualiza la contraseña y **DESACTIVA (0)** la obligación de cambio.
         * * @param {string} id - UUID del usuario.
         * @param {string} newPassword - Nueva contraseña elegida por el usuario.
         * @returns {Promise<boolean>} True si la actualización fue exitosa.
         * @throws {NotFoundError} Si el usuario no existe.
         */
    async firstChangePass(id, newPassword) {
        const validation = await this.userModel.exists(id)
        if (!validation) throw new NotFoundError('No existe un usuario con ese Identificador')

        const hashedPassword = await bcrypt.hash(newPassword, 10);
        return await this.userModel.changePassword(id, hashedPassword, 0)
    }

    /**
     *  BLANQUEO ADMINISTRATIVO (Admin Reset)
     * Se ejecuta cuando el Admin restaura la cuenta de un usuario.
     * * LÓGICA:
     * - Valida que el usuario exista.
     * - Hashea la contraseña temporal provista por el Admin.
     * - Actualiza la contraseña y **ACTIVA (1)** la obligación de cambio.
     * * @param {string} id - UUID del usuario a resetear.
     * @param {string} newPassword - Contraseña temporal.
     * @returns {Promise<boolean>} True si la actualización fue exitosa.
     * @throws {NotFoundError} Si el usuario no existe.
     */
    async resetPass(id, newPassword) {
        const validation = await this.userModel.exists(id)
        if (!validation) throw new NotFoundError('No existe un usuario con ese Identificador')

        const hashedPassword = await bcrypt.hash(newPassword, 10);
        return await this.userModel.changePassword(id, hashedPassword, 1)
    }

    /**
         *  CAMBIO VOLUNTARIO (Perfil)
         * Se ejecuta cuando el usuario decide cambiar su contraseña desde su perfil.
         * - Busca al usuario por email.
         * - **SEGURIDAD:** Verifica que la `oldPassword` coincida con la actual.
         * - Hashea la nueva contraseña.
         * - Actualiza la contraseña y **MANTIENE DESACTIVADA (0)** la obligación.
         * * @param {string} email - Email del usuario (extraído del token o sesión).
         * @param {string} oldpassword - Contraseña actual para validar identidad.
         * @param {string} newPassword - Nueva contraseña deseada.
         * @returns {Promise<boolean>} True si la actualización fue exitosa.
         * @throws {NotFoundError} Si el usuario no existe.
         * @throws {ValidationError} Si la contraseña actual es incorrecta.
         */
    async changePass(id, oldpassword, newPassword) {
        const validation = await this.userModel.findPassById(id)
        if (!validation) throw new NotFoundError('No existe un usuario con ese Identificador')
        const passValid = await bcrypt.compare(oldpassword, validation.password)
        if (!passValid) throw new ValidationError('La contraseña vieja no es igual a la del usuario')

        const hashedPassword = await bcrypt.hash(newPassword, 10);
        return await this.userModel.changePassword(id, hashedPassword, 0)
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