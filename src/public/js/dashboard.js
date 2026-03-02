// ============================================================================
// VARIABLES GLOBALES
// ============================================================================
let globalCategories = [];
let globalBranches = [];
let currentOperationType = null;
let searchTimeout = null; 
let selectedProductsForOp = []; 

// ============================================================================
// INICIALIZACIÓN
// ============================================================================
document.addEventListener('DOMContentLoaded', () => {
    loadDashboardCards();
    loadRecentMovements();
    fetchCategories();
    fetchBranches();
    setupModalListeners();
});

// ============================================================================
// 1. CARGA DE KPIs (Tarjetas Superiores)
// ============================================================================
async function loadDashboardCards() {
    try {
        const resEgresos = await fetch('/api/statistics/comparation-egresses');
        const dataEgresos = await resEgresos.json();

        if (dataEgresos.status === 'success') {
            const { total, variation, trend } = dataEgresos.data;
            document.getElementById('egresos-total').textContent = total;
            const trendElement = document.getElementById('egresos-trend');

            if (trend === 'subió') {
                trendElement.className = 'kpi-trend up';
                trendElement.innerHTML = `<span class="material-symbols-outlined" style="font-size: 18px; font-weight: bold;">north_east</span> ${variation}% vs mes anterior`;
            } else if (trend === 'bajó') {
                trendElement.className = 'kpi-trend down';
                trendElement.innerHTML = `<span class="material-symbols-outlined" style="font-size: 18px; font-weight: bold;">south_east</span> ${variation}% vs mes anterior`;
            } else {
                trendElement.className = 'kpi-trend';
                trendElement.innerHTML = `<span class="material-symbols-outlined" style="font-size: 18px;">remove</span> Sin variación`;
            }
        }

        const resStock = await fetch('/api/stocks/low-stock/count');
        const dataStock = await resStock.json();

        if (dataStock.status === 'success') {
            const stockCount = dataStock.data;
            document.getElementById('stock-total').textContent = stockCount;
            const stockStatus = document.getElementById('stock-status');
            const stockIcon = document.getElementById('stock-icon');

            if (stockCount === 0) {
                stockStatus.innerHTML = `<span class="material-symbols-outlined" style="font-size: 16px;">check_circle</span> Todo en orden`;
                stockStatus.className = 'kpi-trend up';
                stockIcon.className = 'kpi-icon green';
            } else {
                stockStatus.innerHTML = `<span class="material-symbols-outlined" style="font-size: 16px;">warning</span> Requieren atención`;
                stockStatus.className = 'kpi-trend down';
                stockIcon.className = 'kpi-icon red-bg';
            }
        }

        const resEnvios = await fetch('/api/statistics/pending-shipments-count');
        const dataEnvios = await resEnvios.json();
        if (dataEnvios.status === 'success') {
            document.getElementById('envios-total').textContent = dataEnvios.data;
        }

    } catch (error) {
        console.error("Error cargando dashboard:", error);
    }
}

// ============================================================================
// 2. CARGA DE ÚLTIMOS MOVIMIENTOS (Tabla)
// ============================================================================
async function loadRecentMovements() {
    const tbody = document.getElementById('recent-movements-list');

    try {
        const response = await fetch('/api/movements/recent');
        const result = await response.json();

        if (result.status === 'success') {
            tbody.innerHTML = '';

            if (result.data.length === 0) {
                tbody.innerHTML = `<tr><td colspan="5" style="text-align: center; padding: 2rem; color: #64748b;">No hay movimientos recientes.</td></tr>`;
                return;
            }

            result.data.forEach(mov => {
                let icon = 'help';
                if (mov.type.toLowerCase() === 'ingreso') icon = 'download';
                else if (mov.type.toLowerCase() === 'egreso') icon = 'upload';
                else if (mov.type.toLowerCase() === 'envio') icon = 'local_shipping';

                const dateObj = new Date(mov.date);
                const formattedDate = dateObj.toLocaleDateString('es-AR', { day: '2-digit', month: '2-digit', year: 'numeric' });

                const row = document.createElement('tr');
                row.className = 'movement-row';
                row.innerHTML = `
                    <td class="col-id">#${mov.id}</td>
                    <td class="col-nro">${mov.receipt_number}</td>
                    <td class="col-type"><span class="material-symbols-outlined icon-small">${icon}</span> ${mov.type}</td>
                    <td class="col-date">${formattedDate}</td>
                    <td class="col-status"><span class="badge ${mov.status.toLowerCase()}">${mov.status.replace('_', ' ')}</span></td>
                `;
                tbody.appendChild(row);
            });
        }
    } catch (error) {
        console.error("Error cargando movimientos:", error);
        tbody.innerHTML = `<tr><td colspan="5" style="text-align: center; padding: 1rem; color: #ef4444;">Error al cargar datos.</td></tr>`;
    }
}

