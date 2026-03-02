import { validateBranch, validateUpdateBranch } from '../schemas/branch-schema.js'
import { validateId } from '../schemas/shared-schema.js'
import { handleError } from '../utils/error-handler.js'

/**
 * Controlador para la gestión de Sucursales.
 * Actúa como punto de entrada para las peticiones HTTP, valida los datos de entrada (Body/Params)
 * y delega la lógica de negocio al BranchService.
 */
export class BranchController {

    /**
     * Inicializa el controlador inyectando el servicio necesario.
     * @param {Object} dependencies
     * @param {import('../services/branch_service.js').BranchService} dependencies.branchService
     */
    constructor({ branchService }) {
        this.branchService = branchService
    }

    /**
     * Crea una nueva sucursal.
     * Valida el esquema de datos con Zod antes de llamar al servicio.
     * * @param {import('express').Request} req - Body contiene: { name, address, city_id, province_id, branch_type_id }
     * @param {import('express').Response} res
     */
    create = async (req, res) => {
        const result = validateBranch(req.body)

        if (!result.success) {
            return res.status(400).json({
                status: 'error',
                message: 'Datos inválidos',
                errors: result.error.errors
            })
        }

        try {
            const newId = await this.branchService.create(result.data)
            const newBranch = await this.branchService.getById(newId)

            res.status(201).json({
                status: 'success',
                message: 'Sucursal creada correctamente',
                data: newBranch
            })
        } catch (error) {
            handleError(res, error)
        }
    }

    /**
     * Obtiene el listado de todas las sucursales.
     * Soporta filtros a través de query params (ej: ?activeOnly=true).
     * * @param {import('express').Request} req 
     * @param {import('express').Response} res
     */
    getAll = async (req, res) => {
        try {
            const branches = await this.branchService.getAll(req.query)
            res.json({ status: 'success', data: branches })
        } catch (error) {
            handleError(res, error)
        }
    }

    /**
     * Obtiene el catálogo de sucursales activas (id y name) para llenar selectores en el frontend.
     * * @param {import('express').Request} req 
     * @param {import('express').Response} res
     */
    getCatalog = async (req, res) => {
        try {
            const catalog = await this.branchService.getCatalog()
            res.json({ status: 'success', data: catalog })
        } catch (error) {
            handleError(res, error)
        }
    }

    /**
     * Obtiene una sucursal específica por su ID.
     * * @param {import('express').Request} req - Params: { id }
     * @param {import('express').Response} res
     */
    getById = async (req, res) => {
        const result = validateId(req.params.id)
        if (!result.success) return res.status(400).json({ status: 'error', message: 'ID inválido' })

        try {
            const branch = await this.branchService.getById(result.data)
            res.json({ status: 'success', data: branch })
        } catch (error) {
            handleError(res, error)
        }
    }

    /**
     * Obtiene los tipos de sucursales disponibles.
     * Útil para llenar selectores en el frontend con opciones de tipo de sucursal.
     * * @param {import('express').Request} req 
     * @param {import('express').Response} res 
     */
    getTypes = async (req, res) => {
        try {
            const types = await this.branchService.getTypes()
            res.json({ status: 'success', data: types })
        } catch (error) {
            handleError(res, error)
        }
    }

    /**
     * Actualiza los datos de una sucursal existente.
     * Utiliza validación parcial (PATCH), permitiendo enviar solo los campos a modificar.
     * * @param {import('express').Request} req - Params: { id }, Body: { ...campos a editar }
     * @param {import('express').Response} res
     */
    update = async (req, res) => {
        const idResult = validateId(req.params.id)
        if (!idResult.success) return res.status(400).json({ status: 'error', message: 'ID inválido' })

        const dataResult = validateUpdateBranch(req.body)
        if (!dataResult.success) {
            return res.status(400).json({
                status: 'error',
                message: 'Datos inválidos',
                errors: dataResult.error.errors
            })
        }

        try {
            await this.branchService.update(idResult.data, dataResult.data)
            res.json({ status: 'success', message: 'Sucursal actualizada correctamente' })
        } catch (error) {
            handleError(res, error)
        }
    }

    /**
     * Realiza un borrado lógico de la sucursal (Soft Delete).
     * * @param {import('express').Request} req - Params: { id }
     * @param {import('express').Response} res
     */
    delete = async (req, res) => {
        const result = validateId(req.params.id)
        if (!result.success) return res.status(400).json({ status: 'error', message: 'ID inválido' })

        try {
            await this.branchService.delete(result.data)
            res.json({ status: 'success', message: 'Sucursal eliminada correctamente' })
        } catch (error) {
            handleError(res, error)
        }
    }

    /**
     * Alterna el estado de una sucursal (Activo <-> Inactivo).
     * Útil para reactivar sucursales eliminadas o pausar operativas temporalmente.
     * * @param {import('express').Request} req - Params: { id }
     * @param {import('express').Response} res
     */
    active = async (req, res) => {
        const result = validateId(req.params.id)
        if (!result.success) return res.status(400).json({ status: 'error', message: 'ID inválido' })

        try {
            await this.branchService.active(result.data)
            res.json({ status: 'success', message: 'Sucursal activa correctamente' })
        } catch (error) {
            handleError(res, error)
        }
    }

    // --- MÉTODOS UTILITARIOS PARA EL FRONTEND ---

    /**
     * Devuelve la lista de provincias disponibles.
     * Endpoint público o autenticado para llenar selectores en el UI.
     * * @param {import('express').Request} req 
     * @param {import('express').Response} res
     */
    getProvinces = async (req, res) => {
        try {
            const provinces = await this.branchService.getProvinces()
            res.json({ status: 'success', data: provinces })
        } catch (error) {
            handleError(res, error)
        }
    }

    /**
     * Devuelve la lista de ciudades filtradas por provincia.
     * Implementa la lógica de "Cascading Dropdown".
     * * @param {import('express').Request} req - Query Params: ?province_id=X
     * @param {import('express').Response} res
     */
    getCities = async (req, res) => {
        const { province_id } = req.query

        const result = validateId(province_id)
        if (!result.success) {
            return res.status(400).json({
                status: 'error',
                message: 'Debes enviar un province_id válido'
            })
        }

        try {
            const cities = await this.branchService.getCities(result.data)
            res.json({ status: 'success', data: cities })
        } catch (error) {
            handleError(res, error)
        }
    }
}