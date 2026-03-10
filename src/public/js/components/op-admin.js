let currentOperationType = null;
let searchTimeout = null;
let selectedProductsForOp = [];
let adminBranches = [];

document.addEventListener('DOMContentLoaded', () => {
    initOpAdminSocket()
    fetchAdminBranches();
    setupAdminModalListeners();
});

function initOpAdminSocket() {
    const socket = io()

    const handleBranches = () => {
        sessionStorage.removeItem('cache_branches_catalog')
        fetchAdminBranches();
    }

    socket.on('new_branch', handleBranches)
    socket.on('branch_updated', handleBranches)
    socket.on('branch_deleted', handleBranches)
    socket.on('brach_activated', handleBranches)

    const refreshProductSearch = () => {
        const modal = document.getElementById('modal-operation');
        if (modal && modal.classList.contains('active')) {
            searchProductsForOperation();
        }
    };
    socket.on('new_product', refreshProductSearch);
    socket.on('product_updated', refreshProductSearch);
    socket.on('product_deleted', refreshProductSearch);
    socket.on('product_activated', refreshProductSearch);
    socket.on('movements_updated', refreshProductSearch);
}

async function fetchAdminBranches() {
    try {
        const json = await window.fetchWithCache('/api/branches/catalog', 'cache_branches_catalog', 120)

        if (json.status === 'success') {
            adminBranches = json.data;
            const select = document.getElementById('op-dest');
            if (select) {
                select.innerHTML = '<option value="" disabled selected>Seleccionar sucursal...</option>';
                adminBranches.forEach(branch => select.innerHTML += `<option value="${branch.id}">${branch.name}</option>`);
            }
        }
    } catch (error) { console.error("Error cargando sucursales:", error); }
}

function closeAndCleanOperationModal() {
    document.getElementById('modal-operation').classList.remove('active');
    selectedProductsForOp = [];
    document.getElementById('op-search-prod').value = '';
    const destSelect = document.getElementById('op-dest');
    if (destSelect) destSelect.value = '';

    document.getElementById('catalog-grid').innerHTML = ''; // Limpiamos grilla
    renderEmptyEditableRow();
}

function setupAdminModalListeners() {
    const searchInput = document.getElementById('op-search-prod');
    if (searchInput) {
        searchInput.addEventListener('input', () => {
            clearTimeout(searchTimeout);
            searchTimeout = setTimeout(searchProductsForOperation, 300);
        });
    }

    document.getElementById('btn-close-operation').addEventListener('click', closeAndCleanOperationModal);
    document.getElementById('btn-cancel-op').addEventListener('click', closeAndCleanOperationModal);

    const overlay = document.getElementById('modal-operation');
    if (overlay) {
        overlay.addEventListener('click', (e) => {
            if (e.target === overlay) closeAndCleanOperationModal();
        });
    }
}

window.openOperationModal = function (type) {
    if (type !== 'in' && type !== 'transfer') return;

    currentOperationType = type;
    selectedProductsForOp = [];

    const modalOp = document.getElementById('modal-operation');
    const titleOp = document.getElementById('modal-op-title');
    const subtitleOp = document.getElementById('modal-op-subtitle');
    const controlsDiv = document.getElementById('op-controls');
    const groupDest = document.getElementById('group-dest');
    const groupSearch = document.getElementById('group-search');
    const thead = document.querySelector('.detail-products-table thead tr');
    const btnConfirmText = document.getElementById('btn-confirm-text');
    const btnConfirmIcon = document.getElementById('btn-confirm-icon');
    const btnConfirmOp = document.getElementById('btn-confirm-op');

    document.getElementById('op-search-prod').value = '';

    controlsDiv.style.display = 'grid';
    groupSearch.style.display = 'block';
    groupDest.style.display = 'none';
    btnConfirmOp.className = 'btn-primary';

    if (type === 'in') {
        titleOp.textContent = 'Ingreso de Mercadería';
        subtitleOp.textContent = 'Busca productos para ingresar a la central.';
        btnConfirmIcon.textContent = 'save';
        btnConfirmText.textContent = 'Guardar Ingreso';
        thead.innerHTML = `<th>Código</th><th>Producto</th><th class="text-center" width="160">Cant. a Ingresar</th><th class="text-center" width="60"></th>`;
    } else if (type === 'transfer') {
        titleOp.textContent = 'Enviar a Sucursal';
        subtitleOp.textContent = 'Selecciona destino y busca los productos de tu stock.';
        groupDest.style.display = 'block';
        btnConfirmIcon.textContent = 'send';
        btnConfirmText.textContent = 'Confirmar Envío';
        thead.innerHTML = `<th>Código</th><th>Producto</th><th class="text-center" width="100">Stock Disp.</th><th class="text-center" width="140">Cant. a Enviar</th><th class="text-center" width="60"></th>`;
    }

    renderEmptyEditableRow();
    searchProductsForOperation(''); // Cargamos todo de entrada
    modalOp.classList.add('active');
    setTimeout(() => document.getElementById('op-search-prod').focus(), 100);
}