// ============================================================================
// 3. PRE-CARGA DE DATOS PARA MODALES
// ============================================================================
async function fetchCategories() {
    try {
        const res = await fetch('/api/products/categories');
        const json = await res.json();
        if (json.status === 'success') {
            globalCategories = json.data;
            populateCategorySelect();
        }
    } catch (error) { console.error("Error cargando categorías:", error); }
}

async function fetchBranches() {
    try {
        const res = await fetch('/api/branches/catalog');
        const json = await res.json();
        if (json.status === 'success') {
            globalBranches = json.data;
            populateBranchSelect();
        }
    } catch (error) { console.error("Error cargando sucursales:", error); }
}

function populateCategorySelect() {
    const select = document.getElementById('product-category-select');
    if (!select) return;
    select.innerHTML = '<option value="" disabled selected>Seleccionar...</option>';
    globalCategories.forEach(cat => select.innerHTML += `<option value="${cat.id}">${cat.name}</option>`);
}

function populateBranchSelect() {
    const select = document.getElementById('op-dest');
    if (!select) return;
    select.innerHTML = '<option value="" disabled selected>Seleccionar sucursal...</option>';
    globalBranches.forEach(branch => select.innerHTML += `<option value="${branch.id}">${branch.name}</option>`);
}

// ============================================================================
// 4. LÓGICA DE APERTURA Y CIERRE (LIMPIEZA) DE MODALES
// ============================================================================
function handleSearchInput() {
    clearTimeout(searchTimeout);
    searchTimeout = setTimeout(() => {
        searchProductsForOperation();
    }, 300);
}

// ESTA FUNCIÓN LIMPIA TODO AL CERRAR
function closeAndCleanOperationModal() {
    document.getElementById('modal-operation').classList.remove('active');
    selectedProductsForOp = []; 
    document.getElementById('op-search-prod').value = '';
    const destSelect = document.getElementById('op-dest');
    if(destSelect) destSelect.value = '';
    const resultsList = document.getElementById('search-results-list');
    if(resultsList) resultsList.style.display = 'none';
    renderEmptyEditableRow();
}

function setupModalListeners() {
    // Abrir modal crear producto
    document.querySelectorAll('.btn-modal-trigger').forEach(btn => {
        btn.addEventListener('click', () => {
            const targetId = btn.getAttribute('data-target');
            const modal = document.getElementById(targetId);
            if (modal) modal.classList.add('active');
        });
    });

    // Cierre genérico (Crear Producto)
    document.querySelectorAll('.btn-close-modal:not(#btn-close-operation), .btn-cancel:not(#btn-cancel-op)').forEach(btn => {
        btn.addEventListener('click', (e) => {
            const targetId = btn.getAttribute('data-target');
            if (targetId) {
                e.preventDefault();
                document.getElementById(targetId).classList.remove('active');
            }
        });
    });

    // Cierre Específico Modal Operaciones
    document.getElementById('btn-close-operation').addEventListener('click', closeAndCleanOperationModal);
    document.getElementById('btn-cancel-op').addEventListener('click', closeAndCleanOperationModal);

    // Click afuera
    document.querySelectorAll('.modal-overlay').forEach(overlay => {
        overlay.addEventListener('click', (e) => {
            if (e.target === overlay) {
                if (overlay.id === 'modal-operation') {
                    closeAndCleanOperationModal();
                } else {
                    overlay.classList.remove('active');
                }
            }
        });
    });

    const searchInput = document.getElementById('op-search-prod');
    if (searchInput) searchInput.addEventListener('input', handleSearchInput);
    
    document.getElementById('btn-search-prod').addEventListener('click', searchProductsForOperation);
}

