const channels = new Set(['mercado_libre','tienda_nube','mayorista','merchandising','showroom'])
const positiveInt = value => Number.isInteger(Number(value)) && Number(value)>0
const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
const fail = (res,error,status=400) => res.status(status).json({status:'error',message:error.message||'Pedido inválido'})

export class OrderController {
    constructor({ orderModel }) { this.model=orderModel }

    #canUseChannel(user,channel) {
        if (['admin','stock_manager'].includes(user.app_role)) return true
        if (user.app_role!=='seller') return false
        return user.area==='wholesale' ? channel==='mayorista' : ['mercado_libre','tienda_nube','showroom'].includes(channel)
    }

    async #context(req,channel) {
        if (!channels.has(channel)||!this.#canUseChannel(req.user,channel)) throw new Error('No tenés permiso para operar este canal')
        const globalAccess=['admin','stock_manager'].includes(req.user.app_role)
        const branches=await this.model.allowedBranches(req.user.id,globalAccess)
        if (!branches.length) throw new Error('No tenés ubicaciones habilitadas')
        return { branches,branchIds:branches.map(b=>Number(b.id)),globalAccess }
    }

    overview = async (req,res) => {
        try {
            const channel=req.query.channel
            const context=await this.#context(req,channel)
            const data=await this.model.overview(channel,context.globalAccess?null:context.branchIds)
            res.json({status:'success',data:{...data,branches:context.branches,userBranchId:req.user.branch_id,isAdmin:req.user.app_role==='admin',appRole:req.user.app_role,area:req.user.area,channel}})
        } catch(error){ fail(res,error,403) }
    }

    catalog = async (req,res) => {
        try {
            const channel=req.query.channel
            const context=await this.#context(req,channel)
            const branchId=Number(req.query.branch_id)
            if(!context.branchIds.includes(branchId)) throw new Error('No tenés acceso a esa ubicación')
            res.json({status:'success',data:await this.model.catalog(branchId)})
        } catch(error){ fail(res,error,403) }
    }

    create = async (req,res) => {
        try {
            const data={...req.body}
            const context=await this.#context(req,data.channel)
            if(!uuidPattern.test(data.idempotency_key||'')) throw new Error('La identificación de la operación no es válida')
            const fulfillmentMode=data.fulfillment_mode||'reserve'
            if(!['reserve','immediate'].includes(fulfillmentMode)) throw new Error('Tipo de operación inválido')
            if(fulfillmentMode==='immediate'&&data.channel!=='showroom') throw new Error('La venta inmediata solo está disponible en Ventas Showroom')
            if(!data.customer_reference?.trim()) throw new Error('La referencia del pedido es obligatoria')
            if(!Array.isArray(data.items)||!data.items.length||data.items.some(item=>!positiveInt(item.product_id)||!positiveInt(item.quantity)||!positiveInt(item.branch_id))) throw new Error('El pedido necesita productos, ubicaciones y cantidades válidas')
            if(data.items.some(item=>!context.branchIds.includes(Number(item.branch_id)))) throw new Error('Una de las ubicaciones no está habilitada para tu usuario')
            if(data.channel!=='mayorista'&&new Set(data.items.map(item=>Number(item.branch_id))).size>1) throw new Error('Un pedido del punto de venta debe pertenecer a una sola ubicación')
            if(data.channel!=='mayorista'&&data.items.some(item=>Number(item.branch_id)!==Number(req.user.branch_id))&&!context.globalAccess) throw new Error('Las ventas del punto solo pueden usar stock de la ubicación asignada')
            const keys=data.items.map(item=>`${item.product_id}:${item.branch_id}`)
            if(new Set(keys).size!==keys.length) throw new Error('No se puede repetir el mismo producto y ubicación')
            const creation=await this.model.create(data,req.user.id)
            const id=creation.id
            let movementId=creation.movement_id||null
            let responseStatus=creation.status
            if(fulfillmentMode==='immediate') {
                try {
                    movementId=await this.model.complete(id,req.user.id)
                } catch(error) {
                    if(creation.created) await this.model.cancel(id).catch(()=>{})
                    throw error
                }
                responseStatus='completed'
                req.app.get('io').emit('new_movement')
            } else {
                req.app.get('io').emit('movements_updated')
            }
            res.status(creation.created?201:200).json({status:'success',data:{id,movementId,status:responseStatus,idempotent:!creation.created}})
        } catch(error){ fail(res,error) }
    }

    complete = async (req,res) => {
        try {
            const order=await this.model.orderInfo(Number(req.params.id))
            if(!order||!this.#canUseChannel(req.user,order.channel)) throw new Error('Pedido inexistente o sin acceso')
            if(order.channel==='mayorista'&&!['admin','stock_manager'].includes(req.user.app_role)) throw new Error('Un pedido mayorista debe ser confirmado por el encargado de stock o el jefe')
            const context=await this.#context(req,order.channel)
            const reservationBranches=await this.model.reservationBranchIds(order.id)
            if(!context.globalAccess&&reservationBranches.some(branchId=>!context.branchIds.includes(branchId))) throw new Error('El pedido incluye stock de una ubicación no habilitada')
            const movementId=await this.model.complete(order.id,req.user.id)
            req.app.get('io').emit('new_movement')
            res.json({status:'success',data:{movementId}})
        } catch(error){ fail(res,error,403) }
    }

    cancel = async (req,res) => {
        try {
            const order=await this.model.orderInfo(Number(req.params.id))
            if(!order||!this.#canUseChannel(req.user,order.channel)) throw new Error('Pedido inexistente o sin acceso')
            const ownsOrder=order.created_by===req.user.id
            if(!ownsOrder&&!['admin','stock_manager'].includes(req.user.app_role)) throw new Error('No podés cancelar reservas creadas por otra persona')
            await this.model.cancel(order.id)
            req.app.get('io').emit('movements_updated')
            res.json({status:'success'})
        } catch(error){ fail(res,error,403) }
    }
}
