// ============================================================================
// COMPONENTE: MODAL DE OPERACIONES EMPLEADO (Solo Egresos)
// ============================================================================

let searchTimeout = null;
let selectedProductsForOp = [];

document.addEventListener('DOMContentLoaded', () => {
    startWebSocket();
    setupEmployeeModalListeners();
});

// --- WEBSOCKETS (Tiempo Real) ---
function startWebSocket() {
    const socket = io();

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
    socket.on('movements_update', refreshProductSearch);
}

// --- UTILIDADES DE LIMPIEZA Y CIERRE ---
function closeAndCleanOperationModal() {
    document.getElementById('modal-operation').classList.remove('active');
    selectedProductsForOp = [];
    document.getElementById('op-search-prod').value = '';

    const grid = document.getElementById('catalog-grid');
    if (grid) grid.innerHTML = '';

    renderEmptyEditableRow();
}

function setupEmployeeModalListeners() {
    const searchInput = document.getElementById('op-search-prod');
    if (searchInput) {
        searchInput.addEventListener('input', () => {
            clearTimeout(searchTimeout);
            searchTimeout = setTimeout(searchProductsForOperation, 300);
        });
    }

    const btnClose = document.getElementById('btn-close-operation');
    if (btnClose) btnClose.addEventListener('click', closeAndCleanOperationModal);

    const btnCancel = document.getElementById('btn-cancel-op');
    if (btnCancel) btnCancel.addEventListener('click', closeAndCleanOperationModal);

    const overlay = document.getElementById('modal-operation');
    if (overlay) {
        overlay.addEventListener('click', (e) => {
            if (e.target === overlay) closeAndCleanOperationModal();
        });
    }
}

// --- APERTURA DEL MODAL ---
window.openOperationModal = function (type) {
    if (type !== 'out') return; // Seguridad: El empleado solo puede abrir 'out'

    selectedProductsForOp = [];
    document.getElementById('op-search-prod').value = '';
    renderEmptyEditableRow();

    searchProductsForOperation(''); // Cargamos todo el stock de entrada

    document.getElementById('modal-operation').classList.add('active');
    setTimeout(() => document.getElementById('op-search-prod').focus(), 100);
}

function renderEmptyEditableRow() {
    const tbody = document.getElementById('op-products-list');
    if (!tbody) return;
    tbody.innerHTML = `<tr><td colspan="5" class="text-center text-muted" style="padding: 2rem;">Utiliza el buscador para agregar productos a egresar.</td></tr>`;
}

// --- CARGA DE CATÁLOGO (Grilla) ---
window.searchProductsForOperation = async function () {
    const searchTerm = document.getElementById('op-search-prod').value.trim();
    const grid = document.getElementById('catalog-grid');
    if (!grid) return;

    grid.innerHTML = '<div style="grid-column: 1/-1; text-align: center; padding: 2rem; color: var(--text-muted);"><span class="material-symbols-outlined spin" style="vertical-align: middle;">refresh</span> Cargando stock...</div>';

    const apiUrl = `/api/stocks/catalog?search=${encodeURIComponent(searchTerm)}`;

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
                const pStock = product.quantity || 0;

                const isOutOfStock = pStock === 0;
                const cardClass = isOutOfStock ? 'catalog-card disabled' : 'catalog-card';
                const stockHtml = `<span class="catalog-stock ${isOutOfStock ? 'out-of-stock' : ''}">${isOutOfStock ? 'Sin Stock' : 'Stock: ' + pStock}</span>`;

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
                    card.onclick = () => addProductToTable(pId, pCode, pName, pStock);
                }
                grid.appendChild(card);
            });
        } else {
            grid.innerHTML = `<div style="grid-column: 1/-1; text-align: center; padding: 2rem; color: var(--text-muted);">No se encontraron productos en tu stock.</div>`;
        }
    } catch (err) {
        console.error(err);
        grid.innerHTML = '<div style="grid-column: 1/-1; text-align: center; color: #ef4444;">Error de conexión.</div>';
    }
}

