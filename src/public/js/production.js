let state = { products: [], branches: [], channels: [], artisans: [], workOrders: [], wholesaleOrders: [], packages: [] }

const $ = id => document.getElementById(id)
const esc = value => String(value ?? '').replace(/[&<>'"]/g, char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;' })[char])
const labelStatus = value => ({ draft: 'Borrador', sent: 'Enviado', in_progress: 'En proceso', partial: 'Parcial', completed: 'Completado', reserved: 'Reservado', in_transit: 'En transito', ready: 'Listo', delivered: 'Entregado', prepared: 'Preparado' }[value] || value)

const request = async (url, options = {}) => {
    const response = await fetch(url, { headers: { 'Content-Type': 'application/json' }, ...options })
    const body = await response.json().catch(() => ({}))
    if (!response.ok) throw new Error(body.message || 'No se pudo completar la operacion')
    return body.data
}

const notify = (message, error = false) => {
    const box = $('production-message')
    box.textContent = message
    box.className = `message ${error ? 'error' : 'success'}`
    setTimeout(() => box.classList.add('hidden'), 4500)
}

const options = (items, placeholder = 'Seleccionar') => `<option value="">${placeholder}</option>${items.map(item => `<option value="${item.id}">${esc(item.name)}${item.sku ? ` (${esc(item.sku)})` : ''}</option>`).join('')}`

const hydrateSelects = () => {
    const productOptions = options(state.products, 'Seleccionar producto')
    for (const id of ['work-material', 'work-output', 'wholesale-product', 'package-product', 'catalog-product']) $(id).innerHTML = productOptions
    const branchOptions = options(state.branches, 'Seleccionar centro')
    for (const id of ['work-branch', 'artisan-branch', 'wholesale-branch']) $(id).innerHTML = branchOptions
    $('catalog-branch').innerHTML = `<option value="">Sin centro fijo</option>${state.branches.map(b => `<option value="${b.id}">${esc(b.name)}</option>`).join('')}`
    $('work-artisan').innerHTML = options(state.artisans.filter(a => a.is_active), 'Seleccionar artesano')
    $('package-order').innerHTML = `<option value="">Sin pedido</option>${state.wholesaleOrders.filter(o => !['delivered', 'cancelled'].includes(o.status)).map(o => `<option value="${o.id}">${esc(o.order_number)} - ${esc(o.customer_reference)}</option>`).join('')}`
    $('channel-checks').innerHTML = state.channels.map(c => `<label><input type="checkbox" data-channel="${c.id}" checked> ${esc(c.name)}</label>`).join('')
}

const render = () => {
    $('summary-grid').innerHTML = [
        ['Ordenes activas', state.workOrders.filter(o => !['completed', 'cancelled'].includes(o.status)).length],
        ['En poder de artesanos', state.workOrders.filter(o => ['sent', 'in_progress', 'partial'].includes(o.status)).length],
        ['Pedidos con faltante', state.wholesaleOrders.filter(o => o.status === 'partial').length],
        ['Bultos preparados', state.packages.filter(p => p.status === 'prepared').length]
    ].map(([name, value]) => `<article class="summary-card"><strong>${value}</strong><span>${name}</span></article>`).join('')

    $('artisan-list').innerHTML = state.artisans.map(a => `<tr><td>${esc(a.name)}</td><td>${esc(a.branch_name)}</td><td>${esc(a.specialty || '-')}</td><td>${esc(a.phone || '-')}</td></tr>`).join('') || '<tr><td colspan="4">Todavia no hay artesanos.</td></tr>'

    $('work-list').innerHTML = state.workOrders.map(o => `<tr>
        <td><strong>${esc(o.code)}</strong><small>${esc(o.type)}</small></td><td>${esc(o.artisan_name)}</td><td>${esc(o.branch_name)}</td>
        <td>${esc(o.custody || 'Sin materiales propios')}</td><td>${esc(o.outputs || '-')}</td><td><span class="status ${o.status}">${esc(labelStatus(o.status))}</span></td>
        <td class="actions">${o.status === 'draft' ? `<button data-send="${o.id}">Enviar</button>` : ''}${['sent', 'in_progress', 'partial'].includes(o.status) ? `<button data-receive="${o.id}">Rendir</button>` : ''}</td>
    </tr>`).join('') || '<tr><td colspan="7">Todavia no hay ordenes.</td></tr>'

    $('wholesale-list').innerHTML = state.wholesaleOrders.map(o => `<tr><td><strong>${esc(o.order_number)}</strong></td><td>${esc(o.customer_reference)}</td><td>${esc(o.pickup_branch)}</td><td>${esc(o.items)}</td><td><span class="status ${o.status}">${esc(labelStatus(o.status))}</span></td><td class="actions">${['reserved', 'ready', 'partial'].includes(o.status) ? `<button data-deliver="${o.id}">Entregar reserva</button>` : ''}</td></tr>`).join('') || '<tr><td colspan="6">Todavia no hay pedidos.</td></tr>'

    $('package-list').innerHTML = state.packages.map(p => `<tr><td><strong>${esc(p.package_code)}</strong></td><td>${esc(p.package_type)}</td><td>${esc(p.order_number || '-')}</td><td>${esc(p.items || '-')}</td><td><span class="status ${p.status}">${esc(labelStatus(p.status))}</span></td></tr>`).join('') || '<tr><td colspan="5">Todavia no hay bultos.</td></tr>'
    hydrateSelects()
}

const load = async () => {
    try {
        state = await request('/api/operations-management/overview')
        render()
    } catch (error) { notify(`${error.message}. Ejecuta primero npm run migrate:operations.`, true) }
}

