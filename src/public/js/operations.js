let globalBranches = [];
let currentOperationType = null;
let selectedProductsForOp = [];
let currentShipmentId = null;

document.addEventListener('DOMContentLoaded', () => {
    fetchBranches();
    loadPendingShipments();
    setupModalListeners();
});

// --- CARGA DE CATÁLOGOS ---

async function fetchBranches() {
    try {
        const res = await fetch('/api/branches/catalog');
        const json = await res.json();
        if (json.status === 'success') {
            globalBranches = json.data;
            const select = document.getElementById('op-dest');
            if (select) {
                select.innerHTML = '<option value="" disabled selected>Seleccionar sucursal...</option>';
                globalBranches.forEach(branch => {
                    select.innerHTML += `<option value="${branch.id}">${branch.name}</option>`;
                });
            }
        }
    } catch (error) { console.error(error); }
}

// --- ENVÍOS PENDIENTES (ALERTAS) ---

async function loadPendingShipments() {
    const container = document.getElementById('alerts-grid-container');
    const alertTitle = document.getElementById('alert-title');
    const alertIcon = document.getElementById('alert-icon');

    try {
        const res = await fetch('/api/movements/shipments');
        const json = await res.json();

        if (json.status === 'success') {
            const shipments = json.data;

            if (shipments.length === 0) {
                alertTitle.textContent = 'Todo al día';
                alertIcon.textContent = 'check_circle';
                alertIcon.style.color = '#10b981';
                container.innerHTML = '<div style="padding: 1.5rem; color: #64748b; font-size: 0.95rem;">No hay envíos pendientes en este momento.</div>';
                return;
            }

            alertTitle.textContent = 'Requiere tu atención';
            alertIcon.textContent = 'notifications_active';
            alertIcon.style.color = '#ef4444';
            container.innerHTML = '';

            shipments.forEach(shipment => {
                const dateObj = new Date(shipment.date);
                const dateStr = dateObj.toLocaleDateString('es-AR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' });

                // Lógica de botones por Rol
                let actionButton = '';
                if (window.USER_ROLE === 'admin') {
                    actionButton = `
                        <button class="btn-primary" onclick="openOperationModal('dispatch', ${shipment.id}, '${shipment.receipt_number || shipment.id}')">
                            Verificar y Despachar
                        </button>
                    `;
                } else {
                    actionButton = `
                        <button class="btn-primary btn-receive" onclick="openOperationModal('receive', ${shipment.id}, '${shipment.receipt_number || shipment.id}')">
                            Revisar y Confirmar Llegada
                        </button>
                    `;
                }

                const card = document.createElement('div');
                card.className = 'alert-card';
                card.innerHTML = `
                    <div class="alert-info">
                        <span class="badge-pending">${(shipment.status || 'Pendiente').replace('_', ' ')}</span>
                        <h3>Envío ${shipment.receipt_number || '#' + shipment.id}</h3>
                        <p>Desde/Hacia: <strong>${shipment.branch || shipment.origin_branch_name || 'Desconocido'}</strong></p>
                        <p class="alert-date">Fecha: ${dateStr}</p>
                    </div>
                    ${actionButton}
                `;
                container.appendChild(card);
            });
        }
    } catch (error) {
        console.error(error);
        container.innerHTML = '<p style="color: #ef4444; padding: 1.5rem;">Error al cargar las alertas.</p>';
    }
}

// --- MODAL DE OPERACIONES ---

function setupModalListeners() {
    const modalOp = document.getElementById('modal-operation');
    document.getElementById('btn-close-operation').addEventListener('click', () => modalOp.classList.remove('active'));
    document.getElementById('btn-cancel-op').addEventListener('click', () => modalOp.classList.remove('active'));

    document.querySelectorAll('.modal-overlay').forEach(overlay => {
        overlay.addEventListener('click', (e) => {
            if (e.target === overlay) overlay.classList.remove('active');
        });
    });

    const searchBtn = document.getElementById('btn-search-prod');
    if (searchBtn) searchBtn.addEventListener('click', searchProductsForOperation);
}

