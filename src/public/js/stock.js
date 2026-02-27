let currentPage = 1;

document.addEventListener('DOMContentLoaded', () => {
    setupFiltersUI();
    loadCatalogs(); // Carga Selects de Sucursales y Categorías
    fetchStock();   // Carga la tabla de stock inicial
});

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

    if (items.length === 0) {
        tbody.innerHTML = `<tr><td colspan="6" style="text-align:center; padding: 3rem; color: var(--text-muted);">No se encontró stock.</td></tr>`;
        return;
    }

    items.forEach(item => {
        // Lógica visual para stock crítico
        let qtyClass = 'qty-ok';
        if (item.quantity === 0) qtyClass = 'qty-empty';
        else if (item.quantity <= item.min_quantity) qtyClass = 'qty-low';

        // Placeholder para imagen si no tiene
        const imgSrc = item.image_url || 'https://via.placeholder.com/40';

        const tr = document.createElement('tr');
        tr.className = 'stock-row';
        tr.innerHTML = `
            <td class="col-id font-mono">#${item.id}</td>
            <td class="col-code font-mono">${item.barcode || 'S/C'}</td>
            <td>
                <div class="product-cell">
                    <img src="${imgSrc}" alt="${item.product_name}" class="product-thumb">
                    <span class="product-name font-bold">${item.product_name}</span>
                </div>
            </td>
            <td>${item.branch_name}</td>
            <td class="text-center">
                <span class="qty-badge ${qtyClass}">${item.quantity}</span>
            </td>
            <td class="text-center text-muted">${item.min_quantity}</td>
        `;
        tbody.appendChild(tr);
    });
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