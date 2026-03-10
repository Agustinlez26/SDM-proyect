// ============================================================================
// COMPONENTE: GESTIÓN DE STOCK Y FILTROS
// ============================================================================

let currentPage = 1;

document.addEventListener('DOMContentLoaded', () => {
    startWebSocket();
    setupFiltersUI();
    loadCatalogs();

    // 1. LECTURA INTELIGENTE DE URL (Viniendo de notificaciones de la navbar)
    const urlParams = new URLSearchParams(window.location.search);
    const filterFromNav = urlParams.get('filter'); // Lee ?filter=out_stock

    if (filterFromNav === 'out_stock' || filterFromNav === 'low_stock') {
        const checkboxLow = document.getElementById('filter-low-stock');
        const checkboxOut = document.getElementById('filter-out-stock');

        if (filterFromNav === 'out_stock' && checkboxOut) checkboxOut.checked = true;
        if (filterFromNav === 'low_stock' && checkboxLow) checkboxLow.checked = true;

        // Limpiamos la URL sin recargar la página
        window.history.replaceState({}, document.title, window.location.pathname);

        fetchStock();
    } else {
        fetchStock();
    }
});

// --- WEBSOCKETS ---
function startWebSocket() {
    const socket = io();

    const handleCatalogs = () => {
        sessionStorage.removeItem('cache_categories')
        sessionStorage.removeItem('cache_branches_catalog')

        loadCatalogs();
    }

    socket.on('new_category', handleCatalogs)
    socket.on('category_deleted', handleCatalogs)
    socket.on('new_branch', handleCatalogs)
    socket.on('branch_updated', handleCatalogs)
    socket.on('branch_deleted', handleCatalogs)
    socket.on('brach_activated', handleCatalogs)
    socket.on('new_movement', fetchStock);
    socket.on('movements_updated', fetchStock);
}

// --- LÓGICA DE INTERFAZ DEL MENÚ DE FILTROS ---
function setupFiltersUI() {
    const filterBtn = document.getElementById('btn-filter-toggle');
    const filterWrapper = document.querySelector('.filter-wrapper');
    const filterBtnClose = document.getElementById('btn-close-filters');

    if (!filterWrapper) return; // Blindaje

    if (filterBtn) {
        filterBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            filterWrapper.classList.toggle('active');
        });
    }

    if (filterBtnClose) {
        filterBtnClose.addEventListener('click', (e) => {
            e.stopPropagation();
            filterWrapper.classList.remove('active');
        });
    }

    document.addEventListener('click', (e) => {
        if (filterWrapper.classList.contains('active') && !e.target.closest('.filter-menu')) {
            filterWrapper.classList.remove('active');
        }
    });
}

// --- CARGAR SELECTS DE FILTROS ---
async function loadCatalogs() {
    try {
        // Sucursales (Blindaje: Solo si existe el select)
        const selectBranch = document.getElementById('filter-branch');
        if (selectBranch) {
            const branchData = await window.fetchWithCache('/api/branches/catalog', 'cache_branches_catalog', 120)
            if (branchData.status === 'success') {
                selectBranch.innerHTML = '<option value="">Todas las sucursales</option>'; // Limpiar primero
                branchData.data.forEach(b => {
                    selectBranch.innerHTML += `<option value="${b.id}">${b.name}</option>`;
                });
            }
        }

        // Categorías (Blindaje: Solo si existe el select)
        const selectCat = document.getElementById('filter-category');
        if (selectCat) {
            const catData = await window.fetchWithCache('/api/products/categories', 'cache_categories', 120)

            if (catData.status === 'success') {
                selectCat.innerHTML = '<option value="">Todas las categorías</option>'; // Limpiar primero
                catData.data.forEach(c => {
                    selectCat.innerHTML += `<option value="${c.id}">${c.name}</option>`;
                });
            }
        }
    } catch (error) {
        console.error('Error cargando catálogos:', error);
    }
}

// --- FETCH Y RENDERIZADO DE LA TABLA ---
async function fetchStock() {
    const tbody = document.getElementById('stock-list-container');
    if (!tbody) return;

    tbody.innerHTML = `<tr><td colspan="7" class="loading-state" style="text-align: center; padding: 2rem;"><span class="material-symbols-outlined spin" style="vertical-align: middle;">refresh</span> Buscando inventario...</td></tr>`;

    // Construir parámetros de URL (Con blindaje para no leer nulos)
    const params = new URLSearchParams();

    const searchInput = document.getElementById('stock-search');
    if (searchInput && searchInput.value.trim()) params.append('search', searchInput.value.trim());

    const catInput = document.getElementById('filter-category');
    if (catInput && catInput.value) params.append('category_id', catInput.value);

    const branchInput = document.getElementById('filter-branch');
    if (branchInput && branchInput.value) params.append('branch_id', branchInput.value);

    const lowStockInput = document.getElementById('filter-low-stock');
    if (lowStockInput && lowStockInput.checked) params.append('low_stock', 'true');

    const outStockInput = document.getElementById('filter-out-stock');
    if (outStockInput && outStockInput.checked) params.append('out_stock', 'true');

    params.append('page', currentPage);

    try {
        const response = await fetch(`/api/stocks/?${params.toString()}`);
        const result = await response.json();

        if (result.status === 'success') {
            renderStockTable(result.data);

            // Actualizar interfaz de paginación
            const pageInfo = document.getElementById('page-info');
            if (pageInfo) pageInfo.textContent = `Página ${currentPage}`;

            const btnPrev = document.getElementById('btn-prev-page');
            if (btnPrev) btnPrev.disabled = currentPage === 1;

            const btnNext = document.getElementById('btn-next-page');
            const PAGE_SIZE = 10;
            if (btnNext) btnNext.disabled = result.data.length < PAGE_SIZE;

        } else {
            throw new Error(result.message);
        }
    } catch (error) {
        console.error('Error:', error);
        tbody.innerHTML = `<tr><td colspan="7" style="text-align:center; padding: 2rem; color: #ef4444;">Ocurrió un error al cargar el stock.</td></tr>`;
    }
}

