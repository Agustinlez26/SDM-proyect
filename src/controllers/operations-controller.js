const positiveInt = value => Number.isInteger(Number(value)) && Number(value) > 0
const allowedWorkTypes = new Set(['manufacturing', 'customization', 'external_commission'])
const allowedPackageTypes = new Set(['wholesale_order', 'replenishment', 'work_order', 'other'])

const fail = (res, error) => res.status(400).json({ status: 'error', message: error.message || 'Operacion invalida' })

export class OperationsController {
    constructor({ operationsModel }) {
        this.model = operationsModel
    }

    overview = async (_req, res) => {
        try {
            const [catalogs, artisans, workOrders, wholesaleOrders, packages] = await Promise.all([
                this.model.getCatalogs(), this.model.getArtisans(), this.model.getWorkOrders(),
                this.model.getWholesaleOrders(), this.model.getPackages()
            ])
            res.json({ status: 'success', data: { ...catalogs, artisans, workOrders, wholesaleOrders, packages } })
        } catch (error) { fail(res, error) }
    }

    createArtisan = async (req, res) => {
        try {
            if (!req.body.name?.trim() || !positiveInt(req.body.branch_id)) throw new Error('Nombre y centro del artesano son obligatorios')
            const id = await this.model.createArtisan(req.body)
            res.status(201).json({ status: 'success', data: { id } })
        } catch (error) { fail(res, error) }
    }

    createWorkOrder = async (req, res) => {
        try {
            const data = req.body
            if (!allowedWorkTypes.has(data.type) || !positiveInt(data.origin_branch_id) || !positiveInt(data.artisan_id)) {
                throw new Error('Tipo, origen y artesano son obligatorios')
            }
            if (!Array.isArray(data.outputs) || !data.outputs.length || data.outputs.some(i => !positiveInt(i.product_id) || !positiveInt(i.quantity))) {
                throw new Error('La orden necesita al menos un producto terminado y una cantidad valida')
            }
            if ((data.materials || []).some(i => !positiveInt(i.product_id) || !positiveInt(i.quantity))) throw new Error('Materiales invalidos')
            const id = await this.model.createWorkOrder(data, req.user.id)
            res.status(201).json({ status: 'success', data: { id } })
        } catch (error) { fail(res, error) }
    }

    sendWorkOrder = async (req, res) => {
        try {
            await this.model.sendWorkOrder(Number(req.params.id))
            res.json({ status: 'success', message: 'Material descontado y registrado en poder del artesano' })
        } catch (error) { fail(res, error) }
    }

    getWorkOrder = async (req, res) => {
        try { res.json({ status: 'success', data: await this.model.getWorkOrderDetail(Number(req.params.id)) }) }
        catch (error) { fail(res, error) }
    }

    receiveWorkOrder = async (req, res) => {
        try {
            const status = await this.model.receiveWorkOrder(Number(req.params.id), req.body)
            res.json({ status: 'success', data: { status } })
        } catch (error) { fail(res, error) }
    }

    createWholesaleOrder = async (req, res) => {
        try {
            const data = req.body
            if (!data.customer_reference?.trim() || !positiveInt(data.pickup_branch_id)) throw new Error('Cliente y punto de retiro son obligatorios')
            if (!Array.isArray(data.items) || !data.items.length || data.items.some(i => !positiveInt(i.product_id) || !positiveInt(i.quantity))) {
                throw new Error('El pedido necesita productos y cantidades validas')
            }
            const id = await this.model.createWholesaleOrder(data, req.user.id)
            res.status(201).json({ status: 'success', data: { id } })
        } catch (error) { fail(res, error) }
    }

    deliverWholesaleOrder = async (req, res) => {
        try {
            await this.model.deliverWholesaleOrder(Number(req.params.id))
            res.json({ status: 'success', message: 'Egreso mayorista registrado desde el punto de retiro' })
        } catch (error) { fail(res, error) }
    }

    createPackage = async (req, res) => {
        try {
            const data = req.body
            if (!allowedPackageTypes.has(data.package_type)) throw new Error('Tipo de bulto invalido')
            if (!Array.isArray(data.items) || !data.items.length || data.items.some(i => !positiveInt(i.product_id) || !positiveInt(i.quantity))) {
                throw new Error('El bulto necesita productos y cantidades validas')
            }
            const id = await this.model.createPackage(data)
            res.status(201).json({ status: 'success', data: { id } })
        } catch (error) { fail(res, error) }
    }

    updateProductOperations = async (req, res) => {
        try {
            if (!['finished', 'raw_material', 'component'].includes(req.body.item_type)) throw new Error('Tipo de producto invalido')
            await this.model.updateProductOperations(Number(req.params.id), req.body)
            res.json({ status: 'success' })
        } catch (error) { fail(res, error) }
    }
}
