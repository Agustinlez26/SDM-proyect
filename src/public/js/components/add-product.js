// ============================================================================
// COMPONENTE: MODAL DE PRODUCTO (Solo Add/Edit)
// ============================================================================

let isEditing = false;
let selectedProductImageFile = null;
let productImageObjectUrl = null;
let operationalCatalogs = { products: [], branches: [], channels: [] };
let recipeDraft = [];

const MAX_PRODUCT_IMAGE_SIZE = 20 * 1024 * 1024;

function generateSkuFromName(name) {
    return String(name || '')
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .toUpperCase()
        .replace(/[^A-Z0-9]+/g, ' ')
        .trim()
        .split(/\s+/)
        .filter(Boolean)
        .map(part => part.slice(0, 3))
        .join('-')
        .slice(0, 50);
}

async function generateAvailableSku(name) {
    const baseSku = generateSkuFromName(name);
    if (!baseSku) return '';

    try {
        const response = await fetch(`/api/products/?search=${encodeURIComponent(baseSku)}&state=true&page=1`);
        const json = await response.json();
        const usedSkus = new Set(
            (json.data || []).map(product => product.sku || product.cod_bar).filter(Boolean)
        );

        let candidate = baseSku;
        let sequence = 2;
        while (usedSkus.has(candidate)) {
            const suffix = `-${sequence}`;
            candidate = `${baseSku.slice(0, 50 - suffix.length)}${suffix}`;
            sequence += 1;
        }
        return candidate;
    } catch (error) {
        console.warn('No se pudo verificar el SKU antes del envío; lo validará el servidor.', error);
        return baseSku;
    }
}

document.addEventListener('DOMContentLoaded', () => {
    initAddProductSocket()
    setupProductModalListeners();
    fetchProductCategories();
    fetchOperationalCatalogs();
    setupOperationalProductListeners();
});

const escapeProductText = value => String(value ?? '').replace(/[&<>"']/g, char => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
})[char]);

async function fetchOperationalCatalogs() {
    try {
        const response = await fetch('/api/products/operational-catalogs');
        const json = await response.json();
        if (!response.ok) throw new Error(json.message || 'No se pudo cargar la configuración operativa');
        operationalCatalogs = json.data;

        const branchSelect = document.getElementById('prod-production-branch');
        branchSelect.innerHTML = '<option value="">Sin centro fijo</option>' + operationalCatalogs.branches
            .map(branch => `<option value="${branch.id}">${escapeProductText(branch.name)}</option>`).join('');

        document.getElementById('prod-channel-options').innerHTML = operationalCatalogs.channels
            .map(channel => `<label><input type="checkbox" name="prod-channel" value="${channel.id}" checked> ${escapeProductText(channel.name)}</label>`).join('');
        renderRecipeLines();
    } catch (error) {
        console.error(error);
    }
}

function initAddProductSocket() {
    const socket = io()

    const handleCategories = () => {
        sessionStorage.removeItem('cache_categories')
        fetchProductCategories();
    }

    socket.on('new_category', handleCategories)
    socket.on('category_deleted', handleCategories)
}

// --- LÓGICA DE CATEGORÍAS (Para el Select) ---
async function fetchProductCategories() {
    try {
        const json = await window.fetchWithCache('/api/products/categories', 'cache_categories', 120)

        if (json.status === 'success') {
            const formSelect = document.getElementById('prod-category');
            if (formSelect) {
                formSelect.innerHTML = '<option value="" disabled selected>Seleccionar...</option>';
                json.data.forEach(cat => {
                    formSelect.innerHTML += `<option value="${cat.id}">${cat.name}</option>`;
                });
            }
        }
    } catch (error) { console.error('Error cargando categorías para el modal:', error); }
}