async function openOperationModal(type, refId = null, receipt = null) {
    currentOperationType = type;
    currentShipmentId = refId;
    selectedProductsForOp = [];

    const modalOp = document.getElementById('modal-operation');
    const titleOp = document.getElementById('modal-op-title');
    const subtitleOp = document.getElementById('modal-op-subtitle');
    const controlsDiv = document.getElementById('op-controls');
    const groupDest = document.getElementById('group-dest');
    const groupSearch = document.getElementById('group-search');
    const colAction = document.getElementById('col-action-remove');
    const prodList = document.getElementById('op-products-list');
    const btnConfirmText = document.getElementById('btn-confirm-text');
    const btnConfirmIcon = document.getElementById('btn-confirm-icon');
    const btnConfirmOp = document.getElementById('btn-confirm-op');

    prodList.innerHTML = '';
    const searchInput = document.getElementById('op-search-prod');
    if (searchInput) searchInput.value = '';

    controlsDiv.style.display = 'grid';
    groupSearch.style.display = 'block';
    groupDest.style.display = 'none';
    colAction.textContent = 'Acción';
    btnConfirmOp.className = 'btn-primary';

    switch (type) {
        case 'dispatch':
            titleOp.textContent = `Despachar Envío ${receipt}`;
            subtitleOp.textContent = 'Revisa los productos antes de marcar el envío como "En Proceso / Viajando".';
            controlsDiv.style.display = 'none';
            colAction.textContent = '';
            btnConfirmIcon.textContent = 'local_shipping';
            btnConfirmText.textContent = 'Marcar En Camino';
            loadShipmentDetails(refId);
            break;

        case 'receive':
            titleOp.textContent = `Confirmar Envío ${receipt}`;
            subtitleOp.textContent = 'Revisa los productos que llegaron en este envío.';
            controlsDiv.style.display = 'none';
            colAction.textContent = '';
            btnConfirmIcon.textContent = 'done_all';
            btnConfirmText.textContent = 'Confirmar Llegada';
            btnConfirmOp.className = 'btn-success';
            loadShipmentDetails(refId);
            break;

        case 'in':
            titleOp.textContent = 'Ingreso de Mercadería';
            subtitleOp.textContent = 'Busca los productos y declara la cantidad a ingresar al sistema.';
            btnConfirmIcon.textContent = 'save';
            btnConfirmText.textContent = 'Guardar Ingreso';
            renderEmptyEditableRow();
            break;

        case 'transfer':
            titleOp.textContent = 'Enviar a Sucursal';
            subtitleOp.textContent = 'Selecciona destino, busca los productos y declara cantidades a enviar.';
            groupDest.style.display = 'block';
            btnConfirmIcon.textContent = 'send';
            btnConfirmText.textContent = 'Confirmar Envío';
            renderEmptyEditableRow();
            break;

        case 'out':
            titleOp.textContent = 'Egreso / Salida';
            subtitleOp.textContent = 'Busca los productos a descontar del stock actual.';
            btnConfirmIcon.textContent = 'remove_circle_outline';
            btnConfirmText.textContent = 'Registrar Egreso';
            btnConfirmOp.className = 'btn-danger';
            renderEmptyEditableRow();
            break;
    }

    modalOp.classList.add('active');
}

async function loadShipmentDetails(refId) {
    const prodList = document.getElementById('op-products-list');
    prodList.innerHTML = '<tr><td colspan="4" class="text-center"><span class="material-symbols-outlined spin">refresh</span></td></tr>';
    try {
        const res = await fetch(`/api/movements/${refId}/details`);
        const json = await res.json();
        if (json.status === 'success') {
            renderReadOnlyProducts(json.data);
        }
    } catch (e) {
        console.error(e);
        prodList.innerHTML = '<tr><td colspan="4" class="text-center" style="color:red;">Error cargando detalles.</td></tr>';
    }
}

function renderReadOnlyProducts(products) {
    const prodList = document.getElementById('op-products-list');
    prodList.innerHTML = '';

    if (!products || products.length === 0) {
        prodList.innerHTML = '<tr><td colspan="4" class="text-center text-muted">No hay productos.</td></tr>';
        return;
    }

    products.forEach(p => {
        prodList.innerHTML += `
            <tr>
                <td class="font-mono text-muted">${p.barcode || 'S/C'}</td>
                <td class="font-bold">${p.product_name}</td>
                <td class="text-center"><span class="qty-badge-modal" style="background:#f1f5f9; padding:4px 8px; border-radius:6px; font-weight:bold;">${p.quantity}</span></td>
                <td></td>
            </tr>
        `;
    });
}

function renderEmptyEditableRow() {
    document.getElementById('op-products-list').innerHTML = `
        <tr>
            <td colspan="4" class="text-center text-muted" style="padding: 2rem;">
                Utiliza el buscador de arriba para agregar productos a la lista.
            </td>
        </tr>
    `;
}

