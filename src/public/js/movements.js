let currentPage = 1;
let searchTimeout;

document.addEventListener('DOMContentLoaded', () => {
    initMovementsSocket()
    setupFiltersUI()
    setupSearchDebounce()
    loadCatalogs()
    fetchMovements()
    setupModalListeners()
});

function initMovementsSocket() {
    const socket = io()

    const handleCatalogs = () => {
        sessionStorage.removeItem('cache_catalog')
        sessionStorage.removeItem('cache_user_list')
        loadCatalogs()
    }

    socket.on('new_branch', handleCatalogs)
    socket.on('branch_updated', handleCatalogs)
    socket.on('branch_deleted', handleCatalogs)
    socket.on('brach_activated', handleCatalogs)
    socket.on('new_user', handleCatalogs)
    socket.on('user_updated', handleCatalogs)
    socket.on('user_toggle', handleCatalogs)
    socket.on('movements_updated', fetchMovements)
    socket.on('new_movement', fetchMovements)
}

// ---- INTERFAZ DE FILTROS ----

function setupFiltersUI() {
    const filterBtn = document.getElementById('btn-filter-toggle');
    const filterWrapper = document.getElementById('filter-wrapper');
    const filterBtnClose = document.getElementById('btn-close-filters');

    if (!filterBtn || !filterWrapper) return;

    filterBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        filterWrapper.classList.toggle('active');
    });

    filterBtnClose.addEventListener('click', (e) => {
        e.stopPropagation();
        filterWrapper.classList.remove('active');
    });

    document.addEventListener('click', (e) => {
        if (filterWrapper.classList.contains('active') && !e.target.closest('.filter-menu')) {
            filterWrapper.classList.remove('active');
        }
    });
}

function setupSearchDebounce() {
    const searchInput = document.getElementById('movement-search');
    if (!searchInput) return;

    searchInput.addEventListener('input', () => {
        clearTimeout(searchTimeout);
        searchTimeout = setTimeout(() => {
            applyFilters();
        }, 500);
    });
}

// ---- CARGA DE DATOS (CATALOGOS Y TABLA) ----

async function loadCatalogs() {
    const selectOrigin = document.getElementById('filter-origin');
    const selectDest = document.getElementById('filter-dest');
    const selectUser = document.getElementById('filter-user');

    if (!selectOrigin && !selectUser) return;

    try {
        const branchData = await window.fetchWithCache(`/api/branches/catalog`, 'cache_catalog', 120)
        if (branchData.status === 'success') {
            let options = '';
            branchData.data.forEach(b => {
                options += `<option value="${b.id}">${b.name}</option>`;
            });
            selectOrigin.innerHTML += options;
            selectDest.innerHTML += options;
        }

        const userData = await window.fetchWithCache(`/api/users/list`, 'cache_user_list', 120)

        const users = Array.isArray(userData) ? userData : (userData.data || []);
        users.forEach(u => {
            selectUser.innerHTML += `<option value="${u.id}">${u.full_name}</option>`;
        });

    } catch (error) { console.error('Error cargando catálogos:', error); }
}

async function fetchMovements() {
    const tbody = document.getElementById('movements-list-container');
    tbody.innerHTML = `<tr><td colspan="9" style="text-align:center; padding: 3rem;"><span class="material-symbols-outlined spin">refresh</span><br>Cargando historial...</td></tr>`;

    const params = new URLSearchParams();
    const search = document.getElementById('movement-search').value.trim();
    if (search) params.append('search', search);

    const type = document.getElementById('filter-type').value;
    if (type) params.append('type', type);

    const dateStart = document.getElementById('filter-start').value;
    if (dateStart) params.append('date_start', dateStart);

    const dateEnd = document.getElementById('filter-end').value;
    if (dateEnd) params.append('date_end', dateEnd);

    const originEl = document.getElementById('filter-origin');
    if (originEl && originEl.value) params.append('origin', originEl.value);

    const destEl = document.getElementById('filter-dest');
    if (destEl && destEl.value) params.append('destination', destEl.value);

    const userEl = document.getElementById('filter-user');
    if (userEl && userEl.value) params.append('user', userEl.value);

    params.append('page', currentPage);

    try {
        const response = await fetch(`/api/movements/?${params.toString()}`);
        const result = await response.json();

        if (result.status === 'success') {
            renderMovementsTable(result.data);
            document.getElementById('page-info').textContent = `Página ${currentPage}`;
            document.getElementById('btn-prev-page').disabled = currentPage === 1;
            document.getElementById('btn-next-page').disabled = result.data.length < 20;
        } else {
            throw new Error(result.message);
        }
    } catch (error) {
        console.error(error);
        tbody.innerHTML = `<tr><td colspan="9" style="text-align:center; padding: 2rem; color:#ef4444;">Error cargando historial.</td></tr>`;
    }
}

