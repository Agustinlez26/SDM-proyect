let currentPage = 1;
let currentProducts = [];
let isEditing = false;
let searchTimeout;

document.addEventListener('DOMContentLoaded', () => {
    setupUI();
    setupSearchDebounce();
    fetchCategories();
    fetchProducts();
});

// --- CARGA DE DATOS ---

async function fetchCategories() {
    try {
        const res = await fetch('/api/products/categories');
        const json = await res.json();

        if (json.status === 'success') {
            const filterSelect = document.getElementById('filter-category');
            const formSelect = document.getElementById('prod-category');
            const managerList = document.getElementById('categories-list-container');

            filterSelect.innerHTML = '<option value="">Todas</option>';
            formSelect.innerHTML = '<option value="" disabled selected>Seleccionar...</option>';
            managerList.innerHTML = '';

            json.data.forEach(cat => {
                const opt = `<option value="${cat.id}">${cat.name}</option>`;
                filterSelect.innerHTML += opt;
                formSelect.innerHTML += opt;

                managerList.innerHTML += `
                    <li>
                        <span>${cat.name}</span>
                        <button class="btn-icon-delete" onclick="deleteCategory(${cat.id})" title="Eliminar Categoría">
                            <span class="material-symbols-outlined">delete</span>
                        </button>
                    </li>
                `;
            });
        }
    } catch (error) { console.error(error); }
}

async function fetchProducts() {
    const grid = document.getElementById('product-grid');
    grid.innerHTML = `<div class="loading-state" style="grid-column: 1 / -1;"><span class="material-symbols-outlined spin">refresh</span> Buscando catálogo...</div>`;

    const params = new URLSearchParams();
    const search = document.getElementById('product-search').value.trim();
    if (search) params.append('search', search);

    const categoryId = document.getElementById('filter-category').value;
    if (categoryId) params.append('category_id', categoryId);

    const stateRadio = document.querySelector('input[name="filter-status"]:checked');
    const state = stateRadio ? stateRadio.value : 'true';
    params.append('state', state);

    params.append('page', currentPage);

    try {
        const res = await fetch(`/api/products/?${params.toString()}`);
        const json = await res.json();

        if (json.status === 'success') {
            currentProducts = json.data;
            renderProductGrid(state === 'true');

            document.getElementById('page-info').textContent = `Página ${currentPage}`;
            document.getElementById('btn-prev-page').disabled = currentPage === 1;
            document.getElementById('btn-next-page').disabled = json.data.length < 10;
        } else {
            throw new Error(json.message);
        }
    } catch (error) {
        console.error(error);
        grid.innerHTML = `<div style="grid-column: 1 / -1; text-align: center; color: red;">Error al cargar los productos.</div>`;
    }
}

function renderProductGrid(isActiveView) {
    const grid = document.getElementById('product-grid');
    grid.innerHTML = '';

    if (currentProducts.length === 0) {
        grid.innerHTML = `<div style="grid-column: 1 / -1; text-align: center; padding: 3rem; color: var(--text-muted);">No se encontraron productos.</div>`;
        return;
    }

    currentProducts.forEach(prod => {
        const imgSrc = prod.url_img_small || 'https://via.placeholder.com/300x200?text=Sin+Imagen';

        let actionButtons = '';
        if (isActiveView) {
            actionButtons = `
                <button class="btn-icon" title="Editar" onclick="editProduct(${prod.id})"><span class="material-symbols-outlined">edit</span></button>
                <button class="btn-icon delete" title="Eliminar" onclick="deleteProduct(${prod.id})"><span class="material-symbols-outlined">delete</span></button>
            `;
        } else {
            actionButtons = `
                <button class="btn-icon" style="color: #10b981; border-color: #10b981;" title="Restaurar" onclick="activateProduct(${prod.id})">
                    <span class="material-symbols-outlined">restore_from_trash</span>
                </button>
            `;
        }

        const card = document.createElement('div');
        card.className = 'product-card';
        card.innerHTML = `
            <div class="card-img-container">
                <img src="${imgSrc}" alt="${prod.name}">
                <span class="card-badge">#${prod.id}</span>
            </div>
            <div class="card-body">
                <span class="card-category">${prod.category || 'Sin Categoría'}</span>
                <h4 class="card-title">${prod.name}</h4>
                <p class="card-code"><span class="material-symbols-outlined icon-tiny">barcode</span> ${prod.cod_bar || 'N/A'}</p>
                <p class="card-desc" title="${prod.description}">${prod.description || 'Sin descripción'}</p>
            </div>
            <div class="card-footer">
                ${actionButtons}
            </div>
        `;
        grid.appendChild(card);
    });
}

// --- MODAL: PRODUCTOS ---

window.openProductModal = function () {
    isEditing = false;
    document.getElementById('product-modal-title').textContent = 'Añade un producto';
    document.getElementById('form-product').reset();
    document.getElementById('prod-id').value = '';
    document.getElementById('prod-is-active').value = '1';
    document.getElementById('prod-img').value = '';
    
    // Resetear la imagen
    document.getElementById('prod-img-preview').src = '';

    document.getElementById('modal-add-product').classList.add('active');
}

