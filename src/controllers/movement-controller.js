import { de } from "zod/locales"
import { validateMovement, validateDetailMovement, validateParams } from "../schemas/movement-schema.js"
import { validateId } from "../schemas/shared-schema.js"
import { handleError } from "../utils/error-handler.js"

/**
 * Controlador de Movimientos (MovementController).
 * * Responsabilidades:
 * 1. Recibir peticiones HTTP (GET, POST).
 * 2. Validar la estructura de los datos de entrada (Zod Schemas).
 * 3. Aplicar reglas de seguridad de capa de presentación (¿Es Admin? ¿Es su sucursal?).
 * 4. Delegar la lógica de negocio al MovementService.
 * 5. Responder al cliente con el formato estandarizado JSON.
 */
export class MovementController {

    /**
     * Inyección de dependencias.
     * @param {Object} dependencies
     * @param {MovementService} dependencies.movementService
     */
    constructor({ movementService }) {
        this.movementService = movementService
    }

    /**
         * Obtiene el historial de movimientos con filtros y paginación.
         * * * Regla de Seguridad:
         * - Admin: Puede ver movimientos de todas las sucursales.
         * - Usuario: Se fuerza el filtro para mostrar SOLO movimientos donde su sucursal 
         * sea Origen o Destino.
         * * @param {Object} req - Request de Express (filtros en req.query).
         * @param {Object} res - Response de Express.
         */
    getAll = async (req, res) => {
        const params = validateParams(req.query)
        if (!params.success) return res.status(400).json({
            status: 'error',
            message: 'Parametros de filtrado invalidos',
            error: params.error.errors
        })

        if (!req.user.is_admin) {
            params.origin_branch_id = req.user.branch_id
            params.destination_branch_id = req.user.branch_id
        }

        try {
            const movements = await this.movementService.findAll(params.data)
            res.json({ status: 'success', data: movements })
        } catch (error) {
            handleError(res, error)
        }
    }

    /**
     * Obtiene un movimiento específico por ID.
     * * * Regla de Seguridad:
     * - Verifica si el usuario tiene permiso para ver este movimiento específico
     * (si pertenece a su sucursal).
     * * @param {Object} req - Request (ID en req.params.id).
     * @param {Object} res - Response.
     */
    getById = async (req, res) => {
        const result = validateId(req.params.id)
        if (!result.success) return res.status(400).json({
            status: 'error',
            message: 'El id ingresado es invalido',
            error: result.error.errors
        })

        try {
            const movement = await this.movementService.findById(result.data)
            if (!req.user.is_admin) {
                const validateUser = (movement.origin_branch_id === req.user.branch_id || movement.destination_branch_id === req.user.branch_id)
                if (!validateUser) {
                    return res.status(403).json({
                        status: 'error',
                        message: 'No tienes permiso para ver este movimiento',
                    })
                }
            }

            res.json({ status: 'success', data: movement })
        } catch (error) {
            handleError(res, error)
        }
    }

    /**
     * Obtiene los productos (detalles) asociados a un movimiento.
     * * @param {Object} req - Request (ID en req.params.id).
     * @param {Object} res - Response.
     */
    getDetails = async (req, res) => {
        const result = validateId(req.params.id)
        if (!result.success) return res.status(400).json({
            status: 'error',
            message: 'El id ingresado es invalido',
            error: result.error.errors
        })

        try {
            const details = await this.movementService.findDetails(result.data)
            res.json({ status: 'success', data: details })
        } catch (error) {
            handleError(res, error)
        }
    }

    /**
     * Endpoint para dashboard: muestra los últimos 5 movimientos.
     * Si es usuario normal, filtra automáticamente por su sucursal.
     */
    getRecent = async (req, res) => {
        let branch_id = null
        if (!req.user.is_admin) {
            branch_id = req.user.branch_id
        }

        try {
            const recentMovements = await this.movementService.findRecent(branch_id)
            res.json({ status: 'success', data: recentMovements })
        } catch (error) {
            handleError(res, error)
        }
    }

    getShipmentsInProcess = async (req, res) => {
        let branch_id = null
        if (!req.user.is_admin) {
            branch_id = req.user.branch_id
        }

        try {
            const recentMovements = await this.movementService.findShipmentsInProcess(branch_id)
            res.json({ status: 'success', data: recentMovements })
        } catch (error) {
            handleError(res, error)
        }
    }

    /**
     * Crea un nuevo movimiento (Ingreso, Egreso o Envío).
     * * * Validaciones:
     * 1. Schema de Cabecera (type, dates, etc).
     * 2. Schema de Detalles (productos y cantidades).
     * 3. Roles:
     * - Admin: Acceso total.
     * - Usuario: SOLO puede crear 'EGRESO' (Ventas) desde SU sucursal.
     * * @param {Object} req - Request (Datos en req.body).
     * @param {Object} res - Response.
     */
    create = async (req, res) => {
        console.log(req.body)
        const result = validateMovement(req.body)
        console.log("DATOS LIMPIOS POR ZOD:", result.data)

        if (!result.success) {
            return res.status(400).json({
                status: 'error',
                message: 'Datos enviados inválidos',
                errors: result.error.errors
            });
        }

        const { type, destination_branch_id, details } = result.data;

        const userId = req.user.id;
        const userBranchId = req.user.branch_id;
        const userRole = req.user.role;
        const MAIN_BRANCH_ID = 1;

        let origin = null;
        let destination = null;

        if (type === 'ingreso') {
            if (userRole !== 'admin') {
                return res.status(403).json({ status: 'error', message: 'Solo los administradores pueden hacer ingresos.' });
            }
            origin = null;
            destination = MAIN_BRANCH_ID;
        }
        else if (type === 'egreso') {
            if (!userBranchId) {
                return res.status(403).json({
                    status: 'error',
                    message: 'Tu usuario no tiene una sucursal asignada para realizar egresos.'
                });
            }
            origin = userBranchId;
            destination = null;
        }
        else if (type === 'envio') {
            if (userBranchId !== MAIN_BRANCH_ID) {
                return res.status(403).json({ status: 'error', message: 'Los envíos solo pueden realizarse desde la Sucursal Principal.' });
            }
            origin = MAIN_BRANCH_ID;
            destination = destination_branch_id;
        }

        const dbPayload = {
            receipt_number: `MOV-${Date.now()}`,
            type: type,
            user_id: userId,
            origin_branch_id: origin,
            destination_branch_id: destination,
            status: type === 'envio' ? 'en_progreso' : 'entregado'
        };

        try {
            await this.movementService.create(dbPayload, details);
            res.status(201).json({ status: 'success', message: 'Operación registrada correctamente' });
        } catch (error) {
            handleError(res, error);
        }
    }

    /**
     * Avanza el estado de un envío (Máquina de estados).
     * * * Flujo:
     * - Pendiente -> (Despachar) -> En Proceso
     * - En Proceso -> (Recibir) -> Entregado
     * * @param {Object} req - Request (ID en req.params.id).
     * @param {Object} res - Response.
     */
    changeStatus = async (req, res) => {
        const { movementId } = req.params.id
        try {
            const result = await this.movementService.changeStatusShipment(movementId)
            res.json({
                status: 'success',
                message: result.message
            })
        } catch (error) {
            handleError(res, error)
        }
    }
}