// ---- RENDERIZADO ----

function renderMovementsTable(movements) {
    const tbody = document.getElementById('movements-list-container');
    tbody.innerHTML = '';

    if (movements.length === 0) {
        tbody.innerHTML = `
            <tr class="empty-state-row">
                <td colspan="9">
                    <span class="material-symbols-outlined icon-empty">inbox</span>
                    <h3 style="color: var(--text-secondary); margin-bottom: 0.5rem;">No se encontraron movimientos</h3>
                    <p style="font-size: 0.9rem;">Prueba ajustando los filtros de búsqueda.</p>
                </td>
            </tr>
        `;
        return;
    }

    movements.forEach(mov => {
        let icon = 'sync_alt', typeClass = 'type-transfer';
        let movType = mov.type.toLowerCase();

        if (movType === 'ingreso') { icon = 'download'; typeClass = 'type-in'; }
        if (movType === 'egreso') { icon = 'upload'; typeClass = 'type-out'; }

        const dateStr = new Date(mov.date).toLocaleDateString('es-AR', { day: '2-digit', month: '2-digit', year: 'numeric' });

        const tr = document.createElement('tr');
        tr.className = 'movement-item';

        // CORRECCIÓN DE RUTAS DE OBJETOS SEGÚN EL DTO
        tr.innerHTML = `
            <td class="col-id">#${mov.id}</td>
            <td class="col-receipt font-mono">${mov.receipt_number || 'S/N'}</td>
            <td class="col-type">
                <span class="type-badge ${typeClass}">
                    <span class="material-symbols-outlined icon-tiny">${icon}</span>
                    ${mov.type.toUpperCase()}
                </span>
            </td>
            <td class="col-status">
                <span class="badge ${mov.status.toLowerCase()}">${mov.status.replace('_', ' ')}</span>
            </td>
            <td class="col-date">${dateStr}</td>
            <td class="col-branch" title="${mov.origin || 'Externo'}">${mov.origin || '-'}</td>
            <td class="col-branch" title="${mov.destination || 'Externo'}">${mov.destination || '-'}</td>
            <td class="col-user">
                <span class="user-name">${mov.user?.name || 'Desconocido'}</span>
            </td>
            <td class="col-info">
                <button class="btn-icon-info" onclick="loadMovementDetails(${mov.id})">
                    <span class="material-symbols-outlined">info</span>
                </button>
            </td>
        `;
        tbody.appendChild(tr);
    });
}

// ---- ACCIONES DE FILTRO Y PAGINACION ----

function applyFilters() {
    currentPage = 1;
    document.getElementById('filter-wrapper').classList.remove('active');
    fetchMovements();
}

window.clearFilters = function () {
    document.getElementById('movement-search').value = '';
    document.getElementById('filter-type').value = '';
    document.getElementById('filter-start').value = '';
    document.getElementById('filter-end').value = '';

    ['filter-origin', 'filter-dest', 'filter-user'].forEach(id => {
        const el = document.getElementById(id);
        if (el) el.value = '';
    });

    applyFilters();
}

window.changePage = function (delta) {
    currentPage += delta;
    if (currentPage < 1) currentPage = 1;
    fetchMovements();
}