function renderStockTable(items) {
    const tbody = document.getElementById('stock-list-container');
    if (!tbody) return;
    tbody.innerHTML = '';

    const isAdmin = document.getElementById('col-acciones') !== null;
    const colSpan = isAdmin ? 7 : 6;

    if (items.length === 0) {
        tbody.innerHTML = `<tr><td colspan="${colSpan}" style="text-align:center; padding: 3rem; color: var(--text-muted);">No se encontró stock con estos filtros.</td></tr>`;
        return;
    }

    items.forEach(item => {
        let qtyClass = 'qty-ok';
        if (item.quantity === 0) qtyClass = 'qty-empty';
        else if (item.quantity <= item.min_quantity) qtyClass = 'qty-low';

        const imgSrc = item.img || '/img/placeholder-product.png';

        const tr = document.createElement('tr');
        tr.className = 'stock-row';

        let html = `
            <td class="col-id font-mono">#${item.id || item.product_id}</td>
            <td class="col-code font-mono">${item.cod_bar || 'S/C'}</td>
            <td>
                <div class="product-cell" style="display: flex; align-items: center; gap: 10px;">
                    <img src="${imgSrc}" alt="${item.name}" class="product-thumb" style="width: 40px; height: 40px; object-fit: cover; border-radius: 6px;">
                    <span class="product-name font-bold">${item.name}</span>
                </div>
            </td>
            <td>${item.branch || 'Central'}</td>
            <td class="text-center">
                <span class="qty-badge ${qtyClass}">${item.quantity}</span>
            </td>
            <td class="text-center text-muted">${item.min_quantity || 0}</td>
        `;

        if (isAdmin) {
            // Forma SEGURA de pasar datos a un modal (usando dataset y encodeURIComponent)
            const safeData = encodeURIComponent(JSON.stringify(item));
            html += `
            <td class="text-center">
                <button class="btn-icon-info" onclick="openEditModal('${safeData}')" title="Modificar Stock">
                    <span class="material-symbols-outlined">edit</span>
                </button>
            </td>`;
        }

        tr.innerHTML = html;
        tbody.appendChild(tr);
    });
}

window.openEditModal = function (encodedData) {
    const modal = document.getElementById('modal-edit-stock');
    if (!modal) return;

    // Desencriptamos la data de forma segura
    const item = JSON.parse(decodeURIComponent(encodedData));

    const idInput = document.getElementById('edit-stock-id');
    if (idInput) idInput.value = item.id || item.stock_id;

    const nameEl = document.getElementById('edit-prod-name');
    if (nameEl) nameEl.textContent = item.name;

    const branchEl = document.getElementById('edit-prod-branch');
    if (branchEl) branchEl.textContent = item.branch || 'Central';

    const qtyInput = document.getElementById('edit-qty');
    if (qtyInput) qtyInput.value = item.quantity;

    const minQtyInput = document.getElementById('edit-min-qty');
    if (minQtyInput) minQtyInput.value = item.min_quantity || 0;

    modal.classList.add('active');
}

// --- ACCIONES DE BOTONES (Asegurate de que tu HTML llame a estas funciones en el onclick) ---
window.applyFilters = function () {
    currentPage = 1;
    const filterWrapper = document.querySelector('.filter-wrapper');
    if (filterWrapper) filterWrapper.classList.remove('active');

    // Si aplicamos filtros manuales, limpiamos la barra de direcciones para no confundir al usuario
    window.history.replaceState({}, document.title, window.location.pathname);

    fetchStock();
}

window.clearFilters = function () {
    const searchInput = document.getElementById('stock-search');
    if (searchInput) searchInput.value = '';

    const branchEl = document.getElementById('filter-branch');
    if (branchEl) branchEl.value = '';

    const catEl = document.getElementById('filter-category');
    if (catEl) catEl.value = '';

    const lowStockInput = document.getElementById('filter-low-stock');
    if (lowStockInput) lowStockInput.checked = false;

    const outStockInput = document.getElementById('filter-out-stock');
    if (outStockInput) outStockInput.checked = false;

    // Limpiamos la URL por si venía de la notificación
    window.history.replaceState({}, document.title, window.location.pathname);

    window.applyFilters();
}

window.changePage = function (delta) {
    currentPage += delta;
    if (currentPage < 1) currentPage = 1;
    fetchStock();
}