// --- LÓGICA DE PRODUCTOS ---
window.openProductModal = function () {
    isEditing = false;
    document.getElementById('product-modal-title').textContent = 'Añade un producto';
    document.getElementById('form-product').reset();
    document.getElementById('prod-id').value = '';
    document.getElementById('prod-code').value = '';
    document.getElementById('prod-sku-group').style.display = 'none';
    document.getElementById('prod-is-active').value = '1';
    document.getElementById('prod-item-type').value = 'finished';
    document.getElementById('prod-is-sellable').checked = true;
    document.getElementById('prod-is-manufacturable').checked = false;
    document.getElementById('prod-is-customizable').checked = false;
    document.getElementById('prod-production-method').value = 'purchased';
    document.getElementById('prod-production-branch').value = '';
    document.querySelectorAll('[name="prod-channel"]').forEach(box => { box.checked = true; });
    document.querySelectorAll('[name="prod-personalization-method"]').forEach(box => { box.checked = false; });
    recipeDraft = [];
    renderRecipeLines();
    syncOperationalVisibility();
    resetProductImageSelection();
    document.getElementById('prod-img-label').textContent = 'Imagen del producto';
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
            document.getElementById('prod-code').value = p.sku || p.cod_bar || '';
            document.getElementById('prod-sku-group').style.display = 'block';
            document.getElementById('prod-category').value = p.category_id || '';
            document.getElementById('prod-desc').value = p.description;
            document.getElementById('prod-is-active').value = p.is_active ? '1' : '0';
            document.getElementById('prod-item-type').value = p.item_type || 'finished';
            document.getElementById('prod-is-sellable').checked = Boolean(p.is_sellable);
            document.getElementById('prod-is-manufacturable').checked = Boolean(p.is_manufacturable);
            document.getElementById('prod-is-customizable').checked = Boolean(p.is_customizable);
            document.getElementById('prod-production-method').value = p.production_method || 'purchased';
            document.getElementById('prod-production-branch').value = p.production_branch_id || '';
            document.querySelectorAll('[name="prod-channel"]').forEach(box => {
                box.checked = (p.channels || []).map(Number).includes(Number(box.value));
            });
            document.querySelectorAll('[name="prod-personalization-method"]').forEach(box => {
                box.checked = (p.personalization_methods || []).includes(box.value);
            });
            recipeDraft = (p.recipe || []).map(item => ({ product_id: Number(item.product_id), quantity: Number(item.quantity) }));
            renderRecipeLines();
            syncOperationalVisibility();

            const previewImg = document.getElementById('prod-img-preview');
            const labelImg = document.getElementById('prod-img-label');

            resetProductImageSelection();
            labelImg.textContent = 'Imagen del producto (opcional al editar)';

            if (p.url_img_original) {
                previewImg.src = p.url_img_original;
                previewImg.hidden = false;
                document.getElementById('prod-img-placeholder').hidden = true;
                document.getElementById('prod-img-filename').textContent = 'Imagen actual (soltá otra para reemplazarla)';
            } else {
                previewImg.src = '';
                previewImg.hidden = true;
                document.getElementById('prod-img-placeholder').hidden = false;
            }

            document.getElementById('modal-add-product').classList.add('active');
        }
    } catch (e) { console.error(e); alert('Error al cargar datos del producto'); }
}

const formProduct = document.getElementById('form-product');

const prodImgInput = document.getElementById('prod-img');
const prodImgPreview = document.getElementById('prod-img-preview');
const prodImgPlaceholder = document.getElementById('prod-img-placeholder');
const prodImgFilename = document.getElementById('prod-img-filename');
const prodImgDropZone = document.getElementById('product-image-drop-zone');
const btnSelectProductImage = document.getElementById('btn-select-product-image');

function revokeProductImageObjectUrl() {
    if (productImageObjectUrl) {
        URL.revokeObjectURL(productImageObjectUrl);
        productImageObjectUrl = null;
    }
}

function resetProductImageSelection() {
    selectedProductImageFile = null;
    revokeProductImageObjectUrl();

    const input = document.getElementById('prod-img');
    const preview = document.getElementById('prod-img-preview');
    const placeholder = document.getElementById('prod-img-placeholder');
    const filename = document.getElementById('prod-img-filename');
    const dropZone = document.getElementById('product-image-drop-zone');

    if (input) input.value = '';
    if (preview) {
        preview.removeAttribute('src');
        preview.hidden = true;
    }
    if (placeholder) placeholder.hidden = false;
    if (filename) filename.textContent = 'Ningún archivo seleccionado';
    if (dropZone) dropZone.classList.remove('is-dragging', 'has-image');
}

