let state = { orders: [], branches: [], catalogs: {}, appRole: 'seller', area: 'retail', channel: window.ORDER_CHANNEL }
let items = []
let pendingOrderRequestKey = null
let editingOrder = null
let detailOrder = null
let originalEditItems = []
let selectedCatalogProductId = null
const $ = id => document.getElementById(id)
const esc = value => String(value ?? '').replace(/[&<>'"]/g, c => ({ '&':'&amp;', '<':'&lt;', '>':'&gt;', "'":'&#39;', '"':'&quot;' }[c]))
const channelLabel = value => ({ mercado_libre:'Mercado Libre', tienda_nube:'Tienda Nube', mayorista:'Mayorista', merchandising:'Merchandising', showroom:'Showroom' }[value] || value)
const statusLabel = value => ({ reserved:'Reservado', completed:'Completado', cancelled:'Cancelado' }[value] || value)
const shippingMethodLabel = value => ({ via_cargo:'Vía Cargo', uber:'Uber', correo_argentino:'Correo Argentino', other:'Otro medio' }[value] || value)
const deliveryLabel = order => order.delivery_type === 'shipping'
    ? `Envío · ${order.shipping_method === 'other' ? (order.shipping_method_detail || 'Otro medio') : shippingMethodLabel(order.shipping_method)}`
    : 'Retiro'
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
const selectedDeliveryType = () => document.querySelector('input[name="delivery_type"]:checked')?.value || 'pickup'

const syncDeliveryFields = () => {
    const shipping = selectedDeliveryType() === 'shipping'
    $('order-shipping-fields').hidden = !shipping
    $('order-shipping-method').required = shipping
    const other = shipping && $('order-shipping-method').value === 'other'
    $('order-shipping-detail-group').hidden = !other
    $('order-shipping-detail').required = other
}

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
    const deliveryInput=document.querySelector(`input[name="delivery_type"][value="${detailOrder.delivery_type||'pickup'}"]`)
    if(deliveryInput) deliveryInput.checked=true
    $('order-shipping-method').value=detailOrder.shipping_method||''
    $('order-shipping-detail').value=detailOrder.shipping_method_detail||''
    syncDeliveryFields()
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
    selectedCatalogProductId = null
    items = []
    renderItems()
    if (state.branches.length) $('order-branch').value = state.branches[0].id
    renderProductOptions()
    updateSubmitLabel()
    syncDeliveryFields()
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
    const term = $('order-product-search').value.trim().toLocaleLowerCase('es')
    const visible = catalog.filter(p => {
        const hasStock = Number(p.available) > 0 || originalEditItems.some(item => item.product_id === Number(p.id) && item.branch_id === selectedBranchId())
        return hasStock && (!term || `${p.name} ${p.sku || ''}`.toLocaleLowerCase('es').includes(term))
    })
    $('order-catalog-grid').innerHTML = visible.length ? visible.map(p => `<button class="catalog-card order-catalog-card" type="button" data-order-product="${p.id}"><img src="${esc(p.url_img_small || '/img/no-image.png')}" onerror="this.src='/img/no-image.png'" alt="" class="catalog-img"><span class="catalog-info"><span class="catalog-code">${esc(p.sku || 'S/C')}</span><span class="catalog-name" title="${esc(p.name)}">${esc(p.name)}</span><span class="catalog-stock">Disponible: ${esc(p.available)}</span></span></button>`).join('') : '<p class="order-catalog-empty">No se encontraron productos con stock disponible.</p>'
    renderAvailability(selectedCatalogProductId)
}

const renderAvailability = productIdValue => {
    const productId = Number(productIdValue)
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
        ? items.map((item, index) => {
            const product = (state.catalogs[item.branch_id] || []).find(p => Number(p.id) === Number(item.product_id))
            const originalQuantity = originalEditItems.find(original => original.product_id === Number(item.product_id) && original.branch_id === Number(item.branch_id))?.quantity || 0
            const maximum = Math.max(1, Number(product?.available || 0) + originalQuantity)
            return `<tr><td><strong>${esc(item.name)}</strong></td><td><small>${esc(item.branch_name)}</small></td><td class="text-center"><input class="order-item-quantity" data-item-quantity="${index}" type="number" min="1" max="${maximum}" value="${item.quantity}" aria-label="Cantidad de ${esc(item.name)}"></td><td class="text-center"><button class="order-remove-item" type="button" data-remove="${index}" title="Quitar producto" aria-label="Quitar ${esc(item.name)}"><span class="material-symbols-outlined">delete</span></button></td></tr>`
        }).join('')
        : '<tr><td colspan="4" class="order-items-empty">Utilizá el buscador para agregar productos a la lista.</td></tr>'
    document.querySelectorAll('[data-remove]').forEach(button => button.addEventListener('click', () => {
        items.splice(Number(button.dataset.remove), 1)
        renderItems()
    }))
    document.querySelectorAll('[data-item-quantity]').forEach(input=>input.addEventListener('change',()=>{
        const index = Number(input.dataset.itemQuantity)
        const quantity = Math.max(1, Math.min(Number(input.max), Number(input.value) || 1))
        items[index].quantity = quantity
        input.value = quantity
    }))
}

const render = () => {
    $('orders-summary').innerHTML = [
        ['Reservados', state.orders.filter(o => o.status === 'reserved').length],
        ['Completados', state.orders.filter(o => o.status === 'completed').length],
        ['Cancelados', state.orders.filter(o => o.status === 'cancelled').length],
        ['Canal', channelLabel(state.channel)]
    ].map(([label, value]) => `<article><strong>${esc(value)}</strong><span>${label}</span></article>`).join('')
    const canConfirm = state.channel !== 'mayorista' || ['admin', 'stock_manager'].includes(state.appRole)
    $('orders-list').innerHTML = state.orders.map(o => `<tr><td><strong>${esc(o.order_number)}</strong></td><td>${esc(channelLabel(o.channel))}</td><td>${esc(o.customer_reference)}<small>${esc(deliveryLabel(o))}</small></td><td>${esc(o.branch_name)}</td><td><button class="order-details-button" data-details="${o.id}" type="button" title="Ver productos del pedido"><span class="material-symbols-outlined">visibility</span> Ver${Number(o.item_count) ? ` (${o.item_count})` : ''}</button></td><td><span class="order-status ${o.status}">${esc(statusLabel(o.status))}</span></td><td>${o.status === 'reserved' ? `${canConfirm ? `<button data-complete="${o.id}">Confirmar</button>` : ''}<button class="danger" data-cancel="${o.id}">Cancelar</button>` : ''}</td></tr>`).join('') || '<tr><td colspan="7">Todavía no hay pedidos en este canal.</td></tr>'
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
$('order-branch').addEventListener('change', () => {
    selectedCatalogProductId = null
    renderProductOptions()
})
$('order-product-search').addEventListener('input', renderProductOptions)
$('order-product-search').addEventListener('keydown', event => {
    if (event.key === 'Enter') {
        event.preventDefault()
        renderProductOptions()
    }
})
$('order-search-product').addEventListener('click', renderProductOptions)
document.querySelectorAll('input[name="fulfillment_mode"]').forEach(input => input.addEventListener('change', updateSubmitLabel))
document.querySelectorAll('input[name="delivery_type"]').forEach(input => input.addEventListener('change', syncDeliveryFields))
$('order-shipping-method').addEventListener('change', syncDeliveryFields)

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

$('order-catalog-grid').addEventListener('click', event => {
    const card = event.target.closest('[data-order-product]')
    if (!card) return
    const product = (state.catalogs[selectedBranchId()] || []).find(p => Number(p.id) === Number(card.dataset.orderProduct))
    const branch = selectedBranch()
    if (!product || !branch) return notify('Elegí un producto y una ubicación válida.', true)
    selectedCatalogProductId = Number(product.id)
    renderAvailability(selectedCatalogProductId)
    if (items.some(item => Number(item.product_id) === Number(product.id) && Number(item.branch_id) === Number(branch.id))) return notify('Ese producto y ubicación ya están agregados.', true)
    const originalQuantity = originalEditItems.find(item => item.product_id === Number(product.id) && item.branch_id === Number(branch.id))?.quantity || 0
    if (Number(product.available) + originalQuantity < 1) return notify(`No hay unidades disponibles en ${branch.name}.`, true)
    items.push({ product_id:product.id, branch_id:branch.id, branch_name:branch.name, quantity:1, name:product.name })
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
        const delivery = {
            delivery_type:selectedDeliveryType(),
            shipping_method:selectedDeliveryType()==='shipping' ? $('order-shipping-method').value : null,
            shipping_method_detail:selectedDeliveryType()==='shipping' ? $('order-shipping-detail').value : null
        }
        if(items.some(item=>!Number.isInteger(Number(item.quantity))||Number(item.quantity)<1)) throw new Error('Todas las cantidades deben ser válidas')
        const wasEditing=Boolean(editingOrder)
        if(editingOrder) {
            await request(`/api/orders/${editingOrder.id}`, {method:'PATCH',body:JSON.stringify({customer_reference:$('order-reference').value,...delivery,notes:$('order-notes').value,reason:$('order-edit-reason').value,items})})
        } else {
            pendingOrderRequestKey ||= crypto.randomUUID()
            await request('/api/orders', { method:'POST', body:JSON.stringify({ idempotency_key:pendingOrderRequestKey, channel:state.channel, fulfillment_mode:fulfillmentMode, customer_reference:$('order-reference').value, ...delivery, notes:$('order-notes').value, items }) })
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
            notify('Venta confirmada y movimientos registrados')
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
syncDeliveryFields()
load()