function renderEmptyEditableRow() {
    const colSpan = currentOperationType === 'in' ? "4" : "5";
    document.getElementById('op-products-list').innerHTML = `<tr><td colspan="${colSpan}" class="text-center text-muted" style="padding: 2rem;">Utiliza el buscador para agregar productos a la lista.</td></tr>`;
}

window.searchProductsForOperation = async function () {
    const searchTerm = document.getElementById('op-search-prod').value.trim();
    const grid = document.getElementById('catalog-grid');
    if (!grid) return;

    grid.innerHTML = '<div style="grid-column: 1/-1; text-align: center; padding: 2rem; color: var(--text-muted);"><span class="material-symbols-outlined spin" style="vertical-align: middle;">refresh</span> Cargando...</div>';

    let apiUrl = currentOperationType === 'in'
        ? `/api/products/catalog?search=${encodeURIComponent(searchTerm)}`
        : `/api/stocks/catalog?search=${encodeURIComponent(searchTerm)}`;

    try {
        const res = await fetch(apiUrl);
        const json = await res.json();
        grid.innerHTML = '';

        if (json.status === 'success' && json.data.length > 0) {
            json.data.forEach(product => {
                const pId = product.product_id || product.id;
                const pCode = product.cod_bar || product.code || 'S/C';
                const pName = product.name || product.product_name;
                const pImg = product.img || product.url_img_small || '/img/no-image.png';
                const pIsRegistered = product.is_registered !== undefined ? product.is_registered : true;
                const pStock = currentOperationType === 'in' ? Infinity : (product.quantity || 0);

                const isOutOfStock = pStock === 0 && currentOperationType !== 'in';
                const cardClass = isOutOfStock ? 'catalog-card disabled' : 'catalog-card';
                const stockHtml = currentOperationType !== 'in'
                    ? `<span class="catalog-stock ${isOutOfStock ? 'out-of-stock' : ''}">${isOutOfStock ? 'Sin Stock' : 'Stock: ' + pStock}</span>`
                    : '';

                const card = document.createElement('div');
                card.className = cardClass;
                card.innerHTML = `
                    <img src="${pImg}" onerror="this.src='/img/no-image.png'" alt="${pName}" class="catalog-img">
                    <div class="catalog-info">
                        <span class="catalog-code">${pCode}</span>
                        <span class="catalog-name" title="${pName}">${pName}</span>
                        ${stockHtml}
                    </div>
                `;

                if (!isOutOfStock) {
                    card.onclick = () => window.addProductToTable(pId, pCode, pName, pStock, pIsRegistered);
                }
                grid.appendChild(card);
            });
        } else {
            grid.innerHTML = `<div style="grid-column: 1/-1; text-align: center; padding: 2rem; color: var(--text-muted);">No se encontraron productos.</div>`;
        }
    } catch (err) { console.error(err); grid.innerHTML = '<div style="grid-column: 1/-1; text-align: center; color: #ef4444;">Error de conexión.</div>'; }
}

window.addProductToTable = function (id, code, name, stockDisponible, isRegistered = true) {
    if (selectedProductsForOp.some(p => p.id === id)) return alert('El producto ya está en la lista.');
    if (stockDisponible === 0 && currentOperationType !== 'in') return alert('Stock insuficiente.');

    selectedProductsForOp.push({ id, code, name, quantity: 1, stockDisponible, is_registered: isRegistered, min_quantity: 0 });
    renderOperationTable();
    document.getElementById('op-search-prod').value = '';
}