function selectProductImage(file) {
    if (!file) return false;

    if (!file.type.startsWith('image/')) {
        alert('El archivo seleccionado debe ser una imagen.');
        return false;
    }

    if (file.size > MAX_PRODUCT_IMAGE_SIZE) {
        alert('La imagen supera el tamaño máximo de 20 MB.');
        return false;
    }

    selectedProductImageFile = file;
    revokeProductImageObjectUrl();
    productImageObjectUrl = URL.createObjectURL(file);
    prodImgPreview.src = productImageObjectUrl;
    prodImgPreview.hidden = false;
    prodImgPlaceholder.hidden = true;
    prodImgFilename.textContent = file.name;
    prodImgDropZone.classList.add('has-image');
    return true;
}

if (prodImgInput) {
    prodImgInput.addEventListener('change', function () {
        if (this.files?.[0] && !selectProductImage(this.files[0])) {
            this.value = '';
        }
    });
}

if (btnSelectProductImage) {
    btnSelectProductImage.addEventListener('click', () => prodImgInput.click());
}

if (prodImgDropZone) {
    const preventBrowserFileOpen = (event) => {
        event.preventDefault();
        event.stopPropagation();
    };

    ['dragenter', 'dragover', 'dragleave', 'drop'].forEach(eventName => {
        prodImgDropZone.addEventListener(eventName, preventBrowserFileOpen);
    });

    ['dragenter', 'dragover'].forEach(eventName => {
        prodImgDropZone.addEventListener(eventName, () => prodImgDropZone.classList.add('is-dragging'));
    });

    ['dragleave', 'drop'].forEach(eventName => {
        prodImgDropZone.addEventListener(eventName, () => prodImgDropZone.classList.remove('is-dragging'));
    });

    prodImgDropZone.addEventListener('drop', (event) => {
        const file = event.dataTransfer?.files?.[0];
        if (file) selectProductImage(file);
    });

    prodImgDropZone.addEventListener('click', () => prodImgInput.click());
    prodImgDropZone.addEventListener('keydown', (event) => {
        if (event.key === 'Enter' || event.key === ' ') {
            event.preventDefault();
            prodImgInput.click();
        }
    });
}

if (formProduct) {
    formProduct.addEventListener('submit', async (e) => {
        e.preventDefault();

        if (!isEditing && !selectedProductImageFile) {
            alert('Seleccioná o arrastrá una imagen para crear el producto.');
            prodImgDropZone?.focus();
            return;
        }

        const formData = new FormData();
        const productName = document.getElementById('prod-name').value;
        formData.append('name', productName);
        if (isEditing) {
            const editedSku = document.getElementById('prod-code').value;
            formData.append('sku', editedSku);
            formData.append('cod_bar', editedSku);
        } else {
            // Compatibilidad durante el despliegue; el servidor actualizado genera el SKU.
            formData.append('cod_bar', await generateAvailableSku(productName));
        }
        formData.append('category_id', document.getElementById('prod-category').value);
        formData.append('description', document.getElementById('prod-desc').value);
        formData.append('is_active', document.getElementById('prod-is-active').value);
        formData.append('item_type', document.getElementById('prod-item-type').value);
        formData.append('is_sellable', document.getElementById('prod-is-sellable').checked ? '1' : '0');
        formData.append('is_manufacturable', document.getElementById('prod-is-manufacturable').checked ? '1' : '0');
        formData.append('is_customizable', document.getElementById('prod-is-customizable').checked ? '1' : '0');
        formData.append('production_method', document.getElementById('prod-production-method').value);
        formData.append('production_branch_id', document.getElementById('prod-production-branch').value);
        formData.append('channels', JSON.stringify([...document.querySelectorAll('[name="prod-channel"]:checked')].map(box => Number(box.value))));
        formData.append('personalization_methods', JSON.stringify([...document.querySelectorAll('[name="prod-personalization-method"]:checked')].map(box => box.value)));
        formData.append('recipe', JSON.stringify(recipeDraft.filter(item => item.product_id && item.quantity > 0)));

        if (selectedProductImageFile) {
            formData.append('image', selectedProductImageFile);
        }

        const id = document.getElementById('prod-id').value;
        const url = isEditing ? `/api/products/${id}` : '/api/products/';
        const method = isEditing ? 'PATCH' : 'POST';

        const btnSave = document.getElementById('btn-save-product');
        const originalText = btnSave.textContent;
        btnSave.disabled = true;
        btnSave.textContent = 'Guardando...';

        try {
            const res = await fetch(url, { method: method, body: formData });
            const json = await res.json();

            if (res.ok || json.status === 'success') {
                alert(isEditing ? 'Producto actualizado' : 'Producto creado');
                document.getElementById('modal-add-product').classList.remove('active');
                resetProductImageSelection();
                window.dispatchEvent(new CustomEvent('productSaved')); // Avisa a la vista principal para recargar
            } else {
                console.error('Error:', json);
                alert('Error al guardar: ' + (json.message || 'Revisa los datos.'));
            }
        } catch (err) {
            console.error(err);
            alert('Error de conexión con el servidor.');
        } finally {
            btnSave.disabled = false;
            btnSave.textContent = originalText;
        }
    });
}

