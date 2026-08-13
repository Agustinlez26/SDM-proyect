let availableShipmentOrders = []
let selectedShipmentOrders = new Map()

const shipmentChannelLabel = channel => channel === 'mayorista' ? 'Mayorista' : 'Merchandising'
const shipmentEscape = value => String(value ?? '').replace(/[&<>'"]/g, char => ({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'}[char]))

const shipmentRoute = () => {
    const modal = document.getElementById('modal-operation')
    const origin = Number(document.getElementById('op-origin')?.value || modal?.dataset.userBranchId)
    const destination = Number(document.getElementById('op-dest')?.value)
    return { origin,destination,enabled:modal?.dataset.operationType === 'transfer' && origin === 1 && destination === 2 }
}

const renderShipmentOrders = () => {
    const list = document.getElementById('shipment-orders-list')
    if (!list) return
    if (!availableShipmentOrders.length) {
        list.innerHTML = '<p class="shipment-orders-empty">No hay pedidos reservados listos para viajar desde el Taller.</p>'
        return
    }
    list.innerHTML = availableShipmentOrders.map(order => {
        const selected = selectedShipmentOrders.get(Number(order.id))
        return `<article class="shipment-order-option ${selected ? 'selected' : ''}">
            <label>
                <input type="checkbox" data-shipment-order="${order.id}" ${selected ? 'checked' : ''}>
                <span><strong>${shipmentEscape(order.order_number)} · ${shipmentEscape(order.customer_reference)}</strong><small>${shipmentChannelLabel(order.channel)} · ${Number(order.product_count)} productos · ${Number(order.total_units)} unidades</small><small>${shipmentEscape(order.product_summary)}</small></span>
            </label>
            <label class="shipment-package-count">Bultos<input type="number" min="1" max="99" value="${selected?.package_count || 1}" data-package-count="${order.id}" ${selected ? '' : 'disabled'}></label>
        </article>`
    }).join('')
    list.querySelectorAll('[data-shipment-order]').forEach(input => input.addEventListener('change', () => {
        const id = Number(input.dataset.shipmentOrder)
        if (input.checked) selectedShipmentOrders.set(id,{order_id:id,package_count:1})
        else selectedShipmentOrders.delete(id)
        renderShipmentOrders()
    }))
    list.querySelectorAll('[data-package-count]').forEach(input => input.addEventListener('change', () => {
        const id = Number(input.dataset.packageCount)
        const selected = selectedShipmentOrders.get(id)
        if (selected) selected.package_count = Math.max(1,Math.min(99,Number(input.value)||1))
        input.value = selected?.package_count || 1
    }))
}

window.refreshShipmentOrderPackages = async function () {
    const panel = document.getElementById('shipment-orders-panel')
    if (!panel) return
    const route = shipmentRoute()
    panel.hidden = !route.enabled
    if (!route.enabled) {
        availableShipmentOrders = []
        selectedShipmentOrders.clear()
        return
    }
    const list = document.getElementById('shipment-orders-list')
    list.innerHTML = '<p class="shipment-orders-empty">Buscando pedidos preparados...</p>'
    try {
        const response = await fetch(`/api/movements/shipment-orders?origin_branch_id=${route.origin}&destination_branch_id=${route.destination}`)
        const body = await response.json()
        if (!response.ok) throw new Error(body.message || 'No se pudieron consultar los pedidos')
        availableShipmentOrders = body.data || []
        renderShipmentOrders()
    } catch (error) {
        list.innerHTML = `<p class="shipment-orders-empty error">${shipmentEscape(error.message)}</p>`
    }
}

window.getShipmentOrderPackages = () => [...selectedShipmentOrders.values()]
window.resetShipmentOrderPackages = () => {
    availableShipmentOrders = []
    selectedShipmentOrders.clear()
    const panel = document.getElementById('shipment-orders-panel')
    if (panel) panel.hidden = true
}

document.addEventListener('DOMContentLoaded', () => {
    document.getElementById('op-origin')?.addEventListener('change', window.refreshShipmentOrderPackages)
    document.getElementById('op-dest')?.addEventListener('change', window.refreshShipmentOrderPackages)
})