document.querySelectorAll('.tab').forEach(button => button.addEventListener('click', () => {
    document.querySelectorAll('.tab, .panel').forEach(element => element.classList.remove('active'))
    button.classList.add('active')
    document.querySelector(`[data-panel="${button.dataset.tab}"]`).classList.add('active')
}))

$('artisan-form').addEventListener('submit', async event => {
    event.preventDefault()
    try {
        await request('/api/operations-management/artisans', { method: 'POST', body: JSON.stringify({ name: $('artisan-name').value, branch_id: $('artisan-branch').value, phone: $('artisan-phone').value, specialty: $('artisan-specialty').value, notes: $('artisan-notes').value }) })
        event.target.reset(); notify('Artesano creado'); await load()
    } catch (error) { notify(error.message, true) }
})

$('work-form').addEventListener('submit', async event => {
    event.preventDefault()
    const material = $('work-material').value && $('work-material-qty').value ? [{ product_id: $('work-material').value, quantity: $('work-material-qty').value }] : []
    try {
        await request('/api/operations-management/work-orders', { method: 'POST', body: JSON.stringify({
            type: $('work-type').value, origin_branch_id: $('work-branch').value, artisan_id: $('work-artisan').value,
            materials: material, outputs: [{ product_id: $('work-output').value, quantity: $('work-output-qty').value }],
            artisan_cost: $('work-cost').value || null, notes: $('work-notes').value
        }) })
        event.target.reset(); notify('Orden creada como borrador'); await load()
    } catch (error) { notify(error.message, true) }
})

$('work-list').addEventListener('click', async event => {
    const sendId = event.target.dataset.send
    const receiveId = event.target.dataset.receive
    try {
        if (sendId) {
            if (!confirm('Se descontaran los materiales del stock del centro y quedaran en custodia del artesano. ¿Continuar?')) return
            await request(`/api/operations-management/work-orders/${sendId}/send`, { method: 'POST' })
            notify('Orden enviada al artesano')
        }
        if (receiveId) {
            const detail = await request(`/api/operations-management/work-orders/${receiveId}`)
            const materials = detail.materials.map(m => {
                const custody = m.quantity_sent - m.quantity_consumed - m.quantity_returned - m.quantity_discarded
                const returned = Number(prompt(`${m.product_name}: hay ${custody} con el artesano. ¿Cuantos vuelven sin usar?`, '0') || 0)
                const discarded = Number(prompt(`${m.product_name}: ¿Cuantos se descartan/rechazan?`, '0') || 0)
                return { id: m.id, returned, discarded, consumed: Math.max(0, custody - returned - discarded) }
            })
            const outputs = detail.outputs.map(o => {
                const pending = o.quantity_requested - o.quantity_received - o.quantity_rejected
                const received = Number(prompt(`${o.product_name}: faltan rendir ${pending}. ¿Cuantos productos terminados ingresan?`, String(pending)) || 0)
                return { id: o.id, received, rejected: Math.max(0, pending - received) }
            })
            await request(`/api/operations-management/work-orders/${receiveId}/receive`, { method: 'POST', body: JSON.stringify({ materials, outputs }) })
            notify('Rendicion registrada y stock actualizado')
        }
        if (sendId || receiveId) await load()
    } catch (error) { notify(error.message, true) }
})

$('wholesale-form').addEventListener('submit', async event => {
    event.preventDefault()
    try {
        await request('/api/operations-management/wholesale-orders', { method: 'POST', body: JSON.stringify({ customer_reference: $('wholesale-customer').value, pickup_branch_id: $('wholesale-branch').value, notes: $('wholesale-notes').value, items: [{ product_id: $('wholesale-product').value, quantity: $('wholesale-qty').value }] }) })
        event.target.reset(); notify('Pedido creado y stock disponible reservado'); await load()
    } catch (error) { notify(error.message, true) }
})

$('wholesale-list').addEventListener('click', async event => {
    const id = event.target.dataset.deliver
    if (!id || !confirm('¿Registrar el egreso mayorista del stock reservado en este punto de retiro?')) return
    try { await request(`/api/operations-management/wholesale-orders/${id}/deliver`, { method: 'POST' }); notify('Entrega mayorista registrada'); await load() }
    catch (error) { notify(error.message, true) }
})

$('package-form').addEventListener('submit', async event => {
    event.preventDefault()
    try {
        await request('/api/operations-management/packages', { method: 'POST', body: JSON.stringify({ package_type: $('package-type').value, wholesale_order_id: $('package-order').value || null, notes: $('package-notes').value, items: [{ product_id: $('package-product').value, quantity: $('package-qty').value }] }) })
        event.target.reset(); notify('Bulto preparado y vinculado'); await load()
    } catch (error) { notify(error.message, true) }
})

$('catalog-product').addEventListener('change', () => {
    const product = state.products.find(p => String(p.id) === $('catalog-product').value)
    if (!product) return
    $('catalog-type').value = product.item_type
    $('catalog-sellable').checked = Boolean(product.is_sellable)
    $('catalog-manufacturable').checked = Boolean(product.is_manufacturable)
    $('catalog-customizable').checked = Boolean(product.is_customizable)
})

$('catalog-form').addEventListener('submit', async event => {
    event.preventDefault()
    const id = $('catalog-product').value
    try {
        await request(`/api/operations-management/products/${id}`, { method: 'PATCH', body: JSON.stringify({ item_type: $('catalog-type').value, is_sellable: $('catalog-sellable').checked, is_manufacturable: $('catalog-manufacturable').checked, is_customizable: $('catalog-customizable').checked, production_branch_id: $('catalog-branch').value || null, channels: [...document.querySelectorAll('[data-channel]')].map(box => ({ id: Number(box.dataset.channel), is_enabled: box.checked })) }) })
        notify('Reglas operativas guardadas'); await load()
    } catch (error) { notify(error.message, true) }
})

load()
