const channels = new Set(['mercado_libre', 'tienda_nube', 'mayorista', 'merchandising'])
const positiveInt = value => Number.isInteger(Number(value)) && Number(value) > 0
const fail = (res, error) => res.status(400).json({ status: 'error', message: error.message || 'Pedido invalido' })

export class OrderController {
    constructor({ orderModel }) { this.model = orderModel }
    #branchFor(req, requested) { return req.user.role === 'admin' ? Number(requested) : Number(req.user.branch_id) }

    overview = async (req, res) => {
        try {
            const branchId = req.user.role === 'admin' ? null : Number(req.user.branch_id)
            const data = await this.model.overview(branchId)
            res.json({ status: 'success', data: { ...data, userBranchId: req.user.branch_id, isAdmin: req.user.role === 'admin' } })
        } catch (error) { fail(res, error) }
    }
    catalog = async (req, res) => {
        try {
            const branchId = this.#branchFor(req, req.query.branch_id)
            if (!positiveInt(branchId)) throw new Error('Sucursal obligatoria')
            res.json({ status: 'success', data: await this.model.catalog(branchId) })
        } catch (error) { fail(res, error) }
    }
    create = async (req, res) => {
        try {
            const data = { ...req.body, branch_id: this.#branchFor(req, req.body.branch_id) }
            if (!channels.has(data.channel) || !data.customer_reference?.trim() || !positiveInt(data.branch_id)) throw new Error('Canal, referencia y sucursal son obligatorios')
            if (!Array.isArray(data.items) || !data.items.length || data.items.some(item => !positiveInt(item.product_id) || !positiveInt(item.quantity))) throw new Error('El pedido necesita productos y cantidades validas')
            if (new Set(data.items.map(item => Number(item.product_id))).size !== data.items.length) throw new Error('No se puede repetir un producto dentro del pedido')
            const id = await this.model.create(data, req.user.id)
            req.app.get('io').emit('movements_updated')
            res.status(201).json({ status: 'success', data: { id } })
        } catch (error) { fail(res, error) }
    }
    complete = async (req, res) => {
        try {
            const allowedBranch = req.user.is_admin ? null : Number(req.user.branch_id)
            const movementId = await this.model.complete(Number(req.params.id), req.user.id, allowedBranch)
            req.app.get('io').emit('new_movement')
            res.json({ status: 'success', data: { movementId } })
        } catch (error) { fail(res, error) }
    }
    cancel = async (req, res) => {
        try {
            const allowedBranch = req.user.is_admin ? null : Number(req.user.branch_id)
            await this.model.cancel(Number(req.params.id), allowedBranch)
            req.app.get('io').emit('movements_updated')
            res.json({ status: 'success' })
        } catch (error) { fail(res, error) }
    }
}