// --- BÚSQUEDA Y MANEJO DE PRODUCTOS ---

async function searchProductsForOperation() {
    const searchTerm = document.getElementById('op-search-prod').value;
    if (!searchTerm) return alert('Ingresá un término de búsqueda');

    let apiUrl = currentOperationType === 'in'
        ? `/api/products/catalog?search=${encodeURIComponent(searchTerm)}`
        : `/api/stocks/catalog?search=${encodeURIComponent(searchTerm)}`;

    try {
        const res = await fetch(apiUrl);
        const json = await res.json();

        if (json.status === 'success' && json.data.length > 0) {
            const product = json.data[0];

            if (selectedProductsForOp.some(p => p.id === product.id)) {
                return alert('El producto ya está en la lista.');
            }

            selectedProductsForOp.push({
                id: product.id,
                code: product.barcode || product.code || 'S/C',
                name: product.name || product.product_name,
                quantity: 1
            });

            renderOperationTable();
            document.getElementById('op-search-prod').value = '';

        } else {
            alert('No se encontró ningún producto.');
        }
    } catch (err) { console.error('Error buscando producto:', err); }
}

function renderOperationTable() {
    const tbody = document.getElementById('op-products-list');
    if (selectedProductsForOp.length === 0) {
        renderEmptyEditableRow();
        return;
    }

    tbody.innerHTML = '';
    selectedProductsForOp.forEach((prod, index) => {
        const tr = document.createElement('tr');
        tr.innerHTML = `
            <td class="font-mono text-muted">${prod.code}</td>
            <td class="font-bold">${prod.name}</td>
            <td class="text-center">
                <input type="number" min="1" value="${prod.quantity}" 
                       class="form-control text-center" style="width: 80px;"
                       onchange="updateProductQuantity(${index}, this.value)">
            </td>
            <td class="text-center">
                <button class="btn-icon delete" onclick="removeProductFromOp(${index})">
                    <span class="material-symbols-outlined icon-small">delete</span>
                </button>
            </td>
        `;
        tbody.appendChild(tr);
    });
}

window.updateProductQuantity = function (index, newQuantity) {
    selectedProductsForOp[index].quantity = parseInt(newQuantity) || 1;
}

window.removeProductFromOp = function (index) {
    selectedProductsForOp.splice(index, 1);
    renderOperationTable();
}

// --- CONFIRMACIÓN AL BACKEND ---

document.getElementById('btn-confirm-op').addEventListener('click', async () => {

    // Casos Especiales: Cambio de estado de Envío
    if (currentOperationType === 'receive' || currentOperationType === 'dispatch') {
        const accion = currentOperationType === 'receive' ? 'llegada' : 'salida y despacho';
        if (!confirm(`¿Confirmar la ${accion} de este envío?`)) return;

        try {
            const res = await fetch(`/api/movements/changeStatus/${currentShipmentId}`, { method: 'PATCH' });
            const data = await res.json();
            if (res.ok || data.status === 'success') {
                alert('¡Estado del envío actualizado!');
                document.getElementById('modal-operation').classList.remove('active');
                loadPendingShipments();
            } else {
                alert('Error: ' + data.message);
            }
        } catch (e) { console.error(e); }
        return;
    }

    // Casos Regulares: Crear nueva operación
    if (selectedProductsForOp.length === 0) {
        return alert('Debes agregar al menos un producto a la operación.');
    }

    let dbType = currentOperationType === 'in' ? 'ingreso' : currentOperationType === 'out' ? 'egreso' : 'envio';

    const payload = {
        type: dbType,
        details: selectedProductsForOp.map(p => ({
            product_id: p.id,
            quantity: p.quantity
        }))
    };

    if (dbType === 'envio') {
        const destSelect = document.getElementById('op-dest').value;
        if (!destSelect) return alert('Selecciona una sucursal destino.');
        payload.destination_branch_id = parseInt(destSelect);
    }

    if (!confirm(`¿Estás seguro de registrar este ${dbType}?`)) return;

    try {
        const res = await fetch('/api/movements', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });

        const data = await res.json();

        if (res.ok || data.status === 'success') {
            alert('¡Operación registrada con éxito!');
            document.getElementById('modal-operation').classList.remove('active');
            selectedProductsForOp = [];
            loadPendingShipments();
        } else {
            alert('Error al registrar: ' + (data.message || JSON.stringify(data.error)));
        }
    } catch (error) {
        console.error(error);
        alert('Ocurrió un error de conexión con el servidor.');
    }
});