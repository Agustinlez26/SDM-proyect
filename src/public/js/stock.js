let currentPage = 1;

document.addEventListener('DOMContentLoaded', () => {
    startWebSocket()
    setupFiltersUI();
    loadCatalogs();
    fetchStock();
});

function startWebSocket() {
    const socket = io()

    socket.on('movements_updated', loadCatalogs)
    socket.on('movements_updated', fetchStock)
    socket.on('new_movement', loadCatalogs)
    socket.on('new_movement', fetchStock)
}

// --- 1. LÓGICA DE INTERFAZ DEL MENÚ DE FILTROS ---
function setupFiltersUI() {
    const filterBtn = document.getElementById('btn-filter-toggle');
    const filterWrapper = document.querySelector('.filter-wrapper');
    const filterBtnClose = document.getElementById('btn-close-filters');

    // Abrir menú
    filterBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        filterWrapper.classList.toggle('active');
    });

    // Cerrar desde la X
    filterBtnClose.addEventListener('click', (e) => {
        e.stopPropagation();
        filterWrapper.classList.remove('active');
    });

    // Cerrar al clickear afuera del menú
    document.addEventListener('click', (e) => {
        if (filterWrapper.classList.contains('active') && !e.target.closest('.filter-menu')) {
            filterWrapper.classList.remove('active');
        }
    });
}

// --- 2. CARGAR SELECTS DE FILTROS ---
async function loadCatalogs() {
    try {
        // Sucursales
        const branchRes = await fetch('/api/branches/catalog');
        const branchData = await branchRes.json();
        if (branchData.status === 'success') {
            const selectBranch = document.getElementById('filter-branch');
            branchData.data.forEach(b => {
                selectBranch.innerHTML += `<option value="${b.id}">${b.name}</option>`;
            });
        }

        // Categorías
        const catRes = await fetch('/api/products/categories');
        const catData = await catRes.json();
        if (catData.status === 'success') {
            const selectCat = document.getElementById('filter-category');
            catData.data.forEach(c => {
                selectCat.innerHTML += `<option value="${c.id}">${c.name}</option>`;
            });
        }
    } catch (error) {
        console.error('Error cargando catálogos:', error);
    }
}

// --- 3. FETCH Y RENDERIZADO DE LA TABLA ---
async function fetchStock() {
    const tbody = document.getElementById('stock-list-container');
    tbody.innerHTML = `<tr><td colspan="6" class="loading-state"><span class="material-symbols-outlined spin">refresh</span> Buscando inventario...</td></tr>`;

    // 3.1 Construir parámetros de URL en base al schema de Zod
    const params = new URLSearchParams();

    const search = document.getElementById('stock-search').value.trim();
    if (search) params.append('search', search);

    const categoryId = document.getElementById('filter-category').value;
    if (categoryId) params.append('category_id', categoryId);

    const branchId = document.getElementById('filter-branch').value;
    if (branchId) params.append('branch_id', branchId);

    const lowStock = document.getElementById('filter-low-stock').checked;
    if (lowStock) params.append('low_stock', 'true');

    const outStock = document.getElementById('filter-out-stock').checked;
    if (outStock) params.append('out_stock', 'true');

    params.append('page', currentPage);

    // 3.2 Realizar la petición HTTP
    try {
        const response = await fetch(`/api/stocks/?${params.toString()}`);
        const result = await response.json();

        if (result.status === 'success') {
            renderStockTable(result.data); // Tu backend puede devolver datos diferentes según la paginación, ajustá si devuelve { data, totalPages, etc }

            // Actualizar interfaz de paginación (Asumiendo que el backend te devuelve si hay más páginas o al menos un array. Modificá si tenés un totalPages real)
            document.getElementById('page-info').textContent = `Página ${currentPage}`;
            document.getElementById('btn-prev-page').disabled = currentPage === 1;

            // Lógica simple: Si trae menos de, por ejemplo, 10 items (tamaño de tu página), deshabilitamos el "Siguiente"
            const PAGE_SIZE = 10; // Ajustá esto al tamaño de página de tu backend
            document.getElementById('btn-next-page').disabled = result.data.length < PAGE_SIZE;

        } else {
            throw new Error(result.message);
        }
    } catch (error) {
        console.error('Error:', error);
        tbody.innerHTML = `<tr><td colspan="6" style="text-align:center; padding: 2rem; color: #ef4444;">Ocurrió un error al cargar el stock.</td></tr>`;
    }
}

