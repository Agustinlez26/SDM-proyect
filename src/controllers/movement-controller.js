
import { validateMovement, validateParams } from "../schemas/movement-schema.js"
import { validateId } from "../schemas/shared-schema.js"
import { handleError } from "../utils/error-handler.js"
const hasGlobalStockAccess = user => user.is_admin || user.app_role === 'stock_manager'

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
        const params = validateParams(req.query);
        if (!params.success) return res.status(400).json({
            status: 'error',
            message: 'Parametros de filtrado invalidos',
            error: params.error.errors
        });

        const queryData = params.data;

        if (!hasGlobalStockAccess(req.user)) {

            if (queryData.type === 'ingreso') {
                return res.status(403).json({
                    status: 'error',
                    message: 'No tienes permiso para ver los ingresos.'
                });
            }

            if (queryData.type === 'envio') {
                queryData.employee_branch_id = req.user.branch_id;
            }

            else if (queryData.type === 'egreso') {
                queryData.origin_branch_id = req.user.branch_id;
            }
            else {
                queryData.employee_branch_id = req.user.branch_id;
            }
        }

        try {
            const movements = await this.movementService.findAll(queryData);
            res.json({ status: 'success', data: movements });
        } catch (error) {
            handleError(res, error);
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

            if (!movement) {
                return res.status(404).json({
                    status: 'error',
                    message: 'Movimiento no encontrado'
                })
            }

            if (!hasGlobalStockAccess(req.user)) {
                const validateUser = (movement.origin_branch_id == req.user.branch_id || movement.destination_branch_id == req.user.branch_id)
                if (!validateUser) {
                    return res.status(403).json({
                        status: 'error',
                        message: 'No tienes permiso para ver este movimiento',
                    })
                }
            }

            delete movement.origin_branch_id;
            delete movement.destination_branch_id;

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
            const movement = await this.movementService.findById(result.data)

            if (!movement) {
                return res.status(404).json({
                    status: 'error',
                    message: 'Movimiento no encontrado'
                })
            }

            if (!hasGlobalStockAccess(req.user)) {
                const validateUser = (movement.origin_branch_id == req.user.branch_id || movement.destination_branch_id == req.user.branch_id)
                if (!validateUser) {
                    return res.status(403).json({
                        status: 'error',
                        message: 'No tienes permiso para ver los detalles de este movimiento',
                    })
                }
            }

            const details = await this.movementService.findDetails(result.data)

            const cleanDetails = details.map(item => {
                delete item.id;
                return item;
            });

            res.json({ status: 'success', data: cleanDetails })
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
        if (!hasGlobalStockAccess(req.user)) {
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
        if (!hasGlobalStockAccess(req.user)) {
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

        const result = validateMovement(req.body)

        if (!result.success) {
            return res.status(400).json({
                status: 'error',
                message: 'Datos enviados inválidos',
                errors: result.error.errors
            });
        }

        const { idempotency_key, type, origin_branch_id, destination_branch_id, egress_reason, sale_channel, explanation, details } = result.data;

        const userId = req.user.id;
        const userBranchId = req.user.branch_id;
        const userRole = req.user.role;
        const MAIN_BRANCH_ID = 1;

        let origin = null;
        let destination = null;

        if (type === 'ingreso') {
            if (!hasGlobalStockAccess(req.user)) {
                return res.status(403).json({ status: 'error', message: 'Solo los administradores pueden hacer ingresos.' });
            }
            origin = null;
            destination = MAIN_BRANCH_ID;
        }
        else if (type === 'egreso') {
            origin = hasGlobalStockAccess(req.user) ? (origin_branch_id || userBranchId) : userBranchId;
            if (!origin) {
                return res.status(403).json({
                    status: 'error',
                    message: 'Tu usuario no tiene una sucursal asignada para realizar egresos.'
                });
            }
            destination = null;
        }
        else if (type === 'envio') {
            origin = hasGlobalStockAccess(req.user) ? (origin_branch_id || userBranchId || MAIN_BRANCH_ID) : userBranchId;
            if (!origin) {
                return res.status(403).json({ status: 'error', message: 'Los envíos solo pueden realizarse desde la Sucursal Principal.' });
            }
            destination = destination_branch_id;
            if (Number(origin) === Number(destination)) {
                return res.status(400).json({ status: 'error', message: 'No se puede enviar stock a la misma sucursal de origen.' });
            }
        }

        const dbPayload = {
            receipt_number: `MOV-${Date.now()}`,
            request_key: idempotency_key,
            type: type,
            egress_reason: type === 'egreso' ? egress_reason : null,
            sale_channel: type === 'egreso' && egress_reason === 'exchange' ? sale_channel : null,
            explanation: type === 'ingreso' ? null : explanation,
            user_id: userId,
            origin_branch_id: origin,
            destination_branch_id: destination,
            status: type === 'envio' ? 'en_progreso' : 'entregado'
        };

        try {
            await this.movementService.create(dbPayload, details);

            const io = req.app.get('io')
            io.emit('new_movement')

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
        const resultId = validateId(req.params.id)
        if (!resultId.success) return res.status(400).json({
            status: 'error',
            message: 'El id ingresado es invalido',
            error: resultId.error.errors
        })

        try {
            const result = await this.movementService.changeStatusShipment(resultId.data, req.user)

            const io = req.app.get('io')
            io.emit('movements_updated')

            res.json({
                status: 'success',
                message: result.message
            })
        } catch (error) {
            handleError(res, error)
        }
    }
}
