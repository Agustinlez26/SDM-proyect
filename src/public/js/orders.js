let state = { orders: [], branches: [], catalogs: {}, appRole: 'seller', area: 'retail', channel: window.ORDER_CHANNEL }
let items = []
let pendingOrderRequestKey = null
let editingOrder = null
let detailOrder = null
let originalEditItems = []
const $ = id => document.getElementById(id)
const esc = value => String(value ?? '').replace(/[&<>'"]/g, c => ({ '&':'&amp;', '<':'&lt;', '>':'&gt;', "'":'&#39;', '"':'&quot;' }[c]))
const channelLabel = value => ({ mercado_libre:'Mercado Libre', tienda_nube:'Tienda Nube', mayorista:'Mayorista', merchandising:'Merchandising', showroom:'Showroom' }[value] || value)
const statusLabel = value => ({ reserved:'Reservado', completed:'Completado', cancelled:'Cancelado' }[value] || value)
const request = async (url, options = {}) => {
    const response = await fetch(url, { headers: { 'Content-Type':'application/json' }, ...options })
    const body = await response.json().catch(() => ({}))
    if (!response.ok) throw new Error(body.message || 'No se pudo completar la operación')
    return body.data
}
const notify = (message, error = false) => {
    $('orders-message').textContent = message
    $('orders-message').className = `orders-message ${error ? 'error' : 'success'}`
    setTimeout(() => $('orders-message').classList.add('hidden'), 4500)
}
const selectedBranchId = () => Number($('order-branch').value)
const selectedBranch = () => state.branches.find(branch => Number(branch.id) === selectedBranchId())
const selectedFulfillmentMode = () => document.querySelector('input[name="fulfillment_mode"]:checked')?.value || 'reserve'

const openOrderModal = () => {
    editingOrder = null
    originalEditItems = []
    pendingOrderRequestKey = null
    $('order-modal-title').textContent = state.channel === 'showroom' ? 'Nueva venta de showroom' : 'Nuevo pedido'
    $('order-edit-reason-group').hidden = true
    $('order-edit-reason').required = false
    $('order-modal').classList.add('active')
    $('order-modal').setAttribute('aria-hidden', 'false')
    document.body.classList.add('order-modal-open')
    setTimeout(() => $('order-reference').focus(), 100)
}

const closeOrderModal = () => {
    $('order-modal').classList.remove('active')
    $('order-modal').setAttribute('aria-hidden', 'true')
    document.body.classList.remove('order-modal-open')
}

const closeOrderDetails = () => {
    $('order-details-modal').classList.remove('active')
    $('order-details-modal').setAttribute('aria-hidden', 'true')
}

const openOrderDetails = async order => {
    const modal = $('order-details-modal')
    const list = $('order-details-list')
    $('order-details-number').textContent = order.order_number
    list.innerHTML = '<tr><td colspan="4" class="order-details-loading">Cargando productos...</td></tr>'
    modal.classList.add('active')
    modal.setAttribute('aria-hidden', 'false')
    try {
        const detailData = await request(`/api/orders/${order.id}/details`)
        const details = detailData.items
        detailOrder = {...order,details}
        list.innerHTML = details.length
            ? details.map(item => `<tr><td><span class="order-sku">${esc(item.sku || 'S/C')}</span></td><td><strong>${esc(item.name)}</strong></td><td>${esc(item.branch_name)}</td><td class="text-right"><span class="order-quantity-badge">${esc(item.quantity)}</span></td></tr>`).join('')
            : '<tr><td colspan="4" class="order-details-loading">El pedido no tiene productos.</td></tr>'
        const canEditReserved=order.status==='reserved'&&(order.created_by===state.userId||['admin','stock_manager'].includes(state.appRole))
        const canCorrectCompleted=order.status==='completed'&&state.isAdmin
        $('edit-order-button').hidden=!(canEditReserved||canCorrectCompleted)
        $('edit-order-button').textContent=canCorrectCompleted?'Corregir pedido confirmado':'Modificar pedido'
        const audit=detailData.audit||[]
        $('order-audit-section').hidden=!audit.length
        $('order-audit-list').innerHTML=audit.map(entry=>`<article><strong>${esc(entry.changed_by_name)}</strong><span>${entry.action==='admin_correction'?'Corrección posterior a la confirmación':'Edición de reserva'} · ${new Date(entry.created_at).toLocaleString('es-AR')}</span><p>${esc(entry.reason)}</p></article>`).join('')
    } catch (error) {
        closeOrderDetails()
        notify(error.message, true)
    }
}

const startOrderEdit = () => {
    if(!detailOrder) return
    editingOrder=detailOrder
    originalEditItems=detailOrder.details.map(item=>({product_id:Number(item.product_id),branch_id:Number(item.branch_id),quantity:Number(item.quantity)}))
    items=detailOrder.details.map(item=>({product_id:Number(item.product_id),branch_id:Number(item.branch_id),branch_name:item.branch_name,quantity:Number(item.quantity),name:item.name}))
    closeOrderDetails()
    $('order-form').reset()
    $('order-reference').value=detailOrder.customer_reference||''
    $('order-notes').value=detailOrder.notes||''
    $('order-modal-title').textContent=detailOrder.status==='completed'?'Corregir pedido confirmado':'Modificar pedido reservado'
    $('order-edit-reason-group').hidden=detailOrder.status!=='completed'
    $('order-edit-reason').required=detailOrder.status==='completed'
    $('submit-order').textContent=detailOrder.status==='completed'?'Guardar corrección':'Guardar cambios'
    renderItems()
    renderProductOptions()
    $('order-modal').classList.add('active')
    $('order-modal').setAttribute('aria-hidden','false')
    document.body.classList.add('order-modal-open')
}

const resetOrderForm = () => {
    $('order-form').reset()
    editingOrder = null
    originalEditItems = []
    items = []
    renderItems()
    if (state.branches.length) $('order-branch').value = state.branches[0].id
    renderProductOptions()
    updateSubmitLabel()
    pendingOrderRequestKey = null
}

const updateSubmitLabel = () => {
    if (state.channel !== 'showroom') return
    $('submit-order').textContent = selectedFulfillmentMode() === 'immediate' ? 'Registrar venta inmediata' : 'Crear reserva'
}

const loadCatalogs = async () => {
    const entries = await Promise.all(state.branches.map(async branch => [branch.id, await request(`/api/orders/catalog?channel=${state.channel}&branch_id=${branch.id}`)]))
    state.catalogs = Object.fromEntries(entries)
    renderProductOptions()
}

const renderProductOptions = () => {
    const catalog = state.catalogs[selectedBranchId()] || []
    $('order-product').innerHTML = '<option value="">Seleccionar producto</option>' + catalog.filter(p => Number(p.available) > 0 || originalEditItems.some(item=>item.product_id===Number(p.id)&&item.branch_id===selectedBranchId())).map(p => `<option value="${p.id}">${esc(p.name)} (${esc(p.sku)}) — físico ${p.physical}, reservado ${p.reserved}, disponible ${p.available}</option>`).join('')
    renderAvailability()
}

const renderAvailability = () => {
    const productId = Number($('order-product').value)
    if (!productId) {
        $('branch-availability').innerHTML = 'Seleccioná un producto para comparar el stock físico, reservado y disponible.'
        return
    }
    $('branch-availability').innerHTML = state.branches.map(branch => {
        const product = (state.catalogs[branch.id] || []).find(p => Number(p.id) === productId)
        return `<div><strong>${esc(branch.name)}</strong><span>Físico: ${product?.physical || 0}</span><span>Reservado: ${product?.reserved || 0}</span><span>Disponible: ${product?.available || 0}</span></div>`
    }).join('')
}

const renderItems = () => {
    $('order-items').innerHTML = items.length
        ? items.map((item, index) => `<div><span>${esc(item.name)}<small>${esc(item.branch_name)}</small></span>${editingOrder?`<input class="order-item-quantity" data-item-quantity="${index}" type="number" min="1" value="${item.quantity}" aria-label="Cantidad de ${esc(item.name)}">`:`<strong>x${item.quantity}</strong>`}<button type="button" data-remove="${index}">Quitar</button></div>`).join('')
        : '<small>Todavía no agregaste productos.</small>'
    document.querySelectorAll('[data-remove]').forEach(button => button.addEventListener('click', () => {
        items.splice(Number(button.dataset.remove), 1)
        renderItems()
    }))
    document.querySelectorAll('[data-item-quantity]').forEach(input=>input.addEventListener('change',()=>{items[Number(input.dataset.itemQuantity)].quantity=Number(input.value)}))
}

const render = () => {
    $('orders-summary').innerHTML = [
        ['Reservados', state.orders.filter(o => o.status === 'reserved').length],
        ['Completados', state.orders.filter(o => o.status === 'completed').length],
        ['Cancelados', state.orders.filter(o => o.status === 'cancelled').length],
        ['Canal', channelLabel(state.channel)]
    ].map(([label, value]) => `<article><strong>${esc(value)}</strong><span>${label}</span></article>`).join('')
    const canConfirm = state.channel !== 'mayorista' || ['admin', 'stock_manager'].includes(state.appRole)
    $('orders-list').innerHTML = state.orders.map(o => `<tr><td><strong>${esc(o.order_number)}</strong></td><td>${esc(channelLabel(o.channel))}</td><td>${esc(o.customer_reference)}</td><td>${esc(o.branch_name)}</td><td><button class="order-details-button" data-details="${o.id}" type="button" title="Ver productos del pedido"><span class="material-symbols-outlined">visibility</span> Ver${Number(o.item_count) ? ` (${o.item_count})` : ''}</button></td><td><span class="order-status ${o.status}">${esc(statusLabel(o.status))}</span></td><td>${o.status === 'reserved' ? `${canConfirm ? `<button data-complete="${o.id}">Confirmar</button>` : ''}<button class="danger" data-cancel="${o.id}">Cancelar</button>` : ''}</td></tr>`).join('') || '<tr><td colspan="7">Todavía no hay pedidos en este canal.</td></tr>'
    $('order-branch').innerHTML = state.branches.map((branch, index) => `<option value="${branch.id}" ${index === 0 ? 'selected' : ''}>${esc(branch.name)}</option>`).join('')
    $('order-branch-group').hidden = state.branches.length === 1
}

const load = async () => {
    try {
        state = { ...state, ...await request(`/api/orders?channel=${state.channel}`) }
        render()
        await loadCatalogs()
    } catch (error) {
        notify(`${error.message}. Ejecutá la migración de roles y pedidos.`, true)
    }
}

$('open-order-modal').addEventListener('click', openOrderModal)
$('close-order-modal').addEventListener('click', closeOrderModal)
$('cancel-order-modal').addEventListener('click', closeOrderModal)
$('order-modal').addEventListener('click', event => { if (event.target === $('order-modal')) closeOrderModal() })
$('close-order-details').addEventListener('click', closeOrderDetails)
$('edit-order-button').addEventListener('click', startOrderEdit)
$('order-details-modal').addEventListener('click', event => { if (event.target === $('order-details-modal')) closeOrderDetails() })
$('order-branch').addEventListener('change', renderProductOptions)
$('order-product').addEventListener('change', renderAvailability)
document.querySelectorAll('input[name="fulfillment_mode"]').forEach(input => input.addEventListener('change', updateSubmitLabel))

document.addEventListener('keydown', event => {
    const target = event.target
    const isTyping = target instanceof HTMLElement && (target.matches('input, textarea, select') || target.isContentEditable)
    if (event.key === 'Escape' && $('order-details-modal').classList.contains('active')) closeOrderDetails()
    else if (event.key === 'Escape' && $('order-modal').classList.contains('active')) closeOrderModal()
    if (event.key.toLowerCase() === 'v' && !event.ctrlKey && !event.metaKey && !event.altKey && !isTyping && !$('order-modal').classList.contains('active') && !$('order-details-modal').classList.contains('active')) {
        event.preventDefault()
        openOrderModal()
    }
})

$('order-add-item').addEventListener('click', () => {
    const product = (state.catalogs[selectedBranchId()] || []).find(p => Number(p.id) === Number($('order-product').value))
    const quantity = Number($('order-quantity').value)
    const branch = selectedBranch()
    if (!product || !branch || !Number.isInteger(quantity) || quantity < 1) return notify('Elegí producto, ubicación y cantidad válida.', true)
    if (items.some(item => Number(item.product_id) === Number(product.id) && Number(item.branch_id) === Number(branch.id))) return notify('Ese producto y ubicación ya están agregados.', true)
    const originalQuantity=originalEditItems.find(item=>item.product_id===Number(product.id)&&item.branch_id===Number(branch.id))?.quantity||0
    if (quantity > Number(product.available)+originalQuantity) return notify(`Solo hay ${Number(product.available)+originalQuantity} unidades disponibles en ${branch.name}.`, true)
    items.push({ product_id:product.id, branch_id:branch.id, branch_name:branch.name, quantity, name:product.name })
    renderItems()
})

$('order-form').addEventListener('submit', async event => {
    event.preventDefault()
    const submitButton = $('submit-order')
    const originalText = submitButton.textContent
    try {
        if (!items.length) throw new Error('Agregá al menos un producto')
        submitButton.disabled = true
        submitButton.textContent = 'Guardando...'
        const fulfillmentMode = selectedFulfillmentMode()
        if(items.some(item=>!Number.isInteger(Number(item.quantity))||Number(item.quantity)<1)) throw new Error('Todas las cantidades deben ser válidas')
        const wasEditing=Boolean(editingOrder)
        if(editingOrder) {
            await request(`/api/orders/${editingOrder.id}`, {method:'PATCH',body:JSON.stringify({customer_reference:$('order-reference').value,notes:$('order-notes').value,reason:$('order-edit-reason').value,items})})
        } else {
            pendingOrderRequestKey ||= crypto.randomUUID()
            await request('/api/orders', { method:'POST', body:JSON.stringify({ idempotency_key:pendingOrderRequestKey, channel:state.channel, fulfillment_mode:fulfillmentMode, customer_reference:$('order-reference').value, notes:$('order-notes').value, items }) })
        }
        resetOrderForm()
        closeOrderModal()
        notify(wasEditing?'Pedido actualizado correctamente':(fulfillmentMode === 'immediate' ? 'Venta registrada y stock descontado' : 'Pedido creado y stock reservado'))
        await load()
    } catch (error) {
        notify(error.message, true)
    } finally {
        submitButton.disabled = false
        if (submitButton.textContent === 'Guardando...') submitButton.textContent = originalText
    }
})

$('orders-list').addEventListener('click', async event => {
    try {
        const detailsButton = event.target.closest('[data-details]')
        if (detailsButton) {
            const order = state.orders.find(item => Number(item.id) === Number(detailsButton.dataset.details))
            if (order) await openOrderDetails(order)
            return
        }
        if (event.target.dataset.complete) {
            if (!confirm('Se descontará el stock físico de cada ubicación y quedará registrada la confirmación. ¿Continuar?')) return
            await request(`/api/orders/${event.target.dataset.complete}/complete`, { method:'POST' })
            notify('Retiro confirmado y movimientos registrados')
        }
        if (event.target.dataset.cancel) {
            if (!confirm('¿Cancelar el pedido y liberar sus reservas?')) return
            await request(`/api/orders/${event.target.dataset.cancel}/cancel`, { method:'POST' })
            notify('Pedido cancelado y reservas liberadas')
        }
        if (event.target.dataset.complete || event.target.dataset.cancel) await load()
    } catch (error) {
        notify(error.message, true)
    }
})

renderItems()
updateSubmitLabel()
load()