function renderStockTable(items) {
    const tbody = document.getElementById('stock-list-container');
    tbody.innerHTML = '';

    // Buscamos si el thead tiene la columna de acciones (solo la tiene el admin)
    const isAdmin = document.getElementById('col-acciones') !== null;
    const colSpan = isAdmin ? 7 : 6;

    if (items.length === 0) {
        tbody.innerHTML = `<tr><td colspan="${colSpan}" style="text-align:center; padding: 3rem; color: var(--text-muted);">No se encontró stock.</td></tr>`;
        return;
    }

    items.forEach(item => {
        let qtyClass = 'qty-ok';
        if (item.quantity === 0) qtyClass = 'qty-empty';
        else if (item.quantity <= item.min_quantity) qtyClass = 'qty-low';

        const imgSrc = item.img || '/img/placeholder-product.png';

        const tr = document.createElement('tr');
        tr.className = 'stock-row';

        // Dibujamos las columnas base
        let html = `
            <td class="col-id font-mono">#${item.id}</td>
            <td class="col-code font-mono">${item.cod_bar || 'S/C'}</td>
            <td>
                <div class="product-cell">
                    <img src="${imgSrc}" alt="${item.name}" class="product-thumb">
                    <span class="product-name font-bold">${item.name}</span>
                </div>
            </td>
            <td>${item.branch}</td>
            <td class="text-center">
                <span class="qty-badge ${qtyClass}">${item.quantity}</span>
            </td>
            <td class="text-center text-muted">${item.min_quantity}</td>
        `;

        // Si es Admin, le inyectamos la columna de Acciones
        if (isAdmin) {
            // Escapamos las comillas para evitar errores al pasar el objeto por JSON
            const itemJSON = JSON.stringify(item).replace(/'/g, "&#39;").replace(/"/g, "&quot;");
            html += `
            <td class="text-center">
                <button class="btn-icon-info" onclick="openEditModal(${itemJSON})" title="Modificar Stock">
                    <span class="material-symbols-outlined">edit</span>
                </button>
            </td>`;
        }

        tr.innerHTML = html;
        tbody.appendChild(tr);
    });
}

window.openEditModal = function (item) {
    const modal = document.getElementById('modal-edit-stock');
    if (!modal) return;

    document.getElementById('edit-stock-id').value = item.id;
    document.getElementById('edit-prod-name').textContent = item.name;
    document.getElementById('edit-prod-branch').textContent = item.branch;
    document.getElementById('edit-qty').value = item.quantity;
    document.getElementById('edit-min-qty').value = item.min_quantity;

    modal.classList.add('active');
}

// --- 4. ACCIONES DE BOTONES ---
function applyFilters() {
    currentPage = 1; // Volvemos a la página 1 al filtrar
    document.querySelector('.filter-wrapper').classList.remove('active'); // Cerramos menú
    fetchStock();
}

function clearFilters() {
    // Resetear inputs
    document.getElementById('stock-search').value = '';
    document.getElementById('filter-branch').value = '';
    document.getElementById('filter-category').value = '';
    document.getElementById('filter-low-stock').checked = false;
    document.getElementById('filter-out-stock').checked = false;

    // Buscar
    applyFilters();
}

function changePage(delta) {
    currentPage += delta;
    if (currentPage < 1) currentPage = 1;
    fetchStock();
}