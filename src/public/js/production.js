let state = { products: [], branches: [], artisans: [], workOrders: [], packages: [], recipes: [], personalizationMethods: [] }
let packageItems = [{ product_id: '', quantity: 1 }]

const $ = id => document.getElementById(id)
const esc = value => String(value ?? '').replace(/[&<>'"]/g, char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;' })[char])
const labelStatus = value => ({ draft: 'Borrador', sent: 'Enviado', in_progress: 'En proceso', partial: 'Parcial', completed: 'Completado', prepared: 'Preparado', in_transit: 'En viaje', delivered: 'Entregado' }[value] || value)
const productOptions = (items, placeholder = 'Seleccionar producto') => `<option value="">${placeholder}</option>${items.map(item => `<option value="${item.id}">${esc(item.name)} (${esc(item.sku)})</option>`).join('')}`

const request = async (url, options = {}) => {
    const response = await fetch(url, { headers: { 'Content-Type': 'application/json' }, ...options })
    const body = await response.json().catch(() => ({}))
    if (!response.ok) throw new Error(body.message || 'No se pudo completar la operación')
    return body.data
}

const notify = (message, error = false) => {
    const box = $('production-message')
    box.textContent = message
    box.className = `message ${error ? 'error' : 'success'}`
    setTimeout(() => box.classList.add('hidden'), 4500)
}

const selectedProduct = () => state.products.find(product => String(product.id) === $('work-output').value)

const syncWorkProducts = () => {
    const type = $('work-type').value
    const eligible = state.products.filter(product => type === 'manufacturing' ? product.is_manufacturable : product.is_customizable)
    const previous = $('work-output').value
    $('work-output').innerHTML = productOptions(eligible)
    if (eligible.some(product => String(product.id) === previous)) $('work-output').value = previous
    syncWorkDetails()
}

const syncWorkDetails = () => {
    const type = $('work-type').value
    const product = selectedProduct()
    const quantity = Math.max(1, Number($('work-output-qty').value || 1))
    const personalizationGroup = $('work-personalization-group')
    const artisanGroup = $('work-artisan-group')
    personalizationGroup.hidden = type !== 'customization'

    if (!product) {
        artisanGroup.hidden = false
        $('work-recipe-preview').innerHTML = 'Seleccioná un producto para ver qué se descontará del stock.'
        return
    }

    if (type === 'manufacturing') {
        artisanGroup.hidden = product.production_method === 'internal_workshop'
        const recipe = state.recipes.filter(item => Number(item.output_product_id) === Number(product.id))
        $('work-recipe-preview').innerHTML = recipe.length
            ? `<strong>Materiales que saldrán del stock:</strong><ul>${recipe.map(item => `<li>${esc(item.material_name)}: ${Number(item.quantity_per_unit) * quantity}</li>`).join('')}</ul>`
            : '<strong>Sin materiales propios:</strong> el artesano aporta los insumos. Solo se registrará el producto terminado que debe volver.'
    } else {
        const methods = state.personalizationMethods.filter(item => Number(item.product_id) === Number(product.id)).map(item => item.method)
        const previousMethod = $('work-personalization-method').value
        $('work-personalization-method').innerHTML = methods.map(method => `<option value="${method}">${method === 'laser_internal' ? 'Láser en taller Mercedes' : 'Plata, alpaca o dijes con artesano'}</option>`).join('')
        if (methods.includes(previousMethod)) $('work-personalization-method').value = previousMethod
        artisanGroup.hidden = $('work-personalization-method').value === 'laser_internal'
        $('work-recipe-preview').innerHTML = `<strong>Producto que pasa a personalización:</strong> ${esc(product.name)} x${quantity}. La unidad deja de estar disponible hasta que finalice el trabajo.`
    }
    if (artisanGroup.hidden) $('work-artisan').value = ''
}