function setupOperationalProductListeners() {
    document.getElementById('prod-is-manufacturable')?.addEventListener('change', syncOperationalVisibility);
    document.getElementById('prod-is-customizable')?.addEventListener('change', syncOperationalVisibility);
    document.getElementById('btn-add-recipe-line')?.addEventListener('click', () => {
        recipeDraft.push({ product_id: '', quantity: 1 });
        renderRecipeLines();
    });
}

function syncOperationalVisibility() {
    const manufacturable = document.getElementById('prod-is-manufacturable')?.checked;
    const customizable = document.getElementById('prod-is-customizable')?.checked;
    document.getElementById('prod-production-method-group').hidden = !manufacturable;
    document.getElementById('prod-recipe-section').hidden = !manufacturable;
    document.getElementById('prod-personalization-section').hidden = !customizable;
    if (!manufacturable) document.getElementById('prod-production-method').value = 'purchased';
    else if (document.getElementById('prod-production-method').value === 'purchased') document.getElementById('prod-production-method').value = 'artisan';
}

function renderRecipeLines() {
    const container = document.getElementById('prod-recipe-lines');
    if (!container) return;
    const currentId = Number(document.getElementById('prod-id')?.value || 0);
    const materialOptions = operationalCatalogs.products
        .filter(product => Number(product.id) !== currentId && product.item_type === 'raw_material')
        .map(product => `<option value="${product.id}">${escapeProductText(product.name)} (${escapeProductText(product.sku)})</option>`).join('');

    container.innerHTML = recipeDraft.map((item, index) => `
        <div class="recipe-line">
            <select data-recipe-product="${index}">
                <option value="">Seleccionar material</option>
                ${materialOptions}
            </select>
            <input type="number" min="0.001" step="0.001" value="${item.quantity || 1}" data-recipe-quantity="${index}" aria-label="Cantidad por unidad">
            <button type="button" class="recipe-remove" data-recipe-remove="${index}" title="Quitar">×</button>
        </div>
    `).join('');

    recipeDraft.forEach((item, index) => {
        const select = container.querySelector(`[data-recipe-product="${index}"]`);
        if (select) select.value = item.product_id || '';
    });
    container.querySelectorAll('[data-recipe-product]').forEach(select => select.addEventListener('change', () => {
        recipeDraft[Number(select.dataset.recipeProduct)].product_id = Number(select.value) || '';
    }));
    container.querySelectorAll('[data-recipe-quantity]').forEach(input => input.addEventListener('change', () => {
        recipeDraft[Number(input.dataset.recipeQuantity)].quantity = Number(input.value) || 0;
    }));
    container.querySelectorAll('[data-recipe-remove]').forEach(button => button.addEventListener('click', () => {
        recipeDraft.splice(Number(button.dataset.recipeRemove), 1);
        renderRecipeLines();
    }));
}

// --- UTILIDADES UI ---
function setupProductModalListeners() {
    document.querySelectorAll('.btn-close-modal, .btn-cancel').forEach(btn => {
        btn.addEventListener('click', (e) => {
            e.preventDefault();
            const targetId = btn.getAttribute('data-target');
            if (targetId) {
                document.getElementById(targetId).classList.remove('active');
                if (targetId === 'modal-add-product') resetProductImageSelection();
            }
        });
    });

    document.querySelectorAll('.modal-overlay').forEach(overlay => {
        overlay.addEventListener('click', (e) => {
            if (e.target === overlay) {
                overlay.classList.remove('active');
                if (overlay.id === 'modal-add-product') resetProductImageSelection();
            }
        });
    });
}
