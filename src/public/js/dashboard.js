// ============================================================================
// VARIABLES GLOBALES (Para almacenar catálogos y no pedir a la API cada vez)
// ============================================================================
let globalCategories = [];
let globalBranches = [];
let currentOperationType = null;

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
// 3. PRE-CARGA DE DATOS PARA MODALES (Fetchs iniciales)
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

    globalCategories.forEach(cat => {
        select.innerHTML += `<option value="${cat.id}">${cat.name}</option>`;
    });
}

function populateBranchSelect() {
    const select = document.getElementById('op-dest');
    if (!select) return;

    select.innerHTML = '<option value="" disabled selected>Seleccionar sucursal...</option>';

    globalBranches.forEach(branch => {
        select.innerHTML += `<option value="${branch.id}">${branch.name}</option>`;
    });
}

// ============================================================================
// 4. LÓGICA DE APERTURA/CIERRE DE MODALES
// ============================================================================
function setupModalListeners() {
    document.querySelectorAll('.btn-modal-trigger').forEach(btn => {
        btn.addEventListener('click', () => {
            const targetId = btn.getAttribute('data-target');
            const modal = document.getElementById(targetId);
            if (modal) modal.classList.add('active');
        });
    });

    document.querySelectorAll('.btn-close-modal, .btn-cancel').forEach(btn => {
        btn.addEventListener('click', (e) => {
            const targetId = btn.getAttribute('data-target');
            if (targetId) {
                e.preventDefault();
                document.getElementById(targetId).classList.remove('active');
            }
        });
    });

    document.getElementById('btn-close-operation').addEventListener('click', () => document.getElementById('modal-operation').classList.remove('active'));
    document.getElementById('btn-cancel-op').addEventListener('click', () => document.getElementById('modal-operation').classList.remove('active'));

    document.querySelectorAll('.modal-overlay').forEach(overlay => {
        overlay.addEventListener('click', (e) => {
            if (e.target === overlay) {
                overlay.classList.remove('active');
            }
        });
    });

    document.getElementById('btn-search-prod').addEventListener('click', searchProductsForOperation);
}

// ============================================================================
// 5. MODAL DE OPERACIONES (Lógica dinámica)
// ============================================================================
function openOperationModal(type) {
    currentOperationType = type;

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
    document.getElementById('op-search-prod').value = '';

    controlsDiv.style.display = 'grid';
    groupSearch.style.display = 'block';
    groupDest.style.display = 'none';
    colAction.textContent = 'Acción';
    btnConfirmOp.className = 'btn-primary';

    switch (type) {
        case 'in':
            titleOp.textContent = 'Ingreso de Mercadería';
            subtitleOp.textContent = 'Busca productos para ingresar al depósito.';
            btnConfirmIcon.textContent = 'save';
            btnConfirmText.textContent = 'Guardar Ingreso';
            renderEmptyEditableRow();
            break;

        case 'transfer':
            titleOp.textContent = 'Enviar a Sucursal';
            subtitleOp.textContent = 'Selecciona destino y busca los productos de tu stock.';
            groupDest.style.display = 'block';
            btnConfirmIcon.textContent = 'send';
            btnConfirmText.textContent = 'Confirmar Envío';
            renderEmptyEditableRow();
            break;

        case 'out':
            titleOp.textContent = 'Egreso / Salida';
            subtitleOp.textContent = 'Busca productos en tu stock para registrar salida.';
            btnConfirmIcon.textContent = 'remove_circle_outline';
            btnConfirmText.textContent = 'Registrar Egreso';
            btnConfirmOp.className = 'btn-danger';
            renderEmptyEditableRow();
            break;
    }

    modalOp.classList.add('active');
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

async function searchProductsForOperation() {
    const searchTerm = document.getElementById('op-search-prod').value;
    if (!searchTerm) return alert('Ingresá un término de búsqueda');

    let apiUrl = '';

    if (currentOperationType === 'in') {
        apiUrl = `/api/products/catalog?search=${encodeURIComponent(searchTerm)}`;
    } else {
        apiUrl = `/api/stocks/catalog?search=${encodeURIComponent(searchTerm)}`;
    }

    try {
        const res = await fetch(apiUrl);
        const json = await res.json();

        if (json.status === 'success') {
            console.log("Resultados encontrados:", json.data);
            alert(`Se encontraron ${json.data.length} productos. Falta renderizar la fila interactiva.`);
        }
    } catch (err) {
        console.error('Error buscando producto:', err);
    }
}

const formAddProduct = document.getElementById('form-add-product');
if (formAddProduct) {
    formAddProduct.addEventListener('submit', async (e) => {
        e.preventDefault(); // Evita que la página se recargue

        // Recolectamos los datos del formulario
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
                formAddProduct.reset(); // Limpiamos el formulario
            } else {
                alert('Error al crear: ' + (data.message || 'Verifica los datos'));
            }
        } catch (error) {
            console.error('Error enviando producto:', error);
            alert('Ocurrió un error en el servidor.');
        }
    });
}

let selectedProductsForOp = [];

// Función para buscar y agregar producto a la tabla (Reemplaza la que tenías)
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
            // MVP: Tomamos el primer producto que coincide con la búsqueda
            const product = json.data[0];

            // Verificamos si ya está en la lista
            if (selectedProductsForOp.some(p => p.id === product.id)) {
                return alert('El producto ya está en la lista.');
            }

            // Lo agregamos con cantidad 1 por defecto
            selectedProductsForOp.push({
                id: product.id,
                code: product.barcode || product.code || 'S/C',
                name: product.name || product.product_name,
                quantity: 1
            });

            renderOperationTable();
            document.getElementById('op-search-prod').value = ''; // Limpiamos buscador

        } else {
            alert('No se encontró ningún producto con ese nombre o código.');
        }
    } catch (err) {
        console.error('Error buscando producto:', err);
    }
}

// Función para dibujar la tabla de productos seleccionados
function renderOperationTable() {
    const tbody = document.getElementById('op-products-list');

    if (selectedProductsForOp.length === 0) {
        renderEmptyEditableRow(); // Vuelve a poner el mensaje "Utiliza el buscador..."
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

    try {
        const res = await fetch('/api/movements', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });

        const data = await res.json();

        if (data.status === 'success') {
            alert('¡Operación registrada con éxito!');

            // Cerramos modal y limpiamos variables
            document.getElementById('modal-operation').classList.remove('active');
            selectedProductsForOp = [];

            // Magia: ¡Recargamos las tarjetas y la tabla para ver los cambios en vivo!
            loadDashboardCards();
            loadRecentMovements();
        } else {
            alert('Error al registrar: ' + JSON.stringify(data.error || data.message));
        }
    } catch (error) {
        console.error('Error registrando movimiento:', error);
        alert('Ocurrió un error de conexión con el servidor.');
    }
});