function renderOperationTable() {
    const tbody = document.getElementById('op-products-list');
    if (selectedProductsForOp.length === 0) { renderEmptyEditableRow(); return; }

    tbody.innerHTML = '';
    selectedProductsForOp.forEach((prod, index) => {
        const tr = document.createElement('tr');
        const stockCol = currentOperationType !== 'in' ? `<td class="text-center font-bold" style="color: var(--primary);">${prod.stockDisponible}</td>` : '';
        const maxAttr = currentOperationType !== 'in' ? `max="${prod.stockDisponible}"` : '';
        const trashSvg = `<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" fill="currentColor" viewBox="0 0 24 24"><path d="M17 6V4c0-1.1-.9-2-2-2H9c-1.1 0-2 .9-2 2v2H2v2h2v12c0 1.1.9 2 2 2h12c1.1 0 2-.9 2-2V8h2V6zM9 4h6v2H9zm9 16H6V8h12z"></path><path d="M14.29 10.29 12 12.59l-2.29-2.3-1.42 1.42 2.3 2.29-2.3 2.29 1.42 1.42 2.29-2.3 2.29 2.3 1.42-1.42-2.3-2.29 2.3-2.29z"></path></svg>`;

        let quantityCellHtml = `<input type="number" min="1" ${maxAttr} value="${prod.quantity}" style="width: 80px; padding: 0.4rem; text-align: center; border: 1px solid var(--border-color); border-radius: 6px; background: var(--bg-input); color: var(--text-primary); font-weight: 600;" onchange="window.updateProductQuantity(${index}, this.value)">`;

        if (currentOperationType === 'in' && !prod.is_registered) {
            quantityCellHtml = `<div style="display: flex; flex-direction: column; align-items: center; gap: 6px;">${quantityCellHtml}<div style="font-size: 0.75rem; color: var(--text-muted); display: flex; align-items: center; gap: 4px;"><span title="Configurar stock mínimo">Mín:</span><input type="number" min="0" value="${prod.min_quantity}" style="width: 50px; padding: 0.2rem; text-align: center; border: 1px dashed var(--border-color); border-radius: 4px; background: transparent; color: var(--text-primary);" onchange="window.updateProductMinQuantity(${index}, this.value)"></div></div>`;
        }

        tr.innerHTML = `
            <td class="font-mono text-muted" style="font-size: 0.85rem;">${prod.code}</td>
            <td class="font-bold">${prod.name}</td>
            ${stockCol}
            <td class="text-center">${quantityCellHtml}</td>
            <td class="text-center">
                <button type="button" onclick="window.removeProductFromOp(${index})" style="background: transparent; border: none; color: #ef4444; cursor: pointer; padding: 6px; border-radius: 6px; display: inline-flex; transition: 0.2s;" onmouseover="this.style.background='rgba(239,68,68,0.1)'" onmouseout="this.style.background='transparent'">${trashSvg}</button>
            </td>
        `;
        tbody.appendChild(tr);
    });
}

window.updateProductQuantity = function (index, val) {
    const prod = selectedProductsForOp[index];
    let qty = parseInt(val) || 1;
    if (currentOperationType !== 'in' && qty > prod.stockDisponible) {
        alert(`Stock insuficiente.`);
        qty = prod.stockDisponible;
    }
    prod.quantity = Math.max(1, qty);
    renderOperationTable();
}

window.updateProductMinQuantity = function (index, val) {
    selectedProductsForOp[index].min_quantity = Math.max(0, parseInt(val) || 0);
}

window.removeProductFromOp = function (index) {
    selectedProductsForOp.splice(index, 1);
    renderOperationTable();
}

document.getElementById('btn-confirm-op').addEventListener('click', async () => {
    if (selectedProductsForOp.length === 0) return alert('Agrega productos.');
    let dbType = currentOperationType === 'in' ? 'ingreso' : 'envio';
    const payload = {
        type: dbType,
        details: selectedProductsForOp.map(p => {
            const detailObj = { product_id: p.id, quantity: p.quantity };
            if (p.min_quantity > 0) detailObj.min_quantity = p.min_quantity;
            return detailObj;
        })
    };

    if (dbType === 'envio') {
        const destSelect = document.getElementById('op-dest');
        if (!destSelect || !destSelect.value) return alert('Selecciona destino.');
        payload.destination_branch_id = parseInt(destSelect.value);
    }

    if (!confirm(`¿Estás seguro de registrar este ${dbType}?`)) return;

    const btn = document.getElementById('btn-confirm-op');
    const originalText = document.getElementById('btn-confirm-text').textContent;
    btn.disabled = true;
    document.getElementById('btn-confirm-text').textContent = 'Guardando...';

    try {
        const res = await fetch('/api/movements', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });
        const data = await res.json();
        if (data.status === 'success') {
            alert('¡Operación registrada!');
            closeAndCleanOperationModal();
            window.dispatchEvent(new CustomEvent('operationCompleted'));
        } else {
            alert('Error: ' + (data.message || 'Verificá los datos.'));
        }
    } catch (err) { alert('Error de conexión.'); }
    finally { btn.disabled = false; document.getElementById('btn-confirm-text').textContent = originalText; }
});