const renderPackageLines = () => {
    $('package-item-lines').innerHTML = packageItems.map((item, index) => `
        <div class="package-item-line">
            <select data-package-product="${index}" required>${productOptions(state.products)}</select>
            <input data-package-quantity="${index}" type="number" min="1" value="${item.quantity}" required aria-label="Cantidad">
            <button type="button" data-package-remove="${index}" title="Quitar">×</button>
        </div>
    `).join('')
    packageItems.forEach((item, index) => {
        const select = document.querySelector(`[data-package-product="${index}"]`)
        if (select) select.value = item.product_id || ''
    })
    document.querySelectorAll('[data-package-product]').forEach(select => select.addEventListener('change', () => {
        packageItems[Number(select.dataset.packageProduct)].product_id = Number(select.value) || ''
    }))
    document.querySelectorAll('[data-package-quantity]').forEach(input => input.addEventListener('change', () => {
        packageItems[Number(input.dataset.packageQuantity)].quantity = Math.max(1, Number(input.value || 1))
    }))
    document.querySelectorAll('[data-package-remove]').forEach(button => button.addEventListener('click', () => {
        if (packageItems.length === 1) return
        packageItems.splice(Number(button.dataset.packageRemove), 1)
        renderPackageLines()
    }))
}

const hydrate = () => {
    const branchOptions = `<option value="">Seleccionar centro</option>${state.branches.map(branch => `<option value="${branch.id}">${esc(branch.name)}</option>`).join('')}`
    $('work-branch').innerHTML = branchOptions
    $('artisan-branch').innerHTML = branchOptions
    $('work-artisan').innerHTML = `<option value="">Seleccionar artesano</option>${state.artisans.filter(a => a.is_active).map(a => `<option value="${a.id}">${esc(a.name)} - ${esc(a.branch_name)}</option>`).join('')}`
    syncWorkProducts()
    renderPackageLines()
}

const render = () => {
    $('summary-grid').innerHTML = [
        ['Órdenes activas', state.workOrders.filter(order => !['completed', 'cancelled'].includes(order.status)).length],
        ['Con artesanos o taller', state.workOrders.filter(order => ['sent', 'in_progress', 'partial'].includes(order.status)).length],
        ['Artesanos activos', state.artisans.filter(artisan => artisan.is_active).length],
        ['Bultos preparados', state.packages.filter(pack => pack.status === 'prepared').length]
    ].map(([name, value]) => `<article class="summary-card"><strong>${value}</strong><span>${name}</span></article>`).join('')

    $('artisan-list').innerHTML = state.artisans.map(a => `<tr><td>${esc(a.name)}</td><td>${esc(a.branch_name)}</td><td>${esc(a.specialty || '-')}</td><td>${esc(a.phone || '-')}</td></tr>`).join('') || '<tr><td colspan="4">Todavía no hay artesanos.</td></tr>'
    $('work-list').innerHTML = state.workOrders.map(order => `<tr>
        <td><strong>${esc(order.code)}</strong><small>${order.type === 'customization' ? 'Personalización' : 'Fabricación'}</small></td>
        <td>${esc(order.artisan_name || 'Taller interno Mercedes')}</td><td>${esc(order.branch_name)}</td>
        <td>${esc(order.custody || 'Sin materiales propios')}</td><td>${esc(order.outputs || '-')}</td>
        <td><span class="status ${order.status}">${esc(labelStatus(order.status))}</span></td>
        <td class="actions">${order.status === 'draft' ? `<button data-send="${order.id}">Iniciar</button>` : ''}${['sent', 'in_progress', 'partial'].includes(order.status) ? `<button data-receive="${order.id}">Rendir</button>` : ''}</td>
    </tr>`).join('') || '<tr><td colspan="7">Todavía no hay órdenes.</td></tr>'
    $('package-list').innerHTML = state.packages.map(pack => `<tr><td><strong>${esc(pack.package_code)}</strong></td><td>${esc(pack.customer_reference)}</td><td>${esc(pack.items || '-')}</td><td><span class="status ${pack.status}">${esc(labelStatus(pack.status))}</span></td></tr>`).join('') || '<tr><td colspan="4">Todavía no hay bultos.</td></tr>'
    hydrate()
}

const load = async () => {
    try { state = await request('/api/operations-management/overview'); render() }
    catch (error) { notify(`${error.message}. Ejecutá primero la migración operativa.`, true) }
}