// ============================================================================
// 5. MODAL DE OPERACIONES (Lógica dinámica)
// ============================================================================
function openOperationModal(type) {
    currentOperationType = type;
    selectedProductsForOp = []; // Reseteo de seguridad al abrir

    const modalOp = document.getElementById('modal-operation');
    const titleOp = document.getElementById('modal-op-title');
    const subtitleOp = document.getElementById('modal-op-subtitle');
    const controlsDiv = document.getElementById('op-controls');
    const groupDest = document.getElementById('group-dest');
    const groupSearch = document.getElementById('group-search');
    
    // Cambiamos el header de la tabla dependiendo de la operación
    const thead = document.querySelector('.detail-products-table thead tr');
    
    const btnConfirmText = document.getElementById('btn-confirm-text');
    const btnConfirmIcon = document.getElementById('btn-confirm-icon');
    const btnConfirmOp = document.getElementById('btn-confirm-op');

    document.getElementById('op-search-prod').value = '';
    const resultsList = document.getElementById('search-results-list');
    if (resultsList) resultsList.style.display = 'none';

    controlsDiv.style.display = 'grid';
    groupSearch.style.display = 'block';
    groupDest.style.display = 'none';
    btnConfirmOp.className = 'btn-primary';

    switch (type) {
        case 'in':
            titleOp.textContent = 'Ingreso de Mercadería';
            subtitleOp.textContent = 'Busca productos para ingresar al depósito.';
            btnConfirmIcon.textContent = 'save';
            btnConfirmText.textContent = 'Guardar Ingreso';
            thead.innerHTML = `
                <th>Código</th>
                <th>Producto</th>
                <th class="text-center" width="140">Cant. a Ingresar</th>
                <th class="text-center" width="60"></th>
            `;
            break;

        case 'transfer':
            titleOp.textContent = 'Enviar a Sucursal';
            subtitleOp.textContent = 'Selecciona destino y busca los productos de tu stock.';
            groupDest.style.display = 'block';
            btnConfirmIcon.textContent = 'send';
            btnConfirmText.textContent = 'Confirmar Envío';
            thead.innerHTML = `
                <th>Código</th>
                <th>Producto</th>
                <th class="text-center" width="100">Stock Disp.</th>
                <th class="text-center" width="140">Cant. a Enviar</th>
                <th class="text-center" width="60"></th>
            `;
            break;

        case 'out':
            titleOp.textContent = 'Egreso / Salida';
            subtitleOp.textContent = 'Busca productos en tu stock para registrar salida.';
            btnConfirmIcon.textContent = 'remove_circle_outline';
            btnConfirmText.textContent = 'Registrar Egreso';
            btnConfirmOp.className = 'btn-danger';
            thead.innerHTML = `
                <th>Código</th>
                <th>Producto</th>
                <th class="text-center" width="100">Stock Disp.</th>
                <th class="text-center" width="140">Cant. a Egresar</th>
                <th class="text-center" width="60"></th>
            `;
            break;
    }

    renderEmptyEditableRow();
    modalOp.classList.add('active');
}

function renderEmptyEditableRow() {
    const colSpan = currentOperationType === 'in' ? "4" : "5";
    document.getElementById('op-products-list').innerHTML = `
        <tr>
            <td colspan="${colSpan}" class="text-center text-muted" style="padding: 2rem;">
                Utiliza el buscador de arriba para agregar productos a la lista.
            </td>
        </tr>
    `;
}

// CREACIÓN DE PRODUCTO DESDE EL MODAL RAPIDO
const formAddProduct = document.getElementById('form-add-product');
if (formAddProduct) {
    formAddProduct.addEventListener('submit', async (e) => {
        e.preventDefault();
        const payload = {
            name: document.getElementById('prod-name').value,
            barcode: document.getElementById('prod-code').value,
            category_id: parseInt(document.getElementById('product-category-select').value),
            description: document.getElementById('prod-desc').value
        };

        try {
            const res = await fetch('/api/products/', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });
            const data = await res.json();

            if (data.status === 'success') {
                alert('¡Producto creado exitosamente!');
                document.getElementById('modal-add-product').classList.remove('active');
                formAddProduct.reset();
            } else {
                alert('Error al crear: ' + (data.message || 'Verifica los datos'));
            }
        } catch (error) {
            console.error('Error enviando producto:', error);
            alert('Ocurrió un error en el servidor.');
        }
    });
}