window.editProduct = async function (id) {
    try {
        const res = await fetch(`/api/products/${id}`);
        const json = await res.json();

        if (json.status === 'success') {
            const p = json.data;
            isEditing = true;
            document.getElementById('product-modal-title').textContent = 'Editar producto';

            document.getElementById('prod-id').value = p.id;
            document.getElementById('prod-name').value = p.name;
            document.getElementById('prod-code').value = p.cod_bar;
            document.getElementById('prod-category').value = p.category_id || '';
            document.getElementById('prod-desc').value = p.description;
            document.getElementById('prod-is-active').value = p.is_active ? '1' : '0';

            // Actualizar la imagen destacada de la derecha
            const previewImg = document.getElementById('prod-img-preview');
            if (p.url_img_original) {
                previewImg.src = p.url_img_original;
            }
            document.getElementById('prod-img').value = '';

            document.getElementById('modal-add-product').classList.add('active');
        }
    } catch (e) { console.error(e); alert('Error al cargar datos'); }
}

document.getElementById('form-product').addEventListener('submit', async (e) => {
    e.preventDefault();

    const formData = new FormData();
    formData.append('name', document.getElementById('prod-name').value);
    formData.append('cod_bar', document.getElementById('prod-code').value);
    formData.append('category_id', document.getElementById('prod-category').value);
    formData.append('description', document.getElementById('prod-desc').value);
    formData.append('is_active', document.getElementById('prod-is-active').value);

    const fileInput = document.getElementById('prod-img');
    if (fileInput.files.length > 0) {
        formData.append('image', fileInput.files[0]);
    }

    const id = document.getElementById('prod-id').value;
    const url = isEditing ? `/api/products/${id}` : '/api/products/';
    const method = isEditing ? 'PATCH' : 'POST';

    try {
        const res = await fetch(url, {
            method: method,
            body: formData
        });

        const json = await res.json();

        if (res.ok || json.status === 'success') {
            alert(isEditing ? 'Producto actualizado' : 'Producto creado');
            document.getElementById('modal-add-product').classList.remove('active');
            fetchProducts();
        } else {
            console.error('Error:', json);
            alert('Error al guardar. Revisa los datos.');
        }
    } catch (err) { console.error(err); }
});

// --- ESTADOS DE PRODUCTO ---

window.deleteProduct = async function (id) {
    if (!confirm('¿Estás seguro de enviar este producto a la papelera?')) return;
    try {
        const res = await fetch(`/api/products/${id}`, { method: 'DELETE' });
        if (res.ok) fetchProducts();
    } catch (e) { console.error(e); }
}

window.activateProduct = async function (id) {
    if (!confirm('¿Deseas restaurar este producto?')) return;
    try {
        const res = await fetch(`/api/products/activate/${id}`, { method: 'PATCH' });
        if (res.ok) fetchProducts();
    } catch (e) { console.error(e); }
}

// --- MODAL: CATEGORIAS ---

document.getElementById('btn-open-categories').addEventListener('click', () => {
    document.getElementById('modal-manage-categories').classList.add('active');
});

document.getElementById('form-category').addEventListener('submit', async (e) => {
    e.preventDefault();
    const nameInput = document.getElementById('new-category-name');

    try {
        const res = await fetch('/api/products/categories', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ name: nameInput.value })
        });
        if (res.ok) {
            nameInput.value = '';
            fetchCategories();
        } else {
            alert('Error al crear categoría.');
        }
    } catch (err) { console.error(err); }
});

window.deleteCategory = async function (id) {
    if (!confirm('¿Seguro que deseas eliminar esta categoría?')) return;
    try {
        const res = await fetch(`/api/products/categories/${id}`, { method: 'DELETE' });
        if (res.ok) fetchCategories();
        else alert('No se puede eliminar. ¿Tiene productos asociados?');
    } catch (e) { console.error(e); }
}

// --- UTILIDADES UI ---

function setupSearchDebounce() {
    const searchInput = document.getElementById('product-search');
    searchInput.addEventListener('input', () => {
        clearTimeout(searchTimeout);
        searchTimeout = setTimeout(() => {
            applyFilters();
        }, 500);
    });
}

function applyFilters() {
    currentPage = 1;
    document.getElementById('filter-wrapper').classList.remove('active');
    fetchProducts();
}

window.changePage = function (delta) {
    currentPage += delta;
    if (currentPage < 1) currentPage = 1;
    fetchProducts();
}

function setupUI() {
    const filterBtn = document.getElementById('btn-filter-toggle');
    const filterWrapper = document.getElementById('filter-wrapper');

    filterBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        filterWrapper.classList.toggle('active');
    });

    document.querySelectorAll('.btn-close-modal, .btn-cancel').forEach(btn => {
        btn.addEventListener('click', (e) => {
            e.preventDefault();
            const targetId = btn.getAttribute('data-target');
            if (targetId) document.getElementById(targetId).classList.remove('active');
        });
    });

    document.querySelectorAll('.modal-overlay').forEach(overlay => {
        overlay.addEventListener('click', (e) => {
            if (e.target === overlay) overlay.classList.remove('active');
        });
    });
}