document.querySelectorAll('.tab').forEach(button => button.addEventListener('click', () => {
    document.querySelectorAll('.tab, .panel').forEach(element => element.classList.remove('active'))
    button.classList.add('active')
    document.querySelector(`[data-panel="${button.dataset.tab}"]`).classList.add('active')
}))

$('work-type').addEventListener('change', syncWorkProducts)
$('work-output').addEventListener('change', syncWorkDetails)
$('work-output-qty').addEventListener('input', syncWorkDetails)
$('work-personalization-method').addEventListener('change', syncWorkDetails)

$('artisan-form').addEventListener('submit', async event => {
    event.preventDefault()
    try {
        await request('/api/operations-management/artisans', { method: 'POST', body: JSON.stringify({ name: $('artisan-name').value, branch_id: $('artisan-branch').value, phone: $('artisan-phone').value, specialty: $('artisan-specialty').value, notes: $('artisan-notes').value }) })
        event.target.reset(); notify('Artesano creado'); await load()
    } catch (error) { notify(error.message, true) }
})

$('work-form').addEventListener('submit', async event => {
    event.preventDefault()
    try {
        await request('/api/operations-management/work-orders', { method: 'POST', body: JSON.stringify({
            type: $('work-type').value, origin_branch_id: $('work-branch').value, artisan_id: $('work-artisan').value || null,
            personalization_method: $('work-type').value === 'customization' ? $('work-personalization-method').value : null,
            outputs: [{ product_id: $('work-output').value, quantity: $('work-output-qty').value }],
            artisan_cost: $('work-cost').value || null, notes: $('work-notes').value
        }) })
        event.target.reset(); $('work-output-qty').value = 1; notify('Orden creada como borrador'); await load()
    } catch (error) { notify(error.message, true) }
})

$('work-list').addEventListener('click', async event => {
    const sendId = event.target.dataset.send
    const receiveId = event.target.dataset.receive
    try {
        if (sendId) {
            if (!confirm('Los materiales dejarán el stock disponible y pasarán a producción. ¿Continuar?')) return
            await request(`/api/operations-management/work-orders/${sendId}/send`, { method: 'POST' })
            notify('Producción iniciada')
        }
        if (receiveId) {
            const detail = await request(`/api/operations-management/work-orders/${receiveId}`)
            const materials = detail.materials.map(material => {
                const custody = material.quantity_sent - material.quantity_consumed - material.quantity_returned - material.quantity_discarded
                const returned = Number(prompt(`${material.product_name}: hay ${custody} en producción. ¿Cuántos vuelven sin usar?`, '0') || 0)
                const discarded = Number(prompt(`${material.product_name}: ¿Cuántos se descartan?`, '0') || 0)
                return { id: material.id, returned, discarded, consumed: Math.max(0, custody - returned - discarded) }
            })
            const outputs = detail.outputs.map(output => {
                const pending = output.quantity_requested - output.quantity_received - output.quantity_rejected
                const received = Number(prompt(`${output.product_name}: faltan ${pending}. ¿Cuántos ingresan terminados?`, String(pending)) || 0)
                return { id: output.id, received, rejected: Math.max(0, pending - received) }
            })
            await request(`/api/operations-management/work-orders/${receiveId}/receive`, { method: 'POST', body: JSON.stringify({ materials, outputs }) })
            notify('Rendición registrada y stock actualizado')
        }
        if (sendId || receiveId) await load()
    } catch (error) { notify(error.message, true) }
})

$('btn-add-package-item').addEventListener('click', () => {
    packageItems.push({ product_id: '', quantity: 1 })
    renderPackageLines()
})

$('package-form').addEventListener('submit', async event => {
    event.preventDefault()
    const items = packageItems.filter(item => item.product_id && item.quantity > 0)
    if (!items.length) return notify('Agregá al menos un producto al bulto', true)
    try {
        await request('/api/operations-management/packages', { method: 'POST', body: JSON.stringify({
            package_type: 'wholesale_order', customer_reference: $('package-customer').value,
            notes: $('package-notes').value, items
        }) })
        event.target.reset(); packageItems = [{ product_id: '', quantity: 1 }]; notify('Bulto mayorista preparado'); await load()
    } catch (error) { notify(error.message, true) }
})

load()