// --- MANEJO DE TABLA INFERIOR ---
function addProductToTable(id, code, name, stockDisponible) {
    if (selectedProductsForOp.some(p => p.id === id)) return alert('El producto ya está en la lista.');
    if (stockDisponible === 0) return alert('No puedes egresar este producto porque su stock disponible es 0.');

    selectedProductsForOp.push({ id, code, name, quantity: 1, stockDisponible });
    renderOperationTable();
    document.getElementById('op-search-prod').value = '';
}

function renderOperationTable() {
    const tbody = document.getElementById('op-products-list');
    if (!tbody) return;

    if (selectedProductsForOp.length === 0) { renderEmptyEditableRow(); return; }

    tbody.innerHTML = '';
    selectedProductsForOp.forEach((prod, index) => {
        const tr = document.createElement('tr');
        const trashSvg = `<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" fill="currentColor" viewBox="0 0 24 24"><path d="M17 6V4c0-1.1-.9-2-2-2H9c-1.1 0-2 .9-2 2v2H2v2h2v12c0 1.1.9 2 2 2h12c1.1 0 2-.9 2-2V8h2V6zM9 4h6v2H9zm9 16H6V8h12z"></path><path d="M14.29 10.29 12 12.59l-2.29-2.3-1.42 1.42 2.3 2.29-2.3 2.29 1.42 1.42 2.29-2.3 2.29 2.3 1.42-1.42-2.3-2.29 2.3-2.29z"></path></svg>`;

        tr.innerHTML = `
            <td class="font-mono text-muted" style="font-size: 0.85rem;">${prod.code}</td>
            <td class="font-bold">${prod.name}</td>
            <td class="text-center font-bold" style="color: var(--primary);">${prod.stockDisponible}</td>
            <td class="text-center">
                <input type="number" min="1" max="${prod.stockDisponible}" value="${prod.quantity}" 
                       style="width: 80px; padding: 0.4rem; text-align: center; border: 1px solid var(--border-color); border-radius: 6px; background: var(--bg-input); color: var(--text-primary); font-weight: 600;"
                       onchange="updateProductQuantity(${index}, this.value)">
            </td>
            <td class="text-center">
                <button type="button" onclick="removeProductFromOp(${index})" style="background: transparent; border: none; color: #ef4444; cursor: pointer; padding: 6px; border-radius: 6px; display: inline-flex; transition: 0.2s;" onmouseover="this.style.background='rgba(239,68,68,0.1)'" onmouseout="this.style.background='transparent'">${trashSvg}</button>
            </td>
        `;
        tbody.appendChild(tr);
    });
}

window.updateProductQuantity = function (index, newQuantity) {
    const prod = selectedProductsForOp[index];
    let qty = parseInt(newQuantity) || 1;
    if (qty > prod.stockDisponible) {
        alert(`Stock insuficiente. Solo tienes ${prod.stockDisponible} unidades disponibles.`);
        qty = prod.stockDisponible;
    }
    if (qty < 1) qty = 1;
    prod.quantity = qty;
    renderOperationTable();
}

window.removeProductFromOp = function (index) {
    selectedProductsForOp.splice(index, 1);
    renderOperationTable();
}

// --- SUBMIT DE OPERACIÓN AL BACKEND ---
const btnConfirmOp = document.getElementById('btn-confirm-op');
if (btnConfirmOp) {
    btnConfirmOp.addEventListener('click', async () => {
        if (selectedProductsForOp.length === 0) return alert('Debes agregar al menos un producto a la operación.');

        const payload = {
            type: 'egreso',
            details: selectedProductsForOp.map(p => ({
                product_id: p.id,
                quantity: p.quantity
            }))
        };

        if (!confirm('¿Estás seguro de registrar este egreso?')) return;

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
                alert('¡Egreso registrado con éxito!');
                closeAndCleanOperationModal();
                window.dispatchEvent(new CustomEvent('operationCompleted'));
            } else {
                alert('Error al registrar: ' + (data.message || 'Verificá los datos.'));
            }
        } catch (error) {
            console.error(error);
            alert('Ocurrió un error de conexión con el servidor.');
        } finally {
            btn.disabled = false;
            document.getElementById('btn-confirm-text').textContent = originalText;
        }
    });
}