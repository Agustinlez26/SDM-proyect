import { ValidationError, NotFoundError } from "../utils/errors.js"

/**
 * Servicio de Movimientos (MovementService).
 * * Contiene toda la lógica de negocio, validaciones de stock y orquestación de flujos.
 * Actúa como intermediario entre el Controlador (HTTP) y el Modelo (Base de Datos).
 */
export class MovementService {
    #MAIN_BRANCH_ID = 1
    #PAGE_SIZE = 20

    constructor({ movementModel, branchModel, stockModel }) {
        this.movementModel = movementModel
        this.branchModel = branchModel
        this.stockModel = stockModel
    }

    /**
         * Busca movimientos aplicando filtros y paginación matemática.
         * @param {string} search - Término de búsqueda (por comprobante).
         * @param {string} type - Tipo de movimiento (ingreso, egreso, envio).
         * @param {number} origin - ID sucursal origen.
         * @param {number} destination - ID sucursal destino.
         * @param {string} user - ID del usuario creador.
         * @param {number} page - Número de página actual (default 1).
         * @returns {Promise<Object[]>} Lista de movimientos.
         */
    async findAll({ search, type, origin_branch_id, destination_branch_id, employee_branch_id, user, date_start, date_end, page }) {
        const limit = this.#PAGE_SIZE
        const pageNumber = Math.max(1, Number(page) || 1)
        const offset = Math.max(0, (pageNumber - 1) * limit)

        const filters = {
            type,
            origin_branch_id,
            destination_branch_id,
            employee_branch_id, 
            date_start,
            date_end,
            user_id: user
        }

        return await this.movementModel.findAll({ search, filters, offset, limit })
    }

    /**
     * Busca un movimiento por su ID lanzando error si no existe.
     * * @param {number} id 
     * @returns {Promise<Object>} El movimiento encontrado.
     * @throws {NotFoundError} Si el movimiento no existe.
     */
    async findById(id) {
        const movement = await this.movementModel.findById(id)
        if (!movement) throw new NotFoundError('No se encontro ningun un movimiento con ese id')
        return movement
    }

    /**
     * Busca los detalles (productos) de un movimiento.
     * * @param {number} movementId 
     * @returns {Promise<Object[]>} Lista de detalles.
     * @throws {NotFoundError} Si no hay detalles.
     */
    async findDetails(movementId) {
        const movement = await this.movementModel.findDetails(movementId)
        if (!movement) throw new NotFoundError('No se encontro ningun detalle de movimiento con ese id')
        return movement
    }

    /**
     * Obtiene los movimientos más recientes para el dashboard.
     * * @param {number|null} branch_id - Filtrar por sucursal (opcional).
     */
    async findRecent(branch_id = null) {
        return await this.movementModel.findRecent(branch_id)
    }

    /**
     * Obtiene los envios en estado de "en proceso"
     * * @param {number|null} branch_id - Filtra por sucursal del usuario en caso de no ser admin (decido en el controller)
     */
    async findShipmentsInProcess(branchId = null) {
        if (branchId) {
            return await this.movementModel.findShipmentsInProcess(branchId)
        }
        return await this.movementModel.findShipmentsInProcess()
    }

    /**
     * Lógica central de creación de movimientos.
     * Prepara los datos según el tipo (INGRESO, EGRESO, ENVIO) y valida stock antes de llamar al modelo.
     * * 1. INGRESO: Entra a Casa Central (ID 1). Status: Entregado. Stock: Suma.
     * 2. EGRESO: Sale de Origen. Status: Entregado. Stock: Resta.
     * 3. ENVIO: De Casa Central a Sucursal X. Status: Pendiente. Stock: Resta en origen.
     * * @param {Object} data - Datos del movimiento.
     * @param {Array} details - Array de productos.
     * @returns {Promise<Object>} { id, message }
     */
    async create(data, details) {
        if (!details || details.length === 0) throw new ValidationError('Sin productos')

        let stockAction = null
        let targetBranchForStock = null

        if (data.type === 'ingreso') {
            data.origin_branch_id = null
            data.destination_branch_id = this.#MAIN_BRANCH_ID
            data.status = 'entregado'

            stockAction = 'ADD'
            targetBranchForStock = this.#MAIN_BRANCH_ID

        } else if (data.type === 'egreso') {

            if (!data.origin_branch_id) throw new ValidationError('Falta sucursal origen')
            data.destination_branch_id = null
            data.status = 'entregado'

            await this.#validateStockAvailability(data.origin_branch_id, details)

            stockAction = 'SUBTRACT'
            targetBranchForStock = data.origin_branch_id

        } else if (data.type === 'envio') {
            data.origin_branch_id = this.#MAIN_BRANCH_ID

            if (!data.destination_branch_id) throw new ValidationError('Falta sucursal destino')
            if (data.destination_branch_id === this.#MAIN_BRANCH_ID) throw new ValidationError('No puedes enviarte a ti mismo')

            const destExists = await this.branchModel.exists(data.destination_branch_id)
            if (!destExists) throw new NotFoundError('Sucursal destino no existe')

            await this.#validateStockAvailability(this.#MAIN_BRANCH_ID, details)

            data.status = 'pendiente'

            stockAction = 'SUBTRACT'
            targetBranchForStock = this.#MAIN_BRANCH_ID
        }

        const id = await this.movementModel.createTransaction(
            data,
            details,
            stockAction,
            targetBranchForStock
        );

        return { id, message: 'Movimiento procesado' }
    }

    /**
     * Avanza el estado de un envío (Máquina de estados).
     * * Flujo: PENDIENTE -> [Despachar] -> EN_PROCESO -> [Recibir] -> ENTREGADO.
     * - Al despachar (Pendiente -> En Proceso): Solo cambia el estado (stock ya fue descontado al crear).
     * - Al recibir (En Proceso -> Entregado): Suma stock en destino.
     * * @param {number} movementId 
     * @returns {Promise<Object>} Mensaje de éxito.
     */
    async changeStatusShipment(movementId) {
        const movement = await this.movementModel.findById(movementId)
        if (!movement) throw new NotFoundError('Movimiento no encontrado')

        if (movement.type !== 'envio') throw new ValidationError('Solo los envíos se pueden cambiar el estado')
        if (movement.status === 'entregado') throw new ValidationError('Este envío ya está concluido')

        const details = await this.movementModel.findDetails(movementId)
        let message = ''

        if (movement.status === 'pendiente') {
            await this.movementModel.dispatchShipment(
                movementId,
                details
            )
            message = 'Envío despachado (En tránsito)'
        } else {
            await this.movementModel.receiveShipment(
                movementId,
                details
            )
            message = 'Envío recibido y stock actualizado en destino'
        }

        return { message }
    }

    /**
     * Método Privado: Valida que exista stock suficiente en una sucursal.
     * Se ejecuta en paralelo para todos los items usando Promise.all.
     * * @param {number} branchId 
     * @param {Array} details 
     * @private
     */
    async #validateStockAvailability(branchId, details) {
        const validations = details.map(async (item) => {

            const currentStock = await this.stockModel.findByProductAndBranch(item.product_id, branchId)

            if (!currentStock) {
                throw new NotFoundError(`El producto ID ${item.product_id} no existe en la sucursal de origen`)
            }

            if (currentStock.quantity < item.quantity) {
                throw new NotFoundError(
                    `Stock insuficiente para el producto '${currentStock.product_name || item.product_id}'. 
                    Disponible: ${currentStock.quantity}, Solicitado: ${item.quantity}`
                )
            }
        })

        await Promise.all(validations)
    }
}