// ============================================================================
// BUSCADOR INTELIGENTE EN EL MODAL DE OPERACIONES
// ============================================================================

async function searchProductsForOperation() {
    const searchTerm = document.getElementById('op-search-prod').value.trim();
    const resultsList = document.getElementById('search-results-list');

    if (searchTerm.length < 2) {
        if (resultsList) resultsList.style.display = 'none';
        return;
    }

    let apiUrl = currentOperationType === 'in'
        ? `/api/products/catalog?search=${encodeURIComponent(searchTerm)}`
        : `/api/stocks/catalog?search=${encodeURIComponent(searchTerm)}`;

    try {
        const res = await fetch(apiUrl);
        const json = await res.json();

        if (!resultsList) return;
        resultsList.innerHTML = ''; 

        if (json.status === 'success' && json.data.length > 0) {
            json.data.forEach(product => {
                const li = document.createElement('li');
                li.className = 'search-result-item';

                const code = product.cod_bar || product.code || 'S/C';
                const name = product.name || product.product_name;
                const id = product.id || product.product_id;
                
                // Si es ingreso asumimos infinito, sino tomamos el stock que viene de la API
                const stockDisponible = currentOperationType === 'in' ? Infinity : (product.quantity || 0);

                const stockBadge = product.quantity !== undefined
                    ? `<span class="prod-stock">Stock: ${product.quantity}</span>`
                    : '';

                li.innerHTML = `
                    <div class="prod-info">
                        <span class="prod-code">${code}</span>
                        <span class="prod-name">${name}</span>
                    </div>
                    ${stockBadge}
                `;

                li.onclick = () => addProductToTable(id, code, name, stockDisponible);
                resultsList.appendChild(li);
            });

        } else {
            const emptyLi = document.createElement('li');
            emptyLi.style.padding = '1.5rem 1rem';
            emptyLi.style.textAlign = 'center';
            emptyLi.style.color = 'var(--text-muted)';

            if (currentOperationType === 'in') {
                emptyLi.innerHTML = `
                    <span class="material-symbols-outlined" style="display:block; font-size: 28px; margin-bottom: 8px; color: #94a3b8;">inventory_2</span>
                    <span style="font-weight: 500;">No se encontró el producto en el catálogo.</span>
                `;
            } else {
                emptyLi.innerHTML = `
                    <span class="material-symbols-outlined" style="display:block; font-size: 28px; margin-bottom: 8px; color: #ef4444;">error</span>
                    <span style="font-weight: 500; color: #ef4444;">No hay stock disponible de este producto.</span>
                `;
            }
            resultsList.appendChild(emptyLi);
        }

        resultsList.style.display = 'block';

    } catch (err) {
        console.error('Error buscando producto:', err);
    }
}

function addProductToTable(id, code, name, stockDisponible) {
    if (selectedProductsForOp.some(p => p.id === id)) {
        return alert('El producto ya está en la lista de la operación.');
    }

    if (stockDisponible === 0 && currentOperationType !== 'in') {
        return alert('No puedes agregar este producto porque su stock disponible es 0.');
    }

    selectedProductsForOp.push({
        id: id,
        code: code,
        name: name,
        quantity: 1,
        stockDisponible: stockDisponible
    });

    renderOperationTable();

    document.getElementById('op-search-prod').value = '';
    document.getElementById('search-results-list').style.display = 'none';
}

document.addEventListener('click', (e) => {
    const resultsList = document.getElementById('search-results-list');
    const searchBar = document.querySelector('.search-bar');
    if (resultsList && searchBar && !searchBar.contains(e.target)) {
        resultsList.style.display = 'none';
    }
});