// ---- MODAL DE DETALLES ----

function setupModalListeners() {
    const modalDetail = document.getElementById('modal-movement-detail');
    const btnCloseDetail = document.getElementById('btn-close-detail');

    btnCloseDetail.addEventListener('click', () => modalDetail.classList.remove('active'));
    modalDetail.addEventListener('click', (e) => {
        if (e.target === modalDetail) modalDetail.classList.remove('active');
    });
}

async function loadMovementDetails(id) {
    try {
        const [resHeader, resDetails] = await Promise.all([
            fetch(`/api/movements/${id}`),
            fetch(`/api/movements/${id}/details`)
        ]);

        const dataDetails = await resDetails.json();

        let dataHeader = { status: 'error' };

        // Si el empleado no tiene permiso para ver la cabecera (suele dar 403 Forbidden)
        if (resHeader.ok) {
            dataHeader = await resHeader.json();
        }

        // Si los detalles de los productos cargan bien, abrimos el modal igual
        if (dataDetails.status === 'success') {

            // Si falló la cabecera (por ser empleado), le inventamos una vacía 
            // usando los pocos datos que tenemos para que el modal no explote.
            let mov = {};
            if (dataHeader.status === 'success') {
                mov = dataHeader.data;
            } else {
                mov = {
                    id: id,
                    receipt_number: 'Acceso Restringido',
                    type: 'Desconocido',
                    status: '-',
                    date: new Date().toISOString(),
                    origin: 'Restringido',
                    destination: 'Restringido',
                    user: { name: '-' }
                };
                console.warn("No se pudo cargar la cabecera del movimiento por permisos.");
            }

            openDetailModal(mov, dataDetails.data);

        } else {
            alert('No se pudo cargar la lista de productos del movimiento.');
        }
    } catch (error) {
        console.error(error);
        alert('Ocurrió un error de red al intentar abrir el detalle.');
    }
}

function openDetailModal(mov, details) {
    document.getElementById('detail-id').textContent = `#${mov.id}`;
    document.getElementById('detail-receipt').textContent = mov.receipt_number || '-';

    const typeEl = document.getElementById('detail-type');
    typeEl.textContent = mov.type.toUpperCase();
    typeEl.className = `type-badge type-${mov.type.toLowerCase() === 'ingreso' ? 'in' : (mov.type.toLowerCase() === 'egreso' ? 'out' : 'transfer')}`;

    document.getElementById('detail-status').textContent = (mov.status || '').replace('_', ' ').toUpperCase();
    document.getElementById('detail-date').textContent = new Date(mov.date).toLocaleDateString();
    document.getElementById('detail-created').textContent = new Date(mov.created_at || mov.date).toLocaleString('es-AR', { dateStyle: 'short', timeStyle: 'short' });

    // CORRECCIÓN DE RUTAS DE CABECERA
    document.getElementById('detail-user').textContent = mov.user?.name || 'Desconocido';
    document.getElementById('detail-origin').textContent = mov.origin || 'Externo / N/A';
    document.getElementById('detail-dest').textContent = mov.destination || 'Externo / N/A';

    const prodList = document.getElementById('detail-products-list');
    prodList.innerHTML = '';

    if (details && details.length > 0) {
        details.forEach(prod => {
            const row = document.createElement('tr');

            // CORRECCIÓN DE RUTAS DE PRODUCTO SEGÚN EL DTO
            row.innerHTML = `
                <td class="font-mono text-muted">${prod.product?.barcode || 'S/C'}</td>
                <td class="font-bold">${prod.product?.name || 'Producto sin nombre'}</td>
                <td class="text-right"><span class="qty-badge-modal">${prod.quantity}</span></td>
            `;
            prodList.appendChild(row);
        });
    } else {
        prodList.innerHTML = '<tr><td colspan="3" class="text-center text-muted" style="padding: 2rem;">Sin productos registrados.</td></tr>';
    }

    document.getElementById('modal-movement-detail').classList.add('active');
}
