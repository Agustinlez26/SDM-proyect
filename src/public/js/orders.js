let state = { orders: [], branches: [], catalog: [], isAdmin: false, userBranchId: null }
let items = []
const $ = id => document.getElementById(id)
const esc = value => String(value ?? '').replace(/[&<>'"]/g, c => ({ '&':'&amp;', '<':'&lt;', '>':'&gt;', "'":'&#39;', '"':'&quot;' })[c])
const channelLabel = value => ({ mercado_libre:'Mercado Libre', tienda_nube:'Tienda Nube', mayorista:'Mayorista', merchandising:'Merchandising' }[value] || value)
const statusLabel = value => ({ reserved:'Reservado', completed:'Completado', cancelled:'Cancelado' }[value] || value)

const request = async (url, options = {}) => {
    const response = await fetch(url, { headers: { 'Content-Type':'application/json' }, ...options })
    const body = await response.json().catch(() => ({}))
    if (!response.ok) throw new Error(body.message || 'No se pudo completar la operacion')
    return body.data
}
const notify = (message, error = false) => {
    $('orders-message').textContent = message
    $('orders-message').className = `orders-message ${error ? 'error' : 'success'}`
    setTimeout(() => $('orders-message').classList.add('hidden'), 4500)
}
const selectedBranch = () => state.isAdmin ? Number($('order-branch').value) : Number(state.userBranchId)

const loadCatalog = async () => {
    const branchId = selectedBranch()
    if (!branchId) return
    state.catalog = await request(`/api/orders/catalog?branch_id=${branchId}`)
    $('order-product').innerHTML = '<option value="">Seleccionar producto</option>' + state.catalog.filter(p => Number(p.available) > 0)
        .map(p => `<option value="${p.id}">${esc(p.name)} (${esc(p.sku)}) - disponible ${p.available}</option>`).join('')
    items = []
    renderItems()
}
const renderItems = () => {
    $('order-items').innerHTML = items.length ? items.map((item, index) => `<div><span>${esc(item.name)} x${item.quantity}</span><button type="button" data-remove="${index}">Quitar</button></div>`).join('') : '<small>Todavía no agregaste productos.</small>'
    document.querySelectorAll('[data-remove]').forEach(button => button.addEventListener('click', () => { items.splice(Number(button.dataset.remove), 1); renderItems() }))
}
const render = () => {
    $('orders-summary').innerHTML = [
        ['Reservados', state.orders.filter(o => o.status === 'reserved').length],
        ['Mercado Libre', state.orders.filter(o => o.channel === 'mercado_libre' && o.status === 'reserved').length],
        ['Tienda Nube', state.orders.filter(o => o.channel === 'tienda_nube' && o.status === 'reserved').length],
        ['Mayorista / Merch', state.orders.filter(o => ['mayorista','merchandising'].includes(o.channel) && o.status === 'reserved').length]
    ].map(([label,value]) => `<article><strong>${value}</strong><span>${label}</span></article>`).join('')
    $('orders-list').innerHTML = state.orders.map(o => `<tr><td><strong>${esc(o.order_number)}</strong></td><td>${esc(channelLabel(o.channel))}</td><td>${esc(o.customer_reference)}</td><td>${esc(o.branch_name)}</td><td>${esc(o.items)}</td><td><span class="order-status ${o.status}">${esc(statusLabel(o.status))}</span></td><td>${o.status === 'reserved' ? `<button data-complete="${o.id}">Completar</button><button class="danger" data-cancel="${o.id}">Cancelar</button>` : ''}</td></tr>`).join('') || '<tr><td colspan="7">Todavía no hay pedidos.</td></tr>'
    $('order-branch-group').hidden = !state.isAdmin
    $('order-branch').innerHTML = '<option value="">Seleccionar sucursal</option>' + state.branches.map(b => `<option value="${b.id}">${esc(b.name)}</option>`).join('')
    if (!state.isAdmin && state.userBranchId) $('order-branch').value = state.userBranchId
}
const load = async () => {
    try { state = { ...state, ...await request('/api/orders') }; render(); if (!state.isAdmin) await loadCatalog() }
    catch (error) { notify(`${error.message}. Ejecutá la migración de pedidos.`, true) }
}

$('order-branch').addEventListener('change', loadCatalog)
$('order-add-item').addEventListener('click', () => {
    const product = state.catalog.find(p => Number(p.id) === Number($('order-product').value))
    const quantity = Number($('order-quantity').value)
    if (!product || !Number.isInteger(quantity) || quantity < 1) return notify('Elegí un producto y una cantidad válida.', true)
    if (items.some(item => item.product_id === product.id)) return notify('Ese producto ya está agregado.', true)
    if (quantity > Number(product.available)) return notify(`Solo hay ${product.available} unidades disponibles.`, true)
    items.push({ product_id: product.id, quantity, name: product.name })
    renderItems()
})
$('order-form').addEventListener('submit', async event => {
    event.preventDefault()
    try {
        if (!items.length) throw new Error('Agregá al menos un producto')
        await request('/api/orders', { method:'POST', body:JSON.stringify({ channel:$('order-channel').value, customer_reference:$('order-reference').value, branch_id:selectedBranch(), notes:$('order-notes').value, items }) })
        event.target.reset(); items = []; renderItems(); notify('Pedido creado y stock reservado'); await load()
    } catch (error) { notify(error.message, true) }
})
$('orders-list').addEventListener('click', async event => {
    try {
        if (event.target.dataset.complete) {
            if (!confirm('Esto descontará el stock físico y registrará el egreso por venta. ¿Continuar?')) return
            await request(`/api/orders/${event.target.dataset.complete}/complete`, { method:'POST' }); notify('Pedido completado y egreso registrado')
        }
        if (event.target.dataset.cancel) {
            if (!confirm('¿Cancelar el pedido y liberar su reserva?')) return
            await request(`/api/orders/${event.target.dataset.cancel}/cancel`, { method:'POST' }); notify('Pedido cancelado y reserva liberada')
        }
        if (event.target.dataset.complete || event.target.dataset.cancel) await load()
    } catch (error) { notify(error.message, true) }
})
load()