// Función para dibujar la tabla de productos seleccionados
function renderOperationTable() {
    const tbody = document.getElementById('op-products-list');

    if (selectedProductsForOp.length === 0) {
        renderEmptyEditableRow();
        return;
    }

    tbody.innerHTML = '';

    selectedProductsForOp.forEach((prod, index) => {
        const tr = document.createElement('tr');
        
        // Columna de Stock Disponible (solo visible si no es ingreso)
        const stockCol = currentOperationType !== 'in' 
            ? `<td class="text-center font-bold" style="color: var(--primary);">${prod.stockDisponible}</td>` 
            : '';

        // El input de cantidad
        const maxAttr = currentOperationType !== 'in' ? `max="${prod.stockDisponible}"` : '';

        // El SVG de Basura
        const trashSvg = `
            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" fill="currentColor" viewBox="0 0 24 24">
                <path d="M17 6V4c0-1.1-.9-2-2-2H9c-1.1 0-2 .9-2 2v2H2v2h2v12c0 1.1.9 2 2 2h12c1.1 0 2-.9 2-2V8h2V6zM9 4h6v2H9zm9 16H6V8h12z"></path>
                <path d="M14.29 10.29 12 12.59l-2.29-2.3-1.42 1.42 2.3 2.29-2.3 2.29 1.42 1.42 2.29-2.3 2.29 2.3 1.42-1.42-2.3-2.29 2.3-2.29z"></path>
            </svg>
        `;

        tr.innerHTML = `
            <td class="font-mono text-muted" style="font-size: 0.85rem;">${prod.code}</td>
            <td class="font-bold">${prod.name}</td>
            ${stockCol}
            <td class="text-center">
                <input type="number" min="1" ${maxAttr} value="${prod.quantity}" 
                       style="width: 80px; padding: 0.4rem; text-align: center; border: 1px solid var(--border-color); border-radius: 6px; background: var(--bg-input); color: var(--text-primary); font-weight: 600;"
                       onchange="updateProductQuantity(${index}, this.value)">
            </td>
            <td class="text-center">
                <button type="button" onclick="removeProductFromOp(${index})" 
                        style="background: transparent; border: none; color: #ef4444; cursor: pointer; padding: 6px; border-radius: 6px; display: inline-flex; transition: 0.2s;"
                        onmouseover="this.style.background='rgba(239,68,68,0.1)'" onmouseout="this.style.background='transparent'">
                    ${trashSvg}
                </button>
            </td>
        `;
        tbody.appendChild(tr);
    });
}

window.updateProductQuantity = function (index, newQuantity) {
    const prod = selectedProductsForOp[index];
    let qty = parseInt(newQuantity) || 1;

    // Control estricto de no superar el stock
    if (currentOperationType !== 'in' && qty > prod.stockDisponible) {
        alert(`Stock insuficiente. Solo hay ${prod.stockDisponible} unidades disponibles de ${prod.name}.`);
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

// CONFIRMACIÓN DE OPERACIÓN
document.getElementById('btn-confirm-op').addEventListener('click', async () => {
    if (selectedProductsForOp.length === 0) {
        return alert('Debes agregar al menos un producto a la operación.');
    }

    let dbType = '';
    if (currentOperationType === 'in') dbType = 'ingreso';
    else if (currentOperationType === 'out') dbType = 'egreso';
    else if (currentOperationType === 'transfer') dbType = 'envio';

    const payload = {
        type: dbType,
        details: selectedProductsForOp.map(p => ({
            product_id: p.id,
            quantity: p.quantity
        }))
    };

    if (dbType === 'envio') {
        const destSelect = document.getElementById('op-dest').value;
        if (!destSelect) return alert('Debes seleccionar una sucursal de destino para el envío.');
        payload.destination_branch_id = parseInt(destSelect);
    }

    if (!confirm(`¿Estás seguro de registrar este ${dbType}?`)) return;

    // Desactivar botón mientras carga
    const btn = document.getElementById('btn-confirm-op');
    btn.disabled = true;
    
    try {
        const res = await fetch('/api/movements', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });

        const data = await res.json();

        if (data.status === 'success') {
            alert('¡Operación registrada con éxito!');
            closeAndCleanOperationModal();
            loadDashboardCards();
            loadRecentMovements();
        } else {
            alert('Error al registrar: ' + JSON.stringify(data.error || data.message));
        }
    } catch (error) {
        console.error('Error registrando movimiento:', error);
        alert('Ocurrió un error de conexión con el servidor.');
    } finally {
        btn.disabled = false;
    }
});